import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import api, { setApiUserId, setCsrfToken } from '@/utils/ky'
import { fileAccept } from '@/utils/files'
import type { ContributionConfig, User } from '@/types'

export const useSignStore = defineStore('sign', () => {
  const user = ref<User | null>(null)
  watch(
    () => user.value?.id,
    (id) => setApiUserId(id ?? null),
    { immediate: true, flush: 'sync' },
  )
  const contribution = ref<ContributionConfig | null>(null)
  const notice = computed(() => contribution.value?.notice ?? null)
  const audioAccept = computed(() => fileAccept(contribution.value?.audio_extensions ?? []))
  const coverAccept = computed(() => fileAccept(contribution.value?.cover_extensions ?? []))
  const ready = ref(false)
  const isSignedIn = computed(() => Boolean(user.value))
  const canContribute = computed(() => ['user', 'edit', 'admin'].includes(user.value?.role || ''))
  const canEditOthers = computed(() => ['edit', 'admin'].includes(user.value?.role || ''))
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function hydrate() {
    const result = await api
      .get('session')
      .json<{ user: User | null; contribution: ContributionConfig }>()
    const { csrf_token } = await api.get('csrf-token').json<{ csrf_token: string }>()
    user.value = result.user
    contribution.value = result.contribution
    setCsrfToken(csrf_token)
    ready.value = true
  }
  function getContribution() {
    if (!contribution.value) throw new Error('上传配置尚未加载，请刷新后重试。')
    return contribution.value
  }
  async function acceptNotice() {
    const result = await api
      .post('notice/accept', { json: { accepted: true, version: notice.value?.version } })
      .json<{ user: User }>()
    user.value = result.user
  }
  async function signOut() {
    await api.post('logout')
    user.value = null
    await hydrate()
  }
  return {
    user,
    contribution,
    notice,
    audioAccept,
    coverAccept,
    ready,
    isSignedIn,
    canContribute,
    canEditOthers,
    isAdmin,
    hydrate,
    getContribution,
    acceptNotice,
    signOut,
  }
})
export default useSignStore
