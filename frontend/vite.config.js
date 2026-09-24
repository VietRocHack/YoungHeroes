import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Local dev only — production talks to the backend via a relative
    // /api/... path, rewritten to Cloud Run by Firebase Hosting. See
    // docs/runbook.md for running a local backend on :8080.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true, // needed for /api/call/{callId}/live's WebSocket
      },
    },
  },
})
