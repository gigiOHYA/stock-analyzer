import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        rewrite: (path) => {
          const [, qs = ''] = path.split('?')
          const params = new URLSearchParams(qs)
          const yahooPath = params.get('path') ?? ''
          params.delete('path')
          return `/${yahooPath}?${params.toString()}`
        },
      },
    },
  },
})
