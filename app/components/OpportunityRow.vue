<script setup lang="ts">
defineProps<{
  protocol: string
  aprLabel: string
  tvlLabel: string
  riskLabel: string
  isCurrent: boolean
  aprDiffLabel: string
  annualDiffLabel: string | null
}>()
</script>

<template>
  <li
    class="row"
    :class="{ current: isCurrent }"
  >
    <div class="main">
      <div class="title-line">
        <p class="protocol">{{ protocol }}</p>
        <span
          v-if="isCurrent"
          class="badge"
        >目前部位</span>
      </div>
      <p class="meta">
        <span>TVL {{ tvlLabel }}</span>
        <span>{{ riskLabel }}</span>
      </p>
    </div>

    <div class="metrics">
      <p class="apr">{{ aprLabel }}</p>
      <p class="diff">{{ aprDiffLabel }}</p>
      <p
        v-if="annualDiffLabel"
        class="annual"
      >
        {{ annualDiffLabel }}
      </p>
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

.row.current {
  border-left: 3px solid var(--color-status-healthy);
}

.main {
  min-width: 0;
}

.title-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.protocol {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.badge {
  padding: 3px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
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

.apr {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

.diff {
  margin: 6px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-body);
}

.annual {
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
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
