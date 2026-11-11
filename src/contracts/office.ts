import type { ViewPreferenceStore } from './preferences'
import type { FileRef, OfficeKind } from './files'
export type { FileRef, OfficeKind } from './files'

export interface OfficeConfiguration {
  templateFolder?: FileRef
  allowPersonalTemplates: boolean
  creationFormats: Partial<Record<OfficeKind, string[]>>
}
export type AppError =
  | 'unauthenticated'
  | 'forbiddenOrMissing'
  | 'spaceUnavailable'
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
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError }
export const ok = <T>(value: T): { ok: true; value: T } => ({ ok: true, value })
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
  createdAt?: number
  owner?: string
  favorite?: boolean
  tags?: string[]
  shared?: boolean
  // A WOPI/WebDAV lock, typically held while the file is open in an editor.
  lock?: { owner?: string }
  // OpenCloud's private link (https), which still requires sign-in and permission to open.
  link?: string
  access: { read: boolean; write: boolean; createChild: boolean }
}
export interface Activity {
  text: string
  at?: number
}
// Narrows Recent. Tags match when a file has any of them.
export interface RecentFilter {
  favorites: boolean
  tags: string[]
}
export interface Space {
  id: string
  name: string
  root: FileRef
}
export interface Page<T> {
  items: T[]
  partial: boolean
}
export interface CatalogQuery {
  folder: FileRef
  // 'any' lists every child, for template folders that hold companion preview images.
  kind: OfficeKind | 'any'
  signal: AbortSignal
}
export interface FileCatalog {
  listSpaces(signal: AbortSignal): Promise<Result<Page<Space>>>
  list(query: CatalogQuery): Promise<Result<Page<FileRecord>>>
  resolve(ref: FileRef, signal?: AbortSignal): Promise<Result<FileRecord>>
  // Family files changed within RECENT_CHANGE_DAYS across the user's spaces, newest first.
  recentlyChanged(
    kind: OfficeKind,
    signal: AbortSignal,
    filter: RecentFilter
  ): Promise<Result<Page<FileRecord>>>
  // Tags the user can filter by; only offered when the server advertises tags.
  listTags(signal: AbortSignal): Promise<Result<string[]>>
  // The newest activity-log entry for a file, as plain text; null when none is recorded.
  latestActivity(ref: FileRef, signal: AbortSignal): Promise<Result<Activity | null>>
}
// Native file actions owned by OpenCloud Web; the app only asks the host to perform them.
export interface ActionFeedback {
  message?: string
}
export interface FileActions {
  showInFiles(file: FileRecord): Promise<Result<ActionFeedback>>
  share(file: FileRecord): Promise<Result<ActionFeedback>>
  download(file: FileRecord): Promise<Result<ActionFeedback>>
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
// Only the mutation boundary knows whether a failed write may have reached the server.
export type CreationResult =
  | { ok: true; value: FileRecord }
  | { ok: false; error: AppError; outcome: 'notSubmitted' | 'rejected' | 'uncertain' }
export interface FileCreation {
  blank(input: CreationRequest): Promise<CreationResult>
  fromTemplate(input: CreationRequest & { template: Template }): Promise<CreationResult>
}
export interface OfficeCapabilities {
  creationFormats(kind: OfficeKind): Promise<Result<Format[]>>
}
// Session-owned home state; the view persists it before native editor navigation.
export interface HomeLocation {
  kind: OfficeKind
  spaceId: string
  folder: FileRef | null
  folderName?: string
  scroll: number
}
export interface EditorGateway {
  open(input: {
    file: FileRef
    mode: 'view' | 'edit'
  }): Promise<Result<{ status: 'launchAccepted'; message?: string }>>
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
}
export interface OfficeServices {
  mode: 'fixture' | 'native'
  configuration?: OfficeConfiguration
  catalog: FileCatalog
  actions: FileActions
  creation: FileCreation
  capabilities: OfficeCapabilities
  editor: EditorGateway
  recents: RecentStore
  templates(kind: OfficeKind, folder?: FileRef): Promise<Result<Page<Template>>>
  preview(ref: FileRef, signal: AbortSignal): Promise<Result<Preview>>
  // Host feature availability decides which filters are offered.
  filters: { favorites: boolean; tags: boolean }
  viewPreferences: ViewPreferenceStore
}
export function refKey(ref: FileRef): string {
  return JSON.stringify([ref.spaceId, ref.itemId])
}
