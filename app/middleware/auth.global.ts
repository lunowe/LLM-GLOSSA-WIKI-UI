// Gate every route behind a connected API key. /login is the only public page.
export default defineNuxtRouteMiddleware((to) => {
  const key = useApiKey()
  if (to.path === '/login') {
    if (key.value) return navigateTo('/')
    return
  }
  if (!key.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
