<script setup lang="ts">
const { id } = useSpaceCtx()
const api = useGlossa()
const toast = useToast()

const question = ref('')
const maxPages = ref(8)
const asking = ref(false)

interface Answered {
  question: string
  response: QueryResponse
  at: number
}
const history = ref<Answered[]>([])
const showReasoning = ref(false)

const suggestions = [
  'Summarise the key entities in this wiki.',
  'What are the most recent developments?',
  'Compare the main positions on this topic.',
]

async function ask() {
  const q = question.value.trim()
  if (!q || asking.value) return
  asking.value = true
  showReasoning.value = false
  try {
    const response = await api.query(id, { question: q, max_pages: maxPages.value })
    history.value.unshift({ question: q, response, at: Date.now() })
    question.value = ''
  } catch (e) {
    toast.error('Query failed', e instanceof ApiError ? e.message : undefined)
  } finally {
    asking.value = false
  }
}

const latest = computed(() => history.value[0])
const older = computed(() => history.value.slice(1))

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') ask()
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-7">
    <!-- Composer -->
    <div class="raised overflow-hidden rise">
      <div class="px-5 pt-5">
        <div class="mb-2 flex items-center gap-2">
          <span class="font-display text-xl text-rubric">“</span>
          <span class="label">Ask the wiki</span>
        </div>
        <textarea
          v-model="question"
          rows="3"
          class="w-full resize-none border-0 bg-transparent p-0 font-body text-xl leading-relaxed text-ink outline-none placeholder:text-faint"
          placeholder="What would you like to know?"
          @keydown="onKeydown"
        />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-hair px-5 py-3">
        <label class="flex items-center gap-2 text-sm text-muted">
          <span class="label">Max pages</span>
          <input v-model.number="maxPages" type="range" min="1" max="20" class="accent-[var(--c-rubric)]" />
          <span class="mono w-6 text-ink">{{ maxPages }}</span>
        </label>
        <div class="flex items-center gap-3">
          <span class="hidden text-xs text-faint sm:block">⌘↵ to ask</span>
          <UiButton variant="primary" :loading="asking" :disabled="!question.trim()" @click="ask">
            {{ asking ? 'Consulting…' : 'Ask' }}
            <span v-if="!asking" aria-hidden="true">→</span>
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Suggestions (only before first answer) -->
    <div v-if="!history.length && !asking" class="flex flex-wrap gap-2">
      <button
        v-for="s in suggestions"
        :key="s"
        class="rounded-full border border-hair px-3.5 py-1.5 text-sm text-muted transition hover:border-rubric hover:text-rubric"
        @click="question = s"
      >
        {{ s }}
      </button>
    </div>

    <!-- Thinking -->
    <div v-if="asking" class="raised p-6">
      <div class="mb-4 h-0.5 w-full overflow-hidden bg-[color-mix(in_oklab,var(--c-ink)_8%,transparent)]">
        <div class="scribing h-full w-full" />
      </div>
      <p class="flex items-center gap-2 text-muted">
        <UiSpinner class="h-4 w-4" /> Consulting the wiki and gathering citations…
      </p>
    </div>

    <!-- Latest answer -->
    <article v-if="latest" :key="latest.at" class="raised p-6 inkdrop sm:p-8">
      <p class="mb-5 border-l-2 border-rubric pl-4 font-display text-lg italic text-muted">
        {{ latest.question }}
      </p>

      <MarkdownView :content="latest.response.answer" :space-id="id" />

      <!-- Citations -->
      <div v-if="latest.response.cited_sources?.length" class="mt-7">
        <div class="label mb-2.5">Cited sources</div>
        <div class="grid gap-2 sm:grid-cols-2">
          <CitationCard v-for="src in latest.response.cited_sources" :key="src.id" :source="src" />
        </div>
      </div>

      <div v-if="latest.response.cited_pages?.length" class="mt-5">
        <div class="label mb-2">Cited pages</div>
        <div class="flex flex-wrap gap-1.5">
          <NuxtLink
            v-for="p in latest.response.cited_pages"
            :key="p"
            :to="`/spaces/${id}/wiki/${p}`"
            class="token hover:border-rubric hover:text-rubric"
          >
            {{ p }}
          </NuxtLink>
        </div>
      </div>

      <div v-if="latest.response.pages_consulted?.length" class="mt-5">
        <div class="label mb-2">Pages consulted · {{ latest.response.pages_consulted.length }}</div>
        <div class="flex flex-wrap gap-1.5">
          <NuxtLink
            v-for="p in latest.response.pages_consulted"
            :key="p"
            :to="`/spaces/${id}/wiki/${p}`"
            class="mono text-xs text-faint hover:text-rubric"
          >
            {{ p }}
          </NuxtLink>
        </div>
      </div>

      <div v-if="latest.response.reasoning" class="mt-6 border-t border-hair pt-4">
        <button class="flex items-center gap-1.5 text-sm text-muted hover:text-rubric" @click="showReasoning = !showReasoning">
          <svg class="h-4 w-4 transition" :class="showReasoning ? 'rotate-90' : ''" viewBox="0 0 24 24" fill="none">
            <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ showReasoning ? 'Hide' : 'Show' }} reasoning
        </button>
        <p v-if="showReasoning" class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted inkdrop">
          {{ latest.response.reasoning }}
        </p>
      </div>
    </article>

    <!-- Earlier in this session -->
    <div v-if="older.length" class="space-y-3">
      <div class="label">Earlier this session</div>
      <details v-for="a in older" :key="a.at" class="panel group px-4 py-3">
        <summary class="cursor-pointer list-none">
          <span class="font-display text-base text-ink">{{ a.question }}</span>
        </summary>
        <div class="mt-4 border-t border-hair pt-4">
          <MarkdownView :content="a.response.answer" :space-id="id" />
        </div>
      </details>
    </div>
  </div>
</template>
