<script setup lang="ts">
const { id } = useSpaceCtx()
const api = useGlossa()

const kind = ref('')
const prefix = ref('')
const text = ref('')

const { data: pages, pending, refresh } = await useAsyncData(
  `pages:${id}`,
  () =>
    api.pages.list(id, {
      kind: kind.value || undefined,
      path_prefix: prefix.value || undefined,
      limit: 300,
    }),
  { watch: [kind, prefix] },
)

const filtered = computed(() => {
  const q = text.value.trim().toLowerCase()
  const list = pages.value || []
  if (!q) return list
  return list.filter(
    (p) => p.title?.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
  )
})

const kindCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const p of pages.value || []) counts[p.kind] = (counts[p.kind] || 0) + 1
  return counts
})

const kindOptions = [
  { value: '', label: 'All kinds' },
  { value: 'entity', label: 'Entity' },
  { value: 'topic', label: 'Topic' },
  { value: 'synthesis', label: 'Synthesis' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'summary', label: 'Summary' },
  { value: 'system', label: 'System' },
  { value: 'custom', label: 'Custom' },
]
</script>

<template>
  <div class="space-y-5">
    <!-- Special pages -->
    <div class="grid gap-3 sm:grid-cols-3">
      <NuxtLink :to="`/spaces/${id}/wiki/index`" class="panel group flex items-center gap-3 px-4 py-3 transition hover:border-rubric">
        <span class="font-display text-xl text-rubric">⌘</span>
        <div><div class="font-medium text-ink group-hover:text-rubric-ink">Index</div><div class="label">The catalogue</div></div>
      </NuxtLink>
      <NuxtLink :to="`/spaces/${id}/log`" class="panel group flex items-center gap-3 px-4 py-3 transition hover:border-rubric">
        <span class="font-display text-xl text-rubric">❡</span>
        <div><div class="font-medium text-ink group-hover:text-rubric-ink">Log</div><div class="label">Chronicle</div></div>
      </NuxtLink>
      <NuxtLink :to="`/spaces/${id}/lint`" class="panel group flex items-center gap-3 px-4 py-3 transition hover:border-rubric">
        <span class="font-display text-xl text-rubric">⚖</span>
        <div><div class="font-medium text-ink group-hover:text-rubric-ink">Lint report</div><div class="label">Health</div></div>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-3">
      <div class="min-w-[180px] flex-1">
        <UiInput v-model="text" placeholder="Filter by title or path…" />
      </div>
      <div class="w-44"><UiSelect v-model="kind" :options="kindOptions" /></div>
      <div class="w-52"><UiInput v-model="prefix" mono placeholder="path prefix e.g. entities/" /></div>
    </div>

    <!-- Kind chips -->
    <div v-if="Object.keys(kindCounts).length" class="flex flex-wrap gap-2">
      <button
        v-for="(c, k) in kindCounts"
        :key="k"
        class="text-xs"
        @click="kind = kind === k ? '' : (k as string)"
      >
        <UiBadge :tone="pageKind(k as string)">{{ pageKind(k as string).label }} · {{ c }}</UiBadge>
      </button>
    </div>

    <div v-if="pending" class="panel h-64 animate-pulse opacity-60" />

    <UiCard v-else-if="!filtered.length" raised>
      <UiEmpty
        mark="✑"
        title="No pages found"
        :hint="(pages?.length ? 'Try clearing the filters.' : 'Ingest a source to populate the wiki.')"
      >
        <UiButton v-if="!pages?.length" variant="primary" :to="`/spaces/${id}/sources`">Add a source</UiButton>
        <UiButton v-else @click="kind = ''; prefix = ''; text = ''">Clear filters</UiButton>
      </UiEmpty>
    </UiCard>

    <div v-else class="panel divide-y divide-[var(--c-hair)] overflow-hidden">
      <NuxtLink
        v-for="p in filtered"
        :key="p.path"
        :to="`/spaces/${id}/wiki/${p.path}`"
        class="flex items-center gap-3 px-4 py-3 transition hover:bg-[color-mix(in_oklab,var(--c-ink)_3%,transparent)]"
      >
        <KindBadge :kind="p.kind" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-ink">{{ p.title || p.path }}</p>
          <p class="mono truncate text-xs text-faint">{{ p.path }}</p>
        </div>
        <span v-if="p.source_refs?.length" class="hidden shrink-0 text-xs text-muted sm:block">
          {{ p.source_refs.length }} src
        </span>
        <span class="mono hidden shrink-0 text-xs text-faint md:block">{{ relativeTime(p.updated_at) }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
