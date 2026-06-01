<script setup lang="ts">
const { id, space, refresh: refreshSpace } = useSpaceCtx()
const api = useGlossa()
const toast = useToast()

const { data: sources, pending, refresh } = await useAsyncData(`sources:${id}`, () =>
  api.sources.list(id, { limit: 100 }),
)

// ── Ingest (single active job, since the server serialises per space) ────
const poller = useJobPoller()
const activeSourceId = ref<string | null>(null)
const ingestingId = ref<string | null>(null)

async function ingest(src: Source) {
  ingestingId.value = src.id
  try {
    const job = await api.sources.ingest(id, src.id)
    activeSourceId.value = src.id
    poller.job.value = job
    toast.info('Ingest queued', src.title)
    const final = await poller.track(job.id)
    if (final.status === 'succeeded') {
      toast.success('Ingest complete', `${(final.result?.pages_created?.length || 0) + (final.result?.pages_updated?.length || 0)} pages touched.`)
    } else {
      toast.error('Ingest failed', final.error_message || undefined)
    }
    await Promise.all([refresh(), refreshSpace(), refreshSpaces()])
  } catch (e) {
    toast.error('Could not ingest', e instanceof ApiError ? e.message : undefined)
  } finally {
    ingestingId.value = null
  }
}

// ── Add source ───────────────────────────────────────────────────────────
const showAdd = ref(false)
const adding = ref(false)
const file = ref<File | null>(null)
const form = reactive({
  title: '',
  mode: 'push' as IngestionModeT,
  content_inline: '',
  url: '',
  method: 'GET',
  headers: '',
  auth_ref: '',
  external_uri: '',
  metadata: '',
})

const MODES: { value: IngestionModeT; label: string; hint: string }[] = [
  { value: 'push', label: 'Push', hint: 'Paste the raw text of the source directly.' },
  { value: 'pull', label: 'Pull', hint: 'Register a callback URL — Glossa fetches the content on demand.' },
  { value: 'url', label: 'Link', hint: 'Paste a link — Glossa fetches the page and converts it to markdown.' },
  { value: 'upload', label: 'Upload', hint: 'Upload a document (PDF, DOCX, PPTX…) — parsed to text on ingest.' },
]
const modeHint = computed(() => MODES.find((m) => m.value === form.mode)?.hint ?? '')

function resetForm() {
  Object.assign(form, {
    title: '', mode: 'push', content_inline: '', url: '', method: 'GET',
    headers: '', auth_ref: '', external_uri: '', metadata: '',
  })
  file.value = null
}

function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null
  file.value = f
  if (f && !form.title.trim()) form.title = f.name
}

function parseJson(raw: string, label: string): Record<string, unknown> | undefined {
  if (!raw.trim()) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`${label} must be valid JSON.`)
  }
}

const canAdd = computed(() => {
  switch (form.mode) {
    case 'push': return !!form.title.trim() && !!form.content_inline.trim()
    case 'pull':
    case 'url': return !!form.title.trim() && !!form.url.trim()
    case 'upload': return !!file.value
    default: return false
  }
})

async function addSource(thenIngest = false) {
  adding.value = true
  try {
    let created: Source
    if (form.mode === 'upload') {
      if (!file.value) throw new Error('Choose a file to upload.')
      created = await api.sources.upload(id, {
        file: file.value,
        title: form.title.trim() || undefined,
        external_uri: form.external_uri.trim() || undefined,
        metadata: parseJson(form.metadata, 'Metadata'),
      })
    } else {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        ingestion_mode: form.mode,
      }
      if (form.mode === 'push') {
        body.content_inline = form.content_inline
      } else if (form.mode === 'pull') {
        body.fetch_callback = {
          url: form.url.trim(),
          method: form.method,
          headers: parseJson(form.headers, 'Headers') || {},
          ...(form.auth_ref.trim() ? { auth_ref: form.auth_ref.trim() } : {}),
        }
      } else if (form.mode === 'url') {
        // The pasted link is both the fetch target and the citation link-back.
        body.external_uri = form.url.trim()
      }
      // For url mode the link already is the external_uri; only push/pull take a separate one.
      if (form.mode !== 'url' && form.external_uri.trim()) body.external_uri = form.external_uri.trim()
      const meta = parseJson(form.metadata, 'Metadata')
      if (meta) body.metadata = meta
      created = await api.sources.create(id, body)
    }
    toast.success('Source added', created.title)
    showAdd.value = false
    resetForm()
    await Promise.all([refresh(), refreshSpace(), refreshSpaces()])
    if (thenIngest) await ingest(created)
  } catch (e) {
    toast.error('Could not add source', e instanceof Error ? e.message : undefined)
  } finally {
    adding.value = false
  }
}

