<script setup lang="ts">
import { OcIcon } from '@opencloud-eu/design-system/components'
import { version } from '../../package.json'
import FamilyIcon from './FamilyIcon.vue'
import { officeApps, type AppDescriptor } from '../app/registry'
import type { OfficeContext } from '../app/context'
import type { OfficeKind } from '../contracts/office'

const props = defineProps<{ kind: OfficeKind; context: OfficeContext }>()
const emit = defineEmits<{ settings: [opener: HTMLElement] }>()
const descriptor = officeApps.find((app) => app.id === props.kind)!
function destination(app: AppDescriptor) {
  const officeApp = officeApps.find((officeApp) => officeApp.id === app.id)
  const view = officeApp ? props.context.lastView.get(officeApp.id) : undefined
  return { name: app.route, query: view ? { view } : {} }
}
const isOffice = (id: string): id is OfficeKind => officeApps.some((app) => app.id === id)
</script>

<template>
  <aside class="office-sidebar">
    <div class="office-sidebar-title" :data-kind="kind">
      <FamilyIcon :kind="kind" />
      <slot>{{ descriptor.label }}</slot>
    </div>
    <nav aria-label="Office applications">
      <ul class="office-nav">
        <li v-for="app in context.menu" :key="app.id">
          <RouterLink
            :to="destination(app)"
            :aria-current="app.id === kind ? 'page' : undefined"
            :data-kind="app.id"
          >
            <FamilyIcon v-if="isOffice(app.id)" :kind="app.id" />
            <span>{{ app.label }}</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink v-if="context.services.mode !== 'fixture'" to="/files">
            <FamilyIcon kind="folder" />
            <span>Files</span>
          </RouterLink>
          <a v-else aria-disabled="true" title="Opens OpenCloud Files in the installed app">
            <FamilyIcon kind="folder" />
            <span>Files</span>
          </a>
        </li>
      </ul>
    </nav>
    <div class="office-sidebar-footer">
      <button
        type="button"
        class="office-quiet office-settings-button"
        @click="emit('settings', $event.currentTarget as HTMLElement)"
      >
        <OcIcon name="settings-4" fill-type="line" class="office-icon" />
        <span>Settings</span>
      </button>
      <p class="office-muted office-version">Office {{ version }}</p>
    </div>
  </aside>
</template>
