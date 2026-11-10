<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { officeApps, type AppDescriptor } from '../app/registry'
import type { OfficeContext } from '../app/context'

const props = defineProps<{ context: OfficeContext }>()
const expanded = ref(false)
const toggle = ref<HTMLButtonElement>()
const links = ref<HTMLElement>()
const apps = props.context.menu
async function open() {
  expanded.value = !expanded.value
  if (expanded.value) {
    await nextTick()
    links.value?.querySelector('a')?.focus()
  }
}
function close() {
  expanded.value = false
  toggle.value?.focus()
}
function destination(app: AppDescriptor) {
  const officeApp = officeApps.find((officeApp) => officeApp.id === app.id)
  const view = officeApp ? props.context.lastView.get(officeApp.id) : undefined
  return { name: app.route, query: view ? { view } : {} }
}
</script>

<template>
  <div class="office-switcher" @keydown.esc.stop.prevent="close">
    <button
      ref="toggle"
      type="button"
      :aria-expanded="expanded"
      aria-controls="office-apps"
      @click="open"
    >
      <span aria-hidden="true">☰</span> Applications
    </button>
    <nav v-if="expanded" id="office-apps" ref="links" aria-label="Office applications">
      <RouterLink v-for="app in apps" :key="app.id" :to="destination(app)" @click="close">
        {{ app.label }}
      </RouterLink>
      <RouterLink v-if="context.services.mode === 'unconfigured'" to="/files" @click="close"
        >Files</RouterLink
      >
      <span v-else class="office-muted">Files is available in OpenCloud</span>
    </nav>
  </div>
</template>
