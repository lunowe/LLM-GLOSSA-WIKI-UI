<script setup lang="ts">
// Remount when the wiki id changes (so provideSpace re-runs with the right id),
// but stay mounted while navigating between this wiki's own sub-tabs.
definePageMeta({ key: (route) => `space-${route.params.id}` })

const route = useRoute()
const api = useGlossa()
const { captureTenant } = useAuth()
const id = computed(() => route.params.id as string)

const { data: space, pending, error, refresh } = await useAsyncData(
  () => `space:${id.value}`,
  () => api.spaces.get(id.value),
  { watch: [id] },
)

watchEffect(() => {
  if (space.value) captureTenant(space.value)
})

provideSpace({
  id: id.value,
  space,
  refresh: async () => {
    await refresh()
  },
})

const tabs = computed(() => [
  { label: 'Overview', to: `/spaces/${id.value}`, match: (p: string) => p === `/spaces/${id.value}` },
  { label: 'Sources', to: `/spaces/${id.value}/sources`, match: (p: string) => p.startsWith(`/spaces/${id.value}/sources`) },
  { label: 'Wiki', to: `/spaces/${id.value}/pages`, match: (p: string) => p.startsWith(`/spaces/${id.value}/pages`) || p.startsWith(`/spaces/${id.value}/wiki`) },
  { label: 'Query', to: `/spaces/${id.value}/query`, match: (p: string) => p.startsWith(`/spaces/${id.value}/query`) },
  { label: 'Log', to: `/spaces/${id.value}/log`, match: (p: string) => p.startsWith(`/spaces/${id.value}/log`) },
  { label: 'Lint', to: `/spaces/${id.value}/lint`, match: (p: string) => p.startsWith(`/spaces/${id.value}/lint`) },
  { label: 'Schema', to: `/spaces/${id.value}/schema`, match: (p: string) => p.startsWith(`/spaces/${id.value}/schema`) },
  { label: 'Webhooks', to: `/spaces/${id.value}/webhooks`, match: (p: string) => p.startsWith(`/spaces/${id.value}/webhooks`) },
])
</script>

<template>
  <div>
    <NuxtLink to="/" class="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-rubric">
      <span aria-hidden="true">←</span> All wikis
    </NuxtLink>

    <div v-if="pending && !space" class="panel h-32 animate-pulse opacity-60" />

    <UiCard v-else-if="error" raised>
      <div class="flex items-center gap-3 text-rubric-ink">
        <span class="font-display text-2xl">✕</span>
        <div>
          <p class="font-medium">This wiki could not be opened.</p>
          <p class="text-sm text-muted">{{ (error as Error).message }} — it may not exist, or your key can't reach it.</p>
        </div>
      </div>
      <UiButton class="mt-4" to="/">Back to library</UiButton>
    </UiCard>

    <template v-else-if="space">
      <!-- Header -->
      <header class="rise">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="mb-2 flex items-center gap-2">
              <span class="font-display text-2xl text-rubric">¶</span>
              <h1 class="font-display text-3xl text-ink sm:text-4xl">{{ space.name }}</h1>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
              <span class="label">{{ space.slug }}</span>
              <UiCopy :value="space.id" :label="space.id" />
              <span class="token">{{ space.llm_config?.model || space.llm_config?.provider || space.llm_config?.mode || 'openai' }}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <UiButton :to="`/spaces/${space.id}/sources`">Add source</UiButton>
            <UiButton variant="primary" :to="`/spaces/${space.id}/query`">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              Ask the wiki
            </UiButton>
          </div>
        </div>

        <!-- Tabs -->
        <div class="mt-6 flex gap-5 overflow-x-auto border-b border-hair">
          <NuxtLink
            v-for="t in tabs"
            :key="t.to"
            :to="t.to"
            class="tab"
            :class="t.match(route.path) ? 'tab-active' : ''"
          >
            {{ t.label }}
          </NuxtLink>
        </div>
      </header>

      <div class="py-7">
        <NuxtPage />
      </div>
    </template>
  </div>
</template>
