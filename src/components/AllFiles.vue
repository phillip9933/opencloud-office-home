<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { OfficeContext } from '../app/context'
import type { FileRecord, OfficeKind } from '../contracts/office'
import { attempt, errorText } from '../services/errors'
import type { FileMenuAction } from '../services/home'
import { matchesFilter } from '../services/loadRecent'
import { allFileColumn } from '../services/columns'
import FileList from './FileList.vue'
import FileToolbar from './FileToolbar.vue'

const props = defineProps<{
  kind: OfficeKind
  context: OfficeContext
  opening: boolean
  waiting: boolean
}>()
const emit = defineEmits<{ action: [action: FileMenuAction, file: FileRecord] }>()
const { preferences, recentFilter: filter, services } = props.context
const loading = ref(true)
const error = ref('')
const partial = ref(false)
const results = ref<FileRecord[]>([])
const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const pageSize = 25
const page = ref(1)
let controller: AbortController | undefined

async function load() {
  controller?.abort()
  results.value = []
  page.value = 1
  error.value = ''
  partial.value = false
  loading.value = true
  if (props.waiting) return
  controller = new AbortController()
  const signal = controller.signal
  const snapshot = { favorites: filter.favorites, tags: [...filter.tags] }
  const result = await attempt(() => services.catalog.allFiles(props.kind, signal, snapshot))
  if (signal.aborted) return
  loading.value = false
  if (!result.ok) {
    error.value = errorText[result.error]
    return
  }
  partial.value = result.value.partial
  results.value = result.value.items
}
watch(() => [props.kind, props.waiting, filter.favorites, ...filter.tags], load, {
  immediate: true
})
watch(
  () => preferences.sort,
  () => (page.value = 1)
)
onBeforeUnmount(() => controller?.abort())

const filtered = computed(() => filter.favorites || filter.tags.length > 0)
const files = computed(() => {
  const items = results.value.filter((file) => matchesFilter(file, filter))
  return items.sort((a, b) => {
    const byName = () =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    return preferences.sort === 'name'
      ? byName()
      : (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0) || byName()
  })
})
const pages = computed(() => Math.ceil(files.value.length / pageSize))
const columns = computed(() => [...new Set(preferences.columns.map(allFileColumn))])
watch(pages, (count) => {
  page.value = Math.min(page.value, Math.max(1, count))
})
const rows = computed(() =>
  files.value.slice((page.value - 1) * pageSize, page.value * pageSize).map((file) => ({
    file,
    meta: file.modifiedAt === undefined ? '—' : date.format(file.modifiedAt)
  }))
)
function movePage(direction: number) {
  const next = page.value + direction
  if (next >= 1 && next <= pages.value) page.value = next
}
</script>

<template>
  <section aria-labelledby="all-files-heading" class="office-recents">
    <div class="office-toolbar">
      <h2 id="all-files-heading">All files</h2>
      <FileToolbar :context="context" all-files />
    </div>
    <p v-if="loading" role="status">Loading files…</p>
    <p v-else-if="error" role="status">
      Files could not be loaded. {{ error }}
      <button type="button" class="office-link" @click="load">Retry all files</button>
    </p>
    <p v-else-if="partial" class="office-muted" role="status">
      OpenCloud returned only some results. Use search in OpenCloud Files to find a missing file.
    </p>
    <p v-if="!loading && !error && !partial && !files.length" class="office-empty">
      {{ filtered ? 'No files match these filters.' : 'No matching files found.' }}
    </p>
    <button
      v-if="!loading && !files.length && filtered"
      type="button"
      class="office-link"
      @click="Object.assign(filter, { favorites: false, tags: [] })"
    >
      Clear filters
    </button>
    <FileList
      v-if="rows.length"
      :items="rows"
      :layout="preferences.layout"
      meta-heading="Date modified"
      :kind="kind"
      :services="services"
      :opening="opening"
      :columns="columns"
      :details="context.details"
      @action="(action, file) => emit('action', action, file)"
    />
    <nav v-if="pages > 1" class="office-file-pages" aria-label="File pages">
      <button type="button" :aria-disabled="page === 1" @click="movePage(-1)">Previous</button>
      <span role="status">Page {{ page }} of {{ pages }}</span>
      <button type="button" :aria-disabled="page === pages" @click="movePage(1)">Next</button>
    </nav>
  </section>
</template>
