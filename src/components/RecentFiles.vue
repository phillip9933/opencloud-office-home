<script setup lang="ts">
import { computed } from 'vue'
import FileList from './FileList.vue'
import { OcIcon } from '@opencloud-eu/design-system/components'
import InfoTip from './InfoTip.vue'
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
const emit = defineEmits<{ action: [action: FileMenuAction, file: FileRecord] }>()
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
const about = `Office files changed in OpenCloud in the last ${RECENT_CHANGE_DAYS} days, by you or people you share with, and files you opened in this browser.`
</script>

<template>
  <section aria-labelledby="recent-heading" class="office-recents">
    <div class="office-toolbar">
      <div class="office-heading-with-tip">
        <h2 id="recent-heading">Recent</h2>
        <InfoTip label="About Recent" :text="about" />
      </div>
      <div class="office-toolbar-actions">
        <button
          v-if="context.services.filters.favorites"
          type="button"
          :aria-pressed="filter.favorites"
          @click="filter.favorites = !filter.favorites"
        >
          <OcIcon name="star" :fill-type="filter.favorites ? 'fill' : 'line'" class="office-icon" />
          Favorites
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
            <OcIcon name="list-unordered" fill-type="none" class="office-icon" />
          </button>
          <button
            type="button"
            :aria-pressed="preferences.layout === 'grid'"
            aria-label="Grid view"
            title="Grid view"
            @click="preferences.layout = 'grid'"
          >
            <OcIcon name="gallery-view-2" fill-type="none" class="office-icon" />
          </button>
        </div>
      </div>
    </div>
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
