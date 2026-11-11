<script setup lang="ts">
import type { OfficeKind } from '../contracts/office'

defineProps<{ kind: OfficeKind | 'folder' }>()
</script>

<template>
  <svg class="office-family-icon" :data-kind="kind" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="kind === 'folder'">
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2h8.4A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"
      />
    </template>
    <template v-else>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
      <g class="office-family-mark">
        <template v-if="kind === 'docs'">
          <rect x="7.5" y="8" width="9" height="1.6" rx="0.8" />
          <rect x="7.5" y="11.2" width="9" height="1.6" rx="0.8" />
          <rect x="7.5" y="14.4" width="6" height="1.6" rx="0.8" />
        </template>
        <template v-else-if="kind === 'sheets'">
          <path
            d="M7.5 8h9v8.5h-9zm1.4 1.4v2h2.4v-2zm3.8 0v2h2.4v-2zm-3.8 3.4v2.3h2.4v-2.3zm3.8 0v2.3h2.4v-2.3z"
          />
        </template>
        <template v-else>
          <path d="M7 8.5h10v7H7zm1.5 1.5v4h7v-4z" />
          <rect x="10" y="17" width="4" height="1.4" rx="0.7" />
        </template>
      </g>
    </template>
  </svg>
</template>
