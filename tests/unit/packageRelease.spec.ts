import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { execFileSync, spawnSync } from 'node:child_process'
import { devNull, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { expect, it } from 'vitest'

const packageMetadata = { name: 'office-home', version: '1.2.3-beta.1', license: 'AGPL-3.0-only' }
const manifest = JSON.stringify({ ...packageMetadata, entrypoint: 'js/entry.mjs' })

it('packages the committed source even when dist has a matching version', async () => {
  const checkout = await mkdtemp(join(tmpdir(), 'office-release-'))
  const notes = join(checkout, 'RELEASE_NOTES.md')
  const checkoutOptions = {
    cwd: checkout,
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: devNull,
      GIT_CONFIG_SYSTEM: devNull,
      GITHUB_REF_TYPE: ''
    },
    encoding: 'utf8' as const
  }
  const git = (...args: string[]) => execFileSync('git', args, checkoutOptions)
  const packageRelease = () =>
    spawnSync(process.execPath, ['scripts/package-release.mjs'], checkoutOptions)
  async function put(path: string, content: string, mode?: number) {
    const target = join(checkout, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, { mode })
  }
  try {
    git('init', '--quiet', '--template=')
    for (const path of [
      'scripts/package-release.mjs',
      'scripts/check-artifacts.mjs',
      'scripts/package-zip.py',
      'src/app/identity.ts'
    ]) {
      const target = join(checkout, path)
      await mkdir(dirname(target), { recursive: true })
      await copyFile(resolve(path), target)
    }
    await put('.gitignore', 'dist/\nnode_modules/\nrelease/\n')
    await put('package.json', JSON.stringify(packageMetadata))
    await put('src/entry.mjs', 'export default "committed source"\n')
    await put('RELEASE_NOTES.md', 'Committed release notes\n')
    for (const path of [
      'LICENSE',
      'LICENSE-AGPL-3.0',
      'THIRD_PARTY_NOTICES.md',
      'docs/licensing.md'
    ]) {
      await put(path, 'Packaging test fixture\n')
    }
    git('add', '.')
    git(
      '-c',
      'user.name=Release Fixture',
      '-c',
      'user.email=release@example.invalid',
      'commit',
      '--quiet',
      '-m',
      'Release fixture'
    )
    const revision = git('rev-parse', 'HEAD').trim()
    await put('dist/manifest.json', manifest)
    await put('dist/js/entry.mjs', 'export default "stale build"\n')
    await put('dist/DEPENDENCY_LICENSES.txt', 'Packaging test fixture\n')
    // Stand in for Vite without needing to install dependencies in the disposable checkout.
    await put(
      'node_modules/.bin/vite',
      `#!/usr/bin/env node
const { mkdirSync, copyFileSync, writeFileSync } = require('node:fs')
mkdirSync('dist/js', { recursive: true })
copyFileSync('src/entry.mjs', 'dist/js/entry.mjs')
writeFileSync('dist/manifest.json', ${JSON.stringify(manifest)})
writeFileSync('dist/DEPENDENCY_LICENSES.txt', 'Packaging test fixture')
`,
      0o755
    )
    expect(git('status', '--porcelain')).toBe('')

    const clean = packageRelease()
    expect(clean.status, clean.stderr).toBe(0)
    const [entry, source] = JSON.parse(
      execFileSync(
        'python3',
        [
          '-c',
          'from zipfile import ZipFile; import json, sys; archive = ZipFile(sys.argv[1]); print(json.dumps([archive.read("office-home/" + path).decode() for path in ("js/entry.mjs", "SOURCE.txt")]))',
          `release/${packageMetadata.name}-${packageMetadata.version}.zip`
        ],
        checkoutOptions
      )
    )
    expect(entry).toBe('export default "committed source"\n')
    expect(source).toContain(`Commit: ${revision}\n`)

    await writeFile(notes, 'Uncommitted release notes\n')
    const dirty = packageRelease()
    expect(dirty.status).toBe(1)
    expect(dirty.stderr).toContain('Commit your changes before packaging a release.')
  } finally {
    await rm(checkout, { recursive: true, force: true })
  }
})
