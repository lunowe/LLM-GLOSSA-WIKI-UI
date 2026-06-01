<script setup lang="ts">
const model = defineModel<string>()
withDefaults(defineProps<{ placeholder?: string; rows?: number; mono?: boolean }>(), { rows: 6 })
</script>

<template>
  <textarea
    v-model="model"
    :rows="rows"
    :placeholder="placeholder"
    class="field"
    :class="mono ? 'mono text-sm' : ''"
  />
</template>
