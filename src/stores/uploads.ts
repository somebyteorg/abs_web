import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { HTTPError } from 'ky'
import api from '@/utils/ky'
import { useSignStore } from '@/stores/sign'
import { hashFile, isAudioFile } from '@/utils/files'
import { createUuid } from '@/utils/uuid'
import { bytes } from '@/utils/format'
import { findDuplicateAudio, resumeUpload, transferFile } from '@/api/uploads'
import type { AudioResource, ChapterOption, UploadResult, UploadState } from '@/types'

export interface QueueEntry {
  id: string
  workId: number
  workName: string
  file: File
  relativeName: string
  season: number
  episode: number
  title: string
  status:
    | 'ready'
    | 'checking'
    | 'duplicate'
    | 'uploading'
    | 'merging'
    | 'done'
    | 'skipped'
    | 'error'
    | 'paused'
  progress: number
  message: string
  invalid: boolean
  chapterId: number
  alternative: boolean
  primaryChoice: '' | 'keep' | 'new'
  hash?: string
  duplicateHash?: string
  matches: AudioResource[]
  matchTotal: number
  matchPage: number
  referenceId?: number
  uploadId?: string
}
interface Resume {
  id: string
  metadata: string
  season: number
  episode: number
  title: string
  chapterId: number
  alternative: boolean
  primaryChoice: '' | 'keep' | 'new'
}
export const useUploadsStore = defineStore('uploads', () => {
  const sign = useSignStore()
  const queue = ref<QueueEntry[]>([])
  const running = ref(false)
  const open = ref(false)
  const resumes = useStorage<Record<string, Resume>>('emos-abs-upload-resume-v4', {})
  const unfinished = computed(() =>
    queue.value.some((entry) => !['done', 'skipped'].includes(entry.status) && !entry.invalid),
  )
  const pending = computed(
    () =>
      queue.value.filter(
        (entry) => ['ready', 'paused', 'error'].includes(entry.status) && !entry.invalid,
      ).length,
  )
  const issues = computed(
    () =>
      queue.value.filter((entry) => ['duplicate', 'error', 'skipped'].includes(entry.status))
        .length,
  )
  let controller: AbortController | undefined
  let paused = false
  function signature(entry: Pick<QueueEntry, 'workId' | 'relativeName' | 'file'>) {
    return JSON.stringify([
      sign.user?.id,
      entry.workId,
      entry.relativeName,
      entry.file.size,
      entry.file.lastModified,
    ])
  }
  watch(
    () => sign.user?.id,
    (id, old) => {
      if (old && id !== old) {
        pause()
        queue.value = []
        open.value = false
      }
    },
  )
  function add(
    workId: number,
    workName: string,
    files: File[],
    nextEpisode: number,
    target?: ChapterOption,
  ) {
    const config = sign.getContribution()
    const audios = files
      .filter((file) => isAudioFile(file, config.audio_extensions))
      .sort((a, b) =>
        (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, 'zh-CN', {
          numeric: true,
        }),
      )
    let fallback = Math.max(
      nextEpisode,
      ...queue.value.filter((entry) => entry.workId === workId).map((entry) => entry.episode + 1),
    )
    for (const file of audios) {
      const relativeName = file.webkitRelativePath || file.name
      if (
        queue.value.some(
          (entry) =>
            entry.workId === workId &&
            entry.relativeName === relativeName &&
            entry.file.size === file.size &&
            entry.file.lastModified === file.lastModified &&
            entry.chapterId === (target?.id || 0) &&
            entry.status !== 'done',
        )
      )
        continue
      let season = 1
      let episode = fallback
      const pair = relativeName.match(/s(\d{1,6})[ ._-]*e(\d{1,6})/i)
      const seasonName = relativeName.match(/第\s*(\d{1,6})\s*季/i)
      const episodeName =
        file.name.replace(/\.[^.]+$/, '').match(/第\s*(\d{1,6})\s*[集章回]/) ||
        file.name.replace(/\.[^.]+$/, '').match(/(?:^|\D)(\d{1,6})\D*$/)
      if (pair) {
        season = Number(pair[1])
        episode = Number(pair[2])
      } else {
        if (seasonName) season = Number(seasonName[1])
        if (episodeName) episode = Number(episodeName[1])
      }
      const saved = resumes.value[signature({ workId, relativeName, file })]
      if (saved && !target) {
        season = saved.season
        episode = saved.episode
      }
      if (target) {
        season = target.season_number
        episode = target.episode_number
      }
      fallback = Math.max(fallback + 1, episode + 1)
      const invalid =
        file.size > config.max_file_size
          ? `单个音频最大 ${bytes(config.max_file_size)}，请换一个文件。`
          : file.size === 0
            ? '空文件没有声音可上传。'
            : ''
      queue.value.push({
        id: createUuid(),
        workId,
        workName,
        file,
        relativeName,
        season,
        episode,
        title: target?.title || saved?.title || file.name.replace(/\.[^.]+$/, ''),
        status: invalid ? 'error' : 'ready',
        progress: 0,
        message: invalid,
        invalid: Boolean(invalid),
        chapterId: target?.id || saved?.chapterId || 0,
        alternative: saved?.alternative || false,
        primaryChoice: saved?.primaryChoice || '',
        matches: [],
        matchTotal: 0,
        matchPage: 1,
      })
    }
    return files.length - audios.length
  }
  function payload(entry: QueueEntry) {
    return {
      work_id: entry.workId,
      file_name: entry.file.name,
      file_size: entry.file.size,
      season_number: Number(entry.season),
      episode_number: Number(entry.episode),
      title: entry.title.trim() || null,
      chapter_id: entry.chapterId || null,
      allow_alternative: entry.alternative,
      primary_choice: entry.alternative ? entry.primaryChoice || null : null,
    }
  }
  async function duplicates(entry: QueueEntry, page = 1, signal?: AbortSignal) {
    const matches = await findDuplicateAudio(entry.duplicateHash || entry.hash!, page, signal)
    entry.matches = page === 1 ? matches.items : [...entry.matches, ...matches.items]
    entry.matchTotal = matches.total
    entry.matchPage = page
    return matches.total > 0
  }
  async function upload(entry: QueueEntry, signal: AbortSignal) {
    const key = signature(entry)
    let result: UploadResult
    if (entry.referenceId) {
      result = (
        await api
          .post('uploads/reference', {
            signal,
            json: {
              ...payload(entry),
              request_id: entry.id,
              reference_media_id: entry.referenceId,
              sha256: entry.duplicateHash || entry.hash,
              upload_id: entry.uploadId || null,
            },
          })
          .json<{ data: UploadResult }>()
      ).data
    } else {
      const metadata = JSON.stringify(payload(entry))
      const previous = resumes.value[key]
      let state: UploadState | undefined
      if (previous?.metadata === metadata) {
        state = await resumeUpload(previous.id, signal)
        if (!state) delete resumes.value[key]
      }
      if (state?.status === 'completed') {
        if (!state.file_id) throw new Error('资源尚未入库完成，请重试。')
        delete resumes.value[key]
        entry.progress = 100
        entry.status = 'done'
        entry.message = '已上传完成'
        window.dispatchEvent(
          new CustomEvent('audio-published', { detail: { work_id: entry.workId } }),
        )
        return
      }
      entry.status = 'checking'
      entry.message = '正在校验文件并检查全库重复音频…'
      entry.hash ||= await hashFile(entry.file, signal, (value) => {
        entry.progress = value
      })
      if (await duplicates(entry, 1, signal)) {
        entry.status = 'duplicate'
        entry.message = '已有相同音频。请核对以下位置，确认后可引用原文件，无需重复上传。'
        return
      }
      if (!state) {
        state = (
          await api
            .post('uploads', {
              signal,
              json: {
                ...payload(entry),
                kind: 'audio',
                sha256: entry.hash,
              },
            })
            .json<{ data: UploadState }>()
        ).data
        resumes.value[key] = {
          id: state.id,
          metadata,
          season: entry.season,
          episode: entry.episode,
          title: entry.title,
          chapterId: entry.chapterId,
          alternative: entry.alternative,
          primaryChoice: entry.primaryChoice,
        }
      }
      entry.uploadId = state.id
      entry.status = 'uploading'
      entry.message = ''
      result = await transferFile(state, entry.file, signal, (percent, merging) => {
        entry.progress = percent
        if (merging) {
          entry.status = 'merging'
          entry.message = '正在合并文件并读取音频信息…'
        }
      })
      if (result.duplicate) {
        entry.duplicateHash = result.sha256
        entry.matches = result.matches || []
        await duplicates(entry, 1, signal)
        entry.status = 'duplicate'
        entry.message = '已有相同音频。确认引用已有文件即可，不会再保存一份资源。'
        return
      }
    }
    if (!result.file_id) throw new Error('资源尚未入库完成，请重试。')
    delete resumes.value[key]
    entry.progress = 100
    entry.status = 'done'
    entry.message = entry.referenceId ? '已引用已有音频' : '已上传完成'
    window.dispatchEvent(
      new CustomEvent('audio-published', { detail: { work_id: entry.workId, ...result } }),
    )
    window.dispatchEvent(new Event('contribution-changed'))
  }
  async function start(workId?: number) {
    if (running.value) return
    paused = false
    running.value = true
    try {
      for (const entry of [...queue.value]) {
        if (paused) break
        if (
          (workId && entry.workId !== workId) ||
          !['ready', 'paused', 'error'].includes(entry.status) ||
          entry.invalid
        )
          continue
        if (entry.alternative && !entry.primaryChoice) {
          entry.status = 'error'
          entry.message = '添加备选时，请选择主资源处理方式。'
          continue
        }
        controller = new AbortController()
        try {
          await upload(entry, controller.signal)
        } catch (cause) {
          if (controller.signal.aborted) {
            entry.status = 'paused'
            entry.message = '已暂停，重新选择原文件也可以续传。'
            break
          }
          entry.status = 'error'
          entry.message = cause instanceof Error ? cause.message : '这个文件没有上传成功。'
          if (cause instanceof HTTPError && [401, 403, 419].includes(cause.response.status)) break
        }
      }
    } finally {
      running.value = false
    }
  }
  function pause() {
    paused = true
    controller?.abort()
  }
  function reference(entry: QueueEntry, mediaId: number) {
    if (running.value) return
    entry.referenceId = mediaId
    entry.status = 'ready'
    void start(entry.workId)
  }
  function skip(entry: QueueEntry) {
    if (running.value) return
    entry.status = 'skipped'
    entry.message = '已跳过相同音频'
  }
  function remove(id: string) {
    if (!running.value) queue.value = queue.value.filter((entry) => entry.id !== id)
  }
  function move(id: string, direction: number) {
    if (running.value) return
    const index = queue.value.findIndex((entry) => entry.id === id)
    const target = queue.value[index + direction]
    if (index >= 0 && target)
      [queue.value[index], queue.value[index + direction]] = [target, queue.value[index]!]
  }
  return {
    queue,
    running,
    open,
    unfinished,
    pending,
    issues,
    add,
    start,
    pause,
    reference,
    skip,
    remove,
    move,
    duplicates,
  }
})
