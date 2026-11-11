import { computed, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { HTTPError } from 'ky'
import { useSignStore } from '@/stores/sign'
import { usePlayerStore } from '@/stores/player'
import { useFeedback } from '@/composables/useFeedback'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import type { useChapterOrder } from '@/composables/useChapterOrder'
import type { useWorkData } from '@/composables/useWorkData'
import api from '@/utils/ky'
import type { AudioResource, Chapter, WorkInput } from '@/types'

export function useWorkActions(
  id: number,
  data: ReturnType<typeof useWorkData>,
  order: ReturnType<typeof useChapterOrder>,
  blocked: () => boolean,
  backTo: Ref<string>,
) {
  const { work, chapters, orderChapters, chapterCount, load } = data
  const sign = useSignStore()
  const player = usePlayerStore()
  const router = useRouter()
  const { notify, fail } = useFeedback()
  const workDeleteOpen = ref(false)
  const canDeleteWork = computed(() =>
    Boolean(work.value && (work.value.user_id === sign.user?.id || sign.canEditOthers)),
  )
  const editOpen = ref(false)
  const saving = ref(false)
  const actionBusy = ref(false)
  const chapterOpen = ref(false)
  const chapterEditing = ref<Chapter | null>(null)
  const chapterTitle = ref('')
  const chapterSeason = ref(1)
  const chapterEpisode = ref(1)
  const emptyDeletion = ref<Chapter | null>(null)
  useUnsavedChanges(
    () =>
      chapterOpen.value &&
      (chapterTitle.value !== (chapterEditing.value?.title || '') ||
        chapterSeason.value !== (chapterEditing.value?.season_number || 1) ||
        chapterEpisode.value !== (chapterEditing.value?.episode_number || 1)),
    '章节修改尚未保存，离开后将丢失修改。',
  )
  const deleteOpen = ref(false)
  const deleting = ref<AudioResource>()
  const deleteReason = ref('')
  const replacementPrimary = ref(0)
  const deletingChapter = computed(() =>
    chapters.value.find((chapter) => chapter.id === deleting.value?.abs_item_id),
  )
  const replacementOptions = computed(
    () =>
      deletingChapter.value?.resources.filter((resource) => resource.id !== deleting.value?.id) ||
      [],
  )
  const needsReplacement = computed(
    () =>
      replacementOptions.value.length > 1 &&
      (!deletingChapter.value?.primary_media_id ||
        deletingChapter.value.primary_media_id === deleting.value?.id),
  )
  const ownDeletion = computed(() => deleting.value?.user_id === sign.user?.id)
  async function perform(action: () => Promise<void>, message?: string) {
    if (actionBusy.value) return
    actionBusy.value = true
    try {
      await action()
      await load()
      if (message) notify(message)
    } catch (cause) {
      fail(cause)
      if (cause instanceof HTTPError && cause.response.status === 409) await load()
    } finally {
      actionBusy.value = false
    }
  }
  async function save(data: WorkInput) {
    saving.value = true
    try {
      await api.patch(`works/${id}`, { json: data })
      editOpen.value = false
      await load()
      notify('作品资料已保存。')
    } catch (cause) {
      fail(cause)
    } finally {
      saving.value = false
    }
  }
  function requestEmptyDeletion(chapter: Chapter) {
    emptyDeletion.value = chapter
  }
  function editChapter(chapter?: Chapter) {
    chapterEditing.value = chapter || null
    chapterTitle.value = chapter?.title || ''
    chapterSeason.value = chapter?.season_number ?? 1
    chapterEpisode.value = chapter?.episode_number ?? work.value?.next_episode ?? 1
    chapterOpen.value = true
  }
  async function saveChapter() {
    await perform(async () => {
      const body = {
        title: chapterTitle.value.trim(),
        season_number: Number(chapterSeason.value),
        episode_number: Number(chapterEpisode.value),
        expected_revision: work.value!.revision,
      }
      if (chapterEditing.value)
        await api.patch(`works/${id}/chapters/${chapterEditing.value.id}`, { json: body })
      else await api.post(`works/${id}/chapters`, { json: body })
      chapterOpen.value = false
    }, '章节已保存。')
  }
  async function removeEmpty() {
    if (!emptyDeletion.value) return
    await perform(async () => {
      await api.delete(`works/${id}/chapters/${emptyDeletion.value!.id}`, {
        json: { expected_revision: work.value!.revision },
      })
      emptyDeletion.value = null
    }, '空章节已删除。')
  }
  async function deleteWork() {
    if (blocked() || !canDeleteWork.value || chapterCount.value || !work.value) return
    actionBusy.value = true
    try {
      await api.delete(`works/${id}`, { json: { expected_revision: work.value.revision } })
      if (player.track?.work_id === id) player.stop()
      workDeleteOpen.value = false
      await router.replace(backTo.value)
      notify('作品已删除，历史记录和上传文件保留。')
    } catch (cause) {
      fail(cause)
      if (cause instanceof HTTPError && [409, 422].includes(cause.response.status)) {
        workDeleteOpen.value = false
        await load()
      }
    } finally {
      actionBusy.value = false
    }
  }
  async function choosePrimary(chapter: Chapter, resource: AudioResource) {
    if (chapter.primary_media_id === resource.id) return
    await perform(async () => {
      await api.put(`works/${id}/chapters/${chapter.id}/primary`, {
        json: { media_id: resource.id, expected_revision: work.value!.revision },
      })
    }, '主资源已更新，收听端只会同步这一份。')
  }
  function requestDeletion(resource: AudioResource) {
    deleting.value = resource
    deleteReason.value = ''
    replacementPrimary.value = 0
    deleteOpen.value = true
  }
  async function deleteAudio() {
    if (!deleting.value) return
    await perform(async () => {
      await api.delete(`media/${deleting.value!.id}`, {
        json: {
          reason: deleteReason.value.trim() || null,
          replacement_primary_id: replacementPrimary.value || null,
          expected_revision: work.value!.revision,
        },
      })
      if (player.track?.resource_id === deleting.value!.id) player.stop()
      deleteOpen.value = false
    }, '资源已下架，历史贡献保留。')
  }
  async function saveOrder() {
    await perform(async () => {
      await api.put(`works/${id}/order`, {
        json: {
          chapter_ids: orderChapters.value.map((chapter) => chapter.id),
          expected_revision: work.value!.revision,
        },
      })
      order.finish()
    }, '播放顺序已保存，稍后同步到收听端。')
  }
  async function retrySync() {
    await perform(async () => {
      await api.post(`works/${id}/sync`)
    }, '已重新安排同步。')
  }

  return {
    workDeleteOpen,
    canDeleteWork,
    editOpen,
    saving,
    actionBusy,
    chapterOpen,
    chapterEditing,
    chapterTitle,
    chapterSeason,
    chapterEpisode,
    emptyDeletion,
    deleteOpen,
    deleting,
    deleteReason,
    replacementPrimary,
    deletingChapter,
    replacementOptions,
    needsReplacement,
    ownDeletion,
    save,
    requestEmptyDeletion,
    editChapter,
    saveChapter,
    removeEmpty,
    deleteWork,
    choosePrimary,
    requestDeletion,
    deleteAudio,
    saveOrder,
    retrySync,
  }
}
