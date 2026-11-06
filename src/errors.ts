export class CcaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CcaError";
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
