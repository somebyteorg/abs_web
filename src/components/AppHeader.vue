<script setup lang="ts">
import { ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useRouter } from 'vue-router'
import ProfileDialog from '@/components/ProfileDialog.vue'
import UploadNoticeDialog from '@/components/UploadNoticeDialog.vue'
import { useSignStore } from '@/stores/sign'
import { useUploadsStore } from '@/stores/uploads'
import { useFeedback } from '@/composables/useFeedback'
defineProps<{ absIconUrl: string }>()
const measuredHeight = defineModel<number>('height', { default: 68 })
const sign = useSignStore()
const uploads = useUploadsStore()
const router = useRouter()
const { fail } = useFeedback()
const noticeOpen = ref(false)
const profileOpen = ref(false)
const busy = ref(false)
const topbar = ref<HTMLElement>()
const { height } = useElementSize(topbar, { width: 0, height: 68 }, { box: 'border-box' })
watch(height, (value) => {
  measuredHeight.value = value
})
async function logout() {
  if (busy.value) return
  busy.value = true
  try {
    await sign.signOut()
    await router.push('/')
  } catch (error) {
    fail(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <header v-if="sign.user" ref="topbar" class="topbar">
    <RouterLink to="/" class="brand"
      ><img class="brand-mark" src="/favicon.svg" width="30" height="30" alt="" /><span
        >EMOS · 有声书</span
      ></RouterLink
    >
    <nav class="main-nav" aria-label="主要导航">
      <RouterLink
        to="/"
        :class="{ active: $route.path === '/' || $route.path.startsWith('/works/') }"
        >作品</RouterLink
      >
      <RouterLink to="/authors" :class="{ active: $route.path.startsWith('/authors') }"
        >作者</RouterLink
      >
      <RouterLink v-if="sign.canEditOthers" to="/libraries" active-class="active">分类</RouterLink>
      <RouterLink to="/history" active-class="active">记录</RouterLink>
      <RouterLink to="/contributions" active-class="active">贡献</RouterLink>
      <RouterLink to="/statistics" active-class="active">统计</RouterLink>
      <RouterLink v-if="sign.isAdmin" to="/members" active-class="active">成员</RouterLink>
    </nav>
    <div class="topbar-actions">
      <button v-if="uploads.queue.length" class="text-button" @click="uploads.open = true">
        {{ uploads.running ? '上传中' : '上传队列' }}
        {{ uploads.queue.filter((entry) => entry.status === 'done').length }}/{{
          uploads.queue.length
        }}<span v-if="uploads.issues" class="queue-issue-count">{{ uploads.issues }}</span></button
      ><button v-if="!sign.user.notice_accepted_at" class="text-button" @click="noticeOpen = true">
        上传须知</button
      ><a
        class="abs-site-link"
        href="/web"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="前往ABS"
        title="前往ABS"
        ><img :src="absIconUrl" width="22" height="22" alt="" /></a
      ><RouterLink to="/inbox" class="icon-button inbox-link" aria-label="站内信" title="站内信"
        ><svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
          <path d="m3 6 9 7 9-7" /></svg></RouterLink
      ><button class="account-button" @click="profileOpen = true">
        <img
          v-if="sign.user.avatar"
          :src="sign.user.avatar"
          alt=""
          referrerpolicy="no-referrer"
        /><span v-else class="avatar">{{ sign.user.display_name.slice(0, 1) }}</span
        ><span class="account-name">{{ sign.user.display_name }}</span></button
      ><button class="text-button muted" :disabled="busy" @click="logout">退出</button>
    </div>
  </header>

  <UploadNoticeDialog v-model="noticeOpen" />
  <ProfileDialog v-model="profileOpen" />
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  flex-shrink: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.brand-mark {
  display: block;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  object-fit: contain;
}
.abs-site-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 5px;
}
.abs-site-link:hover {
  background: #edf3ef;
}
.abs-site-link img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.inbox-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}
.inbox-link svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 30px;
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 68px;
  padding: 0 32px;
  border-bottom: 1px solid var(--line);
  background: #fff;
  box-shadow: 0 1px 8px #203e2b04;
}
.main-nav {
  min-width: 0;
  overflow-x: auto;
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: 4px;
}
.main-nav a {
  display: flex;
  align-items: center;
  position: relative;
  padding: 0 16px;
  color: #6c7b72;
  white-space: nowrap;
  font-size: 14px;
}
.main-nav a:hover {
  color: var(--green);
  background: #f7faf8;
}
.main-nav a.active {
  color: var(--green);
  font-weight: 600;
}
.main-nav a.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 13px;
  right: 13px;
  height: 2px;
  background: var(--green);
}
.topbar-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 17px;
  margin-left: auto;
}
.account-button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  color: #4e6457;
  background: transparent;
  font-size: 13px;
}
.account-name {
  max-width: 100px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.account-button img,
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}
.avatar {
  display: grid;
  place-items: center;
  background: #e9efe8;
  color: #678260;
  font-size: 12px;
}
@media (max-width: 1200px) {
  .topbar {
    gap: 14px;
    padding: 0 18px;
  }
  .main-nav a {
    padding: 0 11px;
  }
  .topbar-actions {
    gap: 12px;
  }
  .account-name {
    max-width: 65px;
  }
}
@media (max-width: 900px) {
  .topbar {
    flex-wrap: wrap;
    gap: 0 15px;
    padding-top: 10px;
  }
  .main-nav {
    order: 3;
    flex-basis: 100%;
    gap: 4px;
    overflow-x: auto;
    margin-top: 6px;
    min-height: 38px;
  }
  .main-nav a {
    padding: 0 12px;
  }
  .account-name {
    display: none;
  }
}
@media (max-width: 640px) {
  .topbar {
    padding-left: 12px;
    padding-right: 12px;
  }
  .topbar-actions {
    gap: 12px;
  }
  .topbar-actions .text-button {
    font-size: 12px;
  }
}
@media (max-width: 640px) {
  .brand {
    gap: 9px;
    font-size: 17px;
  }
  .brand-mark {
    width: 32px;
    height: 32px;
  }
}
</style>
