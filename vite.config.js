import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import postcss from './postcss.config.js'


// https://vitejs.dev/config/
export default defineConfig({
  base: "https://timothypholmes.github.io/startup-page/",
  plugins: [
    react(),
  ],
  css: {
    postcss,
  },
  build: {
    chunkSizeWarningLimit: 1600,
  }
})
