import type { InjectionKey, Ref } from 'vue'

export interface SpaceCtx {
  id: string
  space: Ref<Space | null | undefined>
  refresh: () => Promise<void>
}

export const SpaceKey: InjectionKey<SpaceCtx> = Symbol('glossa-space')

export function provideSpace(ctx: SpaceCtx) {
  provide(SpaceKey, ctx)
}

export function useSpaceCtx(): SpaceCtx {
  const ctx = inject(SpaceKey)
  if (!ctx) throw new Error('useSpaceCtx must be used within a space route')
  return ctx
}
