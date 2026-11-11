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
configured. The validation jobs use the official Playwright 1.58.2 Noble image pinned by digest, matching the
Playwright package and including browsers/system libraries. This avoids an apt-install dependency
on a hosted Ubuntu mirror that failed DNS resolution in the initial runs. The separate dependency-audit
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

Sensitive findings belong in private reports. Gitleaks 8.30.1 was run offline with full redaction
against the active branch history; it reported no findings across 188 scanned commits. This excludes
archived branches and is not proof of universal absence. Scanner scope and final source results
are recorded with each acceptance run. Neither commercial scanning entitlement
nor remote branch protection has been assumed. The repository owner is responsible for reviewing
CI/audit failures before accepting or releasing a change.

## Static review scope

Offline Semgrep 1.185.0 with official JavaScript, TypeScript and generic rules at revision
`a5ad1714f00c9f7fde980cab0ea1d6dc6d414fd2` inspected application/build source. Vue script blocks were
also extracted without changing line offsets and scanned as TypeScript; Vue templates still rely
on Vue-aware lint, manual output-encoding review and browser checks. Metrics and version checks were
disabled, with network access unavailable during scans. Third-party rules and detailed findings are
kept outside the repository under their own license.

The initial scan reported eleven markup-construction findings in synthetic SVG previews and one
dynamic-action finding. Review found only fixed colors/numeric geometry in the previews (names are
hashed to numbers), and a closed internal action union in the dispatcher. Those are reviewed
hotspots, not suppressed rules or proof of a vulnerability. The separate 18 Vue script blocks had
no findings or parse errors. These checks do not cover the running OpenCloud/Collabora server,
third-party dependency internals, or cross-file authorization semantics.
