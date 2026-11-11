<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import FolderPicker from './FolderPicker.vue'
import type { FileRecord, FileRef, OfficeServices, Template } from '../contracts/office'
import type { HomeModel } from '../services/home'
const props = defineProps<{
  noun: string
  model: HomeModel
  services: OfficeServices
  destination: string
  preferred?: string
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
let opener: HTMLElement | undefined
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
  choosingFolder.value = false
  state.value.notice = ''
  state.value.created = null
  visible.value = true
  await nextTick()
  heading.value?.scrollIntoView({ block: 'nearest' })
  nameInput.value?.select()
}
function escape() {
  if (choosingFolder.value) {
    choosingFolder.value = false
    void nextTick(() => nameInput.value?.focus())
  } else close()
}
function close() {
  if (state.value.mutation) return
  visible.value = false
  state.value.notice = ''
  choosingFolder.value = false
  opener?.focus()
}
function choose(folder: FileRecord, label: string) {
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
          >Save in <strong>{{ targetLabel || 'Choose a folder' }}</strong></span
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
      <p v-if="!targetWritable && !state.loading && !choosingFolder" class="office-muted">
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
