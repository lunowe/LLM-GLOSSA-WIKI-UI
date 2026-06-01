<script setup lang="ts">
const api = useGlossa()
const tenantId = useTenantId()
const toast = useToast()

const { data: status, pending, refresh } = await useAsyncData(
  'quota',
  () => (tenantId.value ? api.tenant.quota(tenantId.value) : Promise.resolve(null)),
  { watch: [tenantId] },
)
const { data: config, refresh: refreshConfig } = await useAsyncData(
  'quota-config',
  () => (tenantId.value ? api.tenant.quotaConfig(tenantId.value) : Promise.resolve(null)),
  { watch: [tenantId] },
)

interface Gauge { key: string; used: number | null; limit: number | null; remaining: number | null }
const gauges = computed<Gauge[]>(() => {
  const q = status.value as Record<string, unknown> | null
  if (!q) return []
  const out: Gauge[] = []
  for (const [k, v] of Object.entries(q)) {
    if (k === 'blocked') continue
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      if ('used' in o || 'limit' in o) {
        out.push({
          key: k,
          used: typeof o.used === 'number' ? o.used : null,
          limit: typeof o.limit === 'number' ? o.limit : null,
          remaining: typeof o.remaining === 'number' ? o.remaining : null,
        })
      }
    }
  }
  return out
})

function fmt(key: string, v: number | null): string {
  if (v == null) return '∞'
  if (/usd|cost/i.test(key)) return usd(v)
  if (/bytes|storage/i.test(key)) return bytes(v)
  return num(v)
}
function pct(g: Gauge): number {
  if (!g.limit || g.used == null) return 0
  return Math.min(100, Math.round((g.used / g.limit) * 100))
}

// ── Edit limits ──────────────────────────────────────────────────────────
const showEdit = ref(false)
const saving = ref(false)
const form = reactive({
  monthly_cost_limit_usd: '',
  monthly_token_limit: '',
  max_sources_per_space: '',
  max_storage_bytes: '',
  max_requests_per_minute: '',
  allowed_models: '',
  notes: '',
})

function openEdit() {
  const c = config.value
  form.monthly_cost_limit_usd = c?.monthly_cost_limit_usd?.toString() ?? ''
  form.monthly_token_limit = c?.monthly_token_limit?.toString() ?? ''
  form.max_sources_per_space = c?.max_sources_per_space?.toString() ?? ''
  form.max_storage_bytes = c?.max_storage_bytes?.toString() ?? ''
  form.max_requests_per_minute = c?.max_requests_per_minute?.toString() ?? ''
  form.allowed_models = (c?.allowed_models || []).join(', ')
  form.notes = c?.notes ?? ''
  showEdit.value = true
}

