# Licensing and source availability

Office Home application code, tests, documentation and modifications to the imported starter are
licensed under **GNU Affero General Public License version 3 only** (`AGPL-3.0-only`). The full text
is in [LICENSE-AGPL-3.0](../LICENSE-AGPL-3.0). This grant does not include an option to select a later
license version. The software is provided without warranty, as stated in that license.

The original OpenCloud app skeleton at `77f3194743046cf36ac567f7f241b5f33450df14` remains under
Apache-2.0. Its [LICENSE](../LICENSE), Git history and [third-party notices](../THIRD_PARTY_NOTICES.md)
are preserved. Dependencies and other third-party material retain their respective terms. This
application license does not claim ownership of them or change the license of users' documents.

## Distribution and hosted use

Keep the applicable license texts, copyright notices and modification notices with distributed
copies. Provide the corresponding source, including the build scripts and dependency information
needed to reproduce the installed version, under the applicable license terms. Section 13 of the
AGPL requires a prominent opportunity for remote users of a modified version to obtain its
corresponding source at no charge. Read the full license for the exact obligations.

The [source repository](https://github.com/phillip9933/opencloud-office-home) contains the application
and its build instructions. A deployment must identify the source corresponding to its installed
version and make that source accessible to its users, including local modifications. Before wider
hosted use, expose a source link in the application. Do not include private workspace instructions,
credentials, user documents or operational backups in source archives. Publishing this repository
does not constitute a supported binary release or complete every deployment's license obligations.

## Upstream contribution

The official [Web extensions collection](https://github.com/opencloud-eu/web-extensions) declares
AGPL-3.0. Its README places new applications under `packages/web-app-*` and describes the development
Compose mount. Office Home retains the official skeleton history and the `web-app-office` package
name; inclusion in that collection would require adapting its package layout and current tooling.
No upstream submission or acceptance is implied.

The general [OpenCloud contribution guidance](https://github.com/opencloud-eu/opencloud/blob/main/CONTRIBUTING.md#licensing-and-cla)
states that no CLA is required for public OpenCloud code. Recheck the destination repository's
current contribution requirements before a submission. No upstream submission or acceptance is
implied by publishing this standalone prototype.
