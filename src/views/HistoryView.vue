<script setup lang="ts">
import { onScopeDispose, reactive, ref, watch } from 'vue'
import { HTTPError } from 'ky'
import { useRoute, useRouter } from 'vue-router'
import BaseDialog from '@/components/BaseDialog.vue'
import Pagination from '@/components/Pagination.vue'
import { useCollection } from '@/composables/useCollection'
import { useFeedback } from '@/composables/useFeedback'
import { useSignStore } from '@/stores/sign'
import api from '@/utils/ky'
import { actionNames, date, displayValue, fieldNames, operationName } from '@/utils/format'
import type { Activity, RestorePreview } from '@/types'
const route = useRoute()
const router = useRouter()
const sign = useSignStore()
const { notify } = useFeedback()
const restoreOpen = ref(false)
const restoring = ref(false)
const previewLoading = ref(false)
const restoreError = ref('')
const restorePreview = ref<RestorePreview>()
const restoreId = ref(0)
let restoreController: AbortController | undefined
watch(restoreOpen, (open) => {
  if (!open) restoreController?.abort()
})
onScopeDispose(() => restoreController?.abort())
const page = ref(1)
const expandedChanges = ref<number[]>([])
function toggleChanges(id: number, event: Event) {
  const opened = (event.target as HTMLDetailsElement).open
  expandedChanges.value = opened
    ? [...new Set([...expandedChanges.value, id])]
    : expandedChanges.value.filter((value) => value !== id)
}
function batchChanges(log: Activity) {
  return (log.details.changes || []) as { name: string; from: string; to: string }[]
}
function selections(log: Activity) {
  return (log.details.primary_selections || []) as { chapter: string; resource: string }[]
}
function primaryNames(log: Activity) {
  return log.details.resource_names as { before?: string; after?: string } | undefined
}
function authorChanges(log: Activity) {
  const change = log.details.authors_change as { before: string[]; after: string[] } | undefined
  return change
    ? `${change.before.join('、') || '未关联作者'} → ${change.after.join('、') || '未关联作者'}`
    : '修改了作品关联的作者'
}
const draft = reactive({ user: '', from: '', to: '' })
const applied = ref({ ...draft })
const { result, loading, error, load } = useCollection<Activity>('history', () => ({
  ...applied.value,
  work_id: String(route.query.work_id || ''),
  page: page.value,
}))
function search() {
  if (loading.value) return
  if (page.value === 1 && JSON.stringify(applied.value) === JSON.stringify(draft)) {
    load()
    return
  }
  page.value = 1
  applied.value = { ...draft }
}
function description(log: Activity) {
  if (log.action === 'media.deleted') {
    const uploader =
      log.uploader?.id === log.actor.id ? '自己' : log.uploader?.display_name || '原上传者'
    return `删除了 ${uploader} 上传的音频`
  }
  if (log.action === 'activity.restored')
    return `撤销了“${operationName(String(log.details.original_action || ''))}”操作：`
  return actionNames[log.action] || '更新了内容'
}
function roleName(value: unknown) {
  return (
    ({ admin: '管理员', edit: '编辑', user: '共建成员' } as Record<string, string>)[
      String(value)
    ] || '仅浏览'
  )
}
function hasSubject(log: Activity) {
  return !['notice.accepted', 'profile.updated'].includes(log.action)
}
async function previewRestore(id = restoreId.value) {
  restoreController?.abort()
  const controller = new AbortController()
  restoreController = controller
  restoreId.value = id
  restorePreview.value = undefined
  restoreError.value = ''
  restoreOpen.value = true
  previewLoading.value = true
  try {
    const preview = await api
      .get(`history/${id}/restore`, { signal: controller.signal })
      .json<RestorePreview>()
    if (!controller.signal.aborted) restorePreview.value = preview
  } catch (cause) {
    if (!controller.signal.aborted)
      restoreError.value = cause instanceof Error ? cause.message : '恢复内容暂时无法加载。'
  } finally {
    if (!controller.signal.aborted) previewLoading.value = false
  }
}
async function applyRestore() {
  if (restoring.value || !restorePreview.value?.can_restore) return
  restoring.value = true
  restoreError.value = ''
  try {
    await api.post(`history/${restoreId.value}/restore`, {
      json: { expected_revisions: restorePreview.value.versions },
    })
    restoreOpen.value = false
    await load()
    notify('已恢复，相关作品会重新同步。')
  } catch (cause) {
    if (cause instanceof HTTPError && cause.response.status === 409) await previewRestore()
    restoreError.value = cause instanceof Error ? cause.message : '恢复没有完成，请重新检查。'
  } finally {
    restoring.value = false
  }
}
function changes(log: Activity) {
  const before = log.details.before
  const after = log.details.after
  if (
    !before ||
    typeof before !== 'object' ||
    Array.isArray(before) ||
    !after ||
    typeof after !== 'object' ||
    Array.isArray(after)
  )
    return []
  const libraryChange = log.details.library_change as { from?: string; to?: string } | undefined
  return Object.entries(after)
    .filter(
      ([key, value]) =>
        Object.hasOwn(fieldNames, key) &&
        JSON.stringify((before as Record<string, unknown>)[key]) !== JSON.stringify(value),
    )
    .map(([key, value]) => ({
      key,
      name: fieldNames[key] || key,
      before:
        key === 'cover_file_id'
          ? (before as Record<string, unknown>)[key]
            ? '原封面'
            : '无封面'
          : displayValue(
              key === 'abs_library_id' && libraryChange
                ? libraryChange.from
                : (before as Record<string, unknown>)[key],
            ),
      after:
        key === 'cover_file_id'
          ? value
            ? '新封面'
            : '无封面'
          : displayValue(key === 'abs_library_id' && libraryChange ? libraryChange.to : value),
    }))
}
</script>
<template>
  <div class="page-title"><h1>记录</h1></div>
  <form class="filter-panel" @submit.prevent="search">
    <label>成员名字<input maxlength="100" v-model="draft.user" placeholder="化名或用户名" /></label>
    <label>从哪一天<input v-model="draft.from" type="date" /></label>
    <label>到哪一天<input v-model="draft.to" type="date" :min="draft.from" /></label>
    <button class="button primary" :disabled="loading" :aria-busy="loading">
      {{ loading ? '正在查找…' : '找找记录' }}
    </button>
    <button
      v-if="route.query.work_id"
      type="button"
      class="button secondary"
      :disabled="loading"
      @click="router.replace('/history')"
    >
      查看全部作品
    </button>
  </form>
  <p v-if="error" class="error-panel">
    {{ error }} <button class="text-button" @click="load">重试</button>
  </p>
  <div v-else-if="loading" class="empty-state" role="status">正在加载记录…</div>
  <div v-else-if="!result.items.length" class="empty-state"><h3>暂无匹配记录</h3></div>
  <div v-else class="activity-list">
    <article v-for="log in result.items" :key="log.id" class="activity-card">
      <span class="activity-avatar" aria-hidden="true">{{
        log.actor.display_name.slice(0, 1)
      }}</span>
      <div class="activity-body">
        <div class="activity-line">
          <p class="activity-description">
            <strong>{{ log.actor.display_name }}</strong> {{ description(log) }}
            <template v-if="hasSubject(log)">
              <RouterLink
                v-if="log.work_id && log.work_available"
                :to="`/works/${log.work_id}`"
                class="activity-subject"
                >「{{ log.subject }}」</RouterLink
              >
              <RouterLink
                v-else-if="log.details.author_id && log.author_available"
                :to="`/authors/${log.details.author_id}`"
                class="activity-subject"
                >「{{ log.subject }}」</RouterLink
              >
              <span v-else class="activity-subject">「{{ log.subject }}」</span>
            </template>
          </p>
          <time :datetime="log.created_at">{{ date(log.created_at, true) }}</time>
        </div>
        <p v-if="log.details.reason" class="deletion-reason">删除原因：{{ log.details.reason }}</p>
        <p v-if="['audio.uploaded', 'audio.referenced'].includes(log.action)" class="hint">
          上传至 S{{ log.details.season }}E{{ log.details.episode }}
        </p>
        <p v-if="log.action === 'role.updated'" class="hint">
          {{ roleName(log.details.before) }} → {{ roleName(log.details.after) }}
        </p>
        <p v-if="log.action === 'profile.updated'" class="hint">
          {{ log.details.before || '使用用户名' }} → {{ log.details.after || '使用用户名' }}
        </p>
        <p v-if="log.action === 'primary.changed'" class="hint">
          主资源：{{ primaryNames(log)?.before || '未指定' }} →
          {{ primaryNames(log)?.after || '未指定' }}
        </p>
        <p v-if="log.action === 'library.updated'" class="hint">
          分类名称：{{ log.details.before }} → {{ log.details.after }}
        </p>
        <p
          v-if="log.action === 'chapters.reordered' && Array.isArray(log.details.after)"
          class="hint"
        >
          重新排列了 {{ log.details.after.length }} 个章节
        </p>
        <p v-if="log.details.authors_changed" class="hint">{{ authorChanges(log) }}</p>
        <p v-for="(item, index) in selections(log)" :key="index" class="hint">
          {{ item.chapter }} 的主资源：{{ item.resource }}
        </p>
        <details
          v-if="batchChanges(log).length"
          class="change-details"
          @toggle="toggleChanges(log.id, $event)"
        >
          <summary>
            查看 {{ batchChanges(log).length }} 项{{
              log.action === 'activity.restored' ? '恢复' : '改动'
            }}详情
          </summary>
          <div v-if="expandedChanges.includes(log.id)" class="audit-changes">
            <div v-for="(change, index) in batchChanges(log)" :key="index">
              <strong>{{ change.name }}</strong>
              <p>{{ change.from }} → {{ change.to }}</p>
            </div>
          </div>
        </details>
        <details v-if="changes(log).length" class="change-details">
          <summary>查看修改内容</summary>
          <dl>
            <div v-for="change in changes(log)" :key="change.key">
              <dt>{{ change.name }}</dt>
              <dd>
                <del>{{ change.before }}</del
                ><span>→ {{ change.after }}</span>
              </dd>
            </div>
          </dl>
        </details>
        <div v-if="log.can_restore || log.restored_at" class="history-restore-action">
          <p v-if="log.restored_at" class="history-restored">
            由 <strong>{{ log.restored_by?.display_name || '原恢复者' }}</strong> 于
            <time :datetime="log.restored_at">{{ date(log.restored_at, true) }}</time> 恢复到操作前
          </p>
          <button
            v-else-if="log.can_restore && sign.canEditOthers"
            class="text-button"
            :disabled="restoring || previewLoading"
            @click="previewRestore(log.id)"
          >
            恢复到操作前
          </button>
        </div>
      </div>
    </article>
  </div>
  <Pagination
    :page="result.page"
    :page-size="result.page_size"
    :total="result.total"
    :busy="loading"
    @change="page = $event"
  />
  <BaseDialog v-model="restoreOpen" title="恢复到操作前" :busy="restoring" wide>
    <div v-if="previewLoading" class="empty-state">正在检查恢复内容和冲突…</div>
    <p v-if="restoreError" class="error-panel">{{ restoreError }}</p>
    <template v-if="restorePreview">
      <p>撤销“{{ operationName(restorePreview.action) }}”操作：{{ restorePreview.subject }}</p>
      <div class="audit-changes">
        <div
          v-for="(change, index) in restorePreview.changes"
          :key="`${change.kind}-${change.id}-${index}`"
        >
          <strong>{{ change.name }}</strong>
          <p>{{ change.from }} → {{ change.to }}</p>
        </div>
      </div>
      <div v-if="restorePreview.conflicts.length" class="error-panel restore-conflicts">
        <strong>需要先处理以下冲突</strong>
        <ul>
          <li v-for="conflict in restorePreview.conflicts" :key="conflict">{{ conflict }}</li>
        </ul>
      </div>
    </template>
    <template #footer
      ><button class="button secondary" :disabled="restoring" @click="restoreOpen = false">
        关闭</button
      ><button
        class="button secondary"
        :disabled="previewLoading || restoring"
        @click="previewRestore()"
      >
        重新检查</button
      ><button
        class="button primary"
        :disabled="previewLoading || restoring || !restorePreview?.can_restore"
        @click="applyRestore"
      >
        {{ restoring ? '正在恢复…' : '确认恢复' }}
      </button></template
    >
  </BaseDialog>
