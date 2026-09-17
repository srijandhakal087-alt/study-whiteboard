import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves this repository from a subpath. Keep relative URLs for
  // the normal production build so Electron can continue loading dist locally.
  base: mode === 'github-pages' ? '/study-whiteboard/' : './',
  plugins: [react()],
}))
