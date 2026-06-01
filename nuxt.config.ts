import tailwindcss from '@tailwindcss/vite'

// Glossa Scriptorium — Nuxt 4 multi-user frontend for the Glossa wiki API.
// The browser never talks to Glossa directly (no CORS on the API); every call
// is proxied through /api/glossa/** in the Nitro server, which injects the
// caller's API key. See server/api/glossa/[...path].ts.
export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',

  // Single-page app: data is per-user and lives behind a key, so there is no
  // value in server-rendering it — and it keeps the auth/cookie story simple.
  // (The Nitro proxy still runs server-side regardless of this flag.)
  ssr: false,

  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Server-only. Override in prod with NUXT_GLOSSA_BASE_URL.
    glossaBaseUrl: 'https://glossa-production-9287.up.railway.app',
  },

  app: {
    head: {
      title: 'Glossa Scriptorium',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'A living gloss — browse, ingest, and query your Glossa LLM-maintained wikis.',
        },
        { name: 'theme-color', content: '#b23a2e' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,400..500&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
        },
      ],
    },
  },
})
