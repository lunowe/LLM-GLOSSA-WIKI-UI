import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: false })

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function isExternalTarget(target: string): boolean {
  return target.includes('://') || /^(mailto:|tel:)/i.test(target)
}

/**
 * Normalize a wikilink target to a Glossa *logical* page path, mirroring the
 * backend `glossa.utils.wikilinks.normalize_page_path`: drop any alias, anchor,
 * leading `./` or `/`, a `pages/` storage prefix, and a `.md` suffix — so
 * [[pages/entities/x.md#bio|Alias]] and [[entities/x]] resolve to one page.
 */
export function normalizeWikiPath(raw: string): string {
  let t = raw.trim()
  if (t.startsWith('[[') && t.endsWith(']]')) t = t.slice(2, -2)
  t = t.split('|')[0]!.split('#')[0]!.trim()
  if (!t || isExternalTarget(t)) return t
  while (t.startsWith('./')) t = t.slice(2)
  t = t.replace(/^\/+/, '')
  if (t.startsWith('pages/')) t = t.slice('pages/'.length)
  if (/\.md$/i.test(t)) t = t.slice(0, -3)
  return t.replace(/^\/+|\/+$/g, '')
}

/**
 * Turn Glossa wikilinks — [[logical/path]] or [[logical/path|Label]] — into
 * real anchors that route to the in-app wiki viewer. Targets are normalized the
 * same way the backend does, and external targets become plain external links.
 * Fenced code blocks are left untouched.
 */
export function expandWikilinks(markdownText: string, spaceId: string): string {
  const parts = markdownText.split(/(```[\s\S]*?```)/g)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part // fenced code — leave alone
      return part.replace(/\[\[([^\]|\n]+?)(?:\|([^\]\n]+?))?\]\]/g, (_m, path: string, label?: string) => {
        const raw = path.trim()
        if (isExternalTarget(raw)) {
          const text = (label || raw).trim()
          return `<a href="${escapeAttr(raw)}" target="_blank" rel="noopener noreferrer">${escapeText(text)}</a>`
        }
        const clean = normalizeWikiPath(raw)
        const text = (label || clean || raw).trim()
        if (!clean) return escapeText(text) // e.g. a bare [[#anchor]] — nothing to route to
        const href = `/spaces/${spaceId}/wiki/${clean.split('/').map(encodeURIComponent).join('/')}`
        return `<a class="wikilink" data-wiki="${escapeAttr(clean)}" href="${escapeAttr(href)}">${escapeText(text)}</a>`
      })
    })
    .join('')
}

/** Render Glossa markdown to sanitized HTML (resolving wikilinks). Client-only. */
export function renderWiki(markdownText: string | null | undefined, spaceId = ''): string {
  if (!markdownText) return ''
  if (import.meta.server) return '' // MarkdownView renders client-side only
  const withLinks = spaceId ? expandWikilinks(markdownText, spaceId) : markdownText
  const html = marked.parse(withLinks) as string
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'data-wiki'],
  })
}
