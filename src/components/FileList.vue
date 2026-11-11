<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import FamilyIcon from './FamilyIcon.vue'
import FileMarks from './FileMarks.vue'
import FileMenu from './FileMenu.vue'
import FileThumb from './FileThumb.vue'
import { refKey, type FileRecord, type OfficeKind, type OfficeServices } from '../contracts/office'
import type { FileMenuAction } from '../services/home'
import { defaultColumns, fileColumns, fileColumnValue, type FileColumn } from '../services/columns'
import type { DetailLoader } from '../services/details'

// Recent files use a table with optional columns, or cards.
const props = defineProps<{
  items: { file: FileRecord; meta: string }[]
  layout: 'list' | 'grid'
  metaHeading: string
  kind: OfficeKind
  services: OfficeServices
  opening: boolean
  columns?: FileColumn[]
  details?: DetailLoader
}>()
const columns = computed(() => props.columns ?? defaultColumns)
const enriched = ref(new Map<string, FileRecord>())
let revision = 0
let controller = new AbortController()
watch(
  () => [props.items, columns.value] as const,
  () => {
    const request = ++revision
    controller.abort()
    controller = new AbortController()
    enriched.value = new Map()
    if (
      !props.details ||
      !columns.value.some((column) => column === 'owner' || column === 'created')
    )
      return
    const signal = controller.signal
    for (const { file } of props.items) {
      if (
        (!columns.value.includes('owner') || file.owner !== undefined) &&
        (!columns.value.includes('created') || file.createdAt !== undefined)
      )
        continue
      void props.details.load(file.ref, signal).then((result) => {
        if (
          request === revision &&
          result.ok &&
          result.value.access.read &&
          refKey(result.value.ref) === refKey(file.ref)
        )
          enriched.value.set(refKey(file.ref), result.value)
      })
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  revision++
  controller.abort()
  enriched.value.clear()
})
function metadata(file: FileRecord) {
  return enriched.value.get(refKey(file.ref)) ?? file
}
function columnLabel(column: FileColumn) {
  return column === 'activity'
    ? props.metaHeading
    : fileColumns.find((choice) => choice.id === column)!.label
}
const emit = defineEmits<{ action: [action: FileMenuAction, file: FileRecord] }>()
function extension(file: FileRecord) {
  const dot = file.name.lastIndexOf('.')
  return dot > 0 ? file.name.slice(dot + 1).toUpperCase() : ''
}
</script>

<template>
  <div
    v-if="layout === 'list'"
    class="office-table-scroll"
    tabindex="0"
    role="region"
    aria-label="File columns"
  >
    <table
      class="office-table"
      :style="{ minWidth: columns.length > 2 ? `${18 + columns.length * 8}rem` : undefined }"
    >
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th
            v-for="column in columns"
            :key="column"
            scope="col"
            :class="{ 'office-hide-narrow': column === 'location' && columns.length <= 2 }"
          >
            {{ columnLabel(column) }}
          </th>
          <th scope="col"><span class="office-visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.file.ref.spaceId + item.file.ref.itemId">
          <td>
            <button
              type="button"
              class="office-row-button"
              :disabled="opening"
              @click="emit('action', 'open', item.file)"
            >
              <FamilyIcon :kind="kind" />
              <span>{{ item.file.name }}</span>
            </button>
            <FileMarks :file="metadata(item.file)" />
            <span
              v-if="columns.includes('location') && columns.length <= 2"
              class="office-mobile-location office-muted"
              >{{ fileColumnValue(metadata(item.file), 'location', item.meta) }}</span
            >
          </td>
          <td
            v-for="column in columns"
            :key="column"
            class="office-muted"
            :class="{ 'office-hide-narrow': column === 'location' && columns.length <= 2 }"
          >
            {{ fileColumnValue(metadata(item.file), column, item.meta) }}
          </td>
          <td class="office-actions-cell">
            <FileMenu
              :file="item.file"
              :services="services"
              :disabled="opening"
              @action="(action, file) => emit('action', action, file)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <ul v-else class="office-cards office-cards-files">
    <li v-for="item in items" :key="item.file.ref.spaceId + item.file.ref.itemId">
      <div class="office-template-card">
        <button
          type="button"
          class="office-card"
          :disabled="opening"
          @click="emit('action', 'open', item.file)"
        >
          <FileThumb
            :services="services"
            :kind="kind"
            :source="item.file.ref"
            :label="extension(item.file)"
          />
          <span class="office-card-name">{{ item.file.name }}</span>
          <span class="office-muted office-card-meta">{{ item.meta }}</span>
        </button>
        <FileMarks :file="item.file" />
        <FileMenu
          class="office-card-menu"
          :file="item.file"
          :services="services"
          :disabled="opening"
          @action="(action, file) => emit('action', action, file)"
        />
      </div>
    </li>
  </ul>
</template>
