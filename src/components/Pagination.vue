<script setup lang="ts">
import { computed, ref, watch } from 'vue'
const props = defineProps<{ page: number; pageSize: number; total: number; busy?: boolean }>()
const emit = defineEmits<{ change: [page: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const targetPage = ref(props.page)
watch(
  () => props.page,
  (value) => {
    targetPage.value = value
  },
)
function jump() {
  if (props.busy) return
  const value = Math.min(Math.max(1, Math.trunc(Number(targetPage.value)) || 1), pages.value)
  targetPage.value = value
  if (value !== props.page) emit('change', value)
}
</script>
<template>
  <nav v-if="total > 0" class="pagination" aria-label="分页">
    <span>共 {{ total }} 条 · {{ page }} / {{ pages }}</span>
    <div class="pagination-tools">
      <button
        type="button"
        class="button small secondary"
        :disabled="page <= 1 || busy"
        @click="$emit('change', page - 1)"
      >
        ← 上一页
      </button>
      <div v-if="pages > 2" class="pagination-jump">
        <label
          >第
          <input
            v-model.number="targetPage"
            type="number"
            min="1"
            :max="pages"
            :disabled="busy"
            aria-label="跳转页码"
            @keydown.enter.prevent="jump"
          />
          页</label
        ><button type="button" class="button small secondary" :disabled="busy" @click="jump">
          跳转
        </button>
      </div>
      <button
        type="button"
        class="button small secondary"
        :disabled="page >= pages || busy"
        @click="$emit('change', page + 1)"
      >
        下一页 →
      </button>
    </div>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
  color: #77867c;
  font-size: 13px;
}
.pagination-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.pagination-jump {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pagination-jump label {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  font-weight: 400;
}
.pagination-jump input {
  width: 58px !important;
  min-height: 28px !important;
  padding: 4px 6px !important;
  font-size: 13px !important;
}
@media (max-width: 640px) {
  .pagination-tools {
    width: 100%;
    justify-content: space-between;
  }
  .pagination-jump {
    gap: 5px;
  }
  .pagination-jump label {
    gap: 4px;
  }
  .pagination-jump input {
    width: 46px !important;
  }
}
</style>
