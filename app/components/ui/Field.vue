<script setup lang="ts">
defineProps<{ label?: string; hint?: string; optional?: boolean }>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 flex items-baseline justify-between">
      <span class="label">{{ label }}</span>
      <span v-if="optional" class="text-xs text-faint italic">optional</span>
    </span>
    <slot />
    <span v-if="hint" class="mt-1.5 block text-xs text-muted">{{ hint }}</span>
  </label>
</template>
