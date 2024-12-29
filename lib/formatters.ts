export function formatEventDescription(durationInMinutes: number) {
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  const minutesString = `${minutes} ${minutes > 1 ? "mins" : "min"}`;
  const hoursString = `${hours}  ${hours > 1 ? "hrs" : "hr"}`;

  if (hours === 0) return minutesString;
  if (minutes === 0) return hoursString;
  return `${hoursString} ${minutesString}`;
}

export function formatTimezoneOffset(timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}

export function formatTimeString(date: Date, timezone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

export function formatDateTime(date: Date, timezone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}
