<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { OcIcon } from '@opencloud-eu/design-system/components'
import type { FileCatalog, FileRecord, FileRef, Space } from '../contracts/office'
import { attempt, errorText } from '../services/home'
const props = defineProps<{
  catalog: FileCatalog
  title: string
  start?: FileRef
  writable?: boolean
}>()
const emit = defineEmits<{ choose: [folder: FileRecord, label: string]; cancel: [] }>()
const dialog = ref<HTMLDialogElement>()
const spaces = ref<Space[]>([])
const spaceId = ref('')
const folder = ref<FileRecord>()
const children = ref<FileRecord[]>([])
const trail = ref<{ name: string; ref: FileRef; detached?: boolean }[]>([])
const filter = ref('')
const loading = ref(false)
const partial = ref(false)
const error = ref('')
let revision = 0
let controller = new AbortController()
const currentSpace = computed(() => spaces.value.find((space) => space.id === spaceId.value))
const visibleFolders = computed(() =>
  children.value
    .filter((child) => child.name.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
)
const label = computed(() =>
  [currentSpace.value?.name, ...trail.value.map((part) => part.name)].filter(Boolean).join(' / ')
)
const canChoose = computed(
  () =>
    !loading.value &&
    !error.value &&
    !!folder.value &&
    (!props.writable || folder.value.access.createChild)
)
async function load(target: FileRef) {
  const request = ++revision
  controller.abort()
  controller = new AbortController()
  loading.value = true
  folder.value = undefined
  children.value = []
  filter.value = ''
  partial.value = false
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
  if (!result.ok) {
    error.value = errorText[result.error]
    return
  }
  folder.value = resolved.value
  children.value = result.value.items.filter((item) => item.kind === 'folder' && item.access.read)
  partial.value = result.value.partial
}
function chooseSpace(space: Space) {
  spaceId.value = space.id
  trail.value = []
  void load(space.root)
}
function enter(child: FileRecord) {
  trail.value.push({ name: child.name, ref: child.ref })
  void load(child.ref)
}
function parent(index: number) {
  trail.value = trail.value.slice(0, index + 1)
  const target = index < 0 ? currentSpace.value?.root : trail.value[index]?.ref
  if (target) void load(target)
}
function cancel() {
  emit('cancel')
}
onMounted(async () => {
  dialog.value?.showModal()
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
  const selected = props.start
    ? spaces.value.find((space) => space.id === props.start!.spaceId)
    : spaces.value[0]
  if (!selected) {
    loading.value = false
    error.value = 'The selected space is unavailable. Choose an accessible location.'
    return
  }
  spaceId.value = selected.id
  const startRequest = revision + 1
  await load(props.start ?? selected.root)
  if (
    revision === startRequest &&
    folder.value &&
    props.start &&
    props.start.itemId !== selected.root.itemId
  ) {
    // The catalog may not expose an ancestor chain. An ellipsis avoids inventing one.
    trail.value = [{ name: folder.value.name, ref: props.start, detached: true }]
  }
})
onBeforeUnmount(() => {
  revision++
  controller.abort()
  dialog.value?.close()
})
</script>
<template>
  <dialog
    ref="dialog"
    class="office-folder-dialog"
    :aria-label="title"
    aria-modal="true"
    @cancel.prevent="cancel"
    @keydown.esc.stop.prevent="cancel"
  >
    <header>
      <h2>{{ title }}</h2>
      <button
        type="button"
        class="office-icon-button"
        aria-label="Close folder chooser"
        @click="cancel"
      >
        <OcIcon name="close" fill-type="line" class="office-icon" />
      </button>
    </header>
    <div class="office-folder-browser">
      <nav aria-label="Folder locations" class="office-folder-locations">
        <h3>Locations</h3>
        <button
          v-for="space in spaces"
          :key="space.id"
          type="button"
          :aria-current="space.id === spaceId ? 'location' : undefined"
          @click="chooseSpace(space)"
        >
          <OcIcon name="folder" fill-type="line" class="office-icon" /><span>{{ space.name }}</span>
        </button>
      </nav>
      <section class="office-folder-content" :aria-busy="loading">
        <div class="office-folder-toolbar">
          <button
            type="button"
            class="office-icon-button"
            :disabled="loading || !trail.length"
            :aria-label="
              trail.length === 1 && trail[0]?.detached ? 'Go to space root' : 'Parent folder'
            "
            @click="parent(trail.length - 2)"
          >
            <OcIcon name="arrow-up" fill-type="line" class="office-icon" />
          </button>
          <nav aria-label="Choose folder breadcrumbs" class="office-folder-breadcrumbs">
            <button type="button" :disabled="loading || !currentSpace" @click="parent(-1)">
              {{ currentSpace?.name || 'Locations' }}</button
            ><template v-for="(part, index) in trail" :key="part.ref.itemId"
              ><span v-if="part.detached" aria-label="Earlier folders">…</span
              ><span aria-hidden="true">›</span
              ><button
                type="button"
                :disabled="loading"
                :aria-current="index === trail.length - 1 ? 'location' : undefined"
                @click="parent(index)"
              >
                {{ part.name }}
              </button></template
            >
          </nav>
        </div>
        <label class="office-folder-filter"
          >Find a folder<input
            v-model="filter"
            type="search"
            :disabled="loading"
            placeholder="Filter this folder"
        /></label>
        <p v-if="loading" role="status">Loading folders…</p>
        <p v-else-if="error" role="alert">{{ error }}</p>
        <div v-else class="office-folder-table-scroll">
          <table class="office-folder-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="child in visibleFolders" :key="child.ref.itemId">
                <td>
                  <button type="button" @click="enter(child)">
                    <OcIcon name="folder" fill-type="line" class="office-icon" /><span>{{
                      child.name
                    }}</span
                    ><OcIcon name="arrow-right-s" fill-type="line" class="office-icon" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!visibleFolders.length" class="office-muted">
            {{ filter ? 'No folders match this filter.' : 'This folder has no subfolders.' }}
          </p>
        </div>
        <p v-if="partial" class="office-muted">
          Some folders may be available only in OpenCloud Files.
        </p>
      </section>
    </div>
    <footer>
      <div>
        <span class="office-muted">Selected folder</span
        ><strong>{{ folder ? label : 'Choose a folder' }}</strong>
        <p v-if="folder && writable && !folder.access.createChild" class="office-muted">
          You cannot create files here. Choose a writable folder.
        </p>
      </div>
      <div class="office-panel-actions">
        <button type="button" @click="cancel">Cancel folder selection</button
        ><button
          type="button"
          class="office-primary"
          :disabled="!canChoose"
          @click="folder && emit('choose', folder, label)"
        >
          Use this folder
        </button>
      </div>
    </footer>
  </dialog>
</template>
