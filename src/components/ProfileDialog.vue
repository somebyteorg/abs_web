<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import { useSignStore } from '@/stores/sign'
import { useFeedback } from '@/composables/useFeedback'
import api from '@/utils/ky'
import type { User } from '@/types'
const profileOpen = defineModel<boolean>({ default: false })
const sign = useSignStore()
const { notify, fail } = useFeedback()
const pseudonym = ref('')
const adultMode = ref(false)
const busy = ref(false)
watch(profileOpen, (open) => {
  if (!open) return
  pseudonym.value = sign.user?.pseudonym || ''
  adultMode.value = Boolean(sign.user?.adult_mode)
})
async function saveProfile() {
  if (busy.value) return
  busy.value = true
  try {
    sign.user = (
      await api
        .patch('profile', {
          json: { pseudonym: pseudonym.value.trim() || null, adult_mode: adultMode.value },
        })
        .json<{ user: User }>()
    ).user
    profileOpen.value = false
    notify('个人资料已保存。')
  } catch (error) {
    fail(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseDialog v-model="profileOpen" title="个人资料" :busy="busy"
    ><form id="profile-form" class="form-stack" @submit.prevent="saveProfile">
      <label
        >公开化名<input
          maxlength="30"
          v-model="pseudonym"
          :disabled="busy"
          placeholder="留空时使用 EMOS 用户名"
      /></label>
      <div class="profile-preference">
        <label class="checkbox"
          ><input
            v-model="adultMode"
            type="checkbox"
            role="switch"
            :aria-checked="adultMode"
            :disabled="busy"
            aria-describedby="adult-mode-tip"
          />成人模式</label
        >
        <p id="adult-mode-tip" class="hint">
          仅影响当前管理界面；听书服务器的成人内容显示，请前往主站设置。
        </p>
      </div>
    </form>
    <template #footer
      ><button class="button secondary" :disabled="busy" @click="profileOpen = false">取消</button
      ><button class="button primary" form="profile-form" :disabled="busy">
        {{ busy ? '正在保存…' : '保存资料' }}
      </button></template
    ></BaseDialog
  >
</template>

<style scoped>
.profile-preference {
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.profile-preference .hint {
  margin-top: 7px;
  line-height: 1.7;
}
</style>
