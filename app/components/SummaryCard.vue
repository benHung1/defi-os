<script setup lang="ts">
defineProps<{
  label: string
  value: string
  note: string
}>()
</script>

<template>
  <article class="card">
    <p class="label">{{ label }}</p>
    <p class="value">{{ value }}</p>
    <p class="note">{{ note }}</p>
  </article>
</template>

<style scoped>
.card {
  padding: 20px 22px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
}

.label {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.value {
  margin: 10px 0 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

.note {
  margin: 8px 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}
</style>
