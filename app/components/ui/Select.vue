<script setup lang="ts">
const model = defineModel<string | number>()
defineProps<{ options: { value: string | number; label: string }[] }>()
</script>

<template>
  <div class="relative">
    <select v-model="model" class="field appearance-none pr-9">
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <svg
      class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
</template>
