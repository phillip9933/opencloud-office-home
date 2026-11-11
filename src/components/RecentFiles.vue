<script setup lang="ts">
import { computed } from 'vue'
import FileList from './FileList.vue'
import FileToolbar from './FileToolbar.vue'
import InfoTip from './InfoTip.vue'
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
      <FileToolbar :context="context" />
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
        :columns="preferences.columns"
        :details="context.details"
        @action="(action, file) => emit('action', action, file)"
      />
    </section>
  </section>
</template>
