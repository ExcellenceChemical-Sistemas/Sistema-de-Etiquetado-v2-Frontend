import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Tests de la lógica pura (utils y composables sin componentes). No arranca
// Nuxt: lo que un composable toma de los auto-imports se stubbea en cada test.
export default defineConfig({
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['app/**/*.spec.ts'],
  },
})
