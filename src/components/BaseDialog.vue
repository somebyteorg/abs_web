<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'
const open = defineModel<boolean>({ default: false })
const props = defineProps<{ title: string; wide?: boolean; workspace?: boolean; busy?: boolean }>()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
function close() {
  if (!props.busy) open.value = false
}
watch([open, dialog], async () => {
  await nextTick()
  if (open.value && dialog.value && !dialog.value.open) dialog.value.showModal()
  if (!open.value && dialog.value?.open) dialog.value.close()
})
</script>

<template>
  <dialog
    ref="dialog"
    closedby="closerequest"
    :class="['modal', { wide, workspace }]"
    :aria-labelledby="titleId"
    :aria-busy="busy || undefined"
    @close="open = false"
    @cancel.prevent="close"
  >
    <div class="modal-heading">
      <h2 :id="titleId">{{ title }}</h2>
      <button
        class="icon-button"
        type="button"
        :disabled="busy"
        aria-label="关闭弹窗"
        @click="close"
      >
        ×
      </button>
    </div>
    <div class="modal-body"><slot /></div>
    <footer v-if="$slots.footer" class="modal-footer"><slot name="footer" /></footer>
  </dialog>
</template>

<style scoped>
.modal {
  margin: auto;
  width: min(600px, calc(100vw - 40px));
  max-width: none;
  max-height: calc(100dvh - 48px);
  padding: 0;
  border: 1px solid #dce4da;
  border-radius: 14px;
  background: #fff;
  color: #2d3f2d;
  box-shadow: 0 15px 70px #172d2326;
  overflow: hidden;
}
.modal[open] {
  display: flex;
  flex-direction: column;
}
.modal.wide {
  width: min(1040px, calc(100vw - 40px));
}
.modal.workspace {
  width: min(1440px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
}
.modal::backdrop {
  background: #22372b66;
}
.modal-heading {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
}
.modal-heading h2 {
  font-size: 20px;
  font-weight: 600;
}
.modal-body {
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
.modal-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px 18px;
  padding: 16px 24px;
  border-top: 1px solid var(--line);
  background: #fafcfb;
}
.modal-footer > :deep(.hint) {
  margin-right: auto;
  font-size: 13px;
}
@media (max-width: 640px) {
  .modal {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px);
  }
  .modal.wide,
  .modal.workspace {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px);
  }
  .modal-heading,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }
  .modal-heading h2 {
    font-size: 19px;
  }
  .modal-footer {
    gap: 9px;
  }
  .modal-footer > :deep(.hint) {
    flex-basis: 100%;
  }
  .modal-footer > :deep(.button-group) {
    margin-left: auto;
  }
  .modal-footer :deep(.button) {
    padding-inline: 10px;
  }
}
</style>
