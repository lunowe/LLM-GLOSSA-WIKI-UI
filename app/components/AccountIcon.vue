<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
    <template v-if="name === 'chart'">
      <path d="M4 20V4m0 16h16M8 16v-4m4 4V8m4 8v-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
    </template>
    <template v-else-if="name === 'gauge'">
      <path d="M12 13l4-4M5 18a8 8 0 1 1 14 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
    </template>
    <template v-else-if="name === 'key'">
      <circle cx="8" cy="8" r="4" stroke="currentColor" stroke-width="1.7" />
      <path d="m11 11 9 9m-3 0 2-2m-4-4 2-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
    </template>
    <template v-else>
      <path d="M3 12h4l2 6 4-14 2 8h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
    </template>
  </svg>
</template>
