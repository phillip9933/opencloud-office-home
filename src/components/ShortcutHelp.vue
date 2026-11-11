<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { OfficeContext } from '../app/context'

const props = defineProps<{ context: OfficeContext }>()
const preferences = props.context.preferences
const open = ref(false)
const toggle = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()

async function show() {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  panel.value?.querySelector<HTMLElement>('input')?.focus()
}
function close() {
  open.value = false
  toggle.value?.focus()
}
</script>

<template>
  <div class="office-popover" @keydown.esc.stop.prevent="close">
    <button
      ref="toggle"
      type="button"
      class="office-quiet"
      :aria-expanded="open"
      aria-controls="office-shortcuts"
      title="Keyboard shortcuts"
      @click="show"
    >
      <span aria-hidden="true">⌨</span>
      <span class="office-visually-hidden">Keyboard shortcuts</span>
    </button>
    <div v-if="open" id="office-shortcuts" ref="panel" class="office-popover-panel">
      <label class="office-check">
        <input v-model="preferences.shortcuts" type="checkbox" />
        <span>Use single-key shortcuts</span>
      </label>
      <dl class="office-shortcuts">
        <dt><kbd>/</kbd></dt>
        <dd>Search</dd>
        <dt><kbd>N</kbd></dt>
        <dd>New blank file</dd>
        <dt><kbd>Esc</kbd></dt>
        <dd>Close a menu or dialog</dd>
      </dl>
      <p class="office-muted">Shortcuts do nothing while you type in a field.</p>
      <button type="button" @click="close">Done</button>
    </div>
  </div>
</template>
