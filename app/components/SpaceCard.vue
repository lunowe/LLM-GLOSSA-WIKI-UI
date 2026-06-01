<script setup lang="ts">
const props = defineProps<{ space: Space }>()
const model = computed(() => props.space.llm_config?.model || props.space.llm_config?.mode || 'byo')
</script>

<template>
  <NuxtLink
    :to="`/spaces/${space.id}`"
    class="raised group block p-5 transition hover:-translate-y-0.5"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate text-xl leading-tight transition group-hover:text-rubric-ink">
          {{ space.name }}
        </h3>
        <p class="label mt-1 truncate">{{ space.slug }}</p>
      </div>
      <span class="font-display text-2xl text-faint transition group-hover:translate-x-0.5 group-hover:text-rubric">→</span>
    </div>

    <div class="mt-5 flex items-end justify-between">
      <div class="flex gap-6">
        <div>
          <div class="font-display text-2xl text-ink">{{ num(space.stats?.page_count) }}</div>
          <div class="label mt-0.5">Pages</div>
        </div>
        <div>
          <div class="font-display text-2xl text-ink">{{ num(space.stats?.source_count) }}</div>
          <div class="label mt-0.5">Sources</div>
        </div>
      </div>
      <span class="token">{{ model }}</span>
    </div>

    <div class="mt-4 flex items-center justify-between border-t border-hair pt-3 text-xs text-muted">
      <span>{{ space.stats?.last_ingest_at ? `Ingested ${relativeTime(space.stats.last_ingest_at)}` : 'No ingests yet' }}</span>
      <span class="mono opacity-70">{{ space.id }}</span>
    </div>
  </NuxtLink>
</template>
