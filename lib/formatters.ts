export function formatEventDescription(durationInMinutes: number) {
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  const minutesString = `${minutes} ${minutes > 1 ? 'mins' : 'min'}`;
  const hoursString = `${hours}  ${hours > 1 ? 'hrs' : 'hr'}`;

  if (hours === 0) return minutesString;
  if (minutes === 0) return hoursString;
  return `${hoursString} ${minutesString}`;
}

export function formatTimezoneOffset(timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

export function formatDate(date: Date | null | undefined | string) {
  if (!date) return '';
  try {
    return dateFormatter.format(typeof date === 'string' ? new Date(date) : date);
  } catch {
    return '';
  }
}

export function formatTimeString(date: Date, timezone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
    timeZone: timezone,
  }).format(date);
}

export function formatDateTime(date: Date, timezone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(date);
}

/**
 * Formats a currency amount
 * @param amount - Amount in cents (e.g., 1000 for $10.00)
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @returns Formatted currency string (e.g., '$10.00')
 */
export function formatCurrency(amount: number, currency = 'EUR') {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Format the absolute amount divided by 100 to convert cents to dollars/euros
  const formattedAmount = formatter.format(absAmount / 100);

  // Add the negative sign in front of the currency symbol if needed
  return isNegative ? `-${formattedAmount}` : formattedAmount;
}

/**
 * Formats a time range between two dates
 * @param start - Start date
 * @param end - End date
 * @param timezone - Optional timezone
 * @returns Formatted time range string (e.g., "10:30 AM - 11:30 AM")
 */
export function formatTimeRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
  timezone?: string,
): string {
  if (!start || !end) return '';

  try {
    const sameDay = start.toDateString() === end.toDateString();

    if (sameDay) {
      // If same day, just show time - time
      return `${formatTimeString(start, timezone)} - ${formatTimeString(end, timezone)}`;
    }

    // If different days, show date and time for both
    return `${formatDateTime(start, timezone)} - ${formatDateTime(end, timezone)}`;
  } catch {
    return '';
  }
}
