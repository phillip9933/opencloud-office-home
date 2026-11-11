<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Format, OfficeKind } from '../contracts/office'
import { parsePolicy, policyApplications, type OfficePolicy } from './policy'
import { formatKey, matchingEditors, type IntegrationDirectory } from './integrations'
const props = defineProps<{
  disabled: boolean
  directory: IntegrationDirectory
  loading: boolean
  error: string
}>()
const draft = defineModel<OfficePolicy>('draft', { required: true })
const family = ref<OfficeKind>('docs')
const selected = ref('')
const extension = ref('')
const mimeType = ref('')
const validation = ref('')
const families = computed(() => policyApplications(draft.value))
const available = computed(() =>
  props.directory.formats.filter(
    (format) =>
      !families.value
        .find((app) => app.id === family.value)!
        .formats.some((existing) =>
          format.extension
            ? existing.extension === format.extension
            : existing.mimeType === format.mimeType
        )
  )
)
const selectedFormat = computed(() =>
  available.value.find((format) => formatKey(format) === selected.value)
)
watch([family, selected, extension, mimeType], () => (validation.value = ''))
watch(family, () => {
  selected.value = ''
})
watch(selected, () => {
  extension.value = ''
  mimeType.value = ''
})
const unassigned = computed(() =>
  draft.value.handlers.filter(
    (handler) =>
      !families.value.some((app) =>
        app.formats.some((format) => formatKey(format) === formatKey(handler))
      )
  )
)
const preference = (format: Format) =>
  draft.value.handlers.find((handler) => formatKey(handler) === formatKey(format))?.action ?? ''
