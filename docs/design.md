# Office home design

The intended task is to find, create and reopen office files while retaining OpenCloud's identity, storage and editor behavior. Signed-in personal/team use is proposed by the technical guide; audience and project tier remain unconfirmed. The shell is available in a synthetic preview and a native test integration; it is not an approved final interface.

## Screens and journeys

Docs, Sheets and Slides share one quiet layout, top to bottom:

1. **Navigation:** the sidebar contains Docs, Sheets, Slides and Settings. The host app menu has one Office entry; family deep routes are retained.
2. **Start band:** a Blank card followed by pinned templates and other templates in one scrollable row. Template gallery expands categories; a chevron collapses the band. Pins can be reordered by dragging or keyboard buttons.
3. **Files:** one filter/sort/layout toolbar above Recent. Recent combines browser-opened references and server modification metadata, with explicit source labels. Filters reset each session.

General folder browsing belongs to native OpenCloud Files. Folder selection appears only when choosing a save destination or personal template folder.

Every file row and card has marks (★ favorite, ⇄ shared, ✎ locked and possibly being edited, each with a text alternative) and a "More actions" menu: Open, Open read-only (when the user can edit), Show in Files, Copy link (OpenCloud's private link, which still needs access), Download and Share…. The menu fetches the file's latest activity line, for example who updated it, only when opened. Messages from actions and creation appear in a status bar at the bottom of the screen with a dismiss button.

Creation uses the inline panel described below. Its default format and save folder come from the last successful creation when still valid. No automatic file is created on opening the panel.

When no format can be created, the band explains why ("New files: …"): no office editor is configured, or the configured editor cannot create this family. Template failures appear separately and never block blank creation or Recent. With no templates, the band says an administrator can add them to the template folder.

The gallery collapses when switching apps. Home views get opaque session keys for Back/Forward and returning to an app; names and query text stay out of URLs. Reload cannot restore memory-only state yet. The release adapter must prove native editor return and authenticated lifecycle cleanup.

The application menu and native switcher derive from one reviewed descriptor list. Users can reach Files through the native host. Fixture preview labels explain that Files/editor operations are simulations rather than providing a misleading fallback.

## Templates and previews

Templates come from a personal selected folder or the administrator-maintained OpenCloud default folder (see [templates](templates.md)): files at its root are "General", and each direct subfolder is a category. Ordinary documents can serve as templates. Collabora/LibreOffice template containers (`.ott`, `.ots`, `.otp`) are discovered but native creation refuses them before writing; editor conversion is still pending (DL-006).

Card previews come from the server's preview endpoint. A template first uses an optional image stored next to it with the same name, then the template file's own server preview; recent files use their server preview. When none exists the card shows the family icon and format label. OpenCloud 9.0.0 does not generate previews for ODF or Microsoft Office documents, so documents normally show format cards today; they gain real thumbnails automatically once the server provides them. The app never downloads document content to draw a preview.

## Visual system

Every color comes from host role tokens (`--oc-role-*`), so the app follows the host's light or dark theme. OpenCloud's stock primary is a light brand color (`#e2baff`), so primary buttons use on-primary text and links use the secondary role, as OpenCloud Web does. The standalone preview defines OpenCloud's stock light and dark token values and follows the system color scheme. The focus indicator and the favorite mark use fixed colors chosen for at least 3:1 contrast on both themes. Docs, Sheets and Slides each have a family color used only on icons, the Blank "+" and card hover borders. Labels always accompany color.

The start band and file sections use the host content pane width with modest responsive side padding; file tables are not constrained to a centered prose column. Hierarchy comes from size, weight and space: a 1.3rem app name, 1.05rem section headings, 0.85rem group labels, with borders only where rows need separating. Cards use a 5:4 thumbnail in the band and 4:3 in recent grids. Familiar office-home placement (create first, history second) follows Jakob's Law; showing five templates before the gallery limits choices on first view (Hick's Law). Controls are at least 40px high with 24px minimum for inline links. Card hover transitions are disabled under reduced motion.

Layout uses logical properties, so right-to-left pages mirror; directional arrows (gallery reordering and folder selection) flip with the page direction. Below 700px the toolbar wraps within the pane, default columns shrink/wrap, and cards shrink to 8rem. The template row scrolls inside the band; the page itself never scrolls sideways.

## States and accessibility

The shell includes loading, empty folder, unavailable integration, not-configured editor, recoverable error, partial result, disabled mutation and explicit launch feedback. Errors use safe messages; names and labels are plain text.

