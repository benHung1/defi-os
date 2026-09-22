import type { PortfolioResponse } from '../../shared/types/portfolio'
import { createPortfolioDemo } from '../utils/portfolioDemo'

export function usePortfolio() {
  const { address } = useWalletSession()
  const { active: demoActive } = usePortfolioDemo()
  const portfolio = ref<PortfolioResponse | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)
  let requestId = 0

  async function refresh() {
    const requestedAddress = address.value
    const currentRequest = ++requestId
    if (!requestedAddress) {
      portfolio.value = null
      pending.value = false
      error.value = null
      return
    }

    if (demoActive.value) {
      portfolio.value = createPortfolioDemo()
      pending.value = false
      error.value = null
      return
    }

    pending.value = true
    error.value = null
    try {
      const result = await $fetch<PortfolioResponse>('/api/portfolio', { query: { address: requestedAddress } })
      if (currentRequest === requestId) portfolio.value = result
    } catch {
      if (currentRequest === requestId) {
        portfolio.value = null
        error.value = '目前無法取得錢包資產，請稍後重試。'
      }
    } finally {
      if (currentRequest === requestId) pending.value = false
    }
  }

  watch([address, demoActive], refresh, { immediate: true })

  return { portfolio, pending, error, refresh }
}
