import { fail, type AppError, type Result } from '../contracts/office'

export const errorText: Record<AppError, string> = {
  unauthenticated: 'Sign in again through OpenCloud.',
  forbiddenOrMissing: 'This item is unavailable or you no longer have access.',
  spaceUnavailable: 'This space could not be verified. Retry loading or choose another folder.',
  unsupportedType: 'This format is not supported by the configured editor.',
  editorUnavailable:
    'The OpenCloud integration has not been verified. File actions are unavailable.',
  providerNotConfigured:
    'No office editor is configured for these files on this OpenCloud server. Ask an administrator to add one.',
  conflict: 'A file with that name already exists. Choose another name.',
  quotaExceeded: 'There is not enough storage available.',
  invalidName: 'Enter a file name without slashes, control characters, or a different extension.',
  timeout: 'The result is uncertain. Check the destination in Files before trying again.',
  network: 'The service could not be reached. Try loading again.',
  unknown: 'The operation could not be completed.',
  cancelled: 'The operation was cancelled.'
}
export async function attempt<T>(operation: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await operation()
  } catch (error) {
    return fail(
      error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'network'
    )
  }
}
