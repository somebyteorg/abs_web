import { ref } from 'vue'
const message = ref('')
const tone = ref<'success' | 'error'>('success')
let timer: ReturnType<typeof setTimeout> | undefined
export function useFeedback() {
  function notify(text: string, type: 'success' | 'error' = 'success') {
    clearTimeout(timer)
    message.value = text
    tone.value = type
    timer = setTimeout(
      () => {
        message.value = ''
      },
      type === 'error' ? 9000 : 4500,
    )
  }
  function fail(error: unknown) {
    notify(error instanceof Error ? error.message : '这次没完成，再试试吧。', 'error')
  }
  return { message, tone, notify, fail }
}
