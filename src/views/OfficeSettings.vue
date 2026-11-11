<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import FolderPicker from '../components/FolderPicker.vue'
import type { OfficeContext } from '../app/context'
import type { FileRecord } from '../contracts/office'
import { errorText } from '../services/errors'
import { describeFolder as describeFolderLabel } from '../services/folderLabel'
const props = defineProps<{ context: OfficeContext }>()
const preferences = props.context.preferences
const choosingFolder = ref(false)
const folderLabel = ref('')
const folderError = ref('')
const heading = ref<HTMLElement>()
const lastKind = preferences.lastKind
const lastView = props.context.lastView.get(lastKind)
let revision = 0
const controller = new AbortController()
onBeforeUnmount(() => {
  revision++
  controller.abort()
})
async function describeFolder() {
  const request = ++revision
  folderError.value = ''
  folderLabel.value = ''
  const selected =
    props.context.services.configuration?.allowPersonalTemplates === false
      ? props.context.services.configuration?.templateFolder
      : (preferences.templateFolder ?? props.context.services.configuration?.templateFolder)
  if (!selected) return
  const result = await describeFolderLabel(
    props.context.services.catalog,
    selected,
    controller.signal
  )
  if (request !== revision) return
  if (result.ok) folderLabel.value = result.value
  else folderError.value = errorText[result.error]
}
function chooseTemplateFolder(folder: FileRecord, label: string) {
  if (props.context.services.configuration?.allowPersonalTemplates === false) return
  revision++
  preferences.templateFolder = { ...folder.ref }
  folderLabel.value = label
  folderError.value = ''
  choosingFolder.value = false
}
async function useDefault() {
  delete preferences.templateFolder
  await describeFolder()
}
onMounted(async () => {
  await nextTick()
  heading.value?.focus()
  await describeFolder()
})
</script>
<template>
  <div class="office">
    <AppSidebar kind="settings" :context="context">Office</AppSidebar>
    <main class="office-main">
      <div class="office-inner office-settings-page">
        <div class="office-page-heading">
          <h1 ref="heading" tabindex="-1">Settings</h1>
          <RouterLink
            :to="{ name: `office-${lastKind}`, query: lastView ? { view: lastView } : {} }"
            class="office-link"
            >Back to
            {{
              lastKind === 'docs' ? 'Docs' : lastKind === 'sheets' ? 'Sheets' : 'Slides'
            }}</RouterLink
          >
        </div>
        <section class="office-settings-section" aria-labelledby="template-settings-heading">
          <h2 id="template-settings-heading">Personal template folder</h2>
          <p>
            This optional override changes only your gallery in this browser. It does not change the
            installation default in the app configuration. Files at the folder root appear under
            General; subfolders become categories.
          </p>
          <p>
            <strong
              >{{
                context.services.configuration?.allowPersonalTemplates !== false &&
                preferences.templateFolder
                  ? 'Your template folder'
                  : 'Installation default'
              }}:</strong
            >
            {{ folderLabel || 'No folder selected' }}
          </p>
          <p v-if="folderError" role="alert">{{ folderError }}</p>
          <p
            v-if="context.services.configuration?.allowPersonalTemplates === false"
            class="office-muted"
          >
            Your administrator manages the template folder for this installation.
          </p>
          <div v-else class="office-panel-actions">
            <button type="button" @click="choosingFolder = !choosingFolder">
              Choose template folder
            </button>
            <button v-if="preferences.templateFolder" type="button" @click="useDefault">
              Use installation default
            </button>
          </div>
          <FolderPicker
            v-if="
              choosingFolder && context.services.configuration?.allowPersonalTemplates !== false
            "
            :catalog="context.services.catalog"
            title="Choose template folder"
            :start="preferences.templateFolder ?? context.services.configuration?.templateFolder"
            @choose="chooseTemplateFolder"
            @cancel="choosingFolder = false"
          />
          <p class="office-muted">
            <span v-if="context.services.configuration?.allowPersonalTemplates !== false"
              >Your choice applies to Docs, Sheets and Slides in this browser.</span
            >
            An administrator can configure an installation default for all users. Choose ordinary
            editable documents for templates; template-container conversion is not available in this
            test build.
          </p>
          <fieldset class="office-settings-group">
            <legend>Template section display</legend>
            <label class="office-check"
              ><input v-model="preferences.band" type="radio" value="auto" /><span
                >Automatic: cards first, then a compact section after a few files</span
              ></label
            >
            <label class="office-check"
              ><input v-model="preferences.band" type="radio" value="row" /><span
                >Always show template cards</span
              ></label
            >
            <label class="office-check"
              ><input v-model="preferences.band" type="radio" value="compact" /><span
                >Start collapsed</span
              ></label
            >
          </fieldset>
        </section>
      </div>
    </main>
  </div>
</template>
