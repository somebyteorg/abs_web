import { onScopeDispose, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import api from '@/utils/ky'
import type { Paginated } from '@/types'

export function useCollection<T>(
  path: MaybeRefOrGetter<string>,
  parameters: () => Record<string, string | number | boolean | undefined>,
  enabled: () => boolean = () => true,
) {
  const result = shallowRef<Paginated<T>>({ page: 1, page_size: 24, total: 0, items: [] })
  const loading = ref(false)
  const error = ref('')
  let controller: AbortController | undefined
  async function load() {
    controller?.abort()
    if (!enabled()) {
      loading.value = false
      return
    }
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = ''
    const entries = Object.entries(parameters()).filter(
      ([, value]) => value !== undefined && value !== '',
    )
    try {
      const response = await api
        .get(toValue(path), {
          searchParams: Object.fromEntries(entries) as Record<string, string | number | boolean>,
          signal: current.signal,
        })
        .json<Paginated<T>>()
      if (!current.signal.aborted) result.value = response
    } catch (cause) {
      if (!current.signal.aborted)
        error.value = cause instanceof Error ? cause.message : '暂时没有加载成功。'
    } finally {
      if (!current.signal.aborted) loading.value = false
    }
  }
  watch(() => [toValue(path), parameters(), enabled()], load, { immediate: true, deep: true })
  onScopeDispose(() => controller?.abort())
  return { result, loading, error, load }
}
