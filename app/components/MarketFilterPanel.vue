<script setup lang="ts">
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const open = ref(false)

type MarketChain = 'ethereum' | 'base' | 'arbitrum'
type MarketAsset = 'USDC' | 'USDT' | 'ETH' | 'BTC'

const props = defineProps<{ chains: MarketChain[], assets: MarketAsset[] }>()
const emit = defineEmits<{ change: [scope: { chains: MarketChain[], assets: MarketAsset[] }] }>()

function close (): void { open.value = false }
function onDocumentPointerDown (event: PointerEvent): void {
  const target = event.target as Node
  if (open.value && !trigger.value?.contains(target) && !panel.value?.contains(target)) close()
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

interface ChainOption { value: MarketChain, label: string, symbol: string, tone: string }
const chainOptions: ChainOption[] = [
  { value: 'ethereum', label: 'Ethereum', symbol: 'Ξ', tone: 'ethereum' },
  { value: 'arbitrum', label: 'Arbitrum', symbol: 'A', tone: 'arbitrum' },
  { value: 'base', label: 'Base', symbol: 'B', tone: 'base' }
]
const chainGroups: Array<{ label: string, items: ChainOption[] }> = [
  { label: 'L1 Networks', items: [
    chainOptions[0]!
  ] },
  { label: 'L2 Networks', items: [
    chainOptions[1]!, chainOptions[2]!
  ] }
]
const assetOptions = [
  { value: 'USDC' as const, label: 'USDC', symbol: '$', tone: 'usdc' },
  { value: 'USDT' as const, label: 'USDT', symbol: '₮', tone: 'usdt' },
  { value: 'ETH' as const, label: 'ETH', symbol: 'Ξ', tone: 'ethereum' },
  { value: 'BTC' as const, label: 'BTC', symbol: '₿', tone: 'btc' }
]

const availableAssets: Record<MarketChain, MarketAsset[]> = {
  ethereum: ['USDC', 'USDT', 'ETH', 'BTC'],
  base: ['USDC', 'ETH', 'BTC'],
  arbitrum: ['USDC', 'USDT', 'ETH', 'BTC']
}

const scopeLabel = computed(() => {
  if (props.chains.length === 1 && props.assets.length === 1) {
    const chain = chainOptions.find(item => item.value === props.chains[0])?.label ?? props.chains[0]
    return `${chain} · ${props.assets[0]}`
  }
  return `${props.chains.length} 條鏈 · ${props.assets.length} 種資產`
})

const selectableAssets = computed(() => new Set(props.chains.flatMap(chain => availableAssets[chain])))

function toggleChain (chain: MarketChain): void {
  const selected = props.chains.includes(chain)
  if (selected && props.chains.length === 1) return
  const chains = selected ? props.chains.filter(item => item !== chain) : [...props.chains, chain]
  const supportedAssets = new Set(chains.flatMap(item => availableAssets[item]))
  const assets = props.assets.filter(asset => supportedAssets.has(asset))
  emit('change', { chains, assets: assets.length > 0 ? assets : ['USDC'] })
}

function toggleAsset (asset: MarketAsset): void {
  if (!selectableAssets.value.has(asset)) return
  const selected = props.assets.includes(asset)
  if (selected && props.assets.length === 1) return
  emit('change', {
    chains: props.chains,
    assets: selected ? props.assets.filter(item => item !== asset) : [...props.assets, asset]
  })
}
</script>

<template>
  <div class="filter-picker">
    <button ref="trigger" type="button" class="trigger" :aria-expanded="open" aria-haspopup="dialog" @click="open = !open">
      <span class="scope-icon">Ξ</span>
      <span><strong>{{ scopeLabel }}</strong><small>可複選鏈與資產</small></span>
      <span class="summary-chevron" :class="{ open }" aria-hidden="true" />
    </button>

    <div v-if="open" ref="panel" class="panel" role="dialog" aria-label="選擇市場範圍">
      <div class="panel-head">
        <div><strong>市場範圍</strong><small>目前只顯示已接通的真實資料</small></div>
        <button type="button" class="close" aria-label="關閉市場篩選" @click="close">×</button>
      </div>

      <section v-for="group in chainGroups" :key="group.label">
        <p>{{ group.label }}</p>
        <div class="option-grid">
          <button v-for="item in group.items" :key="item.value" type="button" class="option" :class="{ selected: chains.includes(item.value) }" @click="toggleChain(item.value)">
            <i :class="item.tone">{{ item.symbol }}</i>
            <span><strong>{{ item.label }}</strong></span>
            <b v-if="chains.includes(item.value)" aria-label="已選擇">✓</b>
          </button>
        </div>
      </section>

      <section>
        <p>Assets</p>
        <div class="option-grid">
          <button v-for="item in assetOptions" :key="item.value" type="button" class="option" :class="{ selected: props.assets.includes(item.value) }" :disabled="!selectableAssets.has(item.value)" @click="toggleAsset(item.value)">
            <i :class="item.tone">{{ item.symbol }}</i>
            <span><strong>{{ item.label }}</strong><small v-if="!selectableAssets.has(item.value)">所選鏈未支援</small></span>
            <b v-if="props.assets.includes(item.value)" aria-label="已選擇">✓</b>
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
.ethereum { --coin: #627eea; } .arbitrum { --coin: #2d8bd3; } .base { --coin: #1769ff; } .usdc { --coin: #2775ca; } .usdt { --coin: #26a17b; } .btc { --coin: #f7931a; }
@media (max-width: 600px) { .panel { width: calc(100vw - 32px); } .option-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
