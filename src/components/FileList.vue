<script setup lang="ts">
import FamilyIcon from './FamilyIcon.vue'
import FileMarks from './FileMarks.vue'
import FileMenu from './FileMenu.vue'
import FileThumb from './FileThumb.vue'
import type { FileRecord, OfficeKind, OfficeServices } from '../contracts/office'
import type { FileMenuAction } from '../services/home'

// One presentation for Recent and search results: a table with column headers, or cards.
defineProps<{
  items: { file: FileRecord; meta: string }[]
  layout: 'list' | 'grid'
  metaHeading: string
  kind: OfficeKind
  services: OfficeServices
  opening: boolean
}>()
const emit = defineEmits<{ action: [action: FileMenuAction, file: FileRecord] }>()
function extension(file: FileRecord) {
  const dot = file.name.lastIndexOf('.')
  return dot > 0 ? file.name.slice(dot + 1).toUpperCase() : ''
}
</script>

<template>
  <table v-if="layout === 'list'" class="office-table">
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col" class="office-hide-narrow">Location</th>
        <th scope="col">{{ metaHeading }}</th>
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
          <FileMarks :file="item.file" />
        </td>
        <td class="office-muted office-hide-narrow">{{ item.file.path ?? '' }}</td>
        <td class="office-muted">{{ item.meta }}</td>
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
