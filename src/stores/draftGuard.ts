import { computed, ref, shallowReactive, watch } from 'vue'
import { defineStore } from 'pinia'

export const useDraftGuardStore = defineStore('draft-guard', () => {
  const drafts = shallowReactive(new Map<symbol, string>())
  const open = ref(false)
  const message = computed(() => [...new Set(drafts.values())].join('\n'))
  const dirty = computed(() => drafts.size > 0)
  let resolve: ((leave: boolean) => void) | undefined
  function set(key: symbol, value: string | null) {
    if (value) drafts.set(key, value)
    else drafts.delete(key)
  }
  function confirm() {
    if (!dirty.value) return Promise.resolve(true)
    if (resolve) return Promise.resolve(false)
    open.value = true
    return new Promise<boolean>((answer) => {
      resolve = answer
    })
  }
  function answer(leave: boolean) {
    const pending = resolve
    resolve = undefined
    open.value = false
    pending?.(leave)
  }
  watch(open, (value) => {
    if (!value && resolve) answer(false)
  })
  return { open, message, dirty, set, confirm, answer }
})
