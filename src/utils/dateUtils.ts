import { format, isValid } from 'date-fns';

export const safeFormat = (date: any, formatStr: string, fallback: string = 'N/A') => {
  if (!date) return fallback;
  const d = new Date(date);
  if (!isValid(d)) return fallback;
  return format(d, formatStr);
};
