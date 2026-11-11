<script setup lang="ts">
import { ref } from 'vue'
import { OcIcon } from '@opencloud-eu/design-system/components'

// A toggletip: hover or focus shows the text, a click pins it, Escape hides it.
defineProps<{ label: string; text: string }>()
const pinned = ref(false)
const hovered = ref(false)
const id = `office-tip-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <span
    class="office-infotip"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @keydown.esc.stop="((pinned = false), (hovered = false))"
  >
    <button
      type="button"
      class="office-infotip-button"
      :aria-label="label"
      :aria-expanded="pinned || hovered"
      :aria-describedby="pinned || hovered ? id : undefined"
      @click="pinned = !pinned"
      @focus="hovered = true"
      @blur="((hovered = false), (pinned = false))"
    >
      <OcIcon name="information" fill-type="line" class="office-icon" />
    </button>
    <span v-if="pinned || hovered" :id="id" role="tooltip" class="office-infotip-text">{{
      text
    }}</span>
  </span>
</template>
