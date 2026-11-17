import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse } from '@core/models/api.model';

// Extrae el mensaje útil de un error del backend y deja un texto de respaldo.
export function readApiError(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body = error.error as Partial<ApiErrorResponse> | null;

  if (body === null || typeof body !== 'object') {
    return fallback;
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const details = body.errors
      .map((item) => (typeof item?.message === 'string' ? item.message.trim() : ''))
      .filter((message) => message.length > 0);

    if (details.length > 0) {
      return details.join(' ');
    }
  }

  if (typeof body.message === 'string' && body.message.trim().length > 0) {
    return body.message.trim();
  }

  return fallback;
}
