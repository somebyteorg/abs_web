import { computed, onScopeDispose, ref, watch } from 'vue'
import { useEventListener, watchDebounced } from '@vueuse/core'
import { useFeedback } from '@/composables/useFeedback'
import api from '@/utils/ky'
import type { AudioResource, Chapter, Paginated, UploadResult, Work } from '@/types'

interface WorkDataOptions {
  isSorting: () => boolean
  hasPendingChanges: () => boolean
  retainedChapterIds: () => number[]
  onReload: () => void
}

export function useWorkData(id: number, options: WorkDataOptions) {
  const { fail } = useFeedback()
  const work = ref<Work>()
  const chapters = ref<Chapter[]>([])
  const orderChapters = ref<Chapter[]>([])
  const directoryLoading = ref(false)
  const chapterCount = computed(() => work.value?.chapter_count || 0)
  const loading = ref(true)
  const error = ref('')
  const search = ref('')
  const chapterFilter = ref('all')
  const expanded = ref<number[]>([])
  const chapterPage = ref(1)
  const pageSize = ref(20)
  const pageTotal = ref(0)
  const pageIds = ref<number[]>([])
  const pageLoading = ref(false)
  const serverChanged = ref(false)
  let pageController: AbortController | undefined
  let directoryController: AbortController | undefined
  let loadVersion = 0
  function primary(chapter: Chapter) {
    return chapter.resources.find((resource) => resource.id === chapter.primary_media_id) || null
  }
  const resources = computed(() => chapters.value.flatMap((chapter) => chapter.resources))
  const totalSize = computed(() => work.value?.byte_size || 0)
  const searchText = computed(() => search.value.trim().toLocaleLowerCase())
  function matches(value: string) {
    return value.toLocaleLowerCase().includes(searchText.value)
  }
  function matchesResource(resource: AudioResource) {
    return matches(
      `${resource.name} ${resource.uploader.display_name} ${resource.uploader.username}`,
    )
  }
  function alternatives(chapter: Chapter) {
    return chapter.resources.filter((resource) => resource.id !== chapter.primary_media_id)
  }
  function highlighted(value: string) {
    const text = searchText.value
    if (!text) return [{ text: value, matched: false }]
    const parts: { text: string; matched: boolean }[] = []
    const normalized = value.toLocaleLowerCase()
    let offset = 0
    let index = normalized.indexOf(text)
    while (index >= 0) {
      if (index > offset) parts.push({ text: value.slice(offset, index), matched: false })
      parts.push({ text: value.slice(index, index + text.length), matched: true })
      offset = index + text.length
      index = normalized.indexOf(text, offset)
    }
    if (offset < value.length) parts.push({ text: value.slice(offset), matched: false })
    return parts
  }
  const filtered = computed(() => Boolean(search.value.trim() || chapterFilter.value !== 'all'))
  const matchingOrder = computed(() =>
    orderChapters.value
      .map((chapter, index) => ({ chapter, index }))
      .filter(({ chapter }) =>
        matches(`${chapter.title} S${chapter.season_number}E${chapter.episode_number}`),
      ),
  )
  const chapterRows = computed(
    () => new Map(chapters.value.map((chapter, index) => [chapter.id, { chapter, index }])),
  )
  const visibleChapters = computed(() => {
    const rows = options.isSorting()
      ? matchingOrder.value.slice(
          (chapterPage.value - 1) * pageSize.value,
          chapterPage.value * pageSize.value,
        )
      : pageIds.value.flatMap((id) => {
          const row = chapterRows.value.get(id)
          return row ? [row] : []
        })
    return rows.map(({ chapter, index }) => {
      const main = primary(chapter)
      const others = alternatives(chapter)
      return {
        chapter,
        index,
        alternatives: others,
        sections: [
          { primary: true, resources: main ? [main] : [] },
          { primary: false, resources: others },
        ],
      }
    })
  })
  watch([searchText, chapters], () => {
    if (searchText.value)
      expanded.value = [
        ...new Set([
          ...expanded.value,
          ...chapters.value
            .filter((chapter) => alternatives(chapter).some(matchesResource))
            .map((chapter) => chapter.id),
        ]),
      ]
  })

  async function loadPage(page = chapterPage.value) {
    if (options.isSorting()) {
      chapterPage.value = page
      return
    }
    pageController?.abort()
    const request = new AbortController()
    pageController = request
    pageLoading.value = true
    try {
      const result = await api
        .get(`works/${id}/chapter-page`, {
          signal: request.signal,
          searchParams: { q: search.value.trim(), filter: chapterFilter.value, page },
        })
        .json<Paginated<Chapter>>()
      if (request.signal.aborted) return
      pageTotal.value = result.total
      pageSize.value = result.page_size
      if (page > 1 && !result.items.length) {
        await loadPage(Math.max(1, Math.ceil(result.total / result.page_size)))
        return
      }
      chapterPage.value = result.page
      pageIds.value = result.items.map((chapter) => chapter.id)
      const retained = new Set(options.retainedChapterIds())
      const loaded = new Set(pageIds.value)
      chapters.value = [
        ...chapters.value.filter((chapter) => retained.has(chapter.id) && !loaded.has(chapter.id)),
        ...result.items.map((chapter) => ({
          ...chapter,
          resources_count: chapter.resources.length,
        })),
      ]
    } catch (cause) {
      if (!request.signal.aborted) fail(cause)
    } finally {
      if (!request.signal.aborted) pageLoading.value = false
    }
  }
  async function load() {
    const version = ++loadVersion
    pageController?.abort()
    directoryController?.abort()
    directoryLoading.value = false
    error.value = ''
    try {
      const result = await api.get(`works/${id}`).json<{ data: Work }>()
      if (version !== loadVersion) return
      work.value = result.data
      serverChanged.value = false
      options.onReload()
      chapters.value = []
      orderChapters.value = []
      pageIds.value = []
      await loadPage()
    } catch (cause) {
      if (version === loadVersion)
        error.value = cause instanceof Error ? cause.message : '作品暂时没有找到。'
    } finally {
      if (version === loadVersion) loading.value = false
    }
  }

  async function loadDirectory() {
    directoryController?.abort()
    const request = new AbortController()
    directoryController = request
    directoryLoading.value = true
    try {
      const result = await api
        .get(`works/${id}/chapter-directory`, { signal: request.signal })
        .json<{ revision: number; items: Omit<Chapter, 'resources'>[] }>()
      if (request.signal.aborted) return false
      if (result.revision !== work.value?.revision) {
        serverChanged.value = true
        throw new Error('章节有新改动，请刷新作品后再调整顺序。')
      }
      orderChapters.value = result.items.map((chapter) => ({ ...chapter, resources: [] }))
      return true
    } catch (cause) {
      if (!request.signal.aborted) throw cause
      return false
    } finally {
      if (!request.signal.aborted) directoryLoading.value = false
    }
  }

  useEventListener(window, 'audio-published', (event) => {
    const result = (event as CustomEvent<UploadResult & { work_id: number }>).detail
    if (result.work_id !== id) return
    if (options.isSorting()) {
      serverChanged.value = true
      return
    }
    if (result.work && work.value) Object.assign(work.value, result.work)
    if (result.chapter) {
      const item = { ...result.chapter, resources_count: result.chapter.resources.length }
      const index = chapters.value.findIndex((chapter) => chapter.id === item.id)
      if (index >= 0) chapters.value[index] = item
      const last = chapters.value.find((chapter) => chapter.id === pageIds.value.at(-1))
      if (
        !filtered.value &&
        Math.ceil(chapterCount.value / pageSize.value) === chapterPage.value &&
        pageIds.value.length < pageSize.value &&
        (!last || item.index >= last.index) &&
        !pageIds.value.includes(item.id)
      ) {
        if (index < 0) chapters.value.push(item)
        pageIds.value.push(item.id)
      }
      pageTotal.value = filtered.value ? pageTotal.value : chapterCount.value
      if (filtered.value) void loadPage()
    } else void load()
  })
  watchDebounced(
    [search, chapterFilter],
    () => {
      chapterPage.value = 1
      if (!options.isSorting()) void loadPage(1)
    },
    { debounce: 300 },
  )
  function sortingChanged(active: boolean) {
    pageController?.abort()
    pageLoading.value = false
    chapterPage.value = 1
    if (!active) {
      orderChapters.value = []
      void loadPage(1)
    }
  }
  let polling = false
  const statusController = new AbortController()
  async function refreshStatus() {
    if (document.hidden || !work.value || polling) return
    polling = true
    try {
      const result = (
        await api
          .get(`works/${id}/status`, { signal: statusController.signal })
          .json<{ data: Partial<Work> }>()
      ).data
      if (statusController.signal.aborted) return
      if (result.revision !== work.value.revision) {
        if (options.hasPendingChanges()) serverChanged.value = true
        else await load()
      } else Object.assign(work.value, result)
    } catch {
      /* Retain the last known state on a transient network failure. */
    } finally {
      polling = false
    }
  }
  const statusTimer = window.setInterval(refreshStatus, 10000)
  useEventListener(document, 'visibilitychange', () => {
    if (!document.hidden) void refreshStatus()
  })
  onScopeDispose(() => {
    clearInterval(statusTimer)
    statusController.abort()
    pageController?.abort()
    directoryController?.abort()
    loadVersion++
  })

  function clearFilters() {
    search.value = ''
    chapterFilter.value = 'all'
  }
  return {
    work,
    chapters,
    orderChapters,
    directoryLoading,
    chapterCount,
    loading,
    error,
    search,
    chapterFilter,
    expanded,
    chapterPage,
    pageSize,
    pageTotal,
    pageLoading,
    serverChanged,
    resources,
    totalSize,
    searchText,
    matchesResource,
    primary,
    highlighted,
    filtered,
    matchingOrder,
    visibleChapters,
    clearFilters,
    load,
    loadPage,
    loadDirectory,
    sortingChanged,
  }
}
