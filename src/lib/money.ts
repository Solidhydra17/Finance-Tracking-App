// Money utility - all values in integer cents to avoid floating point issues

export function centsToDisplay(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}₱${dollars.toLocaleString()}.${remainder.toString().padStart(2, '0')}`;
}

export function displayToCents(display: string): number {
  const cleaned = display.replace(/[^0-9.-]/g, '');
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function centsToNumber(cents: number): number {
  return cents / 100;
}

export function numberToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function addCents(a: number, b: number): number {
  return a + b;
}

export function subtractCents(a: number, b: number): number {
  return a - b;
}

export function multiplyCents(cents: number, multiplier: number): number {
  return Math.round(cents * multiplier);
}

export function divideCents(cents: number, divisor: number): number {
  if (divisor === 0) return 0;
  return Math.round(cents / divisor);
}

export function absCents(cents: number): number {
  return Math.abs(cents);
}

export function formatCurrency(cents: number, symbol: string = '$', position: 'prefix' | 'suffix' = 'prefix'): string {
    const abs = Math.abs(cents);
    const dollars = Math.floor(abs / 100);
    const remainder = abs % 100;
    const sign = cents < 0 ? '-' : '';
    const numStr = `${dollars.toLocaleString()}.${remainder.toString().padStart(2, '0')}`;
    
    return position === 'prefix' 
        ? `${sign}${symbol}${numStr}` 
        : `${sign}${numStr} ${symbol}`;
}
