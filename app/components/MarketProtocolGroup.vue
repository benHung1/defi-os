<script setup lang="ts">
interface MarketRow {
  key: string
  product: string
  typeLabel: string
  chain: string
  rateLabel: string
  tvlLabel: string
  productUrl?: string
  sourceUrl?: string
}

defineProps<{
  protocol: string
  rows: MarketRow[]
}>()
</script>

<template>
  <details class="group">
    <summary class="summary">
      <span class="protocol">{{ protocol }}</span>
      <span class="count">{{ rows.length }} 個產品</span>
      <span class="chevron" aria-hidden="true">⌄</span>
    </summary>

    <ul class="products">
      <MarketOpportunityRow
        v-for="row in rows"
        :key="row.key"
        :product="row.product"
        :type-label="row.typeLabel"
        :chain="row.chain"
        :rate-label="row.rateLabel"
        :tvl-label="row.tvlLabel"
        :product-url="row.productUrl"
        :source-url="row.sourceUrl"
      />
    </ul>
  </details>
</template>

<style scoped>
.group {
  border-top: 1px solid var(--color-border-subtle);
}

.group:first-child {
  border-top: none;
}

.summary {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 18px 22px;
  cursor: pointer;
  list-style: none;
}

.summary::-webkit-details-marker {
  display: none;
}

.summary:hover {
  background: var(--color-surface-soft);
}

.protocol {
  font-size: 1rem;
  font-weight: 650;
  color: var(--color-text-primary);
}

.count {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.chevron {
  color: var(--color-text-muted);
  transition: transform 160ms ease;
}

.group[open] .chevron {
  transform: rotate(180deg);
}

.products {
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-surface-soft);
  list-style: none;
}

@media (max-width: 480px) {
  .summary {
    padding: 16px 18px;
  }
}
</style>
