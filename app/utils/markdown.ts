import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: false })

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Turn Glossa wikilinks — [[logical/path]] or [[logical/path|Label]] — into
 * real anchors that route to the in-app wiki viewer. Fenced code blocks are
 * left untouched.
 */
export function expandWikilinks(markdownText: string, spaceId: string): string {
  const parts = markdownText.split(/(```[\s\S]*?```)/g)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part // fenced code — leave alone
      return part.replace(/\[\[([^\]|\n]+?)(?:\|([^\]\n]+?))?\]\]/g, (_m, path: string, label?: string) => {
        const clean = path.trim().replace(/\.md$/i, '')
        const text = (label || clean).trim()
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
