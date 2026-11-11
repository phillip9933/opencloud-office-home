<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSidebar from '../components/AppSidebar.vue'
import CreateDialog from '../components/CreateDialog.vue'
import FileBrowser from '../components/FileBrowser.vue'
import RecentFiles from '../components/RecentFiles.vue'
import SettingsDialog from '../components/SettingsDialog.vue'
import TemplateStrip from '../components/TemplateStrip.vue'
import { officeApps } from '../app/registry'
import type { OfficeContext } from '../app/context'
import type { FileRecord, FileRef, HomeLocation, OfficeKind, Template } from '../contracts/office'
import { defaultLocation, type FileMenuAction, type HomeModel } from '../services/home'

const props = defineProps<{ kind: OfficeKind; context: OfficeContext }>()
const route = useRoute()
const router = useRouter()
const descriptor = computed(() => officeApps.find((app) => app.id === props.kind)!)
const model = computed(() => props.context.model(props.kind))
const state = computed(() => model.value.state)
const nouns: Record<OfficeKind, string> = {
  docs: 'document',
  sheets: 'spreadsheet',
  slides: 'presentation'
}
const browseOpen = ref(false)
const createDialog = ref<InstanceType<typeof CreateDialog>>()
const browser = ref<InstanceType<typeof FileBrowser>>()
const viewport = ref<HTMLElement>()
const settings = ref<InstanceType<typeof SettingsDialog>>()
const heading = ref<HTMLHeadingElement>()
let activeModel: HomeModel | undefined
let navigation = 0
let rememberedView: string | undefined

function snapshot(): HomeLocation {
  return {
    ...structuredClone(toRaw(state.value.location)),
    scroll: viewport.value?.scrollTop ?? 0
  }
}
function persist() {
  const id =
    typeof route.query.view === 'string' ? route.query.view : props.context.lastView.get(props.kind)
  if (id) props.context.views.set(id, snapshot())
}
async function navigate(location: HomeLocation) {
  persist()
  const id = props.context.saveView(location)
  await router.push({ path: `/office/${props.kind}`, query: { view: id } })
}
function remember(extension: string, folder: FileRef) {
  props.context.rememberCreation(props.kind, extension, folder)
}
function act(action: FileMenuAction, file: FileRecord) {
  // Opening keeps the existing view-state persistence before the editor takes over.
  if (action === 'open' && file.kind === 'folder') return activate(file)
  if (action === 'open' || action === 'openReadOnly') persist()
  void model.value.runAction(action, file)
}
function chooseSpace(id: string) {
  const space = state.value.spaces.find((space) => space.id === id)
  if (space)
    void navigate({
      ...defaultLocation(props.kind),
      spaceId: id,
      folder: space.root
    })
}
function activate(file: FileRecord) {
  if (file.kind === 'file') {
    persist()
    void model.value.open(file)
    return
  }
  void navigate({
    ...snapshot(),
    folder: { ...file.ref },
    scroll: 0,
    trail: [
      ...state.value.location.trail.map((part) => ({
        name: part.name,
        ref: { ...part.ref }
      })),
      { name: file.name, ref: { ...file.ref } }
    ]
  })
}
function breadcrumb(index: number) {
  const space = state.value.spaces.find((space) => space.id === state.value.location.spaceId)
  if (!space) return
  const trail = state.value.location.trail.slice(0, index + 1)
  void navigate({
    ...snapshot(),
    folder: index < 0 ? space.root : trail[index]!.ref,
    trail,
    scroll: 0
  })
}
const destination = computed(() =>
  [
    state.value.spaces.find((space) => space.id === state.value.location.spaceId)?.name ??
      'Not available',
    ...state.value.location.trail.map((part) => part.name)
  ].join(' / ')
)
function start(template: Template | undefined, opener: HTMLElement) {
  void createDialog.value?.open(template, opener)
}
async function showBrowser() {
  browseOpen.value = true
  await nextTick()
  browser.value?.focus()
}
watch(
  () => route.fullPath,
  async () => {
    const revision = ++navigation
    const focusAtStart = document.activeElement
    activeModel?.deactivate()
    activeModel = model.value
    const id = typeof route.query.view === 'string' ? route.query.view : ''
    // Views live in session memory; after a reload an old key starts fresh like a first visit.
    if (!id || !props.context.views.has(id)) {
      // Start where the user last created a file; it is revalidated by the load below.
      const remembered = props.context.preferences.lastFolder[props.kind]
      const initial = props.context.saveView(
        remembered
          ? {
              ...defaultLocation(props.kind),
              spaceId: remembered.spaceId,
              folder: { ...remembered }
            }
          : defaultLocation(props.kind)
      )
      rememberedView = remembered ? initial : undefined
      await router.replace({
        path: `/office/${props.kind}`,
        query: { view: initial }
      })
      return
    }
    const saved = props.context.views.get(id)
    props.context.lastView.set(props.kind, id)
    const location = saved?.kind === props.kind ? saved : defaultLocation(props.kind)
    browseOpen.value ||= location.trail.length > 0
    await activeModel.load(location)
    if (revision !== navigation) return
    if (id === rememberedView && state.value.error) {
      // The remembered folder is gone or no longer accessible: forget it and start at the root.
      props.context.forgetFolder(props.kind)
      rememberedView = undefined
      await router.replace({
        path: `/office/${props.kind}`,
        query: { view: props.context.saveView(defaultLocation(props.kind)) }
      })
      return
    }
    await nextTick()
    if (viewport.value) viewport.value.scrollTop = location.scroll
    // Announce the new view, unless the user already moved focus while it was loading.
    if (document.activeElement === focusAtStart || document.activeElement === document.body)
      heading.value?.focus({ preventScroll: true })
  },
  { immediate: true }
)
// Filters narrow Recent only, so a change reloads that section and leaves the folder view alone.
watch(
  () => [props.context.recentFilter.favorites, ...props.context.recentFilter.tags],
  () => void model.value.refreshRecent()
)
onBeforeUnmount(() => {
  navigation++
  activeModel?.deactivate()
})
</script>

