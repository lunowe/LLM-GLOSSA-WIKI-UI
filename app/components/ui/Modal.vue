<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
defineProps<{ title?: string; subtitle?: string; wide?: boolean }>()

function close() {
  open.value = false
}

watch(open, (v) => {
  if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''
})
onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
        @keydown.esc="close"
      >
        <div
          class="fixed inset-0 bg-[color-mix(in_oklab,#000_55%,transparent)] backdrop-blur-[2px]"
          @click="close"
        />
        <div
          class="raised relative my-auto w-full p-0"
          :class="wide ? 'max-w-3xl' : 'max-w-lg'"
        >
          <header
            v-if="title"
            class="flex items-start justify-between gap-4 border-b border-hair px-6 py-4"
          >
            <div>
              <h3 class="text-xl">{{ title }}</h3>
              <p v-if="subtitle" class="mt-0.5 text-sm text-muted">{{ subtitle }}</p>
            </div>
            <button class="btn-quiet btn -mr-2 -mt-1" aria-label="Close" @click="close">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </header>
          <div class="px-6 py-5">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-hair px-6 py-4">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .raised,
.modal-leave-active .raised {
  transition: transform 0.22s cubic-bezier(0.2, 0.7, 0.2, 1), opacity 0.22s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .raised,
.modal-leave-to .raised {
  transform: translateY(12px) scale(0.98);
  opacity: 0;
}
</style>
