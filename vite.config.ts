import { defineConfig } from '@opencloud-eu/extension-sdk'

export default defineConfig({
  name: 'web-app-office',
  build: {
    outDir: 'dist',
    license: { fileName: 'DEPENDENCY_LICENSES.txt' }
  }
})
