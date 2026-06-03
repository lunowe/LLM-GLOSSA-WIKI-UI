<script setup lang="ts">
const { id } = useSpaceCtx()
const api = useGlossa()
const toast = useToast()

interface Turn {
  id: number
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  error?: string
  tools: ChatToolEvent[]
  cited_sources?: CitedSource[]
  cited_pages?: string[]
  pages_consulted?: string[]
  saved_pages?: string[]
}

const turns = ref<Turn[]>([])
const draft = ref('')
const sending = ref(false)
const allowWrites = ref(false)
const maxPages = ref(8)
const context = ref('')
const showContext = ref(false)
let seq = 0
let controller: AbortController | null = null

const suggestions = [
  'What does this wiki cover? Start from the index.',
  'Summarise the most recent additions to the wiki.',
  'Where are the gaps or open questions in what we know?',
]

const TOOL_LABELS: Record<string, string> = {
  read_index: 'Read the index',
  read_recent_log: 'Read the chronicle',
  search_pages: 'Search pages',
  read_page: 'Read a page',
  save_note: 'Save a note',
}
const toolLabel = (name: string) => TOOL_LABELS[name] || name

function toolDetail(e: ChatToolEvent): string {
  const a = e.args
  if (a && typeof a === 'object') {
    const o = a as Record<string, unknown>
    if (o.query != null) return String(o.query)
    if (o.path != null) return String(o.path)
    if (o.title != null) return String(o.title)
    if (o.tail != null) return `last ${o.tail}`
  } else if (typeof a === 'string') {
    return a
  }
  return ''
}

