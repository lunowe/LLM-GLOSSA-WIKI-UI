<script setup lang="ts">
defineProps<{ title: string; hint?: string; mark?: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div class="mb-4 font-display text-4xl text-faint">{{ mark || '❦' }}</div>
    <h3 class="text-lg text-ink">{{ title }}</h3>
    <p v-if="hint" class="mt-1.5 max-w-sm text-sm text-muted">{{ hint }}</p>
    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </div>
</template>
