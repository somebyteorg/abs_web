<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useSignStore } from '@/stores/sign'
import { date } from '@/utils/format'
import type { Work } from '@/types'
defineProps<{ works: Work[]; view: 'list' | 'grid' }>()
const route = useRoute()
const sign = useSignStore()
function workLocation(work: Work, upload = false) {
  return {
    path: `/works/${work.id}`,
    query: { from: route.fullPath, upload: upload ? '1' : undefined },
  }
}
</script>

<template>
  <div v-if="view === 'list'" class="table-scroll">
    <table class="data-table works-table">
      <caption class="sr-only">
        作品列表，包含封面、首播日期、分类和共建信息
      </caption>
      <thead>
        <tr>
          <th class="work-title-cell">作品</th>
          <th class="category-column">类型 / 分类</th>
          <th class="date-column">首播日期</th>
          <th class="number-column">音频</th>
          <th class="updated-column">最近更新</th>
          <th class="actions-column">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(work, index) in works" :key="work.id">
          <td>
            <div class="work-title-layout">
              <RouterLink
                :to="workLocation(work)"
                :class="['list-cover', `cover-tone-${index % 5}`]"
                :aria-label="work.name"
                ><img
                  v-if="work.cover_url"
                  :src="work.cover_url"
                  :alt="work.name + '封面'"
                  loading="lazy"
                /><span v-else>{{ work.name.slice(0, 2) }}</span></RouterLink
              >
              <div class="work-title-copy">
                <RouterLink :to="workLocation(work)" class="title-link" :title="work.name">{{
                  work.name
                }}</RouterLink
                ><span v-if="work.is_adult" class="adult-inline">18+</span>
                <p v-if="work.tagline" class="work-tagline" :title="work.tagline">
                  {{ work.tagline }}
                </p>
                <p>
                  <span>{{
                    work.authors?.length
                      ? work.authors.map((author) => author.name).join(' / ')
                      : work.creator?.display_name || '共建成员'
                  }}</span
                  ><span class="mobile-date">
                    · {{ work.date_air ? date(work.date_air) : '日期待补充' }}</span
                  >
                </p>
              </div>
            </div>
          </td>
          <td class="category-column">
            <span class="pill gray">{{ work.type === 'book' ? '有声书' : '播客' }}</span
            ><span class="library-name">{{ work.library?.name }}</span>
          </td>
          <td class="date-column">{{ work.date_air ? date(work.date_air) : '未标注' }}</td>
          <td class="number-column tabular">{{ work.media_count || 0 }}</td>
          <td class="updated-column muted tabular">{{ date(work.updated_at, true) }}</td>
          <td class="actions-column">
            <div class="row-actions">
              <RouterLink :to="workLocation(work)" class="text-button">打开</RouterLink
              ><RouterLink
                v-if="sign.canContribute"
                :to="workLocation(work, true)"
                class="text-button"
                >上传</RouterLink
              >
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="work-grid">
    <article v-for="(work, index) in works" :key="work.id" class="work-card">
      <RouterLink :to="workLocation(work)" :class="['work-cover', `cover-tone-${index % 5}`]"
        ><img
          v-if="work.cover_url"
          :src="work.cover_url"
          :alt="work.name + '封面'"
          loading="lazy"
        /><span v-else>{{ work.name.slice(0, 6) }}</span></RouterLink
      >
      <div class="work-card-info">
        <div class="card-kind">
          <span>{{ work.type === 'book' ? '有声书' : '播客' }}</span
          ><span>{{ work.library?.name }}</span
          ><span v-if="work.is_adult" class="adult-inline">18+</span>
        </div>
        <div class="work-card-title">
          <RouterLink :to="workLocation(work)" class="title-link" :title="work.name">{{
            work.name
          }}</RouterLink>
          <p v-if="work.tagline" class="work-tagline" :title="work.tagline">{{ work.tagline }}</p>
        </div>
        <div class="card-meta">
          <span>{{ work.date_air ? date(work.date_air) : '日期待补充' }}</span
          ><span>{{ work.media_count || 0 }} 段音频</span>
        </div>
        <div class="card-credit">
          <span>{{
            work.authors?.length
              ? work.authors.map((author) => author.name).join(' / ')
              : work.creator?.display_name || '共建成员'
          }}</span
          ><RouterLink v-if="sign.canContribute" :to="workLocation(work, true)" class="text-button"
            >上传</RouterLink
          >
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.works-table {
  table-layout: fixed;
}
.category-column {
  width: 175px;
}
.date-column {
  width: 118px;
}
.number-column {
  width: 62px;
  text-align: right;
}
.updated-column {
  width: 155px;
}
.work-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mobile-date {
  display: none;
}
.library-name {
  margin-left: 8px;
  color: #65766a;
  font-size: 13px;
}
.work-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.work-card {
  display: flex;
  align-items: stretch;
  gap: 15px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.work-card:hover {
  border-color: #c1d3c7;
  background: #fcfefc;
}
.work-cover {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 74px;
  height: 98px;
  padding: 0;
  border-radius: 6px;
  overflow: hidden;
}
.work-cover > span {
  padding: 8px;
  text-align: center;
  font-size: 14px;
  line-height: 1.7;
}
.work-card-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
}
.card-kind {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #758479;
  font-size: 12px;
}
.card-meta,
.card-credit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  color: #7c887f;
  font-size: 12px;
}
.card-credit > span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card-credit .text-button {
  padding: 0;
  font-size: 12px;
}
.work-card-title .work-tagline {
  overflow: hidden;
  margin-top: 2px;
  font-size: 13px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
@media (max-width: 1200px) {
  .updated-column {
    display: none;
  }
}
@media (max-width: 900px) {
  .category-column {
    width: 140px;
  }
  .library-name {
    display: block;
    margin: 4px 0 0;
    font-size: 12px;
  }
  .works-table .actions-column {
    width: 98px;
  }
}
@media (max-width: 640px) {
  .category-column,
  .date-column {
    display: none;
  }
  .mobile-date {
    display: inline;
  }
  .works-table .number-column {
    width: 42px;
  }
  .works-table .actions-column {
    width: 83px;
  }
  .works-table .row-actions {
    gap: 8px;
  }
  .works-table .text-button {
    font-size: 12px;
  }
  .work-grid {
    grid-template-columns: 1fr;
  }
  .work-cover {
    width: 58px;
    height: 77px;
  }
  .work-card {
    padding: 9px;
  }
}
</style>
