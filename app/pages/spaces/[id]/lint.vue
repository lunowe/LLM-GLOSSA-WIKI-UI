<script setup lang="ts">
const { id } = useSpaceCtx()
const api = useGlossa()
const toast = useToast()
const poller = useJobPoller()

const { data: report, pending, refresh } = await useAsyncData(
  `lint:${id}`,
  () => api.pages.lintReport(id).then((r) => r.content).catch(() => null),
)

const linting = ref(false)
async function runLint() {
  linting.value = true
  try {
    const job = await api.lint(id)
    poller.job.value = job
    toast.info('Lint queued')
    const final = await poller.track(job.id)
    if (final.status === 'succeeded') {
      const f = final.result?.lint_findings?.length || 0
      toast.success('Lint complete', f ? `${f} finding${f === 1 ? '' : 's'}.` : 'No issues found.')
    } else {
      toast.error('Lint failed', final.error_message || undefined)
    }
    await refresh()
  } catch (e) {
    toast.error('Could not lint', e instanceof ApiError ? e.message : undefined)
  } finally {
    linting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl">Lint</h2>
        <p class="mt-0.5 text-sm text-muted">Find orphans, broken links, and contradictions across the wiki.</p>
      </div>
      <UiButton variant="primary" :loading="linting" @click="runLint">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M6 6l1 14h10l1-14M10 11v5m4-5v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Run lint
      </UiButton>
    </div>

    <JobProgress v-if="poller.job.value" :job="poller.job.value" :polling="poller.polling.value" />

    <div v-if="pending" class="panel h-48 animate-pulse opacity-60" />
    <UiCard v-else-if="report" raised>
      <MarkdownView :content="report" :space-id="id" />
    </UiCard>
    <UiCard v-else-if="!poller.job.value" raised>
      <UiEmpty
        mark="⚖"
        title="No lint report yet"
        hint="Run a lint pass to audit the wiki for orphan pages, broken wikilinks, and contradicting sources."
      >
        <UiButton variant="primary" :loading="linting" @click="runLint">Run the first lint</UiButton>
      </UiEmpty>
    </UiCard>
  </div>
</template>
