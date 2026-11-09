<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import { useSignStore } from '@/stores/sign'
import { useFeedback } from '@/composables/useFeedback'
const noticeOpen = defineModel<boolean>({ default: false })
const sign = useSignStore()
const { notify, fail } = useFeedback()
const agreed = ref(false)
const busy = ref(false)
watch(noticeOpen, (open) => {
  if (open) agreed.value = false
})
async function accept() {
  if (busy.value) return
  busy.value = true
  try {
    await sign.acceptNotice()
    noticeOpen.value = false
    notify('欢迎加入，去添一点好声音吧！')
  } catch (error) {
    fail(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseDialog v-model="noticeOpen" title="上传须知" :busy="busy">
    <div v-if="sign.notice" class="form-stack">
      <p class="notice-copy">{{ sign.notice.text }}</p>
      <label v-if="!sign.user?.notice_accepted_at" class="checkbox"
        ><input
          v-model="agreed"
          type="checkbox"
          :disabled="busy"
        />我已阅读，愿意一起维护有声书资源</label
      >
    </div>
    <template #footer
      ><button class="button secondary" :disabled="busy" @click="noticeOpen = false">关闭</button
      ><button
        v-if="sign.notice && !sign.user?.notice_accepted_at"
        class="button primary"
        :disabled="!agreed || busy"
        @click="accept"
      >
        {{ busy ? '正在保存…' : sign.canContribute ? '同意上传须知' : '同意并加入共建' }}
      </button></template
    >
  </BaseDialog>
</template>

<style scoped>
.notice-copy {
  white-space: pre-line;
  line-height: 2 !important;
}
</style>