// ── View source ───────────────────────────────────────────────────────────
const viewing = ref<Source | null>(null)
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl">Sources</h2>
        <p class="mt-0.5 text-sm text-muted">Raw artifacts you hand the wiki. Ingest to extract entities and merge pages.</p>
      </div>
      <UiButton variant="primary" @click="showAdd = true">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        Add source
      </UiButton>
    </div>

    <!-- Active ingest -->
    <JobProgress v-if="poller.job.value && (poller.polling.value || activeSourceId)" :job="poller.job.value" :polling="poller.polling.value" />

    <div v-if="pending" class="panel h-48 animate-pulse opacity-60" />

    <UiCard v-else-if="!sources?.length" raised>
      <UiEmpty
        mark="✎"
        title="No sources yet"
        hint="Push raw text, register a pull callback, paste a link, or upload a document — then ingest."
      >
        <UiButton variant="primary" @click="showAdd = true">Add your first source</UiButton>
      </UiEmpty>
    </UiCard>

    <div v-else class="panel divide-y divide-[var(--c-hair)] overflow-hidden">
      <div
        v-for="s in sources"
        :key="s.id"
        class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition hover:bg-[color-mix(in_oklab,var(--c-ink)_3%,transparent)]"
      >
        <UiBadge :tone="sourceStatus(s.status)" dot />
        <button class="min-w-0 flex-1 text-left" @click="viewing = s">
          <p class="truncate font-medium text-ink">{{ s.title }}</p>
          <p class="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <span class="mono">{{ s.ingestion_mode }}</span>
            <span>·</span>
            <span>added {{ relativeTime(s.created_at) }}</span>
            <span v-if="s.last_ingested_at">· ingested {{ relativeTime(s.last_ingested_at) }}</span>
          </p>
        </button>
        <UiButton
          size="sm"
          :loading="ingestingId === s.id"
          :disabled="!!ingestingId && ingestingId !== s.id"
          @click="ingest(s)"
        >
          {{ s.last_ingested_at ? 'Re-ingest' : 'Ingest' }}
        </UiButton>
      </div>
    </div>

    <!-- Add modal -->
    <UiModal v-model:open="showAdd" title="Add source" subtitle="Push or pull text, paste a link, or upload a document." wide>
      <form class="space-y-4" @submit.prevent="addSource(false)">
        <UiField label="Title" :optional="form.mode === 'upload'" :hint="form.mode === 'upload' ? 'Defaults to the file name.' : undefined">
          <UiInput v-model="form.title" placeholder="Q3 earnings report" autofocus />
        </UiField>

        <div>
          <div class="grid grid-cols-2 gap-1.5 rounded-lg border border-hair p-1 sm:grid-cols-4">
            <button
              v-for="m in MODES"
              :key="m.value"
              type="button"
              class="rounded-md px-3 py-2 text-sm transition"
              :class="form.mode === m.value ? 'bg-rubric text-[#fdf6ee]' : 'text-muted hover:text-ink'"
              @click="form.mode = m.value"
            >
              {{ m.label }}
            </button>
          </div>
          <p class="mt-1.5 text-xs text-muted">{{ modeHint }}</p>
        </div>

        <!-- push -->
        <UiField v-if="form.mode === 'push'" label="Content">
          <UiTextarea v-model="form.content_inline" :rows="8" placeholder="Paste the raw text of the source here…" />
        </UiField>

        <!-- pull -->
        <template v-else-if="form.mode === 'pull'">
          <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
            <UiField label="Callback URL"><UiInput v-model="form.url" mono placeholder="https://host/api/artifacts/123" /></UiField>
            <UiField label="Method">
              <UiSelect v-model="form.method" :options="[{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }]" />
            </UiField>
          </div>
          <UiField label="Headers" optional hint="JSON object, e.g. { &quot;Accept&quot;: &quot;text/plain&quot; }">
            <UiTextarea v-model="form.headers" :rows="2" mono placeholder='{ "Authorization": "Bearer …" }' />
          </UiField>
          <UiField label="Auth reference" optional><UiInput v-model="form.auth_ref" mono placeholder="env:HOST_TOKEN" /></UiField>
        </template>

        <!-- url -->
        <UiField v-else-if="form.mode === 'url'" label="Link" hint="The page is fetched and its readable content converted to markdown (single page, no crawl).">
          <UiInput v-model="form.url" mono placeholder="https://example.com/article" />
        </UiField>

        <!-- upload -->
        <UiField v-else label="Document" hint="PDF parses natively; Office formats and OCR depend on the server's parser setup.">
          <label class="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-hair px-4 py-5 transition hover:border-[var(--c-rubric)] hover:bg-[color-mix(in_oklab,var(--c-ink)_3%,transparent)]">
            <svg class="h-6 w-6 shrink-0 text-muted" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V4m0 0L8 8m4-4l4 4M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span v-if="file" class="min-w-0">
              <span class="block truncate font-medium text-ink">{{ file.name }}</span>
              <span class="text-xs text-muted">{{ bytes(file.size) }}</span>
            </span>
            <span v-else class="text-sm text-muted">Choose a document to upload…</span>
            <input type="file" class="hidden" @change="onFile" />
          </label>
        </UiField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UiField v-if="form.mode !== 'url'" label="External URI" optional hint="Deep-link back to the source.">
            <UiInput v-model="form.external_uri" mono placeholder="https://…" />
          </UiField>
          <UiField label="Metadata" optional hint="JSON merged onto the source.">
            <UiInput v-model="form.metadata" mono placeholder='{ "author": "…" }' />
          </UiField>
        </div>
      </form>

      <template #footer>
        <UiButton @click="showAdd = false">Cancel</UiButton>
        <UiButton :loading="adding" :disabled="!canAdd" @click="addSource(false)">Add</UiButton>
        <UiButton variant="primary" :loading="adding" :disabled="!canAdd" @click="addSource(true)">Add &amp; ingest</UiButton>
      </template>
    </UiModal>

    <!-- View modal -->
    <UiModal :open="!!viewing" wide :title="viewing?.title" :subtitle="viewing?.id" @update:open="(v) => { if (!v) viewing = null }">
      <div v-if="viewing" class="space-y-4 text-sm">
        <div class="flex flex-wrap gap-2">
          <UiBadge :tone="sourceStatus(viewing.status)" />
          <span class="token">{{ viewing.ingestion_mode }}</span>
          <span class="token">added {{ absoluteTime(viewing.created_at) }}</span>
        </div>
        <div v-if="viewing.external_uri">
          <div class="label mb-1">External URI</div>
          <a :href="viewing.external_uri" target="_blank" class="link break-all">{{ viewing.external_uri }}</a>
        </div>
        <div v-if="viewing.content_inline">
          <div class="label mb-1">Content</div>
          <pre class="max-h-72 overflow-auto rounded-md border border-hair bg-[color-mix(in_oklab,var(--c-ink)_4%,transparent)] p-3 text-xs whitespace-pre-wrap">{{ viewing.content_inline }}</pre>
        </div>
        <div v-if="viewing.fetch_callback">
          <div class="label mb-1">Fetch callback</div>
          <pre class="overflow-auto rounded-md border border-hair bg-[color-mix(in_oklab,var(--c-ink)_4%,transparent)] p-3 text-xs">{{ JSON.stringify(viewing.fetch_callback, null, 2) }}</pre>
        </div>
        <div v-if="viewing.asset_path">
          <div class="label mb-1">Uploaded file</div>
          <p class="mono break-all text-ink">{{ viewing.metadata?.filename || viewing.asset_path }}</p>
          <p class="mt-0.5 text-xs text-muted">
            <span v-if="viewing.metadata?.content_type">{{ viewing.metadata.content_type }}</span>
            <span v-if="viewing.metadata?.byte_size"> · {{ bytes(Number(viewing.metadata.byte_size)) }}</span>
          </p>
        </div>
        <div v-if="viewing.metadata && Object.keys(viewing.metadata).length">
          <div class="label mb-1">Metadata</div>
          <pre class="overflow-auto rounded-md border border-hair bg-[color-mix(in_oklab,var(--c-ink)_4%,transparent)] p-3 text-xs">{{ JSON.stringify(viewing.metadata, null, 2) }}</pre>
        </div>
      </div>
    </UiModal>
  </div>
</template>
