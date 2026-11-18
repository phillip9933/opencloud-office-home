# Dependency status

Last reviewed: 2026-11-18. Run `pnpm audit` and `pnpm peers check` to check the installed
lockfile again.

## Outstanding findings

- **picomatch 4.0.7:** the lockfile includes this version through Vite, Vitest and other
  development tools. Source maps from a rebuild of the beta show that the shipped JavaScript
  does not contain picomatch. The high-severity advisory lists no patched version.
  [GitHub Advisory Database](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)
- **vue3-gettext 4.0.1:** its extraction CLI bundles older glob/matcher code that lockfile
  overrides cannot replace. Office Home does not use that CLI. This finding is outside npm's
  lockfile advisory count.
- **Peer versions:** focus-trap 8 versus focus-trap-vue's 7 range, TypeScript 6 versus federation
  DTS's 4/5 range, and Tiptap table-of-contents 3.33 versus host core/pm 3.31.3 remain unaligned.
  Passing builds do not establish compatibility for every affected path.

## Audit history

On 2026-11-18, a direct query to the npm Bulk Advisory API for 564 package and version pairs
in the lockfile returned one advisory for picomatch 4.0.7.

The 2026-11-12 `pnpm audit` reported one low-severity finding for deepmerge 4.3.1 and no
critical, high or moderate findings. GitHub withdrew the advisory on 2026-11-16.
[GitHub Advisory Database](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)

Lockfile advisory counts cover dependencies named in the lockfile. Review bundled dependency
code and the installed OpenCloud and editor services separately.

## Dependency maintenance

OpenCloud SDK packages are pinned to 8.2.1. Overrides in
`pnpm-workspace.yaml` replace vulnerable transitive resolutions. Remove an override when its
parent provides a suitable version, then run `pnpm check:dependencies` and the affected checks.
Coordinate host-owned runtime upgrades with the OpenCloud version in use.
