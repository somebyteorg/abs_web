<script setup lang="ts">
import BaseDialog from '@/components/BaseDialog.vue'
import { useUploadsStore } from '@/stores/uploads'
import { useFeedback } from '@/composables/useFeedback'
import { bytes } from '@/utils/format'
const uploads = useUploadsStore()
const { fail } = useFeedback()
</script>

<template>
  <BaseDialog v-model="uploads.open" title="上传队列" wide>
    <p class="hint">切换站内页面会继续上传；刷新或关闭网页会中断，请保留此页面。</p>
    <div class="upload-queue global-upload-queue">
      <article v-for="entry in uploads.queue" :key="entry.id" class="queue-item">
        <div class="queue-file">
          <RouterLink
            :to="`/works/${entry.workId}`"
            class="title-link"
            @click="uploads.open = false"
            >{{ entry.workName }}</RouterLink
          ><strong>{{ entry.relativeName }}</strong
          ><span
            >S{{ entry.season }}E{{ entry.episode }} · {{ entry.title }} ·
            {{ bytes(entry.file.size) }}</span
          >
        </div>
        <p class="hint">
          {{
            entry.message ||
            (entry.status === 'ready' ? '待上传' : entry.status === 'done' ? '已完成' : '处理中')
          }}
          <template v-if="['uploading', 'checking', 'merging'].includes(entry.status)"
            >{{ entry.progress }}%</template
          >
        </p>
        <div v-if="entry.status === 'duplicate'" class="duplicate-matches">
          <strong>找到 {{ entry.matchTotal }} 处相同音频</strong>
          <div v-for="match in entry.matches" :key="match.id" class="duplicate-match">
            <div>
              <RouterLink
                :to="`/works/${match.abs_list_id}`"
                class="title-link"
                @click="uploads.open = false"
                >{{ match.work?.name || '已删除作品' }}</RouterLink
              >
              <p>
                S{{ match.chapter?.season_number }}E{{ match.chapter?.episode_number }} ·
                {{ match.chapter?.title }} · {{ match.uploader.display_name }} 上传
              </p>
              <p>{{ match.name }}</p>
            </div>
            <button
              class="button secondary small"
              :disabled="uploads.running"
              @click="uploads.reference(entry, match.id)"
            >
              确认引用此音频
            </button>
          </div>
          <button
            v-if="entry.matches.length < entry.matchTotal"
            class="text-button"
            @click="uploads.duplicates(entry, entry.matchPage + 1).catch(fail)"
          >
            查看更多位置</button
          ><button class="text-button" :disabled="uploads.running" @click="uploads.skip(entry)">
            跳过此文件
          </button>
        </div>
        <div v-if="!uploads.running" class="row-actions">
          <RouterLink
            :to="{ path: `/works/${entry.workId}`, query: { upload: '1' } }"
            class="text-button"
            @click="uploads.open = false"
            >调整上传目标</RouterLink
          ><button class="text-button" @click="uploads.remove(entry.id)">移出</button>
        </div>
      </article>
    </div>
    <template #footer
      ><span class="hint">待传 {{ uploads.pending }} · 需处理 {{ uploads.issues }}</span>
      <div class="button-group">
        <button class="button secondary" @click="uploads.open = false">关闭队列</button
        ><button v-if="uploads.running" class="button primary" @click="uploads.pause">
          暂停上传</button
        ><button
          v-else
          class="button primary"
          :disabled="!uploads.pending"
          @click="uploads.start()"
        >
          继续 / 重试上传
        </button>
      </div></template
    >
  </BaseDialog>
</template>

<style scoped>
.global-upload-queue .queue-item {
  display: block;
}
.global-upload-queue .queue-file {
  margin-bottom: 8px;
}
.global-upload-queue .row-actions {
  margin-top: 8px;
}
</style>
