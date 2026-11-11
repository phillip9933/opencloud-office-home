<script setup lang="ts">
import { computed } from 'vue'
import { OcIcon } from '@opencloud-eu/design-system/components'
import { version } from '../../package.json'
import FamilyIcon from './FamilyIcon.vue'
import { officeApps, officeRoute, type AppDescriptor } from '../app/registry'
import type { OfficeContext } from '../app/context'
import type { OfficeKind } from '../contracts/office'

const props = defineProps<{ kind: OfficeKind | 'settings'; context: OfficeContext }>()
const sourceUrl = `https://github.com/phillip9933/opencloud-office-home/tree/v${version}`
const descriptor = computed(() => officeApps.find((app) => app.id === props.kind))
function destination(app: AppDescriptor) {
  const view = props.context.lastView.get(app.id)
  return { name: officeRoute(app.id), query: view ? { view } : {} }
}
</script>

<template>
  <aside class="office-sidebar">
    <div class="office-sidebar-title" :data-kind="kind">
      <FamilyIcon v-if="kind !== 'settings'" :kind="kind" />
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
            <FamilyIcon :kind="app.id" />
            <span>{{ app.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
    <div class="office-sidebar-footer">
      <RouterLink
        :to="{ name: 'office-settings' }"
        class="office-quiet office-settings-button"
        :aria-current="kind === 'settings' ? 'page' : undefined"
      >
        <OcIcon name="settings-4" fill-type="line" class="office-icon" />
        <span>Settings</span>
      </RouterLink>
      <p class="office-muted office-version">Office {{ version }}</p>
      <a
        :href="sourceUrl"
        class="office-link office-version"
        target="_blank"
        rel="noopener noreferrer"
      >
        Source code
      </a>
    </div>
  </aside>
</template>
