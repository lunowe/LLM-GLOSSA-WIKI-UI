<script setup lang="ts">
const { toasts, dismiss } = useToast()

const accent: Record<string, string> = {
  success: 'var(--c-verdigris)',
  error: 'var(--c-rubric)',
  info: 'var(--c-azure)',
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2.5">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="raised pointer-events-auto flex items-start gap-3 p-3.5 pr-3"
          :style="{ borderLeft: `3px solid ${accent[t.kind]}` }"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-ink">{{ t.title }}</p>
            <p v-if="t.detail" class="mt-0.5 break-words text-xs text-muted">{{ t.detail }}</p>
          </div>
          <button class="btn-quiet btn -mr-1 -mt-1 px-1.5 py-1" @click="dismiss(t.id)">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.96);
}
.toast-leave-active {
  position: absolute;
  width: 100%;
}
</style>
