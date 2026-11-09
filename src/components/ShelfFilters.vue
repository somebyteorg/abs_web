<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
defineProps<{ hasFilters: boolean }>()
const view = defineModel<'list' | 'grid'>('view', { required: true })
const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const search = ref(String(route.query.q || ''))
watch(
  () => route.query.q,
  (value) => {
    search.value = String(value || '')
  },
)
const availableLibraries = computed(() =>
  catalog.libraries.filter((library) => !route.query.type || library.type === route.query.type),
)
const selectedLibrary = computed(() => String(route.query.library_id || ''))
function filter(key: string, value: string | number) {
  const query = { ...route.query, [key]: value || undefined, page: undefined }
  if (
    key === 'type' &&
    value &&
    !catalog.libraries.some(
      (library) => String(library.id) === selectedLibrary.value && library.type === value,
    )
  )
    query.library_id = undefined
  router.replace({ query })
}
function clearSearch() {
  search.value = ''
  filter('q', '')
}
</script>

<template>
  <div class="shelf-toolbar">
    <div class="filter-pills">
      <button :class="['filter-pill', { selected: !route.query.type }]" @click="filter('type', '')">
        全部</button
      ><button
        :class="['filter-pill', { selected: route.query.type === 'book' }]"
        @click="filter('type', 'book')"
      >
        有声书</button
      ><button
        :class="['filter-pill', { selected: route.query.type === 'podcast' }]"
        @click="filter('type', 'podcast')"
      >
        播客
      </button>
    </div>
    <select
      :value="selectedLibrary"
      class="category-select"
      aria-label="按分类筛选"
      @change="filter('library_id', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">所有分类</option>
      <option v-for="library in availableLibraries" :key="library.id" :value="library.id">
        {{ library.name }}
      </option>
    </select>
    <form class="search-field shelf-search" @submit.prevent="filter('q', search.trim())">
      <input
        maxlength="100"
        v-model="search"
        aria-label="搜索作品"
        placeholder="搜索名称或副标题"
      /><button v-if="search" type="button" aria-label="清空搜索" @click="clearSearch">×</button
      ><button aria-label="搜索作品" type="submit" class="search-submit">搜索</button>
    </form>
    <span v-if="route.query.author_id" class="pill mint"
      >已按作者筛选
      <button
        type="button"
        class="icon-button"
        aria-label="取消作者筛选"
        @click="filter('author_id', '')"
      >
        ×
      </button></span
    ><button v-if="hasFilters" class="text-button" @click="router.replace('/')">清空筛选</button>
    <div class="view-switch" aria-label="显示方式">
      <button
        :class="{ selected: view === 'list' }"
        :aria-pressed="view === 'list'"
        @click="view = 'list'"
      >
        列表</button
      ><button
        :class="{ selected: view === 'grid' }"
        :aria-pressed="view === 'grid'"
        @click="view = 'grid'"
      >
        封面
      </button>
    </div>
  </div>
</template>

<style scoped>
.view-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.shelf-search {
  width: min(400px, 32vw);
}
.view-switch {
  margin-left: auto;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}
.view-switch button {
  padding: 6px 12px;
  border-radius: 4px;
  background: transparent;
  color: #758279;
  font-size: 13px;
}
.view-switch button.selected {
  background: #edf2ef;
  color: #395c46;
}
@media (max-width: 900px) {
  .shelf-search {
    flex: 1;
    min-width: 160px;
    width: auto;
  }
}
@media (max-width: 640px) {
  .shelf-search {
    order: 3;
    flex: 1;
    flex-basis: calc(100% - 100px);
  }
  .view-switch {
    order: 4;
    margin-left: 0;
  }
}
</style>
