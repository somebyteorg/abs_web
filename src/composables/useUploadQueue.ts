import { computed, ref, watch, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useUploadsStore, type QueueEntry } from '@/stores/uploads'
import { useSignStore } from '@/stores/sign'
import { useFeedback } from '@/composables/useFeedback'
import { useChapterOptions } from '@/composables/useChapterOptions'
import type { useWorkData } from '@/composables/useWorkData'
import type { ChapterOption } from '@/types'

export function useUploadQueue(
  workId: number,
  data: ReturnType<typeof useWorkData>,
  blocked: () => boolean,
) {
  const { work } = data
  const route = useRoute()
  const sign = useSignStore()
  const { notify } = useFeedback()
  const uploads = useUploadsStore()
  const { running } = storeToRefs(uploads)
  const queue = computed(() => uploads.queue.filter((entry) => entry.workId === workId))
  const add = (files: File[], target?: ChapterOption) =>
    uploads.add(workId, work.value?.name || '作品', files, work.value?.next_episode || 1, target)
  const remove = uploads.remove
  const pending = computed(
    () =>
      queue.value.filter(
        (entry) => ['ready', 'paused', 'error'].includes(entry.status) && !entry.invalid,
      ).length,
  )
  const completed = computed(() => queue.value.filter((entry) => entry.status === 'done').length)
  const queueFilter = ref<'all' | 'pending' | 'issues' | 'done'>('all')
  const filesInput = useTemplateRef<HTMLInputElement>('filesInput')
  const folderInput = ref<HTMLInputElement>()
  const dragging = ref(false)
  const uploadTarget = ref<ChapterOption>()
  const uploadOpen = ref(route.query.upload === '1')
  const chapterOptions = useChapterOptions(
    () => workId,
    () => uploadOpen.value,
    () => queue.value.map((entry) => entry.chapterId).filter(Boolean),
    () =>
      queue.value
        .filter((entry) => entry.chapterId)
        .map((entry) => ({
          id: entry.chapterId,
          title: entry.title,
          season_number: entry.season,
          episode_number: entry.episode,
        })),
  )
  watch(
    () => route.query.upload,
    (value) => {
      if (value === '1') uploadOpen.value = true
    },
  )
  function chooseFiles(chapter?: ChapterOption) {
    uploadTarget.value = chapter
    filesInput.value?.click()
  }
  function addFiles(files: File[], chapter?: ChapterOption) {
    const ignored = add(files, chapter)
    if (ignored) notify(`已忽略 ${ignored} 个非音频文件。封面请通过“编辑资料 / 封面”上传。`)
    uploadOpen.value = true
  }
  function selectFiles(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files?.length)
      addFiles(Array.from(input.files), input === filesInput.value ? uploadTarget.value : undefined)
    uploadTarget.value = undefined
    input.value = ''
  }
  function drop(event: DragEvent) {
    dragDepth = 0
    dragging.value = false
    if (sign.canContribute && !blocked() && event.dataTransfer?.files.length)
      addFiles(Array.from(event.dataTransfer.files))
  }
  function refreshQueueEntry(entry: QueueEntry) {
    if (entry.status === 'skipped') {
      entry.status = 'ready'
      entry.message = ''
    }
  }
  function setQueueChapter(entry: QueueEntry) {
    refreshQueueEntry(entry)
    const chapter = chapterOptions.options.value.find((item) => item.id === Number(entry.chapterId))
    if (chapter) {
      entry.title = chapter.title
      entry.season = chapter.season_number
      entry.episode = chapter.episode_number
    }
  }
  const queueIssues = computed(
    () =>
      queue.value.filter((entry) => ['error', 'skipped', 'duplicate'].includes(entry.status))
        .length,
  )
  const visibleQueue = computed(() =>
    queue.value
      .map((entry, index) => ({ entry, index }))
      .filter(
        ({ entry }) =>
          queueFilter.value === 'all' ||
          (queueFilter.value === 'issues'
            ? ['error', 'skipped', 'duplicate'].includes(entry.status)
            : queueFilter.value === 'done'
              ? entry.status === 'done'
              : ['ready', 'paused', 'checking', 'uploading', 'merging'].includes(entry.status)),
      ),
  )
  function clearCompleted() {
    for (const entry of [...queue.value]) {
      if (entry.status === 'done') remove(entry.id)
    }
  }
  let dragDepth = 0
  function dragEnter(event: DragEvent) {
    if (sign.canContribute && !blocked() && event.dataTransfer?.types.includes('Files')) {
      dragDepth++
      dragging.value = true
    }
  }
  function dragLeave() {
    dragDepth = Math.max(0, dragDepth - 1)
    if (!dragDepth) dragging.value = false
  }
  const statusNames = {
    checking: '检查重复',
    duplicate: '相同音频待确认',
    ready: '待上传',
    uploading: '上传中',
    merging: '正在整理',
    done: '完成',
    skipped: '已跳过',
    error: '需要处理',
    paused: '已暂停',
  }
  return {
    queue,
    running,
    pending,
    completed,
    queueFilter,
    queueIssues,
    visibleQueue,
    uploadChapterQuery: chapterOptions.query,
    uploadChapters: chapterOptions.options,
    uploadChapterPage: chapterOptions.page,
    uploadChapterResult: chapterOptions.result,
    uploadChaptersLoading: chapterOptions.loading,
    uploadChapterError: chapterOptions.error,
    reloadUploadChapters: chapterOptions.load,
    folderInput,
    dragging,
    uploadOpen,
    statusNames,
    chooseFiles,
    selectFiles,
    drop,
    dragEnter,
    dragLeave,
    refreshQueueEntry,
    setQueueChapter,
    clearCompleted,
    move: (index: number, direction: number) => {
      const entry = queue.value[index]
      if (entry) uploads.move(entry.id, direction)
    },
    start: () => uploads.start(workId),
    pause: uploads.pause,
    remove,
    reference: uploads.reference,
    skip: uploads.skip,
    duplicates: uploads.duplicates,
  }
}
