export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'defi-os-theme'

function getSystemTheme (): Theme {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function resolveTheme (): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      return saved
    }
  } catch {
    // localStorage may be unavailable
  }
  return getSystemTheme()
}

function applyTheme (theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function useTheme () {
  // SSR / first client paint stay in sync to avoid hydration mismatch.
  const theme = useState<Theme>('theme', () => 'light')

  const toggleLabel = computed(() =>
    theme.value === 'dark' ? '切換至淺色模式' : '切換至深色模式'
  )

  function setTheme (next: Theme) {
    theme.value = next
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage may be unavailable
    }
  }

  function toggleTheme () {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  onMounted(() => {
    const resolved = resolveTheme()
    theme.value = resolved
    applyTheme(resolved)
  })

  return {
    theme,
    toggleLabel,
    toggleTheme,
    setTheme
  }
}
