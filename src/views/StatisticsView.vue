<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import dayjs from 'dayjs'
import BaseDialog from '@/components/BaseDialog.vue'
import { listeningDuration, useListeningStats } from '@/composables/useListeningStats'
import type { ListeningPeriod, TrendMetric } from '@/types/listening'

const trendContainer = useTemplateRef<HTMLElement>('trendContainer')
const {
  settings,
  data,
  loading,
  error,
  load,
  from,
  to,
  today,
  applyRange,
  rangeError,
  rangeLabel,
  bookShare,
  chart,
  metricNames,
  formatMetric,
  selectedPoint,
  highlightedPoint,
} = useListeningStats(trendContainer)
const customizeOpen = ref(false)
const gradientId = useId()
const periods: { value: ListeningPeriod; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '近 7 天' },
  { value: 'month', label: '近 30 天' },
  { value: 'year', label: '近一年' },
  { value: 'all', label: '全部' },
  { value: 'custom', label: '自选日期' },
]
const metricOptions = Object.entries(metricNames) as [TrendMetric, string][]
const xLabels = computed(() => {
  const points = chart.value.points
  const indices = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
  return indices.flatMap((index) => {
    const point = points[index]
    return point
      ? [
          {
            x: point.x,
            label: dayjs(point.date).format(data.value?.range.monthly ? 'YYYY.MM' : 'MM.DD'),
          },
        ]
      : []
  })
})
function pointAt(event: PointerEvent) {
  const bounds = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const x = ((event.clientX - bounds.left) / bounds.width) * chart.value.width
  selectedPoint.value = Math.max(
    0,
    Math.min(
      chart.value.points.length - 1,
      Math.round(((x - 36) / (chart.value.width - 56)) * (chart.value.points.length - 1)),
    ),
  )
}
function stepPoint(delta: number) {
  selectedPoint.value = Math.max(
    0,
    Math.min(
      chart.value.points.length - 1,
      (selectedPoint.value ?? chart.value.points.length - 1) + delta,
    ),
  )
}
function axisLabel(value: number) {
  if (settings.value.metric === 'seconds' || settings.value.metric === 'personal_seconds') {
    if (value >= 3600) return `${Number((value / 3600).toFixed(1))} 时`
    if (value >= 60) return `${Number((value / 60).toFixed(1))} 分`
    return `${Math.round(value)} 秒`
  }
  return Math.round(value).toLocaleString()
}
function barWidth(value: number, maximum: number) {
  return `${Math.max(1, (value / Math.max(1, maximum)) * 100)}%`
}
</script>

