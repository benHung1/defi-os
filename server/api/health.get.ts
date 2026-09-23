import { buildHealthSnapshot } from '../services/healthService'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const snapshot = buildHealthSnapshot({
    environment: process.env.NODE_ENV,
    reownProjectId: config.public.reownProjectId
  })

  setResponseHeader(event, 'cache-control', 'no-store')
  setResponseStatus(event, snapshot.status === 'ok' ? 200 : 503)
  return snapshot
})
