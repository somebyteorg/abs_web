import { onMounted, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useSignStore } from '@/stores/sign'
import { usePlayerStore } from '@/stores/player'
import { useUploadsStore } from '@/stores/uploads'
import { useDraftGuardStore } from '@/stores/draftGuard'
import { useFeedback } from '@/composables/useFeedback'

export function useAppSession() {
  const sign = useSignStore()
  const player = usePlayerStore()
  const uploads = useUploadsStore()
  const drafts = useDraftGuardStore()
  const { notify, fail } = useFeedback()
  const bootError = ref('')
  async function boot() {
    bootError.value = ''
    try {
      await sign.hydrate()
    } catch (error) {
      bootError.value = error instanceof Error ? error.message : '有声书暂时没连上。'
    }
  }
  onMounted(boot)
  watch(
    () => [sign.ready, sign.user?.id] as const,
    ([ready, id]) => {
      if (ready) player.setUser(id ?? null)
    },
  )
  useEventListener(window, 'beforeunload', (event) => {
    if (drafts.dirty || uploads.unfinished) {
      event.preventDefault()
      event.returnValue = ''
    }
  })
  useEventListener(window, 'contribution-changed', () => {
    sign.hydrate().catch(fail)
  })
  useEventListener(window, 'session-expired', () => {
    sign.user = null
    notify('登录已过期，再回来一起共建吧。', 'error')
  })
  return { bootError, boot }
}
