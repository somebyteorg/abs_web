<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/utils/ky'
import { bytes } from '@/utils/format'
import type { User } from '@/types'

interface ContributionTotals {
  total_bytes: number
  total_works: number
  total_uploads: number
}
interface ContributionStats extends ContributionTotals {
  contributors: number
  leaders: User[]
  personal: ContributionTotals
}
const stats = ref<ContributionStats>()
const error = ref('')
const metric = ref<'bytes' | 'share'>('bytes')
const personalShare = computed(() =>
  stats.value?.total_bytes
    ? ((stats.value.personal.total_bytes / stats.value.total_bytes) * 100).toFixed(1)
    : '0.0',
)
async function load() {
  error.value = ''
  try {
    stats.value = await api.get('stats').json<ContributionStats>()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '统计暂时没连上。'
  }
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <h1>贡献</h1>
    <RouterLink to="/my-uploads" class="button secondary">我的上传</RouterLink>
  </div>
  <p v-if="error" class="error-panel">
    {{ error }} <button class="text-button" @click="load">重试</button>
  </p>
  <template v-else-if="stats">
    <div class="stats-grid">
      <article class="stat-card mint">
        <span>累计上传量</span><strong>{{ bytes(stats.total_bytes) }}</strong>
        <p class="personal-stat">
          <span>我的上传</span><b>{{ bytes(stats.personal.total_bytes) }}</b>
        </p>
      </article>
      <article class="stat-card lilac">
        <span>已创建作品</span><strong>{{ stats.total_works }}<i> 部</i></strong>
        <p class="personal-stat">
          <span>我创建的</span><b>{{ stats.personal.total_works }} 部</b>
        </p>
      </article>
      <article class="stat-card peach">
        <span>累计上传音频</span><strong>{{ stats.total_uploads }}<i> 段</i></strong>
        <p class="personal-stat">
          <span>我上传的</span><b>{{ stats.personal.total_uploads }} 段</b>
        </p>
      </article>
      <article class="stat-card cream">
        <span>贡献成员</span><strong>{{ stats.contributors }}<i> 位</i></strong>
        <p class="personal-stat">
          <span>我的上传占比</span><b>{{ personalShare }}%</b>
        </p>
      </article>
    </div>
    <section class="chart-panel">
      <div class="section-heading">
        <h2>上传量排行 · 前 10 名</h2>
        <select v-model="metric" aria-label="图表显示方式">
          <option value="bytes">上传量</option>
          <option value="share">占总贡献比例</option>
        </select>
      </div>
      <div v-if="!stats.leaders.length" class="empty-state"><h3>暂无贡献记录</h3></div>
      <div v-else class="contribution-chart" role="img" aria-label="成员累计上传量排行">
        <div
          v-for="(leader, index) in stats.leaders"
          :key="leader.id"
          class="chart-row"
          :title="`${leader.display_name}：${bytes(leader.size_upload)}`"
        >
          <span class="chart-rank">{{ String(index + 1).padStart(2, '0') }}</span
          ><span class="chart-name">{{ leader.display_name }}</span>
          <div class="chart-track">
            <div
              class="chart-bar"
              :style="{
                width: `${Math.max(1, (leader.size_upload / (metric === 'share' ? stats.total_bytes || 1 : stats.leaders[0]?.size_upload || 1)) * 100)}%`,
                animationDelay: `${index * 50}ms`,
              }"
            ></div>
          </div>
          <strong>{{
            metric === 'bytes'
              ? bytes(leader.size_upload)
              : `${((leader.size_upload / (stats.total_bytes || 1)) * 100).toFixed(1)}%`
          }}</strong>
        </div>
      </div>
    </section>
  </template>
  <div v-else class="empty-state">正在加载贡献统计…</div>
</template>

<style scoped>
.lilac {
  background: #eeebf5;
  color: #79688e;
}
.cream {
  background: #f4f1df;
  color: #8e7b36;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 5px 10px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.stat-card > span {
  font-size: 13px;
  color: #788575;
}
.stat-card strong {
  font-size: 32px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.personal-stat {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  grid-column: 1 / -1;
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
.personal-stat b {
  color: #405e4b;
  font-weight: 550;
  white-space: nowrap;
}
.stat-card strong i {
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
}
.chart-panel {
  margin-top: 14px;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.chart-panel select {
  width: 145px;
}
.chart-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 13px;
  font-size: 13px;
}
.chart-rank {
  width: 20px;
  color: #8b9a86;
  font-size: 12px;
}
.chart-name {
  width: 115px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #61765a;
}
.chart-track {
  flex: 1;
  height: 20px;
  overflow: hidden;
  border-radius: 3px;
  background: #f2f5ef;
}
.chart-bar {
  height: 100%;
  border-radius: 3px;
  background: #b9cfa4;
  transform-origin: left;
  animation: bar-in 0.4s both;
  transition: width 0.2s;
}
.chart-row:nth-child(2n) .chart-bar {
  background: #d5cce0;
}
.chart-row:nth-child(3n) .chart-bar {
  background: #dfc8aa;
}
.chart-row strong {
  width: 82px;
  color: #77866d;
  font-size: 13px;
  text-align: right;
  font-weight: 500;
}
@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-card strong {
    font-size: 26px;
  }
}
@media (max-width: 640px) {
  .stats-grid {
    gap: 8px;
  }
  .stat-card {
    padding: 10px;
    grid-template-columns: 1fr;
  }
  .stat-card strong {
    font-size: 26px;
  }
  .chart-panel {
    padding: 12px;
  }
  .chart-panel .section-heading {
    flex-wrap: wrap;
  }
  .chart-panel select {
    width: 145px;
  }
  .chart-row {
    gap: 7px;
  }
  .chart-name {
    width: 65px;
    font-size: 12px;
  }
  .chart-row strong {
    width: 65px;
    font-size: 12px;
  }
  .chart-rank {
    width: 15px;
    font-size: 12px;
  }
  .personal-stat {
    gap: 3px 6px;
    padding-top: 9px;
    font-size: 12px;
  }
}
</style>
