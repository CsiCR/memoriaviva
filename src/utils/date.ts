export const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const APP_LOCALE = 'es-AR';

/**
 * Parses date inputs dynamically, supporting Date objects, string timestamps,
 * and numbers. Handles invalid dates, nulls, and empty strings gracefully.
 */
function parseDate(dateInput: Date | string | number | null | undefined): Date | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') return null;
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Formats a date as DD/MM/YYYY in the America/Argentina/Buenos_Aires timezone.
 */
export function formatDateToAR(dateInput: Date | string | number | null | undefined): string {
  const date = parseDate(dateInput);
  if (!date) return '—';
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Formats a time as HH:mm in the America/Argentina/Buenos_Aires timezone.
 */
export function formatTimeToAR(dateInput: Date | string | number | null | undefined): string {
  const date = parseDate(dateInput);
  if (!date) return '—';
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

/**
 * Formats date and time as DD/MM/YYYY HH:mm in the America/Argentina/Buenos_Aires timezone.
 */
export function formatDateTimeToAR(dateInput: Date | string | number | null | undefined): string {
  const date = parseDate(dateInput);
  if (!date) return '—';
  const formatted = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
  return formatted.replace(',', '');
}

/**
 * Formats date and time indicating that the timezone is Argentina (UTC-03:00).
 */
export function formatDateTimeForAudit(dateInput: Date | string | number | null | undefined): string {
  const date = parseDate(dateInput);
  if (!date) return '—';
  return `${formatDateTimeToAR(date)} (Hora de Argentina)`;
}

/**
 * Gets the year in the America/Argentina/Buenos_Aires timezone.
 */
export function getBuenosAiresYear(dateInput: Date | string | number = new Date()): number {
  const date = parseDate(dateInput) || new Date();
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric'
  }).format(date);
  return parseInt(formatted, 10);
}

/**
 * Retrieves the local date parts (year, month, day, hour, minute, second)
 * in the America/Argentina/Buenos_Aires timezone.
 */
export function getBuenosAiresDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  return {
    year: parseInt(getPart('year'), 10),
    month: parseInt(getPart('month'), 10) - 1, // 0-indexed
    day: parseInt(getPart('day'), 10),
    hour: parseInt(getPart('hour'), 10),
    minute: parseInt(getPart('minute'), 10),
    second: parseInt(getPart('second'), 10)
  };
}

/**
 * Computes the timezone offset in minutes for America/Argentina/Buenos_Aires
 * for a specific date, without using static hardcoded offsets.
 */
export function getBuenosAiresOffsetMinutes(date: Date): number {
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parseToDateParts = (formatter: Intl.DateTimeFormat, d: Date) => {
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
    return {
      year: parseInt(getPart('year'), 10),
      month: parseInt(getPart('month'), 10) - 1,
      day: parseInt(getPart('day'), 10),
      hour: parseInt(getPart('hour'), 10),
      minute: parseInt(getPart('minute'), 10),
      second: parseInt(getPart('second'), 10)
    };
  };

  const tzParts = parseToDateParts(tzFormatter, date);
  const utcParts = parseToDateParts(utcFormatter, date);

  const tzLocalTime = Date.UTC(tzParts.year, tzParts.month, tzParts.day, tzParts.hour, tzParts.minute, tzParts.second);
  const utcLocalTime = Date.UTC(utcParts.year, utcParts.month, utcParts.day, utcParts.hour, utcParts.minute, utcParts.second);

  return Math.round((tzLocalTime - utcLocalTime) / 60000);
}

/**
 * Creates a Date object representing the given year/month/day/hour/minute/second
 * in the America/Argentina/Buenos_Aires timezone.
 */
export function createBuenosAiresDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0): Date {
  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
  const offsetMin = getBuenosAiresOffsetMinutes(utcDate);
  return new Date(utcDate.getTime() - offsetMin * 60000);
}

/**
 * Calculates start (inclusive) and end (exclusive) date boundaries
 * in UTC corresponding to the local Buenos Aires range.
 */
export function getBuenosAiresBoundaries(filter: 'hoy' | 'ayer' | 'semana' | 'mes', now: Date = new Date()): { start: Date; end: Date } {
  const parts = getBuenosAiresDateParts(now);

  if (filter === 'hoy') {
    const start = createBuenosAiresDate(parts.year, parts.month, parts.day, 0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
  
  if (filter === 'ayer') {
    const startToday = createBuenosAiresDate(parts.year, parts.month, parts.day, 0, 0, 0, 0);
    const start = new Date(startToday.getTime() - 24 * 60 * 60 * 1000);
    const end = startToday;
    return { start, end };
  }
  
  if (filter === 'semana') {
    const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const weekdayStr = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIME_ZONE, weekday: 'short' }).format(now) as keyof typeof weekdays;
    const dayOfWeek = weekdays[weekdayStr];
    
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const localToday = createBuenosAiresDate(parts.year, parts.month, parts.day, 0, 0, 0, 0);
    const start = new Date(localToday.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return { start, end };
  }
  
  if (filter === 'mes') {
    const start = createBuenosAiresDate(parts.year, parts.month, 1, 0, 0, 0, 0);
    let nextMonth = parts.month + 1;
    let nextYear = parts.year;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    const end = createBuenosAiresDate(nextYear, nextMonth, 1, 0, 0, 0, 0);
    return { start, end };
  }
  
  throw new Error(`Filtro de fecha inválido: ${filter}`);
}