function assign(format: Format, action: string) {
  if (
    action &&
    !matchingEditors(props.directory, format).some((editor) => editor.action === action)
  )
    return
  draft.value.handlers = draft.value.handlers.filter(
    (handler) => formatKey(handler) !== formatKey(format)
  )
  if (action) draft.value.handlers.push({ ...format, action })
}
function add() {
  try {
    const format =
      selected.value === 'custom'
        ? {
            extension: extension.value.trim().replace(/^\./, '').toLowerCase(),
            mimeType: mimeType.value.trim().toLowerCase()
          }
        : selectedFormat.value
          ? {
              ...selectedFormat.value,
              extension:
                selectedFormat.value.extension ||
                extension.value.trim().replace(/^\./, '').toLowerCase()
            }
          : undefined
    if (!format) throw new Error('Choose a backend file type or enter a custom type.')
    const next = {
      ...draft.value,
      additionalFormats: {
        ...draft.value.additionalFormats,
        [family.value]: [
          ...(draft.value.additionalFormats[family.value] ?? []),
          { extension: format.extension, mimeType: format.mimeType }
        ]
      }
    }
    draft.value = parsePolicy(next)
    selected.value = ''
    extension.value = ''
    mimeType.value = ''
  } catch (error) {
    validation.value = error instanceof Error ? error.message : 'Check the file type.'
  }
}
function remove(kind: OfficeKind, format: Format) {
  draft.value.additionalFormats[kind] = draft.value.additionalFormats[kind]?.filter(
    (entry) => formatKey(entry) !== formatKey(format)
  )
  if (draft.value.creationFormats[kind])
    draft.value.creationFormats[kind] = draft.value.creationFormats[kind]!.filter(
      (ext) => ext !== format.extension
    )
  if (
    !policyApplications(draft.value).some((app) =>
      app.formats.some((entry) => formatKey(entry) === formatKey(format))
    )
  )
    assign(format, '')
}
</script>
<template>
  <section class="office-settings-section" aria-labelledby="admin-formats-heading">
    <h2 id="admin-formats-heading">File types and editors</h2>
    <p>
      Choose which landing page shows a type and which installed app opens it. OpenCloud still
      checks access and editor support for each file.
    </p>
    <p v-if="loading" role="status">Loading installed integrations…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <div v-for="app in families" :key="app.id" class="office-settings-group">
      <h3>{{ app.label }}</h3>
      <ul class="office-admin-entries">
        <li v-for="format in app.formats" :key="formatKey(format)" class="office-admin-entry">
          <div class="office-admin-type">
            <strong>.{{ format.extension }}</strong
            ><small class="office-muted">{{ format.mimeType }}</small>
          </div>
          <label class="office-editor-choice"
            ><span>Open with</span>
            <select
              :aria-label="`Editor for ${app.label} ${format.extension.toUpperCase()}`"
              :value="preference(format)"
              :disabled="disabled || loading || !!error"
              @change="assign(format, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">OpenCloud default</option>
              <option
                v-for="editor in matchingEditors(directory, format)"
                :key="editor.action"
                :value="editor.action"
              >
                {{ editor.label }}
              </option>
              <option
                v-if="
                  preference(format) &&
                  !matchingEditors(directory, format).some(
                    (editor) => editor.action === preference(format)
                  )
                "
                :value="preference(format)"
                disabled
              >
                Previously configured editor unavailable
              </option>
            </select>
            <small v-if="!matchingEditors(directory, format).length"
              >No matching editor is registered.</small
            >
          </label>
          <button
            v-if="
              draft.additionalFormats[app.id]?.some(
                (entry) => formatKey(entry) === formatKey(format)
              )
            "
            type="button"
            :disabled="disabled"
            :aria-label="`Remove ${app.id} ${format.extension}`"
            @click="remove(app.id as OfficeKind, format)"
          >
            Remove
          </button>
        </li>
      </ul>
    </div>
    <div v-if="unassigned.length">
      <h3>Mappings outside these pages</h3>
      <p class="office-muted">
        These saved preferences are retained. Add their file type to a page to choose its editor, or
        remove the preference.
      </p>
      <ul class="office-admin-entries">
        <li v-for="handler in unassigned" :key="formatKey(handler)">
          <span>.{{ handler.extension }} · {{ handler.mimeType }}</span
          ><button
            type="button"
            :disabled="disabled"
            :aria-label="`Remove mapping ${handler.extension}`"
            @click="assign(handler, '')"
          >
            Remove mapping
          </button>
        </li>
      </ul>
    </div>
    <h3>Add a file type</h3>
    <div class="office-admin-fields">
      <label
        >Landing page<select v-model="family" :disabled="disabled">
          <option value="docs">Docs</option>
          <option value="sheets">Sheets</option>
          <option value="slides">Slides</option>
        </select></label
      >
      <label
        >Backend file type<select
          v-model="selected"
          :disabled="disabled || loading"
          :aria-invalid="!!validation"
          :aria-describedby="validation ? 'admin-format-error' : undefined"
        >
          <option value="">Choose a type…</option>
          <option v-for="format in available" :key="formatKey(format)" :value="formatKey(format)">
            {{ format.extension ? `${format.extension.toUpperCase()} · ` : '' }}{{ format.label }} ·
            {{ format.providers.join(', ') }}
          </option>
          <option value="custom">Custom type…</option>
        </select></label
      >
    </div>
    <div
      v-if="selected === 'custom' || selectedFormat?.extension === ''"
      class="office-admin-fields"
    >
      <label
        >Extension<input v-model="extension" :disabled="disabled" maxlength="12" placeholder="txt"
      /></label>
      <label v-if="selected === 'custom'"
        >MIME type<input
          v-model="mimeType"
          :disabled="disabled"
          maxlength="150"
          placeholder="text/plain"
      /></label>
    </div>
    <p v-if="selectedFormat?.extension === ''" class="office-muted">
      The backend advertises this MIME type without an extension. Enter the extension to use on this
      page.
    </p>
    <button type="button" :disabled="disabled || !selected" @click="add">Add file type</button>
    <p v-if="validation" id="admin-format-error" role="alert">{{ validation }}</p>
    <p class="office-muted">
      A custom type changes discovery only. It cannot install an editor or enable creation that the
      backend does not support. Website shortcuts do not appear as editors.
    </p>
  </section>
</template>
