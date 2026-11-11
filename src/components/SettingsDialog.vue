<script setup lang="ts">
import { ref } from 'vue'
import type { OfficeContext } from '../app/context'

const props = defineProps<{ context: OfficeContext }>()
const emit = defineEmits<{ clearHistory: [] }>()
const preferences = props.context.preferences
const dialog = ref<HTMLDialogElement>()
const cleared = ref(false)
let opener: HTMLElement | undefined

function open(from: HTMLElement) {
  opener = from
  cleared.value = false
  dialog.value?.showModal()
}
function clear() {
  emit('clearHistory')
  cleared.value = true
}
defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    class="office-dialog"
    aria-labelledby="settings-heading"
    @close="opener?.focus()"
  >
    <form method="dialog">
      <h2 id="settings-heading">Settings</h2>
      <fieldset class="office-settings-group">
        <legend>Template section</legend>
        <label class="office-check">
          <input v-model="preferences.band" type="radio" value="auto" />
          <span>Automatic: cards until you have created a few files, then a single line</span>
        </label>
        <label class="office-check">
          <input v-model="preferences.band" type="radio" value="row" />
          <span>Always show template cards</span>
        </label>
        <label class="office-check">
          <input v-model="preferences.band" type="radio" value="compact" />
          <span>Always a single line</span>
        </label>
      </fieldset>
      <fieldset class="office-settings-group">
        <legend>History</legend>
        <p class="office-muted">
          Files opened in this browser are listed in Recent. Files changed in OpenCloud stay listed
          after clearing.
        </p>
        <button type="button" :disabled="cleared" @click="clear">
          Clear this browser's history
        </button>
        <p v-if="cleared" role="status" class="office-muted">History cleared.</p>
      </fieldset>
      <div class="office-dialog-actions">
        <button type="submit" class="office-primary">Done</button>
      </div>
    </form>
  </dialog>
</template>