<template>
  <div class="statistics">
    <div class="page-heading statistics-heading">
      <div class="statistics-title">
        <span class="wave-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        <h1>统计</h1>
        <span v-if="data" class="updated-label"
          >{{ dayjs(data.updated_at).format('HH:mm:ss') }} 更新</span
        >
      </div>
      <div class="button-group">
        <button class="button secondary" @click="customizeOpen = true">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6m8 4v6" /></svg
          >自定义
        </button>
        <button class="button secondary" :disabled="loading" @click="load()">
          <svg :class="{ spinning: loading }" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7v5h-5M4 17v-5h5" />
            <path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></svg
          >{{ loading ? '更新中' : '刷新' }}
        </button>
      </div>
    </div>

    <div class="statistics-toolbar">
      <div class="filter-pills period-pills" role="group" aria-label="统计时间范围">
        <button
          v-for="period in periods"
          :key="period.value"
          class="filter-pill"
          :class="{ selected: settings.period === period.value }"
          :aria-pressed="settings.period === period.value"
          @click="settings.period = period.value"
        >
          {{ period.label }}
        </button>
      </div>
      <select v-model="settings.type" aria-label="统计内容类型" class="type-select">
        <option value="all">全部类型</option>
        <option value="book">有声书</option>
        <option value="podcast">播客</option>
      </select>
    </div>
    <form v-if="settings.period === 'custom'" class="custom-range" @submit.prevent="applyRange">
      <label>开始<input v-model="from" type="date" :max="to || today()" required /></label>
      <label>结束<input v-model="to" type="date" :min="from" :max="today()" required /></label>
      <button class="button primary" type="submit">查看这段时间</button>
      <p v-if="rangeError" class="error" role="alert">{{ rangeError }}</p>
    </form>
    <p v-if="error" class="error-panel" role="alert">
      {{ error }} <button class="text-button" :disabled="loading" @click="load()">重新连接</button
      ><span v-if="data"> · 当前保留上次成功更新的数据</span>
    </p>

    <template v-if="data">
      <div class="statistics-metrics">
        <article class="statistics-card featured-metric">
          <div class="metric-caption">
            <span>累计收听</span><span class="mini-wave" aria-hidden="true">▂▅▃▇▅▂</span>
          </div>
          <strong>{{ listeningDuration(data.summary.seconds) }}</strong>
          <p>
            我的收听 <b>{{ listeningDuration(data.summary.personal_seconds) }}</b>
          </p>
        </article>
        <article class="statistics-card metric-card">
          <span class="metric-caption">收听人数</span
          ><strong>{{ data.summary.listeners.toLocaleString() }}<small> 人</small></strong>
          <p>{{ data.summary.sessions.toLocaleString() }} 次收听会话</p>
        </article>
        <article class="statistics-card metric-card lavender-metric">
          <span class="metric-caption">被听见的作品</span
          ><strong>{{ data.summary.works.toLocaleString() }}<small> 部</small></strong>
          <p>{{ rangeLabel }}</p>
        </article>
        <article class="statistics-card metric-card live-metric">
          <span class="metric-caption"><span class="status-dot live"></span>最近在听</span
          ><strong>{{ data.summary.recent_listeners.toLocaleString() }}<small> 人</small></strong>
          <p>近 2 分钟有收听上报</p>
        </article>
      </div>

      <div class="trend-layout" :class="{ 'without-breakdown': !settings.showBreakdown }">
        <section class="statistics-card trend-card">
          <div class="panel-heading">
            <div>
              <h2>收听趋势</h2>
              <p>{{ data.range.monthly ? '按月汇总' : '按日汇总' }} · {{ rangeLabel }}</p>
            </div>
            <select v-model="settings.metric" aria-label="趋势图统计指标">
              <option v-for="[key, label] in metricOptions" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
          <div class="trend-readout" aria-live="off">
            <span>{{
              highlightedPoint
                ? dayjs(highlightedPoint.date).format(
                    data.range.monthly ? 'YYYY 年 MM 月' : 'MM 月 DD 日',
                  )
                : metricNames[settings.metric]
            }}</span
            ><b>{{ highlightedPoint ? formatMetric(highlightedPoint.value) : '移到图上看看' }}</b>
          </div>
          <div ref="trendContainer" class="trend-visual">
            <div v-if="!chart.hasValues" class="chart-empty">
              这段时间还没有{{ metricNames[settings.metric] }}记录
            </div>
            <svg
              v-else
              class="trend-chart"
              :viewBox="`0 0 ${chart.width} 245`"
              preserveAspectRatio="none"
              tabindex="0"
              role="group"
              :aria-label="`${metricNames[settings.metric]}趋势图，可使用左右方向键查看各时间点`"
              @pointermove="pointAt"
              @pointerleave="selectedPoint = null"
              @focus="stepPoint(0)"
              @blur="selectedPoint = null"
              @keydown.left.prevent="stepPoint(-1)"
              @keydown.right.prevent="stepPoint(1)"
            >
              <defs>
                <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#5fae91" stop-opacity="0.32" />
                  <stop offset="100%" stop-color="#5fae91" stop-opacity="0.01" />
                </linearGradient>
              </defs>
              <g v-for="(ratio, index) in [1, 0.5, 0]" :key="ratio" class="chart-grid">
                <line x1="36" :x2="chart.width - 20" :y1="37 + index * 84" :y2="37 + index * 84" />
                <text x="36" :y="27 + index * 84">{{ axisLabel(chart.maximum * ratio) }}</text>
              </g>
              <path :d="chart.area" :fill="`url(#${gradientId})`" />
              <path :d="chart.line" class="trend-line" />
              <circle
                v-if="chart.points.length === 1"
                :cx="chart.points[0]!.x"
                :cy="chart.points[0]!.y"
                r="5"
                class="trend-point"
              />
              <g v-if="highlightedPoint">
                <line
                  :x1="highlightedPoint.x"
                  :x2="highlightedPoint.x"
                  y1="34"
                  y2="205"
                  class="chart-guide"
                />
                <circle
                  :cx="highlightedPoint.x"
                  :cy="highlightedPoint.y"
                  r="6"
                  class="trend-point"
                />
              </g>
              <text
                v-for="(label, index) in xLabels"
                :key="index"
                :x="label.x"
                y="235"
                :text-anchor="
                  index === 0 ? 'start' : index === xLabels.length - 1 ? 'end' : 'middle'
                "
                class="chart-date"
              >
                {{ label.label }}
              </text>
            </svg>
          </div>
          <details class="chart-data">
            <summary>查看图表数据</summary>
            <div class="table-scroll">
              <table class="data-table">
                <caption class="sr-only">
                  按日期统计的收听数据
                </caption>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>收听时长</th>
                    <th>人数</th>
                    <th>会话</th>
                    <th>我的收听</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in data.trend" :key="row.date">
                    <td>{{ row.date }}</td>
                    <td>{{ listeningDuration(row.seconds) }}</td>
                    <td>{{ row.listeners }}</td>
                    <td>{{ row.sessions }}</td>
                    <td>{{ listeningDuration(row.personal_seconds) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section v-if="settings.showBreakdown" class="statistics-card breakdown-card">
          <div class="panel-heading">
            <h2>听什么</h2>
            <span class="pill gray">按时长</span>
          </div>
          <div
            class="listening-ring"
            :style="{
              background: data.summary.seconds
                ? `conic-gradient(#397961 0% ${bookShare}%, #baa7da ${bookShare}% 100%)`
                : '#edf1ef',
            }"
            role="img"
            :aria-label="`有声书占 ${bookShare.toFixed(1)}%，播客占 ${(data.summary.seconds ? 100 - bookShare : 0).toFixed(1)}%`"
          >
            <div>
              <strong
                >{{ data.summary.seconds ? bookShare.toFixed(0) : '0' }}<small>%</small></strong
              ><span>有声书</span>
            </div>
          </div>
          <div class="ring-legend">
            <span><i></i>有声书</span><b>{{ listeningDuration(data.breakdown.book) }}</b>
          </div>
          <div class="ring-legend podcast-legend">
            <span><i></i>播客</span><b>{{ listeningDuration(data.breakdown.podcast) }}</b>
          </div>
        </section>
      </div>

      <section v-if="settings.showRecent" class="statistics-card recent-panel">
        <div class="panel-heading">
          <h2><span class="status-dot live"></span>最近在听</h2>
          <span class="hint">有上报的会话可能已暂停</span>
        </div>
        <div v-if="!data.recent.length" class="quiet-state">这会儿还没有新的收听上报。</div>
        <div v-else class="recent-grid">
          <article v-for="session in data.recent" :key="session.key" class="recent-session">
            <div class="listener-avatar">
              <img
                v-if="session.listener.avatar"
                :src="session.listener.avatar"
                alt=""
                referrerpolicy="no-referrer"
              /><span v-else>{{ session.listener.name.slice(0, 1) }}</span>
            </div>
            <div class="recent-copy">
              <strong :title="session.listener.name">{{ session.listener.name }}</strong
              ><RouterLink
                v-if="session.work.id"
                :to="`/works/${session.work.id}`"
                :title="session.work.name"
                >{{ session.work.name }}</RouterLink
              ><span v-else :title="session.work.name">{{ session.work.name }}</span>
              <div
                class="session-progress"
                :aria-label="`播放进度 ${(session.progress * 100).toFixed(0)}%`"
              >
                <i :style="{ width: `${session.progress * 100}%` }"></i>
              </div>
            </div>
            <span class="session-time">{{ dayjs(session.updated_at).format('HH:mm:ss') }}</span>
          </article>
        </div>
      </section>

      <div class="ranking-layout">
        <section class="statistics-card ranking-panel listener-ranking">
          <div class="panel-heading">
            <h2>听众榜</h2>
            <span class="ranking-tag">TOP {{ settings.limit }}</span>
          </div>
          <div v-if="!data.listeners.length" class="quiet-state">
            还没有听众上榜，等一段声音被听见。
          </div>
          <ol v-else class="rank-list">
            <li
              v-for="(listener, index) in data.listeners"
              :key="listener.key"
              class="person-row"
              :class="{ 'first-place': index === 0 }"
            >
              <span class="rank-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <div class="listener-avatar">
                <img
                  v-if="listener.avatar"
                  :src="listener.avatar"
                  alt=""
                  referrerpolicy="no-referrer"
                  loading="lazy"
                /><span v-else>{{ listener.name.slice(0, 1) }}</span>
              </div>
              <div class="rank-copy">
                <div class="rank-line">
                  <strong :title="listener.name">{{ listener.name }}</strong
                  ><b>{{ listeningDuration(listener.seconds) }}</b>
                </div>
                <div class="rank-track">
                  <i
                    :style="{ width: barWidth(listener.seconds, data.listeners[0]?.seconds ?? 0) }"
                  ></i>
                </div>
                <span>{{ listener.sessions }} 次收听会话</span>
              </div>
            </li>
          </ol>
        </section>

        <section class="statistics-card ranking-panel popular-ranking">
          <div class="panel-heading">
            <h2>热门作品</h2>
            <select v-model="settings.sort" aria-label="热门作品排序">
              <option value="seconds">按收听时长</option>
              <option value="listeners">按收听人数</option>
            </select>
          </div>
          <div v-if="!data.popular.length" class="quiet-state">这段时间还没有作品上榜。</div>
          <ol v-else class="rank-list">
            <li
              v-for="(work, index) in data.popular"
              :key="work.key"
              class="work-rank-row"
              :class="{ 'first-place': index === 0 }"
            >
              <span class="rank-number">{{ String(index + 1).padStart(2, '0') }}</span
              ><component
                :is="work.id ? 'RouterLink' : 'div'"
                :to="work.id ? `/works/${work.id}` : undefined"
                :class="['rank-cover', `cover-tone-${index % 5}`]"
                :aria-label="work.name"
                ><img v-if="work.cover_url" :src="work.cover_url" alt="" loading="lazy" /><span
                  v-else
                  >{{ work.name.slice(0, 2) }}</span
                ></component
              >
              <div class="rank-copy">
                <RouterLink
                  v-if="work.id"
                  :to="`/works/${work.id}`"
                  class="rank-work-name"
                  :title="work.name"
                  >{{ work.name }}</RouterLink
                ><strong v-else class="rank-work-name" :title="work.name">{{ work.name }}</strong>
                <p class="work-rank-meta">
                  {{ work.type === 'book' ? '有声书' : '播客'
                  }}<span v-if="work.year"> · {{ work.year }}</span
                  ><span v-if="work.unavailable"> · 已下架 / 未关联</span>
                </p>
                <div class="rank-track">
                  <i
                    :style="{
                      width: barWidth(work[settings.sort], data.popular[0]?.[settings.sort] ?? 0),
                    }"
                  ></i>
                </div>
                <div class="work-rank-values">
                  <b>{{ listeningDuration(work.seconds) }}</b
                  ><span>{{ work.listeners }} 人收听</span>
                </div>
              </div>
            </li>
          </ol>
        </section>
      </div>

      <section v-if="settings.showUploaders" class="statistics-card uploader-panel">
        <div class="panel-heading">
          <div>
            <h2>共建热度榜</h2>
            <p>上传者参与的作品，被听见了多久</p>
          </div>
          <span class="ranking-tag">TOP {{ settings.limit }}</span>
        </div>
        <p class="uploader-method">
          按当前主资源的上传者汇总参与作品的收听时长；多人共建作品分别计入，代表作品热度，非个人音轨实际收听时长。
        </p>
        <div v-if="!data.uploaders.length" class="quiet-state">
          还没有能关联到上传者的收听作品。
        </div>
        <ol v-else class="uploader-grid">
          <li v-for="(uploader, index) in data.uploaders" :key="uploader.key" class="uploader-row">
            <span class="rank-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="rank-copy">
              <div class="rank-line">
                <strong :title="uploader.name">{{ uploader.name }}</strong
                ><b>{{ listeningDuration(uploader.seconds) }}</b>
              </div>
              <div class="rank-track">
                <i
                  :style="{ width: barWidth(uploader.seconds, data.uploaders[0]?.seconds ?? 0) }"
                ></i>
              </div>
              <span>参与 {{ uploader.works }} 部上榜作品</span>
            </div>
          </li>
        </ol>
      </section>
    </template>
    <div v-else-if="loading" class="statistics-loading" role="status">
      <div v-for="index in 4" :key="index" class="skeleton-card"></div>
      <span>正在汇集收听数据…</span>
    </div>
    <div v-else-if="!error" class="empty-state">选好日期，查看这段时间的收听统计。</div>

    <BaseDialog v-model="customizeOpen" title="自定义统计">
      <div class="customize-fields">
        <label
          >排行榜人数<select v-model.number="settings.limit">
            <option :value="5">前 5 名</option>
            <option :value="10">前 10 名</option>
            <option :value="20">前 20 名</option>
          </select></label
        ><label
          >趋势图默认指标<select v-model="settings.metric">
            <option v-for="[key, label] in metricOptions" :key="key" :value="key">
              {{ label }}
            </option>
          </select></label
        >
        <fieldset>
          <legend>显示内容</legend>
          <label><input v-model="settings.showRecent" type="checkbox" />最近在听</label
          ><label><input v-model="settings.showBreakdown" type="checkbox" />收听类型分布</label
          ><label><input v-model="settings.showUploaders" type="checkbox" />共建热度榜</label>
        </fieldset>
        <p class="hint">展示偏好会保存在当前浏览器。</p>
      </div>
      <template #footer
        ><button class="button primary" @click="customizeOpen = false">就这样</button></template
      >
    </BaseDialog>
  </div>
