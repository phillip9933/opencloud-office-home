# Contributing

Office Home is a developer prototype. Feedback on the document-start workflow, template selection
and the boundary between a separate app and OpenCloud Files is especially useful. Discuss larger
features in an issue before building them. This repository is not an official OpenCloud component;
an upstream contribution would be reviewed separately by its maintainers.

## Start here

- [README](README.md): local preview, requirements and commands.
- [Architecture](docs/architecture.md): feature map, module boundaries and data ownership.
- [Design](docs/design.md): interaction and accessibility conventions.
- [Compatibility](docs/compatibility.md): tested baseline and remaining acceptance.
- [Configuration](docs/configuration.md): administrator-owned installation options.

The default branch is `main`. Branch from it and keep a pull request focused on one behavior or
problem. Explain the change, verification and any remaining limitation. Include a regression test
for a bug fix, and screenshots with synthetic data for a visible UI change.

## Local checks

Use the pinned pnpm version and a disposable environment as described in the README. Install with
`pnpm install --frozen-lockfile --ignore-scripts`. Run `pnpm check` for types, lint, formatting,
unit tests and build/artifact checks. Run `pnpm test:e2e` for affected UI workflows with the matching
Playwright browser. For native integration changes also run `pnpm build:test-instance` and
`pnpm check:artifacts dist-native-test` against the pinned OpenCloud baseline.

The default `pnpm build` deliberately rejects a production release while acceptance is incomplete.
The dependency audit and peer check currently report documented upstream findings; see
[dependency status](docs/dependency-status.md). Report these results accurately. Do not suppress
findings, weaken tests or remove the release gate to make a check pass.

## Keep changes focused

Reuse OpenCloud's native account, storage, permission and editor services. Keep version-specific
host calls in the adapters and preview fixtures out of the native entrypoint. Do not add credentials,
real documents, private deployment settings, generated builds or browser artifacts to commits.
Report security issues through [SECURITY.md](SECURITY.md), not a public issue.

Contributions must preserve the existing third-party notices and be compatible with the project's
[licensing](docs/licensing.md). No contributor agreement or automatic upstream acceptance is implied.
