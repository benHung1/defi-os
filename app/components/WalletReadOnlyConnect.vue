<script setup lang="ts">
const configured = computed(() => Boolean(useRuntimeConfig().public.reownProjectId.trim()))
</script>

<template>
  <div class="wallet-connect">
    <appkit-button v-if="configured" balance="hide" />
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
.setup-button { padding: 9px 14px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); color: var(--color-text-muted); font: inherit; font-size: .8125rem; }
@media (max-width: 600px) {
  .wallet-connect { align-items: flex-start; }
  .wallet-connect p { max-width: 290px; line-height: 1.45; }
}
</style>
