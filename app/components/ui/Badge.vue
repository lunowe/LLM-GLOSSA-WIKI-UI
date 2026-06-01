<script setup lang="ts">
// A pill whose colour comes from a {fg,bg,label} tone (see utils/kinds.ts),
// or plain when no tone given.
const props = defineProps<{ tone?: { fg: string; bg: string; label?: string }; dot?: boolean }>()
const style = computed(() =>
  props.tone ? { color: props.tone.fg, background: props.tone.bg } : {},
)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="!tone ? 'bg-[color-mix(in_oklab,var(--c-ink)_7%,transparent)] text-muted' : ''"
    :style="style"
  >
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full" :style="{ background: 'currentColor' }" />
    <slot>{{ tone?.label }}</slot>
  </span>
</template>
