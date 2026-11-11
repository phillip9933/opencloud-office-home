<script setup lang="ts">
import { computed } from 'vue'
import FamilyIcon from './FamilyIcon.vue'
import FileThumb from './FileThumb.vue'
import type { OfficeContext } from '../app/context'
import type { FileRecord, OfficeKind } from '../contracts/office'
import { groupRecents, type RecentEntry } from '../services/recentView'

const props = defineProps<{
  kind: OfficeKind
  context: OfficeContext
  entries: RecentEntry[]
  opening: boolean
}>()
const emit = defineEmits<{ open: [file: FileRecord]; clear: []; browse: [] }>()
const preferences = props.context.preferences
const groups = computed(() => groupRecents(props.entries, preferences.sort, Date.now()))
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })
function opened(entry: RecentEntry) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return entry.openedAt >= today.getTime()
    ? timeFormat.format(entry.openedAt)
    : dateFormat.format(entry.openedAt)
}
function extension(file: FileRecord) {
  const dot = file.name.lastIndexOf('.')
  return dot > 0 ? file.name.slice(dot + 1).toUpperCase() : ''
}
</script>

<template>
  <section aria-labelledby="recent-heading" class="office-recents">
    <div class="office-toolbar">
      <h2 id="recent-heading">Recently opened in this browser</h2>
      <div class="office-toolbar-actions">
        <label class="office-inline-label"
          >Sort by
          <select v-model="preferences.sort">
            <option value="opened">Last opened</option>
            <option value="name">Name</option>
          </select>
        </label>
        <div class="office-segmented" role="group" aria-label="Layout">
          <button
            type="button"
            :aria-pressed="preferences.layout === 'list'"
            aria-label="List view"
            title="List view"
            @click="preferences.layout = 'list'"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <button
            type="button"
            :aria-pressed="preferences.layout === 'grid'"
            aria-label="Grid view"
            title="Grid view"
            @click="preferences.layout = 'grid'"
          >
            <span aria-hidden="true">▦</span>
          </button>
        </div>
        <button
          type="button"
          class="office-icon-button"
          aria-label="Go to folders"
          title="Go to folders"
          @click="emit('browse')"
        >
          <FamilyIcon kind="folder" />
        </button>
      </div>
    </div>
    <p class="office-muted office-recents-scope">
      {{
        context.services.mode === 'fixture'
          ? 'Preview history is synthetic and lasts for this session.'
          : 'Only files opened through this app appear here.'
      }}
      <button v-if="entries.length" type="button" class="office-link" @click="emit('clear')">
        Clear history
      </button>
    </p>
    <p v-if="!entries.length" class="office-empty">No recently opened files in this browser yet.</p>
    <section
      v-for="group in groups"
      :key="group.label"
      class="office-recent-group"
      :aria-label="group.label || undefined"
    >
      <h3 v-if="group.label">{{ group.label }}</h3>
      <table v-if="preferences.layout === 'list'" class="office-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col" class="office-hide-narrow">Location</th>
            <th scope="col">Opened</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in group.entries" :key="entry.file.ref.spaceId + entry.file.ref.itemId">
            <td>
              <button
                type="button"
                class="office-row-button"
                :disabled="opening"
                @click="emit('open', entry.file)"
              >
                <FamilyIcon :kind="kind" />
                <span>{{ entry.file.name }}</span>
              </button>
            </td>
            <td class="office-muted office-hide-narrow">{{ entry.file.path ?? '' }}</td>
            <td class="office-muted">{{ opened(entry) }}</td>
          </tr>
        </tbody>
      </table>
      <ul v-else class="office-cards office-cards-files">
        <li v-for="entry in group.entries" :key="entry.file.ref.spaceId + entry.file.ref.itemId">
          <button
            type="button"
            class="office-card"
            :disabled="opening"
            @click="emit('open', entry.file)"
          >
            <FileThumb
              :services="context.services"
              :kind="kind"
              :source="entry.file.ref"
              :label="extension(entry.file)"
            />
            <span class="office-card-name">{{ entry.file.name }}</span>
            <span class="office-muted office-card-meta">Opened {{ opened(entry) }}</span>
          </button>
        </li>
      </ul>
    </section>
  </section>
</template>
