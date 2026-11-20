import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps all asset paths relative, so the app works under
// https://<user>.github.io/Vinyl-Collector/ without hard-coding the repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
  // shown in the settings, so a test on the phone can tell which version is running
  define: { __BUILD__: JSON.stringify(new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' })) },
})