<template>
  <div class="office" :data-kind="kind">
    <AppSidebar :kind="kind" :context="context" @settings="(opener) => settings?.open(opener)">
      <h1 ref="heading" tabindex="-1">{{ descriptor.label }}</h1>
    </AppSidebar>
    <main ref="viewport" class="office-main" @scroll="persist">
      <TemplateStrip
        :kind="kind"
        :noun="nouns[kind]"
        :context="context"
        :state="state"
        @start="start"
      >
        <p v-if="state.uncertain" role="alert">
          Creation is paused until its outcome is reconciled in Files. Do not submit another copy.
        </p>
      </TemplateStrip>

      <div class="office-inner">
        <RecentFiles
          :kind="kind"
          :context="context"
          :entries="state.recent"
          :note="state.recentNote"
          :opening="state.opening"
          @action="act"
        />
        <FileBrowser
          ref="browser"
          :kind="kind"
          :state="state"
          :services="context.services"
          :expanded="browseOpen"
          @toggle="browseOpen = !browseOpen"
          @choose-space="chooseSpace"
          @activate="activate"
          @action="act"
          @breadcrumb="breadcrumb"
          @reload="model.load(snapshot())"
          @more="model.load(snapshot(), true)"
        />
      </div>
    </main>
    <CreateDialog
      ref="createDialog"
      :noun="nouns[kind]"
      :model="model"
      :destination="destination"
      :preferred="context.preferences.lastFormat[kind]"
      @created="remember"
      @choose-folder="showBrowser"
    />
    <SettingsDialog ref="settings" :context="context" @clear-history="model.clearRecents" />
    <div class="office-toast-region" role="status">
      <p v-if="state.notice" class="office-toast">
        <span>{{ state.notice }}</span>
        <button
          v-if="state.created"
          type="button"
          class="office-link"
          :disabled="state.opening || state.mutation"
          @click="model.open(state.created)"
        >
          Open created file
        </button>
        <button
          type="button"
          class="office-link"
          aria-label="Dismiss message"
          @click="state.notice = ''"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </p>
    </div>
  </div>
</template>
