// Small formatting helpers shared across the app.

export function relativeTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  const ms = d.getTime()
  if (Number.isNaN(ms)) return '—'
  const diff = Date.now() - ms
  const abs = Math.abs(diff)
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60_000, 'second'],
    [3_600_000, 'minute'],
    [86_400_000, 'hour'],
    [2_592_000_000, 'day'],
    [31_536_000_000, 'month'],
    [Infinity, 'year'],
  ]
  const divisors: Record<string, number> = {
    second: 1000,
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    month: 2_592_000_000,
    year: 31_536_000_000,
  }
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [limit, unit] of units) {
    if (abs < limit) {
      const v = Math.round(-diff / (divisors[unit] ?? 1))
      return rtf.format(v, unit)
    }
  }
  return d.toLocaleDateString()
}

export function absoluteTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function bytes(n?: number | null): string {
  if (n == null) return '—'
  if (n === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  const v = n / Math.pow(1024, i)
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}

export function usd(n?: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: n < 1 ? 4 : 2,
    maximumFractionDigits: n < 1 ? 4 : 2,
  }).format(n)
}

export function compactNumber(n?: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function num(n?: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en').format(n)
}

export function titleCase(s: string): string {
  return s
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
