<script setup lang="ts">
import { ref, watch } from 'vue'
import { parsePolicy, shortcutHref, type OfficePolicy } from './policy'
defineProps<{ disabled: boolean }>()
const draft = defineModel<OfficePolicy>('draft', { required: true })
const name = ref('')
const url = ref('')
const error = ref('')
watch([name, url], () => (error.value = ''))
function add() {
  try {
    const href = shortcutHref(url.value)
    if (!name.value.trim()) throw new Error('Enter an app name.')
    let id = 'app-1'
    for (let n = 2; draft.value.shortcuts.some((entry) => entry.id === id); n++) id = `app-${n}`
    const next = {
      ...draft.value,
      shortcuts: [...draft.value.shortcuts, { id, label: name.value.trim(), href }]
    }
    draft.value = parsePolicy(next)
    name.value = ''
    url.value = ''
  } catch {
    error.value = 'Enter an app name and an HTTPS URL or local route without credentials.'
  }
}
</script>
<template>
  <section class="office-settings-section" aria-labelledby="admin-apps-heading">
    <h2 id="admin-apps-heading">App shortcuts</h2>
    <p>
      Add links to the Office sidebar. Shortcuts open a new tab and do not receive files or sign-in
      credentials.
    </p>
    <p class="office-muted">
      To use an app as a file editor, install its OpenCloud integration and select it under File
      types and editors below.
    </p>
    <ul class="office-admin-entries">
      <li v-for="(app, index) in draft.shortcuts" :key="app.id" class="office-admin-entry">
        <div>
          <strong>{{ app.label }}</strong>
          <div class="office-muted">{{ app.href }}</div>
          <small>Website shortcut · no file integration</small>
        </div>
        <button
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
      <label
        >App name<input
          v-model="name"
          :disabled="disabled"
          maxlength="80"
          :aria-invalid="!!error"
          :aria-describedby="error ? 'admin-shortcut-error' : undefined"
      /></label>
      <label
        >App URL<input
          v-model="url"
          :disabled="disabled"
          maxlength="2048"
          placeholder="https://example.org/app"
          :aria-invalid="!!error"
          :aria-describedby="error ? 'admin-shortcut-error' : undefined"
      /></label>
      <button type="button" :disabled="disabled || draft.shortcuts.length >= 20" @click="add">
        Add app
      </button>
    </div>
    <p v-if="error" id="admin-shortcut-error" role="alert">{{ error }}</p>
  </section>
</template>
