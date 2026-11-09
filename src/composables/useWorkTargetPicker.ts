import { computed, nextTick, ref, watch, type Ref, type WatchSource } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { Work } from '@/types'

export function useWorkTargetPicker(
  targetWorks: Ref<Work[]>,
  targetWorkId: Ref<number>,
  resetOn: WatchSource[],
) {
  const targetPickerOpen = ref(false)
  const targetOption = ref(0)
  const selectedTargetWork = computed(() =>
    targetWorks.value.find((entry) => entry.id === targetWorkId.value),
  )
  function targetName(entry?: Work) {
    return entry ? `${entry.name} · ${entry.date_air?.slice(0, 4) || '年份未标注'}` : '选择目标作品'
  }
  function chooseTargetWork(workId: number) {
    targetWorkId.value = workId
    targetPickerOpen.value = false
  }
  async function scrollTargetOption() {
    await nextTick()
    document
      .getElementById(`target-work-option-${targetOption.value}`)
      ?.scrollIntoView({ block: 'nearest' })
  }
  function toggleTargetPicker() {
    targetPickerOpen.value = !targetPickerOpen.value
    targetOption.value = Math.max(
      0,
      targetWorks.value.findIndex((entry) => entry.id === targetWorkId.value),
    )
    if (targetPickerOpen.value) scrollTargetOption()
  }
  function targetPickerKey(event: KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Escape') {
      targetPickerOpen.value = false
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (targetPickerOpen.value && targetWorks.value[targetOption.value])
        chooseTargetWork(targetWorks.value[targetOption.value]!.id)
      else toggleTargetPicker()
      return
    }
    if (!targetPickerOpen.value) {
      toggleTargetPicker()
      return
    }
    targetOption.value =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? targetWorks.value.length - 1
          : Math.max(
              0,
              Math.min(
                targetWorks.value.length - 1,
                targetOption.value + (event.key === 'ArrowDown' ? 1 : -1),
              ),
            )
    scrollTargetOption()
  }
  watch(resetOn, () => {
    targetPickerOpen.value = false
  })
  useEventListener(document, 'click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('.work-target-picker'))
      targetPickerOpen.value = false
  })

  return {
    targetPickerOpen,
    targetOption,
    selectedTargetWork,
    targetName,
    chooseTargetWork,
    toggleTargetPicker,
    targetPickerKey,
  }
}
