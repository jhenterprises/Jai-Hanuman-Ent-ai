import { format, isValid } from 'date-fns';

export const safeFormat = (date: any, formatStr: string, fallback: string = 'N/A') => {
  if (!date) return fallback;
  
  let d;
  if (typeof date.toDate === 'function') {
    d = date.toDate();
  } else {
    d = new Date(date);
  }

  if (!isValid(d)) return fallback;
  return format(d, formatStr);
};
