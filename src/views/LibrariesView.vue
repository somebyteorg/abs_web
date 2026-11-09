<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import { useSignStore } from '@/stores/sign'
import { useCatalogStore } from '@/stores/catalog'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { useFeedback } from '@/composables/useFeedback'
import api from '@/utils/ky'
import type { Library } from '@/types'
const sign = useSignStore()
const catalog = useCatalogStore()
const { notify, fail } = useFeedback()
const entries = ref<Library[]>([])
const error = ref('')
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const typeFilter = ref('')
const visibleEntries = computed(() =>
  entries.value.filter(
    (library) =>
      (!typeFilter.value || library.type === typeFilter.value) &&
      library.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()),
  ),
)
const open = ref(false)
const deleting = ref<Library | null>(null)
const editing = ref<Library | null>(null)
const name = ref('')
const type = ref<'book' | 'podcast'>('book')
useUnsavedChanges(
  () =>
    open.value &&
    (name.value !== (editing.value?.name || '') || type.value !== (editing.value?.type || 'book')),
  '分类资料尚未保存，离开后将丢失修改。',
)
async function load() {
  if (!sign.canEditOthers) return
  error.value = ''
  loading.value = true
  try {
    entries.value = (await api.get('libraries/manage').json<{ data: Library[] }>()).data
    await catalog.load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '分类暂时没有加载成功。'
  } finally {
    loading.value = false
  }
}
onMounted(load)
function edit(library?: Library) {
  editing.value = library || null
  name.value = library?.name || ''
  type.value = library?.type || 'book'
  open.value = true
}
async function save() {
  if (saving.value) return
  saving.value = true
  try {
    if (editing.value)
      await api.patch(`libraries/${editing.value.id}`, { json: { name: name.value.trim() } })
    else await api.post('libraries', { json: { name: name.value.trim(), type: type.value } })
    open.value = false
    await load()
    notify('分类已保存。')
  } catch (cause) {
    fail(cause)
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (!deleting.value || saving.value) return
  saving.value = true
  try {
    await api.delete(`libraries/${deleting.value.id}`)
    deleting.value = null
    await load()
    notify('空分类已删除。')
  } catch (cause) {
    fail(cause)
  } finally {
    saving.value = false
  }
}
function clearFilters() {
  search.value = ''
  typeFilter.value = ''
}
</script>
<template>
  <div class="page-heading">
    <div class="heading-title">
      <h1>分类管理</h1>
      <span v-if="sign.canEditOthers" class="count">{{ entries.length }}</span>
    </div>
    <button v-if="sign.canEditOthers" class="button primary" :disabled="saving" @click="edit()">
      ＋ 新建分类
    </button>
  </div>
  <div v-if="!sign.canEditOthers" class="empty-state">分类管理仅对编辑和管理员开放。</div>
  <template v-else>
    <div class="shelf-toolbar">
      <div class="search-field member-search">
        <input
          maxlength="100"
          v-model="search"
          type="search"
          placeholder="搜索分类名称"
          aria-label="搜索分类"
        />
      </div>
      <select v-model="typeFilter" class="category-select" aria-label="筛选收录类型">
        <option value="">全部类型</option>
        <option value="book">有声书</option>
        <option value="podcast">播客</option></select
      ><button v-if="search || typeFilter" class="text-button" @click="clearFilters">
        清空筛选
      </button>
    </div>
    <p v-if="error" class="error-panel">
      {{ error }} <button class="text-button" @click="load">重试</button>
    </p>
    <div v-else-if="loading" class="empty-state">正在加载分类…</div>
    <div v-else-if="!visibleEntries.length" class="empty-state">
      <h3>{{ search || typeFilter ? '没有匹配的分类' : '还没有分类' }}</h3>
    </div>
    <div v-else class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>分类名称</th>
            <th>收录类型</th>
            <th>作品数</th>
            <th class="actions-column">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="library in visibleEntries" :key="library.id">
            <td>
              <RouterLink
                :to="{ path: '/', query: { library_id: library.id } }"
                class="title-link"
                >{{ library.name }}</RouterLink
              >
            </td>
            <td>{{ library.type === 'book' ? '有声书' : '播客' }}</td>
            <td class="tabular">{{ library.works_count || 0 }}</td>
            <td class="actions-column">
              <div class="row-actions">
                <button class="text-button" :disabled="saving" @click="edit(library)">编辑</button
                ><button
                  class="text-button danger"
                  :disabled="saving || (library.works_count || 0) > 0"
                  title="仅可删除没有作品的分类"
                  @click="deleting = library"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  <BaseDialog v-model="open" :title="editing ? '编辑分类' : '新建分类'" :busy="saving"
    ><form id="library-form" @submit.prevent="save">
      <fieldset class="form-stack" :disabled="saving">
        <label>名称<input maxlength="50" v-model="name" required /></label
        ><label
          >收录类型<select v-model="type" :disabled="Boolean(editing)">
            <option value="book">有声书</option>
            <option value="podcast">播客</option>
          </select></label
        >
        <p class="hint">创建后不能更改收录类型；作品可移动到同类型分类。</p>
      </fieldset>
    </form>
    <template #footer
      ><button class="button secondary" :disabled="saving" @click="open = false">取消</button
      ><button class="button primary" form="library-form" :disabled="saving">
        {{ saving ? '正在保存…' : '保存分类' }}
      </button></template
    ></BaseDialog
  >
  <BaseDialog
    :model-value="Boolean(deleting)"
    title="删除空分类"
    :busy="saving"
    @update:model-value="
      (value) => {
        if (!value) deleting = null
      }
    "
    ><p class="dialog-copy">删除「{{ deleting?.name }}」？分类记录会保留，只有空分类可以删除。</p>
    <template #footer
      ><button class="button secondary" :disabled="saving" @click="deleting = null">取消</button
      ><button class="button danger-button" :disabled="saving" @click="remove">
        确认删除
      </button></template
    ></BaseDialog
  >
</template>
