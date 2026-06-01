<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'quiet'
    size?: 'md' | 'sm'
    to?: string
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
    block?: boolean
  }>(),
  { variant: 'ghost', size: 'md', type: 'button' },
)

const classes = computed(() => [
  'btn',
  `btn-${props.variant}`,
  props.size === 'sm' ? 'btn-sm' : '',
  props.block ? 'w-full' : '',
])
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="classes">
    <slot />
  </NuxtLink>
  <button v-else :type="type" :class="classes" :disabled="disabled || loading">
    <UiSpinner v-if="loading" class="h-3.5 w-3.5" />
    <slot />
  </button>
</template>
