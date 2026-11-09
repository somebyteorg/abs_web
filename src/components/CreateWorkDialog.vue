<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseDialog from '@/components/BaseDialog.vue'
import WorkForm from '@/components/WorkForm.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useFeedback } from '@/composables/useFeedback'
import api from '@/utils/ky'
import type { Work, WorkInput } from '@/types'
const createOpen = defineModel<boolean>({ default: false })
const saving = ref(false)
const router = useRouter()
const catalog = useCatalogStore()
const { notify, fail } = useFeedback()
async function save(data: WorkInput) {
  if (saving.value) return
  saving.value = true
  try {
    const response = await api.post('works', { json: data }).json<{ data: Work }>()
    createOpen.value = false
    await nextTick()
    await router.push(`/works/${response.data.id}`)
    notify('作品已创建。')
  } catch (cause) {
    fail(cause)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseDialog v-model="createOpen" title="新建作品" wide :busy="saving"
    ><WorkForm
      v-if="createOpen"
      id="create-work-form"
      :libraries="catalog.libraries"
      :busy="saving"
      @save="save"
    /><template #footer
      ><div class="button-group">
        <button class="button secondary" :disabled="saving" @click="createOpen = false">取消</button
        ><button class="button primary" form="create-work-form" :disabled="saving">
          {{ saving ? '正在创建…' : '创建作品' }}
        </button>
      </div></template
    ></BaseDialog
  >
</template>
