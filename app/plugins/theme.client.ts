// Apply the persisted theme before the app paints.
export default defineNuxtPlugin(() => {
  useTheme().apply()
})
