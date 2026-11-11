# Upstream foundation

This repository is a clone of `https://github.com/opencloud-eu/web-app-skeleton.git`, based on commit `77f3194743046cf36ac567f7f241b5f33450df14`. The upstream history is preserved, rather than reconstructed as a new root commit. The `upstream` remote identifies that repository. Application changes are made on a separate development branch.

The project retains the starter's pnpm 11.27.0 package-manager declaration, pnpm lockfile, shared OpenCloud lint/format/TypeScript packages, extension SDK build configuration, Renovate configuration and original license. The office application code, tests and documentation were ported onto that foundation. The placeholder Hello screen is replaced by the office home screens; the starter's placeholder test is replaced by an application-registration check.

Project-specific changes are deliberate:

- Package name `web-app-office` follows the upstream extension naming convention; the native application ID remains `office`.
- Strict null checks and unknown catch variables are enabled on top of the shared TypeScript configuration. `vite/client` supplies CSS import types required by the current compiler.
- Lint uses the shared OpenCloud configuration, with existing strict application checks retained. No application-specific lint rule is disabled to pass the migration.
- Playwright and standalone preview configuration preserve the local UI testing workflow; fixtures remain separate from the native entrypoint.
- Pnpm uses a project-local store, disabled install scripts and error-on-stale-dependencies behavior for reproducible isolated checks.
- The skeleton's Docker example is adapted into an explicitly selected disposable development profile under `dev/`, with a required pinned image, required disposable password and loopback-only binding. It is never started automatically and is not a production or office-server installer.
- The native release-build block remains until real integration, licensing and security gates pass.

The development toolchain is the starter's OpenCloud SDK 8.x baseline. A deployment compatibility claim still requires a matching server/Web/editor inventory and live acceptance evidence. The native catalog is connected through Web 8.2.1 services in the controlled test build; see
[compatibility](compatibility.md) for the installed revision, observed workflows and remaining limits.

For an eventual contribution to `opencloud-eu/web-extensions`, follow that repository's own instructions and package layout in a separate contribution checkout. Retaining skeleton history does not itself establish upstream acceptance or permission to publish. Private local guidance and user-specific material do not belong in an upstream contribution.
