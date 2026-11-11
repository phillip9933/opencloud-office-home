<script setup lang="ts">
import type { OfficeContext } from '../app/context'
import { fileColumns, type FileColumn } from '../services/columns'
const props = defineProps<{ context: OfficeContext }>()
const preferences = props.context.preferences
function toggle(id: FileColumn, checked: boolean) {
  const columns = preferences.columns
  preferences.columns = checked ? [...columns, id] : columns.filter((value) => value !== id)
}
function move(id: FileColumn, offset: number) {
  const columns = [...preferences.columns]
  const from = columns.indexOf(id)
  const to = from + offset
  if (from < 0 || to < 0 || to >= columns.length) return
  columns.splice(from, 1)
  columns.splice(to, 0, id)
  preferences.columns = columns
}
</script>
<template>
  <fieldset class="office-settings-group">
    <legend>Recent and search columns</legend>
    <p class="office-muted">
      Name and file actions are always shown. Select optional columns and set their order.
    </p>
    <label v-for="column in fileColumns" :key="column.id" class="office-check">
      <input
        type="checkbox"
        :checked="context.preferences.columns.includes(column.id)"
        @change="toggle(column.id, ($event.target as HTMLInputElement).checked)"
      />
      <span>{{ column.label }}</span>
    </label>
    <ol class="office-column-order">
      <li v-for="(id, index) in context.preferences.columns" :key="id">
        <span>{{ fileColumns.find((column) => column.id === id)!.label }}</span>
        <button
          type="button"
          :aria-label="`Move ${fileColumns.find((column) => column.id === id)!.label} earlier`"
          :disabled="index === 0"
          @click="move(id, -1)"
        >
          ↑
        </button>
        <button
          type="button"
          :aria-label="`Move ${fileColumns.find((column) => column.id === id)!.label} later`"
          :disabled="index === context.preferences.columns.length - 1"
          @click="move(id, 1)"
        >
          ↓
        </button>
      </li>
    </ol>
  </fieldset>
</template>
