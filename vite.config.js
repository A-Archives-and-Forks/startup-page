import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: "https://timothypholmes.github.io/startup-page/",
  plugins: [
    react(),
  ],
  build: {
    chunkSizeWarningLimit: 1600,
  }
})
