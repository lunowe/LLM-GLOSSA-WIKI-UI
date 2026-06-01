<script setup lang="ts">
const { id } = useSpaceCtx()
const api = useGlossa()
const toast = useToast()

const { data, pending } = await useAsyncData(`schema:${id}`, () =>
  api.spaces.getSchema(id).catch(() => ({ path: 'schema.md', content: '' })),
)

const draft = ref('')
const original = ref('')
watchEffect(() => {
  if (data.value) {
    draft.value = data.value.content
    original.value = data.value.content
  }
})

const dirty = computed(() => draft.value !== original.value)
const mode = ref<'edit' | 'preview'>('edit')
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    await api.spaces.putSchema(id, draft.value)
    original.value = draft.value
    toast.success('Schema saved')
  } catch (e) {
    toast.error('Could not save schema', e instanceof ApiError ? e.message : undefined)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl">Schema</h2>
        <p class="mt-0.5 text-sm text-muted">The LLM-facing conventions in <span class="mono">schema.md</span> — it co-evolves with the wiki.</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex rounded-lg border border-hair p-1">
          <button class="rounded-md px-3 py-1 text-sm transition" :class="mode === 'edit' ? 'bg-rubric text-[#fdf6ee]' : 'text-muted'" @click="mode = 'edit'">Edit</button>
          <button class="rounded-md px-3 py-1 text-sm transition" :class="mode === 'preview' ? 'bg-rubric text-[#fdf6ee]' : 'text-muted'" @click="mode = 'preview'">Preview</button>
        </div>
        <UiButton variant="primary" :loading="saving" :disabled="!dirty" @click="save">Save</UiButton>
      </div>
    </div>

    <div v-if="pending" class="panel h-96 animate-pulse opacity-60" />
    <template v-else>
      <textarea
        v-if="mode === 'edit'"
        v-model="draft"
        rows="22"
        class="field mono text-sm leading-relaxed"
        placeholder="# Schema&#10;&#10;Describe the entity types, page kinds, and conventions for this wiki…"
      />
      <UiCard v-else raised>
        <MarkdownView v-if="draft" :content="draft" :space-id="id" />
        <p v-else class="text-sm italic text-muted">Nothing to preview.</p>
      </UiCard>
      <p v-if="dirty" class="text-xs text-rubric-ink">Unsaved changes.</p>
    </template>
  </div>
</template>
