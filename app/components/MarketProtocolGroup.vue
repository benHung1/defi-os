<script setup lang="ts">
interface MarketRow {
  key: string
  rank: number
  product: string
  typeLabel: string
  chain: string
  rateLabel: string
  tvlLabel: string
  sourceLabel: string
  fetchedAtLabel: string
  rateHelp: string
  productUrl?: string
}

const props = defineProps<{
  protocol: string
  rows: MarketRow[]
  tvlLabel: string
  sourceLabel: string
  sourceHelp: string
}>()

const PRODUCT_PAGE_SIZE = 5
const visibleCount = ref(PRODUCT_PAGE_SIZE)
const visibleRows = computed(() => props.rows.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < props.rows.length)

watch(() => props.rows, () => { visibleCount.value = PRODUCT_PAGE_SIZE })
</script>

<template>
  <details class="group">
    <summary class="summary">
      <span class="protocol">{{ protocol }}</span>
      <span class="summary-meta">
        <span class="source" :title="sourceHelp">{{ sourceLabel }}</span>
        <span class="tvl">所列 TVL {{ tvlLabel }}</span>
        <span class="count">{{ rows.length }} 個產品</span>
      </span>
      <span class="chevron" aria-hidden="true" />
    </summary>

    <ul class="products">
      <MarketOpportunityRow
        v-for="row in visibleRows"
        :key="row.key"
        :rank="row.rank"
        :product="row.product"
        :type-label="row.typeLabel"
        :chain="row.chain"
        :rate-label="row.rateLabel"
        :tvl-label="row.tvlLabel"
        :source-label="row.sourceLabel"
        :fetched-at-label="row.fetchedAtLabel"
        :rate-help="row.rateHelp"
        :product-url="row.productUrl"
      />
    </ul>
    <button v-if="hasMore" type="button" class="products-more" @click="visibleCount += PRODUCT_PAGE_SIZE">
      再顯示 {{ Math.min(PRODUCT_PAGE_SIZE, rows.length - visibleCount) }} 個產品
    </button>
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

.products-more {
  width: 100%;
  padding: 13px 18px;
  border: 0;
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-surface-soft);
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
}

.products-more:hover { color: var(--color-text-primary); }

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
