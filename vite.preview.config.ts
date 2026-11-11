import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

// OpenCloud Web serves the design system's icons at /icons; the preview serves only the ones
// this app uses, from the installed design-system package.
const ICONS = [
  'arrow-up-line',
  'arrow-right-s-line',
  'close-line',
  'folder-line',
  'gallery-view-2',
  'layout-column-line',
  'file-text-line',
  'group-line',
  'information-line',
  'list-unordered',
  'lock-line',
  'more-2-fill',
  'price-tag-3-line',
  'settings-4-line',
  'star-fill',
  'star-line'
]
const iconDirectory = resolve('node_modules/@opencloud-eu/design-system/dist/icons')
const iconFile = (name: string) => readFileSync(resolve(iconDirectory, `${name}.svg`))

function openCloudIcons(): Plugin {
  return {
    name: 'office-preview-icons',
    configureServer(server) {
      server.middlewares.use('/icons', (request, response, next) => {
        const name = request.url?.replace(/^\//, '').replace(/\.svg(\?.*)?$/, '')
        if (!name || !ICONS.includes(name)) return next()
        response.setHeader('Content-Type', 'image/svg+xml')
        response.end(iconFile(name))
      })
    },
    generateBundle() {
      for (const name of ICONS)
        this.emitFile({ type: 'asset', fileName: `icons/${name}.svg`, source: iconFile(name) })
    }
  }
}

export default defineConfig({
  plugins: [vue(), openCloudIcons()],
  build: { outDir: 'dist-preview' }
})
