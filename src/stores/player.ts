import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  StorageSerializers,
  useEventListener,
  useSessionStorage,
  useThrottleFn,
} from '@vueuse/core'
import type { AudioResource, Chapter, Work } from '@/types'

interface Track {
  resource_id: number
  file_id: string
  name: string
  work_id: number
  work_name: string
  chapter: string
  uploader: string
}

interface SavedPlayback {
  user_id: number
  track: Track
  position: number
  duration: number
  rate: number
  collapsed: boolean
}

export const usePlayerStore = defineStore('player', () => {
  const audio = shallowRef<HTMLAudioElement | null>(null)
  const track = shallowRef<Track | null>(null)
  const playing = ref(false)
  const loading = ref(false)
  const position = ref(0)
  const duration = ref(0)
  const rate = ref(1)
  const error = ref('')
  const collapsed = ref(false)
  const saved = useSessionStorage<SavedPlayback | null>('emos-abs-playback', null, {
    serializer: StorageSerializers.object,
  })
  const canSeek = computed(() => Number.isFinite(duration.value) && duration.value > 0)
  const active = computed(() => playing.value || loading.value)
  const session = 'mediaSession' in navigator ? navigator.mediaSession : null
  let attempt = 0
  let userId: number | null = null
  let pendingSeek: number | null = null

  function persist() {
    saved.value =
      userId && track.value
        ? {
            user_id: userId,
            track: track.value,
            position: position.value,
            duration: duration.value,
            rate: rate.value,
            collapsed: collapsed.value,
          }
        : null
  }
  const persistProgress = useThrottleFn(persist, 1000, true)
  watch(collapsed, persist)
  useEventListener(window, ['pagehide', 'beforeunload'], persist)

  function canPlay(filename: string) {
    const type = (
      {
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        m4b: 'audio/mp4',
        aac: 'audio/aac',
        flac: 'audio/flac',
        ogg: 'audio/ogg',
        opus: 'audio/ogg; codecs="opus"',
        wav: 'audio/wav',
        wma: 'audio/x-ms-wma',
        aiff: 'audio/aiff',
        aif: 'audio/aiff',
      } as Record<string, string>
    )[filename.split('.').pop()?.toLowerCase() || '']
    return Boolean(type && audio.value?.canPlayType(type))
  }
  function attach(element: HTMLAudioElement | null) {
    audio.value = element
  }
  function updateSession() {
    if (!session) return
    session.playbackState = !track.value ? 'none' : playing.value ? 'playing' : 'paused'
    if (session.setPositionState && canSeek.value) {
      try {
        session.setPositionState({
          duration: duration.value,
          playbackRate: rate.value,
          position: Math.min(duration.value, Math.max(0, position.value)),
        })
      } catch {
        /* Older browsers may only support metadata and actions. */
      }
    }
  }
  function pause() {
    attempt++
    audio.value?.pause()
    playing.value = false
    loading.value = false
    updateSession()
    persist()
  }
  function stop() {
    pause()
    track.value = null
    position.value = 0
    duration.value = 0
    error.value = ''
    pendingSeek = null
    saved.value = null
    audio.value?.removeAttribute('src')
    audio.value?.load()
    if (session) {
      session.metadata = null
      try {
        session.setPositionState?.()
      } catch {
        /* Optional browser capability. */
      }
    }
    updateSession()
  }
  function metadata() {
    if (session && track.value && 'MediaMetadata' in window) {
      session.metadata = new MediaMetadata({
        title: track.value.name,
        artist: track.value.uploader,
        album: track.value.work_name,
      })
    }
  }
  function setUser(id: number | null) {
    if (id === userId) return
    const previous = saved.value
    stop()
    userId = id
    if (
      !id ||
      previous?.user_id !== id ||
      !previous.track?.file_id ||
      !audio.value ||
      !canPlay(previous.track.name)
    )
      return
    track.value = previous.track
    position.value = Math.max(0, Number(previous.position) || 0)
    duration.value = Math.max(0, Number(previous.duration) || 0)
    rate.value = [0.75, 1, 1.25, 1.5, 1.75, 2].includes(previous.rate) ? previous.rate : 1
    collapsed.value = Boolean(previous.collapsed)
    pendingSeek = position.value
    audio.value.src = `/api/file/${id}/${previous.track.file_id}`
    audio.value.playbackRate = rate.value
    metadata()
    updateSession()
    persist()
  }
  function playbackError(message: string) {
    pause()
    error.value = message
  }
  async function resume() {
    const element = audio.value
    if (!element || !track.value) return
    const current = ++attempt
    error.value = ''
    loading.value = true
    if (canSeek.value && position.value >= duration.value - 0.1) seek(0)
    if (element.error) element.load()
    try {
      await element.play()
      if (attempt === current) {
        loading.value = false
        playing.value = !element.paused
        updateSession()
        persist()
      }
    } catch (cause) {
      if (attempt !== current) return
      loading.value = false
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      playbackError(
        cause instanceof DOMException && cause.name === 'NotAllowedError'
          ? '浏览器暂未允许播放，请再点击一次播放按钮。'
          : '音频暂时无法播放，请检查资源是否有效、浏览器是否支持该格式，以及登录是否过期。',
      )
    }
  }
  function toggle() {
    if (!track.value || !audio.value) return
    if (!audio.value.paused || loading.value) pause()
    else void resume()
  }
  function play(resource: AudioResource, work: Work, chapter: Chapter) {
    if (!canPlay(resource.name)) return
    if (track.value?.resource_id === resource.id) {
      toggle()
      return
    }
    if (!audio.value) return
    pause()
    track.value = {
      resource_id: resource.id,
      file_id: resource.file_id,
      name: resource.name,
      work_id: work.id,
      work_name: work.name,
      chapter: `S${chapter.season_number}E${chapter.episode_number} · ${chapter.title}`,
      uploader: resource.uploader.display_name,
    }
    position.value = 0
    duration.value = 0
    error.value = ''
    pendingSeek = null
    audio.value.src = `/api/file/${userId}/${resource.file_id}`
    audio.value.playbackRate = rate.value
    metadata()
    if (session?.metadata && work.cover_url)
      session.metadata.artwork = [{ src: new URL(work.cover_url, location.origin).href }]
    persist()
    // Keep play() in the click gesture so mobile browsers permit audio playback.
    void resume()
  }
  function seek(value: number) {
    if (!audio.value || !canSeek.value || !Number.isFinite(value)) return
    position.value = Math.min(duration.value, Math.max(0, value))
    if (audio.value.readyState >= HTMLMediaElement.HAVE_METADATA)
      audio.value.currentTime = position.value
    else pendingSeek = position.value
    updateSession()
    persist()
  }
  function skip(seconds: number) {
    seek(position.value + seconds)
  }
  function setRate(value: number) {
    if (![0.75, 1, 1.25, 1.5, 1.75, 2].includes(value)) return
    rate.value = value
    if (audio.value) audio.value.playbackRate = value
    updateSession()
    persist()
  }

  useEventListener(audio, 'play', () => {
    if (track.value) {
      playing.value = true
      updateSession()
      persist()
    }
  })
  useEventListener(audio, 'playing', () => {
    if (track.value) {
      playing.value = true
      loading.value = false
      updateSession()
    }
  })
  useEventListener(audio, 'waiting', () => {
    if (track.value && !audio.value?.paused) loading.value = true
  })
  useEventListener(audio, 'pause', () => {
    playing.value = false
    loading.value = false
    updateSession()
    persist()
  })
  useEventListener(audio, 'ended', () => {
    playing.value = false
    loading.value = false
    updateSession()
    persist()
  })
  useEventListener(audio, ['loadedmetadata', 'durationchange'], () => {
    if (!track.value) return
    duration.value = Number.isFinite(audio.value?.duration) ? audio.value!.duration : 0
    if (pendingSeek !== null && canSeek.value && audio.value) {
      position.value = Math.min(duration.value, pendingSeek)
      audio.value.currentTime = position.value
      pendingSeek = null
    }
    updateSession()
  })
  useEventListener(audio, 'timeupdate', () => {
    if (pendingSeek !== null) return
    position.value = audio.value?.currentTime || 0
    updateSession()
    void persistProgress()
  })
  useEventListener(audio, 'ratechange', () => {
    rate.value = audio.value?.playbackRate || 1
    updateSession()
  })
  useEventListener(audio, 'error', () => {
    if (track.value && audio.value?.error)
      playbackError(
        audio.value.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
          ? '当前浏览器不支持这份音频，或资源已不可用。'
          : '音频加载失败，请检查网络和登录状态后重试。',
      )
  })
  if (session) {
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => {
        void resume()
      },
      pause,
      stop,
      seekbackward: (details) => skip(-(details.seekOffset || 15)),
      seekforward: (details) => skip(details.seekOffset || 15),
      seekto: (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime)
      },
    }
    for (const [action, handler] of Object.entries(handlers)) {
      try {
        session.setActionHandler(action as MediaSessionAction, handler)
      } catch {
        /* Unsupported controls do not prevent normal playback. */
      }
    }
    onScopeDispose(() => {
      stop()
      for (const action of Object.keys(handlers)) {
        try {
          session.setActionHandler(action as MediaSessionAction, null)
        } catch {
          /* Unsupported action. */
        }
      }
    })
  } else onScopeDispose(stop)

  return {
    track,
    playing,
    loading,
    active,
    position,
    duration,
    rate,
    error,
    collapsed,
    canSeek,
    canPlay,
    attach,
    setUser,
    play,
    toggle,
    resume,
    pause,
    stop,
    seek,
    skip,
    setRate,
  }
})
