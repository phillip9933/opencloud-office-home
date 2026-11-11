import { fail, type Result } from '../contracts/office'

// A caller may stop waiting without cancelling work shared by other callers.
export function waitForResult<T>(
  pending: Promise<Result<T>>,
  signal: AbortSignal
): Promise<Result<T>> {
  if (signal.aborted) return Promise.resolve(fail('cancelled'))
  return new Promise((resolve) => {
    const cancel = () => {
      signal.removeEventListener('abort', cancel)
      resolve(fail('cancelled'))
    }
    signal.addEventListener('abort', cancel, { once: true })
    pending.then((result) => {
      signal.removeEventListener('abort', cancel)
      resolve(signal.aborted ? fail('cancelled') : result)
    })
  })
}
