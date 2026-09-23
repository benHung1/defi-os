import { getPortfolioDemoScenario } from '../utils/portfolioDemo'

export function usePortfolioDemo() {
  const route = useRoute()
  const scenario = computed(() => getPortfolioDemoScenario(route.query.demoPortfolio))
  const active = computed(() => scenario.value !== null)
  return { active, scenario }
}
