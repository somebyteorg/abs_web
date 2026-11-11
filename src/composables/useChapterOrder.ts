import { computed, nextTick, ref, type Ref } from 'vue'
import { compareEpisodeOrder } from '@/utils/chapters'
import type { Chapter } from '@/types'

export function useChapterOrder(chapters: Ref<Chapter[]>, onMoved?: (id: number) => void) {
  const active = ref(false)
  const dirty = ref(false)
  const selected = ref<number[]>([])
  const moveOpen = ref(false)
  const movingIds = ref<number[]>([])
  const mode = ref<'position' | 'before' | 'after'>('position')
  const position = ref(1)
  const targetId = ref(0)
  const query = ref('')
  const original = ref<number[]>([])
  const undoStack = ref<number[][]>([])
  const canUndo = computed(() => undoStack.value.length > 0)
  const episodeOrder = computed(() => [...chapters.value].sort(compareEpisodeOrder))
  const matchesEpisodeOrder = computed(() =>
    episodeOrder.value.every((chapter, index) => chapter.id === chapters.value[index]?.id),
  )
  const moving = computed(() => {
    const ids = new Set(movingIds.value)
    return chapters.value.filter((chapter) => ids.has(chapter.id))
  })
  const remaining = computed(() => {
    const ids = new Set(movingIds.value)
    return chapters.value.filter((chapter) => !ids.has(chapter.id))
  })
  const maxPosition = computed(() => remaining.value.length + 1)
  const matches = computed(() => {
    const term = query.value.trim().toLocaleLowerCase()
    const ids = new Set(movingIds.value)
    return chapters.value
      .map((chapter, index) => ({
        id: chapter.id,
        label: `第 ${index + 1} 位 · S${chapter.season_number}E${chapter.episode_number} ${chapter.title}`,
      }))
      .filter((chapter) => !ids.has(chapter.id) && chapter.label.toLocaleLowerCase().includes(term))
  })
  const matchCount = computed(() => matches.value.length)
  const candidates = computed(() => {
    const items = matches.value.slice(0, 100)
    if (targetId.value && !items.some((item) => item.id === targetId.value)) {
      const chapter = chapters.value.find((chapter) => chapter.id === targetId.value)
      if (chapter && !movingIds.value.includes(chapter.id))
        items.unshift({
          id: chapter.id,
          label: `S${chapter.season_number}E${chapter.episode_number} ${chapter.title}`,
        })
    }
    return items
  })
  const valid = computed(
    () =>
      moving.value.length > 0 &&
      (mode.value === 'position'
        ? Number.isInteger(position.value) &&
          position.value >= 1 &&
          position.value <= maxPosition.value
        : remaining.value.some((chapter) => chapter.id === targetId.value)),
  )
  const summary = computed(() => {
    const names = moving.value
      .slice(0, 3)
      .map((chapter) => `「${chapter.title}」`)
      .join('、')
    return moving.value.length > 3 ? `${names}等 ${moving.value.length} 个章节` : names
  })

  function updateDirty() {
    dirty.value = chapters.value.some((chapter, index) => chapter.id !== original.value[index])
  }
  function reset() {
    original.value = chapters.value.map((chapter) => chapter.id)
    dirty.value = false
    selected.value = []
    undoStack.value = []
    moveOpen.value = false
  }
  function begin() {
    reset()
    active.value = true
  }
  function finish() {
    active.value = false
    reset()
  }
  function restoreOrder(ids: number[]) {
    const byId = new Map(chapters.value.map((chapter) => [chapter.id, chapter]))
    chapters.value = ids.map((id) => byId.get(id)!).filter(Boolean)
    updateDirty()
  }
  function cancel() {
    restoreOrder(original.value)
    finish()
  }
  function commit(next: Chapter[]) {
    if (next.every((chapter, index) => chapter.id === chapters.value[index]?.id)) return
    undoStack.value = [...undoStack.value.slice(-19), chapters.value.map((chapter) => chapter.id)]
    chapters.value = next
    updateDirty()
  }
  function undo() {
    const previous = undoStack.value.pop()
    if (previous) restoreOrder(previous)
  }
  function useEpisodeOrder() {
    commit(episodeOrder.value)
    selected.value = []
  }
  function step(index: number, direction: number) {
    const target = index + direction
    if (target < 0 || target >= chapters.value.length) return
    const next = [...chapters.value]
    const chapter = next.splice(index, 1)[0]
    if (chapter) next.splice(target, 0, chapter)
    commit(next)
    if (chapter) onMoved?.(chapter.id)
  }
  function open(ids = selected.value) {
    movingIds.value = [...ids]
    query.value = ''
    targetId.value = 0
    mode.value = 'position'
    position.value = Math.min(
      maxPosition.value,
      Math.max(1, chapters.value.findIndex((chapter) => ids.includes(chapter.id)) + 1),
    )
    moveOpen.value = moving.value.length > 0
  }
  async function apply() {
    if (!valid.value) return
    const index =
      mode.value === 'position'
        ? position.value - 1
        : remaining.value.findIndex((chapter) => chapter.id === targetId.value) +
          (mode.value === 'after' ? 1 : 0)
    const next = [...remaining.value]
    next.splice(index, 0, ...moving.value)
    const first = moving.value[0]?.id
    selected.value = [...movingIds.value]
    commit(next)
    moveOpen.value = false
    if (first) onMoved?.(first)
    await nextTick()
    if (first) document.getElementById(`chapter-${first}`)?.scrollIntoView({ block: 'center' })
  }
  function edge(last: boolean) {
    open()
    position.value = last ? maxPosition.value : 1
    void apply()
  }

  return {
    active,
    dirty,
    selected,
    moveOpen,
    moving,
    mode,
    position,
    targetId,
    query,
    candidates,
    matchCount,
    maxPosition,
    valid,
    summary,
    canUndo,
    matchesEpisodeOrder,
    reset,
    begin,
    finish,
    cancel,
    undo,
    useEpisodeOrder,
    step,
    open,
    apply,
    edge,
  }
}
