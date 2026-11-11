<script setup lang="ts">
import { computed } from 'vue'
import FileList from './FileList.vue'
import TagFilter from './TagFilter.vue'
import type { OfficeContext } from '../app/context'
import type { FileRecord, OfficeKind } from '../contracts/office'
import { groupRecents, lastActivity, type RecentEntry } from '../services/recentView'
import type { FileMenuAction } from '../services/home'
import { RECENT_CHANGE_DAYS } from '../contracts/office'

const props = defineProps<{
  kind: OfficeKind
  context: OfficeContext
  entries: RecentEntry[]
  note: string
  opening: boolean
}>()
const emit = defineEmits<{ action: [action: FileMenuAction, file: FileRecord]; clear: [] }>()
const preferences = props.context.preferences
const filter = props.context.recentFilter
const filtered = computed(() => filter.favorites || filter.tags.length > 0)
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
</script>

<template>
  <section aria-labelledby="recent-heading" class="office-recents">
    <div class="office-toolbar">
      <h2 id="recent-heading">Recent</h2>
      <div class="office-toolbar-actions">
        <button
          v-if="context.services.filters.favorites"
          type="button"
          :aria-pressed="filter.favorites"
          @click="filter.favorites = !filter.favorites"
        >
          <span aria-hidden="true">{{ filter.favorites ? '★' : '☆' }}</span> Favorites
        </button>
        <TagFilter
          v-if="context.services.filters.tags"
          :catalog="context.services.catalog"
          :filter="filter"
          @change="(tags) => (filter.tags = tags)"
        />
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
      Changed in OpenCloud in the last {{ RECENT_CHANGE_DAYS }} days, by you or people you share
      with, or opened in this browser.
      <button v-if="hasOpened" type="button" class="office-link" @click="emit('clear')">
        Clear this browser's history
      </button>
    </p>
    <p v-if="note" class="office-muted" role="status">{{ note }}</p>
    <p v-if="!entries.length && filtered" class="office-empty">
      No recent files match these filters.
      <button
        type="button"
        class="office-link"
        @click="Object.assign(filter, { favorites: false, tags: [] })"
      >
        Clear filters
      </button>
    </p>
    <p v-else-if="!entries.length" class="office-empty">No recent files yet.</p>
    <section
      v-for="group in groups"
      :key="group.label"
      class="office-recent-group"
      :aria-label="group.label || undefined"
    >
      <h3 v-if="group.label">{{ group.label }}</h3>
      <FileList
        :items="group.entries.map((entry) => ({ file: entry.file, meta: activity(entry) }))"
        :layout="preferences.layout"
        meta-heading="Last activity"
        :kind="kind"
        :services="context.services"
        :opening="opening"
        @action="(action, file) => emit('action', action, file)"
      />
    </section>
  </section>
</template>
