<script setup lang="ts">
withDefaults(defineProps<{ raised?: boolean; pad?: boolean }>(), { pad: true })
</script>

<template>
  <div :class="[raised ? 'raised' : 'panel', pad ? 'p-5' : '']">
    <slot />
  </div>
</template>
