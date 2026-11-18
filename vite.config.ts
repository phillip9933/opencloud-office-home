import { defineConfig } from '@opencloud-eu/extension-sdk'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  name: pkg.name,
  build: {
    outDir: 'dist',
    license: { fileName: 'DEPENDENCY_LICENSES.txt' }
  }
})
