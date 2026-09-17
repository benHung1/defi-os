<script setup lang="ts">
defineProps<{
  product: string
  typeLabel: string
  chain: string
  rateLabel: string
  tvlLabel: string
  sourceLabel: string
  fetchedAtLabel: string
  rateHelp: string
  productUrl?: string
}>()
</script>

<template>
  <li class="row">
    <div class="main">
      <p class="product">{{ product }}</p>
      <p class="meta">
        <span>{{ typeLabel }}</span>
        <span>{{ chain }}</span>
        <span>{{ sourceLabel }}</span>
        <span>更新 {{ fetchedAtLabel }}</span>
      </p>
      <p class="links">
        <a
          v-if="productUrl"
          :href="productUrl"
          target="_blank"
          rel="noopener noreferrer"
        >查看產品 ↗</a>
      </p>
    </div>

    <div class="metrics">
      <p class="rate" :title="rateHelp">{{ rateLabel }} <span aria-hidden="true">ⓘ</span></p>
      <p class="tvl">TVL {{ tvlLabel }}</p>
    </div>
  </li>
</template>

<style scoped>
.row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 22px;
  border-top: 1px solid var(--color-border-subtle);
}

.row:first-child {
  border-top: none;
}

.main {
  min-width: 0;
}

.product {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 10px 0 0;
  font-size: 0.8125rem;
}

.links a {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.links a:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 8px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.metrics {
  flex-shrink: 0;
  text-align: right;
}

.rate {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

.rate span {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-muted);
  cursor: help;
}

.tvl {
  margin: 6px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-body);
}

@media (max-width: 480px) {
  .row {
    flex-direction: column;
    gap: 12px;
  }

  .metrics {
    text-align: left;
  }
}
</style>
