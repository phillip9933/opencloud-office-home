import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Exercise the actual parent resolutions affected by transitive security overrides.
const require = createRequire(import.meta.url)
const from = (parent, name) => createRequire(parent.resolve(name))
const sdk = from(require, '@opencloud-eu/extension-sdk')
const federation = from(sdk, '@module-federation/vite')
const dts = from(federation, '@module-federation/dts-plugin')
const Zip = dts('adm-zip')
const gettext = createRequire(import.meta.resolve('vue3-gettext'))
const { globSync } = gettext('glob')
const eslint = from(require, 'eslint')
const { Minimatch } = eslint('minimatch')

const root = mkdtempSync(join(tmpdir(), 'office-dependency-check-'))
try {
  const archive = new Zip()
  archive.addFile('types/nested/example.d.ts', Buffer.from('export type Example = string\n'))
  // This is the DTS plugin's Buffer -> extractAllTo contract, including nested directories.
  new Zip(archive.toBuffer()).extractAllTo(join(root, 'extracted'), true)
  assert.equal(
    readFileSync(join(root, 'extracted/types/nested/example.d.ts'), 'utf8'),
    'export type Example = string\n'
  )
  mkdirSync(join(root, 'outside'))
  mkdirSync(join(root, 'guarded'))
  symlinkSync(join(root, 'outside'), join(root, 'guarded/types'))
  assert.throws(() => new Zip(archive.toBuffer()).extractAllTo(join(root, 'guarded'), true))
  writeFileSync(join(root, 'extracted/types/ignore.d.ts'), '')
  assert.deepEqual(
    globSync('**/*.d.ts', { cwd: join(root, 'extracted'), ignore: ['**/ignore.d.ts'] }),
    ['types/nested/example.d.ts']
  )
  // ESLint uses both normal and partial-directory matching when walking source trees.
  const matcher = new Minimatch('src/**/*.{ts,vue}', { dot: true })
  assert.equal(matcher.match('src/components', true), true)
  assert.equal(matcher.match('src/components/Home.vue'), true)
  assert.equal(matcher.match('src/components/Home.css'), false)
  const { minimatch } = eslint('minimatch')
  // The host WebDAV dependency uses the same public matchBase contract.
  assert.equal(minimatch('/documents/example.odt', '*.odt', { matchBase: true }), true)
  assert.equal(minimatch('/documents/example.ods', '*.odt', { matchBase: true }), false)
  console.log(
    'Dependency compatibility: archive, symlink boundary, glob and matcher checks passed.'
  )
} finally {
  rmSync(root, { recursive: true, force: true })
}
