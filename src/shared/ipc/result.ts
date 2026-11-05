export type AppError =
  | { code: 'VALIDATION'; message: string; field?: string }
  | { code: 'NOT_FOUND'; message: string }
  | { code: 'EXPORT_FAILED'; message: string; reason: 'NO_SPACE' | 'PERMISSION' | 'UNKNOWN' }
  | { code: 'STORAGE_FAILED'; message: string }
  | { code: 'LIBRARY_RECOVERED'; message: string; backupPath: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(error: AppError): Result<T> {
  return { ok: false, error };
}
