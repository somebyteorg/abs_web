import { onScopeDispose, watchEffect, type MaybeRefOrGetter, toValue } from 'vue'
import { useDraftGuardStore } from '@/stores/draftGuard'

export function useUnsavedChanges(
  dirty: MaybeRefOrGetter<boolean>,
  message = '当前修改尚未保存，离开后将丢失。',
) {
  const guard = useDraftGuardStore()
  const key = Symbol()
  watchEffect(() => guard.set(key, toValue(dirty) ? message : null), { flush: 'sync' })
  onScopeDispose(() => guard.set(key, null))
}
