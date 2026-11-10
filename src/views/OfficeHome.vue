<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { OcButton } from '@opencloud-eu/design-system/components'
import AppSwitcher from '../components/AppSwitcher.vue'
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
const query = ref('')
const name = ref('Untitled')
const extension = ref('')
const templateId = ref('')
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
function chooseSpace(event: Event) {
  clearTimeout(timer)
  const id = (event.target as HTMLSelectElement).value
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
function create() {
  const template: Template | undefined = state.value.templates.find(
    (t) => t.id === templateId.value
  )
  if (templateId.value && !template) {
    state.value.notice = 'The selected template is unavailable. Choose another starting point.'
    return
  }
  void model.value.create(name.value, extension.value, template)
}
watch(templateId, (id) => {
  const template = state.value.templates.find((t) => t.id === id)
  if (template) extension.value = template.format.extension
})
watch(
  () => route.fullPath,
  async () => {
    clearTimeout(timer)
    const revision = ++navigation
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
    templateId.value = ''
    await activeModel.load(location)
    if (revision !== navigation) return
    extension.value = state.value.formats[0]?.extension ?? ''
    await nextTick()
    if (viewport.value) viewport.value.scrollTop = location.scroll
    heading.value?.focus({ preventScroll: true })
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  clearTimeout(timer)
  navigation++
  activeModel?.deactivate()
})
</script>

<template>
  <main ref="viewport" class="office" :data-kind="kind" @scroll="persist">
    <div class="office-topline">
      <AppSwitcher :context="context" />
      <span class="office-eyebrow">OpenCloud Office</span>
    </div>
    <p v-if="context.services.mode === 'fixture'" class="office-banner" role="note">
      Interactive preview · Synthetic files only. Create and Open are simulations; nothing is stored
      in OpenCloud.
    </p>
    <p v-else class="office-banner" role="note">
      Integration pending · OpenCloud file operations require a verified deployment adapter.
    </p>
    <header class="office-heading">
      <div>
        <p class="office-eyebrow">Your workspace, one file at a time</p>
        <h1 ref="heading" tabindex="-1">{{ descriptor.label }}</h1>
        <p class="office-muted">Create something new or pick up where you left off.</p>
      </div>
      <label class="office-search"
        >Search this folder
        <input v-model="query" type="search" placeholder="Find a file by name" @input="search" />
      </label>
    </header>

    <section aria-labelledby="create-heading" class="office-panel">
      <div class="office-section-title">
        <h2 id="create-heading">Start a new file</h2>
        <span>Save location is shown below</span>
      </div>
      <form class="office-create" @submit.prevent="create">
        <label
          >Name<input v-model="name" maxlength="180" :disabled="state.mutation" required
        /></label>
        <label
          >Starting point
          <select v-model="templateId" :disabled="state.mutation || !state.formats.length">
            <option value="">Blank file</option>
            <option v-for="template in state.templates" :key="template.id" :value="template.id">
              {{ template.name }}
            </option>
          </select>
        </label>
        <label
          >Format
          <select
            v-model="extension"
            :disabled="state.mutation || !!templateId || !state.formats.length"
          >
            <option v-if="!state.formats.length" value="">Unavailable</option>
            <option
              v-for="format in state.formats"
              :key="format.extension"
              :value="format.extension"
            >
              {{ format.extension.toUpperCase() }}
            </option>
          </select>
        </label>
        <OcButton
          class="office-primary"
          submit="submit"
          :disabled="
            !state.destinationWritable ||
            !extension ||
            state.mutation ||
            state.opening ||
            state.uncertain
          "
        >
          {{ state.mutation ? 'Creating…' : 'Create file' }}
        </OcButton>
      </form>
      <p class="office-muted">
        Destination:
        {{ state.spaces.find((s) => s.id === state.location.spaceId)?.name ?? 'Not available'
        }}<span v-for="part in state.location.trail" :key="part.ref.itemId">
          / {{ part.name }}</span
        >
      </p>
      <p v-if="state.formatError" class="office-muted">New files: {{ state.formatError }}</p>
      <p v-if="state.templateError" class="office-muted">Templates: {{ state.templateError }}</p>
      <p v-if="state.uncertain" role="alert">
        Creation is paused until its outcome is reconciled in Files. Do not submit another copy.
      </p>
      <p v-if="state.notice" role="status" class="office-notice">
        {{ state.notice }}
      </p>
      <button
        v-if="state.created"
        type="button"
        :disabled="state.opening || state.mutation"
        @click="model.open(state.created)"
      >
        Open created file
      </button>
    </section>

    <section aria-labelledby="recent-heading" class="office-panel">
      <div class="office-section-title">
        <h2 id="recent-heading">Recently opened in this browser</h2>
        <button type="button" @click="model.clearRecents">Clear history</button>
      </div>
      <p class="office-muted">
        {{
          context.services.mode === 'fixture'
            ? 'Preview history lasts for this session.'
            : 'Only files opened through this app appear here.'
        }}
      </p>
      <ul v-if="state.recent.length" class="office-file-list">
        <li v-for="file in state.recent" :key="file.ref.spaceId + file.ref.itemId">
          <button type="button" :disabled="state.opening" @click="activate(file)">
            {{ file.name }}
          </button>
        </li>
      </ul>
      <p v-else class="office-muted">No verified recent files to show.</p>
    </section>

    <section aria-labelledby="browse-heading" class="office-panel" :aria-busy="state.loading">
      <div class="office-section-title">
        <h2 id="browse-heading">Browse files</h2>
        <label
          >Space<select
            :value="state.location.spaceId"
            :disabled="state.loading || !state.spaces.length"
            @change="chooseSpace"
          >
            <option v-if="!state.spaces.length" value="">Unavailable</option>
            <option v-for="space in state.spaces" :key="space.id" :value="space.id">
              {{ space.name }}
            </option>
          </select></label
        >
      </div>
      <nav v-if="state.location.folder" aria-label="Folder breadcrumbs" class="office-breadcrumbs">
        <button type="button" @click="breadcrumb(-1)">Root</button>
        <button
          v-for="(part, index) in state.location.trail"
          :key="part.ref.itemId"
          type="button"
          @click="breadcrumb(index)"
        >
          {{ part.name }}
        </button>
      </nav>
      <p v-if="state.loading" role="status">Loading files…</p>
      <div v-else-if="state.error" role="alert">
        <p>{{ state.error }}</p>
        <button type="button" @click="model.load(snapshot())">Load again</button>
      </div>
      <p v-else-if="!state.rows.length" class="office-empty">
        {{
          state.location.text
            ? 'No matching files in this folder.'
            : 'No files to show in this folder.'
        }}
      </p>
      <ul v-else class="office-file-list">
        <li v-for="file in state.rows" :key="file.ref.spaceId + file.ref.itemId">
          <span aria-hidden="true" class="office-file-icon">{{
            file.kind === 'folder' ? '▰' : '▤'
          }}</span>
          <button type="button" :disabled="state.opening" @click="activate(file)">
            {{ file.name }}
          </button>
          <span class="office-muted">{{
            file.kind === 'folder' ? 'Folder' : file.access.write ? 'Can edit' : 'Read only'
          }}</span>
        </li>
      </ul>
      <p v-if="state.partial" role="status">Partial results. More files may be available.</p>
      <button
        v-if="state.next"
        type="button"
        :disabled="state.loading"
        @click="model.load(snapshot(), true)"
      >
        Load more
      </button>
    </section>
  </main>
</template>
