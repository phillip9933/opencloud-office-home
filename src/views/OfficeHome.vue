<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { useRouter } from '@opencloud-eu/web-pkg'
import AppSidebar from '../components/AppSidebar.vue'
import CreatePanel from '../components/CreatePanel.vue'
import RecentFiles from '../components/RecentFiles.vue'
import TemplateStrip from '../components/TemplateStrip.vue'
import { officeApps } from '../app/registry'
import type { OfficeContext } from '../app/context'
import type { FileRecord, FileRef, HomeLocation, OfficeKind, Template } from '../contracts/office'
import { defaultLocation, type FileMenuAction, type HomeModel } from '../services/home'

const props = defineProps<{ kind: OfficeKind; context: OfficeContext }>()
const router = useRouter()
const preferences = props.context.preferences
const route = router.currentRoute
const descriptor = computed(() => officeApps.find((app) => app.id === props.kind)!)
const model = computed(() => props.context.model(props.kind))
const state = computed(() => model.value.state)
const nouns: Record<OfficeKind, string> = {
  docs: 'document',
  sheets: 'spreadsheet',
  slides: 'presentation'
}
const createPanel = ref<InstanceType<typeof CreatePanel>>()
const viewport = ref<HTMLElement>()
const heading = ref<HTMLHeadingElement>()
const openCreated = ref<HTMLButtonElement>()
let activeModel: HomeModel | undefined
let navigation = 0

function snapshot(): HomeLocation {
  return {
    ...structuredClone(toRaw(state.value.location)),
    scroll: viewport.value?.scrollTop ?? 0
  }
}
function persist() {
  const id =
    typeof route.value.query.view === 'string'
      ? route.value.query.view
      : props.context.lastView.get(props.kind)
  if (id) props.context.views.set(id, snapshot())
}
async function remember(extension: string, folder: FileRef) {
  const current = model.value
  const revision = navigation
  props.context.rememberCreation(props.kind, extension, folder)
  persist()
  if (current.state.created) await current.open(current.state.created)
  await nextTick()
  if (revision === navigation && current === model.value) openCreated.value?.focus()
}
function act(action: FileMenuAction, file: FileRecord) {
  // Opening keeps the existing view-state persistence before the editor takes over.
  if (action === 'open' || action === 'openReadOnly') persist()
  void model.value.runAction(action, file)
}
const destination = computed(() =>
  [
    state.value.spaces.find((space) => space.id === state.value.location.spaceId)?.name ??
      'Not available',
    state.value.location.folderName
  ]
    .filter(Boolean)
    .join(' / ')
)
async function reconcile() {
  const current = model.value
  await current.reconcileCreation()
  await nextTick()
  if (current === model.value && current.state.created) openCreated.value?.focus()
}
function start(template: Template | undefined, opener: HTMLElement) {
  void createPanel.value?.open(template, opener)
}
watch(
  () => route.value.fullPath,
  async () => {
    preferences.lastKind = props.kind
    const revision = ++navigation
    const focusAtStart = document.activeElement
    activeModel?.deactivate()
    activeModel = model.value
    const id = typeof route.value.query.view === 'string' ? route.value.query.view : ''
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
      await router.replace({
        path: `/office/${props.kind}`,
        query: { view: initial }
      })
      return
    }
    const saved = props.context.views.get(id)
    props.context.lastView.set(props.kind, id)
    const location = saved?.kind === props.kind ? saved : defaultLocation(props.kind)
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
// Refresh Recent without changing the creation destination.
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
    <AppSidebar :kind="kind" :context="context">
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
          Creation is paused until its outcome is reconciled. Do not submit another copy.
          <button type="button" class="office-link" :disabled="state.mutation" @click="reconcile">
            {{ state.mutation ? 'Checking destination…' : 'Check destination' }}
          </button>
        </p>
      </TemplateStrip>

      <div class="office-inner">
        <div v-if="state.error" role="alert" class="office-load-error">
          <p>{{ state.error }}</p>
          <button type="button" :disabled="state.loading" @click="model.load(snapshot())">
            Retry loading
          </button>
        </div>
        <p v-if="state.spaceNote" role="status">
          {{ state.spaceNote }}
          <button
            v-if="!state.error"
            type="button"
            :disabled="state.loading"
            @click="model.load(snapshot())"
          >
            Retry loading
          </button>
        </p>
        <CreatePanel
          :key="kind"
          ref="createPanel"
          :noun="nouns[kind]"
          :model="model"
          :services="context.services"
          :destination="destination"
          :preferred="context.preferences.lastFormat[kind]"
          @created="remember"
        />
        <div class="office-toast-region" role="status">
          <p v-if="state.notice && !createPanel?.isOpen" class="office-toast">
            <span>{{ state.notice }}</span>
            <button
              v-if="state.created"
              ref="openCreated"
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
        <RecentFiles
          v-if="!state.error || state.recent.length"
          :kind="kind"
          :context="context"
          :entries="state.recent"
          :note="state.recentNote"
          :opening="state.opening"
          :loading="state.loading || state.recentLoading"
          @retry="model.refreshRecent()"
          @action="act"
        />
      </div>
    </main>
  </div>
</template>
