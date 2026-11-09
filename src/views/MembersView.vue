<script setup lang="ts">
import { ref } from 'vue'
import Pagination from '@/components/Pagination.vue'
import { useSignStore } from '@/stores/sign'
import { useCollection } from '@/composables/useCollection'
import { useFeedback } from '@/composables/useFeedback'
import { bytes } from '@/utils/format'
import api from '@/utils/ky'
import type { Role, User } from '@/types'
const sign = useSignStore()
const { fail, notify } = useFeedback()
const page = ref(1)
const search = ref('')
const query = ref('')
const saving = ref<number | null>(null)
const { result, loading, error, load } = useCollection<User>('users', () => ({
  q: query.value,
  page: page.value,
}))
async function update(user: User, event: Event) {
  const element = event.target as HTMLSelectElement
  const next = (element.value || null) as Role
  const previous = user.role
  saving.value = user.id
  try {
    const response = await api
      .patch(`users/${user.id}/role`, { json: { role: next } })
      .json<{ data: User }>()
    Object.assign(user, response.data)
    notify('成员权限已更新。')
  } catch (cause) {
    element.value = previous || ''
    fail(cause)
  } finally {
    saving.value = null
  }
}
function searchMembers() {
  page.value = 1
  query.value = search.value.trim()
}
</script>
<template>
  <div class="page-title"><h1>成员管理</h1></div>
  <div v-if="!sign.isAdmin" class="empty-state">这里需要管理员权限。</div>
  <template v-else
    ><form class="search-field member-search" @submit.prevent="searchMembers">
      <input
        maxlength="100"
        v-model="search"
        aria-label="搜索成员"
        placeholder="用用户名或化名找一位成员…"
      /><button aria-label="搜索成员">⌕</button>
    </form>
    <p v-if="error" class="error-panel">
      {{ error }} <button class="text-button" @click="load">重试</button>
    </p>
    <div v-else-if="loading" class="empty-state">正在找成员…</div>
    <div v-else-if="!result.items.length" class="empty-state">没有找到这位成员。</div>
    <div v-else class="members-table">
      <div v-for="member in result.items" :key="member.id" class="member-row">
        <span class="activity-avatar">{{ member.display_name.slice(0, 1) }}</span>
        <div>
          <strong>{{ member.display_name }}</strong>
          <p class="hint">@{{ member.username }} · #{{ member.id }}</p>
        </div>
        <span class="member-size">{{ bytes(member.size_upload) }}</span
        ><select
          :value="member.role || ''"
          :disabled="member.id === sign.user?.id || saving === member.id"
          :aria-label="`调整 ${member.display_name} 的角色`"
          @change="update(member, $event)"
        >
          <option value="">仅浏览</option>
          <option value="user">共建成员</option>
          <option value="edit">编辑</option>
          <option value="admin">管理员</option>
        </select>
      </div>
    </div>
    <Pagination
      :page="result.page"
      :page-size="result.page_size"
      :total="result.total"
      :busy="loading"
      @change="page = $event"
  /></template>
</template>

<style scoped>
.members-table {
  padding: 0 18px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}
.member-row:last-child {
  border: 0;
}
.member-row strong {
  font-size: 14px;
  font-weight: 550;
}
.member-row select {
  width: 130px;
}
.member-size {
  margin-left: auto;
  margin-right: 10px;
  color: #778772;
  font-size: 13px;
}
@media (max-width: 640px) {
  .member-row {
    flex-wrap: wrap;
    gap: 9px;
  }
  .member-size {
    margin-right: 0;
  }
  .member-row select {
    width: 100%;
    margin-left: 37px;
  }
}
</style>
