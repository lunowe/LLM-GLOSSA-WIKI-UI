<script setup lang="ts">
const api = useGlossa()
const tenantId = useTenantId()
const toast = useToast()
const { key: currentKey } = useAuth()

const includeRevoked = ref(false)
const { data: keys, pending, refresh } = await useAsyncData(
  'api-keys',
  () => (tenantId.value ? api.keys.list(tenantId.value, includeRevoked.value) : Promise.resolve([])),
  { watch: [tenantId, includeRevoked] },
)

const ALL_SCOPES: ScopeT[] = ['spaces:read', 'spaces:write', 'sources:write', 'query', 'lint', 'admin']
const DEFAULT_SCOPES: ScopeT[] = ['spaces:read', 'spaces:write', 'sources:write', 'query', 'lint']

const showAdd = ref(false)
const creating = ref(false)
const form = reactive({ label: '', scopes: [...DEFAULT_SCOPES] as ScopeT[] })
const issued = ref<ApiKeyIssued | null>(null)

function toggleScope(s: ScopeT) {
  form.scopes = form.scopes.includes(s) ? form.scopes.filter((x) => x !== s) : [...form.scopes, s]
}

async function create() {
  if (!tenantId.value) return
  creating.value = true
  try {
    const body: Record<string, unknown> = { scopes: form.scopes }
    if (form.label.trim()) body.label = form.label.trim()
    const result = await api.keys.create(tenantId.value, body)
    issued.value = result
    toast.success('API key issued')
    showAdd.value = false
    form.label = ''
    form.scopes = [...DEFAULT_SCOPES]
    await refresh()
  } catch (e) {
    toast.error('Could not create key', e instanceof ApiError ? e.message : undefined)
  } finally {
    creating.value = false
  }
}

async function revoke(k: ApiKey) {
  if (!tenantId.value) return
  if (!confirm(`Revoke key ${k.prefix}…? This cannot be undone.`)) return
  try {
    await api.keys.revoke(tenantId.value, k.id)
    toast.success('Key revoked')
    await refresh()
  } catch (e) {
    toast.error('Could not revoke', e instanceof ApiError ? e.message : undefined)
  }
}

const isCurrent = (k: ApiKey) => !!currentKey.value && currentKey.value.startsWith(k.prefix)
</script>

<template>
  <div>
    <header class="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="label mb-1.5">Account</p>
        <h1 class="font-display text-4xl text-ink">API keys</h1>
      </div>
      <UiButton variant="primary" @click="showAdd = true">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        Issue key
      </UiButton>
    </header>

    <TenantGate>
      <div class="space-y-5">
        <!-- Reveal once -->
        <div v-if="issued" class="raised border-l-[3px] border-verdigris p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-ink">New key issued — copy it now.</p>
              <p class="mt-0.5 text-sm text-muted">This is shown only once. Glossa stores only its hash.</p>
              <div class="mt-3"><UiCopy :value="issued.plaintext" /></div>
            </div>
            <button class="btn-quiet btn" @click="issued = null">Done</button>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm text-muted">
          <input v-model="includeRevoked" type="checkbox" class="accent-[var(--c-rubric)]" />
          Show revoked keys
        </label>

        <div v-if="pending" class="panel h-40 animate-pulse opacity-60" />
        <UiCard v-else-if="!keys?.length" raised>
          <UiEmpty mark="⚿" title="No keys" hint="Issue a scoped key to grant a teammate or service access to this tenant.">
            <UiButton variant="primary" @click="showAdd = true">Issue a key</UiButton>
          </UiEmpty>
        </UiCard>

        <div v-else class="space-y-3">
          <div v-for="k in keys" :key="k.id" class="panel p-4" :class="k.revoked_at ? 'opacity-60' : ''">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium text-ink">{{ k.label || 'Unlabelled key' }}</span>
                  <span class="token">{{ k.prefix }}…</span>
                  <UiBadge v-if="isCurrent(k)" :tone="{ fg: 'var(--c-verdigris)', bg: 'color-mix(in oklab, var(--c-verdigris) 16%, transparent)' }">this session</UiBadge>
                  <UiBadge v-if="k.revoked_at" :tone="{ fg: 'var(--c-rubric)', bg: 'var(--c-rubric-soft)' }">revoked</UiBadge>
                </div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span v-for="s in k.scopes" :key="s" class="token" :class="s === 'admin' ? 'border-rubric text-rubric-ink' : ''">{{ s }}</span>
                </div>
                <p class="mt-2 text-xs text-faint">
                  Created {{ relativeTime(k.created_at) }}
                  <span v-if="k.last_used_at"> · last used {{ relativeTime(k.last_used_at) }}</span>
                  <span v-else> · never used</span>
                </p>
              </div>
              <UiButton v-if="!k.revoked_at" size="sm" @click="revoke(k)">Revoke</UiButton>
            </div>
          </div>
        </div>
      </div>
    </TenantGate>

    <!-- Issue modal -->
    <UiModal v-model:open="showAdd" title="Issue API key" subtitle="The plaintext is shown once, immediately after creation.">
      <form class="space-y-4" @submit.prevent="create">
        <UiField label="Label" optional><UiInput v-model="form.label" placeholder="prod · CI · teammate name" autofocus /></UiField>
        <div>
          <span class="label mb-2 block">Scopes</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="s in ALL_SCOPES"
              :key="s"
              type="button"
              class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition"
              :class="form.scopes.includes(s) ? 'border-rubric bg-rubric-soft text-rubric-ink' : 'border-hair text-muted hover:border-muted'"
              @click="toggleScope(s)"
            >
              <span class="flex h-4 w-4 items-center justify-center rounded-sm border" :class="form.scopes.includes(s) ? 'border-rubric bg-rubric text-[#fff]' : 'border-rule'">
                <svg v-if="form.scopes.includes(s)" class="h-3 w-3" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </span>
              <span class="mono text-xs">{{ s }}</span>
            </button>
          </div>
          <p v-if="form.scopes.includes('admin')" class="mt-2 text-xs text-rubric-ink">admin grants tenant-wide and cross-tenant power — issue sparingly.</p>
        </div>
      </form>
      <template #footer>
        <UiButton @click="showAdd = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="creating" :disabled="!form.scopes.length" @click="create">Issue key</UiButton>
      </template>
    </UiModal>
  </div>
</template>
