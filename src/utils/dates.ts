import { differenceInCalendarDays, parseISO, format, isToday as dfnsIsToday, isWithinInterval } from 'date-fns';

export function daysUntil(dateStr: string): number {
  const target = parseISO(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(target, today);
}

export function tripDateRange(start: string, end: string): string[] {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE, MMM d');
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d');
}

export function isToday(dateStr: string): boolean {
  return dfnsIsToday(parseISO(dateStr));
}

export function isTripActive(start: string, end: string): boolean {
  const today = new Date();
  return isWithinInterval(today, {
    start: parseISO(start),
    end: parseISO(end),
  });
}

export function addDays(dateStr: string, days: number): string {
  const date = parseISO(dateStr);
  date.setDate(date.getDate() + days);
  return format(date, 'yyyy-MM-dd');
}
