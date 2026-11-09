import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { useElementSize, useStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import api from '@/utils/ky'
import { useSignStore } from '@/stores/sign'
import type { ListeningPeriod, ListeningStats, TrendMetric } from '@/types/listening'
import type { MediaType } from '@/types'

dayjs.extend(utc)
dayjs.extend(timezone)

export function listeningDuration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds))
  if (value < 60) return `${value} 秒`
  if (value < 3600) return `${Math.floor(value / 60)} 分 ${value % 60} 秒`
  return `${Math.floor(value / 3600).toLocaleString()} 时 ${Math.floor((value % 3600) / 60)} 分`
}

export function useListeningStats(chartElement: Readonly<Ref<HTMLElement | null>>) {
  const sign = useSignStore()
  const { width: measuredWidth } = useElementSize(chartElement)
  const settings = useStorage('emos-abs-statistics-v1', {
    period: 'week' as ListeningPeriod,
    type: 'all' as MediaType | 'all',
    sort: 'seconds' as 'seconds' | 'listeners',
    limit: 10,
    metric: 'seconds' as TrendMetric,
    showRecent: true,
    showUploaders: true,
    showBreakdown: true,
  })
  const today = () => dayjs().tz('Asia/Hong_Kong').format('YYYY-MM-DD')
  const from = ref(dayjs(today()).subtract(6, 'day').format('YYYY-MM-DD'))
  const to = ref(today())
  const customRange = ref<{ from: string; to: string } | null>(null)
  const rangeError = ref('')
  const data = shallowRef<ListeningStats>()
  const loading = ref(false)
  const error = ref('')
  let controller: AbortController | undefined
  const metricNames: Record<TrendMetric, string> = {
    seconds: '收听时长',
    listeners: '收听人数',
    sessions: '收听会话',
    personal_seconds: '我的收听',
  }
  const rangeLabel = computed(() =>
    data.value
      ? `${dayjs(data.value.range.from).format('YYYY.MM.DD')} — ${dayjs(data.value.range.to).format('YYYY.MM.DD')}`
      : '',
  )
  const bookShare = computed(() =>
    data.value?.summary.seconds
      ? (data.value.breakdown.book / data.value.summary.seconds) * 100
      : 0,
  )
  const chart = computed(() => {
    const width = Math.max(280, measuredWidth.value || 900)
    const rows = data.value?.trend ?? []
    const maximum = Math.max(1, ...rows.map((row) => row[settings.value.metric]))
    const points = rows.map((row, index) => ({
      ...row,
      x: rows.length === 1 ? width / 2 : 36 + (index / (rows.length - 1)) * (width - 56),
      y: 205 - (row[settings.value.metric] / maximum) * 168,
      value: row[settings.value.metric],
    }))
    const line = points
      .map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`)
      .join(' ')
    return {
      width,
      points,
      line,
      area: points.length ? `${line} L ${points.at(-1)!.x} 205 L ${points[0]!.x} 205 Z` : '',
      maximum,
      hasValues: points.some((point) => point.value > 0),
    }
  })
  const selectedPoint = ref<number | null>(null)
  const highlightedPoint = computed(() =>
    selectedPoint.value === null ? null : (chart.value.points[selectedPoint.value] ?? null),
  )
  function formatMetric(value: number) {
    return settings.value.metric === 'seconds' || settings.value.metric === 'personal_seconds'
      ? listeningDuration(value)
      : `${value.toLocaleString()} ${settings.value.metric === 'listeners' ? '人' : '次'}`
  }
  async function load() {
    controller?.abort()
    if (!sign.user || (settings.value.period === 'custom' && !customRange.value)) {
      loading.value = false
      error.value = ''
      return
    }
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = ''
    try {
      const response = await api
        .get('listening-stats', {
          signal: current.signal,
          searchParams: {
            period: settings.value.period,
            type: settings.value.type,
            sort: settings.value.sort,
            limit: settings.value.limit,
            ...(settings.value.period === 'custom' ? customRange.value! : {}),
          },
        })
        .json<ListeningStats>()
      if (!current.signal.aborted) data.value = response
    } catch (cause) {
      if (!current.signal.aborted)
        error.value = cause instanceof Error ? cause.message : '收听统计暂时没连上。'
    } finally {
      if (!current.signal.aborted) loading.value = false
    }
  }
  function applyRange() {
    rangeError.value = ''
    if (!from.value || !to.value || from.value > to.value || to.value > today()) {
      rangeError.value = '选一个完整的日期范围，结束日期不能晚于今天。'
      return
    }
    if (dayjs(to.value).diff(dayjs(from.value), 'day') > 365) {
      rangeError.value = '自选日期最多查看 366 天。'
      return
    }
    customRange.value = { from: from.value, to: to.value }
  }
  watch(
    () => [
      settings.value.period,
      settings.value.type,
      settings.value.sort,
      settings.value.limit,
      customRange.value,
      sign.user?.id,
      sign.user?.adult_mode,
    ],
    () => {
      selectedPoint.value = null
      data.value = undefined
      void load()
    },
    { immediate: true },
  )
  watch(
    () => settings.value.metric,
    () => (selectedPoint.value = null),
  )
  onScopeDispose(() => controller?.abort())
  return {
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
  }
}
