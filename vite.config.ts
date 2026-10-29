import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiPort = process.env.PORT ?? '8910'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { '/api': `http://localhost:${apiPort}` },
  },
})
