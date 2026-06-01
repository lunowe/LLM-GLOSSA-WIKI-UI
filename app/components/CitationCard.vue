<script setup lang="ts">
defineProps<{ source: CitedSource }>()
</script>

<template>
  <a
    v-if="source.external_uri"
    :href="source.external_uri"
    target="_blank"
    rel="noopener noreferrer"
    class="panel group flex items-center gap-3 p-3 transition hover:border-rubric"
  >
    <span class="font-display text-lg text-rubric">§</span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-ink">{{ source.title }}</p>
      <p class="truncate text-xs text-muted">{{ source.external_uri }}</p>
    </div>
    <svg class="h-4 w-4 shrink-0 text-faint transition group-hover:text-rubric" viewBox="0 0 24 24" fill="none">
      <path d="M7 17 17 7M17 7H9M17 7v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </a>
  <div v-else class="panel flex items-center gap-3 p-3">
    <span class="font-display text-lg text-faint">§</span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-ink">{{ source.title }}</p>
      <UiCopy :value="source.id" :label="source.id" />
    </div>
  </div>
</template>
