export interface ResolvedDateRange {
  from: string; // ISO 8601 date (YYYY-MM-DD)
  to: string; // ISO 8601 date (YYYY-MM-DD)
  label: string; // Human-readable label, e.g. "last 7 days"
}

const WORD_TO_NUMBER: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

interface TimePattern {
  regex: RegExp;
  resolve: (match: RegExpMatchArray, today: Date) => ResolvedDateRange;
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(today: Date, days: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d;
}

function parseNumberToken(token: string): number | null {
  const n = parseInt(token, 10);
  if (!isNaN(n)) return n;
  return WORD_TO_NUMBER[token.toLowerCase()] ?? null;
}

const patterns: TimePattern[] = [
  {
    regex: /\btoday\b/i,
    resolve: (_match, today) => ({
      from: toISO(today),
      to: toISO(today),
      label: 'today',
    }),
  },
  {
    regex: /\byesterday\b/i,
    resolve: (_match, today) => {
      const d = daysAgo(today, 1);
      return { from: toISO(d), to: toISO(d), label: 'yesterday' };
    },
  },
  {
    regex: /\blast day\b/i,
    resolve: (_match, today) => {
      const d = daysAgo(today, 1);
      return { from: toISO(d), to: toISO(today), label: 'last day' };
    },
  },
  // "last N weeks/months/days/years"
  {
    regex: /\b(?:last|past)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(day|week|month|year)s?\b/i,
    resolve: (match, today) => {
      const n = parseNumberToken(match[1]);
      if (n === null) return defaultRange(today);
      const unit = match[2].toLowerCase();
      const days = unitToDays(unit, n);
      return {
        from: toISO(daysAgo(today, days)),
        to: toISO(today),
        label: `last ${n} ${unit}${n > 1 ? 's' : ''}`,
      };
    },
  },
  // "last/past/this week"
  {
    regex: /\b(?:last|past|this)\s+week\b/i,
    resolve: (_match, today) => ({
      from: toISO(daysAgo(today, 7)),
      to: toISO(today),
      label: 'last 7 days',
    }),
  },
  // "last/past/this month"
  {
    regex: /\b(?:last|past|this)\s+month\b/i,
    resolve: (_match, today) => ({
      from: toISO(daysAgo(today, 30)),
      to: toISO(today),
      label: 'last 30 days',
    }),
  },
  // "last/past year"
  {
    regex: /\b(?:last|past)\s+year\b/i,
    resolve: (_match, today) => ({
      from: toISO(daysAgo(today, 365)),
      to: toISO(today),
      label: 'last year',
    }),
  },
];

function unitToDays(unit: string, n: number): number {
  switch (unit) {
    case 'day':
      return n;
    case 'week':
      return n * 7;
    case 'month':
      return n * 30;
    case 'year':
      return n * 365;
    default:
      return n;
  }
}

function defaultRange(today: Date): ResolvedDateRange {
  return {
    from: toISO(daysAgo(today, 30)),
    to: toISO(today),
    label: 'last 30 days',
  };
}

export function detectTimeRange(query: string, today?: Date): ResolvedDateRange {
  const ref = today ?? new Date();

  for (const pattern of patterns) {
    const match = query.match(pattern.regex);
    if (match) {
      return pattern.resolve(match, ref);
    }
  }

  return defaultRange(ref);
}