async function save() {
  if (!tenantId.value) return
  saving.value = true
  try {
    const body: Record<string, unknown> = {}
    const numField = (s: string) => (s.trim() === '' ? undefined : Number(s))
    const map: [keyof typeof form, string][] = [
      ['monthly_cost_limit_usd', 'monthly_cost_limit_usd'],
      ['monthly_token_limit', 'monthly_token_limit'],
      ['max_sources_per_space', 'max_sources_per_space'],
      ['max_storage_bytes', 'max_storage_bytes'],
      ['max_requests_per_minute', 'max_requests_per_minute'],
    ]
    for (const [f, key] of map) {
      const n = numField(form[f] as string)
      if (n != null && !Number.isNaN(n)) body[key] = n
    }
    if (form.allowed_models.trim()) body.allowed_models = form.allowed_models.split(',').map((s) => s.trim()).filter(Boolean)
    if (form.notes.trim()) body.notes = form.notes.trim()

    await api.tenant.putQuota(tenantId.value, body)
    toast.success('Quota updated')
    showEdit.value = false
    await Promise.all([refresh(), refreshConfig()])
  } catch (e) {
    toast.error('Could not update quota', e instanceof ApiError ? e.message : undefined)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <header class="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="label mb-1.5">Account</p>
        <h1 class="font-display text-4xl text-ink">Quota</h1>
      </div>
      <UiButton @click="openEdit">Edit limits</UiButton>
    </header>

    <TenantGate>
      <div class="space-y-6">
        <div v-if="pending" class="panel h-28 animate-pulse opacity-60" />
        <template v-else>
          <div
            v-if="(status as any)?.blocked"
            class="raised border-l-[3px] border-rubric p-4 text-rubric-ink"
          >
            <p class="font-medium">This tenant is currently blocked — a quota limit has been reached.</p>
          </div>
          <div v-else class="raised border-l-[3px] border-verdigris p-4 text-verdigris">
            <p class="font-medium">Within limits — all operations available.</p>
          </div>

          <div v-if="gauges.length" class="grid gap-4 sm:grid-cols-2">
            <UiCard v-for="g in gauges" :key="g.key" raised>
              <div class="mb-2 flex items-baseline justify-between">
                <span class="text-sm font-medium text-ink">{{ titleCase(g.key) }}</span>
                <span class="mono text-xs text-muted">{{ fmt(g.key, g.used) }} / {{ fmt(g.key, g.limit) }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--c-ink)_8%,transparent)]">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{ width: `${pct(g)}%`, background: pct(g) > 85 ? 'var(--c-rubric)' : 'var(--c-verdigris)' }"
                />
              </div>
              <p class="mt-1.5 text-xs text-faint">
                {{ g.limit == null ? 'Unlimited' : `${fmt(g.key, g.remaining)} remaining` }}
              </p>
            </UiCard>
          </div>
          <UiCard v-else raised>
            <p class="text-sm italic text-muted">No live quota gauges reported.</p>
          </UiCard>

          <!-- Config -->
          <UiCard raised>
            <h2 class="mb-4 text-xl">Configured limits</h2>
            <dl class="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div class="flex justify-between border-b border-hair pb-2">
                <dt class="text-sm text-muted">Monthly cost</dt>
                <dd class="mono text-sm text-ink">{{ config?.monthly_cost_limit_usd != null ? usd(config.monthly_cost_limit_usd) : '∞' }}</dd>
              </div>
              <div class="flex justify-between border-b border-hair pb-2">
                <dt class="text-sm text-muted">Monthly tokens</dt>
                <dd class="mono text-sm text-ink">{{ config?.monthly_token_limit != null ? num(config.monthly_token_limit) : '∞' }}</dd>
              </div>
              <div class="flex justify-between border-b border-hair pb-2">
                <dt class="text-sm text-muted">Sources / wiki</dt>
                <dd class="mono text-sm text-ink">{{ config?.max_sources_per_space != null ? num(config.max_sources_per_space) : '∞' }}</dd>
              </div>
              <div class="flex justify-between border-b border-hair pb-2">
                <dt class="text-sm text-muted">Storage</dt>
                <dd class="mono text-sm text-ink">{{ config?.max_storage_bytes != null ? bytes(config.max_storage_bytes) : '∞' }}</dd>
              </div>
              <div class="flex justify-between border-b border-hair pb-2">
                <dt class="text-sm text-muted">Requests / min</dt>
                <dd class="mono text-sm text-ink">{{ config?.max_requests_per_minute != null ? num(config.max_requests_per_minute) : '∞' }}</dd>
              </div>
              <div class="flex justify-between border-b border-hair pb-2">
                <dt class="text-sm text-muted">Allowed models</dt>
                <dd class="mono text-sm text-ink">{{ config?.allowed_models?.length ? config.allowed_models.join(', ') : 'any' }}</dd>
              </div>
            </dl>
            <p v-if="config?.notes" class="mt-4 text-sm italic text-muted">{{ config.notes }}</p>
          </UiCard>
        </template>
      </div>
    </TenantGate>

    <UiModal v-model:open="showEdit" title="Edit quota" subtitle="Blank fields are left unchanged. Requires an admin-scoped key.">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
        <UiField label="Monthly cost (USD)"><UiInput v-model="form.monthly_cost_limit_usd" type="number" mono placeholder="—" /></UiField>
        <UiField label="Monthly tokens"><UiInput v-model="form.monthly_token_limit" type="number" mono placeholder="—" /></UiField>
        <UiField label="Sources / wiki"><UiInput v-model="form.max_sources_per_space" type="number" mono placeholder="—" /></UiField>
        <UiField label="Storage bytes"><UiInput v-model="form.max_storage_bytes" type="number" mono placeholder="—" /></UiField>
        <UiField label="Requests / min"><UiInput v-model="form.max_requests_per_minute" type="number" mono placeholder="—" /></UiField>
        <UiField label="Allowed models" hint="comma-separated"><UiInput v-model="form.allowed_models" mono placeholder="gpt-4o-mini, …" /></UiField>
        <div class="sm:col-span-2">
          <UiField label="Notes"><UiInput v-model="form.notes" /></UiField>
        </div>
      </form>
      <template #footer>
        <UiButton @click="showEdit = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="saving" @click="save">Save limits</UiButton>
      </template>
    </UiModal>
  </div>
</template>
