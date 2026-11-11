<script setup lang="ts">
import FileThumb from './FileThumb.vue'
import type { OfficeKind, OfficeServices, Template } from '../contracts/office'

defineProps<{
  template: Template
  kind: OfficeKind
  services: OfficeServices
  disabled: boolean
  pinned: boolean
}>()
const emit = defineEmits<{ start: [opener: HTMLElement]; pin: [] }>()
</script>

<template>
  <div class="office-template-card">
    <button
      type="button"
      class="office-card"
      :disabled="disabled"
      @click="emit('start', $event.currentTarget as HTMLElement)"
    >
      <FileThumb
        :services="services"
        :kind="kind"
        :source="template.preview ?? template.source"
        :label="template.format.extension.toUpperCase()"
      />
      <span class="office-card-name">{{ template.name }}</span>
    </button>
    <button
      type="button"
      class="office-pin"
      :aria-pressed="pinned"
      :aria-label="`Pin ${template.name} to the top`"
      :title="pinned ? 'Unpin from the top' : 'Pin to the top'"
      @click="emit('pin')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M15 3l6 6-3 1-3.5 3.5L15 18l-2 2-4-4-5 5-1-1 5-5-4-4 2-2 4.5.5L14 6z"
          :fill="pinned ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>
