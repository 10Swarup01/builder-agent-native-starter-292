const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const dayTimeFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatDayTime(iso: string): string {
  return dayTimeFormatter.format(new Date(iso));
}

export function formatHours(hours: number): string {
  if (hours >= 24) return `${(hours / 24).toFixed(1)} days`;
  return `${hours} hrs`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}
