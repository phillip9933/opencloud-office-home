# Validation

Run the following in a disposable environment without production credentials. Frozen installation
must use `pnpm install --frozen-lockfile --ignore-scripts` with pnpm 11.27.0.

```sh
pnpm check
pnpm build:test-instance
pnpm check:artifacts dist-native-test
pnpm test:e2e
pnpm audit
```

`pnpm check` includes strict types, lint, formatting, units, spike/preview builds and native fixture
exclusion. Browser tests additionally need the matching Playwright Chromium; a reviewed local binary
can be supplied with `OFFICE_BROWSER_EXECUTABLE`. They use synthetic data and temporary profiles.
The Linux Bubblewrap wrapper documented in the README removes home/credentials and network access.
`pnpm build` is separately expected to reject a release while DL-001 is open.

`.github/workflows/validate.yml` runs the same checks on disposable GitHub Ubuntu runners with Node
24 and 26. Action revisions are immutable, token permissions are read-only, checkout credentials
are not retained, lifecycle scripts are disabled, and no deployment or publishing credentials are
configured. Browser installation downloads public Playwright binaries. The separate dependency-audit
job submits dependency names/versions to npm; it does not upload application source. Existing
advisories intentionally leave that job failing until resolved. No ignore list or accepted-risk
exception has been added. Branch protections and required checks have not been changed.

CI has a 20-minute validation timeout and 10-minute audit timeout to bound setup/network failures;
these are provisional job ceilings, not performance targets. Local tests are much shorter, but a
hosted-runner baseline must be measured before making performance or Node 24 compatibility claims.
A workflow file does not prove its jobs have run successfully.

The axe Playwright dependency is test-only (MPL-2.0, official Deque package). It checks the home,
creation form, folder dialog and settings in light/dark mobile layouts using WCAG A/AA rules.
No violations are suppressed. Keyboard journeys and 200% text/reflow checks complement it; manual
screen-reader and real-host testing remain necessary.

Sensitive findings belong in private reports. Available local pattern checks are bounded and are
not substitutes for a full secret/history scan or SAST. Neither commercial scanning entitlement
nor remote branch protection has been assumed. The repository owner is responsible for reviewing
CI/audit failures before accepting or releasing a change.
