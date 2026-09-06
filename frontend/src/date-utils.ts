import dayjs from "dayjs";

export const todayStr = () => dayjs().format("YYYY-MM-DD");

export function prettyDate(d: string): string {
  return dayjs(d).format("dddd, MMM D");
}

export function shortDate(d: string): string {
  return dayjs(d).format("MMM D, YYYY");
}

export function greeting(): string {
  const h = dayjs().hour();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
