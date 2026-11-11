<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, type CSSProperties } from 'vue'
import { OcIcon } from '@opencloud-eu/design-system/components'
import ColumnChoices from './ColumnChoices.vue'
import type { OfficeContext } from '../app/context'
defineProps<{ context: OfficeContext }>()
const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const placement = ref<CSSProperties>({})
function close(restoreFocus = true) {
  open.value = false
  document.removeEventListener('click', outside, true)
  if (restoreFocus) trigger.value?.focus()
}
function outside(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) close(false)
}
async function toggle() {
  if (open.value) return close()
  open.value = true
  document.addEventListener('click', outside, true)
  await nextTick()
  const rect = trigger.value?.getBoundingClientRect()
  if (rect) {
    const below = window.innerHeight - rect.bottom - 16
    const above = rect.top - 16
    placement.value =
      below < 200 && above > below
        ? { top: 'auto', bottom: 'calc(100% + 0.4rem)', maxHeight: `${Math.min(512, above)}px` }
        : { maxHeight: `${Math.max(120, Math.min(512, below))}px` }
  }
  panel.value?.querySelector<HTMLInputElement>('input')?.focus()
}
onBeforeUnmount(() => close(false))
</script>
<template>
  <div ref="root" class="office-popover office-column-menu" @keydown.esc.stop.prevent="close()">
    <button
      ref="trigger"
      type="button"
      class="office-icon-button"
      aria-label="Choose columns"
      title="Columns"
      :aria-expanded="open"
      aria-controls="office-column-options"
      @click="toggle"
    >
      <OcIcon name="layout-column" fill-type="line" class="office-icon" />
    </button>
    <div
      v-if="open"
      id="office-column-options"
      ref="panel"
      class="office-popover-panel"
      :style="placement"
      role="group"
      aria-label="Columns"
    >
      <ColumnChoices :context="context" />
      <div class="office-popover-actions"><button type="button" @click="close()">Done</button></div>
    </div>
  </div>
</template>
