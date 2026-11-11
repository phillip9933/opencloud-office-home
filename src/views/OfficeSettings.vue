<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import FolderPicker from '../components/FolderPicker.vue'
import type { OfficeContext } from '../app/context'
import type { FileRecord } from '../contracts/office'
import { attempt, errorText } from '../services/home'
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
    props.context.services.policy?.allowPersonalTemplates === false
      ? props.context.services.templateFolderDefault
      : (preferences.templateFolder ?? props.context.services.templateFolderDefault)
  if (!selected) return
  const spaces = await attempt(() => props.context.services.catalog.listSpaces(controller.signal))
  if (request !== revision) return
  if (!spaces.ok) {
    folderError.value = errorText[spaces.error]
    return
  }
  const folder = await attempt(() => props.context.services.catalog.resolve(selected))
  if (request !== revision) return
  if (!folder.ok) {
    folderError.value = errorText[folder.error]
    return
  }
  const space = spaces.value.find((value) => value.id === selected.spaceId)
  const root = space?.root.itemId === selected.itemId
  folderLabel.value = [
    space?.name,
    root ? undefined : (folder.value.path ?? folder.value.name).replace(/^\/+/, '')
  ]
    .filter(Boolean)
    .join(' / ')
}
function chooseTemplateFolder(folder: FileRecord, label: string) {
  if (props.context.services.policy?.allowPersonalTemplates === false) return
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
          <h2 id="template-settings-heading">Templates</h2>
          <p>
            Choose an OpenCloud folder for your template gallery. Files at its root appear under
            General; subfolders become categories.
          </p>
          <p>
            <strong
              >{{
                context.services.policy?.allowPersonalTemplates !== false &&
                preferences.templateFolder
                  ? 'Your template folder'
                  : 'Installation default'
              }}:</strong
            >
            {{ folderLabel || 'No folder selected' }}
          </p>
          <p v-if="folderError" role="alert">{{ folderError }}</p>
          <p v-if="context.services.policy?.allowPersonalTemplates === false" class="office-muted">
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
            v-if="choosingFolder && context.services.policy?.allowPersonalTemplates !== false"
            :catalog="context.services.catalog"
            title="Choose template folder"
            :start="preferences.templateFolder ?? context.services.templateFolderDefault"
            @choose="chooseTemplateFolder"
            @cancel="choosingFolder = false"
          />
          <p class="office-muted">
            <span v-if="context.services.policy?.allowPersonalTemplates !== false"
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
