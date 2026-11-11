<script setup lang="ts">
import { computed } from 'vue'
import FamilyIcon from './FamilyIcon.vue'
import FileThumb from './FileThumb.vue'
import type { OfficeContext } from '../app/context'
import type { FileRecord, OfficeKind } from '../contracts/office'
import { groupRecents, lastActivity, type RecentEntry } from '../services/recentView'
import { RECENT_CHANGE_DAYS } from '../contracts/office'

const props = defineProps<{
  kind: OfficeKind
  context: OfficeContext
  entries: RecentEntry[]
  note: string
  opening: boolean
}>()
const emit = defineEmits<{ open: [file: FileRecord]; clear: [] }>()
const preferences = props.context.preferences
const groups = computed(() => groupRecents(props.entries, preferences.sort, Date.now()))
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })
function activity(entry: RecentEntry) {
  const { at, kind } = lastActivity(entry)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const when = at >= today.getTime() ? timeFormat.format(at) : dateFormat.format(at)
  return `${kind === 'opened' ? 'Opened' : 'Changed'} ${when}`
}
const hasOpened = computed(() => props.entries.some((entry) => entry.openedAt !== undefined))
function extension(file: FileRecord) {
  const dot = file.name.lastIndexOf('.')
  return dot > 0 ? file.name.slice(dot + 1).toUpperCase() : ''
}
</script>

<template>
  <section aria-labelledby="recent-heading" class="office-recents">
    <div class="office-toolbar">
      <h2 id="recent-heading">Recent</h2>
      <div class="office-toolbar-actions">
        <label class="office-inline-label"
          >Sort by
          <select v-model="preferences.sort">
            <option value="activity">Most recent</option>
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
      </div>
    </div>
    <p class="office-muted office-recents-scope">
      {{ context.services.mode === 'fixture' ? 'Synthetic preview history.' : '' }}
      Files changed in OpenCloud in the last {{ RECENT_CHANGE_DAYS }} days, by you on any device or
      by people you share with, and files you opened in this browser.
      <button v-if="hasOpened" type="button" class="office-link" @click="emit('clear')">
        Clear this browser's history
      </button>
    </p>
    <p v-if="note" class="office-muted" role="status">{{ note }}</p>
    <p v-if="!entries.length" class="office-empty">No recent files yet.</p>
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
            <th scope="col">Last activity</th>
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
            <td class="office-muted">{{ activity(entry) }}</td>
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
            <span class="office-muted office-card-meta">{{ activity(entry) }}</span>
          </button>
        </li>
      </ul>
    </section>
  </section>
</template>
