<script setup lang="ts">
const route = useRoute()
const { id } = useSpaceCtx()
const api = useGlossa()

const path = computed(() => {
  const p = route.params.path
  return Array.isArray(p) ? p.join('/') : (p as string)
})
const isIndex = computed(() => path.value === 'index' || path.value === 'index.md')

const { data: page, pending, error } = await useAsyncData(
  () => `page:${id}:${path.value}`,
  async () => {
    if (isIndex.value) {
      const idx = await api.pages.index(id)
      return { path: 'index', kind: 'system', title: 'Index', content: idx.content } as PageWithContent
    }
    return api.pages.get(id, path.value)
  },
  { watch: [path] },
)

// Resolve source_refs → titles/links (shared cache with the Sources tab).
const { data: sources } = await useAsyncData(`sources:${id}`, () =>
  api.sources.list(id, { limit: 100 }),
)
const sourceMap = computed(() => {
  const m: Record<string, Source> = {}
  for (const s of sources.value || []) m[s.id] = s
  return m
})

const frontmatterEntries = computed(() => {
  const fm = page.value?.frontmatter || {}
  return Object.entries(fm).filter(([k]) => !['title', 'kind'].includes(k))
})
</script>

<template>
  <div>
    <NuxtLink :to="`/spaces/${id}/pages`" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-rubric">
      <span aria-hidden="true">←</span> Wiki
    </NuxtLink>

    <div v-if="pending" class="panel h-96 animate-pulse opacity-60" />

    <UiCard v-else-if="error" raised>
      <UiEmpty mark="∅" title="Page not found" :hint="`No page at “${path}”. It may have been renamed, or not written yet.`">
        <UiButton :to="`/spaces/${id}/pages`">Back to wiki</UiButton>
      </UiEmpty>
    </UiCard>

    <div v-else-if="page" class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
      <!-- Manuscript leaf -->
      <article class="rise">
        <header class="mb-6 border-b border-hair pb-5">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <KindBadge :kind="page.kind" />
            <UiCopy :value="page.path" :label="page.path" />
          </div>
          <h1 class="font-display text-[2.4rem] leading-[1.08] tracking-tight text-ink">{{ page.title || page.path }}</h1>
          <p v-if="page.updated_at" class="mt-2 text-sm text-muted">Updated {{ absoluteTime(page.updated_at) }}</p>
        </header>

        <div class="border-l border-hair pl-6 sm:pl-8" style="margin-left: -1px">
          <MarkdownView :content="page.content" :space-id="id" />
        </div>
      </article>

      <!-- Margin gloss -->
      <aside class="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <div v-if="page.source_refs?.length">
          <div class="label mb-2">Sources · {{ page.source_refs.length }}</div>
          <div class="space-y-2">
            <a
              v-for="sid in page.source_refs"
              :key="sid"
              :href="sourceMap[sid]?.external_uri || undefined"
              :target="sourceMap[sid]?.external_uri ? '_blank' : undefined"
              rel="noopener"
              class="block rounded-md border border-hair px-3 py-2 text-sm transition hover:border-rubric"
              :class="sourceMap[sid]?.external_uri ? 'cursor-pointer' : 'cursor-default'"
            >
              <span class="block truncate text-ink">{{ sourceMap[sid]?.title || sid }}</span>
              <span class="mono text-[10px] text-faint">{{ sid }}</span>
            </a>
          </div>
        </div>

        <div v-if="page.backlinks?.length">
          <div class="label mb-2">Linked from · {{ page.backlinks.length }}</div>
          <div class="space-y-1">
            <NuxtLink
              v-for="b in page.backlinks"
              :key="b"
              :to="`/spaces/${id}/wiki/${b}`"
              class="mono block truncate text-xs text-azure hover:underline"
            >
              {{ b }}
            </NuxtLink>
          </div>
        </div>

        <div v-if="frontmatterEntries.length">
          <div class="label mb-2">Frontmatter</div>
          <dl class="space-y-1.5 text-sm">
            <div v-for="[k, v] in frontmatterEntries" :key="k">
              <dt class="mono text-[10px] uppercase tracking-wide text-faint">{{ k }}</dt>
              <dd class="text-ink">{{ typeof v === 'object' ? JSON.stringify(v) : v }}</dd>
            </div>
          </dl>
        </div>

        <div v-if="page.size_bytes" class="text-xs text-faint">{{ bytes(page.size_bytes) }}</div>
      </aside>
    </div>
  </div>
</template>
