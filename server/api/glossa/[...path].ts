import {
  defineEventHandler,
  getRouterParam,
  getQuery,
  getHeader,
  getCookie,
  readRawBody,
  setResponseStatus,
  sendWebResponse,
} from 'h3'
import { joinURL, withQuery } from 'ufo'

/**
 * Transparent proxy: browser -> /api/glossa/<path> -> <GLOSSA_BASE_URL>/<path>.
 *
 * Why this exists:
 *  - The Glossa API sends no CORS headers, so a browser cannot call it directly.
 *  - It is multi-user: each request carries the *caller's own* key, taken from
 *    the `x-glossa-key` header (preferred) or the `glossa_key` cookie. The key
 *    is never baked into the server, so one deployment serves many tenants.
 *
 * Upstream status codes and JSON bodies are passed through verbatim so the
 * client can react to 401 (bad key), 402 (quota), 403 (scope), 404, etc.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const base = config.glossaBaseUrl as string

  const path = getRouterParam(event, 'path') || ''
  const query = getQuery(event)
  const target = withQuery(joinURL(base, path), query)

  const key =
    getHeader(event, 'x-glossa-key') || getCookie(event, 'glossa_key') || ''

  const headers: Record<string, string> = { accept: 'application/json' }
  if (key) headers.authorization = `Bearer ${key}`

  const method = event.method
  // Forward the body as raw bytes (Buffer). Stringifying it would corrupt
  // binary payloads such as multipart/form-data file uploads
  // (POST /spaces/{id}/sources/upload); JSON bodies pass through unchanged.
  // The original content-type — including the multipart boundary — is
  // preserved so the upstream can parse it.
  let body: Buffer | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    const raw = await readRawBody(event, false)
    if (raw && raw.length) {
      body = raw as Buffer
      headers['content-type'] = getHeader(event, 'content-type') || 'application/json'
    }
  }

  try {
    // Server-Sent Events passthrough for chat streaming. $fetch.raw with
    // responseType:'json' below would consume the entire event-stream and
    // defeat token-by-token delivery, so we stream the upstream body verbatim.
    if (path.endsWith('/chat/stream') && method === 'POST') {
      const upstream = await fetch(target, {
        method: 'POST',
        headers: { ...headers, accept: 'text/event-stream' },
        body: body as BodyInit | undefined,
      })
      const outHeaders = new Headers(upstream.headers)
      outHeaders.set('content-type', upstream.headers.get('content-type') || 'text/event-stream')
      outHeaders.set('cache-control', 'no-cache, no-transform')
      outHeaders.set('x-accel-buffering', 'no') // disable proxy buffering (nginx/Railway)
      return await sendWebResponse(
        event,
        new Response(upstream.body, { status: upstream.status, headers: outHeaders }),
      )
    }

    const res = await $fetch.raw(target, {
      method: method as never,
      headers,
      body,
      responseType: 'json',
    })
    setResponseStatus(event, res.status)
    return res._data
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; _data?: unknown }; message?: string }
    const status = e.response?.status ?? 502
    setResponseStatus(event, status)
    return (
      e.response?._data ?? {
        detail: e.message || 'Upstream Glossa request failed.',
      }
    )
  }
})
