<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { connect } = useAuth()
const { toggle, theme } = useTheme()
const toast = useToast()

const keyInput = ref('')
const busy = ref(false)
const error = ref('')
const expired = computed(() => route.query.expired === '1')

async function submit() {
  error.value = ''
  busy.value = true
  try {
    const { spaces } = await connect(keyInput.value)
    toast.success('Connected', `${spaces.length} wiki${spaces.length === 1 ? '' : 's'} in reach.`)
    const redirect = (route.query.redirect as string) || '/'
    await navigateTo(redirect)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Could not connect. Check the key and try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-5xl">
    <button class="btn btn-ghost btn-sm absolute right-5 top-5 px-2" @click="toggle">
      <svg v-if="theme === 'dark'" class="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      </svg>
      <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
      </svg>
    </button>

    <div class="raised grid overflow-hidden md:grid-cols-2">
      <!-- Editorial panel -->
      <div class="relative hidden flex-col justify-between border-r border-hair p-9 md:flex"
           style="background: linear-gradient(160deg, color-mix(in oklab, var(--c-rubric) 7%, var(--c-surface)), var(--c-surface))">
        <div class="flex items-center gap-2.5">
          <span class="font-display text-3xl leading-none text-rubric">☞</span>
          <div>
            <div class="wordmark text-2xl text-ink">Glossa</div>
            <div class="label mt-1">Scriptorium</div>
          </div>
        </div>

        <div class="my-10">
          <p class="label mb-3">γλῶσσα · the living gloss</p>
          <h1 class="font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-ink">
            A wiki that<br />keeps <em class="text-rubric not-italic">itself</em><br />current.
          </h1>
          <p class="mt-5 max-w-sm text-[1.02rem] leading-relaxed text-muted">
            Feed it raw sources; it maintains a structured, interlinked markdown
            wiki — entity pages, syntheses, an index, a log. Then you simply ask.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="token">push &amp; pull sources</span>
          <span class="token">entity extraction</span>
          <span class="token">cited answers</span>
        </div>
      </div>

      <!-- Connect form -->
      <div class="p-8 sm:p-10">
        <div class="mb-1 flex items-center gap-2.5 md:hidden">
          <span class="font-display text-2xl leading-none text-rubric">☞</span>
          <span class="wordmark text-xl text-ink">Glossa</span>
        </div>

        <h2 class="font-display text-2xl text-ink">Connect your wiki</h2>
        <p class="mt-1.5 text-sm text-muted">
          Paste a Glossa API key to enter your tenant's workspace. Each key opens
          its own isolated set of wikis.
        </p>

        <div
          v-if="expired"
          class="mt-5 rounded-md border border-[color-mix(in_oklab,var(--c-rubric)_30%,transparent)] bg-rubric-soft px-3.5 py-2.5 text-sm text-rubric-ink"
        >
          Your session ended — the key was rejected. Please reconnect.
        </div>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <UiField label="API key" hint="Format: glsk_live_… — stored only in your browser.">
            <UiInput
              v-model="keyInput"
              type="password"
              mono
              placeholder="glsk_live_••••••••••••••••"
              autofocus
            />
          </UiField>

          <p v-if="error" class="flex items-start gap-2 text-sm text-rubric-ink">
            <span class="mt-0.5">✕</span><span>{{ error }}</span>
          </p>

          <UiButton type="submit" variant="primary" block :loading="busy" :disabled="!keyInput.trim()">
            {{ busy ? 'Verifying…' : 'Connect' }}
            <span v-if="!busy" aria-hidden="true">→</span>
          </UiButton>
        </form>

        <hr class="rule-mark my-7" />

        <p class="text-xs leading-relaxed text-muted">
          No key yet? An admin issues one from
          <span class="mono text-faint">Account → API keys</span>, or mint the first
          from a bootstrap-admin token. Keys are shown once — keep them safe.
        </p>
      </div>
    </div>

    <p class="mt-5 text-center text-xs text-faint">
      Connects to <span class="mono">glossa-production-9287.up.railway.app</span>
    </p>
  </div>
</template>
