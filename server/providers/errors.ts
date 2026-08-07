export class ProviderError extends Error {
  readonly provider: string

  constructor (provider: string, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ProviderError'
    this.provider = provider
  }
}
