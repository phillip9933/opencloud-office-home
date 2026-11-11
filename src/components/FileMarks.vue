<script setup lang="ts">
import { computed } from 'vue'
import type { FileRecord } from '../contracts/office'

// Small status marks; each has a visible symbol and a text alternative, never color alone.
const props = defineProps<{ file: FileRecord }>()
const marks = computed(() => [
  ...(props.file.favorite ? [{ key: 'favorite', symbol: '★', label: 'Favorite' }] : []),
  ...(props.file.shared ? [{ key: 'shared', symbol: '⇄', label: 'Shared' }] : []),
  ...(props.file.lock
    ? [
        {
          key: 'lock',
          symbol: '✎',
          label: props.file.lock.owner
            ? `Locked by ${props.file.lock.owner}, possibly being edited`
            : 'Locked, possibly being edited'
        }
      ]
    : [])
])
</script>

<template>
  <span v-if="marks.length" class="office-marks">
    <span
      v-for="mark in marks"
      :key="mark.key"
      class="office-mark"
      :data-mark="mark.key"
      :title="mark.label"
    >
      <span aria-hidden="true">{{ mark.symbol }}</span>
      <span class="office-visually-hidden">{{ mark.label }}</span>
    </span>
  </span>
</template>
