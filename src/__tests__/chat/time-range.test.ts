import { detectTimeRange } from '@/lib/chat/time-range';

const TODAY = new Date('2025-07-15');

function iso(daysAgo: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

describe('detectTimeRange', () => {
  it('"today" → returns today\'s date for both from and to', () => {
    const result = detectTimeRange('show me today', TODAY);
    expect(result).toEqual({ from: iso(0), to: iso(0), label: 'today' });
  });

  it('"yesterday" → returns yesterday\'s date for both from and to', () => {
    const result = detectTimeRange('what about yesterday', TODAY);
    expect(result).toEqual({
      from: iso(1),
      to: iso(1),
      label: 'yesterday',
    });
  });

  it('"last week" → 7 days back', () => {
    const result = detectTimeRange('show me last week', TODAY);
    expect(result).toEqual({ from: iso(7), to: iso(0), label: 'last 7 days' });
  });

  it('"past week" → 7 days back', () => {
    const result = detectTimeRange('past week data', TODAY);
    expect(result).toEqual({ from: iso(7), to: iso(0), label: 'last 7 days' });
  });

  it('"this week" → 7 days back', () => {
    const result = detectTimeRange('this week readings', TODAY);
    expect(result).toEqual({ from: iso(7), to: iso(0), label: 'last 7 days' });
  });

  it('"last month" → 30 days back', () => {
    const result = detectTimeRange('last month', TODAY);
    expect(result).toEqual({
      from: iso(30),
      to: iso(0),
      label: 'last 30 days',
    });
  });

  it('"past month" → 30 days back', () => {
    const result = detectTimeRange('past month please', TODAY);
    expect(result).toEqual({
      from: iso(30),
      to: iso(0),
      label: 'last 30 days',
    });
  });

  it('"last 2 weeks" → 14 days back', () => {
    const result = detectTimeRange('last 2 weeks', TODAY);
    expect(result).toEqual({
      from: iso(14),
      to: iso(0),
      label: 'last 2 weeks',
    });
  });

  it('"last 3 months" → 90 days back', () => {
    const result = detectTimeRange('last 3 months', TODAY);
    expect(result).toEqual({
      from: iso(90),
      to: iso(0),
      label: 'last 3 months',
    });
  });

  it('"last year" → 365 days back', () => {
    const result = detectTimeRange('last year overview', TODAY);
    expect(result).toEqual({
      from: iso(365),
      to: iso(0),
      label: 'last year',
    });
  });

  it('numeric word: "last two weeks" → 14 days back', () => {
    const result = detectTimeRange('last two weeks', TODAY);
    expect(result).toEqual({
      from: iso(14),
      to: iso(0),
      label: 'last 2 weeks',
    });
  });

  it('numeric word: "past three months" → 90 days back', () => {
    const result = detectTimeRange('past three months', TODAY);
    expect(result).toEqual({
      from: iso(90),
      to: iso(0),
      label: 'last 3 months',
    });
  });

  it('default: no time reference → 30 days', () => {
    const result = detectTimeRange('how is my blood pressure?', TODAY);
    expect(result).toEqual({
      from: iso(30),
      to: iso(0),
      label: 'last 30 days',
    });
  });

  it('case insensitivity: "LAST WEEK" works', () => {
    const result = detectTimeRange('LAST WEEK', TODAY);
    expect(result).toEqual({ from: iso(7), to: iso(0), label: 'last 7 days' });
  });

  it('case insensitivity: "Yesterday" works', () => {
    const result = detectTimeRange('Yesterday was bad', TODAY);
    expect(result).toEqual({
      from: iso(1),
      to: iso(1),
      label: 'yesterday',
    });
  });

  it('embedded in sentence: "How was last week?" detects last week', () => {
    const result = detectTimeRange('How was last week?', TODAY);
    expect(result).toEqual({ from: iso(7), to: iso(0), label: 'last 7 days' });
  });

  it('embedded: "Can you check my readings from the past 2 months?"', () => {
    const result = detectTimeRange(
      'Can you check my readings from the past 2 months?',
      TODAY
    );
    expect(result).toEqual({
      from: iso(60),
      to: iso(0),
      label: 'last 2 months',
    });
  });

  it('uses current date when today param is omitted', () => {
    const result = detectTimeRange('today');
    const now = new Date().toISOString().slice(0, 10);
    expect(result.from).toBe(now);
    expect(result.to).toBe(now);
  });
});
