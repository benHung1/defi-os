<script setup lang="ts">
defineProps<{
  protocol: string
  product: string
  typeLabel: string
  chain: string
  rateLabel: string
  tvlLabel: string
}>()
</script>

<template>
  <li class="row">
    <div class="main">
      <p class="protocol">{{ protocol }}</p>
      <p class="product">{{ product }}</p>
      <p class="meta">
        <span>{{ typeLabel }}</span>
        <span>{{ chain }}</span>
      </p>
    </div>

    <div class="metrics">
      <p class="rate">{{ rateLabel }}</p>
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

.protocol {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.product {
  margin: 6px 0 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
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
