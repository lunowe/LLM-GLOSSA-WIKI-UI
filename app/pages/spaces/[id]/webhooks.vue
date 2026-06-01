<script setup lang="ts">
const { id } = useSpaceCtx()
const api = useGlossa()
const toast = useToast()

const { data: hooks, pending, refresh } = await useAsyncData(`hooks:${id}`, () =>
  api.webhooks.list(id),
)

const ALL_EVENTS = ['job.complete', 'job.failed', 'page.created', 'page.updated', 'source.received']

const showAdd = ref(false)
const adding = ref(false)
const form = reactive({ url: '', secret: '', events: ['job.complete', 'job.failed'] as string[] })
const justCreated = ref<Webhook | null>(null)

function toggleEvent(e: string) {
  form.events = form.events.includes(e) ? form.events.filter((x) => x !== e) : [...form.events, e]
}

async function create() {
  if (!form.url.trim() || !form.events.length) return
  adding.value = true
  try {
    const body: Record<string, unknown> = { url: form.url.trim(), events: form.events }
    if (form.secret.trim()) body.secret = form.secret.trim()
    const wh = await api.webhooks.create(id, body)
    justCreated.value = wh
    toast.success('Webhook created')
    showAdd.value = false
    Object.assign(form, { url: '', secret: '', events: ['job.complete', 'job.failed'] })
    await refresh()
  } catch (e) {
    toast.error('Could not create webhook', e instanceof ApiError ? e.message : undefined)
  } finally {
    adding.value = false
  }
}

async function remove(wh: Webhook) {
  if (!confirm(`Delete webhook to ${wh.url}?`)) return
  try {
    await api.webhooks.remove(id, wh.id)
    toast.success('Webhook deleted')
    if (justCreated.value?.id === wh.id) justCreated.value = null
    await refresh()
  } catch (e) {
    toast.error('Could not delete', e instanceof ApiError ? e.message : undefined)
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl">Webhooks</h2>
        <p class="mt-0.5 text-sm text-muted">Signed callbacks on ingest, lint, and page events.</p>
      </div>
      <UiButton variant="primary" @click="showAdd = true">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        Add webhook
      </UiButton>
    </div>

    <!-- Reveal secret once -->
    <div v-if="justCreated" class="raised border-l-[3px] border-verdigris p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-medium text-ink">Webhook created — copy the signing secret now.</p>
          <p class="mt-0.5 text-sm text-muted">Verify deliveries with the <span class="mono">X-Glossa-Signature</span> header.</p>
          <div class="mt-2"><UiCopy :value="justCreated.secret" /></div>
        </div>
        <button class="btn-quiet btn" @click="justCreated = null">Dismiss</button>
      </div>
    </div>

    <div v-if="pending" class="panel h-40 animate-pulse opacity-60" />

    <UiCard v-else-if="!hooks?.length" raised>
      <UiEmpty mark="⇲" title="No webhooks" hint="Subscribe a URL to receive signed events when jobs finish or pages change.">
        <UiButton variant="primary" @click="showAdd = true">Add a webhook</UiButton>
      </UiEmpty>
    </UiCard>

    <div v-else class="space-y-3">
      <div v-for="wh in hooks" :key="wh.id" class="panel p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full" :style="{ background: wh.active ? 'var(--c-verdigris)' : 'var(--c-faint)' }" />
              <span class="truncate font-medium text-ink">{{ wh.url }}</span>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span v-for="e in wh.events" :key="e" class="token">{{ e }}</span>
            </div>
            <p class="mt-2 text-xs text-faint">Created {{ relativeTime(wh.created_at) }} · {{ wh.id }}</p>
          </div>
          <button class="btn-quiet btn shrink-0" title="Delete" @click="remove(wh)">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Add modal -->
    <UiModal v-model:open="showAdd" title="Add webhook" subtitle="Glossa POSTs signed payloads to this URL.">
      <form class="space-y-4" @submit.prevent="create">
        <UiField label="Endpoint URL"><UiInput v-model="form.url" mono placeholder="https://host/glossa/webhook" autofocus /></UiField>
        <div>
          <span class="label mb-2 block">Events</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="e in ALL_EVENTS"
              :key="e"
              type="button"
              class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition"
              :class="form.events.includes(e) ? 'border-rubric bg-rubric-soft text-rubric-ink' : 'border-hair text-muted hover:border-muted'"
              @click="toggleEvent(e)"
            >
              <span class="flex h-4 w-4 items-center justify-center rounded-sm border" :class="form.events.includes(e) ? 'border-rubric bg-rubric text-[#fff]' : 'border-rule'">
                <svg v-if="form.events.includes(e)" class="h-3 w-3" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </span>
              <span class="mono text-xs">{{ e }}</span>
            </button>
          </div>
        </div>
        <UiField label="Secret" optional hint="Auto-generated (32-byte URL-safe) if left blank.">
          <UiInput v-model="form.secret" mono placeholder="(generated for you)" />
        </UiField>
      </form>
      <template #footer>
        <UiButton @click="showAdd = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="adding" :disabled="!form.url.trim() || !form.events.length" @click="create">Create</UiButton>
      </template>
    </UiModal>
  </div>
</template>
