// Visual vocabulary for the enums Glossa returns, so colours stay consistent.

type Tone = { fg: string; bg: string; label: string }

// PageKind
export const PAGE_KINDS: Record<string, Tone> = {
  entity: { fg: 'var(--c-azure)', bg: 'color-mix(in oklab, var(--c-azure) 14%, transparent)', label: 'Entity' },
  topic: { fg: 'var(--c-verdigris)', bg: 'color-mix(in oklab, var(--c-verdigris) 16%, transparent)', label: 'Topic' },
  summary: { fg: 'var(--c-muted)', bg: 'color-mix(in oklab, var(--c-ink) 7%, transparent)', label: 'Summary' },
  synthesis: { fg: 'var(--c-rubric)', bg: 'var(--c-rubric-soft)', label: 'Synthesis' },
  comparison: { fg: 'var(--c-gold)', bg: 'color-mix(in oklab, var(--c-gold) 16%, transparent)', label: 'Comparison' },
  system: { fg: 'var(--c-faint)', bg: 'color-mix(in oklab, var(--c-ink) 5%, transparent)', label: 'System' },
  custom: { fg: 'var(--c-muted)', bg: 'color-mix(in oklab, var(--c-ink) 7%, transparent)', label: 'Custom' },
}

export function pageKind(kind?: string): Tone {
  return PAGE_KINDS[kind || ''] ?? (PAGE_KINDS.custom as Tone)
}

// JobStatus
export const JOB_STATUS: Record<string, Tone> = {
  queued: { fg: 'var(--c-gold)', bg: 'color-mix(in oklab, var(--c-gold) 16%, transparent)', label: 'Queued' },
  running: { fg: 'var(--c-azure)', bg: 'color-mix(in oklab, var(--c-azure) 14%, transparent)', label: 'Running' },
  succeeded: { fg: 'var(--c-verdigris)', bg: 'color-mix(in oklab, var(--c-verdigris) 16%, transparent)', label: 'Succeeded' },
  failed: { fg: 'var(--c-rubric)', bg: 'var(--c-rubric-soft)', label: 'Failed' },
}

export function jobStatus(status?: string): Tone {
  return JOB_STATUS[status || ''] ?? (JOB_STATUS.queued as Tone)
}

// SourceStatus
export const SOURCE_STATUS: Record<string, Tone> = {
  received: { fg: 'var(--c-muted)', bg: 'color-mix(in oklab, var(--c-ink) 7%, transparent)', label: 'Received' },
  ingesting: { fg: 'var(--c-azure)', bg: 'color-mix(in oklab, var(--c-azure) 14%, transparent)', label: 'Ingesting' },
  done: { fg: 'var(--c-verdigris)', bg: 'color-mix(in oklab, var(--c-verdigris) 16%, transparent)', label: 'Done' },
  failed: { fg: 'var(--c-rubric)', bg: 'var(--c-rubric-soft)', label: 'Failed' },
}

export function sourceStatus(status?: string): Tone {
  return SOURCE_STATUS[status || ''] ?? (SOURCE_STATUS.received as Tone)
}

export const isTerminal = (status?: string) =>
  status === 'succeeded' || status === 'failed'
