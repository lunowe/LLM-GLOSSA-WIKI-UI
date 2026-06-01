<script setup lang="ts">
const api = useGlossa()
const { captureTenant } = useAuth()
const toast = useToast()
const route = useRoute()

const { data: spaces, pending, error, refresh } = useSpaces()

watchEffect(() => {
  if (spaces.value?.length) captureTenant(spaces.value[0])
})

const totals = computed(() => {
  const list = spaces.value || []
  return {
    wikis: list.length,
    pages: list.reduce((a, s) => a + (s.stats?.page_count || 0), 0),
    sources: list.reduce((a, s) => a + (s.stats?.source_count || 0), 0),
  }
})

// ── Create wiki ────────────────────────────────────────────────────────
const showCreate = ref(route.query.new === '1')
const creating = ref(false)
const showAdvanced = ref(false)
const form = reactive({
  name: '',
  slug: '',
  provider: 'openai',
  base_url: '',
  model: '',
  api_key_ref: '',
  schema_markdown: '',
})

async function createSpace() {
  if (!form.name.trim()) return
  creating.value = true
  try {
    const body: Record<string, unknown> = { name: form.name.trim() }
    if (form.slug.trim()) body.slug = form.slug.trim()
    const llm: Record<string, unknown> = { provider: form.provider }
    if (form.base_url.trim()) llm.base_url = form.base_url.trim()
    if (form.model.trim()) llm.model = form.model.trim()
    if (form.api_key_ref.trim()) llm.api_key_ref = form.api_key_ref.trim()
    // Only send llm_config if the user customized it; otherwise the server's defaults apply.
    if (form.provider !== 'openai' || Object.keys(llm).length > 1) body.llm_config = llm
    if (form.schema_markdown.trim()) body.schema_markdown = form.schema_markdown

    const space = await api.spaces.create(body)
    captureTenant(space)
    toast.success('Wiki created', space.name)
    showCreate.value = false
    await refreshSpaces()
    await navigateTo(`/spaces/${space.id}`)
  } catch (e) {
    toast.error('Could not create wiki', e instanceof ApiError ? e.message : undefined)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4 rise">
      <div>
        <p class="label mb-1.5">Your library</p>
        <h1 class="font-display text-4xl text-ink">Wikis</h1>
      </div>
      <UiButton variant="primary" @click="showCreate = true">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        New wiki
      </UiButton>
    </header>

    <!-- At a glance -->
    <div v-if="spaces && spaces.length" class="mb-8 grid grid-cols-3 gap-3 rise" style="animation-delay: 60ms">
      <div class="panel px-5 py-4">
        <div class="font-display text-3xl text-ink">{{ num(totals.wikis) }}</div>
        <div class="label mt-1">Wikis</div>
      </div>
      <div class="panel px-5 py-4">
        <div class="font-display text-3xl text-ink">{{ num(totals.pages) }}</div>
        <div class="label mt-1">Pages</div>
      </div>
      <div class="panel px-5 py-4">
        <div class="font-display text-3xl text-ink">{{ num(totals.sources) }}</div>
        <div class="label mt-1">Sources</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="i in 3" :key="i" class="panel h-40 animate-pulse opacity-60" />
    </div>

    <!-- Error -->
    <UiCard v-else-if="error" raised>
      <div class="flex items-center gap-3 text-rubric-ink">
        <span class="font-display text-2xl">✕</span>
        <div>
          <p class="font-medium">Couldn't load your wikis.</p>
          <p class="text-sm text-muted">{{ (error as Error).message }}</p>
        </div>
      </div>
      <UiButton class="mt-4" @click="refresh()">Retry</UiButton>
    </UiCard>

    <!-- Grid -->
    <div v-else-if="spaces && spaces.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="(s, i) in spaces" :key="s.id" class="rise" :style="{ animationDelay: `${i * 45 + 100}ms` }">
        <SpaceCard :space="s" />
      </div>
    </div>

    <!-- Empty -->
    <UiCard v-else raised>
      <UiEmpty
        mark="❦"
        title="Your library is empty"
        hint="Create your first wiki, hand it a few sources, and Glossa will keep an interlinked knowledge base current for you."
      >
        <UiButton variant="primary" @click="showCreate = true">Create your first wiki</UiButton>
      </UiEmpty>
    </UiCard>

    <!-- Create modal -->
    <UiModal v-model:open="showCreate" title="New wiki" subtitle="A wiki is one Space, backed by its own storage prefix." wide>
      <form class="space-y-4" @submit.prevent="createSpace">
        <UiField label="Name">
          <UiInput v-model="form.name" placeholder="Research Wiki" autofocus />
        </UiField>
        <UiField label="Slug" optional hint="Auto-derived from the name if left blank (German-folded, lowercased).">
          <UiInput v-model="form.slug" mono placeholder="research-wiki" />
        </UiField>

        <button type="button" class="flex items-center gap-1.5 text-sm text-muted hover:text-rubric" @click="showAdvanced = !showAdvanced">
          <svg class="h-4 w-4 transition" :class="showAdvanced ? 'rotate-90' : ''" viewBox="0 0 24 24" fill="none">
            <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          LLM configuration &amp; schema
        </button>

        <div v-if="showAdvanced" class="space-y-4 rounded-lg border border-hair bg-[color-mix(in_oklab,var(--c-ink)_3%,transparent)] p-4 inkdrop">
          <div class="grid gap-4 sm:grid-cols-2">
            <UiField label="Provider" hint="Inference runs through Pydantic AI on the Glossa server.">
              <UiSelect v-model="form.provider" :options="[{ value: 'openai', label: 'OpenAI / OpenAI-compatible' }, { value: 'anthropic', label: 'Anthropic (Claude)' }]" />
            </UiField>
            <UiField label="Model" optional>
              <UiInput v-model="form.model" mono placeholder="gpt-4o-mini · claude-sonnet-4-6" />
            </UiField>
          </div>
          <UiField label="Base URL" optional hint="OpenAI-compatible endpoint — Groq, OpenRouter, Together, Ollama, or a local server. Blank = provider default.">
            <UiInput v-model="form.base_url" mono placeholder="https://api.openai.com/v1" />
          </UiField>
          <UiField label="API key reference" optional hint='Name of an env var on the Glossa server, e.g. "env:OPENAI_API_KEY". Keys live server-side — never entered here.'>
            <UiInput v-model="form.api_key_ref" mono placeholder="env:OPENAI_API_KEY" />
          </UiField>
          <UiField label="Schema markdown" optional hint="Seeds schema.md — the LLM-facing wiki conventions.">
            <UiTextarea v-model="form.schema_markdown" :rows="4" mono placeholder="# Schema&#10;Entities: companies, people…" />
          </UiField>
        </div>
      </form>

      <template #footer>
        <UiButton @click="showCreate = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="creating" :disabled="!form.name.trim()" @click="createSpace">
          Create wiki
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
