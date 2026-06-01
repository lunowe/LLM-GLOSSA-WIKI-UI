// Polls a Glossa job until it reaches a terminal state. Used after ingest/lint.
export function useJobPoller() {
  const api = useGlossa()
  const job = ref<Job | null>(null)
  const polling = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function stop() {
    if (timer) clearTimeout(timer)
    timer = null
    polling.value = false
  }

  async function track(jobId: string, intervalMs = 1500): Promise<Job> {
    stop()
    polling.value = true
    return new Promise<Job>((resolve, reject) => {
      const tick = async () => {
        try {
          const j = await api.jobs.get(jobId)
          job.value = j
          if (isTerminal(j.status)) {
            stop()
            resolve(j)
          } else {
            timer = setTimeout(tick, intervalMs)
          }
        } catch (e) {
          stop()
          reject(e)
        }
      }
      tick()
    })
  }

  onScopeDispose(stop)

  return { job, polling, track, stop }
}
