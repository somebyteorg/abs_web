<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import Pagination from '@/components/Pagination.vue'
import { useCollection } from '@/composables/useCollection'
import { useCoverUpload } from '@/composables/useCoverUpload'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { useFeedback } from '@/composables/useFeedback'
import type { Author, Library, Work, WorkInput } from '@/types'
const props = defineProps<{ id: string; libraries: Library[]; initial?: Work; busy: boolean }>()
const emit = defineEmits<{ save: [data: WorkInput] }>()
const form = reactive({
  name: props.initial?.name || '',
  tagline: props.initial?.tagline || '',
  description: props.initial?.description || '',
  type: props.initial?.type || 'book',
  abs_library_id:
    props.initial?.abs_library_id || props.libraries.find((l) => l.type === 'book')?.id || 0,
  date_air: props.initial?.date_air || '',
  is_adult: props.initial?.is_adult || false,
})
const selectedAuthors = ref<number[]>(props.initial?.authors?.map((author) => author.id) || [])
const authorQuery = ref('')
const authorSearch = ref('')
const authorPage = ref(1)
const {
  result: authorResults,
  loading: authorsLoading,
  error: authorsError,
  load: loadAuthors,
} = useCollection<Author>('authors', () => ({
  q: authorSearch.value,
  page: authorPage.value,
  page_size: 10,
}))
const authorPool = ref<Author[]>(props.initial?.authors || [])
const coverUpload = useCoverUpload()
const {
  accept: coverAccept,
  file: coverFile,
  preview: previewCover,
  status: coverStatus,
  progress: coverProgress,
  error: coverError,
} = coverUpload
const coverInput = ref<HTMLInputElement>()
const original = JSON.stringify([form, selectedAuthors.value])
useUnsavedChanges(
  () => Boolean(coverFile.value) || JSON.stringify([form, selectedAuthors.value]) !== original,
  '作品资料或封面尚未保存，离开后将丢失修改。',
)
const { fail } = useFeedback()
const pickedAuthors = computed(() =>
  authorPool.value.filter((author) => selectedAuthors.value.includes(author.id)),
)
watch(
  () => authorResults.value.items,
  (items) => {
    authorPool.value = [
      ...new Map(
        [
          ...authorPool.value.filter((author) => selectedAuthors.value.includes(author.id)),
          ...items,
        ].map((author) => [author.id, author]),
      ).values(),
    ]
  },
)
watchDebounced(
  authorQuery,
  (value) => {
    authorPage.value = 1
    authorSearch.value = value.trim()
  },
  { debounce: 300 },
)
function pickCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    try {
      coverUpload.choose(file)
    } catch (error) {
      fail(error)
    }
  }
  input.value = ''
}
const choices = computed(() => props.libraries.filter((l) => l.type === form.type))
watch(choices, (items) => {
  if (!items.some((library) => library.id === form.abs_library_id))
    form.abs_library_id = items[0]?.id || 0
})
function submit() {
  if (props.busy) return
  if (!coverUpload.ready.value) {
    fail(
      new Error(
        coverUpload.busy.value ? '请等待封面上传完成。' : '请重试封面上传，或撤回选择后保存。',
      ),
    )
    return
  }
  if (!form.abs_library_id || !form.name.trim()) {
    fail(new Error('请填写作品名称并选择分类。'))
    return
  }
  const data: WorkInput = {
    name: form.name.trim(),
    tagline: form.tagline.trim() || null,
    description: form.description.trim() || null,
    abs_library_id: Number(form.abs_library_id),
    date_air: form.date_air || null,
    is_adult: form.is_adult,
    author_ids: selectedAuthors.value,
  }
  if (!props.initial) data.type = form.type
  if (coverFile.value) data.cover_file_id = coverUpload.fileId.value
  emit('save', data)
}
</script>
<template>
  <form :id="id" @submit.prevent="submit">
    <fieldset class="work-form-grid" :disabled="busy">
      <div class="form-stack">
        <div class="cover-picker">
          <img
            v-if="previewCover || initial?.cover_url"
            :src="previewCover || initial?.cover_url || ''"
            alt="封面预览"
          /><span v-else class="cover-picker-placeholder">封面</span>
          <div>
            <button class="button secondary" type="button" @click="coverInput?.click()">
              {{ initial?.cover_url ? '更换封面' : '上传封面' }}
            </button>
            <p v-if="coverFile" class="hint">{{ coverFile.name }}</p>
            <p v-if="coverStatus === 'compressing'" class="hint">正在压缩封面…</p>
            <p v-if="coverStatus === 'uploading'" class="hint">正在上传 {{ coverProgress }}%</p>
            <p v-if="coverStatus === 'done'" class="hint">已上传，保存后使用</p>
            <p v-if="coverError" class="field-error">
              {{ coverError }}
              <button type="button" class="text-button" @click="coverUpload.retry">重试上传</button>
            </p>
            <button v-if="coverFile" class="text-button" type="button" @click="coverUpload.reset">
              撤回选择
            </button>
          </div>
          <input ref="coverInput" type="file" :accept="coverAccept" hidden @change="pickCover" />
        </div>
        <label
          >作品名称<input maxlength="120" v-model="form.name" required placeholder="填写作品名称"
        /></label>
        <label>副标题<input maxlength="200" v-model="form.tagline" placeholder="选填" /></label>
        <fieldset v-if="!initial" class="type-picker">
          <legend>作品类型 · 创建后固定</legend>
          <label><input v-model="form.type" type="radio" value="book" />有声书</label
          ><label><input v-model="form.type" type="radio" value="podcast" />播客</label>
        </fieldset>
        <div class="form-row">
          <label
            >分类<select v-model="form.abs_library_id" required>
              <option disabled :value="0">选择分类</option>
              <option v-for="library in choices" :key="library.id" :value="library.id">
                {{ library.name }}
              </option>
            </select></label
          ><label>首播日期<input v-model="form.date_air" type="date" /></label>
        </div>
        <p v-if="!choices.length" class="inline-note">
          还没有这个类型的分类，请编辑或管理员先到分类管理中创建。
        </p>
        <label class="checkbox"
          ><input v-model="form.is_adult" type="checkbox" />包含成人内容</label
        >
      </div>
      <div class="form-stack">
        <div class="author-picker">
          <label
            >作者<input maxlength="100" v-model="authorQuery" placeholder="搜索作者，可多选"
          /></label>
          <div v-if="pickedAuthors.length" class="selected-authors">
            <button
              v-for="author in pickedAuthors"
              :key="author.id"
              type="button"
              class="pill mint"
              :aria-label="`移除作者 ${author.name}`"
              @click="selectedAuthors = selectedAuthors.filter((id) => id !== author.id)"
            >
              {{ author.name }} ×
            </button>
          </div>
          <div class="author-options" :aria-busy="authorsLoading">
            <p v-if="authorsLoading" class="hint" role="status">正在找作者…</p>
            <p v-else-if="authorsError" class="field-error">
              {{ authorsError }}
              <button type="button" class="text-button" @click="loadAuthors">重试</button>
            </p>
            <template v-else>
              <label v-for="author in authorResults.items" :key="author.id" class="checkbox"
                ><input v-model="selectedAuthors" type="checkbox" :value="author.id" />{{
                  author.name
                }}</label
              >
              <p v-if="!authorResults.items.length" class="hint">
                没有找到作者，可在作者页面新建。
              </p>
            </template>
          </div>
          <Pagination
            v-if="authorResults.total > authorResults.page_size"
            :page="authorResults.page"
            :page-size="authorResults.page_size"
            :total="authorResults.total"
            :busy="authorsLoading"
            @change="authorPage = $event"
          />
        </div>
        <label
          >简介<textarea
            maxlength="10000"
            v-model="form.description"
            rows="5"
            placeholder="简介、版本、制作信息"
          />
        </label>
      </div>
    </fieldset>
  </form>
</template>

<style scoped>
.work-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 28px;
}
.type-picker {
  display: flex;
  gap: 24px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.type-picker legend {
  padding: 0 5px;
  color: #87967b;
  font-size: 12px;
}
.type-picker label {
  flex-direction: row;
  align-items: center;
  gap: 7px;
  font-weight: 400;
}
.author-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.selected-authors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.author-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 12px;
  max-height: 145px;
  padding: 8px 10px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 5px;
}
.author-options label {
  min-width: 0;
  overflow-wrap: anywhere;
}
@media (max-width: 640px) {
  .author-options {
    grid-template-columns: 1fr;
  }
  .work-form-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .work-form-grid .form-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
