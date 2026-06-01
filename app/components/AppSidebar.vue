<script setup lang="ts">
const { data: spaces } = useSpaces()
const { key, tenantId, logout } = useAuth()
const { theme, toggle } = useTheme()
const route = useRoute()

const emit = defineEmits<{ navigate: [] }>()

const keyHint = computed(() => {
  const k = key.value || ''
  return k ? `${k.slice(0, 13)}…${k.slice(-3)}` : ''
})

const accountLinks = [
  { to: '/account/usage', label: 'Usage', icon: 'chart' },
  { to: '/account/quota', label: 'Quota', icon: 'gauge' },
  { to: '/account/keys', label: 'API keys', icon: 'key' },
  { to: '/account/activity', label: 'Activity', icon: 'pulse' },
]

function isSpaceActive(id: string) {
  return route.path.startsWith(`/spaces/${id}`)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Brand -->
    <NuxtLink to="/" class="block px-5 pb-5 pt-6" @click="emit('navigate')">
      <div class="flex items-center gap-2.5">
        <span class="font-display text-2xl leading-none text-rubric">☞</span>
        <div>
          <div class="wordmark text-2xl leading-none text-ink">Glossa</div>
          <div class="label mt-1">Scriptorium</div>
        </div>
      </div>
    </NuxtLink>

    <nav class="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
      <div>
        <NuxtLink
          to="/"
          class="navlink"
          :class="route.path === '/' ? 'navlink-active' : ''"
          @click="emit('navigate')"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
          </svg>
          Dashboard
        </NuxtLink>
      </div>

      <!-- Spaces -->
      <div>
        <div class="mb-1.5 flex items-center justify-between px-2.5">
          <span class="label">Wikis</span>
          <NuxtLink to="/?new=1" class="btn-quiet btn px-1 py-0.5" title="New wiki" @click="emit('navigate')">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </NuxtLink>
        </div>
        <div class="space-y-0.5">
          <NuxtLink
            v-for="s in spaces"
            :key="s.id"
            :to="`/spaces/${s.id}`"
            class="navlink"
            :class="isSpaceActive(s.id) ? 'navlink-active' : ''"
            @click="emit('navigate')"
          >
            <span class="font-display text-base leading-none opacity-70">¶</span>
            <span class="flex-1 truncate">{{ s.name }}</span>
            <span class="mono text-[10px] opacity-50">{{ s.stats?.page_count ?? 0 }}</span>
          </NuxtLink>
          <p v-if="spaces && !spaces.length" class="px-2.5 py-1 text-xs italic text-faint">
            No wikis yet.
          </p>
        </div>
      </div>

      <!-- Account -->
      <div>
        <div class="mb-1.5 px-2.5">
          <span class="label">Account</span>
        </div>
        <div class="space-y-0.5">
          <NuxtLink
            v-for="l in accountLinks"
            :key="l.to"
            :to="l.to"
            class="navlink"
            :class="route.path === l.to ? 'navlink-active' : ''"
            @click="emit('navigate')"
          >
            <AccountIcon :name="l.icon" />
            {{ l.label }}
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Footer -->
    <div class="border-t border-hair px-3 py-3">
      <div class="flex items-center justify-between px-1.5 pb-2">
        <div class="min-w-0">
          <div class="label">Connected</div>
          <div class="mono mt-0.5 truncate text-xs text-muted" :title="tenantId || ''">{{ keyHint }}</div>
        </div>
        <button class="btn btn-ghost btn-sm px-2" :title="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`" @click="toggle">
          <svg v-if="theme === 'dark'" class="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <button class="navlink w-full" @click="logout">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M15 12H4m0 0 4-4m-4 4 4 4M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Disconnect
      </button>
    </div>
  </div>
</template>
