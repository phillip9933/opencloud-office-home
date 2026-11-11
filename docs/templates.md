# Template folder (administrators)

The template gallery reads one OpenCloud folder that an administrator chooses at setup. The app only lists and reads it; adding, removing or changing templates is done in OpenCloud Files, and the gallery reflects the folder on the next load. The native test adapter reads this setting; deployment acceptance is still pending. Ordinary document copies are implemented. Native conversion of `.ott`, `.ots` and `.otp` remains blocked before mutation (DL-006); use editable `.odt`, `.ods` or `.odp` template copies for initial testing.

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

- Docs uses `.odt`, `.docx` and `.ott`; Sheets uses `.ods`, `.xlsx` and `.ots`; Slides uses `.odp`, `.pptx` and `.otp`. A template container requires native editor conversion to the matching editable format; it cannot be renamed or copied as that format in the current test build. An ordinary document can also be a template.
- Only the root and one level of subfolders are read. Deeper folders, other file types and items users cannot read are ignored. At most 20 categories and 200 templates are shown.
- Card previews use the server's preview of the template file. OpenCloud 9.0.0 does not generate previews for office documents, so until it does, a same-name image next to the template is the only way to show one; it also overrides a server preview. Without either, the card shows the family icon and format.

## Starting with Collabora templates

To use existing templates, export or copy appropriately licensed files into the folder above, using the categories you want. For the current native test build, save them as ordinary editable documents first. Afterwards the folder is yours to edit: remove templates you do not need, and add company templates, for example letterheads saved as `.ott` files.

Check the license of every template before sharing it with users; bundled and downloaded templates do not all use the same terms.

## Permissions

Give normal users read access only. Give write access to the people who maintain templates. Creating a file from a template always produces a new, independent file in the folder the user chooses; the template is never edited, and its shares and links are not copied. That copy behavior must be verified against the deployed OpenCloud and editor before release.

## Native test setting

The app is configured through OpenCloud's `apps.yaml` or its local `config.json`; use the installed directory ID (`office-home` below). The optional key identifies the folder by its OpenCloud resource ID rather than a path or URL:

```yaml
office-home:
  config:
    templateFolder:
      spaceId: '<space id>'
      itemId: '<folder id>'
```

Remote template URLs are deliberately not supported: templates must be OpenCloud files so that authorization, sharing and auditing stay in OpenCloud.

Users can select a personal template folder in Office Settings. The selection is a scoped browser preference containing only canonical IDs; it overrides the installation `templateFolder` default for all three family galleries in that browser. Use installation default removes the override. Selection does not upload, copy or modify any templates, and the catalog rechecks access when the gallery loads.
