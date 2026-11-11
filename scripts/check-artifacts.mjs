import { readFile, readdir, stat } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { resolve, sep } from 'node:path'

async function textTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const contents = await Promise.all(
    entries.map((entry) => {
      const path = `${directory}/${entry.name}`
      return entry.isDirectory() ? textTree(path) : readFile(path, 'utf8')
    })
  )
  return contents.join('\n')
}
const directory = 'dist'
const native = await textTree(directory)
assert(!native.includes('synthetic-preview'), 'Fixture services leaked into the native artifact')
assert(
  !native.includes('fixture-personal'),
  'Synthetic file catalog leaked into the native artifact'
)
assert(
  !native.includes('fixture-templates') && !native.includes('data:image/svg+xml'),
  'Synthetic template folder or drawn previews leaked into the native artifact'
)
assert(
  !native.includes('Save configuration') &&
    !native.includes('Shared configuration storage') &&
    !native.includes('office-preview-policy'),
  'Removed administration console or shared settings storage leaked into the native artifact'
)
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`, 'utf8'))
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
assert.equal(manifest.name, pkg.name)
assert.equal(manifest.version, pkg.version)
assert.equal(manifest.license, pkg.license)
assert.equal(typeof manifest.entrypoint, 'string')
const entrypoint = resolve(directory, manifest.entrypoint)
assert(entrypoint.startsWith(resolve(directory) + sep), 'Entrypoint escapes app directory')
assert((await stat(entrypoint)).isFile(), 'Native entrypoint is missing')
assert((await stat(`${directory}/DEPENDENCY_LICENSES.txt`)).size > 0, 'Dependency notices missing')
console.log('Native manifest, entrypoint, version and license verified; fixture services excluded.')
