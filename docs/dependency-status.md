# Dependency status

Last reviewed: 2026-11-12. These findings are not suppressed. Run `pnpm audit` and
`pnpm peers check` to check the installed lockfile again.

## Outstanding findings

- **deepmerge 4.3.1:** the [low-severity advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
  had no patched version at review. OpenCloud Web uses it for theme configuration; Office Home
  does not call it directly. The host supplies the shared runtime, so a local dependency update
  would not patch a deployed host. The audit job remains failing.
- **vue3-gettext 4.0.1:** its extraction CLI bundles older glob/matcher code that lockfile
  overrides cannot replace. Office Home does not use that CLI. This finding is outside npm's
  lockfile advisory count.
- **Peer versions:** focus-trap 8 versus focus-trap-vue's 7 range, TypeScript 6 versus federation
  DTS's 4/5 range, and Tiptap table-of-contents 3.33 versus host core/pm 3.31.3 remain unaligned.
  Passing builds do not establish compatibility for every affected path.

At review, the lockfile audit reported one low finding and no critical, high or moderate findings.
That count does not cover bundled dependency code or the running OpenCloud/editor services.

## Dependency maintenance

OpenCloud packages are pinned to 8.2.1 to match the tested host. Overrides in
`pnpm-workspace.yaml` replace vulnerable transitive resolutions. Remove an override when its
parent provides a suitable version, then run `pnpm check:dependencies` and the affected checks.
Coordinate host-owned runtime upgrades with the OpenCloud version in use.
