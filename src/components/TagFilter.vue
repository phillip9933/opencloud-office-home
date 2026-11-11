<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { OcIcon } from '@opencloud-eu/design-system/components'
import type { FileCatalog, RecentFilter } from '../contracts/office'
import { errorText } from '../services/home'

const props = defineProps<{ catalog: FileCatalog; filter: RecentFilter }>()
const emit = defineEmits<{ change: [tags: string[]] }>()
const open = ref(false)
const loading = ref(false)
const tags = ref<string[]>([])
const error = ref('')
const toggle = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
let abort: AbortController | undefined

async function show() {
  open.value = !open.value
  if (!open.value) return abort?.abort()
  abort?.abort()
  const controller = new AbortController()
  abort = controller
  loading.value = true
  error.value = ''
  const result = await props.catalog.listTags(controller.signal)
  if (controller.signal.aborted) return
  loading.value = false
  // Selected tags stay listed even if the server no longer reports them, so they can be cleared.
  if (result.ok) tags.value = [...new Set([...result.value, ...props.filter.tags])].sort()
  else error.value = errorText[result.error]
  await nextTick()
  panel.value?.querySelector<HTMLElement>('input, button')?.focus()
}
function close() {
  abort?.abort()
  open.value = false
  toggle.value?.focus()
}
function choose(tag: string, checked: boolean) {
  emit(
    'change',
    checked ? [...props.filter.tags, tag] : props.filter.tags.filter((selected) => selected !== tag)
  )
}
</script>

<template>
  <div class="office-popover" @keydown.esc.stop.prevent="close">
    <button
      ref="toggle"
      type="button"
      :aria-expanded="open"
      aria-controls="office-tag-filter"
      @click="show"
    >
      <OcIcon name="price-tag-3" fill-type="line" class="office-icon" /> Tags<span
        v-if="filter.tags.length"
      >
        ({{ filter.tags.length }})</span
      >
    </button>
    <div v-if="open" id="office-tag-filter" ref="panel" class="office-popover-panel">
      <fieldset>
        <legend>Show files with any of these tags</legend>
        <p v-if="loading" role="status" class="office-muted">Loading tags…</p>
        <p v-else-if="error" role="alert" class="office-muted">{{ error }}</p>
        <p v-else-if="!tags.length" class="office-muted">
          No tags yet. Add tags to files in Files.
        </p>
        <label v-for="tag in tags" :key="tag" class="office-check">
          <input
            type="checkbox"
            :checked="filter.tags.includes(tag)"
            @change="choose(tag, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ tag }}</span>
        </label>
      </fieldset>
      <div class="office-popover-actions">
        <button
          type="button"
          class="office-link"
          :disabled="!filter.tags.length"
          @click="emit('change', [])"
        >
          Clear tags
        </button>
        <button type="button" @click="close">Done</button>
      </div>
    </div>
  </div>
</template>
