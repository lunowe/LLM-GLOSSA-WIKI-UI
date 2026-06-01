<script setup lang="ts">
// Account endpoints are tenant-scoped. We normally learn the tenant id from a
// Space, but a brand-new tenant may have none yet — so allow manual entry.
const tenantId = useTenantId()
const manual = ref('')
function set() {
  if (manual.value.trim()) tenantId.value = manual.value.trim()
}
</script>

<template>
  <slot v-if="tenantId" :tenant-id="tenantId" />
  <UiCard v-else raised>
    <UiEmpty mark="⚿" title="Tenant not identified yet" hint="We read your tenant id from a wiki, but found none. Create a wiki, or paste your tenant id (tnt_…) below.">
      <div class="flex w-full max-w-sm items-center gap-2">
        <UiInput v-model="manual" mono placeholder="tnt_…" />
        <UiButton variant="primary" :disabled="!manual.trim()" @click="set">Set</UiButton>
      </div>
    </UiEmpty>
  </UiCard>
</template>
