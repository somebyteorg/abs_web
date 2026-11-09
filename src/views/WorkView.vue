<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseDialog from '@/components/BaseDialog.vue'
import Pagination from '@/components/Pagination.vue'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import WorkForm from '@/components/WorkForm.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useSignStore } from '@/stores/sign'
import { usePlayerStore } from '@/stores/player'
import { useFeedback } from '@/composables/useFeedback'
import { useUploadQueue } from '@/composables/useUploadQueue'
import { useChapterOrganizer, type DraftRow } from '@/composables/useChapterOrganizer'
import { useWorkActions } from '@/composables/useWorkActions'
import { useWorkTargetPicker } from '@/composables/useWorkTargetPicker'
import { useWorkData } from '@/composables/useWorkData'
import { useChapterSelection } from '@/composables/useChapterSelection'
import { useChapterOrder } from '@/composables/useChapterOrder'
import { bytes, date, duration } from '@/utils/format'
const route = useRoute()
const id = Number(route.params.id)
const backTo = computed(() =>
  typeof route.query.from === 'string' &&
  (route.query.from === '/' || route.query.from.startsWith('/?'))
    ? route.query.from
    : '/',
)
const player = usePlayerStore()
const sign = useSignStore()
const catalog = useCatalogStore()
const { fail } = useFeedback()
const data = useWorkData(id, {
  isSorting: () => order.active.value,
  retainedChapterIds: () => selection.retainedChapterIds.value,
  hasPendingChanges: () =>
    order.dirty.value ||
    order.active.value ||
    data.directoryLoading.value ||
    editOpen.value ||
    organizeOpen.value ||
    chapterOpen.value ||
    actionBusy.value ||
    selectedCount.value > 0,
  onReload: () => {
    selection.clearSelection()
    order.reset()
  },
})
const {
  work,
  chapters,
  orderChapters,
  chapterCount,
  directoryLoading,
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
  highlighted,
  filtered: hasFilters,
  matchingOrder,
  visibleChapters,
  clearFilters,
  load,
  loadPage,
} = data
const order = useChapterOrder(orderChapters, (id) => {
  const index = matchingOrder.value.findIndex(({ chapter }) => chapter.id === id)
  if (index >= 0) chapterPage.value = Math.floor(index / pageSize.value) + 1
})
const {
  active: reorderMode,
  dirty: orderDirty,
  selected: orderSelected,
  moveOpen: orderMoveOpen,
  mode: orderMoveMode,
  position: orderPosition,
  targetId: orderTargetId,
  query: orderQuery,
  candidates: orderCandidates,
  matchCount: orderMatchCount,
  maxPosition: orderMaxPosition,
  valid: orderMoveValid,
  summary: orderMoveSummary,
  canUndo: orderCanUndo,
} = order
watch(reorderMode, data.sortingChanged)
const {
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
} = useWorkActions(id, data, order, () => busy.value, backTo)
const selection = useChapterSelection(data, order)
const {
  selectionMode,
  selectedResources,
  selectedChapterIds,
  chosenChapters,
  chosenResources,
  selectedCount,
  hiddenSelectionCount,
  allVisibleSelected,
  someVisibleSelected,
  expandableIds,
  allExpanded,
  select,
  selectVisible,
  setSelectionMode,
  retainVisibleSelection,
  toggleExpand,
  toggleAllExpanded,
} = selection
useUnsavedChanges(() => orderDirty.value, '章节顺序尚未保存，离开后将丢失调整。')
function setDraftTarget(row: DraftRow) {
  moveMode.value = 'manual'
  const target = targetChapters.value.find((chapter) => chapter.id === row.chapter_id)
  if (target) {
    row.title = target.title
    row.season_number = target.season_number
    row.episode_number = target.episode_number
  }
}
const {
  queue,
  running,
  pending,
  completed,
  queueFilter,
  queueIssues,
  visibleQueue,
  uploadChapterQuery,
  uploadChapters,
  uploadChapterPage,
  uploadChapterResult,
  uploadChaptersLoading,
  uploadChapterError,
  reloadUploadChapters,
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
  move,
  start,
  pause,
  remove,
  reference,
  skip,
  duplicates,
} = useUploadQueue(id, data, () => busy.value || reorderMode.value)
const organizer = useChapterOrganizer(id, work, chapters, load)
const {
  open: organizeOpen,
  busy: organizeBusy,
  mode: organizeMode,
  rows: organizeRows,
  mergeTarget,
  plan,
  primaries,
  ready: planReady,
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
  targetChapterQuery,
  targetChapterPage,
  targetChapterResult,
  unresolved,
} = organizer
const {
  targetPickerOpen,
  targetOption,
  selectedTargetWork,
  targetName,
  chooseTargetWork,
  toggleTargetPicker,
  targetPickerKey,
} = useWorkTargetPicker(targetWorks, targetWorkId, [organizeOpen, workQuery])
const busy = computed(
  () =>
    saving.value ||
    actionBusy.value ||
    running.value ||
    organizeBusy.value ||
    pageLoading.value ||
    directoryLoading.value,
)
onMounted(async () => {
  await Promise.allSettled([load(), catalog.load().catch(fail)])
})
async function startOrder() {
  if (busy.value) return
  try {
    if (!(await data.loadDirectory())) return
    setSelectionMode(null)
    clearFilters()
    order.begin()
  } catch (cause) {
    fail(cause)
  }
}
</script>

