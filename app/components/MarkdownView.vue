<script setup lang="ts">
const props = withDefaults(
  defineProps<{ content?: string | null; spaceId?: string }>(),
  { content: '', spaceId: '' },
)

const html = computed(() => renderWiki(props.content, props.spaceId))

// Intercept in-app links (wikilinks) so they navigate without a full reload.
function onClick(e: MouseEvent) {
  const a = (e.target as HTMLElement)?.closest('a')
  if (!a) return
  const href = a.getAttribute('href') || ''
  if (href.startsWith('/')) {
    e.preventDefault()
    navigateTo(href)
  } else if (/^https?:\/\//.test(href)) {
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noopener noreferrer')
  }
}
</script>

<template>
  <ClientOnly>
    <div class="gloss-prose" @click="onClick" v-html="html" />
    <template #fallback>
      <div class="text-sm text-muted">Rendering…</div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.gloss-prose {
  font-family: var(--font-body);
  font-size: 1.02rem;
  line-height: 1.72;
  color: var(--c-ink);
  word-wrap: break-word;
  overflow-wrap: anywhere;
}
.gloss-prose :deep(> :first-child) {
  margin-top: 0;
}
.gloss-prose :deep(h1),
.gloss-prose :deep(h2),
.gloss-prose :deep(h3),
.gloss-prose :deep(h4) {
  font-family: var(--font-display);
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin: 1.8em 0 0.6em;
}
.gloss-prose :deep(h1) {
  font-size: 1.7rem;
}
.gloss-prose :deep(h2) {
  font-size: 1.36rem;
  padding-bottom: 0.25em;
  border-bottom: 1px solid var(--c-hair);
}
.gloss-prose :deep(h3) {
  font-size: 1.14rem;
  color: var(--c-rubric-ink);
}
.gloss-prose :deep(p) {
  margin: 0.85em 0;
}
.gloss-prose :deep(a) {
  color: var(--c-rubric);
  text-decoration: underline;
  text-decoration-color: color-mix(in oklab, var(--c-rubric) 40%, transparent);
  text-underline-offset: 2px;
}
.gloss-prose :deep(a:hover) {
  text-decoration-color: var(--c-rubric);
}
/* Wikilinks: dotted, with a leading manicule */
.gloss-prose :deep(a.wikilink) {
  text-decoration-style: dotted;
  font-weight: 500;
  white-space: nowrap;
}
.gloss-prose :deep(a.wikilink)::before {
  content: '☞ ';
  opacity: 0.55;
  font-size: 0.9em;
}
.gloss-prose :deep(ul),
.gloss-prose :deep(ol) {
  margin: 0.85em 0;
  padding-left: 1.4em;
}
.gloss-prose :deep(li) {
  margin: 0.3em 0;
}
.gloss-prose :deep(ul) {
  list-style: none;
}
.gloss-prose :deep(ul > li) {
  position: relative;
}
.gloss-prose :deep(ul > li)::before {
  content: '·';
  position: absolute;
  left: -1.1em;
  color: var(--c-rubric);
  font-weight: 700;
}
.gloss-prose :deep(ol) {
  list-style: decimal;
}
.gloss-prose :deep(blockquote) {
  margin: 1.1em 0;
  padding: 0.2em 0 0.2em 1.1em;
  border-left: 2px solid var(--c-rubric);
  color: var(--c-muted);
  font-style: italic;
}
.gloss-prose :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: color-mix(in oklab, var(--c-ink) 6%, transparent);
  border: 1px solid var(--c-hair);
  border-radius: 4px;
  padding: 0.08em 0.36em;
}
.gloss-prose :deep(pre) {
  margin: 1.1em 0;
  padding: 1em 1.1em;
  background: color-mix(in oklab, var(--c-ink) 5%, transparent);
  border: 1px solid var(--c-rule);
  border-radius: var(--radius);
  overflow-x: auto;
  font-size: 0.86rem;
}
.gloss-prose :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
}
.gloss-prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.1em 0;
  font-size: 0.92rem;
}
.gloss-prose :deep(th),
.gloss-prose :deep(td) {
  border: 1px solid var(--c-hair);
  padding: 0.5em 0.7em;
  text-align: left;
}
.gloss-prose :deep(th) {
  background: color-mix(in oklab, var(--c-ink) 4%, transparent);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--c-muted);
}
.gloss-prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--c-hair);
  margin: 1.8em 0;
}
.gloss-prose :deep(img) {
  max-width: 100%;
  border-radius: var(--radius);
}
</style>
