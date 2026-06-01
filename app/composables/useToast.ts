export type ToastKind = 'success' | 'error' | 'info'
export interface Toast {
  id: number
  kind: ToastKind
  title: string
  detail?: string
}

let seq = 0

export function useToasts() {
  return useState<Toast[]>('toasts', () => [])
}

export function useToast() {
  const toasts = useToasts()

  function push(kind: ToastKind, title: string, detail?: string, ttl = 5000) {
    const id = ++seq
    toasts.value = [...toasts.value, { id, kind, title, detail }]
    if (import.meta.client && ttl > 0) {
      setTimeout(() => dismiss(id), ttl)
    }
    return id
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    dismiss,
    success: (t: string, d?: string) => push('success', t, d),
    error: (t: string, d?: string) => push('error', t, d, 8000),
    info: (t: string, d?: string) => push('info', t, d),
  }
}
