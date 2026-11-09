<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFeedback from '@/components/AppFeedback.vue'
import AudioPlayer from '@/components/AudioPlayer.vue'
import SignInScreen from '@/components/SignInScreen.vue'
import UploadQueueDialog from '@/components/UploadQueueDialog.vue'
import { useAppSession } from '@/composables/useAppSession'
import { useSignStore } from '@/stores/sign'
import { usePlayerStore } from '@/stores/player'
const sign = useSignStore()
const player = usePlayerStore()
const { bootError, boot } = useAppSession()
const topbarHeight = ref(68)
const playerHeight = ref(0)
const absIconUrl = '/web/icon.svg'
const emosIconUrl = 'https://files.emos.best/files/base/logo/logo_1.jpg'
</script>

<template>
  <AudioPlayer v-model:height="playerHeight" />
  <SignInScreen
    v-if="!sign.ready || !sign.user"
    :ready="sign.ready"
    :boot-error="bootError"
    :abs-icon-url="absIconUrl"
    :emos-icon-url="emosIconUrl"
    @retry="boot"
  />
  <div
    v-else
    :class="['app-shell', { 'has-player': player.track, 'player-minimized': player.collapsed }]"
    :style="{
      '--topbar-height': `${topbarHeight || 68}px`,
      '--player-height': `${playerHeight || 100}px`,
    }"
  >
    <AppHeader v-model:height="topbarHeight" :abs-icon-url="absIconUrl" />
    <main id="main-content" class="page-content">
      <RouterView v-slot="{ Component }"
        ><component :is="Component" :key="$route.path"
      /></RouterView>
    </main>
  </div>
  <AppFeedback :player-height="playerHeight" />
  <UploadQueueDialog />
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
}
.app-shell.has-player:not(.player-minimized) {
  padding-bottom: calc(var(--player-height) + 12px);
}
.page-content {
  width: 100%;
  max-width: 1840px;
  margin: 0 auto;
  padding: 26px 32px 36px;
}
@media (max-width: 1200px) {
  .page-content {
    padding: 24px;
  }
}
@media (max-width: 900px) {
  .page-content {
    padding: 20px;
  }
}
@media (max-width: 640px) {
  .page-content {
    padding: 18px 16px 24px;
  }
}
</style>
