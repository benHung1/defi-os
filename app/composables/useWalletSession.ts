export function useWalletSession() {
  const address = useState<string | null>('wallet-address', () => null)
  const isConnected = computed(() => Boolean(address.value))

  return { address, isConnected }
}
