// Pay-date helpers shared by controllers and cron jobs.
// They mirror the smart contract's _nextPayDate exactly:
//  - payDay null/0  -> next date = current + cycleTime days
//  - payDay 1..28   -> same time of day (UTC), next month, on that day

const DAY_MS = 24 * 60 * 60 * 1000;

export const nextPayDate = (
  current: Date,
  cycleTime: number,
  payDay?: number | null
): Date => {
  if (!payDay) return new Date(current.getTime() + cycleTime * DAY_MS);
  return new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth() + 1, // month 12 rolls into next year automatically
      payDay,
      current.getUTCHours(),
      current.getUTCMinutes(),
      current.getUTCSeconds(),
      current.getUTCMilliseconds()
    )
  );
};

/** Pay dates for `count` payouts, the first one being `firstDate`. */
export const buildPayoutSchedule = (
  firstDate: Date,
  count: number,
  cycleTime: number,
  payDay?: number | null
): Date[] => {
  const dates: Date[] = [];
  let current = new Date(firstDate);
  for (let i = 0; i < count; i++) {
    dates.push(current);
    current = nextPayDate(current, cycleTime, payDay);
  }
  return dates;
};

/** True when `date` falls on `payDay` in UTC (what the contract checks). */
export const fallsOnPayDayUtc = (date: Date, payDay: number): boolean =>
  date.getUTCDate() === payDay;