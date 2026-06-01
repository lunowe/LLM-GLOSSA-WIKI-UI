<script setup lang="ts">
const props = defineProps<{ job: Job | null; polling?: boolean }>()

const status = computed(() => jobStatus(props.job?.status))
const running = computed(() => props.job?.status === 'queued' || props.job?.status === 'running')
const r = computed(() => props.job?.result)
const lintSummary = computed(() =>
  r.value?.lint_summary ? Object.entries(r.value.lint_summary).filter(([, v]) => v) : [],
)
const changedPages = computed(() => {
  if (!r.value) return []
  return [...(r.value.pages_created || []), ...(r.value.pages_updated || [])].slice(0, 12)
})
</script>

<template>
  <div v-if="job" class="panel overflow-hidden">
    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <div class="flex items-center gap-2.5">
        <UiBadge :tone="status" dot />
        <span class="label">{{ job.kind }} job</span>
      </div>
      <UiCopy :value="job.id" :label="job.id" />
    </div>

    <div v-if="running" class="h-0.5 w-full bg-[color-mix(in_oklab,var(--c-ink)_8%,transparent)]">
      <div class="scribing h-full w-full" />
    </div>

    <div class="border-t border-hair px-4 py-3.5 text-sm">
      <p v-if="running" class="flex items-center gap-2 text-muted">
        <UiSpinner class="h-3.5 w-3.5" />
        The scribe is at work — extracting entities and reconciling pages…
      </p>

      <div v-else-if="job.status === 'succeeded'" class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <span
            v-if="r?.pages_created?.length"
            class="rounded-full bg-[color-mix(in_oklab,var(--c-verdigris)_15%,transparent)] px-2.5 py-1 text-xs text-verdigris"
          >
            +{{ r.pages_created.length }} page{{ r.pages_created.length === 1 ? '' : 's' }} created
          </span>
          <span
            v-if="r?.pages_updated?.length"
            class="rounded-full bg-[color-mix(in_oklab,var(--c-azure)_14%,transparent)] px-2.5 py-1 text-xs text-azure"
          >
            {{ r.pages_updated.length }} page{{ r.pages_updated.length === 1 ? '' : 's' }} updated
          </span>
          <span
            v-if="r?.contradictions_flagged?.length"
            class="rounded-full bg-rubric-soft px-2.5 py-1 text-xs text-rubric-ink"
          >
            {{ r.contradictions_flagged.length }} contradiction{{ r.contradictions_flagged.length === 1 ? '' : 's' }} flagged
          </span>
          <span
            v-for="[k, v] in lintSummary"
            :key="k"
            class="rounded-full bg-[color-mix(in_oklab,var(--c-ink)_6%,transparent)] px-2.5 py-1 text-xs text-muted"
          >
            {{ v }} {{ k.replace(/_/g, ' ') }}
          </span>
          <span
            v-if="!r?.pages_created?.length && !r?.pages_updated?.length && !lintSummary.length"
            class="text-xs text-muted"
          >
            Completed with no page changes.
          </span>
        </div>

        <div v-if="changedPages.length" class="flex flex-wrap gap-1.5">
          <NuxtLink
            v-for="p in changedPages"
            :key="p"
            :to="`/spaces/${job.space_id}/wiki/${p}`"
            class="token hover:border-rubric hover:text-rubric"
          >
            {{ p }}
          </NuxtLink>
        </div>
      </div>

      <p v-else-if="job.status === 'failed'" class="text-rubric-ink">
        {{ job.error_message || 'The job failed.' }}
      </p>
    </div>
  </div>
</template>
