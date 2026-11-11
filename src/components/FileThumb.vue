<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import FamilyIcon from './FamilyIcon.vue'
import type { FileRef, OfficeKind, OfficeServices, Preview } from '../contracts/office'

// Shows an authorized preview when the service provides one, otherwise a format card.
const props = defineProps<{
  services: OfficeServices
  kind: OfficeKind
  source?: FileRef
  label: string
}>()
const preview = ref<Preview>()
let abort: AbortController | undefined

function release() {
  abort?.abort()
  preview.value?.release()
  preview.value = undefined
}
watch(
  () => props.source && JSON.stringify([props.source.spaceId, props.source.itemId]),
  async () => {
    release()
    if (!props.source) return
    const controller = new AbortController()
    abort = controller
    const result = await props.services.preview(props.source, controller.signal)
    if (controller.signal.aborted) {
      if (result.ok) result.value.release()
      return
    }
    if (result.ok) preview.value = result.value
  },
  { immediate: true }
)
onBeforeUnmount(release)
</script>

<template>
  <span class="office-thumb" :data-kind="kind">
    <img v-if="preview" :src="preview.url" alt="" @error="release" />
    <span v-else class="office-thumb-fallback">
      <FamilyIcon :kind="kind" />
      <span class="office-thumb-label">{{ label }}</span>
    </span>
  </span>
</template>
