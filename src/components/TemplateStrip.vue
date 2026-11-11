<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FileThumb from './FileThumb.vue'
import type { OfficeKind, OfficeServices, Template } from '../contracts/office'
import type { HomeModel } from '../services/home'

// How many templates fit beside the Blank card before the gallery is opened.
const ROW_TEMPLATES = 5

const props = defineProps<{
  kind: OfficeKind
  noun: string
  services: OfficeServices
  state: HomeModel['state']
}>()
const emit = defineEmits<{ start: [template: Template | undefined, opener: HTMLElement] }>()
const expanded = ref(false)
// Each app starts with the compact row; the gallery belongs to the family it was opened for.
watch(
  () => props.kind,
  () => (expanded.value = false)
)
const creatable = (template?: Template) =>
  !props.state.mutation &&
  !props.state.uncertain &&
  (template
    ? props.state.formats.some((format) => format.extension === template.format.extension)
    : props.state.formats.length > 0)
const categories = computed(() => {
  const groups = new Map<string, Template[]>()
  for (const template of props.state.templates)
    groups.set(template.category, [...(groups.get(template.category) ?? []), template])
  return [...groups.entries()]
})
function start(event: MouseEvent, template?: Template) {
  emit('start', template, event.currentTarget as HTMLElement)
}
</script>

<template>
  <section class="office-start" aria-labelledby="start-heading">
    <div class="office-inner">
      <div class="office-start-head">
        <h2 id="start-heading">Start a new {{ noun }}</h2>
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
      </div>
      <div id="office-template-gallery">
        <ul class="office-cards" :class="{ 'office-cards-row': !expanded }">
          <li>
            <button
              type="button"
              class="office-card"
              :disabled="!creatable()"
              @click="start($event)"
            >
              <span class="office-thumb office-thumb-blank" :data-kind="kind" aria-hidden="true">
                <span>+</span>
              </span>
              <span class="office-card-name">Blank {{ noun }}</span>
            </button>
          </li>
          <template v-if="!expanded">
            <li v-for="template in state.templates.slice(0, ROW_TEMPLATES)" :key="template.id">
              <button
                type="button"
                class="office-card"
                :disabled="!creatable(template)"
                @click="start($event, template)"
              >
                <FileThumb
                  :services="services"
                  :kind="kind"
                  :source="template.preview"
                  :label="template.format.extension.toUpperCase()"
                />
                <span class="office-card-name">{{ template.name }}</span>
              </button>
            </li>
          </template>
        </ul>
        <template v-if="expanded">
          <section
            v-for="[category, templates] in categories"
            :key="category"
            class="office-gallery-group"
          >
            <h3>{{ category }}</h3>
            <ul class="office-cards">
              <li v-for="template in templates" :key="template.id">
                <button
                  type="button"
                  class="office-card"
                  :disabled="!creatable(template)"
                  @click="start($event, template)"
                >
                  <FileThumb
                    :services="services"
                    :kind="kind"
                    :source="template.preview"
                    :label="template.format.extension.toUpperCase()"
                  />
                  <span class="office-card-name">{{ template.name }}</span>
                </button>
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
