<script setup lang="ts">
const props = defineProps<{ value: string; label?: string; truncate?: boolean }>()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1400)
  } catch {
    /* clipboard unavailable */
  }
}
</script>

<template>
  <button
    type="button"
    class="group inline-flex max-w-full items-center gap-1.5 align-middle"
    :title="`Copy: ${value}`"
    @click.stop="copy"
  >
    <span class="token" :class="truncate ? 'truncate' : ''">{{ label || value }}</span>
    <span class="text-faint transition group-hover:text-rubric">
      <svg v-if="!copied" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      </svg>
      <svg v-else class="h-3.5 w-3.5 text-verdigris" viewBox="0 0 24 24" fill="none">
        <path d="m5 13 4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  </button>
</template>
