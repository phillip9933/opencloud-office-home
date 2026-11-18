<script setup lang="ts">
import { computed, nextTick } from 'vue'
import type { OfficeContext } from '../app/context'
import { allFileColumn, fileColumns, type FileColumn } from '../services/columns'
const props = defineProps<{ context: OfficeContext; allFiles?: boolean }>()
const preferences = props.context.preferences
const columnForView = (id: FileColumn) => (props.allFiles ? allFileColumn(id) : id)
const selected = computed(() => [...new Set(preferences.columns.map(columnForView))])
const available = computed(() =>
  fileColumns
    .map(({ id }) => id)
    .filter((id) => columnForView(id) === id && !selected.value.includes(id))
)
const choices = computed(() =>
  [...selected.value, ...available.value].map((id) =>
    fileColumns.find((column) => column.id === id)!
  )
)
async function toggle(id: FileColumn, input: HTMLInputElement) {
  const columns = preferences.columns
  preferences.columns = input.checked
    ? [...columns, id]
    : columns.filter((value) => columnForView(value) !== id)
  await nextTick()
  input.focus()
}
async function move(id: FileColumn, offset: number, button: HTMLButtonElement) {
  const columns = [...selected.value]
  const from = columns.indexOf(id)
  const to = from + offset
  if (from < 0 || to < 0 || to >= columns.length) return
  columns.splice(from, 1)
  columns.splice(to, 0, id)
  // Keep the user's Recent columns when the All files view shows them as one date column.
  preferences.columns = columns.flatMap((column) =>
    preferences.columns.filter((value) => columnForView(value) === column)
  )
  await nextTick()
  if (button.disabled)
    button.parentElement?.querySelector<HTMLButtonElement>('button:enabled')?.focus()
  else button.focus()
}
</script>
<template>
  <fieldset class="office-settings-group">
    <legend>Optional columns</legend>
    <p class="office-muted">Select columns to show. Use the arrows to change their order.</p>
    <ul class="office-column-choices">
      <li v-for="(column, index) in choices" :key="column.id">
        <label class="office-check">
          <input
            type="checkbox"
            :checked="index < selected.length"
            @change="toggle(column.id, $event.currentTarget as HTMLInputElement)"
          />
          <span>{{ column.label }}</span>
        </label>
        <div v-if="index < selected.length" class="office-column-moves">
          <button
            type="button"
            :aria-label="`Move ${column.label} earlier`"
            :disabled="index === 0"
            @click="move(column.id, -1, $event.currentTarget as HTMLButtonElement)"
          >
            <span aria-hidden="true">↑</span>
          </button>
          <button
            type="button"
            :aria-label="`Move ${column.label} later`"
            :disabled="index === selected.length - 1"
            @click="move(column.id, 1, $event.currentTarget as HTMLButtonElement)"
          >
            <span aria-hidden="true">↓</span>
          </button>
        </div>
      </li>
    </ul>
  </fieldset>
</template>
