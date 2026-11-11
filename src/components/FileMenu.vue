<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { OcIcon } from '@opencloud-eu/design-system/components'
import type { Activity, FileRecord, OfficeServices } from '../contracts/office'
import { errorText } from '../services/errors'
import type { FileMenuAction } from '../services/home'

const props = defineProps<{ file: FileRecord; services: OfficeServices; disabled: boolean }>()
const emit = defineEmits<{ action: [action: FileMenuAction, file: FileRecord] }>()
const open = ref(false)
const toggle = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const activity = ref<Activity | null>()
const activityError = ref('')
let abort: AbortController | undefined
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function outside(event: MouseEvent) {
  if (!panel.value?.contains(event.target as Node) && event.target !== toggle.value) close(false)
}
async function show() {
  if (open.value) return close(true)
  open.value = true
  document.addEventListener('click', outside, true)
  await nextTick()
  panel.value?.querySelector<HTMLElement>('button')?.focus()
  // The activity line is fetched only when asked for, one request per opened menu.
  abort = new AbortController()
  const controller = abort
  activity.value = undefined
  activityError.value = ''
  const result = await props.services.catalog.latestActivity(props.file.ref, controller.signal)
  if (controller.signal.aborted) return
  if (result.ok) activity.value = result.value
  else activityError.value = errorText[result.error]
}
function close(returnFocus: boolean) {
  abort?.abort()
  open.value = false
  document.removeEventListener('click', outside, true)
  if (returnFocus) toggle.value?.focus()
}
function choose(action: FileMenuAction) {
  close(true)
  emit('action', action, props.file)
}
onBeforeUnmount(() => close(false))
</script>

<template>
  <div class="office-popover office-file-menu" @keydown.esc.stop.prevent="close(true)">
    <button
      ref="toggle"
      type="button"
      class="office-menu-button"
      :aria-expanded="open"
      :aria-label="`More actions for ${file.name}`"
      title="More actions"
      @click.stop="show"
    >
      <OcIcon name="more-2" fill-type="fill" class="office-icon" />
    </button>
    <div v-if="open" ref="panel" class="office-popover-panel">
      <ul class="office-menu-list">
        <li>
          <button type="button" :disabled="disabled" @click="choose('open')">Open</button>
        </li>
        <li v-if="file.access.write">
          <button type="button" :disabled="disabled" @click="choose('openReadOnly')">
            Open read-only
          </button>
        </li>
        <li><button type="button" @click="choose('showInFiles')">Show in Files</button></li>
        <li v-if="file.link">
          <button type="button" @click="choose('copyLink')">Copy link</button>
        </li>
        <li><button type="button" @click="choose('download')">Download</button></li>
        <li><button type="button" @click="choose('share')">Share…</button></li>
      </ul>
      <p class="office-muted office-menu-activity" role="status">
        <template v-if="activityError">Latest activity unavailable.</template>
        <template v-else-if="activity === undefined">Loading latest activity…</template>
        <template v-else-if="activity === null">No recorded activity.</template>
        <template v-else
          >{{ activity.text
          }}<template v-if="activity.at">, {{ dateFormat.format(activity.at) }}</template></template
        >
      </p>
    </div>
  </div>
</template>
