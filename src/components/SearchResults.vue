<script setup lang="ts">
import FileList from './FileList.vue'
import type { OfficeContext } from '../app/context'
import type { FileRecord, OfficeKind } from '../contracts/office'
import type { FileMenuAction } from '../services/home'

defineProps<{
  kind: OfficeKind
  context: OfficeContext
  text: string
  results: FileRecord[]
  note: string
  loading: boolean
  opening: boolean
}>()
const emit = defineEmits<{ action: [action: FileMenuAction, file: FileRecord]; clear: [] }>()
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
</script>

<template>
  <section aria-labelledby="results-heading" class="office-recents" :aria-busy="loading">
    <div class="office-toolbar">
      <h2 id="results-heading">Search results for “{{ text }}”</h2>
      <button type="button" class="office-link" @click="emit('clear')">Clear search</button>
    </div>
    <p class="office-muted">File names in all spaces you can reach. Content is not searched.</p>
    <p v-if="loading" role="status">Searching…</p>
    <template v-else>
      <p v-if="note" class="office-muted" role="status">{{ note }}</p>
      <p v-if="!results.length && !note" class="office-empty" role="status">No matching files.</p>
      <FileList
        v-if="results.length"
        :items="
          results.map((file) => ({
            file,
            meta: file.modifiedAt ? `Changed ${dateFormat.format(file.modifiedAt)}` : ''
          }))
        "
        :layout="context.preferences.layout"
        meta-heading="Last change"
        :kind="kind"
        :services="context.services"
        :opening="opening"
        @action="(action, file) => emit('action', action, file)"
      />
    </template>
  </section>
</template>
