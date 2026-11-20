import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises'
import { resolve } from 'node:path'
import { officeAppId } from '../src/app/identity.ts'

const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
  encoding: 'utf8'
}).trim()
assert(!status, 'Commit your changes before packaging a release.')
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const repository = 'https://github.com/phillip9933/opencloud-office-home'
const output = 'release'

// Only allow installable assets, never source, local configuration or development servers.
async function checkPayload(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`
    assert(/^[A-Za-z0-9_.-]+$/.test(entry.name), `Unexpected asset name: ${path}`)
    assert(!entry.isSymbolicLink(), `Unexpected symlink: ${path}`)
    if (entry.isDirectory()) {
      assert(['js', 'assets'].includes(entry.name), `Unexpected asset directory: ${path}`)
      await checkPayload(path)
    } else {
      assert(entry.isFile(), `Unexpected asset type: ${path}`)
      assert(
        /\.(?:mjs|js|css)$/.test(entry.name) ||
          ['manifest.json', 'DEPENDENCY_LICENSES.txt'].includes(entry.name),
        `Unexpected asset: ${path}`
      )
    }
  }
}
await mkdir(output, { recursive: true })
const work = await mkdtemp(resolve(output, '.package-'))
const source = `${work}/source`
const stage = `${work}/${officeAppId}`
try {
  // Build only the committed tree. Git-ignored Vite inputs and old dist files stay outside it.
  await mkdir(source)
  const sourceArchive = `${work}/source.tar`
  execFileSync('git', ['archive', '--format=tar', `--output=${sourceArchive}`, revision])
  execFileSync('tar', ['-xf', sourceArchive, '-C', source])
  const pkg = JSON.parse(await readFile(`${source}/package.json`, 'utf8'))
  assert(/^\d+\.\d+\.\d+(?:-beta\.\d+)?$/.test(pkg.version), 'Invalid release version')
  if (process.env.GITHUB_REF_TYPE === 'tag') {
    assert.equal(process.env.GITHUB_REF_NAME, `v${pkg.version}`)
  }
  await symlink(resolve('node_modules'), `${source}/node_modules`, 'dir')
  // The pnpm shim supplies the module search path for federation's shared dependencies.
  execFileSync(resolve('node_modules/.bin/vite'), ['build'], {
    cwd: source,
    stdio: 'inherit'
  })
  execFileSync(process.execPath, ['scripts/check-artifacts.mjs'], { cwd: source, stdio: 'inherit' })
  await checkPayload(`${source}/dist`)

  const archive = `${officeAppId}-${pkg.version}.zip`
  const timestamp = execFileSync('git', ['show', '-s', '--format=%ct', revision], {
    encoding: 'utf8'
  }).trim()
  await cp(`${source}/dist`, stage, { recursive: true })
  for (const name of ['LICENSE', 'LICENSE-AGPL-3.0', 'THIRD_PARTY_NOTICES.md']) {
    await cp(`${source}/${name}`, `${stage}/${name}`)
  }
  await mkdir(`${stage}/docs`)
  await cp(`${source}/docs/licensing.md`, `${stage}/docs/licensing.md`)
  await writeFile(
    `${stage}/SOURCE.txt`,
    `Office Home ${pkg.version}\nCommit: ${revision}\nSource: ${repository}/tree/${revision}\n` +
      `Source archive: ${repository}/archive/${revision}.tar.gz\n` +
      'Build: pnpm install --frozen-lockfile --ignore-scripts && pnpm build\n' +
      `Installation: ${repository}/blob/${revision}/docs/installation.md\n`
  )
  execFileSync('python3', ['scripts/package-zip.py', stage, `${work}/${archive}`, timestamp], {
    stdio: 'inherit'
  })
  const digest = createHash('sha256')
    .update(await readFile(`${work}/${archive}`))
    .digest('hex')
  await writeFile(`${work}/SHA256SUMS`, `${digest}  ${archive}\n`)
  await cp(`${source}/RELEASE_NOTES.md`, `${work}/RELEASE_NOTES.md`)
  for (const file of [archive, 'RELEASE_NOTES.md', 'SHA256SUMS']) {
    await rename(`${work}/${file}`, `${output}/${file}`)
  }
  console.log(`Packaged ${archive} with licenses, source reference and SHA-256 checksum.`)
} finally {
  await rm(work, { recursive: true, force: true })
}
