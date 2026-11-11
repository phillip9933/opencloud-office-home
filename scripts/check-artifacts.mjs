import { readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

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
const directory = process.argv[2] ?? 'dist-spike'
assert(['dist-spike', 'dist-native-test'].includes(directory), 'Unknown artifact scope')
const native = await textTree(directory)
assert(
  !native.includes('synthetic-preview'),
  'Fixture services leaked into the native spike artifact'
)
assert(
  !native.includes('fixture-personal'),
  'Synthetic file catalog leaked into the native spike artifact'
)
assert(
  !native.includes('fixture-templates') && !native.includes('data:image/svg+xml'),
  'Synthetic template folder or drawn previews leaked into the native spike artifact'
)
assert(
  !native.includes('Save configuration') &&
    !native.includes('Shared configuration storage') &&
    !native.includes('office-preview-policy'),
  'Removed administration console or shared settings storage leaked into the native artifact'
)
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`, 'utf8'))
assert.equal(typeof manifest.entrypoint, 'string')
console.log(
  'Native manifest exists; fixture services are excluded. Release remains blocked by DL-001.'
)
