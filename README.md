# Glossa Scriptorium

A polished, multi-user **Nuxt 4** frontend for [Glossa](https://glossa-production-9287.up.railway.app/) — the
*LLM-maintained-wiki-as-a-service*. Connect with your Glossa API key, hand wikis
raw sources, watch the scribe extract entities and reconcile pages, then **ask
the wiki** and get cited answers.

> **Aesthetic:** *Marginalia / Scriptorium.* Glossa means *gloss* — a scribe's
> margin annotation — so the UI reads like a living manuscript: warm parchment
> (or candlelit-ink dark mode), **rubrication-red** accents (the red ink medieval
> scribes reserved for headings), a Fraunces + Newsreader + IBM Plex Mono type
> system, paper grain, manuscript margin rules, and first-class `[[wikilinks]]`.

---

## Multi-user model

Glossa is multi-tenant: **one API key ↔ one tenant**, and the server enforces
isolation (cross-tenant access returns `404`, never `403`). This frontend is
multi-user in exactly that sense:

- Each user **connects with their own `glsk_live_…` key** on the login screen.
- The key is stored only in the user's browser (a `glossa_key` cookie) and is
  **never pinned into the server** — so a single deployment serves every tenant.
- The same key powers team access: an admin can mint scoped keys for teammates
  from **Account → API keys**, and each teammate connects with theirs.

There is no shared server-side session; identity *is* the key you paste.

## Architecture

```
Browser ──$fetch──▶ /api/glossa/**  (Nitro proxy)  ──Bearer key──▶  Glossa API
         x-glossa-key header                         Authorization
```

The Glossa API sends **no CORS headers**, so the browser cannot call it directly.
Every request is routed through a transparent Nitro proxy
([`server/api/glossa/[...path].ts`](server/api/glossa/%5B...path%5D.ts)) that:

- reads the caller's key from the `x-glossa-key` header (or `glossa_key` cookie),
- forwards it as `Authorization: Bearer …`,
- passes upstream status codes and JSON bodies through verbatim, so the client
  reacts correctly to `401` (bad key → auto sign-out), `402` (quota), `403`
  (missing scope), and `404`.

Runs as an **SPA** (`ssr: false`) — data is per-user and lives behind a key, so
there is nothing useful to server-render. The proxy still runs server-side.

## Features

| Area | What you can do |
|---|---|
| **Library** | List / create wikis (Spaces); at-a-glance page & source totals. |
| **Overview** | Stats, recent pages, the chronicle (log), latest sources; edit name & LLM backend. |
| **Sources** | Add **push** (inline content), **pull** (fetch-callback), **link** (paste a URL → fetched & converted to markdown), or **upload** (PDF/DOCX/PPTX… parsed to text) sources; ingest with **live job polling**; inspect content/metadata. |
| **Wiki** | Browse & filter pages by kind / path; read any page with markdown + resolved `[[wikilinks]]`, source citations, and backlinks in the margin; jump to Index / Log / Lint. |
| **Query** | Ask the wiki; rendered markdown answer with cited sources (deep-linked), cited pages, pages consulted, and reasoning. |
| **Lint** | Run a lint pass (orphans / broken links / contradictions) and read the report. |
| **Schema** | View / edit `schema.md` with a live preview. |
| **Webhooks** | Subscribe signed callbacks; the signing secret is revealed once. |
| **Account** | Usage (cost / tokens / by-operation / by-wiki / events), Quota (live gauges + editable limits), API keys (issue scoped keys, revealed once; revoke), Activity (request log + summary). |
| **Everywhere** | Light/dark theme, copyable `gls_/src_/job_` tokens, toasts, responsive sidebar. |

## Getting started

```sh
npm install
npm run dev          # http://localhost:3000
```

Then open the app and paste a Glossa API key (`glsk_live_…`) to connect.
No key yet? An admin issues one from **Account → API keys**, or mint the first
from a bootstrap-admin token (see the Glossa skill / docs).

### Production

```sh
npm run build
node .output/server/index.mjs    # serves the SPA + the Nitro proxy
```

### Configuration

| Env var | Default | Meaning |
|---|---|---|
| `NUXT_GLOSSA_BASE_URL` | `https://glossa-production-9287.up.railway.app` | The Glossa instance to proxy to. |

Set it to point at any Glossa deployment (e.g. a local `http://localhost:8200`).

## Project layout

```
server/api/glossa/[...path].ts   the key-injecting proxy
app/
  composables/                   useGlossa (API client), useAuth, useJobPoller, useTheme, useToast, useSpaceCtx
  components/ui/                  Button, Card, Badge, Field, Input, Modal, Toasts, …
  components/                     AppSidebar, MarkdownView, JobProgress, SpaceCard, CitationCard, TenantGate
  pages/                         login, index (library), spaces/[id]/* (tabs), account/*
  types/glossa.d.ts              ambient types mirroring the Glossa data model
  assets/css/main.css            the design system (tokens, themes, components)
```

## Notes & limitations

- **Auth** is API-key only. Glossa's OAuth/session lives on Glossa's own domain
  for *its* dashboard and isn't usable cross-origin from this app.
- The **tenant id** (needed for the Account section) is learned from any Space
  you own. A brand-new tenant with no wikis can paste it manually.
- Page markdown is sanitized with DOMPurify before rendering.
- **LLM config is provider-agnostic** (Glossa runs inference through Pydantic AI).
  When you create or edit a wiki, pick a **Provider** (OpenAI / OpenAI-compatible,
  or Anthropic), set a **Model**, and point **API key reference** at an env var on
  the Glossa server (e.g. `env:OPENAI_API_KEY`) — the keys themselves live
  server-side, never in this UI. For Groq/OpenRouter/Together/Ollama/local, choose
  OpenAI and set the **Base URL**. Legacy `byo`/`hosted` configs still work.