The sidebar uses ordinary labelled links. The template gallery and new-file section are disclosure buttons with `aria-expanded`. The layout toggle uses pressed-state buttons in a labelled group. The inline creation panel focuses and selects the name; Escape or Cancel closes it and restores focus. Recent files in list view use a table with column headers; each name is a button. The current sidebar design uses ordinary Tab/Enter navigation and has no single-key shortcuts. File menus close with Escape or an outside click and return focus to their button. After navigation the page heading receives focus, unless the user already moved focus while the view was loading. Programmatic heading focus shows no ring; every control keeps a visible focus indicator.

The target remains WCAG 2.2 AA. Browser journeys test keyboard disclosure, creation-panel focus return, Back/Forward, canceled folder requests, text rendering, gallery categories, preview fallback, layout toggle, sorting and 390px reflow. Desktop/mobile screenshots support visual review; they are not evidence of conformance. Browser journeys also cover the file menu and focus return, column selection and Back restoration, the remembered save folder across reloads, dark-theme tokens and right-to-left reflow at 390px. Full automated accessibility analysis, screen-reader use, 200% text scaling, translated RTL text and theme checks inside the real host remain open. No intended-user usability review has occurred.

## Privacy and flexibility

Recent states both of its sources and labels each entry as opened or changed; OpenCloud records content changes but not file opens, so "opened" history exists only in the browser that opened the file. Sort order, list/grid layout, the compact band, pinned templates, the last format and save folder per app are remembered per OpenCloud instance and user in this browser; they contain template IDs but no file names or content. Recent filters are not remembered, so a forgotten filter cannot hide files on a later visit. No analytics or arbitrary provider URLs are offered. Formats and provider support are discovered through the native integration rather than implied by a file extension. Optional metadata columns use supplied values only; unavailable values are labelled. See [architecture](architecture.md) for data flow and trust boundaries and [development limits](dev-limits.md) for incomplete behavior.

Update this document with reusable interaction changes. Verify screenshots at the chosen breakpoints/themes and record human review separately from agent visual inspection before claiming release quality.

## Revised creation and organization flow

The host application menu contains one **Office** item. Docs, Sheets and Slides remain authenticated deep routes (`/office/docs`, `/office/sheets`, `/office/slides`) and remain separate sidebar destinations. The redundant Files sidebar entry is removed; native Files and per-file Show in Files remain available.

Blank and template cards now open an **inline creation panel**, immediately below the start band. It selects the suggested name and shows the save destination. A format selector appears only when the installed integration offers more than one choice; a single choice is plain text. Choose another folder opens a folder-only picker inside the panel, with space selection and breadcrumbs, without discarding the name. Nothing is written until the explicit Create action. Cancellation and Escape create nothing and restore focus. Pending creation locks repeated submission; conflicts keep the form open; unknown outcomes pause creation. A successful creation exposes Open created file and moves focus there. This flow does not create an ephemeral editor document or promise Save As will move the original.

One toolbar above Recent groups favorites, icon-only tag filtering, sort order, layout and a Columns dropdown. Search stays in OpenCloud’s persistent host header; there is no second app search or scope selector. Columns opens a local dropdown with selection/order controls, closes with Escape or an outside click, and restores focus without changing routes. Default columns fit the available pane; horizontal scrolling is reserved for many optional columns on a narrow pane. Favorite, share and lock marks remain next to names. The start-band disclosure uses an accessible chevron instead of the word Compact.

Settings is a separate right-hand page (`/office/settings`), preserving the sidebar and a Back link. It offers a personal template folder override, installation-default reset and template-section display. Optional/reorderable columns (location, last activity, owner, creation date, modification date, tags and file type) live in the Columns dropdown beside list/grid. It has no history-clear control. Name and actions are always present. Unknown owner/creation dates say Unavailable; modification date is never substituted for creation date.

Installation-wide defaults are configured in an administrator-owned file, not in an application console. Personal Settings changes only browser-scoped preferences; it cannot change installation defaults or backend capabilities. If personal template overrides are disabled, their controls are hidden and existing overrides ignored. See [configuration](configuration.md).

## Folder selection

Folder selection uses a modal file dialog matching the familiar Files layout: locations at the left, breadcrumbs and Up above folder rows, a local name filter, and a selected-folder footer with Cancel and Use this folder. On narrow screens locations become a horizontal strip and the dialog fills the viewport. Only authorized folders appear. Template folders require read access; creation destinations require create permission. Resumed folders without an ancestor contract show an ellipsis; Up explicitly returns to the space root. Loading, missing-space, partial-list and permission errors remain visible; cancellation and navigation create nothing. Native dialog focus containment and Escape preserve keyboard operation.

Administration and shared configuration saving have been removed. The remaining settings page groups personal template and display preferences; the folder dialog remains available for permitted personal template selection and writable creation destinations.
