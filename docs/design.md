# Office home design

The intended task is to find, create and reopen office files while retaining OpenCloud's identity, storage and editor behavior. Signed-in personal/team use is proposed by the technical guide; audience and project tier remain unconfirmed. The current design is a synthetic local preview, not an approved final interface.

## Screens and journeys

Docs, Sheets and Slides share one quiet layout, top to bottom:

1. **Header:** application menu, the family name with its icon (the page heading), and a search field whose placeholder names the folder it searches.
2. **Start band:** a tinted strip titled "Start a new document/spreadsheet/presentation". A Blank card comes first, followed by the user's pinned templates in their chosen order, then other templates up to five in total, in one horizontally scrollable row. "Template gallery" expands the band to every template: a Pinned group first, then categories. Every template card has a pin toggle. In the Pinned group, templates can be reordered by dragging or with "Move earlier"/"Move later" buttons for keyboard users. "Compact" collapses the band to one line with "+ Blank …", Template gallery and Compact; the choice is remembered and shared by the three apps.
3. **Recent:** family files changed in OpenCloud in the last 30 days (from any device, by the user or people they share with) merged with files opened in this browser. Entries are grouped as Today, Previous 7 days, Previous 30 days and Earlier by their latest activity, and each shows "Opened …" or "Changed …". The toolbar offers a Favorites toggle and a Tags picker (files with any selected tag), each shown only when the server advertises favorites or tags, then Sort by (Most recent or Name; Name drops the date groups) and a list/grid toggle. Filters narrow both sources, reload only Recent, and reset each session; an empty filtered result offers Clear filters. "Clear this browser's history" removes only the opened entries; server changes stay. If the server query fails or is truncated, a note says so and browser history remains.
4. **Browse folders:** a collapsed disclosure at the bottom with the space selector, breadcrumbs and folder listing. It opens automatically when the view is inside a subfolder or has a search, and "Choose another folder" in the create dialog opens and focuses it.

Choosing Blank or a template opens a small dialog: name, format (fixed and shown for templates), and the save location with "Choose another folder". Nothing is created until Create is pressed, so the destination is always visible first. Create is disabled without a known writable destination or a supported format, and repeated activation is locked. Fixable problems such as a name conflict keep the dialog open with the message; once a file exists, the dialog closes and the start band shows the result with "Open created file". Uncertain outcomes close the dialog and pause creation until reconciliation.

When no format can be created, the band explains why ("New files: …"): no office editor is configured, or the configured editor cannot create this family. Template failures appear separately and never block blank creation or browsing. With no templates, the band says an administrator can add them to the template folder.

The gallery collapses when switching apps. Folder/search views get opaque session keys for Back/Forward and returning to an app; names and query text stay out of URLs. Reload cannot restore memory-only state yet. The release adapter must prove native editor return and authenticated lifecycle cleanup.

The application menu and native switcher derive from one reviewed descriptor list. Users can reach Files through the native host. Fixture preview labels explain that Files/editor operations are simulations rather than providing a misleading fallback.

## Templates and previews

Templates come from one administrator-maintained OpenCloud folder (see [templates](templates.md)): files at its root are "General", and each direct subfolder is a category. Collabora/LibreOffice template containers (`.ott`, `.ots`, `.otp`) create the matching editable format; ordinary documents can serve as templates too.

Card previews come from the server's preview endpoint. A template first uses an optional image stored next to it with the same name, then the template file's own server preview; recent files use their server preview. When none exists the card shows the family icon and format label. OpenCloud 9.0.0 does not generate previews for ODF or Microsoft Office documents, so documents normally show format cards today; they gain real thumbnails automatically once the server provides them. The app never downloads document content to draw a preview.

## Visual system

Use version-matched OpenCloud components and host role tokens (`--oc-role-*`) for foreground, primary, outline and surface colors; local fallbacks keep the standalone preview legible. Docs, Sheets and Slides each have a family color used only on icons, the Blank "+" and card hover borders. Labels always accompany color.

One centered content column (max 72rem) aligns the header, start band and file sections. Hierarchy comes from size, weight and space: a 1.3rem app name, 1.05rem section headings, 0.85rem group labels, with borders only where rows need separating. Cards use a 5:4 thumbnail in the band and 4:3 in recent grids. Familiar office-home placement (create first, history second) follows Jakob's Law; showing five templates before the gallery limits choices on first view (Hick's Law). Controls are at least 40px high with 24px minimum for inline links. Card hover transitions are disabled under reduced motion.

Below 700px the search moves to its own row, the location column is hidden, and cards shrink to 8rem. The template row scrolls inside the band; the page itself never scrolls sideways.

## States and accessibility

The shell includes loading, empty folder, no search matches, unavailable integration, not-configured editor, recoverable error, partial result, disabled mutation and explicit launch feedback. Errors use safe messages; names and labels are plain text.

The application disclosure uses ordinary links, an expanded-state button, first-link focus on open and Escape focus recovery. The template gallery and Browse folders are disclosure buttons with `aria-expanded`. The layout toggle uses pressed-state buttons in a labelled group. The create dialog is a native modal: it focuses and selects the name, Escape or Cancel closes it, and focus returns to the card that opened it. Recent files in list view use a table with column headers; each name is a button. After navigation the page heading receives focus, unless the user already moved focus while the view was loading. Programmatic heading focus shows no ring; every control keeps a visible focus indicator.

The target remains WCAG 2.2 AA. Browser journeys test keyboard disclosure, dialog focus return, Back/Forward, canceled searches, text rendering, gallery categories, preview fallback, layout toggle, sorting and 390px reflow. Desktop/mobile screenshots support visual review; they are not evidence of conformance. Full automated accessibility analysis, screen-reader use, 200% text scaling, RTL, long translations and native theme checks remain open. No intended-user usability review has occurred.

## Privacy and flexibility

Recent states both of its sources and labels each entry as opened or changed; OpenCloud records content changes but not file opens, so "opened" history exists only in the browser that opened the file. Sort order, list/grid layout, the compact band and pinned templates are remembered per OpenCloud instance and user in this browser; they contain template IDs but no file names or content. Recent filters are not remembered, so a forgotten filter cannot hide files on a later visit. No analytics or arbitrary provider URLs are offered. Formats and provider support are discovered through the native integration rather than implied by a file extension. Ownership and "last modified" columns are not shown because the verified catalog does not yet provide them. See [architecture](architecture.md) for data flow and trust boundaries and [development limits](dev-limits.md) for incomplete behavior.

Update this document with reusable interaction changes. Verify screenshots at the chosen breakpoints/themes and record human review separately from agent visual inspection before claiming release quality.
