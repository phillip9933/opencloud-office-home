<script setup lang="ts">
import { ref } from 'vue'
import type { OfficeKind } from '../contracts/office'
import { shortcutHref, type OfficePolicy } from './policy'
defineProps<{ disabled: boolean }>()
const draft = defineModel<OfficePolicy>('draft', { required: true })
const shortcutLabel = ref('')
const shortcutUrl = ref('')
const family = ref<OfficeKind>('docs')
const extension = ref('')
const mimeType = ref('')
const error = ref('')
function addShortcut() {
  try {
    const href = shortcutHref(shortcutUrl.value)
    if (!shortcutLabel.value.trim()) throw new Error('Enter an app name.')
    let id = 'app-1'
    for (let n = 2; draft.value.shortcuts.some((entry) => entry.id === id); n++) id = `app-${n}`
    draft.value.shortcuts.push({ id, label: shortcutLabel.value.trim(), href })
    shortcutLabel.value = ''
    shortcutUrl.value = ''
    error.value = ''
  } catch {
    error.value = 'Enter an app name and an HTTPS URL or local route without credentials.'
  }
}
function addFormat() {
  if (
    !/^[a-z0-9]{1,12}$/.test(extension.value) ||
    !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(mimeType.value)
  ) {
    error.value = 'Enter a lowercase extension without a dot and a valid MIME type.'
    return
  }
  const formats = draft.value.additionalFormats[family.value] ?? []
  formats.push({ extension: extension.value, mimeType: mimeType.value })
  draft.value.additionalFormats[family.value] = formats
  extension.value = ''
  mimeType.value = ''
  error.value = ''
}
</script>
<template>
  <section class="office-settings-section" aria-labelledby="admin-apps-heading">
    <h2 id="admin-apps-heading">Additional apps</h2>
    <p>
      Add approved website shortcuts. Each opens in a new tab without sending file details or
      session credentials.
    </p>
    <ul class="office-admin-entries">
      <li v-for="(app, index) in draft.shortcuts" :key="app.id">
        <span>{{ app.label }} · {{ app.href }}</span
        ><button
          type="button"
          :disabled="disabled"
          :aria-label="`Remove ${app.label}`"
          @click="draft.shortcuts.splice(index, 1)"
        >
          Remove
        </button>
      </li>
    </ul>
    <div class="office-admin-fields">
      <label>App name<input v-model="shortcutLabel" :disabled="disabled" maxlength="80" /></label>
      <label
        >App URL<input
          v-model="shortcutUrl"
          :disabled="disabled"
          maxlength="2048"
          placeholder="https://example.org/app"
      /></label>
      <button
        type="button"
        :disabled="disabled || draft.shortcuts.length >= 20"
        @click="addShortcut"
      >
        Add app
      </button>
    </div>
  </section>
  <section class="office-settings-section" aria-labelledby="admin-formats-heading">
    <h2 id="admin-formats-heading">Additional file types</h2>
    <p>
      Include other types in a landing page. Creation is offered only when OpenCloud also advertises
      a provider that can create the type.
    </p>
    <div v-for="kind in ['docs', 'sheets', 'slides'] as const" :key="kind">
      <ul class="office-admin-entries">
        <li v-for="(format, index) in draft.additionalFormats[kind] ?? []" :key="format.extension">
          <span>{{ kind }} · .{{ format.extension }} · {{ format.mimeType }}</span
          ><button
            type="button"
            :disabled="disabled"
            :aria-label="`Remove ${kind} ${format.extension}`"
            @click="draft.additionalFormats[kind]?.splice(index, 1)"
          >
            Remove
          </button>
        </li>
      </ul>
    </div>
    <div class="office-admin-fields">
      <label
        >Landing page<select v-model="family" :disabled="disabled">
          <option value="docs">Docs</option>
          <option value="sheets">Sheets</option>
          <option value="slides">Slides</option>
        </select></label
      >
      <label
        >Extension<input v-model="extension" :disabled="disabled" maxlength="12" placeholder="txt"
      /></label>
      <label
        >MIME type<input
          v-model="mimeType"
          :disabled="disabled"
          maxlength="150"
          placeholder="text/plain"
      /></label>
      <button type="button" :disabled="disabled" @click="addFormat">Add file type</button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
  <section class="office-settings-section" aria-labelledby="admin-handlers-heading">
    <h2 id="admin-handlers-heading">File handlers</h2>
    <p>
      Choose an installed OpenCloud file action for an extension and MIME type. An unavailable
      action reports an error instead of opening a different editor. Websites need a supported
      OpenCloud integration before they can act as file editors.
    </p>
    <div v-for="(handler, index) in draft.handlers" :key="index" class="office-admin-fields">
      <label
        >Handler extension<input v-model="handler.extension" :disabled="disabled" maxlength="12"
      /></label>
      <label
        >Handler MIME type<input v-model="handler.mimeType" :disabled="disabled" maxlength="150"
      /></label>
      <label
        >Native action ID<input v-model="handler.action" :disabled="disabled" maxlength="150"
      /></label>
      <button
        type="button"
        :disabled="disabled"
        :aria-label="`Remove handler ${index + 1}`"
        @click="draft.handlers.splice(index, 1)"
      >
        Remove
      </button>
    </div>
    <button
      type="button"
      :disabled="disabled || draft.handlers.length >= 50"
      @click="draft.handlers.push({ extension: '', mimeType: '', action: '' })"
    >
      Add file handler
    </button>
  </section>
</template>
