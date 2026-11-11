import { computed, ref, watch } from 'vue'
import type { useChapterOrder } from '@/composables/useChapterOrder'
import type { useWorkData } from '@/composables/useWorkData'

type WorkData = ReturnType<typeof useWorkData>

export function useChapterSelection(data: WorkData, order: ReturnType<typeof useChapterOrder>) {
  const {
    chapters,
    orderChapters,
    resources,
    visibleChapters,
    expanded,
    search,
    chapterFilter,
    chapterOrder,
  } = data
  const { active: reorderMode, selected: orderSelected } = order
  const selectionMode = ref<'chapter' | 'resource' | null>(null)
  const selectedChapters = ref<number[]>([])
  const selectedResources = ref<number[]>([])
  const selectedChapterIds = computed(() =>
    reorderMode.value ? orderSelected.value : selectedChapters.value,
  )
  const chosenChapters = computed(() =>
    chapters.value.filter((chapter) => selectedChapters.value.includes(chapter.id)),
  )
  const chosenResources = computed(() =>
    resources.value.filter((resource) => selectedResources.value.includes(resource.id)),
  )
  const retainedChapterIds = computed(() => [
    ...selectedChapters.value,
    ...chosenResources.value.map((resource) => resource.abs_item_id),
  ])

  function toggleExpand(chapterId: number) {
    expanded.value = expanded.value.includes(chapterId)
      ? expanded.value.filter((value) => value !== chapterId)
      : [...expanded.value, chapterId]
  }
  let lastChapter = -1
  let lastResource = -1
  watch([search, chapterFilter, chapterOrder], () => {
    lastChapter = -1
    lastResource = -1
  })
  function select(kind: 'chapter' | 'resource', itemId: number, event: Event) {
    const values =
      kind === 'chapter'
        ? reorderMode.value
          ? orderSelected
          : selectedChapters
        : selectedResources
    const visible = kind === 'chapter' ? visibleChapterIds.value : visibleResourceIds.value
    const index = visible.indexOf(itemId)
    const previous = kind === 'chapter' ? lastChapter : lastResource
    const ids =
      (event as MouseEvent).shiftKey && previous >= 0 && index >= 0
        ? visible.slice(Math.min(previous, index), Math.max(previous, index) + 1)
        : [itemId]
    values.value = (event.target as HTMLInputElement).checked
      ? [...new Set([...values.value, ...ids])]
      : values.value.filter((value) => !ids.includes(value))
    if (kind === 'chapter') lastChapter = index
    else lastResource = index
  }
  function selectVisible(checked: boolean) {
    const values =
      reorderMode.value || selectionMode.value === 'chapter'
        ? reorderMode.value
          ? orderSelected
          : selectedChapters
        : selectedResources
    values.value = checked
      ? [...new Set([...values.value, ...visibleSelectionIds.value])]
      : values.value.filter((value) => !visibleSelectionIds.value.includes(value))
  }
  function setSelectionMode(mode: 'chapter' | 'resource' | null) {
    clearSelection()
    selectionMode.value = mode
  }

  const visibleChapterIds = computed(() => visibleChapters.value.map(({ chapter }) => chapter.id))
  const visibleResourceIds = computed(() =>
    visibleChapters.value.flatMap(({ chapter, sections }) =>
      sections.flatMap((section) =>
        section.primary || expanded.value.includes(chapter.id)
          ? section.resources.map((resource) => resource.id)
          : [],
      ),
    ),
  )
  const selectedKind = computed(() => selectionMode.value || 'chapter')
  const visibleSelectionIds = computed(() =>
    selectedKind.value === 'chapter' ? visibleChapterIds.value : visibleResourceIds.value,
  )
  const selectedCount = computed(
    () => selectedChapters.value.length + selectedResources.value.length,
  )
  const hiddenSelectionCount = computed(() =>
    selectedKind.value === 'chapter'
      ? selectedChapters.value.filter((id) => !visibleChapterIds.value.includes(id)).length
      : selectedResources.value.filter((id) => !visibleResourceIds.value.includes(id)).length,
  )
  const allVisibleSelected = computed(
    () =>
      visibleSelectionIds.value.length > 0 &&
      visibleSelectionIds.value.every((id) =>
        selectedKind.value === 'chapter'
          ? selectedChapterIds.value.includes(id)
          : selectedResources.value.includes(id),
      ),
  )
  const someVisibleSelected = computed(
    () =>
      !allVisibleSelected.value &&
      visibleSelectionIds.value.some((id) =>
        selectedKind.value === 'chapter'
          ? selectedChapterIds.value.includes(id)
          : selectedResources.value.includes(id),
      ),
  )
  const expandableIds = computed(() =>
    visibleChapters.value.filter((row) => row.alternatives.length).map((row) => row.chapter.id),
  )
  const allExpanded = computed(
    () =>
      expandableIds.value.length > 0 &&
      expandableIds.value.every((id) => expanded.value.includes(id)),
  )

  function clearSelection() {
    selectedChapters.value = []
    selectedResources.value = []
    lastChapter = -1
    lastResource = -1
  }
  function retainVisibleSelection() {
    selectedChapters.value = selectedChapters.value.filter((id) =>
      visibleChapterIds.value.includes(id),
    )
    selectedResources.value = selectedResources.value.filter((id) =>
      visibleResourceIds.value.includes(id),
    )
  }
  function toggleAllExpanded() {
    expanded.value = allExpanded.value
      ? expanded.value.filter((id) => !expandableIds.value.includes(id))
      : [...new Set([...expanded.value, ...expandableIds.value])]
  }

  watch([chapters, orderChapters], () => {
    lastChapter = -1
    lastResource = -1
  })
  watch(expanded, () => {
    lastResource = -1
  })
  return {
    selectionMode,
    selectedChapters,
    selectedResources,
    selectedChapterIds,
    chosenChapters,
    chosenResources,
    retainedChapterIds,
    selectedCount,
    hiddenSelectionCount,
    allVisibleSelected,
    someVisibleSelected,
    expandableIds,
    allExpanded,
    select,
    selectVisible,
    setSelectionMode,
    clearSelection,
    retainVisibleSelection,
    toggleExpand,
    toggleAllExpanded,
  }
}
