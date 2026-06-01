<script setup lang="ts">
const api = useGlossa()
const tenantId = useTenantId()

const period = ref('') // YYYY-MM, empty = current

const { data: usage, pending } = await useAsyncData(
  'usage',
  () => (tenantId.value ? api.tenant.usage(tenantId.value, period.value || undefined) : Promise.resolve(null)),
  { watch: [tenantId, period] },
)
const { data: bySpace } = await useAsyncData(
  'usage-by-space',
  () => (tenantId.value ? api.tenant.usageBySpace(tenantId.value, period.value || undefined) : Promise.resolve([])),
  { watch: [tenantId, period] },
)
const { data: events } = await useAsyncData(
  'usage-events',
  () => (tenantId.value ? api.tenant.usageEvents(tenantId.value, { limit: 25 }) : Promise.resolve([])),
  { watch: [tenantId] },
)

const { data: spaces } = useSpaces()
const spaceName = (sid: unknown) => (spaces.value || []).find((s) => s.id === sid)?.name || String(sid)

function asNum(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}
function recordEntries(v: unknown): [string, unknown][] {
  return v && typeof v === 'object' ? Object.entries(v as Record<string, unknown>) : []
}
function opCost(v: unknown): number | null {
  if (typeof v === 'number') return null
  const o = v as Record<string, unknown>
  return asNum(o?.cost_usd)
}
function opTokens(v: unknown): number | null {
  if (typeof v === 'number') return v
  const o = v as Record<string, unknown>
  return asNum(o?.total_tokens) ?? asNum(o?.tokens)
}
</script>

<template>
  <div>
    <header class="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="label mb-1.5">Account</p>
        <h1 class="font-display text-4xl text-ink">Usage</h1>
      </div>
      <label class="flex items-center gap-2 text-sm text-muted">
        <span class="label">Period</span>
        <input v-model="period" type="month" class="field w-44" />
      </label>
    </header>

    <TenantGate>
      <div class="space-y-7">
        <div v-if="pending" class="panel h-28 animate-pulse opacity-60" />
        <template v-else>
          <!-- Headline tiles -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="panel px-5 py-4">
              <div class="font-display text-3xl text-rubric-ink">{{ usd(usage?.cost_usd) }}</div>
              <div class="label mt-1">Cost · {{ usage?.period || 'current' }}</div>
            </div>
            <div class="panel px-5 py-4">
              <div class="font-display text-3xl text-ink">{{ compactNumber(usage?.total_tokens) }}</div>
              <div class="label mt-1">Total tokens</div>
            </div>
            <div class="panel px-5 py-4">
              <div class="font-display text-3xl text-ink">{{ compactNumber(usage?.input_tokens) }}</div>
              <div class="label mt-1">Input tokens</div>
            </div>
            <div class="panel px-5 py-4">
              <div class="font-display text-3xl text-ink">{{ num(usage?.event_count) }}</div>
              <div class="label mt-1">Events</div>
            </div>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <!-- By operation -->
            <UiCard raised>
              <h2 class="mb-4 text-xl">By operation</h2>
              <div v-if="recordEntries(usage?.by_operation).length" class="space-y-2">
                <div v-for="[k, v] in recordEntries(usage?.by_operation)" :key="k" class="flex items-center justify-between border-b border-hair pb-2 text-sm last:border-0">
                  <span class="mono text-ink">{{ k }}</span>
                  <span class="flex items-center gap-3 text-muted">
                    <span v-if="opTokens(v) != null">{{ compactNumber(opTokens(v)) }} tok</span>
                    <span v-if="opCost(v) != null" class="text-rubric-ink">{{ usd(opCost(v)) }}</span>
                    <span v-if="opTokens(v) == null && opCost(v) == null">{{ v }}</span>
                  </span>
                </div>
              </div>
              <p v-else class="text-sm italic text-muted">No usage in this period.</p>
            </UiCard>

            <!-- By space -->
            <UiCard raised>
              <h2 class="mb-4 text-xl">By wiki</h2>
              <div v-if="bySpace && bySpace.length" class="space-y-2">
                <div v-for="(row, i) in bySpace" :key="i" class="flex items-center justify-between border-b border-hair pb-2 text-sm last:border-0">
                  <span class="truncate text-ink">{{ spaceName(row.space_id) }}</span>
                  <span class="flex items-center gap-3 text-muted">
                    <span v-if="asNum(row.total_tokens) != null">{{ compactNumber(asNum(row.total_tokens)) }} tok</span>
                    <span v-if="asNum(row.cost_usd) != null" class="text-rubric-ink">{{ usd(asNum(row.cost_usd)) }}</span>
                  </span>
                </div>
              </div>
              <p v-else class="text-sm italic text-muted">No per-wiki usage yet.</p>
            </UiCard>
          </div>

          <!-- Recent events -->
          <UiCard raised>
            <h2 class="mb-4 text-xl">Recent events</h2>
            <div v-if="events && events.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-hair text-left">
                    <th class="label py-2 pr-3 font-normal">Operation</th>
                    <th class="label py-2 pr-3 font-normal">Model</th>
                    <th class="label py-2 pr-3 text-right font-normal">In</th>
                    <th class="label py-2 pr-3 text-right font-normal">Out</th>
                    <th class="label py-2 pr-3 text-right font-normal">Cost</th>
                    <th class="label py-2 text-right font-normal">When</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="e in events" :key="e.id" class="border-b border-hair/60 last:border-0">
                    <td class="py-2 pr-3 mono text-xs text-ink">{{ e.operation }}</td>
                    <td class="py-2 pr-3 mono text-xs text-muted">{{ e.model }}</td>
                    <td class="py-2 pr-3 text-right text-muted">{{ compactNumber(e.input_tokens) }}</td>
                    <td class="py-2 pr-3 text-right text-muted">{{ compactNumber(e.output_tokens) }}</td>
                    <td class="py-2 pr-3 text-right text-rubric-ink">{{ usd(e.cost_usd) }}</td>
                    <td class="py-2 text-right text-xs text-faint">{{ relativeTime(e.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm italic text-muted">No events recorded yet.</p>
          </UiCard>
        </template>
      </div>
    </TenantGate>
  </div>
</template>
