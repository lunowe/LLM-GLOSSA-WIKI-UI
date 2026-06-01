<script setup lang="ts">
const navOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (navOpen.value = false))
</script>

<template>
  <div class="min-h-screen lg:flex">
    <!-- Desktop sidebar -->
    <aside class="sticky top-0 hidden h-screen w-[268px] shrink-0 border-r border-hair bg-surface lg:block">
      <AppSidebar />
    </aside>

    <!-- Mobile drawer -->
    <Transition name="drawer">
      <div v-if="navOpen" class="fixed inset-0 z-40 lg:hidden">
        <div class="absolute inset-0 bg-[color-mix(in_oklab,#000_50%,transparent)]" @click="navOpen = false" />
        <aside class="absolute left-0 top-0 h-full w-[280px] border-r border-hair bg-surface">
          <AppSidebar @navigate="navOpen = false" />
        </aside>
      </div>
    </Transition>

    <!-- Mobile top bar -->
    <div class="sticky top-0 z-30 flex items-center justify-between border-b border-hair bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <button class="btn btn-ghost btn-sm px-2" @click="navOpen = true">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>
      <span class="wordmark text-lg text-ink"><span class="text-rubric">☞</span> Glossa</span>
      <span class="w-9" />
    </div>

    <main class="min-w-0 flex-1">
      <div class="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active aside,
.drawer-leave-active aside {
  transition: transform 0.25s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from aside,
.drawer-leave-to aside {
  transform: translateX(-100%);
}
</style>
