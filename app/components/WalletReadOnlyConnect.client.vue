<script setup lang="ts">
import { useAppKit, useAppKitAccount } from '@reown/appkit/vue'

const configured = computed(() => Boolean(useRuntimeConfig().public.reownProjectId.trim()))
const { open } = useAppKit()
const account = useAppKitAccount({ namespace: 'eip155' })
const { address: sessionAddress } = useWalletSession()

watchEffect(() => {
  sessionAddress.value = account.value.isConnected ? account.value.address ?? null : null
})

const buttonLabel = computed(() => {
  const { address, isConnected } = account.value
  if (!isConnected || !address) return '連接錢包'
  return `${address.slice(0, 6)}…${address.slice(-4)}`
})

function openWalletPanel() {
  void open({
    view: account.value.isConnected ? 'Account' : 'Connect',
    namespace: 'eip155'
  })
}
</script>

<template>
  <div class="wallet-connect">
    <button v-if="configured" type="button" class="connect-button" @click="openWalletPanel">
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
.connect-button:focus-visible { outline: 3px solid color-mix(in srgb, #168f87 35%, transparent); outline-offset: 2px; }
.wallet-dot { width: 7px; height: 7px; border: 2px solid currentColor; border-radius: 50%; }
.setup-button { padding: 9px 14px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); color: var(--color-text-muted); font: inherit; font-size: .8125rem; }
@media (max-width: 600px) {
  .wallet-connect { align-items: flex-start; }
  .wallet-connect p { max-width: 290px; line-height: 1.45; }
}
</style>
