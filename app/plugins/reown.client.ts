import { createAppKit } from '@reown/appkit/vue'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import {
  arbitrum, avalanche, base, bsc, gnosis, linea, mainnet,
  optimism, polygon, scroll, sonic
} from '@reown/appkit/networks'

export default defineNuxtPlugin(() => {
  const projectId = useRuntimeConfig().public.reownProjectId.trim()
  if (!projectId) return

  const networks = [
    mainnet, arbitrum, base, optimism, polygon, bsc,
    avalanche, gnosis, linea, scroll, sonic
  ] as [
    typeof mainnet, typeof arbitrum, typeof base, typeof optimism,
    typeof polygon, typeof bsc, typeof avalanche, typeof gnosis,
    typeof linea, typeof scroll, typeof sonic
  ]

  createAppKit({
    adapters: [new EthersAdapter()],
    networks,
    defaultNetwork: mainnet,
    projectId,
    metadata: {
      name: 'DeFi OS',
      description: '唯讀整理你的 DeFi 持倉與相關市場資訊',
      url: window.location.origin,
      icons: []
    },
    features: {
      analytics: false
    }
  })
})
