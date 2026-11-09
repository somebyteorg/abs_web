import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/utils/ky'
import type { Library } from '@/types'
export const useCatalogStore = defineStore('catalog', () => {
  const libraries = ref<Library[]>([])
  async function load() {
    libraries.value = (await api.get('libraries').json<{ data: Library[] }>()).data
  }
  return { libraries, load }
})
