<script setup lang="ts">
import { computed } from 'vue'
import { OcIcon } from '@opencloud-eu/design-system/components'
import type { FileRecord } from '../contracts/office'

// Status marks with OpenCloud's own icons (as in Files) and a text alternative each.
const props = defineProps<{ file: FileRecord }>()
const marks = computed(() => [
  ...(props.file.favorite
    ? [{ key: 'favorite', icon: 'star', fill: 'fill' as const, label: 'Favorite' }]
    : []),
  ...(props.file.shared
    ? [{ key: 'shared', icon: 'group', fill: 'line' as const, label: 'Shared' }]
    : []),
  ...(props.file.lock
    ? [
        {
          key: 'lock',
          icon: 'lock',
          fill: 'line' as const,
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
      <OcIcon :name="mark.icon" :fill-type="mark.fill" class="office-icon" />
      <span class="office-visually-hidden">{{ mark.label }}</span>
    </span>
  </span>
</template>
