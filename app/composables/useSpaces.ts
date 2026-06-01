// Shared, cached spaces list (sidebar + dashboard read the same state).
export function useSpaces() {
  const api = useGlossa()
  return useAsyncData<Space[]>('spaces', () => api.spaces.list(), { default: () => [] })
}

export function refreshSpaces() {
  return refreshNuxtData('spaces')
}
