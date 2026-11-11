# Preliminary spike assumptions

Status: provisional, not user-approved production policy.

The technical guide permits starting the compatibility spike before final choices. The original source directory was empty, and no deployed OpenCloud baseline or credentials are available. One TypeScript/Vue package, three routes and shared typed services provide the smallest useful local foundation. A synthetic preview permits failure/navigation testing; the native adapter stays unavailable and default release builds fail.

Provisional defaults from guide section 15:

- Match the actual OpenCloud/Web deployment before implementation is pinned; use one Collabora reference deployment first. Euro-Office needs an independent community-support matrix.
- Create ODT, ODS and ODP initially; open tested Microsoft formats. Prefer DOCX/XLSX/PPTX defaults only if external Office exchange is selected as the priority.
- Use administrator-managed read-only template folders; defer user-template management.
- Use a verified upstream recent-access source if one exists; otherwise clearly label browser-local history. No custom history backend is justified yet.
- Allow only reviewed installed app integrations; no arbitrary remote URLs, modules or user-installable code.
- Preserve native sharing; defer specialized anonymous office home screens.
- The initial license deferral is superseded: Office Home code is AGPL-3.0-only, with the imported
  Apache-2.0 skeleton preserved. See [licensing](../licensing.md).
- Redirect friendly aliases to the existing canonical host only after domains, router and proxy are verified.

The SDK baseline follows the observed test deployment (Web 8.2.1, previously 8.0.0); it is not a decision that every deployment must use that release. Alternatives include matching a different installed release or starting from a release-matched skeleton once available. Tradeoff: local contracts can be tested now, but no create/edit/save or permission compatibility claim follows from those passes.
