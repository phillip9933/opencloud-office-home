<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { OcButton } from '@opencloud-eu/design-system/components'
import type { FileRef, Template } from '../contracts/office'
import type { HomeModel } from '../services/home'

const props = defineProps<{
  noun: string
  model: HomeModel
  destination: string
  // The format of the user's last created file, used when it is still creatable.
  preferred?: string
}>()
const emit = defineEmits<{ chooseFolder: []; created: [extension: string, folder: FileRef] }>()
const dialog = ref<HTMLDialogElement>()
const nameInput = ref<HTMLInputElement>()
const template = ref<Template>()
const name = ref('')
const extension = ref('')
let opener: HTMLElement | undefined
const state = computed(() => props.model.state)

async function open(choice: Template | undefined, from: HTMLElement) {
  opener = from
  template.value = choice
  name.value = choice?.name ?? `Untitled ${props.noun}`
  extension.value =
    choice?.format.extension ??
    state.value.formats.find((format) => format.extension === props.preferred)?.extension ??
    state.value.formats[0]?.extension ??
    ''
  state.value.notice = ''
  dialog.value?.showModal()
  await nextTick()
  nameInput.value?.select()
}
function close() {
  dialog.value?.close()
}
function restoreFocus() {
  opener?.focus()
}
async function submit() {
  const folder = state.value.location.folder && { ...state.value.location.folder }
  const chosen = extension.value
  await props.model.create(name.value, chosen, template.value)
  if (state.value.created && folder) emit('created', chosen, folder)
  // Keep the dialog for fixable problems; close once a file exists or the outcome is uncertain.
  if (state.value.created || state.value.uncertain) close()
}
function chooseFolder() {
  opener = undefined
  close()
  emit('chooseFolder')
}
defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    class="office-dialog"
    aria-labelledby="create-dialog-heading"
    @close="restoreFocus"
  >
    <form method="dialog" @submit.prevent="submit">
      <h2 id="create-dialog-heading">
        {{ template ? `New from ${template.name}` : `New blank ${noun}` }}
      </h2>
      <label
        >Name<input
          ref="nameInput"
          v-model="name"
          maxlength="180"
          :disabled="state.mutation"
          required
      /></label>
      <label v-if="!template"
        >Format
        <select v-model="extension" :disabled="state.mutation || !state.formats.length">
          <option v-if="!state.formats.length" value="">Unavailable</option>
          <option v-for="format in state.formats" :key="format.extension" :value="format.extension">
            {{ format.extension.toUpperCase() }}
          </option>
        </select>
      </label>
      <p v-else class="office-muted">Format: {{ template.format.extension.toUpperCase() }}</p>
      <div class="office-dialog-location">
        <p>
          Save in <strong>{{ destination }}</strong>
        </p>
        <button type="button" class="office-link" @click="chooseFolder">
          Choose another folder
        </button>
      </div>
      <p v-if="!state.destinationWritable && !state.loading" class="office-muted">
        You can't create files in this folder. Choose another folder.
      </p>
      <p v-if="state.notice" role="status" class="office-notice">{{ state.notice }}</p>
      <div class="office-dialog-actions">
        <button type="button" :disabled="state.mutation" @click="close">Cancel</button>
        <OcButton
          class="office-primary"
          submit="submit"
          :disabled="
            !state.destinationWritable ||
            !extension ||
            state.mutation ||
            state.opening ||
            state.uncertain
          "
        >
          {{ state.mutation ? 'Creating…' : 'Create' }}
        </OcButton>
      </div>
    </form>
  </dialog>
</template>
