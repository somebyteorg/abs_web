import { computed, onScopeDispose, ref } from 'vue'
import { useObjectUrl } from '@vueuse/core'
import imageCompression from 'browser-image-compression'
import compressionLibraryUrl from 'browser-image-compression/dist/browser-image-compression.js?url'
import { validateCover } from '@/utils/files'
import { uploadCover } from '@/api/uploads'
import { useSignStore } from '@/stores/sign'

export function useCoverUpload() {
  const sign = useSignStore()
  const file = ref<File | null>(null)
  const preview = useObjectUrl(file)
  const fileId = ref<string | null>(null)
  const status = ref<'idle' | 'compressing' | 'uploading' | 'done' | 'error'>('idle')
  const progress = ref(0)
  const error = ref('')
  const busy = computed(() => status.value === 'compressing' || status.value === 'uploading')
  const ready = computed(() => !file.value || status.value === 'done')
  let controller: AbortController | undefined
  let version = 0
  let compressed: File | null = null
  function reset() {
    version++
    controller?.abort()
    file.value = null
    compressed = null
    fileId.value = null
    status.value = 'idle'
    progress.value = 0
    error.value = ''
  }
  async function send() {
    if (!file.value) return
    controller?.abort()
    const current = ++version
    const request = new AbortController()
    controller = request
    error.value = ''
    fileId.value = null
    progress.value = 0
    try {
      const config = sign.getContribution()
      if (!compressed) {
        status.value = 'compressing'
        const result = await imageCompression(file.value, {
          maxSizeMB: Math.min(config.cover_compression.max_size, config.max_cover_size) / 1024 ** 2,
          maxWidthOrHeight: config.cover_compression.max_dimension,
          initialQuality: config.cover_compression.initial_quality,
          useWebWorker: true,
          preserveExif: false,
          fileType: config.cover_compression.mime_type,
          signal: request.signal,
          libURL: new URL(compressionLibraryUrl, location.origin).href,
        })
        if (current !== version) return
        const extension = result.type === 'image/jpeg' ? 'jpg' : result.type.slice('image/'.length)
        compressed = new File(
          [result],
          `${file.value.name.replace(/\.[^.]+$/, '').slice(0, 240)}.${extension}`,
          { type: result.type, lastModified: file.value.lastModified },
        )
      }
      validateCover(compressed, config)
      status.value = 'uploading'
      const result = await uploadCover(
        compressed,
        sign.user!.id,
        (value) => {
          if (current === version) progress.value = value
        },
        request.signal,
      )
      if (current !== version) return
      if (!result.file_id) throw new Error('封面尚未上传完成，请重试。')
      fileId.value = result.file_id
      status.value = 'done'
    } catch (cause) {
      if (current === version && !request.signal.aborted) {
        status.value = 'error'
        error.value = cause instanceof Error ? cause.message : '封面上传失败，请重试。'
      }
    }
  }
  function choose(value: File) {
    validateCover(value, sign.getContribution())
    reset()
    file.value = value
    void send()
  }
  onScopeDispose(() => {
    version++
    controller?.abort()
  })
  const accept = computed(() => sign.coverAccept)
  return {
    accept,
    file,
    preview,
    fileId,
    status,
    progress,
    error,
    busy,
    ready,
    choose,
    retry: send,
    reset,
  }
}
