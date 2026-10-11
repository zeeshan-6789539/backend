const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A UTC timestamp `days` before `from`, pinned to the given hour for readable fixtures
export const daysAgo = (days: number, hour = 10, from: Date = new Date()): Date => {
  const date = new Date(from.getTime() - days * MS_PER_DAY);
  date.setUTCHours(hour, 0, 0, 0);

  return date;
};