<template>
  <div class="detail-toolbar">
    <RouterLink :to="backTo" class="back-link">← 作品列表</RouterLink>
    <div v-if="work" :class="['sync-line', { error: work.sync_status === 'error' }]">
      <span class="status-dot"></span
      >{{
        work.publication_state === 'empty'
          ? '无音频未上架'
          : work.sync_status === 'synced'
            ? '已同步'
            : work.sync_status === 'error'
              ? '同步暂未完成'
              : '等待同步'
      }}
      <RouterLink :to="{ path: '/history', query: { work_id: id } }" class="text-button"
        >记录 ↗</RouterLink
      >
      <button
        v-if="work.sync_status === 'error' && sign.canContribute"
        class="text-button"
        :disabled="busy || orderDirty"
        @click="retrySync"
      >
        重试同步
      </button>
    </div>
  </div>
  <div v-if="loading" class="empty-state">正在加载作品…</div>
  <div v-else-if="error" class="empty-state error">
    <p>{{ error }}</p>
    <button class="button secondary" @click="load">再试一次</button>
  </div>
  <template v-else-if="work">
    <section class="work-summary">
      <div class="detail-cover cover-tone-0">
        <img v-if="work.cover_url" :src="work.cover_url" :alt="work.name + '封面'" /><span v-else>{{
          work.name.slice(0, 6)
        }}</span>
      </div>
      <div class="detail-intro">
        <div class="detail-title">
          <h1>{{ work.name }}</h1>
          <span class="pill gray">{{ work.type === 'book' ? '有声书' : '播客' }}</span
          ><span class="pill gray">{{ work.library?.name }}</span
          ><span v-if="work.is_adult" class="adult-inline">18+</span>
        </div>
        <p v-if="work.tagline" class="work-tagline">{{ work.tagline }}</p>
        <div class="detail-meta">
          <span>首播 {{ date(work.date_air) }}</span
          ><span
            >{{ chapterCount }} 章 · {{ work.media_count || 0 }} 份资源 ·
            {{ bytes(totalSize) }}</span
          ><RouterLink
            v-for="author in work.authors"
            :key="author.id"
            :to="`/authors/${author.id}`"
            class="text-button"
            >{{ author.name }}</RouterLink
          >
        </div>
        <p v-if="work.description" class="work-description">{{ work.description }}</p>
      </div>
      <div class="detail-actions">
        <button
          v-if="sign.canContribute"
          class="button secondary small"
          :disabled="busy || reorderMode"
          @click="editOpen = true"
        >
          编辑资料 / 封面</button
        ><button
          v-if="canDeleteWork && !chapterCount"
          class="text-button danger"
          :disabled="busy || reorderMode"
          @click="workDeleteOpen = true"
        >
          删除作品
        </button>
      </div>
    </section>

    <section
      :class="['chapters-section', { 'is-dragging': dragging }]"
      @dragenter.prevent="dragEnter"
      @dragover.prevent
      @dragleave.prevent="dragLeave"
      @drop.prevent="drop"
    >
      <div class="workspace-controls">
        <div class="workspace-toolbar">
          <div class="heading-title">
            <h2>章节与资源</h2>
            <span class="count">{{ chapterCount }} 章 · {{ work.media_count || 0 }} 份</span>
          </div>
          <div v-if="sign.canContribute" class="button-group workspace-actions">
            <button v-if="queue.length" class="button secondary small" @click="uploadOpen = true">
              <span v-if="running" class="status-dot"></span>{{ running ? '上传中' : '上传队列' }}
              {{ completed }}/{{ queue.length
              }}<span v-if="queueIssues" class="queue-issue-count">需处理 {{ queueIssues }}</span>
            </button>
            <button
              class="button secondary small"
              :disabled="busy || reorderMode"
              @click="editChapter()"
            >
              ＋ 新建章节
            </button>
            <button
              class="button primary small"
              :disabled="busy || reorderMode"
              @click="uploadOpen = true"
            >
              ＋ 上传资源
            </button>
          </div>
        </div>
        <div class="workspace-filters">
          <div class="search-field workspace-search">
            <input
              maxlength="100"
              v-model="search"
              type="search"
              placeholder="搜索章节、文件名或上传者"
              aria-label="搜索章节、文件名或上传者"
            /><button v-if="search" type="button" aria-label="清空搜索" @click="search = ''">
              ×
            </button>
          </div>
          <select v-model="chapterFilter" :disabled="reorderMode" aria-label="筛选章节">
            <option value="all">全部章节</option>
            <option value="active">有主资源</option>
            <option value="missing">缺资源</option>
            <option value="multiple">多份资源</option>
          </select>
          <button v-if="hasFilters" class="text-button" @click="clearFilters">重置筛选</button>
          <span class="hint result-count"
            >显示 {{ visibleChapters.length }} /
            {{ reorderMode ? matchingOrder.length : pageTotal }} 章</span
          >
          <div v-if="!reorderMode" class="button-group list-tools">
            <button v-if="expandableIds.length" class="text-button" @click="toggleAllExpanded">
              {{ allExpanded ? '收起备选' : '展开备选' }}
            </button>
            <template v-if="sign.canContribute && !selectionMode"
              ><button
                class="text-button"
                :disabled="busy || !visibleChapters.length"
                @click="setSelectionMode('chapter')"
              >
                整理章节</button
              ><button
                class="text-button"
                :disabled="busy || !resources.length"
                @click="setSelectionMode('resource')"
              >
                移动资源</button
              ><button
                class="text-button"
                :disabled="busy || chapterCount < 2"
                title="调整章节显示顺序"
                @click="startOrder"
              >
                {{ directoryLoading ? '正在加载章节…' : '调整顺序' }}
              </button></template
            >
          </div>
        </div>
        <div v-if="reorderMode" class="selection-toolbar order-toolbar">
          <div class="order-selection-tools">
            <label class="checkbox"
              ><input
                type="checkbox"
                :checked="allVisibleSelected"
                :indeterminate="someVisibleSelected"
                :disabled="busy"
                @change="selectVisible(($event.target as HTMLInputElement).checked)"
              />全选可见章节</label
            ><strong>已选 {{ orderSelected.length }} 章</strong
            ><button
              class="button secondary small"
              :disabled="busy || !orderSelected.length"
              @click="order.open()"
            >
              移动所选</button
            ><button
              class="text-button"
              :disabled="busy || !orderSelected.length"
              @click="order.edge(false)"
            >
              移到最前</button
            ><button
              class="text-button"
              :disabled="busy || !orderSelected.length"
              @click="order.edge(true)"
            >
              移到最后</button
            ><button
              v-if="orderSelected.length"
              class="text-button"
              :disabled="busy"
              @click="orderSelected = []"
            >
              清空选择
            </button>
          </div>
          <div class="button-group order-save-tools">
            <span v-if="orderDirty" class="hint">顺序尚未保存</span
            ><button class="text-button" :disabled="busy || !orderCanUndo" @click="order.undo">
              撤销上次</button
            ><button class="button secondary small" :disabled="busy" @click="order.cancel">
              {{ orderDirty ? '放弃改动' : '退出排序' }}</button
            ><button
              class="button primary small"
              :disabled="busy || !orderDirty"
              @click="saveOrder"
            >
              保存顺序
            </button>
          </div>
        </div>
        <div
          v-else-if="sign.canContribute && selectionMode"
          class="selection-toolbar"
          role="region"
          :aria-label="selectionMode === 'chapter' ? '批量整理章节' : '批量移动资源'"
        >
          <label class="checkbox"
            ><input
              type="checkbox"
              :checked="allVisibleSelected"
              :indeterminate="someVisibleSelected"
              :aria-label="`选择当前可见的全部${selectionMode === 'chapter' ? '章节' : '资源'}`"
              @change="selectVisible(($event.target as HTMLInputElement).checked)"
            />全选可见{{ selectionMode === 'chapter' ? '章节' : '资源' }}</label
          >
          <strong
            >已选 {{ selectedCount }} {{ selectionMode === 'chapter' ? '章' : '份资源' }}</strong
          >
          <template v-if="selectionMode === 'chapter'"
            ><button
              class="button secondary small"
              :disabled="busy || !selectedCount"
              @click="organizer.edit(chosenChapters)"
            >
              改名 / 编号</button
            ><button
              class="button secondary small"
              :disabled="busy || !selectedCount || chapterCount < 2"
              @click="organizer.merge(chosenChapters)"
            >
              合并章节
            </button></template
          >
          <button
            v-else
            class="button primary small"
            :disabled="busy || !selectedCount"
            @click="organizer.move(chosenResources)"
          >
            移动 / 批量归位 / 拆分
          </button>
          <span v-if="hiddenSelectionCount" class="selection-warning"
            >含当前列表外 {{ hiddenSelectionCount }} 项
            <button class="text-button" @click="retainVisibleSelection">仅保留可见项</button></span
          >
          <button class="text-button selection-clear" @click="setSelectionMode(null)">
            退出选择
          </button>
        </div>
      </div>
      <div v-if="dragging" class="drop-overlay">松开音频，加入上传队列</div>
      <p v-if="serverChanged" class="inline-note">
        作品有新改动，请保存或放弃当前操作后刷新。
        <button
          class="text-button"
          :disabled="orderDirty || editOpen || organizeOpen || chapterOpen"
          @click="load"
        >
          刷新作品
        </button>
      </p>
      <p v-if="pageLoading" class="hint" role="status">正在加载章节…</p>
      <div v-if="!pageLoading && !visibleChapters.length" class="empty-state">
        <h3>{{ hasFilters ? '没有匹配的章节或资源' : '还没有章节' }}</h3>
        <button v-if="hasFilters" class="button secondary" @click="clearFilters">清空筛选</button
        ><button
          v-else-if="sign.canContribute"
          class="button primary"
          :disabled="busy"
          @click="chooseFiles()"
        >
          上传第一份资源
        </button>
      </div>
      <div v-else class="chapter-list" aria-label="章节与资源列表">
        <article
          v-for="row in visibleChapters"
          :id="`chapter-${row.chapter.id}`"
          :key="row.chapter.id"
          :class="['chapter-group', { 'is-selected': selectedChapterIds.includes(row.chapter.id) }]"
        >
          <header class="chapter-group-heading">
            <input
              v-if="sign.canContribute && (reorderMode || selectionMode === 'chapter')"
              type="checkbox"
              :checked="selectedChapterIds.includes(row.chapter.id)"
              :disabled="busy"
              :aria-label="`选择章节 ${row.chapter.title}`"
              @click="select('chapter', row.chapter.id, $event)"
            />
            <span v-if="reorderMode" class="order-position tabular">第 {{ row.index + 1 }} 位</span
            ><span class="chapter-code tabular"
              >S{{ row.chapter.season_number }}E{{ row.chapter.episode_number }}</span
            >
            <h3 class="chapter-group-title">
              <template v-for="(part, index) in highlighted(row.chapter.title)" :key="index"
                ><mark v-if="part.matched">{{ part.text }}</mark
                ><template v-else>{{ part.text }}</template></template
              >
            </h3>
            <div v-if="sign.canContribute && !reorderMode" class="row-actions chapter-actions">
              <button
                type="button"
                class="text-button"
                :disabled="busy"
                :aria-label="`编辑章节 ${row.chapter.title}`"
                @click="editChapter(row.chapter)"
              >
                编辑</button
              ><button
                type="button"
                class="text-button"
                :disabled="busy"
                :aria-label="`上传到章节 ${row.chapter.title}`"
                @click="chooseFiles(row.chapter)"
              >
                上传</button
              ><button
                v-if="!row.chapter.resources_count"
                type="button"
                class="text-button danger"
                :disabled="busy"
                :aria-label="`删除空章节 ${row.chapter.title}`"
                @click="requestEmptyDeletion(row.chapter)"
              >
                删除
              </button>
            </div>
            <div
              v-else-if="sign.canContribute && reorderMode"
              class="row-actions chapter-order-actions"
            >
              <button
                type="button"
                class="text-button"
                :disabled="busy"
                :aria-label="`移动章节 ${row.chapter.title} 到指定位置`"
                @click="order.open([row.chapter.id])"
              >
                移动到…</button
              ><button
                class="icon-button"
                :disabled="row.index === 0 || busy"
                :aria-label="`${row.chapter.title} 往前排`"
                @click="order.step(row.index, -1)"
              >
                ↑</button
              ><button
                class="icon-button"
                :disabled="row.index === orderChapters.length - 1 || busy"
                :aria-label="`${row.chapter.title} 往后排`"
                @click="order.step(row.index, 1)"
              >
                ↓
              </button>
            </div>
          </header>
          <div v-if="!reorderMode" class="chapter-group-resources">
            <template v-for="section in row.sections" :key="String(section.primary)">
              <template v-if="section.primary || section.resources.length">
                <button
                  v-if="!section.primary"
                  class="text-button chapter-alternatives-toggle"
                  :aria-expanded="expanded.includes(row.chapter.id)"
                  :aria-controls="`alternatives-${row.chapter.id}`"
                  @click="toggleExpand(row.chapter.id)"
                >
                  <span aria-hidden="true">{{ expanded.includes(row.chapter.id) ? '▾' : '▸' }}</span
                  >另有 {{ row.alternatives.length }} 份备选
                </button>
                <div
                  v-if="section.primary || expanded.includes(row.chapter.id)"
                  :id="section.primary ? undefined : `alternatives-${row.chapter.id}`"
                  :class="section.primary ? 'chapter-main-resource' : 'chapter-alternatives'"
                >
                  <p v-if="!section.resources.length" class="chapter-missing">
                    <span :class="['pill', row.chapter.resources.length ? 'peach' : 'gray']">{{
                      row.chapter.resources.length ? '尚未指定主资源' : '缺资源'
                    }}</span>
                  </p>
                  <div
                    v-for="resource in section.resources"
                    :key="resource.id"
                    :class="[
                      'chapter-resource-row',
                      {
                        'is-selected': selectedResources.includes(resource.id),
                        'is-match': searchText && matchesResource(resource),
                        'is-playing': player.track?.resource_id === resource.id,
                      },
                    ]"
                  >
                    <div
                      v-if="sign.canContribute && selectionMode === 'resource'"
                      class="resource-selection"
                    >
                      <input
                        type="checkbox"
                        :checked="selectedResources.includes(resource.id)"
                        :aria-label="`选择资源 ${resource.name}`"
                        @click="select('resource', resource.id, $event)"
                      />
                    </div>
                    <div class="resource-title-line">
                      <button
                        v-if="player.canPlay(resource.name)"
                        type="button"
                        :class="[
                          'resource-play-button',
                          { active: player.track?.resource_id === resource.id },
                        ]"
                        :aria-label="`${player.track?.resource_id === resource.id && player.active ? '暂停' : '播放'} ${resource.name}`"
                        :title="
                          player.track?.resource_id === resource.id && player.active
                            ? '暂停播放'
                            : '播放音频'
                        "
                        :aria-busy="player.track?.resource_id === resource.id && player.loading"
                        @click="player.play(resource, work, row.chapter)"
                      >
                        <span
                          v-if="player.track?.resource_id === resource.id && player.loading"
                          class="playback-spinner"
                          aria-hidden="true"
                        ></span
                        ><svg v-else viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            v-if="player.track?.resource_id === resource.id && player.playing"
                            d="M6 5h4v14H6zm8 0h4v14h-4z"
                          />
                          <path v-else d="m8 5 11 7-11 7z" />
                        </svg></button
                      ><span v-else class="resource-play-placeholder" aria-hidden="true"></span>
                      <div class="resource-filename">
                        <strong :title="resource.name"
                          ><template
                            v-for="(part, index) in highlighted(resource.name)"
                            :key="index"
                            ><mark v-if="part.matched">{{ part.text }}</mark
                            ><template v-else>{{ part.text }}</template></template
                          ></strong
                        ><span
                          >{{ duration(resource.file_second) }} · {{ bytes(resource.file_size) }} ·
                          <template
                            v-for="(part, index) in highlighted(resource.uploader.display_name)"
                            :key="index"
                            ><mark v-if="part.matched">{{ part.text }}</mark
                            ><template v-else>{{ part.text }}</template></template
                          ></span
                        >
                      </div>
                    </div>
                    <div v-if="sign.canContribute" class="row-actions resource-actions">
                      <button
                        v-if="!section.primary"
                        class="text-button"
                        :disabled="busy"
                        @click="choosePrimary(row.chapter, resource)"
                      >
                        设为主资源
                      </button>
                      <button
                        class="text-button"
                        :disabled="busy"
                        @click="organizer.move([resource])"
                      >
                        移动
                      </button>
                      <button
                        v-if="resource.user_id === sign.user?.id || sign.canEditOthers"
                        type="button"
                        class="text-button danger"
                        :disabled="busy"
                        :aria-label="`删除资源 ${resource.name}`"
                        @click="requestDeletion(resource)"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </template>
          </div>
        </article>
      </div>
      <Pagination
        :page="chapterPage"
        :page-size="pageSize"
        :total="reorderMode ? matchingOrder.length : pageTotal"
        :busy="pageLoading"
        @change="loadPage"
      />
    </section>
    <input
      ref="filesInput"
      type="file"
      multiple
      :accept="sign.audioAccept"
      hidden
      @change="selectFiles"
    />
    <input
      ref="folderInput"
      type="file"
      multiple
      :accept="sign.audioAccept"
      webkitdirectory
      hidden
      @change="selectFiles"
    />
  </template>

  <BaseDialog v-model="orderMoveOpen" title="移动章节顺序" :busy="busy">
    <form id="move-chapter-order" class="form-stack" @submit.prevent="order.apply">
      <p class="order-move-summary">{{ orderMoveSummary }}</p>
      <label
        >移动方式<select v-model="orderMoveMode" :disabled="busy">
          <option value="position">移到指定位置</option>
          <option value="before">移到某章节前面</option>
          <option value="after">移到某章节后面</option>
        </select></label
      >
      <label v-if="orderMoveMode === 'position'"
        >移动后从第几位开始<input
          v-model.number="orderPosition"
          type="number"
          min="1"
          :max="orderMaxPosition"
          required
          :disabled="busy"
      /></label>
      <template v-else
        ><label
          >查找目标章节<input
            v-model="orderQuery"
            maxlength="100"
            type="search"
            placeholder="章节名称或 S1E100"
            :disabled="busy" /></label
        ><label
          >目标章节<select v-model.number="orderTargetId" required :disabled="busy">
            <option :value="0" disabled>请选择目标章节</option>
            <option v-for="chapter in orderCandidates" :key="chapter.id" :value="chapter.id">
              {{ chapter.label }}
            </option>
          </select></label
        >
        <p v-if="orderMatchCount > 100" class="hint">
          找到 {{ orderMatchCount }} 个章节，显示前 100 个；可输入名称或季／集缩小范围。
        </p>
        <p v-else-if="!orderMatchCount" class="hint">没有匹配的目标章节。</p></template
      >
      <p v-if="orderSelected.length > 1" class="hint">所选章节按当前先后顺序一起移动。</p>
    </form>
    <template #footer
      ><button class="button secondary" :disabled="busy" @click="orderMoveOpen = false">取消</button
      ><button class="button primary" form="move-chapter-order" :disabled="busy || !orderMoveValid">
        应用位置
      </button></template
    >
  </BaseDialog>

  <BaseDialog
    v-if="sign.canContribute && work"
    v-model="uploadOpen"
    title="上传资源"
    wide
    workspace
  >
    <div class="upload-dialog-toolbar">
      <div class="filter-pills" aria-label="上传队列筛选">
        <button
          :class="['filter-pill', { selected: queueFilter === 'all' }]"
          @click="queueFilter = 'all'"
        >
          全部 {{ queue.length }}</button
        ><button
          :class="['filter-pill', { selected: queueFilter === 'pending' }]"
          @click="queueFilter = 'pending'"
        >
          待上传</button
        ><button
          :class="['filter-pill', { selected: queueFilter === 'issues' }]"
          @click="queueFilter = 'issues'"
        >
          需处理 {{ queueIssues }}</button
        ><button
          :class="['filter-pill', { selected: queueFilter === 'done' }]"
          @click="queueFilter = 'done'"
        >
          已完成 {{ completed }}
        </button>
      </div>
      <div class="button-group">
        <button v-if="completed" class="text-button" :disabled="running" @click="clearCompleted">
          清理已完成</button
        ><button
          class="button secondary small"
          :disabled="busy || reorderMode"
          @click="chooseFiles()"
        >
          ＋ 文件</button
        ><button
          class="button secondary small"
          :disabled="busy || reorderMode"
          @click="folderInput?.click()"
        >
          ＋ 文件夹
        </button>
      </div>
    </div>
    <div v-if="!queue.length" class="empty-state">
      <h3>选择音频开始上传</h3>
      <p v-if="sign.contribution">单个音频最大 {{ bytes(sign.contribution.max_file_size) }}。</p>
      <button class="button primary" :disabled="busy || reorderMode" @click="chooseFiles()">
        选择音频
      </button>
    </div>
    <div v-else-if="!visibleQueue.length" class="empty-state">
      这个筛选下没有文件。<button class="text-button" @click="queueFilter = 'all'">查看全部</button>
    </div>
    <div v-else class="upload-queue">
      <label v-if="chapterCount"
        >查找上传目标章节<input
          v-model="uploadChapterQuery"
          maxlength="100"
          type="search"
          placeholder="章节名称或 S1E100"
      /></label>
      <p v-if="uploadChaptersLoading" class="hint" role="status">正在查找章节…</p>
      <p v-else-if="uploadChapterError" class="field-error">
        {{ uploadChapterError }}
        <button type="button" class="text-button" @click="reloadUploadChapters">重试</button>
      </p>
      <Pagination
        v-if="uploadChapterResult.total > uploadChapterResult.page_size"
        :page="uploadChapterResult.page"
        :page-size="uploadChapterResult.page_size"
        :total="uploadChapterResult.total"
        :busy="uploadChaptersLoading"
        @change="uploadChapterPage = $event"
      />
      <div class="queue-column-heading">
        <span>文件</span><span>目标与上传选项</span><span>状态 / 操作</span>
      </div>
      <article
        v-for="{ entry, index } in visibleQueue"
        :key="entry.id"
        :class="['queue-item', entry.status]"
      >
        <div class="queue-main">
          <div class="queue-file">
            <strong :title="entry.relativeName">{{ entry.relativeName }}</strong
            ><span>#{{ index + 1 }} · {{ bytes(entry.file.size) }} · 音频</span>
          </div>
          <fieldset
            v-if="entry.status !== 'done' && !entry.invalid"
            class="queue-settings"
            :disabled="running"
          >
            <label class="queue-target"
              >目标章节<select
                v-model.number="entry.chapterId"
                :disabled="uploadChaptersLoading || !!uploadChapterError"
                @change="setQueueChapter(entry)"
              >
                <option :value="0">按季 / 集归位，缺失时新建</option>
                <option v-for="chapter in uploadChapters" :key="chapter.id" :value="chapter.id">
                  S{{ chapter.season_number }}E{{ chapter.episode_number }} {{ chapter.title }}
                </option>
              </select></label
            >
            <template v-if="!entry.chapterId"
              ><label class="queue-title"
                >章节标题<input
                  maxlength="255"
                  v-model="entry.title"
                  @input="refreshQueueEntry(entry)" /></label
              ><label
                >季<input
                  v-model.number="entry.season"
                  type="number"
                  min="0"
                  max="1000000"
                  @input="refreshQueueEntry(entry)" /></label
              ><label
                >集<input
                  v-model.number="entry.episode"
                  type="number"
                  min="0"
                  max="1000000"
                  @input="refreshQueueEntry(entry)" /></label
            ></template>
            <div class="alternative-choice">
              <label class="checkbox"
                ><input
                  v-model="entry.alternative"
                  type="checkbox"
                  @change="refreshQueueEntry(entry)"
                />允许同章多份资源</label
              ><select
                v-if="entry.alternative"
                v-model="entry.primaryChoice"
                @change="refreshQueueEntry(entry)"
                aria-label="添加备选时的主资源"
              >
                <option value="" disabled>选择主资源处理方式</option>
                <option value="keep">保留现有主资源</option>
                <option value="new">将此资源设为主资源</option>
              </select>
            </div>
          </fieldset>
          <p v-else class="queue-target-summary">
            S{{ entry.season }}E{{ entry.episode }} · {{ entry.title }}
          </p>
          <div class="queue-row-actions">
            <span
              :class="[
                'pill',
                entry.status === 'error' || entry.status === 'skipped'
                  ? 'peach'
                  : entry.status === 'done'
                    ? 'mint'
                    : 'gray',
              ]"
              >{{ statusNames[entry.status]
              }}<template v-if="entry.status === 'uploading'">
                {{ Math.round(entry.progress) }}%</template
              ></span
            >
            <div v-if="!running" class="row-actions">
              <template v-if="entry.status !== 'done'"
                ><button
                  class="icon-button"
                  :disabled="index === 0"
                  aria-label="文件往前排"
                  @click="move(index, -1)"
                >
                  ↑</button
                ><button
                  class="icon-button"
                  :disabled="index === queue.length - 1"
                  aria-label="文件往后排"
                  @click="move(index, 1)"
                >
                  ↓
                </button></template
              ><button
                v-if="entry.status === 'skipped' && !entry.invalid"
                class="text-button"
                @click="refreshQueueEntry(entry)"
              >
                重试</button
              ><button class="text-button" @click="remove(entry.id)">移出</button>
            </div>
          </div>
        </div>
        <div v-if="entry.status === 'duplicate'" class="duplicate-matches">
          <strong>全库发现 {{ entry.matchTotal }} 处相同音频</strong>
          <div v-for="match in entry.matches" :key="match.id" class="duplicate-match">
            <div>
              <RouterLink :to="`/works/${match.abs_list_id}`" class="title-link">{{
                match.work?.name || '已删除作品'
              }}</RouterLink>
              <p>
                S{{ match.chapter?.season_number }}E{{ match.chapter?.episode_number }} ·
                {{ match.chapter?.title }}
              </p>
              <p>{{ match.uploader.display_name }} 上传 · {{ match.name }}</p>
            </div>
            <button
              class="button secondary small"
              :disabled="running"
              @click="reference(entry, match.id)"
            >
              确认引用此音频
            </button>
          </div>
          <button
            v-if="entry.matches.length < entry.matchTotal"
            class="text-button"
            @click="duplicates(entry, entry.matchPage + 1).catch(fail)"
          >
            查看更多位置</button
          ><button class="text-button" :disabled="running" @click="skip(entry)">跳过此文件</button>
        </div>
        <div
          v-if="['uploading', 'merging', 'paused'].includes(entry.status)"
          class="upload-progress"
          role="progressbar"
          :aria-valuenow="entry.progress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="entry.relativeName"
        >
          <span :style="{ width: `${entry.progress}%` }"></span>
        </div>
        <p
          v-if="entry.message && entry.status !== 'done'"
          :class="[
            'queue-message',
            { error: entry.status === 'error' || entry.status === 'skipped' },
          ]"
        >
          {{ entry.message }}
        </p>
      </article>
    </div>
    <template #footer
      ><span class="hint"
        >切换站内页面会继续上传。已完成 {{ completed }} / {{ queue.length }} · 待上传 {{ pending
        }}<template v-if="queueIssues"> · 需处理 {{ queueIssues }}</template></span
      >
      <div class="button-group">
        <button class="button secondary" @click="uploadOpen = false">
          {{ running ? '收起，继续上传' : '关闭队列' }}</button
        ><button v-if="running" class="button primary" @click="pause">暂停上传</button
        ><button
          v-else
          class="button primary"
          :disabled="!pending || reorderMode || actionBusy || saving || organizeBusy"
          @click="start"
        >
          {{
            completed || queue.some((entry) => ['paused', 'error'].includes(entry.status))
              ? '继续 / 重试上传'
              : '上传全部待传'
          }}<template v-if="pending">（{{ pending }}）</template>
        </button>
      </div></template
    >
  </BaseDialog>

  <BaseDialog v-model="editOpen" title="编辑作品资料" wide :busy="saving">
    <WorkForm
      v-if="editOpen && work"
      id="edit-work-form"
      :libraries="catalog.libraries"
      :initial="work"
      :busy="saving"
      @save="save"
    />
    <template #footer
      ><div class="button-group">
        <button class="button secondary" :disabled="saving" @click="editOpen = false">取消</button
        ><button class="button primary" form="edit-work-form" :disabled="saving">
          {{ saving ? '正在保存…' : '保存资料' }}
        </button>
      </div></template
    >
  </BaseDialog>
  <BaseDialog v-model="workDeleteOpen" title="删除作品" :busy="actionBusy">
    <p class="dialog-copy">
      删除「{{ work?.name }}」？作品将从管理界面和收听端移除，历史记录、累计贡献和上传文件保留。
    </p>
    <template #footer
      ><button class="button secondary" :disabled="actionBusy" @click="workDeleteOpen = false">
        取消</button
      ><button class="button danger-button" :disabled="busy || !!chapterCount" @click="deleteWork">
        {{ actionBusy ? '正在删除…' : '确认删除' }}
      </button></template
    >
  </BaseDialog>
  <BaseDialog
    v-model="chapterOpen"
    :title="chapterEditing ? '编辑章节' : '新建章节'"
    :busy="actionBusy"
  >
    <form id="chapter-form" @submit.prevent="saveChapter">
      <fieldset class="form-stack" :disabled="actionBusy">
        <label>章节标题<input maxlength="255" v-model="chapterTitle" required /></label>
        <div class="form-row">
          <label
            >季<input
              v-model.number="chapterSeason"
              type="number"
              min="0"
              max="1000000"
              required /></label
          ><label
            >集 / 章节编号<input
              v-model.number="chapterEpisode"
              type="number"
              min="0"
              max="1000000"
              required
          /></label>
        </div>
      </fieldset>
    </form>
    <template #footer
      ><button class="button secondary" :disabled="actionBusy" @click="chapterOpen = false">
        取消</button
      ><button class="button primary" form="chapter-form" :disabled="actionBusy">
        {{ actionBusy ? '正在保存…' : '保存章节' }}
      </button></template
    >
  </BaseDialog>
  <BaseDialog
    :model-value="Boolean(emptyDeletion)"
    title="删除空章节"
    :busy="actionBusy"
    @update:model-value="
      (value) => {
        if (!value) emptyDeletion = null
      }
    "
  >
    <p class="dialog-copy">
      删除「{{ emptyDeletion?.title }}」？仅可删除没有有效资源的章节，历史记录会保留。
    </p>
    <template #footer
      ><button class="button secondary" :disabled="actionBusy" @click="emptyDeletion = null">
        取消</button
      ><button class="button danger-button" :disabled="actionBusy" @click="removeEmpty">
        确认删除
      </button></template
    >
  </BaseDialog>
  <BaseDialog v-model="deleteOpen" title="删除音频资源" :busy="actionBusy">
    <form id="delete-audio-form" @submit.prevent="deleteAudio">
      <fieldset class="form-stack" :disabled="actionBusy">
        <p>删除「{{ deleting?.name }}」后，上传记录、累计贡献和磁盘文件会保留。</p>
        <label v-if="needsReplacement"
          >选择接替它的主资源<select v-model.number="replacementPrimary" required>
            <option :value="0" disabled>选择新的主资源</option>
            <option v-for="resource in replacementOptions" :key="resource.id" :value="resource.id">
              {{ resource.name }} · {{ resource.uploader.display_name }}
            </option>
          </select></label
        >
        <p
          v-else-if="
            deletingChapter?.primary_media_id === deleting?.id && replacementOptions.length === 1
          "
          class="hint"
        >
          剩下的唯一资源会成为主资源。
        </p>
        <label
          >{{ ownDeletion ? '删除说明（可选）' : '请填写删除原因'
          }}<textarea maxlength="1000" v-model="deleteReason" rows="3" :required="!ownDeletion" />
        </label>
        <p v-if="!ownDeletion" class="hint">原因会写入记录，并通过站内信告知上传者。</p>
      </fieldset>
    </form>
    <template #footer
      ><button class="button secondary" :disabled="actionBusy" @click="deleteOpen = false">
        取消</button
      ><button
        class="button danger-button"
        form="delete-audio-form"
        :disabled="
          actionBusy ||
          (!ownDeletion && !deleteReason.trim()) ||
          (needsReplacement && !replacementPrimary)
        "
      >
        确认删除
      </button></template
    >
  </BaseDialog>

  <BaseDialog v-model="organizeOpen" :title="dialogTitle" wide workspace :busy="organizeBusy">
    <ol class="dialog-steps" aria-label="整理步骤">
      <li :class="{ current: !plan }" :aria-current="!plan ? 'step' : undefined">
        <span>1</span>设置规则与目标
      </li>
      <li :class="{ current: plan }" :aria-current="plan ? 'step' : undefined">
        <span>2</span>核对并保存
      </li>
      <li class="steps-count">
        已选 {{ organizeRows.length }} {{ organizeMode === 'move' ? '份资源' : '个章节' }}
      </li>
    </ol>
    <fieldset :disabled="organizeBusy" class="organizer-fieldset">
      <div v-if="!plan" class="organizer-layout">
        <aside class="organizer-sidebar form-stack">
          <template v-if="organizeMode === 'merge'"
            ><label
              >查找章节<input
                v-model="targetChapterQuery"
                maxlength="100"
                type="search"
                placeholder="章节名称或 S1E100"
            /></label>
            <p v-if="targetsLoading" class="hint" role="status">正在查找章节…</p>
            <p v-else-if="targetError" class="field-error">
              {{ targetError }}
              <button type="button" class="text-button" @click="organizer.retryTargets">
                重试
              </button>
            </p>
            <label
              >保留的章节<select v-model.number="mergeTarget">
                <option :value="0" disabled>选择目标章节</option>
                <option v-for="chapter in targetChapters" :key="chapter.id" :value="chapter.id">
                  S{{ chapter.season_number }}E{{ chapter.episode_number }} {{ chapter.title }}
                </option>
              </select></label
            >
            <Pagination
              v-if="targetChapterResult.total > targetChapterResult.page_size"
              :page="targetChapterResult.page"
              :page-size="targetChapterResult.page_size"
              :total="targetChapterResult.total"
              :busy="targetsLoading"
              @change="targetChapterPage = $event"
            />
          </template>
          <template v-else>
            <template v-if="organizeMode === 'move'">
              <label
                >查找作品<input maxlength="100" v-model="workQuery" placeholder="搜索名称或副标题"
              /></label>
              <div class="work-target-field">
                <label id="target-work-label">目标作品</label>
                <div class="work-target-picker">
                  <button
                    type="button"
                    class="work-target-button"
                    role="combobox"
                    aria-labelledby="target-work-label target-work-value target-work-year"
                    aria-controls="target-work-options"
                    :aria-expanded="targetPickerOpen"
                    :aria-activedescendant="
                      targetPickerOpen ? `target-work-option-${targetOption}` : undefined
                    "
                    @click="toggleTargetPicker"
                    @keydown="targetPickerKey"
                  >
                    <span id="target-work-value" :title="targetName(selectedTargetWork)">{{
                      selectedTargetWork?.name || '选择目标作品'
                    }}</span
                    ><span id="target-work-year" class="work-target-year">{{
                      selectedTargetWork
                        ? selectedTargetWork.date_air?.slice(0, 4) || '年份未标注'
                        : ''
                    }}</span
                    ><span aria-hidden="true">▾</span>
                  </button>
                  <ul
                    v-if="targetPickerOpen"
                    id="target-work-options"
                    class="work-target-options"
                    role="listbox"
                    aria-labelledby="target-work-label"
                  >
                    <li
                      v-for="(entry, index) in targetWorks"
                      :id="`target-work-option-${index}`"
                      :key="entry.id"
                      role="option"
                      :aria-selected="entry.id === targetWorkId"
                      :class="{
                        active: index === targetOption,
                        selected: entry.id === targetWorkId,
                      }"
                      @pointerenter="targetOption = index"
                      @click="chooseTargetWork(entry.id)"
                    >
                      <span class="work-target-name" :title="targetName(entry)"
                        ><span>{{ entry.name }}</span
                        ><span class="work-target-year">{{
                          entry.date_air?.slice(0, 4) || '年份未标注'
                        }}</span
                        ><small v-if="entry.id === id">当前作品</small></span
                      ><span
                        v-if="entry.tagline"
                        class="work-target-tagline"
                        :title="entry.tagline"
                        >{{ entry.tagline }}</span
                      >
                    </li>
                  </ul>
                </div>
              </div>
              <p v-if="worksLoading" class="hint">正在查找作品…</p>
              <p
                v-else-if="
                  workQuery &&
                  targetWorks.every((entry) => entry.id === id || entry.id === targetWorkId)
                "
                class="hint"
              >
                未找到其他匹配作品，可更换关键词。
              </p>
              <label
                >分配方式<select v-model="moveMode" :disabled="targetsLoading || !!targetError">
                  <option value="fixed">全部移到一个章节</option>
                  <option value="sequence">每份一个连续章节</option>
                  <option value="offset">按原季 / 集统一偏移</option>
                  <option value="manual">逐行选择目标</option>
                </select></label
              >
              <p v-if="targetsLoading" class="hint">正在加载目标章节…</p>
              <p v-if="targetError" class="error-panel">
                {{ targetError }}
                <button class="text-button" @click="organizer.retryTargets">重试</button>
              </p>
              <label
                >查找目标章节<input
                  v-model="targetChapterQuery"
                  maxlength="100"
                  type="search"
                  placeholder="章节名称或 S1E100"
              /></label>
              <label v-if="moveMode === 'fixed'"
                >目标章节<select
                  v-model.number="fixedChapter"
                  :disabled="targetsLoading || !!targetError"
                >
                  <option :value="0">按编号匹配 / 新建</option>
                  <option v-for="chapter in targetChapters" :key="chapter.id" :value="chapter.id">
                    S{{ chapter.season_number }}E{{ chapter.episode_number }} {{ chapter.title }}
                  </option>
                </select></label
              >
              <Pagination
                v-if="targetChapterResult.total > targetChapterResult.page_size"
                :page="targetChapterResult.page"
                :page-size="targetChapterResult.page_size"
                :total="targetChapterResult.total"
                :busy="targetsLoading"
                @change="targetChapterPage = $event"
              />
              <label v-if="moveMode === 'fixed' && !fixedChapter"
                >新章节标题<input maxlength="255" v-model="fixedTitle"
              /></label>
            </template>
            <template
              v-if="organizeMode === 'edit' || (moveMode !== 'fixed' && moveMode !== 'manual')"
            >
              <label
                >标题规则<select v-model="titleRule">
                  <option value="keep">保留原章节标题</option>
                  <option value="replace">查找替换</option>
                  <option value="template">按模板顺序命名</option>
                  <option value="file">使用资源文件名</option>
                </select></label
              >
              <template v-if="titleRule === 'replace'"
                ><label>查找<input maxlength="255" v-model="find" /></label
                ><label>替换为<input maxlength="255" v-model="replace" /></label
              ></template>
              <template v-if="titleRule === 'template'"
                ><label>模板（{n} 为序号）<input maxlength="255" v-model="template" /></label
                ><label>起始序号<input v-model.number="numberStart" type="number" min="0" /></label
              ></template>
              <label v-if="organizeMode === 'edit'"
                >季 / 集编号<select v-model="numbering">
                  <option value="keep">保持编号</option>
                  <option value="offset">统一偏移</option>
                  <option value="sequence">连续编号</option>
                </select></label
              >
            </template>
            <div
              v-if="
                (organizeMode === 'edit' && numbering === 'sequence') ||
                (organizeMode === 'move' &&
                  (moveMode === 'sequence' || (moveMode === 'fixed' && !fixedChapter)))
              "
              class="form-row"
            >
              <label>季<input v-model.number="season" type="number" min="0" max="1000000" /></label
              ><label
                >{{ moveMode === 'fixed' && organizeMode === 'move' ? '目标集' : '起始集'
                }}<input v-model.number="episodeStart" type="number" min="0" max="1000000"
              /></label>
            </div>
            <label
              v-if="
                (organizeMode === 'edit' && numbering === 'offset') ||
                (organizeMode === 'move' && moveMode === 'offset')
              "
              >集数偏移（可为负数）<input v-model.number="offset" type="number"
            /></label>
            <p class="hint">更改规则会重新生成各行。逐行修正请放在规则设置之后。</p>
          </template>
        </aside>
        <div class="organizer-results">
          <div v-if="organizeMode === 'move'" class="section-heading">
            <button
              class="button secondary small"
              :disabled="targetsLoading"
              @click="organizer.sortFiles"
            >
              按文件名排序
            </button>
          </div>
          <p v-if="organizeMode === 'merge'" class="inline-note">
            目标章节保留，其余所选章节合并后移除。
          </p>
          <div class="table-scroll organizer-sheet">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sheet-index">#</th>
                  <th>{{ organizeMode === 'move' ? '资源文件 / 原章节' : '原章节' }}</th>
                  <th v-if="organizeMode === 'move'">目标章节</th>
                  <th v-if="organizeMode !== 'merge'">
                    {{ organizeMode === 'edit' ? '修改后标题' : '目标标题' }}
                  </th>
                  <th class="sheet-number">季</th>
                  <th class="sheet-number">集</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in organizeRows"
                  :key="row.media_id || row.chapter_id || index"
                >
                  <td class="sheet-index muted">{{ index + 1 }}</td>
                  <td class="sheet-source">
                    <strong :title="row.name">{{ row.name }}</strong
                    ><span v-if="organizeMode === 'move'" :title="row.original_title"
                      >S{{ row.original_season }}E{{ row.original_episode }} ·
                      {{ row.original_title }}</span
                    >
                  </td>
                  <td v-if="organizeMode === 'move'">
                    <select
                      v-model.number="row.chapter_id"
                      :disabled="targetsLoading || !!targetError"
                      aria-label="目标章节"
                      @change="setDraftTarget(row)"
                    >
                      <option :value="0">按编号归位 / 新建</option>
                      <option
                        v-for="chapter in targetChapters"
                        :key="chapter.id"
                        :value="chapter.id"
                      >
                        S{{ chapter.season_number }}E{{ chapter.episode_number }}
                        {{ chapter.title }}
                      </option>
                    </select>
                  </td>
                  <td v-if="organizeMode !== 'merge'">
                    <input
                      maxlength="255"
                      v-model="row.title"
                      :disabled="
                        organizeMode === 'move' &&
                        (row.chapter_id > 0 || targetsLoading || !!targetError)
                      "
                      aria-label="目标章节标题"
                    />
                  </td>
                  <td class="sheet-number">
                    <span v-if="organizeMode === 'merge'">{{ row.original_season }}</span
                    ><input
                      v-else
                      v-model.number="row.season_number"
                      type="number"
                      min="0"
                      max="1000000"
                      :disabled="
                        organizeMode === 'move' &&
                        (row.chapter_id > 0 || targetsLoading || !!targetError)
                      "
                      aria-label="目标季"
                    />
                  </td>
                  <td class="sheet-number">
                    <span v-if="organizeMode === 'merge'">{{ row.original_episode }}</span
                    ><input
                      v-else
                      v-model.number="row.episode_number"
                      type="number"
                      min="0"
                      max="1000000"
                      :disabled="
                        organizeMode === 'move' &&
                        (row.chapter_id > 0 || targetsLoading || !!targetError)
                      "
                      aria-label="目标集"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div v-else :class="['organizer-layout', { 'without-sidebar': !plan.groups.length }]">
        <aside v-if="plan.groups.length" class="organizer-sidebar conflict-sidebar form-stack">
          <div class="section-heading">
            <h3>指定主资源</h3>
            <span :class="['pill', unresolved ? 'peach' : 'mint']">{{
              unresolved ? `待选 ${unresolved}` : '已全部指定'
            }}</span>
          </div>
          <div class="button-group">
            <button class="button secondary small" @click="organizer.chooseByRule('existing')">
              保留原主资源</button
            ><button class="button secondary small" @click="organizer.chooseByRule('incoming')">
              使用唯一移入资源
            </button>
          </div>
          <p class="hint">以上规则只处理能唯一确定的资源，其余请逐章选择。</p>
          <div
            v-for="group in plan.groups"
            :key="group.key"
            :class="['primary-choice-panel', { resolved: primaries[group.key] }]"
          >
            <label
              ><span
                >{{ group.work_name }} · S{{ group.season_number }}E{{ group.episode_number }}
                {{ group.title }}</span
              ><span class="hint">{{ group.resources.length }} 份资源</span
              ><select
                v-model.number="primaries[group.key]"
                :aria-label="`指定主资源：${group.title}`"
              >
                <!-- Vue 尚未识别可定制 select 的按钮结构，通过动态元素渲染。 -->
                <component is="button" type="button"><component is="selectedcontent" /></component>
                <option :value="undefined" disabled>请选择主资源</option>
                <option v-for="resource in group.resources" :key="resource.id" :value="resource.id">
                  {{ resource.name }} · {{ resource.source_chapter }} ·
                  {{ bytes(resource.file_size) }} · {{ resource.uploader_name }}
                </option>
              </select></label
            >
          </div>
        </aside>
        <div class="organizer-results">
          <div class="section-heading">
            <h3>{{ plan.changes.length }} 项改动</h3>
          </div>
          <div class="table-scroll organizer-sheet review-sheet">
            <table class="data-table">
              <thead>
                <tr>
                  <th>对象</th>
                  <th>整理前</th>
                  <th>整理后</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(change, index) in plan.changes" :key="index">
                  <td>{{ change.name }}</td>
                  <td class="muted">{{ change.from }}</td>
                  <td>{{ change.to }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </fieldset>
    <template #footer
      ><span v-if="plan && unresolved" class="hint"
        >还有 {{ unresolved }} 个章节需要指定主资源</span
      >
      <div class="button-group">
        <button
          class="button secondary"
          :disabled="organizeBusy"
          @click="plan ? (plan = null) : (organizeOpen = false)"
        >
          {{ plan ? '返回修改' : '取消' }}</button
        ><button
          v-if="!plan"
          class="button primary"
          :disabled="
            organizeBusy ||
            targetsLoading ||
            !!targetError ||
            (organizeMode === 'merge' && !mergeTarget)
          "
          @click="organizer.preview"
        >
          {{ organizeBusy ? '正在生成预览…' : '下一步：核对结果' }}</button
        ><button
          v-else
          class="button primary"
          :disabled="organizeBusy || !planReady"
          @click="organizer.apply"
        >
          {{ organizeBusy ? '正在保存…' : '确认保存全部改动' }}
        </button>
      </div></template
    >
  </BaseDialog>
</template>

<style scoped>
.status-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7ba58a;
}
.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.sync-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  color: #7c8b78;
  font-size: 12px;
}
.sync-line.error {
  color: #a2784b;
}
.sync-line .text-button {
  padding: 0;
  font-size: 12px;
}
.detail-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.detail-title h1 {
  max-width: 100%;
  font-size: 28px;
  font-weight: 650;
  overflow-wrap: anywhere;
}
.detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 7px;
  color: #77866f;
  font-size: 13px;
}
.detail-actions {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}
.chapters-section {
  position: relative;
  margin-top: 16px;
}
.workspace-controls {
  position: sticky;
  top: var(--topbar-height);
  z-index: 10;
  margin-bottom: 12px;
  padding: 10px 0;
  background: #f5f7f6;
  border-bottom: 1px solid var(--line);
}
.workspace-toolbar,
.workspace-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.workspace-toolbar {
  justify-content: space-between;
}
.workspace-filters {
  margin-top: 12px;
}
.workspace-actions {
  margin-left: auto;
  gap: 7px;
}
.workspace-search {
  width: min(420px, 38%);
}
.workspace-filters > select {
  width: 145px;
}
.list-tools {
  margin-left: auto;
  gap: 16px;
}
.selection-clear {
  margin-left: auto;
}
.selection-warning {
  color: #936734;
  font-size: 13px;
}
.selection-warning .text-button {
  margin-left: 6px;
}
.order-toolbar > .button-group {
  margin-left: auto;
}
.drop-overlay {
  position: fixed;
  inset: calc(var(--topbar-height) + 8px) 16px 16px;
  z-index: 30;
  display: grid;
  place-items: center;
  border: 2px dashed #6b9979;
  border-radius: 8px;
  background: #edf7f2ed;
  color: var(--green);
  font-size: 18px;
  pointer-events: none;
}
.data-table tbody tr.is-selected,
.chapter-resource-row.is-selected {
  background: #edf6ef;
}
.upload-dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}
.queue-column-heading,
.queue-main {
  display: grid;
  grid-template-columns: minmax(170px, 0.8fr) minmax(320px, 1.4fr) 120px;
  align-items: start;
  gap: 14px;
}
.queue-column-heading {
  padding: 8px 12px;
  background: #f7f9f8;
  color: var(--muted);
  font-size: 13px;
}
.queue-column-heading > :last-child {
  text-align: right;
}
.queue-settings {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px 64px;
  gap: 7px;
}
.queue-settings label {
  color: var(--muted);
  font-size: 13px;
  font-weight: 400;
}
.queue-target {
  grid-column: 1 / -1;
}
.queue-settings input,
.queue-settings select {
  min-height: 36px;
  padding: 6px 9px;
  font-size: 13px;
}
.queue-row-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  grid-column: 3;
}
.queue-row-actions .row-actions {
  gap: 7px;
}
.queue-row-actions .icon-button {
  width: 24px;
  height: 28px;
  font-size: 16px;
}
.queue-target-summary {
  color: var(--muted);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.alternative-choice {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  grid-column: 1 / -1;
}
.alternative-choice select {
  width: min(100%, 210px);
}
.alternative-choice .checkbox {
  font-size: 13px;
}
.upload-progress {
  height: 4px;
  margin-top: 9px;
  overflow: hidden;
  border-radius: 2px;
  background: #e9eeea;
}
.upload-progress > span {
  display: block;
  height: 100%;
  background: #6e9e7c;
  transition: width 0.2s;
}
.queue-message {
  margin-top: 7px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.queue-message.error {
  color: #9b6434;
}
.queue-item.skipped {
  background: #fffbf3;
}
@media (max-width: 900px) {
  .detail-actions {
    flex-direction: row;
    align-items: center;
    margin-left: 100px;
  }
}
@media (max-width: 640px) {
  .detail-title {
    gap: 5px;
  }
  .detail-title h1 {
    font-size: 23px;
  }
  .detail-meta {
    gap: 5px 10px;
    margin-top: 6px;
    font-size: 12px;
  }
  .detail-actions {
    margin-left: 62px;
  }
}
.selection-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid #d2e0d4;
  border-radius: 5px;
  background: #eff6ef;
}
.selection-toolbar strong {
  color: #486847;
  font-size: 13px;
  font-weight: 550;
}
.chapter-list {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.chapter-list mark {
  padding: 0;
  border-radius: 2px;
  background: #f7e8af;
  color: inherit;
}
.chapter-group {
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
}
.chapter-group:last-child {
  border-bottom: 0;
}
.chapter-group.is-selected {
  background: #f0f7f2;
}
.chapter-group-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 5px 10px;
  border-radius: 6px;
  background: #f0f4f1;
}
.chapter-group.is-selected .chapter-group-heading {
  background: #e3eee6;
}
.chapter-group-title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.chapter-code {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}
.chapter-actions {
  flex-shrink: 0;
  gap: 12px;
}
.chapter-order-actions {
  flex-shrink: 0;
  gap: 3px;
}
.order-position {
  flex-shrink: 0;
  color: #8a978f;
  font-size: 12px;
}
.order-toolbar {
  align-items: flex-start;
}
.order-selection-tools {
  display: flex;
  flex: 1;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  min-width: 0;
}
.order-save-tools {
  margin-left: auto;
  flex-wrap: wrap;
}
.order-move-summary {
  font-size: 14px;
  overflow-wrap: anywhere;
}
@media (max-width: 640px) {
  .chapter-group-heading:has(.chapter-order-actions) {
    display: grid;
    grid-template-columns: 16px auto minmax(0, 1fr);
    align-items: center;
    gap: 5px 8px;
  }
  .chapter-group-heading:has(.chapter-order-actions) .chapter-code {
    grid-column: 3;
  }
  .chapter-group-heading:has(.chapter-order-actions) .chapter-group-title {
    grid-column: 2 / -1;
  }
  .chapter-order-actions {
    grid-column: 2 / -1;
    justify-content: flex-end;
  }
  .order-save-tools {
    width: 100%;
    justify-content: flex-end;
  }
}
.chapter-group-resources {
  margin: 5px 10px 0;
}
.chapter-missing {
  padding: 5px 0;
}
.chapter-alternatives-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}
.chapter-alternatives {
  margin: 4px 0 2px 3px;
  padding: 0 12px;
  border-left: 2px solid #aac3b2;
  border-radius: 0 6px 6px 0;
  background: #f2f6f3;
}
.chapter-resource-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 6px 0;
}
.chapter-alternatives .chapter-resource-row + .chapter-resource-row {
  border-top: 1px dashed #d9e3dc;
}
.chapter-resource-row.is-match {
  background: #fffbed;
}
.resource-selection {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 11px;
}
.resource-actions {
  flex-shrink: 0;
  gap: 12px;
}
.resource-filename {
  flex: 1;
  min-width: 0;
}
.resource-title-line {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.resource-play-placeholder {
  flex-shrink: 0;
  width: 24px;
}
.chapter-resource-row.is-playing .resource-title-line strong {
  color: var(--green);
}
.resource-filename strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
}
.resource-filename > span {
  display: block;
  margin-top: 3px;
  color: #758375;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.dialog-steps {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  margin: 0 0 14px;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--line);
  list-style: none;
}
.dialog-steps li {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
}
.dialog-steps li > span {
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #edf1ee;
}
.dialog-steps li.current {
  color: var(--green);
  font-weight: 600;
}
.dialog-steps li.current > span {
  background: var(--green);
  color: #fff;
}
.dialog-steps .steps-count {
  margin-left: auto;
}
.organizer-layout {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  align-items: start;
  gap: 22px;
}
.organizer-layout.without-sidebar {
  grid-template-columns: minmax(0, 1fr);
}
.organizer-sidebar {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #f8faf9;
}
.organizer-sidebar h3,
.organizer-results h3 {
  font-size: 14px;
  font-weight: 600;
}
.organizer-sidebar .section-heading {
  margin-bottom: 0;
}
.organizer-sidebar .hint {
  font-size: 13px;
  line-height: 1.7;
}
.organizer-sidebar .form-row {
  gap: 8px;
}
.work-target-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.work-target-picker {
  position: relative;
  min-width: 0;
}
.work-target-button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid #cfdcd4;
  border-radius: 8px;
  background: #fff;
  color: #26352f;
  text-align: left;
  font-size: 14px;
}
.work-target-button > span:first-child {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.work-target-button > span:last-child {
  flex-shrink: 0;
  color: var(--muted);
}
.work-target-options {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 5;
  width: 100%;
  max-height: 300px;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px #203e2b1a;
}
.work-target-options li {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.work-target-options li.active {
  background: #f0f6f2;
}
.work-target-options li.selected {
  background: #eaf3ed;
}
.work-target-name {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  color: #26352f;
  font-size: 14px;
}
.work-target-name > span:first-child {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.work-target-year {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}
.work-target-name small {
  flex-shrink: 0;
  color: var(--green);
  font-size: 11px;
}
.work-target-tagline {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}
.organizer-results {
  min-width: 0;
}
.organizer-results .section-heading {
  margin-bottom: 8px;
}
.organizer-sheet table {
  min-width: 580px;
  table-layout: fixed;
}
.organizer-sheet td,
.organizer-sheet th {
  padding: 9px;
}
.organizer-sheet td {
  font-size: 13px;
  overflow-wrap: anywhere;
}
.organizer-sheet .sheet-index {
  width: 38px;
  text-align: center;
}
.organizer-sheet .sheet-number {
  width: 78px;
}
.organizer-sheet .sheet-source strong,
.organizer-sheet .sheet-source > span {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 400;
}
.organizer-sheet .sheet-source > span {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}
.organizer-sheet input,
.organizer-sheet select {
  min-width: 0;
  padding: 6px 9px;
  font-size: 13px;
}
.review-sheet table {
  min-width: 480px;
}
.primary-choice-panel {
  min-width: 0;
  padding: 9px;
  border: 1px solid #e8d6b8;
  border-radius: 5px;
  background: #fff9ed;
}
.primary-choice-panel.resolved {
  border-color: #d3e1d6;
  background: #f0f7f2;
}
.primary-choice-panel label {
  min-width: 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.primary-choice-panel select {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
@supports (appearance: base-select) {
  .primary-choice-panel select > button {
    flex: 1;
    min-width: 0;
    text-align: left;
  }
  .primary-choice-panel selectedcontent {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
.conflict-sidebar {
  width: auto;
}
@media (max-width: 640px) {
  .chapter-group {
    padding: 10px;
  }
  .chapter-group-heading {
    gap: 8px;
    align-items: flex-start;
    padding: 5px 8px;
  }
  .chapter-code {
    padding-top: 3px;
  }
  .chapter-group-title {
    font-size: 14px;
  }
  .chapter-actions {
    gap: 8px;
  }
  .chapter-group-resources {
    margin: 5px 8px 0;
  }
  .chapter-alternatives {
    margin-left: 2px;
    padding: 0 9px;
  }
  .chapter-resource-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 9px;
  }
  .resource-selection {
    gap: 7px;
  }
  .chapter-resource-row .resource-filename strong {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .chapter-resource-row .row-actions {
    flex-basis: 100%;
    justify-content: flex-end;
  }
  .resource-filename > span {
    font-size: 12px;
  }
  .selection-toolbar {
    gap: 7px;
  }
}

@media (max-width: 1000px) {
  .organizer-layout {
    grid-template-columns: 235px minmax(0, 1fr);
    gap: 12px;
  }
  .queue-column-heading,
  .queue-main {
    grid-template-columns: minmax(150px, 0.8fr) minmax(250px, 1.4fr) 100px;
    gap: 10px;
  }
}
@media (max-width: 760px) {
  .organizer-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .organizer-sidebar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 12px;
  }
  .organizer-sidebar > h3,
  .organizer-sidebar > p,
  .organizer-sidebar > .section-heading,
  .organizer-sidebar > .button-group {
    grid-column: 1 / -1;
  }
  .conflict-sidebar {
    display: flex;
  }
  .queue-column-heading {
    display: none;
  }
  .queue-main {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .queue-row-actions {
    grid-column: 2;
    grid-row: 1;
  }
  .queue-settings,
  .queue-target-summary {
    grid-column: 1 / -1;
  }
  .workspace-search {
    flex: 1;
    min-width: 160px;
  }
  .result-count {
    margin-left: auto;
  }
  .list-tools {
    margin-left: 0;
  }
}
@media (max-width: 640px) {
  .organizer-sidebar .form-row {
    grid-template-columns: 1fr 1fr;
  }
  .workspace-controls {
    padding-top: 6px;
  }
  .workspace-toolbar {
    gap: 8px;
  }
  .workspace-actions {
    flex-basis: 100%;
    margin-left: 0;
  }
  .workspace-actions > .button {
    flex: 1;
  }
  .workspace-actions > .button:has(.status-dot),
  .workspace-actions > .button:has(.queue-issue-count) {
    flex-basis: 100%;
  }
  .workspace-filters {
    gap: 8px;
  }
  .workspace-search {
    flex-basis: calc(100% - 130px);
    min-width: 0;
  }
  .workspace-filters > select {
    width: 116px;
  }
  .result-count {
    margin-left: 0;
  }
  .list-tools {
    margin-left: auto;
    gap: 12px;
  }
  .selection-toolbar {
    gap: 7px;
  }
  .selection-warning {
    flex-basis: 100%;
    order: 3;
  }
  .dialog-steps {
    gap: 8px 12px;
  }
  .dialog-steps .steps-count {
    flex-basis: 100%;
    margin-left: 0;
  }
  .queue-settings {
    grid-template-columns: minmax(0, 1fr) 55px 55px;
  }
  .queue-row-actions .row-actions {
    gap: 4px;
  }
  .workspace-actions .button {
    padding-inline: 9px;
  }
}
</style>
