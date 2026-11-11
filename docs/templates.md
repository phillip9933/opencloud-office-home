# Template folder (administrators)

The template gallery reads one OpenCloud folder that an administrator chooses at setup. The app only lists and reads it; adding, removing or changing templates is done in OpenCloud Files, and the gallery reflects the folder on the next load. This page describes the intended setup. The native integration is not connected yet (see DL-001), so the setting below is a proposed contract, not a working option.

## Folder layout

```text
Templates/                  shared space or folder, read-only for normal users
├── Letterhead.ott          root files appear under "General"
├── Letterhead.png          optional preview: same name, PNG, JPEG or WebP
├── Business/               each direct subfolder is a category
│   ├── Invoice.ots
│   ├── Invoice.png
│   └── Quarterly review.otp
└── Personal/
    └── Resume.ott
```

- Docs uses `.odt`, `.docx` and `.ott`; Sheets uses `.ods`, `.xlsx` and `.ots`; Slides uses `.odp`, `.pptx` and `.otp`. A template container (`.ott`, `.ots`, `.otp`) creates the matching editable format (`.odt`, `.ods`, `.odp`). An ordinary document can also be a template.
- Only the root and one level of subfolders are read. Deeper folders, other file types and items users cannot read are ignored. At most 20 categories and 200 templates are shown.
- OpenCloud 9.0.0 does not generate previews for office documents, so a preview needs its own image file next to the template. Without one, the card shows the family icon and format.

## Starting with Collabora templates

Collabora's Template Manager belongs to the desktop Collabora Office application and has no web interface or API that OpenCloud can query. To start with those templates, export or copy the template files from a Collabora Office (or LibreOffice) installation into the folder above, using the categories you want. Afterwards the folder is yours to edit: remove templates you do not need, and add company templates, for example letterheads saved as `.ott` files.

Check the license of every template before sharing it with users; bundled and downloaded templates do not all use the same terms.

## Permissions

Give normal users read access only. Give write access to the people who maintain templates. Creating a file from a template always produces a new, independent file in the folder the user chooses; the template is never edited, and its shares and links are not copied. That copy behavior must be verified against the deployed OpenCloud and editor before release.

## Proposed setting

The app is configured through OpenCloud's `apps.yaml`. The proposed, not yet implemented, key identifies the folder by its OpenCloud resource ID rather than a path or URL:

```yaml
office:
  config:
    templateFolder:
      spaceId: '<space id>'
      itemId: '<folder id>'
```

Remote template URLs are deliberately not supported: templates must be OpenCloud files so that authorization, sharing and auditing stay in OpenCloud.
