<script setup lang="ts">
import type { AppKit } from '@reown/appkit'
import { getReownAppKit } from '../utils/reownAppKit.client'

const projectId = useRuntimeConfig().public.reownProjectId.trim()
const configured = computed(() => Boolean(projectId))
const { address: sessionAddress } = useWalletSession()
const { active: demoActive } = usePortfolioDemo()
const appKit = shallowRef<AppKit | null>(null)
const accountAddress = ref<string | null>(null)
const accountConnected = ref(false)
const loading = ref(false)
const loadFailed = ref(false)
let unsubscribeAccount: (() => void) | null = null

interface WalletAccountState { isConnected: boolean, address?: string }

function syncAccount (account?: WalletAccountState): void {
  accountConnected.value = account?.isConnected ?? false
  accountAddress.value = account?.address ?? null
  sessionAddress.value = account?.isConnected ? account.address ?? null : null
}

async function initializeWallet (): Promise<AppKit | null> {
  if (!configured.value || appKit.value) return appKit.value
  loading.value = true
  loadFailed.value = false
  try {
    const instance = await getReownAppKit(projectId)
    appKit.value = instance
    syncAccount(instance.getAccount('eip155'))
    unsubscribeAccount = instance.subscribeAccount(syncAccount, 'eip155')
    return instance
  } catch {
    loadFailed.value = true
    return null
  } finally {
    loading.value = false
  }
}

onMounted(() => { void initializeWallet() })
onBeforeUnmount(() => unsubscribeAccount?.())

const buttonLabel = computed(() => {
  if (demoActive.value) return '開發測試部位'
  if (loading.value) return '錢包載入中'
  if (loadFailed.value) return '重試錢包連線'
  if (!accountConnected.value || !accountAddress.value) return '連接錢包'
  return `${accountAddress.value.slice(0, 6)}…${accountAddress.value.slice(-4)}`
})

async function openWalletPanel() {
  const instance = await initializeWallet()
  if (!instance) return
  await instance.open({
    view: accountConnected.value ? 'Account' : 'Connect',
    namespace: 'eip155'
  })
}
</script>

<template>
  <div class="wallet-connect">
    <button v-if="demoActive" type="button" class="demo-button" disabled>
      <span class="wallet-dot" aria-hidden="true" />
      {{ buttonLabel }}
    </button>
    <button v-else-if="configured" type="button" class="connect-button" :disabled="loading" :aria-busy="loading" @click="openWalletPanel">
      <span class="wallet-dot" aria-hidden="true" />
      {{ buttonLabel }}
    </button>
    <button v-else type="button" class="setup-button" disabled>錢包連線待設定</button>
    <p>
      <span class="read-only-dot" aria-hidden="true" />
      唯讀連線，只取得公開地址；不要求交易、Token Approval 或簽名。
    </p>
  </div>
</template>

<style scoped>
.wallet-connect { display: flex; flex-direction: column; gap: 7px; align-items: flex-end; }
.wallet-connect p { display: flex; gap: 6px; align-items: center; margin: 0; font-size: .75rem; color: var(--color-text-muted); }
.read-only-dot { width: 6px; height: 6px; border-radius: 50%; background: #168f87; }
.connect-button { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border: 1px solid #268f88; border-radius: 10px; background: #168f87; color: #fff; font: inherit; font-size: .8125rem; font-weight: 700; cursor: pointer; }
.connect-button:hover { background: #117a74; }
.demo-button { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border: 1px solid #a56813; border-radius: 10px; background: color-mix(in srgb, #a56813 12%, var(--color-surface)); color: #b7791f; font: inherit; font-size: .8125rem; font-weight: 700; }
.connect-button:focus-visible { outline: 3px solid color-mix(in srgb, #168f87 35%, transparent); outline-offset: 2px; }
.wallet-dot { width: 7px; height: 7px; border: 2px solid currentColor; border-radius: 50%; }
.setup-button { padding: 9px 14px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); color: var(--color-text-muted); font: inherit; font-size: .8125rem; }
@media (max-width: 600px) {
  .wallet-connect { align-items: flex-start; }
  .wallet-connect p { max-width: 290px; line-height: 1.45; }
}
</style>
