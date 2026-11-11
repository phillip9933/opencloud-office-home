<script setup lang="ts">
import PolicyShortcuts from './PolicyShortcuts.vue'
import PolicyFileTypes from './PolicyFileTypes.vue'
import type { OfficePolicy } from './policy'
import type { IntegrationDirectory } from './integrations'
defineProps<{
  disabled: boolean
  directory: IntegrationDirectory
  loading: boolean
  error: string
}>()
const draft = defineModel<OfficePolicy>('draft', { required: true })
</script>
<template>
  <PolicyShortcuts v-model:draft="draft" :disabled="disabled" />
  <PolicyFileTypes
    v-model:draft="draft"
    :disabled="disabled"
    :directory="directory"
    :loading="loading"
    :error="error"
  />
</template>
