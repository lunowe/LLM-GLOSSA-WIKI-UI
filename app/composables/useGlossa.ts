// Typed-ish client for the Glossa API, routed through our Nitro proxy at
// /api/glossa/**. Every method forwards the caller's key via the x-glossa-key
// header so the same deployment serves many tenants.

export interface ApiErrorBody {
  detail?: unknown
  reason?: string
  quota?: unknown
  [k: string]: unknown
}

export class ApiError extends Error {
  status: number
  body: ApiErrorBody | undefined
  constructor(status: number, body: ApiErrorBody | undefined, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function humanMessage(status: number, data: ApiErrorBody | undefined): string {
  if (data) {
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d: { msg?: string; loc?: unknown[] }) =>
          d.msg ? `${d.msg}${d.loc ? ` (${d.loc.slice(1).join('.')})` : ''}` : JSON.stringify(d),
        )
        .join('; ')
    }
    if (typeof data.reason === 'string') return data.reason
  }
  const fallback: Record<number, string> = {
    400: 'Bad request.',
    401: 'Your API key was rejected.',
    402: 'Quota exceeded for your tenant.',
    403: 'Your key is missing the required scope.',
    404: 'Not found.',
    409: 'Conflict.',
    422: 'The request was rejected as invalid.',
    502: 'Could not reach the Glossa service.',
  }
  return fallback[status] || `Request failed (${status}).`
}

export function useApiKey() {
  return useCookie<string | null>('glossa_key', {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    default: () => null,
  })
}

export function useTenantId() {
  return useCookie<string | null>('glossa_tenant', {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    default: () => null,
  })
}

interface RequestOpts {
  query?: Record<string, unknown>
  body?: unknown
  key?: string | null
}

