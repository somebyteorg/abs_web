<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { HTTPError } from 'ky'
import { useRoute, useRouter } from 'vue-router'
import { useCoverUpload } from '@/composables/useCoverUpload'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import BaseDialog from '@/components/BaseDialog.vue'
import Pagination from '@/components/Pagination.vue'
import { useSignStore } from '@/stores/sign'
import { useFeedback } from '@/composables/useFeedback'
import api from '@/utils/ky'
import { date } from '@/utils/format'
import type { Author, Paginated } from '@/types'
const sign = useSignStore()
const route = useRoute()
const router = useRouter()
const { notify, fail } = useFeedback()
const detailId = Number(route.params.id || 0)
const authors = ref<Paginated<Author>>({ page: 1, page_size: 40, total: 0, items: [] })
const detail = ref<Author>()
const search = ref('')
const loading = ref(false)
const error = ref('')
const open = ref(false)
const editing = ref<Author | null>(null)
const name = ref('')
const description = ref('')
const saving = ref(false)
const deleteOpen = ref(false)
const deleteTarget = ref<Author | null>(null)
const deleting = ref(false)
const coverUpload = useCoverUpload()
const {
  accept: coverAccept,
  file: cover,
  preview,
  progress,
  status: coverStatus,
  error: coverError,
} = coverUpload
const coverInput = ref<HTMLInputElement>()
useUnsavedChanges(
  () =>
    open.value &&
    (name.value !== (editing.value?.name || '') ||
      description.value !== (editing.value?.description || '') ||
      Boolean(cover.value)),
  '作者资料或封面尚未保存，离开后将丢失修改。',
)
watch(open, (value) => {
  if (!value) coverUpload.reset()
})
const title = computed(() => (detailId ? detail.value?.name || '作者资料' : '作者'))
let controller: AbortController | undefined
onBeforeUnmount(() => controller?.abort())
async function load(page = 1) {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = ''
  try {
    if (detailId) {
      const result = await api
        .get(`authors/${detailId}`, { signal: request.signal })
        .json<{ data: Author }>()
      if (!request.signal.aborted) detail.value = result.data
    } else {
      const result = await api
        .get('authors', { signal: request.signal, searchParams: { q: search.value.trim(), page } })
        .json<Paginated<Author>>()
      if (!request.signal.aborted) {
        if (page > 1 && !result.items.length) {
          await load(Math.max(1, Math.ceil(result.total / result.page_size)))
          return
        }
        authors.value = result
      }
    }
  } catch (cause) {
    if (!request.signal.aborted)
      error.value = cause instanceof Error ? cause.message : '作者资料暂时无法加载。'
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}
onMounted(() => load())
watch(
  () => sign.user?.adult_mode,
  () => load(authors.value.page),
)
function edit(author?: Author) {
  editing.value = author || null
  name.value = author?.name || ''
  description.value = author?.description || ''
  coverUpload.reset()
  open.value = true
}
function pick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    try {
      coverUpload.choose(file)
    } catch (cause) {
      fail(cause)
    }
  }
  input.value = ''
}
async function save() {
  if (saving.value) return
  if (!coverUpload.ready.value) {
    fail(new Error('请等待封面上传完成，失败时可重试或撤回选择。'))
    return
  }
  saving.value = true
  try {
    const body = {
      name: name.value.trim(),
      description: description.value.trim() || null,
      ...(cover.value ? { cover_file_id: coverUpload.fileId.value } : {}),
    }
    if (editing.value) await api.patch(`authors/${editing.value.id}`, { json: body })
    else await api.post('authors', { json: body })
    open.value = false
    await load(authors.value.page)
    notify('作者资料已保存。')
  } catch (cause) {
    fail(cause)
  } finally {
    saving.value = false
  }
}
function clearSearch() {
  search.value = ''
  void load()
}
function canDelete(author: Author) {
  return Boolean(sign.user && (author.user_id === sign.user.id || sign.canEditOthers))
}
function requestDelete(author: Author) {
  if (!canDelete(author) || author.has_works) return
  deleteTarget.value = author
  deleteOpen.value = true
}
async function deleteAuthor() {
  if (!deleteTarget.value || deleting.value) return
  deleting.value = true
  try {
    const result = await api.delete(`authors/${deleteTarget.value.id}`).json<{ message: string }>()
    deleteOpen.value = false
    if (detailId) await router.replace('/authors')
    else await load(authors.value.page)
    notify(result.message)
  } catch (cause) {
    fail(cause)
    if (cause instanceof HTTPError && [404, 409, 422].includes(cause.response.status)) {
      deleteOpen.value = false
      await load(authors.value.page)
    }
  } finally {
    deleting.value = false
  }
}
</script>
<template>
  <div class="page-heading">
    <div class="heading-title">
      <RouterLink v-if="detailId" to="/authors" class="back-link">← 作者</RouterLink>
      <h1>{{ title }}</h1>
      <span v-if="!detailId" class="count">{{ authors.total }}</span>
    </div>
    <div class="button-group">
      <button
        v-if="sign.canContribute"
        class="button primary"
        :disabled="deleting || (detailId > 0 && !detail)"
        @click="edit(detailId ? detail : undefined)"
      >
        {{ detailId ? '编辑作者' : '＋ 新建作者' }}
      </button>
      <button
        v-if="detailId && detail && canDelete(detail)"
        class="button secondary danger"
        :disabled="deleting || detail.has_works"
        :title="detail.has_works ? '仍有关联作品，请先解除关联' : '删除作者'"
        @click="requestDelete(detail)"
      >
        删除作者
      </button>
    </div>
  </div>
  <div v-if="!detailId" class="shelf-toolbar">
    <form class="search-field member-search" @submit.prevent="load()">
      <input
        maxlength="100"
        v-model="search"
        placeholder="搜索作者名称…"
        aria-label="搜索作者"
      /><button v-if="search" type="button" aria-label="清空搜索" @click="clearSearch">×</button
      ><button class="search-submit" aria-label="搜索作者">搜索</button>
    </form>
  </div>
  <p v-if="error" class="error-panel">
    {{ error }} <button class="text-button" @click="load()">重试</button>
  </p>
  <div v-else-if="loading" class="empty-state">正在加载作者资料…</div>
  <template v-else-if="detailId && detail"
    ><section class="work-summary author-summary">
      <div class="detail-cover cover-tone-2">
        <img v-if="detail.cover_url" :src="detail.cover_url" :alt="detail.name + '封面'" /><span
          v-else
          >{{ detail.name.slice(0, 2) }}</span
        >
      </div>
      <div class="detail-intro">
        <p class="hint">{{ detail.works_count || 0 }} 部关联作品</p>
        <details v-if="detail.description" class="work-description">
          <summary>作者介绍</summary>
          <p>{{ detail.description }}</p>
        </details>
        <p v-else class="hint">暂无作者介绍</p>
      </div>
    </section>
    <div class="section-heading"><h2>关联作品</h2></div>
    <div v-if="!detail.works?.length" class="empty-state">
      暂时没有关联作品，可在作品资料中选择这位作者。
    </div>
    <div v-else class="table-scroll">
      <table class="data-table author-works-table">
        <thead>
          <tr>
            <th>作品</th>
            <th>类型</th>
            <th>首播日期</th>
            <th class="actions-column">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="work in detail.works" :key="work.id">
            <td>
              <div class="work-title-layout">
                <RouterLink
                  :to="`/works/${work.id}`"
                  class="list-cover cover-tone-0"
                  :aria-label="work.name"
                  ><img v-if="work.cover_url" :src="work.cover_url" alt="" loading="lazy" /><span
                    v-else
                    >{{ work.name.slice(0, 2) }}</span
                  ></RouterLink
                >
                <div class="work-title-copy">
                  <RouterLink :to="`/works/${work.id}`" class="title-link">{{
                    work.name
                  }}</RouterLink>
                  <p v-if="work.tagline" class="work-tagline" :title="work.tagline">
                    {{ work.tagline }}
                  </p>
                </div>
              </div>
            </td>
            <td>{{ work.type === 'book' ? '有声书' : '播客' }}</td>
            <td>{{ date(work.date_air) }}</td>
            <td class="actions-column">
              <RouterLink :to="`/works/${work.id}`" class="text-button">打开</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div></template
  >
  <template v-else
    ><div v-if="!authors.items.length" class="empty-state">
      <h3>{{ search ? '没有匹配的作者' : '还没有作者' }}</h3>
      <button v-if="search" class="button secondary" @click="clearSearch">清空搜索</button>
    </div>
    <div v-else class="table-scroll">
      <table class="data-table authors-table">
        <thead>
          <tr>
            <th>作者 / 介绍</th>
            <th class="author-count-column">关联作品</th>
            <th class="actions-column">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="author in authors.items" :key="author.id">
            <td>
              <div class="work-title-layout">
                <RouterLink
                  :to="`/authors/${author.id}`"
                  class="list-cover cover-tone-2"
                  :aria-label="author.name"
                  ><img
                    v-if="author.cover_url"
                    :src="author.cover_url"
                    alt=""
                    loading="lazy"
                  /><span v-else>{{ author.name.slice(0, 1) }}</span></RouterLink
                >
                <div class="work-title-copy">
                  <RouterLink :to="`/authors/${author.id}`" class="title-link">{{
                    author.name
                  }}</RouterLink>
                  <p class="author-blurb">{{ author.description || '暂无介绍' }}</p>
                </div>
              </div>
            </td>
            <td class="author-count-column">
              <RouterLink :to="`/authors/${author.id}`" class="text-button"
                >{{ author.works_count || 0 }} 部作品</RouterLink
              >
            </td>
            <td class="actions-column">
              <div class="row-actions">
                <RouterLink :to="`/authors/${author.id}`" class="text-button">打开</RouterLink
                ><button v-if="sign.canContribute" class="text-button" @click="edit(author)">
                  编辑
                </button>
                <button
                  v-if="canDelete(author)"
                  type="button"
                  class="text-button danger"
                  :disabled="deleting || author.has_works"
                  :title="author.has_works ? '仍有关联作品，请先解除关联' : '删除作者'"
                  @click="requestDelete(author)"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination
      :page="authors.page"
      :page-size="authors.page_size"
      :total="authors.total"
      :busy="loading"
      @change="load"
  /></template>
  <BaseDialog v-model="deleteOpen" title="删除作者" :busy="deleting">
    <div class="form-stack">
      <p>确认删除「{{ deleteTarget?.name }}」？</p>
      <p class="hint">删除后，编辑或管理员可以在记录中恢复作者。</p>
    </div>
    <template #footer>
      <button
        type="button"
        class="button secondary"
        :disabled="deleting"
        @click="deleteOpen = false"
      >
        取消
      </button>
      <button type="button" class="button danger-button" :disabled="deleting" @click="deleteAuthor">
        {{ deleting ? '正在删除…' : '确认删除' }}
      </button>
    </template>
  </BaseDialog>
  <BaseDialog v-model="open" :title="editing ? '编辑作者' : '新建作者'" :busy="saving"
    ><form id="author-form" @submit.prevent="save">
      <fieldset class="form-stack" :disabled="saving">
        <div class="cover-picker">
          <img
            v-if="preview || editing?.cover_url"
            :src="preview || editing?.cover_url || ''"
            alt="作者封面预览"
          /><span v-else class="cover-picker-placeholder">封面</span>
          <div>
            <button
              type="button"
              class="button secondary"
              :disabled="saving"
              @click="coverInput?.click()"
            >
              上传封面
            </button>
            <p v-if="cover" class="hint">{{ cover.name }}</p>
            <button
              v-if="cover"
              type="button"
              class="text-button"
              :disabled="saving"
              @click="coverUpload.reset"
            >
              撤回选择
            </button>
          </div>
          <input ref="coverInput" type="file" :accept="coverAccept" hidden @change="pick" />
        </div>
        <label>作者名称<input maxlength="80" v-model="name" required /></label
        ><label>作者介绍<textarea maxlength="2000" v-model="description" rows="5" /></label>
        <p v-if="coverStatus === 'compressing'" class="hint">正在压缩封面…</p>
        <p v-if="coverStatus === 'uploading'" class="hint">正在上传封面 {{ progress }}%</p>
        <p v-if="coverStatus === 'done'" class="hint">已上传，保存后使用</p>
        <p v-if="coverError" class="field-error">
          {{ coverError }}
          <button type="button" class="text-button" @click="coverUpload.retry">重试上传</button>
        </p>
      </fieldset>
    </form>
    <template #footer
      ><button class="button secondary" :disabled="saving" @click="open = false">取消</button
      ><button
        class="button primary"
        form="author-form"
        :disabled="saving || !coverUpload.ready.value"
      >
        {{ saving ? '正在保存…' : '保存作者资料' }}
      </button></template
    ></BaseDialog
  >
</template>

<style scoped>
.author-blurb {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 5px 0;
  color: var(--muted);
  font-size: 13px;
}
.author-summary {
  margin-bottom: 16px;
}

.authors-table,
.author-works-table {
  table-layout: fixed;
}
.authors-table .author-count-column {
  width: 120px;
}
.authors-table .work-title-copy {
  flex: 1;
}
@media (max-width: 640px) {
  .authors-table .author-count-column {
    width: 90px;
  }
  .authors-table .actions-column {
    width: 80px;
  }
  .authors-table .row-actions {
    gap: 8px;
  }
  .author-works-table th:nth-child(2),
  .author-works-table td:nth-child(2) {
    display: none;
  }
  .author-works-table th:nth-child(3) {
    width: 100px;
  }
  .author-works-table .actions-column {
    width: 45px;
  }
}
</style>
