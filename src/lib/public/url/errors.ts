// Excepciones para el Módulo de URLs Públicas
// Archivo: src/lib/public/url/errors.ts

export class PublicUrlError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PublicUrlError";
    Object.setPrototypeOf(this, PublicUrlError.prototype);
  }
}
