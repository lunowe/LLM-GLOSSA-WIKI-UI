<script setup lang="ts">
import type { NuxtError } from '#app'
defineProps<{ error: NuxtError }>()
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-5">
    <div class="text-center">
      <div class="font-display text-7xl text-rubric">{{ error.statusCode || '×' }}</div>
      <h1 class="mt-3 font-display text-2xl text-ink">A page came loose from the binding.</h1>
      <p class="mt-2 max-w-md text-muted">{{ error.message || 'Something went wrong.' }}</p>
      <button class="btn btn-primary mt-6" @click="clearError({ redirect: '/' })">Back to the library</button>
    </div>
  </div>
</template>
