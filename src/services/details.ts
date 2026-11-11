import {
  fail,
  type FileCatalog,
  type FileRecord,
  type FileRef,
  type Result
} from '../contracts/office'
import { attempt } from './home'

// Optional columns share one session-owned queue instead of fetching every row at once.
const MAX_IN_FLIGHT = 4
export function createDetailLoader(catalog: FileCatalog) {
  type Job = { ref: FileRef; signal: AbortSignal; finish(result: Result<FileRecord>): void }
  const jobs: Job[] = []
  let inFlight = 0
  let disposed = false
  function pump() {
    while (!disposed && inFlight < MAX_IN_FLIGHT && jobs.length) {
      const job = jobs.shift()!
      if (job.signal.aborted) {
        job.finish(fail('cancelled'))
        continue
      }
      inFlight++
      void attempt(() => catalog.resolve(job.ref))
        .then((result) => {
          job.finish(disposed || job.signal.aborted ? fail('cancelled') : result)
        })
        .finally(() => {
          inFlight--
          pump()
        })
    }
  }
  return {
    load(ref: FileRef, signal: AbortSignal): Promise<Result<FileRecord>> {
      if (disposed || signal.aborted) return Promise.resolve(fail('cancelled'))
      return new Promise((finish) => {
        jobs.push({ ref: { ...ref }, signal, finish })
        pump()
      })
    },
    dispose() {
      disposed = true
      for (const job of jobs.splice(0)) job.finish(fail('cancelled'))
    }
  }
}
export type DetailLoader = ReturnType<typeof createDetailLoader>
