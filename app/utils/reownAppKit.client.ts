import type { AppKit } from '@reown/appkit'

let appKitPromise: Promise<AppKit> | null = null

export function getReownAppKit (projectId: string): Promise<AppKit> {
  if (appKitPromise) return appKitPromise

  appKitPromise = Promise.all([
    import('@reown/appkit/vue'),
    import('@reown/appkit-adapter-ethers'),
    import('@reown/appkit/networks')
  ]).then(([{ createAppKit }, { EthersAdapter }, networks]) => {
    const {
      arbitrum, avalanche, base, bsc, gnosis, linea, mainnet,
      optimism, polygon, scroll, sonic
    } = networks

    return createAppKit({
      adapters: [new EthersAdapter()],
      networks: [
        mainnet, arbitrum, base, optimism, polygon, bsc,
        avalanche, gnosis, linea, scroll, sonic
      ],
      defaultNetwork: mainnet,
      projectId,
      metadata: {
        name: 'DeFi OS',
        description: '唯讀整理你的 DeFi 持倉與相關市場資訊',
        url: window.location.origin,
        icons: []
      },
      features: { analytics: false }
    })
  }).catch((error) => {
    appKitPromise = null
    throw error
  })

  return appKitPromise
}
