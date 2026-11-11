<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import FolderPicker from '../components/FolderPicker.vue'
import PolicyCreation from '../administration/PolicyCreation.vue'
import type { CreationFormat } from '../administration/creation'
import { defaultPolicy, parsePolicy } from '../administration/policy'
import type { OfficeContext } from '../app/context'
import type { FileRecord } from '../contracts/office'
import { attempt, errorText } from '../services/home'
import { describeFolder } from '../services/folderLabel'
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
const baseline = ref('')
const dirty = computed(() => !!baseline.value && JSON.stringify(draft.value) !== baseline.value)
const formats = ref<CreationFormat[]>([])
const tabs = ['Templates', 'Creation formats', 'Storage'] as const
const tab = ref(0)
function tabKey(event: KeyboardEvent) {
  const next =
    event.key === 'ArrowRight'
      ? (tab.value + 1) % tabs.length
      : event.key === 'ArrowLeft'
        ? (tab.value + tabs.length - 1) % tabs.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : undefined
  if (next === undefined) return
  event.preventDefault()
  tab.value = next
  void nextTick(() => document.getElementById(`admin-tab-${next}`)?.focus())
}
const capabilityLoading = ref(false)
const capabilityError = ref('')
const saveReason = computed(() =>
  !admin?.configured
    ? 'Shared saving is not connected. Changes are an unsaved draft; download it for installation.'
    : !writable.value
      ? 'Your account cannot write this configuration file. Check its OpenCloud permissions.'
      : uncertain.value
        ? 'Save outcome is uncertain. Reload Office and inspect the saved configuration before another change.'
        : dirty.value
          ? 'Unsaved changes apply to everyone after saving and reloading Office.'
          : 'No unsaved changes.'
)
let capabilityRequest = 0
async function refreshCapabilities() {
  const request = ++capabilityRequest
  capabilityLoading.value = true
  capabilityError.value = ''
  const result = await attempt(
    () =>
      props.context.services.creationOptions?.() ??
      Promise.resolve({ ok: false as const, error: 'unsupportedType' as const })
  )
  if (disposed || request !== capabilityRequest) return
  capabilityLoading.value = false
  formats.value = result.ok ? result.value : []
  if (!result.ok)
    capabilityError.value =
      'Creation capabilities could not be loaded. Refresh capabilities to try again.'
}
watch(
  draft,
  () => {
    if (saved.value) notice.value = ''
    saved.value = false
  },
  { deep: true, flush: 'sync' }
)
const heading = ref<HTMLElement>()
const folderButton = ref<HTMLButtonElement>()
const templateFolderLabel = ref('')
const templateFolderError = ref('')
const controller = new AbortController()
let folderRequest = 0
watch(
  () => draft.value.templateFolder,
  async (folder) => {
    const request = ++folderRequest
    templateFolderLabel.value = ''
    templateFolderError.value = ''
    if (!folder) return
    const result = await describeFolder(props.context.services.catalog, folder, controller.signal)
    if (disposed || request !== folderRequest) return
    if (result.ok) templateFolderLabel.value = result.value
    else templateFolderError.value = errorText[result.error]
  }
)
let disposed = false
async function load() {
  if (!permitted.value || !admin) return
  loading.value = true
  revision.value = ''
  writable.value = false
  notice.value = ''
  saved.value = false
  const result = await attempt(() => admin.load())
  if (disposed) return
  loading.value = false
  if (!result.ok) {
    notice.value = errorText[result.error]
    return
  }
  draft.value = result.value.policy
  baseline.value = JSON.stringify(result.value.policy)
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
async function save() {
  if (
    !admin ||
    !permitted.value ||
    !writable.value ||
    !dirty.value ||
    saving.value ||
    uncertain.value
  )
    return
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
  const result = await attempt(() => admin.save(policy, revision.value))
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
  baseline.value = JSON.stringify(result.value.policy)
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
  await Promise.all([load(), refreshCapabilities()])
})
onBeforeUnmount(() => {
  disposed = true
  controller.abort()
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
          <p v-if="admin?.configured && !writable" role="alert">
            This configuration file is read-only for your account. An administrator must check its
            OpenCloud permissions.
          </p>
          <div
            class="office-admin-tabs"
            role="tablist"
            aria-label="Administration sections"
            @keydown="tabKey"
          >
            <button
              v-for="(name, index) in tabs"
              :id="`admin-tab-${index}`"
              :key="name"
              type="button"
              role="tab"
              :aria-selected="tab === index"
              :aria-controls="`admin-panel-${index}`"
              :tabindex="tab === index ? 0 : -1"
              @click="tab = index"
            >
              {{ name }}
            </button>
          </div>
          <fieldset class="office-admin-form" :disabled="saving || uncertain || !revision">
            <div
              id="admin-panel-0"
              v-show="tab === 0"
              role="tabpanel"
              aria-labelledby="admin-tab-0"
              class="office-admin-panel"
            >
              <section class="office-settings-section" aria-labelledby="admin-template-heading">
                <h2 id="admin-template-heading">Installation template default</h2>
                <p>
                  Set the gallery folder for everyone. Personal Settings can override this default
                  only when you allow it below. Users still need read access to the template files.
                </p>
                <p>
                  {{
                    draft.templateFolder
                      ? templateFolderLabel || 'Loading selected template folder…'
                      : 'No default template folder.'
                  }}
                </p>
                <p v-if="templateFolderError" role="alert">{{ templateFolderError }}</p>
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
            </div>
            <div
              id="admin-panel-1"
              v-show="tab === 1"
              role="tabpanel"
              aria-labelledby="admin-tab-1"
              class="office-admin-panel"
            >
              <PolicyCreation
                v-model:draft="draft"
                :formats="formats"
                :loading="capabilityLoading"
                :error="capabilityError"
                :disabled="saving || uncertain"
              />
              <button
                type="button"
                :disabled="saving || capabilityLoading"
                @click="refreshCapabilities"
              >
                Refresh capabilities
              </button>
            </div>
            <div
              id="admin-panel-2"
              v-show="tab === 2"
              role="tabpanel"
              aria-labelledby="admin-tab-2"
              class="office-admin-panel"
            >
              <h2>Shared configuration storage</h2>
              <p>
                Office stores these settings in one OpenCloud file. OpenCloud controls access and
                keeps its version history. Saving checks the file revision to avoid overwriting
                another administrator’s changes.
              </p>
              <div class="office-admin-summary">
                <strong>{{
                  !admin?.configured
                    ? 'Shared saving is not connected'
                    : writable
                      ? 'Shared configuration'
                      : 'Read-only configuration'
                }}</strong>
                <p>{{ saveReason }}</p>
                <details v-if="!admin?.configured">
                  <summary>Installation setup</summary>
                  <p>
                    Connect a dedicated OpenCloud JSON configuration file with read access for users
                    and write access restricted to administrators. Until then, downloading a draft
                    does not apply it. The installation administrator supplies its space and file
                    IDs in the app configuration.
                  </p>
                </details>
              </div>
            </div>
          </fieldset>
          <div class="office-admin-save">
            <p v-if="notice" role="status">{{ notice }}</p>
            <p id="admin-save-state" role="status">{{ saveReason }}</p>
            <div class="office-panel-actions">
              <button
                type="submit"
                aria-describedby="admin-save-state"
                class="office-primary"
                :disabled="!writable || !dirty || saving || uncertain || !revision"
              >
                {{ saving ? 'Saving…' : 'Save configuration' }}</button
              ><button type="button" :disabled="saving || uncertain || !revision" @click="download">
                Download draft</button
              ><button v-if="!uncertain" type="button" :disabled="saving" @click="load">
                {{ dirty ? 'Discard draft and reload' : 'Reload configuration' }}</button
              ><button v-if="saved || uncertain" type="button" @click="reloadOffice">
                Reload Office
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
