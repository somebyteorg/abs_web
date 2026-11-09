<script setup lang="ts">
import BaseDialog from '@/components/BaseDialog.vue'
import { useDraftGuardStore } from '@/stores/draftGuard'
import { usePlayerStore } from '@/stores/player'
import { useFeedback } from '@/composables/useFeedback'
defineProps<{ playerHeight: number }>()
const drafts = useDraftGuardStore()
const player = usePlayerStore()
const { message, tone } = useFeedback()
</script>

<template>
  <Transition name="toast"
    ><div
      v-if="message"
      :class="['toast-message', tone]"
      :style="player.track ? { bottom: `${playerHeight + 16}px` } : undefined"
      role="status"
    >
      {{ message }}<button aria-label="关闭提示" @click="message = ''">×</button>
    </div></Transition
  >
  <BaseDialog
    :model-value="drafts.open"
    title="离开当前页面？"
    @update:model-value="drafts.answer(false)"
    ><p class="notice-copy">{{ drafts.message }}</p>
    <template #footer
      ><button class="button secondary" @click="drafts.answer(false)">继续编辑</button
      ><button class="button primary" @click="drafts.answer(true)">放弃修改并离开</button></template
    ></BaseDialog
  >
</template>

<style scoped>
.notice-copy {
  white-space: pre-line;
  line-height: 2 !important;
}
.toast-message {
  position: fixed;
  bottom: 22px;
  left: 50%;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: max-content;
  max-width: min(600px, calc(100vw - 32px));
  padding: 10px 15px;
  border: 1px solid #cbdac0;
  border-radius: 7px;
  background: #f5faee;
  color: #5b7746;
  box-shadow: 0 5px 22px #263e3615;
  transform: translateX(-50%);
  font-size: 13px;
  line-height: 1.8;
}
.toast-message.error {
  border-color: #e4c9ac;
  background: #fff6ed;
  color: #a67a4c;
}
.toast-message button {
  color: inherit;
  background: transparent;
  font-size: 20px;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.15s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
