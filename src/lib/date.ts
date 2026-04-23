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
 * Parse a YYYY-MM-DD string to a Date object in local time (at 00:00:00)
 */
export const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // month is 0-indexed in Date constructor
  return new Date(year, month - 1, day);
};

/**
 * Get the start and end dates of a month for a given Date
 */
export const getMonthRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
};
