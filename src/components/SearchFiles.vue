<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import FileList from './FileList.vue'
import FileToolbar from './FileToolbar.vue'
import RecentFiles from './RecentFiles.vue'
import type { RecentEntry } from '../services/recentView'
import type { OfficeContext } from '../app/context'
import type { FileRecord, HomeLocation, OfficeKind } from '../contracts/office'
import { attempt, errorText, type FileMenuAction } from '../services/home'
const props = defineProps<{
  context: OfficeContext
  kind: OfficeKind
  search?: HomeLocation['search']
  folderRows: FileRecord[]
  folderPartial: boolean
  ready: boolean
  opening: boolean
  entries?: RecentEntry[]
  note?: string
}>()
const emit = defineEmits<{
  search: [search: HomeLocation['search']]
  action: [action: FileMenuAction, file: FileRecord]
}>()
const results = ref<FileRecord[]>([])
const loading = ref(false)
const partial = ref(false)
const error = ref('')
let abort = new AbortController()
let revision = 0
const filteredResults = computed(() =>
  results.value
    .filter(
      (file) =>
        (!props.context.recentFilter.favorites || file.favorite) &&
        (!props.context.recentFilter.tags.length ||
          props.context.recentFilter.tags.some((tag) => file.tags?.includes(tag)))
    )
    .sort((a, b) =>
      props.context.preferences.sort === 'name'
        ? a.name.localeCompare(b.name)
        : (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0)
    )
)
const items = computed(() =>
  filteredResults.value.map((file) => ({
    file,
    meta: file.access.write ? 'Can edit' : 'Read only'
  }))
)
watch(
  () =>
    [
      props.search,
      props.ready,
      props.folderRows,
      props.context.recentFilter.favorites,
      ...props.context.recentFilter.tags
    ] as const,
  async () => {
    const request = ++revision
    abort.abort()
    abort = new AbortController()
    results.value = []
    error.value = ''
    partial.value = false
    loading.value = !!props.search && !props.ready
    if (!props.search || !props.ready) return
    if (props.search.scope === 'folder') {
      results.value = props.folderRows.filter(
        (file) =>
          file.kind === 'file' && file.name.toLowerCase().includes(props.search!.term.toLowerCase())
      )
      partial.value = props.folderPartial
      return
    }
    loading.value = true
    const result = await attempt(() =>
      props.context.services.catalog.search(props.kind, props.search!.term, abort.signal, {
        favorites: props.context.recentFilter.favorites,
        tags: [...props.context.recentFilter.tags]
      })
    )
    if (request !== revision) return
    loading.value = false
    if (!result.ok) {
      error.value = errorText[result.error]
      return
    }
    results.value = result.value.items
    partial.value = result.value.partial
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  revision++
  abort.abort()
})
</script>
<template>
  <section class="office-search" aria-label="Find office files">
    <FileToolbar :context="context" :search="search" @search="(value) => emit('search', value)" />
    <div v-if="search" :aria-busy="loading">
      <h2>Search results for “{{ search.term }}”</h2>
      <p v-if="loading" role="status">Searching…</p>
      <p v-else-if="error" role="alert">{{ error }}</p>
      <p v-else-if="!items.length" role="status">No matching files.</p>
      <FileList
        v-else
        :items="items"
        :layout="context.preferences.layout"
        meta-heading="Access"
        :kind="kind"
        :services="context.services"
        :opening="opening"
        :columns="context.preferences.columns"
        :details="context.details"
        @action="(action, file) => emit('action', action, file)"
      />
      <p v-if="partial" role="status">
        Partial search results. More files may be available in Files.
      </p>
    </div>
    <RecentFiles
      v-else
      :context="context"
      :kind="kind"
      :entries="entries ?? []"
      :note="note ?? ''"
      :opening="opening"
      @action="(action, file) => emit('action', action, file)"
    />
  </section>
</template>
