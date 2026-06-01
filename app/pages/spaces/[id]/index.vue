<script setup lang="ts">
const { id, space, refresh } = useSpaceCtx()
const api = useGlossa()
const toast = useToast()

const { data: pages } = await useAsyncData(`ov-pages:${id}`, () =>
  api.pages.list(id, { limit: 8 }),
)
const { data: sources } = await useAsyncData(`ov-sources:${id}`, () =>
  api.sources.list(id, { limit: 5 }),
)
const { data: log } = await useAsyncData(`ov-log:${id}`, () =>
  api.pages.log(id, 6).catch(() => ({ path: 'log.md', content: '' })),
)

const recentPages = computed(() =>
  [...(pages.value || [])]
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
    .slice(0, 8),
)

// ── Settings ───────────────────────────────────────────────────────────
const showSettings = ref(false)
const saving = ref(false)
const form = reactive({ name: '', provider: 'openai', base_url: '', model: '', api_key_ref: '' })

function openSettings() {
  const s = space.value
  if (!s) return
  form.name = s.name
  // Prefer the provider-agnostic fields; fall back to legacy mode/endpoint.
  form.provider = s.llm_config?.provider || (s.llm_config?.mode === 'hosted' ? 'anthropic' : 'openai')
  form.base_url = s.llm_config?.base_url || s.llm_config?.endpoint || ''
  form.model = s.llm_config?.model || ''
  form.api_key_ref = s.llm_config?.api_key_ref || ''
  showSettings.value = true
}

async function save() {
  saving.value = true
  try {
    const llm: Record<string, unknown> = { provider: form.provider }
    if (form.base_url.trim()) llm.base_url = form.base_url.trim()
    if (form.model.trim()) llm.model = form.model.trim()
    if (form.api_key_ref.trim()) llm.api_key_ref = form.api_key_ref.trim()
    await api.spaces.update(id, { name: form.name.trim(), llm_config: llm })
    toast.success('Wiki updated')
    showSettings.value = false
    await refresh()
    await refreshSpaces()
  } catch (e) {
    toast.error('Update failed', e instanceof ApiError ? e.message : undefined)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-7">
    <!-- Stats -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="panel px-5 py-4">
        <div class="font-display text-3xl text-ink">{{ num(space?.stats?.page_count) }}</div>
        <div class="label mt-1">Pages</div>
      </div>
      <div class="panel px-5 py-4">
        <div class="font-display text-3xl text-ink">{{ num(space?.stats?.source_count) }}</div>
        <div class="label mt-1">Sources</div>
      </div>
      <div class="panel px-5 py-4">
        <div class="font-display text-lg text-ink">{{ space?.stats?.last_ingest_at ? relativeTime(space.stats.last_ingest_at) : 'Never' }}</div>
        <div class="label mt-1">Last ingest</div>
      </div>
      <button class="panel group px-5 py-4 text-left transition hover:border-rubric" @click="openSettings">
        <div class="flex items-center justify-between">
          <div class="font-display text-lg text-ink group-hover:text-rubric-ink">Settings</div>
          <svg class="h-4 w-4 text-faint group-hover:text-rubric" viewBox="0 0 24 24" fill="none">
            <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="label mt-1">Name &amp; LLM</div>
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-5">
      <!-- Recent pages -->
      <UiCard raised class="lg:col-span-3">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl">Recently touched pages</h2>
          <NuxtLink :to="`/spaces/${id}/pages`" class="text-sm text-rubric hover:underline">Browse all →</NuxtLink>
        </div>
        <div v-if="recentPages.length" class="-mx-2">
          <NuxtLink
            v-for="p in recentPages"
            :key="p.path"
            :to="`/spaces/${id}/wiki/${p.path}`"
            class="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-[color-mix(in_oklab,var(--c-ink)_4%,transparent)]"
          >
            <KindBadge :kind="p.kind" />
            <span class="min-w-0 flex-1 truncate text-sm text-ink">{{ p.title || p.path }}</span>
            <span class="mono shrink-0 text-xs text-faint">{{ relativeTime(p.updated_at) }}</span>
          </NuxtLink>
        </div>
        <UiEmpty
          v-else
          mark="✑"
          title="No pages yet"
          hint="Add a source and ingest it — the scribe will write the first entity pages."
        >
          <UiButton variant="primary" :to="`/spaces/${id}/sources`">Add a source</UiButton>
        </UiEmpty>
      </UiCard>

      <!-- Recent activity + sources -->
      <div class="space-y-6 lg:col-span-2">
        <UiCard raised>
          <h2 class="mb-3 text-xl">Chronicle</h2>
          <MarkdownView v-if="log?.content" :content="log.content" :space-id="id" />
          <p v-else class="text-sm italic text-muted">No log entries yet.</p>
        </UiCard>

        <UiCard raised>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-xl">Latest sources</h2>
            <NuxtLink :to="`/spaces/${id}/sources`" class="text-sm text-rubric hover:underline">All →</NuxtLink>
          </div>
          <div v-if="sources && sources.length" class="space-y-1.5">
            <div v-for="s in sources" :key="s.id" class="flex items-center gap-2.5">
              <UiBadge :tone="sourceStatus(s.status)" />
              <span class="min-w-0 flex-1 truncate text-sm text-ink">{{ s.title }}</span>
            </div>
          </div>
          <p v-else class="text-sm italic text-muted">No sources yet.</p>
        </UiCard>
      </div>
    </div>

    <!-- Settings modal -->
    <UiModal v-model:open="showSettings" title="Wiki settings" subtitle="Rename the wiki and tune its LLM backend.">
      <form class="space-y-4" @submit.prevent="save">
        <UiField label="Name"><UiInput v-model="form.name" /></UiField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField label="Provider">
            <UiSelect v-model="form.provider" :options="[{ value: 'openai', label: 'OpenAI / OpenAI-compatible' }, { value: 'anthropic', label: 'Anthropic (Claude)' }]" />
          </UiField>
          <UiField label="Model" optional><UiInput v-model="form.model" mono placeholder="gpt-4o-mini · claude-sonnet-4-6" /></UiField>
        </div>
        <UiField label="Base URL" optional hint="OpenAI-compatible endpoint (Groq, OpenRouter, Ollama, local…). Blank = provider default."><UiInput v-model="form.base_url" mono placeholder="https://api.openai.com/v1" /></UiField>
        <UiField label="API key reference" optional hint='Env var on the Glossa server, e.g. "env:OPENAI_API_KEY".'>
          <UiInput v-model="form.api_key_ref" mono placeholder="env:OPENAI_API_KEY" />
        </UiField>
      </form>
      <template #footer>
        <UiButton @click="showSettings = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="saving" @click="save">Save changes</UiButton>
      </template>
    </UiModal>
  </div>
</template>
