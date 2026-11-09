import { computed, ref, watch, type Ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import api from '@/utils/ky'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { useFeedback } from '@/composables/useFeedback'
import { useChapterOptions } from '@/composables/useChapterOptions'
import type { AudioResource, Chapter, OrganizePreview, Paginated, Work } from '@/types'

type Mode = 'edit' | 'move' | 'merge'
export interface DraftRow {
  chapter_id: number
  media_id?: number
  title: string
  season_number: number
  episode_number: number
  name: string
  original_title: string
  original_season: number
  original_episode: number
  filename: string
}

export function useChapterOrganizer(
  workId: number,
  work: Ref<Work | undefined>,
  chapters: Ref<Chapter[]>,
  refresh: () => Promise<void>,
) {
  const { notify, fail } = useFeedback()
  const open = ref(false)
  const busy = ref(false)
  const mode = ref<Mode>('edit')
  const rows = ref<DraftRow[]>([])
  const mergeIds = ref<number[]>([])
  const mergeTarget = ref(0)
  const plan = ref<OrganizePreview | null>(null)
  const primaries = ref<Record<string, number>>({})
  const titleRule = ref<'keep' | 'replace' | 'template' | 'file'>('keep')
  const find = ref('')
  const replace = ref('')
  const template = ref('第 {n} 章')
  const numberStart = ref(1)
  const numbering = ref<'keep' | 'offset' | 'sequence'>('keep')
  const offset = ref(0)
  const season = ref(1)
  const episodeStart = ref(1)
  const moveMode = ref<'fixed' | 'sequence' | 'offset' | 'manual'>('fixed')
  const fixedChapter = ref(0)
  const fixedTitle = ref('')
  const targetWorkId = ref(workId)
  const workQuery = ref('')
  const workChoices = ref<Work[]>([])
  const selectedWork = ref<Work>()
  const worksLoading = ref(false)
  const chapterOptions = useChapterOptions(
    () => (mode.value === 'merge' ? workId : targetWorkId.value),
    () => open.value && mode.value !== 'edit' && !plan.value,
    () =>
      mode.value === 'merge'
        ? [mergeTarget.value]
        : [fixedChapter.value, ...rows.value.map((row) => row.chapter_id)],
    () => (targetWorkId.value === workId ? chapters.value : []),
  )
  const targetChapters = chapterOptions.options
  const targetsLoading = chapterOptions.loading
  const targetError = chapterOptions.error
  useUnsavedChanges(
    () => open.value && Boolean(rows.value.length),
    '章节或资源的整理方案尚未保存，离开后将丢失方案。',
  )
  const unresolved = computed(
    () => plan.value?.groups.filter((group) => !primaries.value[group.key]).length || 0,
  )
  const ready = computed(() => Boolean(plan.value) && unresolved.value === 0)
  const dialogTitle = computed(() =>
    mode.value === 'edit'
      ? '批量修改章节'
      : mode.value === 'merge'
        ? '合并章节'
        : '移动 / 批量归位资源',
  )
  const targetWorks = computed(() => [
    ...new Map(
      [
        ...(work.value ? [work.value] : []),
        ...(selectedWork.value ? [selectedWork.value] : []),
        ...workChoices.value,
      ].map((entry) => [entry.id, entry]),
    ).values(),
  ])

  function draft(chapter: Chapter, resource?: AudioResource): DraftRow {
    return {
      chapter_id: chapter.id,
      media_id: resource?.id,
      title: chapter.title,
      season_number: chapter.season_number,
      episode_number: chapter.episode_number,
      name: resource?.name || chapter.title,
      original_title: chapter.title,
      original_season: chapter.season_number,
      original_episode: chapter.episode_number,
      filename:
        resource?.name.replace(/\.[^.]+$/, '') ||
        chapter.resources
          .find((entry) => entry.id === chapter.primary_media_id)
          ?.name.replace(/\.[^.]+$/, '') ||
        chapter.title,
    }
  }
  function reset(action: Mode) {
    mode.value = action
    plan.value = null
    primaries.value = {}
    titleRule.value = 'keep'
    numbering.value = 'keep'
    offset.value = 0
    find.value = ''
    replace.value = ''
    template.value = '第 {n} 章'
    numberStart.value = 1
    targetWorkId.value = workId
    chapterOptions.reset()
    workQuery.value = ''
    workChoices.value = []
    selectedWork.value = undefined
    targetError.value = ''
    worksLoading.value = false
    open.value = true
  }
  function limit(count: number) {
    if (count > 2000) {
      fail(new Error('一次最多整理 2000 项，请缩小选择范围。'))
      return false
    }
    return count > 0
  }
  function edit(selected: Chapter[]) {
    if (!limit(selected.length)) return
    reset('edit')
    rows.value = selected.map((chapter) => draft(chapter))
    season.value = selected[0]?.season_number ?? 1
    episodeStart.value = selected[0]?.episode_number ?? 1
  }
  function merge(selected: Chapter[]) {
    if (!limit(selected.length)) return
    reset('merge')
    mergeIds.value = selected.map((chapter) => chapter.id)
    mergeTarget.value =
      selected.length > 1
        ? selected[0]!.id
        : chapters.value.find((chapter) => chapter.id !== selected[0]?.id)?.id || 0
    rows.value = selected.map((chapter) => draft(chapter))
  }
  function move(selected: AudioResource[]) {
    if (!limit(selected.length)) return
    reset('move')
    rows.value = selected.map((resource) =>
      draft(
        chapters.value.find((chapter) => chapter.id === resource.abs_item_id)!,
        resource,
      ),
    )
    moveMode.value = selected.length > 1 ? 'offset' : 'fixed'
    fixedChapter.value = 0
    fixedTitle.value = rows.value[0]?.title || ''
    season.value = rows.value[0]?.original_season ?? 1
    episodeStart.value = rows.value[0]?.original_episode ?? 1
    applyRules()
  }
  function titleFor(row: DraftRow, index: number) {
    if (titleRule.value === 'replace')
      return find.value
        ? row.original_title.split(find.value).join(replace.value)
        : row.original_title
    if (titleRule.value === 'template')
      return template.value.replaceAll('{n}', String(Number(numberStart.value) + index))
    return titleRule.value === 'file' ? row.filename : row.original_title
  }
  function applyRules() {
    if (!open.value || plan.value) return
    rows.value.forEach((row, index) => {
      if (mode.value === 'edit') {
        row.title = titleFor(row, index)
        row.season_number =
          numbering.value === 'sequence' ? Number(season.value) : row.original_season
        row.episode_number =
          numbering.value === 'offset'
            ? row.original_episode + Number(offset.value)
            : numbering.value === 'sequence'
              ? Number(episodeStart.value) + index
              : row.original_episode
      }
      if (mode.value === 'move' && moveMode.value !== 'manual') {
        const target =
          moveMode.value === 'fixed'
            ? targetChapters.value.find((chapter) => chapter.id === Number(fixedChapter.value))
            : undefined
        row.chapter_id = target?.id || 0
        row.season_number =
          target?.season_number ??
          (moveMode.value === 'offset' ? row.original_season : Number(season.value))
        row.episode_number =
          target?.episode_number ??
          (moveMode.value === 'sequence'
            ? Number(episodeStart.value) + index
            : moveMode.value === 'offset'
              ? row.original_episode + Number(offset.value)
              : Number(episodeStart.value))
        row.title =
          target?.title ?? (moveMode.value === 'fixed' ? fixedTitle.value : titleFor(row, index))
      }
    })
  }
  watch(
    [
      titleRule,
      find,
      replace,
      template,
      numberStart,
      numbering,
      offset,
      season,
      episodeStart,
      moveMode,
      fixedChapter,
      fixedTitle,
    ],
    applyRules,
  )
  watch([targetWorkId, open, mode], ([id]) => {
    if (!open.value || mode.value !== 'move') return
    selectedWork.value = targetWorks.value.find((entry) => entry.id === id)
    fixedChapter.value = 0
    rows.value.forEach((row) => {
      row.chapter_id = 0
    })
    applyRules()
  })
  watch(targetChapters, applyRules)
  watchDebounced(
    [workQuery, open, mode],
    async (_, __, onCleanup) => {
      if (!open.value || mode.value !== 'move') return
      const controller = new AbortController()
      onCleanup(() => controller.abort())
      worksLoading.value = true
      try {
        const result = await api
          .get('works', {
            signal: controller.signal,
            searchParams: { q: workQuery.value.trim(), type: work.value?.type || 'book' },
          })
          .json<Paginated<Work>>()
        if (!controller.signal.aborted) workChoices.value = result.items
      } catch (error) {
        if (!controller.signal.aborted) fail(error)
      } finally {
        if (!controller.signal.aborted) worksLoading.value = false
      }
    },
    { debounce: 300 },
  )
  function sortFiles() {
    rows.value.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))
    applyRules()
  }
  async function preview() {
    if (busy.value || targetsLoading.value || targetError.value) return
    if (
      mode.value !== 'merge' &&
      rows.value.some(
        (row) =>
          !row.title.trim() ||
          row.title.length > 255 ||
          ![row.season_number, row.episode_number].every(
            (value) =>
              typeof value === 'number' &&
              Number.isInteger(value) &&
              value >= 0 &&
              value <= 1000000,
          ),
      )
    ) {
      fail(
        new Error('请检查各行标题和编号：标题需为 1 至 255 字，季 / 集需为 0 至 1000000 的整数。'),
      )
      return
    }
    busy.value = true
    try {
      const command =
        mode.value === 'merge'
          ? {
              action: 'merge',
              chapter_ids: mergeIds.value,
              target_chapter_id: Number(mergeTarget.value),
            }
          : {
              action: mode.value,
              target_work_id: Number(targetWorkId.value),
              rows: rows.value.map((row) => ({
                chapter_id: mode.value === 'move' ? Number(row.chapter_id) || null : row.chapter_id,
                media_id: row.media_id,
                title: row.title.trim(),
                season_number: Number(row.season_number),
                episode_number: Number(row.episode_number),
              })),
            }
      plan.value = await api
        .post(`works/${workId}/organize/preview`, { json: command })
        .json<OrganizePreview>()
      primaries.value = {}
    } catch (error) {
      fail(error)
    } finally {
      busy.value = false
    }
  }
  function chooseByRule(rule: 'existing' | 'incoming') {
    for (const group of plan.value?.groups || []) {
      const candidates =
        rule === 'existing'
          ? group.resources.filter((resource) => resource.id === group.previous_primary_id)
          : group.resources.filter((resource) => resource.incoming)
      if (candidates.length === 1) primaries.value[group.key] = candidates[0]!.id
    }
  }
  async function apply() {
    if (!plan.value || !ready.value || busy.value) return
    busy.value = true
    try {
      await api.post(`works/${workId}/organize/${plan.value.token}`, {
        json: { primaries: primaries.value },
      })
      open.value = false
      plan.value = null
      await refresh()
      notify('整理已完成，原上传者与贡献记录保留。')
    } catch (error) {
      fail(error)
    } finally {
      busy.value = false
    }
  }
  return {
    open,
    busy,
    mode,
    rows,
    mergeIds,
    mergeTarget,
    plan,
    primaries,
    ready,
    unresolved,
    dialogTitle,
    titleRule,
    find,
    replace,
    template,
    numberStart,
    numbering,
    offset,
    season,
    episodeStart,
    moveMode,
    fixedChapter,
    fixedTitle,
    targetWorkId,
    workQuery,
    targetWorks,
    targetChapters,
    targetsLoading,
    worksLoading,
    targetError,
    targetChapterQuery: chapterOptions.query,
    targetChapterPage: chapterOptions.page,
    targetChapterResult: chapterOptions.result,
    retryTargets: chapterOptions.load,
    edit,
    merge,
    move,
    sortFiles,
    preview,
    chooseByRule,
    apply,
  }
}
