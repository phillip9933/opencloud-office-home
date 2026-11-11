<script setup lang="ts">
import { ref, watch } from 'vue'
import { OcIcon } from '@opencloud-eu/design-system/components'
import TagFilter from './TagFilter.vue'
import type { OfficeContext } from '../app/context'
import type { HomeLocation } from '../contracts/office'
const props = defineProps<{ context: OfficeContext; search?: HomeLocation['search'] }>()
const emit = defineEmits<{ search: [search: HomeLocation['search']] }>()
const preferences = props.context.preferences
const filter = props.context.recentFilter
const term = ref('')
const scope = ref<'all' | 'folder'>('all')
watch(
  () => props.search,
  () => {
    term.value = props.search?.term ?? ''
    scope.value = props.search?.scope ?? 'all'
  },
  { immediate: true }
)
</script>
<template>
  <form
    class="office-file-toolbar"
    role="search"
    aria-label="Find and organize files"
    @submit.prevent="emit('search', term.trim() ? { term: term.trim(), scope } : undefined)"
  >
    <div class="office-search-input">
      <label class="office-visually-hidden" for="office-search-name">Search files</label>
      <input
        id="office-search-name"
        v-model="term"
        type="search"
        maxlength="200"
        placeholder="Search files"
      />
      <button type="submit" aria-label="Search" title="Search">
        <OcIcon name="search" fill-type="line" class="office-icon" />
      </button>
    </div>
    <label class="office-visually-hidden" for="office-search-scope">Search scope</label>
    <select id="office-search-scope" v-model="scope">
      <option value="all">All spaces</option>
      <option value="folder">This folder</option>
    </select>
    <button
      v-if="search"
      type="button"
      aria-label="Clear search"
      title="Clear search"
      @click="emit('search', undefined)"
    >
      <OcIcon name="close" fill-type="line" class="office-icon" />
    </button>
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
    <RouterLink
      :to="{ name: 'office-settings', hash: '#recent-columns' }"
      class="office-icon-button office-column-link"
      aria-label="Choose columns"
      title="Choose columns"
      ><OcIcon name="layout-column" fill-type="line" class="office-icon"
    /></RouterLink>
  </form>
</template>
