<script setup lang="ts">
import { ref } from 'vue'
import Pagination from '@/components/Pagination.vue'
import { useCollection } from '@/composables/useCollection'
import { useFeedback } from '@/composables/useFeedback'
import api from '@/utils/ky'
import { date } from '@/utils/format'
import type { Message } from '@/types'
const page = ref(1)
const reading = ref<number | null>(null)
const { fail } = useFeedback()
const { result, loading, error, load } = useCollection<Message>('inbox', () => ({
  page: page.value,
}))
async function read(message: Message) {
  reading.value = message.id
  try {
    await api.patch(`inbox/${message.id}/read`)
    message.read_at = new Date().toISOString()
  } catch (cause) {
    fail(cause)
  } finally {
    reading.value = null
  }
}
</script>
<template>
  <div class="page-title"><h1>站内信</h1></div>
  <p v-if="error" class="error-panel">
    {{ error }} <button class="text-button" @click="load">重试</button>
  </p>
  <div v-else-if="loading" class="empty-state">正在打开信箱…</div>
  <div v-else-if="!result.items.length" class="empty-state"><h3>暂无消息</h3></div>
  <div v-else class="message-list">
    <article
      v-for="item in result.items"
      :key="item.id"
      :class="['message-card', { unread: !item.read_at }]"
    >
      <div class="message-meta">
        <span :class="['pill', item.read_at ? 'gray' : 'mint']">{{
          item.read_at ? '已读' : '新消息'
        }}</span
        ><time>{{ date(item.created_at, true) }}</time>
      </div>
      <p>{{ item.message }}</p>
      <div class="button-group">
        <RouterLink v-if="item.work_id" :to="`/works/${item.work_id}`" class="text-button"
          >去作品页看看 ↗</RouterLink
        ><button
          v-if="!item.read_at"
          class="text-button"
          :disabled="reading === item.id"
          @click="read(item)"
        >
          我知道啦
        </button>
      </div>
    </article>
  </div>
  <Pagination
    :page="result.page"
    :page-size="result.page_size"
    :total="result.total"
    :busy="loading"
    @change="page = $event"
  />
</template>

<style scoped>
.message-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.message-card {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.message-card.unread {
  border-color: #c9dbc8;
  background: #fcfef9;
}
.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.message-meta time {
  color: #84907e;
  font-size: 12px;
}
.message-card p {
  margin: 9px 0;
  color: #5d7059;
  font-size: 14px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.message-card .button-group {
  gap: 20px;
}
</style>
