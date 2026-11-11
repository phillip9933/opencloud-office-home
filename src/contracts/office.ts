export type OfficeKind = 'docs' | 'sheets' | 'slides'
export type FileRef = Readonly<{ spaceId: string; itemId: string }>
export type AppError =
  | 'unauthenticated'
  | 'forbiddenOrMissing'
  | 'unsupportedType'
  | 'editorUnavailable'
  | 'providerNotConfigured'
  | 'conflict'
  | 'quotaExceeded'
  | 'invalidName'
  | 'timeout'
  | 'network'
  | 'unknown'
  | 'cancelled'
  | 'searchUnavailable'
  | 'paginationUnavailable'
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError }
export const ok = <T>(value: T): Result<T> => ({ ok: true, value })
export const fail = <T = never>(error: AppError): Result<T> => ({
  ok: false,
  error
})
export interface FileRecord {
  ref: FileRef
  name: string
  kind: 'file' | 'folder'
  mimeType?: string
  path?: string
  // Last content change in OpenCloud (epoch milliseconds), by anyone with access.
  modifiedAt?: number
  access: { read: boolean; write: boolean; createChild: boolean }
}
export interface Space {
  id: string
  name: string
  root: FileRef
}
export interface Page<T> {
  items: T[]
  next?: string
  partial: boolean
}
export interface CatalogQuery {
  folder: FileRef
  // 'any' lists every child, for template folders that hold companion preview images.
  kind: OfficeKind | 'any'
  text: string
  cursor?: string
  signal: AbortSignal
}
export interface FileCatalog {
  listSpaces(signal: AbortSignal): Promise<Result<Space[]>>
  list(query: CatalogQuery): Promise<Result<Page<FileRecord>>>
  resolve(ref: FileRef): Promise<Result<FileRecord>>
  // Family files changed within RECENT_CHANGE_DAYS across the user's spaces, newest first.
  recentlyChanged(kind: OfficeKind, signal: AbortSignal): Promise<Result<Page<FileRecord>>>
}
export const RECENT_CHANGE_DAYS = 30
export interface Format {
  extension: string
  mimeType: string
}
export interface CreationRequest {
  kind: OfficeKind
  destination: FileRef
  name: string
  format: Format
}
export interface Template {
  id: string
  name: string
  kind: OfficeKind
  source: FileRef
  // The editable format a new file gets; a template container such as .ott creates .odt.
  format: Format
  category: string
  // Optional administrator image; without it the template file's own server preview is tried.
  preview?: FileRef
}
export interface FileCreation {
  blank(input: CreationRequest): Promise<Result<FileRecord>>
  fromTemplate(input: CreationRequest & { template: Template }): Promise<Result<FileRecord>>
}
export interface OfficeCapabilities {
  creationFormats(kind: OfficeKind): Promise<Result<Format[]>>
}
// App-owned route/state contract. The release adapter must translate through the native router.
export interface HomeLocation {
  kind: OfficeKind
  spaceId: string
  folder: FileRef | null
  trail: { name: string; ref: FileRef }[]
  text: string
  scroll: number
}
export interface EditorGateway {
  open(input: {
    file: FileRef
    mode: 'view' | 'edit'
    returnTo: HomeLocation
  }): Promise<Result<{ status: 'launchAccepted' }>>
}
export interface RecentRef {
  ref: FileRef
  kind: OfficeKind
  openedAt: number
}
// An authorized preview image. Callers release it when the image leaves the screen.
export interface Preview {
  url: string
  release(): void
}
export interface RecentStore {
  list(kind: OfficeKind): RecentRef[]
  record(ref: FileRef, kind: OfficeKind): void
  remove(ref: FileRef): void
  clear(): void
}
export interface OfficeServices {
  mode: 'unconfigured' | 'fixture'
  catalog: FileCatalog
  creation: FileCreation
  capabilities: OfficeCapabilities
  editor: EditorGateway
  recents: RecentStore
  templates(kind: OfficeKind): Promise<Result<Template[]>>
  preview(ref: FileRef, signal: AbortSignal): Promise<Result<Preview>>
}
export function refKey(ref: FileRef): string {
  return JSON.stringify([ref.spaceId, ref.itemId])
}
