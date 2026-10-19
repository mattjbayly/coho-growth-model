import { parseISO, format, isValid, addDays, isBefore, isAfter, differenceInDays } from 'date-fns';
import { TempData } from '../types';

/**
 * Parse raw CSV rows (already header-keyed by PapaParse) into sorted, de-duplicated
 * observed temperature data. Column names are matched flexibly.
 */
export function parseTempRows(rows: any[]): { data: TempData[]; error: string | null } {
  const data: TempData[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const dateStr = row.date ?? row.Date ?? row.DATE ?? row.day ?? row.Day;
    const tempStr = row.temp_c ?? row.Temp_c ?? row.TEMP_C ?? row.temp ?? row.Temp ?? row.TEMP ?? row.temperature ?? row.Temperature;

    if (dateStr === undefined || dateStr === '' || tempStr === undefined || tempStr === '') return;

    const date = parseISO(String(dateStr));
    const temp = parseFloat(tempStr);

    if (!isValid(date)) {
      errors.push(`Row ${index + 1}: Invalid date "${dateStr}"`);
      return;
    }
    if (isNaN(temp)) {
      errors.push(`Row ${index + 1}: Non-numeric temperature "${tempStr}"`);
      return;
    }

    data.push({ date: format(date, 'yyyy-MM-dd'), temp_c: temp });
  });

  if (errors.length > 0) {
    return {
      data: [],
      error: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''),
    };
  }

  if (data.length === 0) {
    const foundHeaders = rows.length > 0 ? Object.keys(rows[0]).join(', ') : 'none';
    return {
      data: [],
      error: `No valid data found in CSV.\nExpected columns: 'date' and 'temp_c'.\nFound columns: ${foundHeaders}`,
    };
  }

  data.sort((a, b) => a.date.localeCompare(b.date));

  const seen = new Set<string>();
  for (const d of data) {
    if (seen.has(d.date)) {
      return { data: [], error: `Duplicate date found: ${d.date}` };
    }
    seen.add(d.date);
  }

  return { data, error: null };
}

/**
 * Build a daily temperature series over [startDate, endDate] from observed data,
 * filling gaps by linear interpolation. Dates outside the observed range are
 * carried flat ('carry') or omitted ('drop').
 */
export function interpolateToWindow(
  data: TempData[],
  startDate: string,
  endDate: string,
  missingHandling: 'carry' | 'drop'
): { series: TempData[]; error: string | null } {
  if (data.length === 0) return { series: [], error: null };

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) return { series: [], error: 'Invalid growth start/end date.' };
  if (isAfter(start, end)) return { series: [], error: 'Growth start date is after the end date.' };

  const dataMap = new Map(data.map(d => [d.date, d.temp_c]));
  const firstObserved = data[0];
  const lastObserved = data[data.length - 1];
  const firstDate = parseISO(firstObserved.date);
  const lastDate = parseISO(lastObserved.date);

  const totalDays = differenceInDays(end, start) + 1;
  const series: TempData[] = [];

  for (let i = 0; i < totalDays; i++) {
    const current = addDays(start, i);
    const dateStr = format(current, 'yyyy-MM-dd');

    if (dataMap.has(dateStr)) {
      series.push({ date: dateStr, temp_c: dataMap.get(dateStr)! });
      continue;
    }

    if (isBefore(current, firstDate)) {
      if (missingHandling === 'carry') {
        series.push({ date: dateStr, temp_c: firstObserved.temp_c, interpolated: true });
      }
    } else if (isAfter(current, lastDate)) {
      if (missingHandling === 'carry') {
        series.push({ date: dateStr, temp_c: lastObserved.temp_c, interpolated: true });
      }
    } else {
      // Linear interpolation between the bracketing observations
      let prev: TempData | null = null;
      let next: TempData | null = null;
      for (let j = 0; j < data.length; j++) {
        if (isBefore(parseISO(data[j].date), current)) prev = data[j];
        if (isAfter(parseISO(data[j].date), current)) { next = data[j]; break; }
      }
      if (prev && next) {
        const d1 = parseISO(prev.date);
        const d2 = parseISO(next.date);
        const total = differenceInDays(d2, d1);
        const currentDiff = differenceInDays(current, d1);
        const temp = prev.temp_c + (next.temp_c - prev.temp_c) * (currentDiff / total);
        series.push({ date: dateStr, temp_c: temp, interpolated: true });
      }
    }
  }

  if (series.length < totalDays && missingHandling === 'drop') {
    return {
      series: [],
      error: "Data does not cover the full growth window and 'Drop Incomplete' is selected. Provide more data or use 'Carry Ends'.",
    };
  }

  return { series, error: null };
}

/** Year of the earliest observation (used to align the growth window to loaded data). */
export function yearFromData(data: TempData[]): number | null {
  if (!data.length) return null;
  const yr = parseInt(data[0].date.slice(0, 4), 10);
  return Number.isFinite(yr) ? yr : null;
}

/** Replace the year of an ISO date string, preserving month/day. */
export function withYear(dateStr: string, year: number): string {
  const d = parseISO(dateStr);
  if (!isValid(d)) return dateStr;
  return `${String(year).padStart(4, '0')}-${format(d, 'MM-dd')}`;
}
