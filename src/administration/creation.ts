import type { Format } from '../contracts/office'
export interface CreationFormat extends Format {
  label: string
  providers: string[]
  canCreate: boolean
}
export const formatKey = (format: Format) => `${format.extension}:${format.mimeType}`
