<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSwitcher from '../components/AppSwitcher.vue'
import CreateDialog from '../components/CreateDialog.vue'
import FamilyIcon from '../components/FamilyIcon.vue'
import FileBrowser from '../components/FileBrowser.vue'
import RecentFiles from '../components/RecentFiles.vue'
import SearchResults from '../components/SearchResults.vue'
import ShortcutHelp from '../components/ShortcutHelp.vue'
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
const query = ref('')
const scope = ref<HomeLocation['scope']>('all')
const browseOpen = ref(false)
const createDialog = ref<InstanceType<typeof CreateDialog>>()
const browser = ref<InstanceType<typeof FileBrowser>>()
const viewport = ref<HTMLElement>()
const searchInput = ref<HTMLInputElement>()
const heading = ref<HTMLHeadingElement>()
let activeModel: HomeModel | undefined
let timer: ReturnType<typeof setTimeout> | undefined
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
function search() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    void navigate({ ...snapshot(), text: query.value, scope: scope.value, scroll: 0 })
  }, 250)
}
function remember(extension: string, folder: FileRef) {
  props.context.rememberCreation(props.kind, extension, folder)
}
function clearSearch() {
  clearTimeout(timer)
  query.value = ''
  void navigate({ ...snapshot(), text: '', scroll: 0 })
}
function act(action: FileMenuAction, file: FileRecord) {
  // Opening keeps the existing view-state persistence before the editor takes over.
  if (action === 'open' && file.kind === 'folder') return activate(file)
  if (action === 'open' || action === 'openReadOnly') persist()
  void model.value.runAction(action, file)
}
function chooseSpace(id: string) {
  clearTimeout(timer)
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
  clearTimeout(timer)
  void navigate({
    ...snapshot(),
    folder: { ...file.ref },
    text: '',
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
    text: '',
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
    clearTimeout(timer)
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
    query.value = location.text
    scope.value = location.scope
    browseOpen.value ||=
      location.trail.length > 0 || (location.scope === 'folder' && location.text !== '')
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
  // Search results use the same filters, so an active search reloads the view instead.
  () =>
    void (state.value.results !== null ? model.value.load(snapshot()) : model.value.refreshRecent())
)
// Single-key shortcuts; they never act while the user types or a dialog is open (WCAG 2.1.4).
function shortcut(event: KeyboardEvent) {
  if (
    !props.context.preferences.shortcuts ||
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    document.querySelector('dialog[open]')
  )
    return
  const target = event.target instanceof HTMLElement ? event.target : document.body
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return
  if (event.key === '/') {
    event.preventDefault()
    searchInput.value?.focus()
  } else if (
    event.key.toLowerCase() === 'n' &&
    state.value.formats.length &&
    !state.value.mutation &&
    !state.value.uncertain
  ) {
    event.preventDefault()
    start(undefined, target)
  }
}
onMounted(() => window.addEventListener('keydown', shortcut))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', shortcut)
  clearTimeout(timer)
  navigation++
  activeModel?.deactivate()
})
</script>

<template>
  <main ref="viewport" class="office" :data-kind="kind" @scroll="persist">
    <header class="office-header">
      <div class="office-inner office-header-row">
        <AppSwitcher :context="context" />
        <h1 ref="heading" tabindex="-1" class="office-app-name">
          <FamilyIcon :kind="kind" />
          <span>{{ descriptor.label }}</span>
        </h1>
        <div class="office-search" role="search">
          <label class="office-visually-hidden" for="office-search-scope">Search in</label>
          <select id="office-search-scope" v-model="scope" @change="search">
            <option value="all">All files</option>
            <option value="folder">This folder</option>
          </select>
          <label class="office-visually-hidden" for="office-search-text">{{
            scope === 'all' ? 'Search all files' : `Search files in ${destination}`
          }}</label>
          <input
            id="office-search-text"
            ref="searchInput"
            v-model="query"
            type="search"
            :placeholder="scope === 'all' ? 'Search all files' : `Search in ${destination}`"
            @input="search"
          />
        </div>
        <ShortcutHelp :context="context" />
      </div>
    </header>
    <div class="office-inner">
      <p v-if="context.services.mode === 'fixture'" class="office-banner" role="note">
        Interactive preview · Synthetic files only. Create and Open are simulations; nothing is
        stored in OpenCloud.
      </p>
      <p v-else class="office-banner" role="note">
        Integration pending · OpenCloud file operations require a verified deployment adapter.
      </p>
    </div>

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
      <SearchResults
        v-if="state.location.scope === 'all' && state.location.text.trim()"
        :kind="kind"
        :context="context"
        :text="state.location.text"
        :results="state.results ?? []"
        :note="state.resultsNote"
        :loading="state.loading"
        :opening="state.opening"
        @action="act"
        @clear="clearSearch"
      />
      <RecentFiles
        v-else
        :kind="kind"
        :context="context"
        :entries="state.recent"
        :note="state.recentNote"
        :opening="state.opening"
        @action="act"
        @clear="model.clearRecents"
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
    <CreateDialog
      ref="createDialog"
      :noun="nouns[kind]"
      :model="model"
      :destination="destination"
      :preferred="context.preferences.lastFormat[kind]"
      @created="remember"
      @choose-folder="showBrowser"
    />
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
  </main>
</template>
