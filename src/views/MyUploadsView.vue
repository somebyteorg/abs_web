<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import Pagination from '@/components/Pagination.vue'
import { useCollection } from '@/composables/useCollection'
import { bytes, date, duration } from '@/utils/format'
import type { UploadContribution } from '@/types'

const page = ref(1)
const { result, loading, error, load } = useCollection<UploadContribution>('uploads', () => ({
  mine: 1,
  page: page.value,
}))
function destination(resource: UploadContribution) {
  if (resource.author) return `/authors/${resource.author.id}`
  return resource.work ? `/works/${resource.work.id}` : null
}
function status(resource: UploadContribution) {
  if (!resource.is_current)
    return resource.file_type === 'cover'
      ? !resource.work && !resource.author
        ? '待保存封面'
        : '历史封面'
      : '已下架'
  if (resource.file_type === 'cover') return '当前封面'
  return resource.is_primary ? '主资源' : '备选资源'
}
</script>

<template>
  <div class="page-heading">
    <div class="heading-title">
      <RouterLink to="/contributions" class="back-link">← 贡献</RouterLink>
      <h1>我的上传</h1>
      <span class="count">{{ result.total }}</span>
    </div>
  </div>
  <div v-if="error" class="empty-state error">
    <p>{{ error }}</p>
    <button class="button secondary" @click="load">重试</button>
  </div>
  <div v-else-if="loading" class="empty-state">正在加载我的上传…</div>
  <div v-else-if="!result.items.length" class="empty-state">
    <h3>暂无上传记录</h3>
    <RouterLink to="/" class="button primary">查看作品</RouterLink>
  </div>
  <div v-else class="table-scroll">
    <table class="data-table my-uploads-table">
      <thead>
        <tr>
          <th>资源 / 所属作品或作者</th>
          <th class="status-column">状态</th>
          <th class="size-column">大小</th>
          <th class="uploaded-column">上传时间</th>
          <th class="actions-column">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="resource in result.items" :key="resource.id">
          <td>
            <div class="work-title-layout">
              <component
                :is="destination(resource) ? RouterLink : 'span'"
                :to="destination(resource) || undefined"
                class="list-cover cover-tone-0"
                :aria-label="resource.author?.name || resource.work?.name || resource.name"
              >
                <img
                  v-if="resource.author?.cover_url || resource.work?.cover_url"
                  :src="resource.author?.cover_url || resource.work?.cover_url || undefined"
                  alt=""
                  loading="lazy"
                />
                <span v-else>{{
                  (resource.author?.name || resource.work?.name || resource.name).slice(0, 2)
                }}</span>
              </component>
              <div class="work-title-copy resource-copy">
                <strong class="chapter-title" :title="resource.name">{{ resource.name }}</strong>
                <p>
                  <RouterLink
                    v-if="destination(resource)"
                    :to="destination(resource)!"
                    class="text-button"
                    >{{ resource.author?.name || resource.work?.name
                    }}<template v-if="!resource.author && resource.work?.tagline">
                      · {{ resource.work.tagline }}</template
                    ></RouterLink
                  ><template v-if="resource.file_type === 'audio' && resource.chapter">
                    · S{{ resource.chapter.season_number }}E{{ resource.chapter.episode_number }} ·
                    {{ resource.chapter.title }}</template
                  ><template v-else-if="resource.file_type === 'cover'"> · 封面</template
                  ><template v-if="resource.is_reference"> · 引用已有音频</template
                  ><template v-if="resource.file_type === 'audio'">
                    · {{ duration(resource.file_second || 0) }}</template
                  >
                </p>
                <p v-if="resource.delete_reason" class="resource-removal-reason">
                  下架原因：{{ resource.delete_reason }}
                </p>
                <span class="resource-mobile-meta"
                  >{{ bytes(resource.file_size) }} · {{ date(resource.created_at, true) }}</span
                >
              </div>
            </div>
          </td>
          <td class="status-column">
            <span
              :class="[
                'pill',
                resource.is_current
                  ? resource.file_type === 'audio' && !resource.is_primary
                    ? 'gray'
                    : 'mint'
                  : 'gray',
              ]"
              >{{ status(resource) }}</span
            >
          </td>
          <td class="size-column tabular">{{ bytes(resource.file_size) }}</td>
          <td class="uploaded-column muted tabular">{{ date(resource.created_at, true) }}</td>
          <td class="actions-column">
            <RouterLink
              v-if="destination(resource)"
              :to="destination(resource)!"
              class="text-button"
              >{{ resource.author ? '打开作者' : '打开作品' }}</RouterLink
            ><span v-else class="muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <Pagination
    :page="result.page"
    :page-size="result.page_size"
    :total="result.total"
    :busy="loading"
    @change="page = $event"
  />
</template>

<style scoped>
.chapter-title {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
}
@media (max-width: 640px) {
  .size-column {
    display: none;
  }
  .chapter-title {
    font-size: 13px;
  }
}
.my-uploads-table {
  table-layout: fixed;
}
.my-uploads-table .status-column {
  width: 96px;
}
.my-uploads-table .size-column {
  width: 96px;
}
.my-uploads-table .uploaded-column {
  width: 156px;
}
.my-uploads-table .actions-column {
  width: 88px;
}
.resource-copy {
  flex: 1;
}
.resource-copy .text-button {
  max-width: 100%;
  padding: 0;
  font-size: 13px;
  vertical-align: bottom;
}
.resource-copy .resource-removal-reason {
  color: #9a713b;
  white-space: normal;
  overflow-wrap: anywhere;
}
.resource-mobile-meta {
  display: none;
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 640px) {
  .my-uploads-table .uploaded-column {
    display: none;
  }
  .my-uploads-table .status-column {
    width: 80px;
  }
  .my-uploads-table .actions-column {
    width: 80px;
  }
  .resource-mobile-meta {
    display: block;
  }
}
</style>
