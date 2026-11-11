<script setup lang="ts">
import { ref } from 'vue'
import FamilyIcon from './FamilyIcon.vue'
import FileMarks from './FileMarks.vue'
import FileMenu from './FileMenu.vue'
import type { FileRecord, OfficeKind, OfficeServices } from '../contracts/office'
import type { FileMenuAction, HomeModel } from '../services/home'

defineProps<{
  kind: OfficeKind
  state: HomeModel['state']
  services: OfficeServices
  expanded: boolean
}>()
const emit = defineEmits<{
  toggle: []
  chooseSpace: [id: string]
  activate: [file: FileRecord]
  action: [action: FileMenuAction, file: FileRecord]
  breadcrumb: [index: number]
  reload: []
  more: []
}>()
const toggleButton = ref<HTMLButtonElement>()
defineExpose({ focus: () => toggleButton.value?.focus() })
</script>

<template>
  <section aria-labelledby="browse-heading" class="office-browse" :aria-busy="state.loading">
    <div class="office-toolbar">
      <h2 id="browse-heading">
        <button
          ref="toggleButton"
          type="button"
          class="office-disclosure"
          :aria-expanded="expanded"
          aria-controls="office-browse-body"
          @click="emit('toggle')"
        >
          <span aria-hidden="true" :class="{ 'office-mirror': !expanded }">{{
            expanded ? '▾' : '▸'
          }}</span>
          Browse folders
        </button>
      </h2>
      <label v-if="expanded" class="office-inline-label"
        >Space<select
          :value="state.location.spaceId"
          :disabled="state.loading || !state.spaces.length"
          @change="emit('chooseSpace', ($event.target as HTMLSelectElement).value)"
        >
          <option v-if="!state.spaces.length" value="">Unavailable</option>
          <option v-for="space in state.spaces" :key="space.id" :value="space.id">
            {{ space.name }}
          </option>
        </select></label
      >
    </div>
    <div v-if="expanded" id="office-browse-body">
      <nav v-if="state.location.folder" aria-label="Folder breadcrumbs" class="office-breadcrumbs">
        <button type="button" @click="emit('breadcrumb', -1)">Root</button>
        <button
          v-for="(part, index) in state.location.trail"
          :key="part.ref.itemId"
          type="button"
          @click="emit('breadcrumb', index)"
        >
          {{ part.name }}
        </button>
      </nav>
      <p v-if="state.loading" role="status">Loading files…</p>
      <div v-else-if="state.error" role="alert">
        <p>{{ state.error }}</p>
        <button type="button" @click="emit('reload')">Load again</button>
      </div>
      <p v-else-if="!state.rows.length" class="office-empty">
        {{
          state.location.text
            ? 'No matching files in this folder.'
            : 'No files to show in this folder.'
        }}
      </p>
      <ul v-else class="office-file-list">
        <li v-for="file in state.rows" :key="file.ref.spaceId + file.ref.itemId">
          <FamilyIcon :kind="file.kind === 'folder' ? 'folder' : kind" />
          <button type="button" :disabled="state.opening" @click="emit('activate', file)">
            {{ file.name }}
          </button>
          <FileMarks :file="file" />
          <span class="office-muted">{{
            file.kind === 'folder' ? 'Folder' : file.access.write ? 'Can edit' : 'Read only'
          }}</span>
          <FileMenu
            v-if="file.kind === 'file'"
            :file="file"
            :services="services"
            :disabled="state.opening"
            @action="(action, item) => emit('action', action, item)"
          />
        </li>
      </ul>
      <p v-if="state.partial" role="status">Partial results. More files may be available.</p>
      <button v-if="state.next" type="button" :disabled="state.loading" @click="emit('more')">
        Load more
      </button>
    </div>
    <p v-else-if="state.error" role="alert" class="office-muted">{{ state.error }}</p>
  </section>
</template>
