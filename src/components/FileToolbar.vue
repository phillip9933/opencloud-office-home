<script setup lang="ts">
import { OcIcon } from '@opencloud-eu/design-system/components'
import TagFilter from './TagFilter.vue'
import ColumnMenu from './ColumnMenu.vue'
import type { OfficeContext } from '../app/context'
const props = defineProps<{ context: OfficeContext }>()
const preferences = props.context.preferences
const filter = props.context.recentFilter
</script>
<template>
  <div class="office-file-toolbar" role="group" aria-label="File filters and view">
    <button
      v-if="context.services.filters.favorites"
      type="button"
      class="office-icon-button"
      :aria-pressed="filter.favorites"
      aria-label="Favorites"
      title="Favorites only"
      @click="filter.favorites = !filter.favorites"
    >
      <OcIcon name="star" :fill-type="filter.favorites ? 'fill' : 'line'" class="office-icon" />
    </button>
    <TagFilter
      v-if="context.services.filters.tags"
      :catalog="context.services.catalog"
      :filter="filter"
      @change="(tags) => (filter.tags = tags)"
    />
    <label class="office-visually-hidden" for="office-sort">Sort by</label>
    <select id="office-sort" v-model="preferences.sort">
      <option value="activity">Most recent</option>
      <option value="name">Name</option>
    </select>
    <div class="office-segmented" role="group" aria-label="Layout">
      <button
        type="button"
        :aria-pressed="preferences.layout === 'list'"
        aria-label="List view"
        title="List view"
        @click="preferences.layout = 'list'"
      >
        <OcIcon name="list-unordered" fill-type="none" class="office-icon" />
      </button>
      <button
        type="button"
        :aria-pressed="preferences.layout === 'grid'"
        aria-label="Grid view"
        title="Grid view"
        @click="preferences.layout = 'grid'"
      >
        <OcIcon name="gallery-view-2" fill-type="none" class="office-icon" />
      </button>
    </div>
    <ColumnMenu :context="context" />
  </div>
</template>
