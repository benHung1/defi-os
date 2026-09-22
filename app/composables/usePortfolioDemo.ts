import { isPortfolioDemoScenario } from '../utils/portfolioDemo'

export function usePortfolioDemo() {
  const route = useRoute()
  const active = computed(() => isPortfolioDemoScenario(route.query.demoPortfolio))
  return { active }
}
