# Office home design

The intended task is to find, create and reopen office files while retaining OpenCloud's identity, storage and editor behavior. Signed-in personal/team use is proposed by the technical guide; audience and project tier remain unconfirmed. The current design is a synthetic local preview, not an approved final interface.

## Screens and journeys

Docs, Sheets and Slides use the same layout: app disclosure navigation, current family heading, folder search, new-file form with visible destination, template starting point, recently opened references, and space/folder browsing. Folder entries remain visible across file-family filtering.

The application menu and native switcher derive from one reviewed descriptor list. Users can reach Files through the native host. Fixture preview labels explain that Files/editor operations are simulations rather than providing a misleading fallback.

Choose a folder before creation. The form shows name, starting point and format. Creation is disabled without a known writable destination or supported format. Repeated activation is locked. A completed create offers an explicit Open created file action; a launch failure retains that resource. Uncertain outcomes pause further creation until reconciliation instead of silently retrying.

Search is folder-scoped in this first preview and debounced. Route changes cancel pending queries. Folder/search views get opaque session keys for Back/Forward and returning to an app; names and query text stay out of URLs. Reload cannot restore memory-only state yet. The release adapter must prove native editor return and proper authenticated lifecycle cleanup.

## Visual system

Use version-matched OpenCloud components and host role tokens (`--oc-role-*`) for foreground, primary, outline and surface colors. The create action uses `OcButton`; the preview registers its required spinner. Local fallback colors keep the standalone preview legible; they are not a second theme policy. Native host dark theme and translations remain pending.

The preview uses a restrained system-font hierarchy, white/surface panels, four-column creation controls above 700px and stacked controls below. Local spacing and widths express these layouts rather than introducing a generic token library. Familiar app navigation follows the host convention; grouping by task reduces the number of choices shown at once. Controls have at least 44px height for comfortable targets.

## States and accessibility

The shell includes loading, empty folder, no search matches, unavailable integration, recoverable error, partial result, disabled mutation and explicit launch feedback. Errors use safe messages; names and labels are plain text. Color is supplementary, never the only indicator of family or access.

The application disclosure uses ordinary links, an expanded-state button, first-link focus on open and Escape focus recovery. Page headings receive focus after navigation. Forms have visible labels, semantic sections and status/error announcements. Focus rings are visible. No custom motion is used.

The target remains WCAG 2.2 AA. Current browser journeys test keyboard disclosure, Back/Forward, canceled searches, text rendering and 390px reflow. Desktop/mobile screenshots support visual review; they are not evidence of accessibility conformance. Full automated accessibility analysis, screen-reader use, 200% text scaling, RTL, long translations and native theme checks remain open. No intended-user usability review has occurred.

## Privacy and flexibility

History is labeled “Recently opened in this browser,” distinct from modified files. The preview states its session-only scope and supports clearing history. No analytics or arbitrary provider URLs are offered. Formats and provider support must be discovered through the native integration rather than implied by a file extension. See [architecture](architecture.md) for data flow and trust boundaries and [development limits](dev-limits.md) for incomplete behavior.

Update this document with reusable interaction changes. Verify screenshots at the chosen breakpoints/themes and record human review separately from agent visual inspection before claiming release quality.
