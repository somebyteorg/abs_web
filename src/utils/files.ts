import { createSHA256 } from 'hash-wasm'
import { bytes } from '@/utils/format'
import type { ContributionConfig } from '@/types'

export function fileAccept(extensions: readonly string[]) {
  return extensions.map((extension) => `.${extension}`).join(',')
}
function extension(file: File) {
  return file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
}
export function isAudioFile(file: File, extensions: readonly string[]) {
  return extensions.includes(extension(file))
}

export function validateCover(file: File, config: ContributionConfig) {
  if (!config.cover_extensions.includes(extension(file)))
    throw new Error(
      `封面支持 ${config.cover_extensions.map((value) => value.toUpperCase()).join('、')}。`,
    )
  if (file.size === 0) throw new Error('封面文件不能为空。')
  if (file.size > config.max_cover_size)
    throw new Error(`封面最大 ${bytes(config.max_cover_size)}。`)
}

export async function hashFile(
  file: File,
  signal?: AbortSignal,
  progress?: (percent: number) => void,
) {
  const hasher = await createSHA256()
  hasher.init()
  const size = 2 * 1024 * 1024
  for (let offset = 0; offset < file.size; offset += size) {
    signal?.throwIfAborted()
    hasher.update(new Uint8Array(await file.slice(offset, offset + size).arrayBuffer()))
    progress?.(Math.min(100, Math.round(((offset + size) / file.size) * 100)))
  }
  return hasher.digest('hex')
}