</template>

<style scoped>
.statistics {
  --statistics-green: #397961;
  --statistics-purple: #aa93c5;
}
.statistics-title {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  flex-wrap: wrap;
}
.statistics-title h1 {
  margin: 0;
}
.wave-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: #e3eee8;
  color: var(--statistics-green);
}
.wave-mark i {
  width: 3px;
  height: 12px;
  border-radius: 3px;
  background: currentColor;
  animation: wave 2s ease-in-out infinite alternate;
}
.wave-mark i:nth-child(2n) {
  height: 23px;
  animation-delay: -0.6s;
}
.wave-mark i:nth-child(3) {
  height: 29px;
  animation-delay: -1.2s;
}
.updated-label {
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.statistics-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
.period-pills {
  max-width: 100%;
  overflow-x: auto;
}
.type-select {
  width: 135px;
}
.status-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #aab6ae;
}
.status-dot.live {
  background: #65a57b;
  box-shadow: 0 0 0 4px #65a57b14;
}
.custom-range {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: white;
}
.custom-range label {
  display: grid;
  gap: 5px;
  color: var(--muted);
  font-size: 12px;
}
.custom-range p {
  flex-basis: 100%;
  font-size: 13px;
}
.statistics > .error-panel {
  margin-bottom: 18px;
}
.statistics-metrics {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.statistics-card {
  min-width: 0;
  border: 1px solid #dce6e0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 14px #254a3303;
}
.featured-metric,
.metric-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  padding: 23px;
}
.featured-metric {
  border-color: #265844;
  color: #fff;
  background: radial-gradient(ellipse at right top, #46795d 0, transparent 70%), #214e3c;
}
.metric-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #657b6e;
  font-size: 13px;
}
.featured-metric .metric-caption {
  color: #c9e0d1;
}
.mini-wave {
  font-size: 19px;
  line-height: 1;
  color: #a4d3b6;
  letter-spacing: 2px;
}
.statistics-metrics strong {
  font-size: clamp(23px, 2.3vw, 34px);
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.statistics-metrics strong small {
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0;
}
.statistics-metrics p {
  color: var(--muted);
  font-size: 12px;
}
.featured-metric p {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  color: #b6d2c2;
}
.featured-metric p b {
  font-weight: 500;
  color: #edf8f2;
}
.lavender-metric {
  background: linear-gradient(130deg, #fff, #f6f2fa);
}
.live-metric {
  background: linear-gradient(130deg, #fff, #f1f7f2);
}
.live-metric .metric-caption {
  justify-content: flex-start;
}
.trend-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 285px;
  gap: 20px;
  margin-bottom: 20px;
}
.trend-layout.without-breakdown {
  grid-template-columns: minmax(0, 1fr);
}
.trend-card,
.breakdown-card,
.ranking-panel,
.recent-panel,
.uploader-panel {
  padding: 23px;
}
.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.panel-heading h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
}
.panel-heading p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}
.panel-heading select {
  width: 140px;
  min-height: 34px;
  padding-block: 6px;
  font-size: 13px;
}
.trend-readout {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  margin-bottom: 2px;
  font-size: 12px;
  color: var(--muted);
}
.trend-readout b {
  color: var(--statistics-green);
  font-weight: 550;
}
.trend-chart {
  display: block;
  width: 100%;
  height: 245px;
  overflow: visible;
  outline-offset: 0;
}
.trend-line {
  fill: none;
  stroke: #43896c;
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.chart-grid line {
  stroke: #e4ece7;
  stroke-dasharray: 4 5;
}
.chart-grid text,
.chart-date {
  fill: #84958b;
  font-size: 12px;
}
.chart-guide {
  stroke: #8ea99b;
  stroke-dasharray: 4 4;
}
.trend-point {
  fill: #fff;
  stroke: #43896c;
  stroke-width: 3;
}
.chart-empty {
  display: grid;
  place-items: center;
  height: 245px;
  color: #87988c;
  font-size: 13px;
  background: repeating-linear-gradient(to bottom, transparent 0 81px, #edf1ee 82px 83px);
}
.chart-data {
  margin-top: 10px;
  color: var(--muted);
  font-size: 12px;
}
.chart-data summary {
  cursor: pointer;
  width: fit-content;
}
.chart-data .table-scroll {
  max-height: 320px;
  margin-top: 10px;
}
.chart-data .data-table {
  min-width: 480px;
}
.breakdown-card {
  display: flex;
  flex-direction: column;
}
.listening-ring {
  display: grid;
  place-items: center;
  width: 168px;
  height: 168px;
  flex-shrink: 0;
  margin: 12px auto 25px;
  border-radius: 50%;
  transform: rotate(-30deg);
}
.listening-ring > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 138px;
  height: 138px;
  border-radius: 50%;
  background: #fff;
  transform: rotate(30deg);
}
.listening-ring strong {
  font-size: 35px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
}
.listening-ring small {
  font-size: 15px;
  font-weight: 500;
}
.listening-ring span {
  font-size: 12px;
  color: var(--muted);
}
.ring-legend {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 0;
  border-top: 1px solid #edf1ee;
  font-size: 12px;
}
.ring-legend > span {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  white-space: nowrap;
}
.ring-legend i {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: var(--statistics-green);
}
.podcast-legend i {
  background: #baa7da;
}
.ring-legend b {
  font-weight: 500;
  text-align: right;
}
.recent-panel,
.uploader-panel {
  margin-bottom: 20px;
}
.recent-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.recent-session {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px;
  border: 1px solid #e6ede7;
  border-radius: 10px;
  background: #f9fbf9;
}
.listener-avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #e7efe8;
  color: #65896e;
  font-size: 13px;
  overflow: hidden;
}
.listener-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.recent-copy {
  flex: 1;
  min-width: 0;
}
.recent-copy strong,
.recent-copy > a,
.recent-copy > span {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
}
.recent-copy strong {
  font-weight: 550;
}
.recent-copy > a,
.recent-copy > span {
  color: var(--muted);
  font-size: 12px;
}
.recent-copy > a:hover {
  color: var(--statistics-green);
}
.session-progress {
  margin-top: 7px;
  height: 3px;
  border-radius: 3px;
  background: #e2eae4;
  overflow: hidden;
}
.session-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #8cb69b;
  transition: width 0.5s;
}
.session-time {
  color: #8b9a90;
  font-size: 10px;
  align-self: flex-start;
  font-variant-numeric: tabular-nums;
}
.ranking-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}
.ranking-tag {
  padding: 4px 8px;
  border-radius: 5px;
  background: #f0f4f1;
  color: #7c9285;
  font-size: 11px;
  letter-spacing: 1px;
  white-space: nowrap;
}
.rank-list,
.uploader-grid {
  list-style: none;
  padding: 0;
  margin: 0;
}
.person-row,
.work-rank-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px 0;
  border-bottom: 1px solid #edf1ee;
}
.person-row:last-child,
.work-rank-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.rank-number {
  flex-shrink: 0;
  width: 22px;
  color: #9aa99e;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
.first-place .rank-number {
  color: #ae8a40;
  font-size: 17px;
  font-weight: 650;
}
.rank-copy {
  flex: 1;
  min-width: 0;
}
.rank-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.rank-line strong {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 550;
}
.rank-line b,
.work-rank-values b {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
}
.rank-copy > span {
  display: block;
  margin-top: 5px;
  color: #86958a;
  font-size: 11px;
}
.rank-track {
  height: 5px;
  margin-top: 9px;
  overflow: hidden;
  border-radius: 5px;
  background: #f0f4f1;
}
.rank-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #9dc4ab, #4f9575);
  transform-origin: left;
  animation: bar-in 0.6s both;
  transition: width 0.5s;
}
.rank-cover {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 43px;
  height: 57px;
  border-radius: 6px;
  overflow: hidden;
}
.rank-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rank-cover span {
  padding: 6px;
  font-size: 12px;
  text-align: center;
}
.rank-work-name {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 550;
}
a.rank-work-name:hover {
  color: var(--statistics-green);
}
.work-rank-meta {
  color: #86958a;
  font-size: 11px;
  margin-top: 2px;
}
.popular-ranking .rank-track i {
  background: linear-gradient(90deg, #d4c7e3, #a590bf);
}
.work-rank-values {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
}
.work-rank-values > span {
  color: #86958a;
  font-size: 11px;
  white-space: nowrap;
}
.uploader-method {
  margin: -4px 0 18px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.8;
}
.uploader-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 35px;
}
.uploader-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.uploader-panel .rank-track i {
  background: linear-gradient(90deg, #e2d0af, #c4a268);
}
.quiet-state {
  display: grid;
  place-items: center;
  min-height: 110px;
  color: #85958a;
  font-size: 13px;
  text-align: center;
}
.recent-panel .quiet-state {
  min-height: 56px;
}
.statistics-loading {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.skeleton-card {
  height: 152px;
  border-radius: 16px;
  background: linear-gradient(100deg, #e7ede9, #f4f7f4, #e7ede9);
  background-size: 200% 100%;
  animation: skeleton 1.5s linear infinite;
}
.statistics-loading > span {
  grid-column: 1 / -1;
  color: var(--muted);
  text-align: center;
  padding: 50px 0;
  font-size: 13px;
}
.spinning {
  animation: spin 1s linear infinite;
}
.customize-fields {
  display: grid;
  gap: 20px;
}
.customize-fields > label {
  display: grid;
  gap: 7px;
  font-size: 14px;
}
.customize-fields fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
}
.customize-fields legend {
  margin-bottom: 10px;
  font-size: 14px;
}
.customize-fields fieldset label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}
.customize-fields input {
  accent-color: var(--statistics-green);
}
@keyframes wave {
  to {
    transform: scaleY(0.55);
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes skeleton {
  to {
    background-position: -200% 0;
  }
}
@media (max-width: 1100px) {
  .statistics-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .trend-layout {
    grid-template-columns: minmax(0, 1fr) 235px;
  }
  .recent-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .statistics-metrics strong {
    font-size: 30px;
  }
}
@media (max-width: 760px) {
  .trend-layout,
  .ranking-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .breakdown-card {
    display: grid;
    grid-template-columns: 140px minmax(0, 1fr);
    align-items: center;
    gap: 0 20px;
  }
  .breakdown-card .panel-heading {
    grid-column: 1 / -1;
  }
  .listening-ring {
    grid-row: span 2;
    width: 125px;
    height: 125px;
    margin: 0;
  }
  .listening-ring > div {
    width: 103px;
    height: 103px;
  }
  .ring-legend {
    min-width: 0;
    flex-wrap: wrap;
  }
  .uploader-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 640px) {
  .statistics-heading {
    gap: 14px;
  }
  .statistics-title {
    gap: 9px;
  }
  .updated-label {
    font-size: 11px;
  }
  .statistics-toolbar {
    gap: 10px;
  }
  .period-pills {
    flex-basis: 100%;
  }
  .period-pills .filter-pill {
    padding: 7px 10px;
    font-size: 12px;
  }
  .type-select {
    width: 145px;
  }
  .statistics-metrics {
    gap: 10px;
  }
  .featured-metric,
  .metric-card {
    padding: 16px;
    gap: 14px;
  }
  .statistics-metrics strong {
    font-size: 24px;
  }
  .statistics-metrics p,
  .metric-caption {
    font-size: 11px;
  }
  .mini-wave {
    display: none;
  }
  .trend-card,
  .breakdown-card,
  .ranking-panel,
  .recent-panel,
  .uploader-panel {
    padding: 17px;
  }
  .panel-heading h2 {
    font-size: 16px;
  }
  .panel-heading select {
    width: 128px;
  }
  .panel-heading p {
    font-size: 11px;
  }
  .trend-chart {
    height: 195px;
  }
  .chart-empty {
    height: 195px;
  }
  .recent-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .recent-panel .panel-heading {
    align-items: center;
    flex-wrap: wrap;
  }
  .recent-panel .hint {
    font-size: 11px;
  }
  .person-row,
  .work-rank-row {
    gap: 10px;
  }
  .rank-line {
    gap: 8px;
  }
  .rank-line strong,
  .rank-work-name {
    font-size: 13px;
  }
  .rank-line b,
  .work-rank-values b {
    font-size: 12px;
  }
  .custom-range label {
    flex: 1;
    min-width: 125px;
  }
  .statistics-loading {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
