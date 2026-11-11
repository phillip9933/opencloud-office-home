# Contributing

Feedback, bug reports and focused pull requests are welcome. Branch from `main`, explain what
changed and how you checked it, and include a regression test for bug fixes. For visible changes,
include screenshots with example data. Discuss larger features in an issue first.

## Run locally

Use Node >=24 and pnpm 11.27.0:

```sh
git clone https://github.com/phillip9933/opencloud-office-home.git
cd opencloud-office-home
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Open the localhost URL printed by Vite. This preview uses sample files and simulated create/open
actions. To connect to real OpenCloud files and an editor, follow the
[installation guide](docs/test-installation.md).

## Checks

```sh
pnpm check
pnpm test:e2e
pnpm build:test-instance
pnpm check:artifacts dist-native-test
pnpm audit
pnpm peers check
```

`pnpm check` runs type checks, lint, formatting, unit tests and build/artifact checks.
Browser tests need the matching Playwright Chromium installation
(`pnpm exec playwright install chromium`). CI runs validation on Node 24 and 26.

On Linux, the optional Bubblewrap runner isolates execution from host credentials and the network:

```sh
OFFICE_PNPM_PACKAGE=/absolute/path/to/pnpm \
  bash scripts/run-isolated.sh pnpm check
```

The pnpm directory must contain `bin/pnpm.mjs`. For browser tests, also set
`OFFICE_BROWSER_EXECUTABLE` to the matching Chromium executable. Install dependencies separately;
the isolated runner has no network access.

The default `pnpm build` remains blocked while release acceptance is incomplete. Use the native
test build above for integration testing. See [compatibility](docs/compatibility.md) and
[dependency status](docs/dependency-status.md) for outstanding limitations.

Keep preview fixtures out of the native app and reuse OpenCloud's account, storage, permission
and editor services. Preserve the [licenses and notices](docs/licensing.md).
Report vulnerabilities privately through [SECURITY.md](SECURITY.md).
