<script setup lang="ts">
const root = ref<HTMLElement | null>(null)
const open = ref(false)

function close (): void { open.value = false }
function onDocumentPointerDown (event: PointerEvent): void {
  if (open.value && root.value && !root.value.contains(event.target as Node)) close()
}
function onDocumentKeyDown (event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeyDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeyDown)
})

const chains = [
  { label: 'Ethereum', symbol: 'Ξ', selected: true, available: true, tone: 'ethereum' },
  { label: 'Arbitrum', symbol: 'A', selected: false, available: false, tone: 'arbitrum' },
  { label: 'Base', symbol: 'B', selected: false, available: false, tone: 'base' }
]
const assets = [
  { label: 'USDC', symbol: '$', selected: true, available: true, tone: 'usdc' },
  { label: 'USDT', symbol: '₮', selected: false, available: false, tone: 'usdt' },
  { label: 'DAI', symbol: 'D', selected: false, available: false, tone: 'dai' },
  { label: 'USDS', symbol: 'S', selected: false, available: false, tone: 'usds' }
]
</script>

<template>
  <div ref="root" class="filter-picker">
    <button type="button" class="trigger" :aria-expanded="open" aria-haspopup="dialog" @click="open = !open">
      <span class="scope-icon">Ξ</span>
      <span><strong>Ethereum · USDC</strong><small>選擇鏈與穩定幣</small></span>
      <span class="summary-chevron" :class="{ open }" aria-hidden="true" />
    </button>

    <div v-if="open" class="panel" role="dialog" aria-label="選擇市場範圍">
      <div class="panel-head">
        <div><strong>市場範圍</strong><small>目前只顯示已接通的真實資料</small></div>
        <button type="button" class="close" aria-label="關閉市場篩選" @click="close">×</button>
      </div>

      <section>
        <p>選擇鏈</p>
        <div class="option-grid">
          <button v-for="item in chains" :key="item.label" type="button" class="option" :class="{ selected: item.selected }" :disabled="!item.available">
            <i :class="item.tone">{{ item.symbol }}</i>
            <span><strong>{{ item.label }}</strong><small v-if="!item.available">即將支援</small></span>
            <b v-if="item.selected" aria-label="已選擇">✓</b>
          </button>
        </div>
      </section>

      <section>
        <p>選擇穩定幣</p>
        <div class="option-grid">
          <button v-for="item in assets" :key="item.label" type="button" class="option" :class="{ selected: item.selected }" :disabled="!item.available">
            <i :class="item.tone">{{ item.symbol }}</i>
            <span><strong>{{ item.label }}</strong><small v-if="!item.available">即將支援</small></span>
            <b v-if="item.selected" aria-label="已選擇">✓</b>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.filter-picker { position: relative; margin-top: 16px; }
.trigger { display: inline-flex; gap: 10px; align-items: center; min-width: 270px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); color: var(--color-text-body); cursor: pointer; text-align: left; }
.trigger > span:nth-child(2) { display: grid; flex: 1; }
.trigger strong, .panel strong { color: var(--color-text-primary); }
.trigger small, .panel small { display: block; margin-top: 2px; font-size: .72rem; font-weight: 400; color: var(--color-text-muted); }
.scope-icon { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: #627eea; color: white; }
.summary-chevron { width: 7px; height: 7px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(45deg); transition: transform 160ms ease; }
.summary-chevron.open { transform: rotate(225deg); }
.panel { position: absolute; z-index: 20; top: calc(100% + 8px); left: 0; width: min(620px, calc(100vw - 48px)); border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); box-shadow: 0 20px 50px rgb(0 0 0 / 20%); overflow: hidden; }
.panel-head { display: flex; align-items: center; justify-content: space-between; padding: 15px 18px; }
.panel-head > div { display: grid; }
.close { width: 30px; height: 30px; border: 0; border-radius: 8px; background: transparent; color: var(--color-text-muted); cursor: pointer; font-size: 1.25rem; }
.close:hover { background: var(--color-surface-soft); color: var(--color-text-primary); }
section { padding: 13px 18px 17px; border-top: 1px solid var(--color-border-subtle); }
section > p { margin: 0 0 9px; font-size: .75rem; color: var(--color-text-muted); }
.option-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.option { display: grid; grid-template-columns: auto 1fr auto; gap: 9px; align-items: center; min-width: 0; padding: 11px; border: 1px solid transparent; border-radius: 10px; background: transparent; font: inherit; text-align: left; color: var(--color-text-body); }
.option.selected { border-color: #627eea; background: color-mix(in srgb, #627eea 13%, transparent); }
.option:disabled:not(.selected) { opacity: .48; }
.option i { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 50%; background: var(--coin); color: white; font-style: normal; font-size: .75rem; }
.option span { min-width: 0; }
.option b { color: #627eea; }
.ethereum { --coin: #627eea; } .arbitrum { --coin: #2d8bd3; } .base { --coin: #1769ff; } .usdc { --coin: #2775ca; } .usdt { --coin: #26a17b; } .dai { --coin: #f5ac37; } .usds { --coin: #7764e4; }
@media (max-width: 600px) { .panel { width: calc(100vw - 32px); } .option-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
