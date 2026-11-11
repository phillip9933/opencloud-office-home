import type { Format } from '../contracts/office'

export interface RegisteredFormat extends Format {
  // Empty extension means the backend supplies a MIME type only; an admin must map its extension.
  label: string
  providers: string[]
  canCreate: boolean
}
export interface RegisteredEditor {
  action: string
  label: string
  extension?: string
  mimeType?: string
}
export interface IntegrationDirectory {
  formats: RegisteredFormat[]
  editors: RegisteredEditor[]
}
export function matchingEditors(directory: IntegrationDirectory, format: Format) {
  const seen = new Set<string>()
  return directory.editors.filter((editor) => {
    if (editor.extension && editor.extension !== format.extension) return false
    if (
      editor.mimeType &&
      editor.mimeType !== format.mimeType &&
      editor.mimeType !== format.mimeType.split('/')[0]
    )
      return false
    if ((!editor.extension && !editor.mimeType) || seen.has(editor.action)) return false
    seen.add(editor.action)
    return true
  })
}
export const formatKey = (format: Format) => `${format.extension}:${format.mimeType}`
