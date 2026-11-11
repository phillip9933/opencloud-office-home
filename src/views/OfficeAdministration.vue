<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import FolderPicker from '../components/FolderPicker.vue'
import PolicyIntegrations from '../administration/PolicyIntegrations.vue'
import { defaultPolicy, parsePolicy, policyApplications } from '../administration/policy'
import type { OfficeContext } from '../app/context'
import type { FileRecord } from '../contracts/office'
import { errorText } from '../services/home'
const props = defineProps<{ context: OfficeContext }>()
const admin = props.context.services.administration
const permitted = computed(() => admin?.permitted() === true)
const draft = ref(defaultPolicy())
const revision = ref('')
const writable = ref(false)
const loading = ref(false)
const saving = ref(false)
const uncertain = ref(false)
const choosing = ref(false)
const notice = ref('')
const saved = ref(false)
const heading = ref<HTMLElement>()
const folderButton = ref<HTMLButtonElement>()
let disposed = false
const families = computed(() => policyApplications(draft.value))
async function load() {
  if (!permitted.value || !admin) return
  loading.value = true
  notice.value = ''
  saved.value = false
  const result = await admin.load()
  if (disposed) return
  loading.value = false
  if (!result.ok) {
    notice.value = errorText[result.error]
    return
  }
  draft.value = result.value.policy
  revision.value = result.value.revision
  writable.value = result.value.writable
}
function choose(folder: FileRecord) {
  draft.value.templateFolder = { ...folder.ref }
  void closePicker()
}
async function closePicker() {
  choosing.value = false
  await nextTick()
  folderButton.value?.focus()
}
function escapePicker(event: KeyboardEvent) {
  if (!choosing.value) return
  event.preventDefault()
  event.stopPropagation()
  void closePicker()
}
function creationChoice(kind: 'docs' | 'sheets' | 'slides', extension: string, checked: boolean) {
  const values =
    draft.value.creationFormats[kind] ??
    families.value.find((app) => app.id === kind)!.formats.map((format) => format.extension)
  draft.value.creationFormats[kind] = checked
    ? [...new Set([...values, extension])]
    : values.filter((value) => value !== extension)
}
async function save() {
  if (!admin || !permitted.value || !writable.value || saving.value || uncertain.value) return
  let policy
  try {
    policy = parsePolicy(draft.value)
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Check the configuration.'
    return
  }
  saving.value = true
  notice.value = ''
  saved.value = false
  const result = await admin.save(policy, revision.value)
  if (disposed) return
  saving.value = false
  if (!result.ok) {
    uncertain.value = ['timeout', 'network', 'unknown'].includes(result.error)
    notice.value =
      result.error === 'conflict'
        ? 'Configuration changed elsewhere. Reload it and review your changes before saving again.'
        : uncertain.value
          ? 'Save outcome is uncertain. Reload Office and inspect the saved configuration before making another change.'
          : errorText[result.error]
    return
  }
  draft.value = result.value.policy
  revision.value = result.value.revision
  writable.value = result.value.writable
  saved.value = true
  notice.value = 'Configuration saved. Reload Office to apply it.'
}
function download() {
  try {
    const content = JSON.stringify(parsePolicy(draft.value), null, 2) + '\n'
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'office-home.settings.json'
    anchor.click()
    URL.revokeObjectURL(url)
    notice.value = 'Configuration downloaded. It has not been installed or applied.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Check the configuration.'
  }
}
function reloadOffice() {
  window.location.reload()
}
onMounted(async () => {
  await nextTick()
  heading.value?.focus()
  await load()
})
onBeforeUnmount(() => {
  disposed = true
})
</script>
<template>
  <div class="office">
    <AppSidebar kind="admin" :context="context">Office</AppSidebar>
    <main class="office-main">
      <div class="office-inner office-settings-page">
        <div class="office-page-heading">
          <h1 ref="heading" tabindex="-1">Administration</h1>
          <RouterLink :to="{ name: 'office-settings' }" class="office-link"
            >Personal settings</RouterLink
          >
        </div>
        <p v-if="!permitted" role="alert">
          Office administration requires OpenCloud settings-management permission.
        </p>
        <p v-else-if="loading" role="status">Loading configuration…</p>
        <form v-else @submit.prevent="save" @keydown.esc="escapePicker">
          <p v-if="!admin?.configured" role="status">
            Configuration-file setup is required before changes can be saved for everyone. You can
            prepare and download a configuration below.
          </p>
          <p v-else-if="!writable" role="alert">
            This configuration file is read-only for your account. An administrator must check its
            OpenCloud permissions.
          </p>
          <fieldset class="office-admin-form" :disabled="saving || uncertain || !revision">
            <section class="office-settings-section" aria-labelledby="admin-template-heading">
              <h2 id="admin-template-heading">Shared templates</h2>
              <p>
                Choose the installation template folder. Users need permission to read its files.
              </p>
              <p>
                {{
                  draft.templateFolder
                    ? 'A default template folder is configured.'
                    : 'No default template folder.'
                }}
              </p>
              <div class="office-panel-actions">
                <button ref="folderButton" type="button" @click="choosing = !choosing">
                  Choose default template folder</button
                ><button
                  v-if="draft.templateFolder"
                  type="button"
                  @click="delete draft.templateFolder"
                >
                  Remove template default
                </button>
              </div>
              <FolderPicker
                v-if="choosing"
                :catalog="context.services.catalog"
                title="Choose installation template folder"
                :start="draft.templateFolder"
                @choose="choose"
                @cancel="closePicker"
              />
              <label class="office-check"
                ><input v-model="draft.allowPersonalTemplates" type="checkbox" /><span
                  >Allow users to choose a personal template folder</span
                ></label
              >
            </section>
            <PolicyIntegrations v-model:draft="draft" :disabled="saving || uncertain" />
            <section class="office-settings-section" aria-labelledby="admin-create-heading">
              <h2 id="admin-create-heading">Allowed creation formats</h2>
              <p>
                Restrict the formats shown in each page. OpenCloud’s provider registry must also
                allow creation.
              </p>
              <fieldset v-for="app in families" :key="app.id" class="office-settings-group">
                <legend>{{ app.label }}</legend>
                <label v-for="format in app.formats" :key="format.extension" class="office-check"
                  ><input
                    type="checkbox"
                    :checked="
                      !draft.creationFormats[app.id as 'docs' | 'sheets' | 'slides'] ||
                      draft.creationFormats[app.id as 'docs' | 'sheets' | 'slides']?.includes(
                        format.extension
                      )
                    "
                    @change="
                      creationChoice(
                        app.id as 'docs' | 'sheets' | 'slides',
                        format.extension,
                        ($event.target as HTMLInputElement).checked
                      )
                    "
                  /><span>{{ format.extension.toUpperCase() }}</span></label
                >
              </fieldset>
            </section>
          </fieldset>
          <p v-if="notice" role="status">{{ notice }}</p>
          <div class="office-panel-actions">
            <button
              type="submit"
              class="office-primary"
              :disabled="!writable || saving || uncertain || !revision"
            >
              {{ saving ? 'Saving…' : 'Save configuration' }}</button
            ><button type="button" :disabled="saving || uncertain || !revision" @click="download">
              Download configuration</button
            ><button v-if="!uncertain" type="button" :disabled="saving" @click="load">
              Reload configuration</button
            ><button v-if="saved || uncertain" type="button" @click="reloadOffice">
              Reload Office
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
