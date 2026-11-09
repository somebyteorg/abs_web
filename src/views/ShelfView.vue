<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import Pagination from '@/components/Pagination.vue'
import ShelfFilters from '@/components/ShelfFilters.vue'
import ShelfResults from '@/components/ShelfResults.vue'
import CreateWorkDialog from '@/components/CreateWorkDialog.vue'
import { useSignStore } from '@/stores/sign'
import { useCatalogStore } from '@/stores/catalog'
import { useCollection } from '@/composables/useCollection'
import { useFeedback } from '@/composables/useFeedback'
import type { Work } from '@/types'
const sign = useSignStore()
const catalog = useCatalogStore()
const route = useRoute()
const router = useRouter()
const { fail } = useFeedback()
const createOpen = ref(false)
const view = useStorage<'list' | 'grid'>('emos-abs-shelf-view', 'list')
const hasFilters = computed(() =>
  Boolean(route.query.q || route.query.type || route.query.library_id || route.query.author_id),
)
const { result, loading, error, load } = useCollection<Work>('works', () => ({
  q: String(route.query.q || ''),
  library_id: String(route.query.library_id || ''),
  type: String(route.query.type || ''),
  author_id: String(route.query.author_id || ''),
  page: Number(route.query.page || 1),
}))
watch(
  () => sign.user?.adult_mode,
  () => {
    if (route.query.page) router.replace({ query: { ...route.query, page: undefined } })
    else load()
  },
)
onMounted(() => catalog.load().catch(fail))
</script>

<template>
  <div class="page-heading">
    <div class="heading-title">
      <h1>作品</h1>
      <span class="count">{{ result.total }}</span>
    </div>
    <div class="button-group">
      <RouterLink v-if="sign.canEditOthers" to="/libraries" class="button secondary"
        >管理分类</RouterLink
      ><button v-if="sign.canContribute" class="button primary" @click="createOpen = true">
        ＋ 新建作品
      </button>
    </div>
  </div>

  <ShelfFilters v-model:view="view" :has-filters="hasFilters" />
  <div v-if="error" class="empty-state error">
    <p>{{ error }}</p>
    <button class="button secondary" @click="load">再试一次</button>
  </div>
  <div v-else-if="loading" class="skeleton-list" aria-label="正在加载作品">
    <div v-for="n in 10" :key="n" class="skeleton-row"></div>
  </div>
  <div v-else-if="!result.items.length" class="empty-state">
    <h3>{{ hasFilters ? '没有找到匹配的作品' : '还没有作品' }}</h3>
    <button v-if="sign.canContribute" class="button primary" @click="createOpen = true">
      ＋ 新建作品
    </button>
  </div>

  <ShelfResults v-else :works="result.items" :view="view" />
  <Pagination
    :page="result.page"
    :page-size="result.page_size"
    :total="result.total"
    :busy="loading"
    @change="(page) => router.replace({ query: { ...route.query, page } })"
  />

  <CreateWorkDialog v-model="createOpen" />
</template>

<style scoped>
.skeleton-list {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
}
.skeleton-row {
  height: 64px;
  margin: 0 12px;
  border-bottom: 1px solid #edf0ee;
  background: linear-gradient(100deg, #f7f9f7 30%, #eef2ef 50%, #f7f9f7 70%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
</style>
