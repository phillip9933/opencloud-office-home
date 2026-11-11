<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { FileCatalog, FileRecord, FileRef, Space } from '../contracts/office'
import { attempt, errorText } from '../services/home'
const props = defineProps<{
  catalog: FileCatalog
  title: string
  start?: FileRef
  writable?: boolean
}>()
const emit = defineEmits<{ choose: [folder: FileRecord, label: string]; cancel: [] }>()
const spaces = ref<Space[]>([])
const spaceId = ref('')
const folder = ref<FileRecord>()
const children = ref<FileRecord[]>([])
const trail = ref<{ name: string; ref: FileRef }[]>([])
const loading = ref(false)
const partial = ref(false)
const error = ref('')
let revision = 0
let controller = new AbortController()
function currentLabel() {
  return [
    spaces.value.find((space) => space.id === spaceId.value)?.name,
    ...trail.value.map((part) => part.name)
  ]
    .filter(Boolean)
    .join(' / ')
}
async function load(target: FileRef) {
  const request = ++revision
  controller.abort()
  controller = new AbortController()
  loading.value = true
  folder.value = undefined
  children.value = []
  error.value = ''
  const [resolved, result] = await Promise.all([
    attempt(() => props.catalog.resolve(target)),
    attempt(() => props.catalog.list({ folder: target, kind: 'any', signal: controller.signal }))
  ])
  if (request !== revision) return
  loading.value = false
  if (!resolved.ok || resolved.value.kind !== 'folder' || !resolved.value.access.read) {
    error.value = errorText[resolved.ok ? 'forbiddenOrMissing' : resolved.error]
    return
  }
  folder.value = resolved.value
  if (!result.ok) {
    error.value = errorText[result.error]
    return
  }
  children.value = result.value.items.filter((item) => item.kind === 'folder' && item.access.read)
  partial.value = result.value.partial
}
function chooseSpace() {
  trail.value = []
  const space = spaces.value.find((value) => value.id === spaceId.value)
  if (space) void load(space.root)
}
function enter(child: FileRecord) {
  trail.value.push({ name: child.name, ref: child.ref })
  void load(child.ref)
}
function parent(index: number) {
  trail.value = trail.value.slice(0, index + 1)
  const space = spaces.value.find((value) => value.id === spaceId.value)
  if (space) void load(index < 0 ? space.root : trail.value[index]!.ref)
}
onMounted(async () => {
  loading.value = true
  const request = ++revision
  const result = await attempt(() => props.catalog.listSpaces(controller.signal))
  if (request !== revision) return
  if (!result.ok) {
    loading.value = false
    error.value = errorText[result.error]
    return
  }
  spaces.value = result.value
  const selected =
    spaces.value.find((space) => space.id === props.start?.spaceId) ?? spaces.value[0]
  if (!selected) {
    loading.value = false
    error.value = 'No accessible spaces are available.'
    return
  }
  spaceId.value = selected.id
  // Begin at the root so every picker entry has a complete, visible breadcrumb trail.
  await load(selected.root)
})
onBeforeUnmount(() => {
  revision++
  controller.abort()
})
</script>
<template>
  <section class="office-folder-picker" :aria-label="title" :aria-busy="loading">
    <h3>{{ title }}</h3>
    <label
      >Space<select v-model="spaceId" :disabled="loading || !spaces.length" @change="chooseSpace">
        <option v-for="space in spaces" :key="space.id" :value="space.id">{{ space.name }}</option>
      </select></label
    >
    <nav aria-label="Choose folder breadcrumbs" class="office-breadcrumbs">
      <button type="button" :disabled="loading" @click="parent(-1)">Root</button>
      <button
        v-for="(part, index) in trail"
        :key="part.ref.itemId"
        type="button"
        :disabled="loading"
        @click="parent(index)"
      >
        {{ part.name }}
      </button>
    </nav>
    <p v-if="loading" role="status">Loading folders…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <ul v-else class="office-folder-choices">
      <li v-for="child in children" :key="child.ref.itemId">
        <button type="button" @click="enter(child)">
          {{ child.name }} <span aria-hidden="true">›</span>
        </button>
      </li>
    </ul>
    <p v-if="!loading && !error && !children.length" class="office-muted">No subfolders.</p>
    <p v-if="partial" class="office-muted">
      Some folders may be available only in OpenCloud Files.
    </p>
    <p v-if="folder && writable && !folder.access.createChild" class="office-muted">
      Choose a folder where you can create files.
    </p>
    <div class="office-panel-actions">
      <button
        type="button"
        :disabled="loading || !!error || !folder || (writable && !folder.access.createChild)"
        @click="folder && emit('choose', folder, currentLabel())"
      >
        Use this folder
      </button>
      <button type="button" @click="emit('cancel')">Cancel folder selection</button>
    </div>
  </section>
</template>
