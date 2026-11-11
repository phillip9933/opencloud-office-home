<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSwitcher from '../components/AppSwitcher.vue'
import CreateDialog from '../components/CreateDialog.vue'
import FamilyIcon from '../components/FamilyIcon.vue'
import FileBrowser from '../components/FileBrowser.vue'
import RecentFiles from '../components/RecentFiles.vue'
import TemplateStrip from '../components/TemplateStrip.vue'
import { officeApps } from '../app/registry'
import type { OfficeContext } from '../app/context'
import type { FileRecord, HomeLocation, OfficeKind, Template } from '../contracts/office'
import { defaultLocation, type HomeModel } from '../services/home'

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
const browseOpen = ref(false)
const createDialog = ref<InstanceType<typeof CreateDialog>>()
const browser = ref<InstanceType<typeof FileBrowser>>()
const viewport = ref<HTMLElement>()
const heading = ref<HTMLHeadingElement>()
let activeModel: HomeModel | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let navigation = 0

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
    void navigate({ ...snapshot(), text: query.value, scroll: 0 })
  }, 250)
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
    if (!id) {
      const initial = props.context.saveView(defaultLocation(props.kind))
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
    browseOpen.value ||= location.trail.length > 0 || location.text !== ''
    await activeModel.load(location)
    if (revision !== navigation) return
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
        <label class="office-search">
          <span class="office-visually-hidden">Search files in {{ destination }}</span>
          <input
            v-model="query"
            type="search"
            :placeholder="`Search in ${destination}`"
            @input="search"
          />
        </label>
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
      <p v-if="state.notice" role="status" class="office-notice">
        {{ state.notice }}
        <button
          v-if="state.created"
          type="button"
          class="office-link"
          :disabled="state.opening || state.mutation"
          @click="model.open(state.created)"
        >
          Open created file
        </button>
      </p>
    </TemplateStrip>

    <div class="office-inner">
      <RecentFiles
        :kind="kind"
        :context="context"
        :entries="state.recent"
        :note="state.recentNote"
        :opening="state.opening"
        @open="activate"
        @clear="model.clearRecents"
      />
      <FileBrowser
        ref="browser"
        :kind="kind"
        :state="state"
        :expanded="browseOpen"
        @toggle="browseOpen = !browseOpen"
        @choose-space="chooseSpace"
        @activate="activate"
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
      @choose-folder="showBrowser"
    />
  </main>
</template>
