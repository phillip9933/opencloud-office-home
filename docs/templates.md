# Templates

Office Home creates a new file from an existing document in a template folder. Users choose a
name and destination; the original template stays unchanged.

Administrators can set a shared folder through [installation configuration](configuration.md).
Users can choose a personal folder in Settings when `allowPersonalTemplates` is enabled.
That choice overrides the installation default in the current browser.

## Folder layout

```text
Templates/
├── Letterhead.odt          root files appear under "General"
├── Letterhead.png          optional preview image
├── Business/               each direct subfolder is a category
│   ├── Invoice.xlsx
│   └── Quarterly review.odp
└── Personal/
    └── Resume.docx
```

Supported editable templates are `.odt`, `.docx`, `.ods`, `.xlsx`, `.odp` and `.pptx`.
Template containers (`.ott`, `.ots`, `.otp`) cannot yet be converted; save them as ordinary
editable documents before adding them.

The gallery reads the root and one level of subfolders, up to 20 categories and 200 templates.
Deeper folders and files the user cannot read are omitted.

Cards use a server preview when available. A same-name PNG, JPEG or WebP image beside the
document overrides that preview. Otherwise the card shows the document icon.

## Sharing and maintenance

Manage the folder through OpenCloud Files. Give readers access to use templates and maintainers
write access to update them. Changes appear when the gallery reloads. Template shares and links
are not copied to newly created documents.

Existing Collabora templates can be used after saving them in a supported editable format.
Check their licenses before sharing them. Templates must be OpenCloud files; remote template URLs
are not supported.
