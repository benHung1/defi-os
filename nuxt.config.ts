import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config

const themeInitScript = `(function(){try{var s=localStorage.getItem('defi-os-theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){}})();`

export default defineNuxtConfig({
  compatibilityDate: '2026-08-05',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/theme.css'],
  runtimeConfig: {
    public: {
      reownProjectId: ''
    }
  },
  vite: {
    resolve: {
      alias: {
        '@noble/hashes': fileURLToPath(new URL('./node_modules/@noble/hashes', import.meta.url))
      }
    }
  },
  vue: {
    compilerOptions: {
      isCustomElement: tag => tag.startsWith('appkit-')
    }
  },
  app: {
    head: {
      script: [
        {
          key: 'defi-os-theme-init',
          textContent: themeInitScript
        }
      ]
    }
  },
  typescript: {
    strict: true
  }
})
