import { PORTFOLIO_DEMO_ADDRESS } from '../utils/portfolioDemo'

export function useWalletSession() {
  const liveAddress = useState<string | null>('wallet-address', () => null)
  const { active: demoActive } = usePortfolioDemo()
  const address = computed<string | null>({
    get: () => demoActive.value ? PORTFOLIO_DEMO_ADDRESS : liveAddress.value,
    set: value => { liveAddress.value = value }
  })
  const isConnected = computed(() => Boolean(address.value))

  return { address, isConnected }
}