function scrollToEnd() {
  if (!import.meta.client) return
  nextTick(() => document.getElementById('chat-end')?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
}

function failTurn(t: Turn | undefined, err: unknown) {
  const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Chat failed.'
  if (t) {
    t.streaming = false
    t.error = message
  }
  toast.error('Chat failed', message)
}

async function send(text?: string) {
  const msg = (text ?? draft.value).trim()
  if (!msg || sending.value) return
  sending.value = true

  const userTurn: Turn = { id: ++seq, role: 'user', content: msg, tools: [] }
  const asst: Turn = { id: ++seq, role: 'assistant', content: '', streaming: true, tools: [] }
  turns.value.push(userTurn, asst)
  draft.value = ''
  scrollToEnd()

  // The backend is stateless: send the prior finalized turns plus this message.
  const messages: ChatMessage[] = turns.value
    .filter((t) => t.id !== asst.id && t.content)
    .map((t) => ({ role: t.role, content: t.content }))

  const body: ChatRequest = {
    messages,
    max_pages: maxPages.value,
    allow_writes: allowWrites.value,
    ...(context.value.trim() ? { context: context.value.trim() } : {}),
  }

  const live = () => turns.value.find((t) => t.id === asst.id)
  controller = new AbortController()
  let gotFinal = false

  function applyFinal(r: ChatResponse) {
    const t = live()
    if (!t) return
    gotFinal = true
    if (r.answer) t.content = r.answer
    t.cited_sources = r.cited_sources
    t.cited_pages = r.cited_pages
    t.pages_consulted = r.pages_consulted
    t.saved_pages = r.saved_pages
    if (r.tool_calls?.length) t.tools = r.tool_calls
    t.streaming = false
    if (r.saved_pages?.length) toast.success('Note saved to the wiki', r.saved_pages.join(', '))
  }

  try {
    await api.chatStream(id, body, {
      signal: controller.signal,
      onDelta: (chunk) => {
        const t = live()
        if (t) {
          t.content += chunk
          scrollToEnd()
        }
      },
      onToolCall: (e) => {
        live()?.tools.push({ name: e.name, args: e.args as ChatToolEvent['args'] })
        scrollToEnd()
      },
      onToolResult: (e) => {
        const t = live()
        if (!t) return
        const slot = [...t.tools].reverse().find((x) => x.name === e.name && x.result == null)
        if (slot) slot.result = e.result ?? null
      },
      onFinal: applyFinal,
    })
    const t = live()
    if (t && t.streaming) t.streaming = false // server closed without an explicit final
  } catch (err) {
    const t = live()
    if (controller?.signal.aborted) {
      if (t) t.streaming = false
    } else if (!gotFinal && !(t && t.content) && (!(err instanceof ApiError) || err.status >= 500)) {
      // Nothing streamed — fall back to the non-streaming endpoint once.
      try {
        applyFinal(await api.chat(id, body))
      } catch (e2) {
        failTurn(t, e2)
      }
    } else if (t && t.content) {
      t.streaming = false
      toast.error('Chat stream interrupted', 'Showing the partial answer.')
    } else {
      failTurn(t, err)
    }
  } finally {
    sending.value = false
    controller = null
    scrollToEnd()
  }
}

function stop() {
  controller?.abort()
}

function reset() {
  if (sending.value) return
  turns.value = []
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-3xl flex-col gap-6">
    <!-- Intro + suggestions (before first turn) -->
    <div v-if="!turns.length" class="rise space-y-5">
      <div class="raised p-6 sm:p-8 inkdrop">
        <div class="mb-2 flex items-center gap-2">
          <span class="font-display text-2xl text-rubric">☞</span>
          <h2 class="font-display text-2xl text-ink">Converse with the wiki</h2>
        </div>
        <p class="text-muted">
          The chat reads <code>index.md</code>, searches and reads pages, and answers with
          cited <span class="mono text-sm">[[wikilinks]]</span> — using the wiki as its memory rather than guessing.
          Turn on <em>Save notes</em> to let a useful exchange be filed back under
          <span class="mono text-sm">notes/</span>.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in suggestions"
          :key="s"
          class="rounded-full border border-hair px-3.5 py-1.5 text-sm text-muted transition hover:border-rubric hover:text-rubric"
          @click="send(s)"
        >
          {{ s }}
        </button>
      </div>
    </div>

    <!-- Conversation -->
    <div v-if="turns.length" class="flex-1 space-y-6">
      <template v-for="t in turns" :key="t.id">
        <!-- User -->
        <div v-if="t.role === 'user'" class="rise">
          <p class="border-l-2 border-rubric pl-4 font-display text-lg italic text-ink">{{ t.content }}</p>
        </div>

        <!-- Assistant -->
        <article v-else class="raised p-5 sm:p-6 inkdrop">
          <!-- Tool trace -->
          <details v-if="t.tools.length" class="mb-3 rounded-md border border-hair bg-[color-mix(in_oklab,var(--c-ink)_3%,transparent)] px-3 py-2">
            <summary class="label cursor-pointer select-none list-none">
              <span class="text-rubric">❧</span>
              Consulted the wiki · {{ t.tools.length }} step{{ t.tools.length === 1 ? '' : 's' }}
            </summary>
            <ul class="mt-2 space-y-1">
              <li v-for="(e, i) in t.tools" :key="i" class="flex items-baseline gap-2 text-xs text-muted">
                <span class="text-ink">{{ toolLabel(e.name) }}</span>
                <span v-if="toolDetail(e)" class="mono truncate text-faint">{{ toolDetail(e) }}</span>
                <span v-if="e.result" class="mono ml-auto shrink-0 text-faint">{{ e.result }}</span>
              </li>
            </ul>
          </details>

          <!-- Thinking (no content yet) -->
          <p v-if="t.streaming && !t.content" class="flex items-center gap-2 text-muted">
            <UiSpinner class="h-4 w-4" /> Consulting the wiki…
          </p>

          <!-- Streaming text (plain, with caret) → rendered markdown once settled -->
          <div
            v-else-if="t.streaming"
            class="whitespace-pre-wrap font-body text-[1.02rem] leading-relaxed text-ink"
          >{{ t.content }}<span class="caret">▍</span></div>
          <MarkdownView v-else-if="t.content" :content="t.content" :space-id="id" />

          <!-- Error -->
          <p v-if="t.error" class="mt-2 text-sm text-rubric-ink">{{ t.error }}</p>

          <!-- Saved note -->
          <div v-if="t.saved_pages?.length" class="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span class="label text-rubric">✒ Saved to the wiki</span>
            <NuxtLink
              v-for="p in t.saved_pages"
              :key="p"
              :to="`/spaces/${id}/wiki/${p}`"
              class="token hover:border-rubric hover:text-rubric"
            >
              {{ p }}
            </NuxtLink>
          </div>

          <!-- Cited sources -->
          <div v-if="t.cited_sources?.length" class="mt-5">
            <div class="label mb-2.5">Cited sources</div>
            <div class="grid gap-2 sm:grid-cols-2">
              <CitationCard v-for="src in t.cited_sources" :key="src.id" :source="src" />
            </div>
          </div>

          <!-- Cited pages -->
          <div v-if="t.cited_pages?.length" class="mt-4">
            <div class="label mb-2">Cited pages</div>
            <div class="flex flex-wrap gap-1.5">
              <NuxtLink
                v-for="p in t.cited_pages"
                :key="p"
                :to="`/spaces/${id}/wiki/${p}`"
                class="token hover:border-rubric hover:text-rubric"
              >
                {{ p }}
              </NuxtLink>
            </div>
          </div>

          <!-- Pages consulted -->
          <div v-if="t.pages_consulted?.length" class="mt-4">
            <div class="label mb-2">Pages read · {{ t.pages_consulted.length }}</div>
            <div class="flex flex-wrap gap-1.5">
              <NuxtLink
                v-for="p in t.pages_consulted"
                :key="p"
                :to="`/spaces/${id}/wiki/${p}`"
                class="mono text-xs text-faint hover:text-rubric"
              >
                {{ p }}
              </NuxtLink>
            </div>
          </div>
        </article>
      </template>
      <div id="chat-end" />
    </div>

    <!-- Composer -->
    <div class="sticky bottom-4 z-10">
      <div class="raised overflow-hidden bg-paper/95 backdrop-blur">
        <div class="px-5 pt-4">
          <div class="mb-1.5 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-display text-lg text-rubric">“</span>
              <span class="label">Message the wiki</span>
            </div>
            <button
              v-if="turns.length"
              class="text-xs text-faint transition hover:text-rubric disabled:opacity-50"
              :disabled="sending"
              @click="reset"
            >
              New conversation
            </button>
          </div>
          <textarea
            v-model="draft"
            rows="2"
            class="w-full resize-none border-0 bg-transparent p-0 font-body text-lg leading-relaxed text-ink outline-none placeholder:text-faint"
            placeholder="Ask, compare, or paste something to discuss…"
            @keydown="onKeydown"
          />
        </div>

        <!-- Optional pasted context -->
        <div v-if="showContext" class="px-5 pb-1">
          <UiTextarea
            v-model="context"
            :rows="3"
            placeholder="Paste material to discuss against the wiki (not saved unless you ask)…"
          />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-hair px-5 py-3">
          <div class="flex flex-wrap items-center gap-4">
            <label class="flex items-center gap-2 text-sm text-muted">
              <span class="label">Max pages</span>
              <input v-model.number="maxPages" type="range" min="1" max="20" class="accent-[var(--c-rubric)]" />
              <span class="mono w-6 text-ink">{{ maxPages }}</span>
            </label>
            <label class="flex items-center gap-2 text-sm text-muted" title="Let the agent file a compact note back into the wiki under notes/…">
              <input v-model="allowWrites" type="checkbox" class="accent-[var(--c-rubric)]" />
              <span>Save notes</span>
            </label>
            <button
              class="text-sm text-muted transition hover:text-rubric"
              :class="showContext ? 'text-rubric' : ''"
              @click="showContext = !showContext"
            >
              {{ showContext ? '− Context' : '+ Context' }}
            </button>
          </div>
          <div class="flex items-center gap-3">
            <span class="hidden text-xs text-faint sm:block">⌘↵ to send</span>
            <UiButton v-if="sending" @click="stop">Stop</UiButton>
            <UiButton v-else variant="primary" :disabled="!draft.trim()" @click="send()">
              Send <span aria-hidden="true">→</span>
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.caret {
  display: inline-block;
  margin-left: 1px;
  color: var(--c-rubric);
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
