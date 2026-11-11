<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import TemplateCard from './TemplateCard.vue'
import type { OfficeContext } from '../app/context'
import type { OfficeKind, Template } from '../contracts/office'
import type { HomeModel } from '../services/home'
import { compactBand, movePin, togglePin, type TemplateBand } from '../preferences/view'

// Templates shown beside the Blank card; pins come first and may exceed it.
const ROW_TEMPLATES = 5

const props = defineProps<{
  kind: OfficeKind
  noun: string
  context: OfficeContext
  state: HomeModel['state']
}>()
const emit = defineEmits<{ start: [template: Template | undefined, opener: HTMLElement] }>()
const preferences = props.context.preferences
const expanded = ref(false)
const dragging = ref<string>()
// Each app starts with its row; the gallery belongs to the family it was opened for.
watch(
  () => props.kind,
  () => (expanded.value = false)
)
const compact = computed(() => compactBand(preferences) && !expanded.value)
const creatable = (template?: Template) =>
  !props.state.mutation &&
  !props.state.uncertain &&
  (template
    ? props.state.formats.some((format) => format.extension === template.format.extension)
    : props.state.formats.length > 0)
// Stored pins are opaque IDs; only templates still in the live gallery are shown.
const pinned = computed(() =>
  preferences.pinned[props.kind].flatMap((id) => {
    const template = props.state.templates.find((candidate) => candidate.id === id)
    return template ? [template] : []
  })
)
const row = computed(() =>
  [
    ...pinned.value,
    ...props.state.templates.filter((template) => !pinned.value.includes(template))
  ].slice(0, Math.max(ROW_TEMPLATES, pinned.value.length))
)
const categories = computed(() => {
  const groups = new Map<string, Template[]>()
  for (const template of props.state.templates)
    groups.set(template.category, [...(groups.get(template.category) ?? []), template])
  return [...groups.entries()]
})
const isPinned = (template: Template) => preferences.pinned[props.kind].includes(template.id)
function pin(template: Template) {
  preferences.pinned[props.kind] = togglePin(preferences.pinned[props.kind], template.id)
}
function move(template: Template, to: number) {
  preferences.pinned[props.kind] = movePin(preferences.pinned[props.kind], template.id, to)
}
function drop(target: Template) {
  if (dragging.value && dragging.value !== target.id) {
    const id = dragging.value
    const list = preferences.pinned[props.kind]
    preferences.pinned[props.kind] = movePin(list, id, list.indexOf(target.id))
  }
  dragging.value = undefined
}
function setBand(band: TemplateBand) {
  preferences.band = band
  expanded.value = false
}
</script>

<template>
  <section
    class="office-start"
    :class="{ 'office-start-compact': compact }"
    aria-labelledby="start-heading"
  >
    <div class="office-inner">
      <div class="office-start-head">
        <h2 id="start-heading">Start a new {{ noun }}</h2>
        <div class="office-toolbar-actions">
          <button
            v-if="compact"
            type="button"
            class="office-primary"
            :disabled="!creatable()"
            @click="emit('start', undefined, $event.currentTarget as HTMLElement)"
          >
            + Blank {{ noun }}
          </button>
          <button
            type="button"
            class="office-quiet"
            :aria-expanded="expanded"
            aria-controls="office-template-gallery"
            :disabled="!state.templates.length"
            @click="expanded = !expanded"
          >
            Template gallery <span aria-hidden="true">{{ expanded ? '▴' : '▾' }}</span>
          </button>
          <button
            type="button"
            class="office-quiet"
            :aria-pressed="compactBand(preferences)"
            :title="compact ? 'Show template cards' : 'Show a single line'"
            @click="setBand(compactBand(preferences) ? 'row' : 'compact')"
          >
            Compact
          </button>
        </div>
      </div>
      <div v-if="!compact" id="office-template-gallery">
        <ul class="office-cards" :class="{ 'office-cards-row': !expanded }">
          <li>
            <button
              type="button"
              class="office-card"
              :disabled="!creatable()"
              @click="emit('start', undefined, $event.currentTarget as HTMLElement)"
            >
              <span class="office-thumb office-thumb-blank" :data-kind="kind" aria-hidden="true">
                <span>+</span>
              </span>
              <span class="office-card-name">Blank {{ noun }}</span>
            </button>
          </li>
          <template v-if="!expanded">
            <li v-for="template in row" :key="template.id">
              <TemplateCard
                :template="template"
                :kind="kind"
                :services="context.services"
                :disabled="!creatable(template)"
                :pinned="isPinned(template)"
                @start="(opener) => emit('start', template, opener)"
                @pin="pin(template)"
              />
            </li>
          </template>
        </ul>
        <template v-if="expanded">
          <section class="office-gallery-group" aria-labelledby="pinned-heading">
            <h3 id="pinned-heading">Pinned</h3>
            <p v-if="!pinned.length" class="office-muted">
              Pin templates below to keep them at the top. Drag pinned templates, or use the arrow
              buttons, to change their order.
            </p>
            <ul v-else class="office-cards">
              <li
                v-for="(template, index) in pinned"
                :key="template.id"
                draggable="true"
                :class="{ 'office-dragging': dragging === template.id }"
                @dragstart="dragging = template.id"
                @dragend="dragging = undefined"
                @dragover.prevent
                @drop.prevent="drop(template)"
              >
                <TemplateCard
                  :template="template"
                  :kind="kind"
                  :services="context.services"
                  :disabled="!creatable(template)"
                  :pinned="true"
                  @start="(opener) => emit('start', template, opener)"
                  @pin="pin(template)"
                />
                <div class="office-reorder">
                  <button
                    type="button"
                    :aria-label="`Move ${template.name} earlier`"
                    :disabled="index === 0"
                    @click="move(template, index - 1)"
                  >
                    <span aria-hidden="true" class="office-mirror">←</span>
                  </button>
                  <button
                    type="button"
                    :aria-label="`Move ${template.name} later`"
                    :disabled="index === pinned.length - 1"
                    @click="move(template, index + 1)"
                  >
                    <span aria-hidden="true" class="office-mirror">→</span>
                  </button>
                </div>
              </li>
            </ul>
          </section>
          <section
            v-for="[category, templates] in categories"
            :key="category"
            class="office-gallery-group"
          >
            <h3>{{ category }}</h3>
            <ul class="office-cards">
              <li v-for="template in templates" :key="template.id">
                <TemplateCard
                  :template="template"
                  :kind="kind"
                  :services="context.services"
                  :disabled="!creatable(template)"
                  :pinned="isPinned(template)"
                  @start="(opener) => emit('start', template, opener)"
                  @pin="pin(template)"
                />
              </li>
            </ul>
          </section>
        </template>
      </div>
      <p v-if="state.formatError" class="office-muted">New files: {{ state.formatError }}</p>
      <p v-if="state.templateError" class="office-muted">Templates: {{ state.templateError }}</p>
      <p v-else-if="!state.loading && !state.templates.length" class="office-muted">
        No templates are available. An administrator can add them to the template folder.
      </p>
      <slot />
    </div>
  </section>
</template>
