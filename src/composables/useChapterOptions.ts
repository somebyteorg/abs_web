import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useCollection } from '@/composables/useCollection'
import type { ChapterOption } from '@/types'

export function useChapterOptions(
  workId: () => number,
  enabled: () => boolean,
  selected: () => number[],
  initial: () => ChapterOption[],
) {
  const query = ref('')
  const term = ref('')
  const page = ref(1)
  const known = ref<ChapterOption[]>([])
  const collection = useCollection<ChapterOption>(
    () => `works/${workId()}/chapters`,
    () => ({ q: term.value, page: page.value }),
    enabled,
  )
  watch(
    () => collection.result.value.items,
    (items) => {
      const ids = new Set(selected())
      known.value = [
        ...new Map(
          [...known.value.filter((chapter) => ids.has(chapter.id)), ...items].map((chapter) => [
            chapter.id,
            chapter,
          ]),
        ).values(),
      ]
    },
  )
  const options = computed(() => {
    const ids = new Set(selected())
    return [
      ...new Map(
        [
          ...initial().filter((chapter) => ids.has(chapter.id)),
          ...known.value.filter((chapter) => ids.has(chapter.id)),
          ...collection.result.value.items,
        ].map((chapter) => [chapter.id, chapter]),
      ).values(),
    ]
  })
  function reset() {
    query.value = ''
    term.value = ''
    page.value = 1
    known.value = []
    collection.result.value = { page: 1, page_size: 20, total: 0, items: [] }
  }
  watch(workId, reset, { flush: 'sync' })
  watchDebounced(
    query,
    (value) => {
      page.value = 1
      term.value = value.trim()
    },
    { debounce: 300 },
  )
  return { ...collection, options, query, page, reset }
}
