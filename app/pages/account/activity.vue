<script setup lang="ts">
const api = useGlossa()
const tenantId = useTenantId()

const hours = ref(24)
const methodFilter = ref('')
const statusMin = ref(0)

const { data: summary, pending: pendingSummary } = await useAsyncData(
  'activity-summary',
  () => (tenantId.value ? api.tenant.activitySummary(tenantId.value, hours.value) : Promise.resolve(null)),
  { watch: [tenantId, hours] },
)
const { data: requests, pending } = await useAsyncData(
  'activity-requests',
  () =>
    tenantId.value
      ? api.tenant.activityRequests(tenantId.value, {
          method: methodFilter.value || undefined,
          status_min: statusMin.value || undefined,
          limit: 100,
        })
      : Promise.resolve([]),
  { watch: [tenantId, methodFilter, statusMin] },
)

function statusTone(code: number) {
  if (code >= 500) return 'var(--c-rubric)'
  if (code >= 400) return 'var(--c-gold)'
  return 'var(--c-verdigris)'
}
const sortedStatus = computed(() => Object.entries(summary.value?.by_status || {}).sort((a, b) => b[1] - a[1]))
</script>

<template>
  <div>
    <header class="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="label mb-1.5">Account</p>
        <h1 class="font-display text-4xl text-ink">Activity</h1>
      </div>
      <label class="flex items-center gap-2 text-sm text-muted">
        <span class="label">Window</span>
        <div class="w-32">
          <UiSelect v-model="hours" :options="[{ value: 1, label: 'Last hour' }, { value: 24, label: 'Last 24h' }, { value: 168, label: 'Last 7 days' }, { value: 720, label: 'Last 30 days' }]" />
        </div>
      </label>
    </header>

    <TenantGate>
      <div class="space-y-6">
        <!-- Summary -->
        <div v-if="pendingSummary" class="panel h-24 animate-pulse opacity-60" />
        <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="panel px-5 py-4">
            <div class="font-display text-3xl text-ink">{{ num(summary?.request_count) }}</div>
            <div class="label mt-1">Requests</div>
          </div>
          <div class="panel px-5 py-4">
            <div class="font-display text-3xl" :style="{ color: summary?.error_count ? 'var(--c-rubric-ink)' : 'var(--c-ink)' }">{{ num(summary?.error_count) }}</div>
            <div class="label mt-1">Errors</div>
          </div>
          <div class="panel px-5 py-4">
            <div class="font-display text-3xl text-ink">{{ summary?.avg_duration_ms != null ? Math.round(summary.avg_duration_ms) : '—' }}<span class="text-lg text-muted">ms</span></div>
            <div class="label mt-1">Avg latency</div>
          </div>
          <div class="panel px-5 py-4">
            <div class="flex flex-wrap gap-1.5 pt-1">
              <span v-for="[code, n] in sortedStatus" :key="code" class="rounded-full px-2 py-0.5 text-xs" :style="{ color: statusTone(Number(code)), background: 'color-mix(in oklab, currentColor 14%, transparent)' }">
                {{ code }} · {{ n }}
              </span>
            </div>
            <div class="label mt-2">By status</div>
          </div>
        </div>

        <!-- Requests -->
        <UiCard raised>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-xl">Request log</h2>
            <div class="flex items-center gap-2">
              <div class="w-32">
                <UiSelect v-model="methodFilter" :options="[{ value: '', label: 'All methods' }, { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PATCH', label: 'PATCH' }, { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' }]" />
              </div>
              <div class="w-36">
                <UiSelect v-model="statusMin" :options="[{ value: 0, label: 'All statuses' }, { value: 400, label: '≥ 400' }, { value: 500, label: '≥ 500' }]" />
              </div>
            </div>
          </div>

          <div v-if="pending" class="h-40 animate-pulse opacity-60" />
          <div v-else-if="requests && requests.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-hair text-left">
                  <th class="label py-2 pr-3 font-normal">Method</th>
                  <th class="label py-2 pr-3 font-normal">Path</th>
                  <th class="label py-2 pr-3 text-right font-normal">Status</th>
                  <th class="label py-2 pr-3 text-right font-normal">ms</th>
                  <th class="label py-2 text-right font-normal">When</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in requests" :key="e.id" class="border-b border-hair/60 last:border-0">
                  <td class="py-2 pr-3"><span class="mono text-xs text-muted">{{ e.method }}</span></td>
                  <td class="py-2 pr-3"><span class="mono text-xs text-ink">{{ e.path }}</span></td>
                  <td class="py-2 pr-3 text-right"><span class="mono text-xs font-medium" :style="{ color: statusTone(e.status_code) }">{{ e.status_code }}</span></td>
                  <td class="py-2 pr-3 text-right text-muted">{{ Math.round(e.duration_ms) }}</td>
                  <td class="py-2 text-right text-xs text-faint">{{ relativeTime(e.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm italic text-muted">No requests recorded in this window.</p>
        </UiCard>
      </div>
    </TenantGate>
  </div>
</template>
