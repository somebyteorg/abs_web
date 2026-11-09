import { HTTPError } from 'ky'
import api from '@/utils/ky'
import { hashFile } from '@/utils/files'
import type { AudioResource, Paginated, UploadState, UploadResult } from '@/types'

export async function resumeUpload(id: string, signal?: AbortSignal) {
  try {
    return (await api.get(`uploads/${id}`, { signal }).json<{ data: UploadState }>()).data
  } catch (error) {
    if (error instanceof HTTPError && [404, 410].includes(error.response.status)) return undefined
    throw error
  }
}

export function findDuplicateAudio(sha256: string, page = 1, signal?: AbortSignal) {
  return api
    .post('uploads/duplicates', { signal, json: { sha256, page } })
    .json<Paginated<AudioResource>>()
}

export async function transferFile(
  state: UploadState,
  file: File,
  signal?: AbortSignal,
  progress?: (percent: number, merging: boolean) => void,
) {
  if (state.status === 'completed') {
    progress?.(100, false)
    return { file_id: state.file_id!, completed: true } as UploadResult
  }
  const received = new Set(state.received)
  const report = () =>
    progress?.(
      Math.round(
        ([...received].reduce(
          (total, index) =>
            total + Math.min(state.chunk_size, file.size - index * state.chunk_size),
          0,
        ) /
          file.size) *
          100,
      ),
      false,
    )
  report()
  for (let index = 0; index < state.chunk_count; index++) {
    if (received.has(index)) continue
    const form = new FormData()
    form.set(
      'chunk',
      file.slice(index * state.chunk_size, Math.min((index + 1) * state.chunk_size, file.size)),
      'chunk.bin',
    )
    await api.post(`uploads/${state.id}/chunks/${index}`, { body: form, signal, timeout: 120_000 })
    received.add(index)
    report()
  }
  progress?.(100, true)
  const result = await api
    .post(`uploads/${state.id}/complete`, { signal, timeout: 240_000 })
    .json<{ data: UploadResult }>()
  progress?.(100, false)
  return result.data
}

export async function uploadCover(
  file: File,
  userId: number,
  progress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  const hash = await hashFile(file, signal)
  const key = `emos-cover:${userId}:${hash}`
  const previous = localStorage.getItem(key)
  let state: UploadState | undefined
  if (previous) {
    state = await resumeUpload(previous, signal)
    if (!state) localStorage.removeItem(key)
  }
  if (!state) {
    state = (
      await api
        .post('uploads', {
          signal,
          json: {
            kind: 'cover',
            sha256: hash,
            file_name: file.name,
            file_size: file.size,
            season_number: 1,
            episode_number: 1,
          },
        })
        .json<{ data: UploadState }>()
    ).data
    localStorage.setItem(key, state.id)
  }
  const result = await transferFile(state, file, signal, (percent) => progress?.(percent))
  localStorage.removeItem(key)
  window.dispatchEvent(new Event('contribution-changed'))
  return result
}
