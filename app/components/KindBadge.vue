<script setup lang="ts">
const props = defineProps<{ kind?: string }>()
const tone = computed(() => pageKind(props.kind))
</script>

<template>
  <UiBadge :tone="tone" />
</template>
