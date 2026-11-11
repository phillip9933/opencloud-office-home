<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import FileList from './FileList.vue'
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
}>()
const emit = defineEmits<{
  search: [search: HomeLocation['search']]
  action: [action: FileMenuAction, file: FileRecord]
}>()
const term = ref('')
const scope = ref<'all' | 'folder'>('all')
const results = ref<FileRecord[]>([])
const loading = ref(false)
const partial = ref(false)
const error = ref('')
let abort = new AbortController()
let revision = 0
const items = computed(() =>
  results.value.map((file) => ({ file, meta: file.access.write ? 'Can edit' : 'Read only' }))
)
watch(
  () => props.search,
  () => {
    term.value = props.search?.term ?? ''
    scope.value = props.search?.scope ?? 'all'
  },
  { immediate: true }
)
watch(
  () => [props.search, props.ready, props.folderRows] as const,
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
      props.context.services.catalog.search(props.kind, props.search!.term, abort.signal)
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
    <form
      class="office-toolbar"
      role="search"
      @submit.prevent="emit('search', term.trim() ? { term: term.trim(), scope } : undefined)"
    >
      <label class="office-inline-label"
        >Search files<input
          v-model="term"
          type="search"
          maxlength="200"
          :placeholder="`Find ${kind} by name`"
      /></label>
      <label class="office-inline-label"
        >Search scope<select v-model="scope">
          <option value="all">All reachable spaces</option>
          <option value="folder">This folder</option>
        </select></label
      >
      <button type="submit">Search</button>
      <button v-if="search" type="button" @click="emit('search', undefined)">Clear search</button>
    </form>
    <div v-if="search" :aria-busy="loading">
      <h2>Search results for “{{ search.term }}”</h2>
      <p v-if="loading" role="status">Searching…</p>
      <p v-else-if="error" role="alert">{{ error }}</p>
      <p v-else-if="!results.length" role="status">No matching files.</p>
      <FileList
        v-else
        :items="items"
        :layout="context.preferences.layout"
        meta-heading="Access"
        :kind="kind"
        :services="context.services"
        :opening="opening"
        @action="(action, file) => emit('action', action, file)"
      />
      <p v-if="partial" role="status">
        Partial search results. More files may be available in Files.
      </p>
    </div>
  </section>
</template>
