/**
 * Format a Date object to YYYY-MM-DD string in local time
 */
export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a Date object to HH:mm string in local time
 */
export const formatTimeLocal = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const padTimePart = (value: string, size: number) =>
  (value.replace(/\D/g, '') || '0').padStart(size, '0').slice(0, size);

/** HH:mm:ss.SSS so string order matches clock order, including seconds and milliseconds. */
export const timeSortKey = (time?: string | null): string => {
  const [hours = '0', minutes = '0', rest = ''] = (time || '00:00').split(':');
  const [seconds = '0', millis = '0'] = rest.split('.');
  return `${padTimePart(hours, 2)}:${padTimePart(minutes, 2)}:${padTimePart(seconds, 2)}.${padTimePart(millis, 3)}`;
};

const clockTimeKey = (item: { date?: string; time?: string | null; createdAt?: string | null }): string => {
  const stored = item.time || '00:00';
  if (stored.split(':').length >= 3) return timeSortKey(stored);
  if (!item.createdAt || !item.date) return timeSortKey(stored);
  const created = new Date(item.createdAt);
  if (Number.isNaN(created.getTime())) return timeSortKey(stored);
  if (formatDateLocal(created) !== item.date) return timeSortKey(stored);
  if (formatTimeLocal(created) !== stored.slice(0, 5)) return timeSortKey(stored);
  const seconds = String(created.getSeconds()).padStart(2, '0');
  const millis = String(created.getMilliseconds()).padStart(3, '0');
  return timeSortKey(`${stored.slice(0, 5)}:${seconds}.${millis}`);
};

const numericId = (id?: number | string): number => {
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  if (typeof id === 'string') {
    const match = id.match(/(\d+)$/);
    if (match) return Number(match[1]);
  }
  return 0;
};

/** Newest date, then newest clock time (seconds and milliseconds), then newest save. */
export const compareTransactionsNewestFirst = (
  a: { date?: string; time?: string | null; createdAt?: string | null; id?: number | string },
  b: { date?: string; time?: string | null; createdAt?: string | null; id?: number | string }
): number => {
  const byDate = (b.date ?? '').localeCompare(a.date ?? '');
  if (byDate !== 0) return byDate;
  const byTime = clockTimeKey(b).localeCompare(clockTimeKey(a));
  if (byTime !== 0) return byTime;
  const byCreated = (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  if (byCreated !== 0) return byCreated;
  return numericId(b.id) - numericId(a.id);
};

/** Keep HH:mm for time inputs. Seconds stay on the saved record. */
export const toTimeInputValue = (time?: string | null): string => (time || '00:00').slice(0, 5);

/**
 * Keep a chosen minute as HH:mm. When that minute is the current minute,
 * store the real second and millisecond so a later save sorts above an earlier one.
 */
export const withCurrentSeconds = (time?: string | null): string => {
  if ((time || '').split(':').length >= 3) return timeSortKey(time);
  const minute = toTimeInputValue(time);
  const now = new Date();
  if (minute !== formatTimeLocal(now)) return minute;
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const millis = String(now.getMilliseconds()).padStart(3, '0');
  return `${minute}:${seconds}.${millis}`;
};

/**
 * Get current local date as YYYY-MM-DD
 */
export const getCurrentLocalDate = (): string => {
  return formatDateLocal(new Date());
};

/**
 * Get current local time as HH:mm
 */
export const getCurrentLocalTime = (): string => {
  return formatTimeLocal(new Date());
};

/**
 * Convert a stored HH:mm (24-hour) time to "hh:mm AM/PM" for display.
 */
export const formatTime12Hour = (time?: string | null): string => {
  if (!time) return '';
  const [hourStr, minuteStr = '00'] = time.split(':');
  const hour24 = Number(hourStr);
  if (Number.isNaN(hour24)) return '';
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, '0')}:${minuteStr.padStart(2, '0')} ${period}`;
};

/**
 * Parse a YYYY-MM-DD string to a Date object in local time (at 00:00:00)
 */
export const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // month is 0-indexed in Date constructor
  return new Date(year, month - 1, day);
};

/**
 * Get the start and end dates of a week for a given Date (starts on Sunday)
 */
export const getWeekRange = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  return { start, end };
};

/**
 * Get the start and end dates of a month for a given Date
 */
export const getMonthRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
};

/**
 * Get the start and end dates of a year for a given Date
 */
export const getYearRange = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31);
  return { start, end };
};
