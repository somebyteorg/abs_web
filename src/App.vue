<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFeedback from '@/components/AppFeedback.vue'
import AppFooter from '@/components/AppFooter.vue'
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
  <div
    :class="['app-shell', { 'has-player': player.track, 'player-minimized': player.collapsed }]"
    :style="{
      '--topbar-height': `${topbarHeight || 68}px`,
      '--player-height': `${playerHeight || 100}px`,
    }"
  >
    <SignInScreen
      v-if="!sign.ready || !sign.user"
      :ready="sign.ready"
      :boot-error="bootError"
      :abs-icon-url="absIconUrl"
      :emos-icon-url="emosIconUrl"
      @retry="boot"
    />
    <template v-else>
      <AppHeader v-model:height="topbarHeight" :abs-icon-url="absIconUrl" />
      <main id="main-content" class="page-content">
        <RouterView v-slot="{ Component }"
          ><component :is="Component" :key="$route.path"
        /></RouterView>
      </main>
    </template>
    <AppFooter />
  </div>
  <AppFeedback :player-height="playerHeight" />
  <UploadQueueDialog />
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}
.app-shell.has-player:not(.player-minimized) {
  padding-bottom: calc(var(--player-height) + 12px);
}
.app-shell.has-player.player-minimized {
  padding-bottom: calc(var(--player-height) + 24px + env(safe-area-inset-bottom));
}
.page-content {
  flex: 1;
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
