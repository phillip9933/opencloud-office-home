<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import FolderPicker from './FolderPicker.vue'
import {
  refKey,
  type FileRecord,
  type FileRef,
  type OfficeServices,
  type Template
} from '../contracts/office'
import { attempt } from '../services/errors'
import type { HomeModel } from '../services/home'
const props = defineProps<{
  noun: string
  model: HomeModel
  services: OfficeServices
  destination: string
  preferred?: string
  preferredFolder?: FileRef
}>()
const emit = defineEmits<{ created: [extension: string, folder: FileRef] }>()
const visible = ref(false)
const choosingFolder = ref(false)
const heading = ref<HTMLElement>()
const nameInput = ref<HTMLInputElement>()
const template = ref<Template>()
const name = ref('')
const extension = ref('')
const target = ref<FileRef>()
const targetLabel = ref('')
const targetWritable = ref(false)
const checkingFolder = ref(false)
let opener: HTMLElement | undefined
let lookup: AbortController | undefined
let mounted = true
onBeforeUnmount(() => {
  mounted = false
  lookup?.abort()
})
const state = computed(() => props.model.state)
const canCreate = computed(
  () =>
    !state.value.loading &&
    !state.value.mutation &&
    !state.value.opening &&
    !state.value.uncertain &&
    !!target.value &&
    targetWritable.value &&
    !!extension.value &&
    !!name.value.trim()
)
async function open(choice: Template | undefined, from: HTMLElement) {
  lookup?.abort()
  opener = from
  template.value = choice
  name.value = choice?.name ?? `Untitled ${props.noun}`
  extension.value =
    choice?.format.extension ??
    state.value.formats.find((format) => format.extension === props.preferred)?.extension ??
    state.value.formats[0]?.extension ??
    ''
  target.value = state.value.location.folder ? { ...state.value.location.folder } : undefined
  targetLabel.value = props.destination
  targetWritable.value = state.value.destinationWritable
  const remembered = props.preferredFolder
  const verify = remembered ? new AbortController() : undefined
  lookup = verify
  checkingFolder.value = !!remembered
  if (remembered) {
    if (!target.value || refKey(remembered) !== refKey(target.value)) targetLabel.value = ''
    target.value = { ...remembered }
    targetWritable.value = false
  }
  choosingFolder.value = false
  state.value.notice = ''
  state.value.created = null
  visible.value = true
  await nextTick()
  heading.value?.scrollIntoView({ block: 'nearest' })
  nameInput.value?.select()
  if (!verify || !remembered || verify.signal.aborted) return
  const result = await attempt(() => props.services.catalog.resolve(remembered, verify.signal))
  if (verify.signal.aborted) return
  checkingFolder.value = false
  if (
    !result.ok ||
    result.value.kind !== 'folder' ||
    refKey(result.value.ref) !== refKey(remembered)
  )
    return
  const space = state.value.spaces.find((entry) => entry.id === remembered.spaceId)
  targetLabel.value = [
    space?.name,
    space?.root.itemId === remembered.itemId ? undefined : result.value.name
  ]
    .filter(Boolean)
    .join(' / ')
  targetWritable.value = result.value.access.createChild
}
function escape() {
  if (choosingFolder.value) {
    choosingFolder.value = false
    void nextTick(() => nameInput.value?.focus())
  } else close()
}
function close() {
  if (state.value.mutation) return
  lookup?.abort()
  visible.value = false
  state.value.notice = ''
  choosingFolder.value = false
  opener?.focus()
}
function choose(folder: FileRecord, label: string) {
  lookup?.abort()
  checkingFolder.value = false
  target.value = { ...folder.ref }
  targetLabel.value = label
  targetWritable.value = folder.access.createChild
  choosingFolder.value = false
  void nextTick(() => nameInput.value?.focus())
}
async function submit() {
  if (!canCreate.value || !target.value) return
  const destination = { ...target.value }
  await props.model.create(name.value, extension.value, template.value, destination)
  if (!mounted) return
  if (state.value.created) {
    emit('created', extension.value, destination)
    visible.value = false
  } else if (state.value.uncertain) visible.value = false
}
defineExpose({ open, isOpen: computed(() => visible.value) })
</script>
<template>
  <section
    v-if="visible"
    class="office-create-panel"
    aria-labelledby="create-panel-heading"
    @keydown.esc.stop.prevent="escape"
  >
    <h2 id="create-panel-heading" ref="heading">
      {{ template ? `New from ${template.name}` : `New ${noun}` }}
    </h2>
    <form @submit.prevent="submit">
      <div class="office-create-fields">
        <label
          >Name<input
            ref="nameInput"
            v-model="name"
            maxlength="180"
            :disabled="state.mutation"
            required
        /></label>
        <label v-if="!template && state.formats.length > 1"
          >Format<select v-model="extension" :disabled="state.mutation">
            <option
              v-for="format in state.formats"
              :key="format.extension"
              :value="format.extension"
            >
              {{ format.extension.toUpperCase() }}
            </option>
          </select></label
        >
        <p v-else class="office-muted office-format-label">{{ extension.toUpperCase() }} file</p>
      </div>
      <div class="office-save-location">
        <span
          >Save in
          <strong>{{
            targetLabel || (checkingFolder ? 'Checking folder…' : 'Choose a folder')
          }}</strong></span
        >
        <button
          type="button"
          class="office-link"
          :disabled="state.mutation"
          @click="choosingFolder = !choosingFolder"
        >
          Choose another folder
        </button>
      </div>
      <FolderPicker
        v-if="choosingFolder"
        :catalog="services.catalog"
        title="Choose save folder"
        :start="target"
        writable
        @choose="choose"
        @cancel="choosingFolder = false"
      />
      <p
        v-if="!targetWritable && !checkingFolder && !state.loading && !choosingFolder"
        class="office-muted"
      >
        The save location could not be verified as writable. Choose another folder or reload the
        page.
      </p>
      <p v-if="state.notice" role="status">{{ state.notice }}</p>
      <div class="office-panel-actions">
        <button type="submit" class="office-primary" :disabled="!canCreate">
          {{ state.mutation ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" :disabled="state.mutation" @click="close">Cancel</button>
        <span class="office-muted">Nothing is created until you select Create.</span>
      </div>
    </form>
  </section>
</template>
