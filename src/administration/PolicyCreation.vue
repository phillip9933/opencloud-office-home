<script setup lang="ts">
import { computed } from 'vue'
import type { OfficeKind } from '../contracts/office'
import type { OfficePolicy } from './policy'
import { officeApps } from '../app/registry'
import { formatKey, type CreationFormat } from './creation'
const props = defineProps<{
  formats: CreationFormat[]
  loading: boolean
  error: string
  disabled: boolean
}>()
const draft = defineModel<OfficePolicy>('draft', { required: true })
const families = computed(() =>
  officeApps.map((app) => ({
    ...app,
    formats: app.formats.flatMap((candidate) => {
      const advertised = props.formats.find(
        (format) =>
          format.canCreate &&
          format.mimeType === candidate.mimeType &&
          (!format.extension || format.extension === candidate.extension)
      )
      return advertised ? [{ ...advertised, extension: candidate.extension }] : []
    })
  }))
)
function choose(kind: OfficeKind, extension: string, checked: boolean) {
  const values =
    draft.value.creationFormats[kind] ??
    families.value.find((app) => app.id === kind)!.formats.map((format) => format.extension)
  draft.value.creationFormats[kind] = checked
    ? [...new Set([...values, extension])]
    : values.filter((value) => value !== extension)
}
</script>
<template>
  <section class="office-settings-section" aria-labelledby="admin-create-heading">
    <h2 id="admin-create-heading">Creation formats</h2>
    <p>
      These choices come from OpenCloud’s backend and its configured providers. Uncheck a supported
      format to hide it in Office. Only formats supported by your installed office integration are
      offered.
    </p>
    <p v-if="loading" role="status">Loading backend creation capabilities…</p>
    <p v-else-if="error" role="alert">
      Creation capabilities could not be loaded. Refresh capabilities to try again.
    </p>
    <template v-else>
      <fieldset
        v-for="app in families"
        :key="app.id"
        class="office-settings-group"
        :disabled="disabled"
      >
        <legend>{{ app.label }}</legend>
        <p v-if="!app.formats.length" class="office-muted">
          No creation formats are advertised for the file types on this page.
        </p>
        <label v-for="format in app.formats" :key="formatKey(format)" class="office-check"
          ><input
            type="checkbox"
            :aria-label="format.extension.toUpperCase()"
            :checked="
              !draft.creationFormats[app.id as OfficeKind] ||
              draft.creationFormats[app.id as OfficeKind]?.includes(format.extension)
            "
            @change="
              choose(
                app.id as OfficeKind,
                format.extension,
                ($event.target as HTMLInputElement).checked
              )
            "
          /><span
            >{{ format.extension.toUpperCase() }}
            <small class="office-muted">{{ format.providers.join(', ') }}</small></span
          ></label
        >
        <p
          v-if="
            draft.creationFormats[app.id as OfficeKind]?.some(
              (extension) => !app.formats.some((format) => format.extension === extension)
            )
          "
          class="office-muted"
        >
          Some saved choices are currently unavailable in the backend. They remain saved but are not
          offered for creation.
        </p>
        <button
          v-if="draft.creationFormats[app.id as OfficeKind]"
          type="button"
          :aria-label="`Use backend defaults for ${app.label}`"
          @click="delete draft.creationFormats[app.id as OfficeKind]"
        >
          Use backend defaults
        </button>
      </fieldset>
    </template>
  </section>
</template>