export function useGlossa() {
  const keyCookie = useApiKey()
  const route = useRoute()

  async function request<T = unknown>(
    method: string,
    path: string,
    opts: RequestOpts = {},
  ): Promise<T> {
    const key = opts.key ?? keyCookie.value
    try {
      return await $fetch<T>(`/api/glossa/${path}`, {
        method: method as 'GET',
        query: opts.query,
        body: opts.body as Record<string, unknown> | undefined,
        headers: key ? { 'x-glossa-key': key } : undefined,
      })
    } catch (err: unknown) {
      const e = err as { status?: number; statusCode?: number; data?: ApiErrorBody }
      const status = e.status ?? e.statusCode ?? 502
      const body = e.data
      const message = humanMessage(status, body)
      // A rejected key mid-session (not during the login attempt itself) ends
      // the session and bounces to the connect screen.
      if (status === 401 && route.path !== '/login' && opts.key == null) {
        keyCookie.value = null
        useTenantId().value = null
        if (import.meta.client) {
          await navigateTo('/login?expired=1')
        }
      }
      throw new ApiError(status, body, message)
    }
  }

  return {
    request,

    /** Validate a key (used by the login screen) — returns the tenant's spaces. */
    validateKey: (plaintext: string) =>
      request<Space[]>('GET', 'spaces', { key: plaintext }),

    spaces: {
      list: () => request<Space[]>('GET', 'spaces'),
      get: (id: string) => request<Space>('GET', `spaces/${id}`),
      create: (body: Record<string, unknown>) => request<Space>('POST', 'spaces', { body }),
      update: (id: string, body: Record<string, unknown>) =>
        request<Space>('PATCH', `spaces/${id}`, { body }),
      getSchema: (id: string) => request<{ path: string; content: string }>('GET', `spaces/${id}/schema`),
      putSchema: (id: string, schema_markdown: string) =>
        request<{ ok: boolean; path: string }>('PUT', `spaces/${id}/schema`, {
          query: { schema_markdown },
        }),
    },

    sources: {
      list: (id: string, query: { limit?: number; offset?: number } = {}) =>
        request<Source[]>('GET', `spaces/${id}/sources`, { query }),
      get: (id: string, sid: string) => request<Source>('GET', `spaces/${id}/sources/${sid}`),
      create: (id: string, body: Record<string, unknown>) =>
        request<Source>('POST', `spaces/${id}/sources`, { body }),
      /** Upload a document (PDF/DOCX/PPTX/…) as an `upload`-mode source. */
      upload: (
        id: string,
        fields: { file: File; title?: string; external_uri?: string; metadata?: Record<string, unknown> },
      ) => {
        const fd = new FormData()
        fd.append('file', fields.file)
        if (fields.title) fd.append('title', fields.title)
        if (fields.external_uri) fd.append('external_uri', fields.external_uri)
        if (fields.metadata) fd.append('metadata', JSON.stringify(fields.metadata))
        return request<Source>('POST', `spaces/${id}/sources/upload`, { body: fd })
      },
      ingest: (id: string, sid: string) =>
        request<Job>('POST', `spaces/${id}/sources/${sid}/ingest`),
    },

    pages: {
      list: (id: string, query: { kind?: string; path_prefix?: string; limit?: number } = {}) =>
        request<Page[]>('GET', `spaces/${id}/pages`, { query }),
      get: (id: string, path: string) =>
        request<PageWithContent>('GET', `spaces/${id}/pages/${path}`),
      index: (id: string) => request<{ path: string; content: string }>('GET', `spaces/${id}/index`),
      log: (id: string, tail?: number) =>
        request<{ path: string; content: string }>('GET', `spaces/${id}/log`, {
          query: tail ? { tail } : undefined,
        }),
      lintReport: (id: string) =>
        request<{ path: string; content: string }>('GET', `spaces/${id}/lint-report`),
    },

    jobs: {
      get: (jobId: string) => request<Job>('GET', `jobs/${jobId}`),
    },

    query: (id: string, body: { question: string; max_pages?: number }) =>
      request<QueryResponse>('POST', `spaces/${id}/query`, { body }),

    lint: (id: string) => request<Job>('POST', `spaces/${id}/lint`),

    webhooks: {
      list: (id: string) => request<Webhook[]>('GET', `spaces/${id}/webhooks`),
      create: (id: string, body: Record<string, unknown>) =>
        request<Webhook>('POST', `spaces/${id}/webhooks`, { body }),
      remove: (id: string, whId: string) =>
        request<{ ok: boolean }>('DELETE', `spaces/${id}/webhooks/${whId}`),
    },

    spaceUsageEvents: (id: string, limit = 50) =>
      request<UsageEvent[]>('GET', `spaces/${id}/usage/events`, { query: { limit } }),

    tenant: {
      usage: (tid: string, period?: string) =>
        request<UsagePeriodSummary>('GET', `tenants/${tid}/usage`, {
          query: period ? { period } : undefined,
        }),
      usageSummary: (tid: string) =>
        request<Record<string, unknown>>('GET', `tenants/${tid}/usage/summary`),
      usageBySpace: (tid: string, period?: string) =>
        request<Record<string, unknown>[]>('GET', `tenants/${tid}/usage/by-space`, {
          query: period ? { period } : undefined,
        }),
      usageEvents: (tid: string, query: { space_id?: string; limit?: number } = {}) =>
        request<UsageEvent[]>('GET', `tenants/${tid}/usage/events`, { query }),
      quota: (tid: string) => request<QuotaStatus>('GET', `tenants/${tid}/quota`),
      quotaConfig: (tid: string) =>
        request<TenantQuota | null>('GET', `tenants/${tid}/quota/config`),
      putQuota: (tid: string, body: Record<string, unknown>) =>
        request<TenantQuota>('PUT', `tenants/${tid}/quota`, { body }),
      activityRequests: (
        tid: string,
        query: { method?: string; path_prefix?: string; status_min?: number; limit?: number } = {},
      ) => request<RequestEvent[]>('GET', `tenants/${tid}/activity/requests`, { query }),
      activitySummary: (tid: string, hours = 24) =>
        request<RequestActivitySummary>('GET', `tenants/${tid}/activity/summary`, {
          query: { hours },
        }),
    },

    keys: {
      list: (tid: string, includeRevoked = false) =>
        request<ApiKey[]>('GET', `tenants/${tid}/api-keys`, {
          query: { include_revoked: includeRevoked },
        }),
      create: (tid: string, body: Record<string, unknown>) =>
        request<ApiKeyIssued>('POST', `tenants/${tid}/api-keys`, { body }),
      revoke: (tid: string, keyId: string) =>
        request<ApiKey>('DELETE', `tenants/${tid}/api-keys/${keyId}`),
    },
  }
}
