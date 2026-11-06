import { z } from 'zod';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A calendar day (YYYY-MM-DD), checked to be a real date. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must look like 2026-11-04')
  .refine((value) => toDbDate(value).toISOString().startsWith(value), 'That date does not exist');

/** `@db.Date` columns hold a day; midnight UTC keeps it from shifting across time zones. */
export function toDbDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export const fromDbDate = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * MS_PER_DAY);

/** Days before this are in the past everywhere on Earth, so a late evening in any time zone still counts. */
export function earliestEditableDate(now = new Date()): Date {
  return addDays(toDbDate(fromDbDate(now)), -1);
}
