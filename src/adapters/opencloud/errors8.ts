// Preserve the HTTP category without retaining response bodies, URLs or personal data.
export class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`OpenCloud operation returned HTTP ${status}`)
    this.name = 'HttpStatusError'
  }
}
