<script setup lang="ts">
import { computed } from 'vue'
import { OcIcon } from '@opencloud-eu/design-system/components'
import { version } from '../../package.json'
import FamilyIcon from './FamilyIcon.vue'
import { officeApps, type AppDescriptor } from '../app/registry'
import type { OfficeContext } from '../app/context'
import type { OfficeKind } from '../contracts/office'

const props = defineProps<{ kind: OfficeKind | 'settings' | 'admin'; context: OfficeContext }>()
const versionLabel = computed(
  () => `Office ${version}${props.context.services.mode === 'native' ? ' · Test' : ''}`
)
const descriptor = computed(() => officeApps.find((app) => app.id === props.kind))
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
      <FamilyIcon v-if="kind !== 'settings' && kind !== 'admin'" :kind="kind" />
      <OcIcon v-else name="file-text" fill-type="line" class="office-icon" />
      <slot>{{ descriptor?.label ?? 'Office' }}</slot>
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
        <li v-for="shortcut in context.services.policy?.shortcuts ?? []" :key="shortcut.id">
          <a :href="shortcut.href" target="_blank" rel="noopener noreferrer"
            >{{ shortcut.label }}
            <span class="office-muted" aria-label="opens in a new tab">↗</span></a
          >
        </li>
      </ul>
    </nav>
    <div class="office-sidebar-footer">
      <RouterLink
        v-if="context.services.administration?.permitted()"
        :to="{ name: 'office-administration' }"
        class="office-quiet office-settings-button"
        :aria-current="kind === 'admin' ? 'page' : undefined"
        >Administration</RouterLink
      >
      <RouterLink
        :to="{ name: 'office-settings' }"
        class="office-quiet office-settings-button"
        :aria-current="kind === 'settings' ? 'page' : undefined"
      >
        <OcIcon name="settings-4" fill-type="line" class="office-icon" />
        <span>Settings</span>
      </RouterLink>
      <p class="office-muted office-version">{{ versionLabel }}</p>
    </div>
  </aside>
</template>
