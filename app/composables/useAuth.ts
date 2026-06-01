export function useAuth() {
  const key = useApiKey()
  const tenantId = useTenantId()
  const api = useGlossa()

  const isAuthed = computed(() => !!key.value)

  /** Validate a pasted key against the live API, persist it on success. */
  async function connect(plaintext: string) {
    const trimmed = plaintext.trim()
    if (!trimmed) throw new ApiError(400, undefined, 'Please paste an API key.')
    const spaces = await api.validateKey(trimmed) // throws ApiError on bad key
    key.value = trimmed
    const tid = spaces.find((s) => s.tenant_id)?.tenant_id
    if (tid) tenantId.value = tid
    await nextTick()
    return { spaces, tenantId: tid }
  }

  /** Opportunistically learn the tenant id from any space we load. */
  function captureTenant(space?: { tenant_id?: string } | null) {
    if (space?.tenant_id && tenantId.value !== space.tenant_id) {
      tenantId.value = space.tenant_id
    }
  }

  async function logout() {
    key.value = null
    tenantId.value = null
    await nextTick()
    await navigateTo('/login')
  }

  return { key, tenantId, isAuthed, connect, captureTenant, logout }
}
