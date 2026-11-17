import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwaShell } from './scripts/pwa-shell'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pwaShell()],
  server: {
    host: true,
    port: 5173
  }
})