</template>

<style scoped>
.filter-panel {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 14px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.filter-panel label {
  width: 180px;
  font-size: 12px;
  color: #697a6e;
}
.activity-list {
  padding: 0 18px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.activity-card {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 15px 0;
  border-bottom: 1px solid #edf0ee;
}
.activity-card:last-child {
  border-bottom: 0;
}
.activity-body {
  flex: 1;
  min-width: 0;
}
.activity-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin: 0 0 4px;
  font-size: 13px;
}
.activity-line strong {
  color: #4f6d56;
  font-weight: 550;
}
.activity-line > span {
  color: #78857b;
}
.activity-line time {
  margin-left: auto;
  color: #88948c;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.activity-description {
  flex: 1;
  min-width: 0;
  line-height: 1.8;
  overflow-wrap: anywhere;
  color: #697a6e;
}
.activity-line > time {
  flex-shrink: 0;
}
.activity-subject {
  color: #354e3f;
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.deletion-reason {
  margin-top: 6px;
  padding: 6px 9px;
  border-radius: 4px;
  background: #fbf2e8;
  color: #a17c53;
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.change-details {
  margin-top: 6px;
  color: #72836f;
  font-size: 13px;
}
.change-details summary {
  width: fit-content;
  cursor: pointer;
}
.change-details dl {
  margin: 7px 0 0;
  padding: 8px 10px;
  border-radius: 5px;
  background: #f6f8f4;
}
.change-details dl > div {
  display: flex;
  gap: 12px;
  padding: 4px 0;
}
.change-details dt {
  flex: 0 0 65px;
}
.change-details dd {
  display: flex;
  flex-direction: column;
  margin: 0;
  line-height: 1.8;
  word-break: break-word;
}
.change-details del {
  color: #98a095;
}
@media (max-width: 640px) {
  .filter-panel {
    gap: 9px;
    padding: 10px;
  }
  .filter-panel label {
    flex: 1 1 130px;
  }
  .activity-list {
    padding: 0 10px;
  }
  .activity-card {
    gap: 8px;
  }
  .activity-line time {
    flex-basis: 100%;
    margin-left: 0;
    font-size: 12px;
  }
  .activity-subject {
    font-size: 13px;
  }
}

.audit-changes {
  max-height: 350px;
  overflow-y: auto;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #f8faf5;
}
.audit-changes > div {
  padding: 7px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.audit-changes > div:last-child {
  border: 0;
}
.audit-changes strong {
  font-weight: 500;
  color: #506b48;
}
.audit-changes p {
  margin-top: 4px;
  color: #7b8c70;
}
.history-restore-action {
  margin-top: 7px;
}
.history-restored {
  font-size: 12px;
  line-height: 1.8;
  color: #6c7e71;
  overflow-wrap: anywhere;
}
.history-restored strong {
  font-weight: 550;
  color: #4f6d56;
}
.restore-conflicts {
  margin-top: 14px;
}
.restore-conflicts ul {
  margin: 7px 0 0;
  padding-left: 20px;
}
</style>
