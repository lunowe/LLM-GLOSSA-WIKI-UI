<script setup lang="ts">
const model = defineModel<string | number>()
withDefaults(
  defineProps<{ type?: string; placeholder?: string; mono?: boolean; autofocus?: boolean }>(),
  { type: 'text' },
)
</script>

<template>
  <input
    v-model="model"
    :type="type"
    :placeholder="placeholder"
    :autofocus="autofocus"
    class="field"
    :class="mono ? 'mono text-sm' : ''"
  />
</template>
