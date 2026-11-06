export interface DayItem {
  dateString: string; // YYYY-MM-DD
  dayName: string; // Mon, Tue, etc.
  dayNumber: number; // 1 - 31
  isToday: boolean;
  isSelected: boolean;
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateKey(): string {
  return formatDateKey(new Date());
}

export function parseDateKey(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDateKey(dateStr);
  const todayKey = getTodayDateKey();

  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (dateStr === todayKey) {
    return `Today, ${formatted}`;
  }
  return formatted;
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDateKey(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

/** Sunday-first week containing `referenceDateStr`. */
export function getWeekDays(
  referenceDateStr: string,
  selectedDateStr: string,
  todayKey: string = getTodayDateKey(),
): DayItem[] {
  const refDate = parseDateKey(referenceDateStr);
  const sunday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - refDate.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const current = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
    const dateString = formatDateKey(current);
    return {
      dateString,
      dayName: current.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
      dayNumber: current.getDate(),
      isToday: dateString === todayKey,
      isSelected: dateString === selectedDateStr,
    };
  });
}

/** e.g. "Oct 25 – 31" or "Oct 29 – Nov 4"; the year is added only outside the current year. */
export function formatWeekTitle(days: DayItem[]): string {
  const start = parseDateKey(days[0].dateString);
  const end = parseDateKey(days[days.length - 1].dateString);
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endLabel = startMonth === endMonth ? `${end.getDate()}` : `${endMonth} ${end.getDate()}`;
  const title = `${startMonth} ${start.getDate()} – ${endLabel}`;
  const currentYear = new Date().getFullYear();
  const isCurrentYear = start.getFullYear() === currentYear && end.getFullYear() === currentYear;
  return isCurrentYear ? title : `${title}, ${end.getFullYear()}`;
}
