const DATE_FORMAT = new Intl.DateTimeFormat('es-SV', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

// Interpreta una fecha ISO sin hora como fecha local para no desplazar el día.
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());

  if (match === null) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim().length === 0) {
    return '—';
  }

  const date = parseLocalDate(value);
  return date === null ? '—' : DATE_FORMAT.format(date);
}

export function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
