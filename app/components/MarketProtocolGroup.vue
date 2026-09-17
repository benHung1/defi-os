<script setup lang="ts">
interface MarketRow {
  key: string
  product: string
  typeLabel: string
  chain: string
  rateLabel: string
  tvlLabel: string
  productUrl?: string
}

defineProps<{
  protocol: string
  rows: MarketRow[]
  tvlLabel: string
  sourceLabel: string
}>()
</script>

<template>
  <details class="group">
    <summary class="summary">
      <span class="protocol">{{ protocol }}</span>
      <span class="summary-meta">
        <span class="source">{{ sourceLabel }}</span>
        <span class="tvl">支援產品 TVL {{ tvlLabel }}</span>
        <span class="count">{{ rows.length }} 個產品</span>
      </span>
      <span class="chevron" aria-hidden="true" />
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

.summary-meta {
  display: flex;
  gap: 14px;
  align-items: center;
}

.tvl {
  font-size: 0.8125rem;
  color: var(--color-text-body);
}

.source {
  padding: 3px 7px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.chevron {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  color: var(--color-text-muted);
}

.chevron::before {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  content: '';
  transform: translateY(-2px) rotate(45deg);
  transition: transform 160ms ease;
}

.group[open] .chevron::before {
  transform: translateY(2px) rotate(225deg);
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

  .summary-meta {
    flex-direction: column;
    gap: 2px;
    align-items: flex-end;
  }
}
</style>
