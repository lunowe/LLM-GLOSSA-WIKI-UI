<script setup lang="ts">
const { id } = useSpaceCtx()
const api = useGlossa()

const tail = ref(30)
const { data: log, pending } = await useAsyncData(
  `log:${id}`,
  () => api.pages.log(id, tail.value).catch(() => ({ path: 'log.md', content: '' })),
  { watch: [tail] },
)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl">Chronicle</h2>
        <p class="mt-0.5 text-sm text-muted">Every ingest and lint pass, in order.</p>
      </div>
      <label class="flex items-center gap-2 text-sm text-muted">
        <span class="label">Tail</span>
        <div class="w-28">
          <UiSelect
            v-model="tail"
            :options="[{ value: 10, label: '10' }, { value: 30, label: '30' }, { value: 100, label: '100' }]"
          />
        </div>
      </label>
    </div>

    <div v-if="pending" class="panel h-64 animate-pulse opacity-60" />
    <UiCard v-else-if="log?.content" raised>
      <MarkdownView :content="log.content" :space-id="id" />
    </UiCard>
    <UiCard v-else raised>
      <UiEmpty mark="❡" title="The chronicle is blank" hint="Ingest or lint a source and entries will appear here." />
    </UiCard>
  </div>
</template>
