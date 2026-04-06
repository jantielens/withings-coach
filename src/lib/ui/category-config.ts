import { BPCategory } from '@/lib/types/metrics';

export interface CategoryStyle {
  label: string;
  classes: string;
  dotColor: string;
  zoneBg: string;
  barColor: string;
  /** Severity rank: higher = worse. Used to determine "worst" category in a day. */
  severity: number;
}

export const categoryConfig: Record<BPCategory, CategoryStyle> = {
  [BPCategory.OPTIMAL]: {
    label: 'Optimal',
    classes: 'bg-green-100 text-green-800',
    dotColor: 'bg-green-500',
    zoneBg: 'bg-green-50/40',
    barColor: 'bg-green-400',
    severity: 0,
  },
  [BPCategory.NORMAL]: {
    label: 'Normal',
    classes: 'bg-green-50 text-green-700',
    dotColor: 'bg-green-400',
    zoneBg: 'bg-green-50/30',
    barColor: 'bg-green-300',
    severity: 1,
  },
  [BPCategory.HIGH_NORMAL]: {
    label: 'High Normal',
    classes: 'bg-yellow-100 text-yellow-800',
    dotColor: 'bg-yellow-500',
    zoneBg: 'bg-yellow-50/40',
    barColor: 'bg-yellow-400',
    severity: 2,
  },
  [BPCategory.GRADE_1]: {
    label: 'Grade 1',
    classes: 'bg-orange-100 text-orange-800',
    dotColor: 'bg-orange-500',
    zoneBg: 'bg-orange-50/40',
    barColor: 'bg-orange-400',
    severity: 3,
  },
  [BPCategory.GRADE_2]: {
    label: 'Grade 2',
    classes: 'bg-red-100 text-red-800',
    dotColor: 'bg-red-500',
    zoneBg: 'bg-red-50/40',
    barColor: 'bg-red-400',
    severity: 4,
  },
  [BPCategory.GRADE_3]: {
    label: 'Grade 3',
    classes: 'bg-red-200 text-red-900',
    dotColor: 'bg-red-700',
    zoneBg: 'bg-red-50/60',
    barColor: 'bg-red-600',
    severity: 5,
  },
  [BPCategory.ISOLATED_SYSTOLIC]: {
    label: 'Isolated Systolic',
    classes: 'bg-purple-100 text-purple-800',
    dotColor: 'bg-purple-500',
    zoneBg: 'bg-purple-50/40',
    barColor: 'bg-purple-400',
    severity: 3,
  },
};

/** Categories ordered by severity for zone legend display */
export const zoneLegendCategories: BPCategory[] = [
  BPCategory.OPTIMAL,
  BPCategory.NORMAL,
  BPCategory.HIGH_NORMAL,
  BPCategory.GRADE_1,
  BPCategory.GRADE_2,
  BPCategory.GRADE_3,
  BPCategory.ISOLATED_SYSTOLIC,
];

/** Returns the worst (highest severity) category from a list */
export function worstCategory(categories: BPCategory[]): BPCategory {
  if (categories.length === 0) return BPCategory.OPTIMAL;
  return categories.reduce((worst, cat) =>
    categoryConfig[cat].severity > categoryConfig[worst].severity ? cat : worst
  );
}

/** Returns the most frequent category from a list */
export function dominantCategory(categories: BPCategory[]): BPCategory {
  if (categories.length === 0) return BPCategory.OPTIMAL;
  const counts = new Map<BPCategory, number>();
  for (const cat of categories) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  let best = categories[0];
  let bestCount = 0;
  for (const [cat, count] of counts) {
    if (count > bestCount || (count === bestCount && categoryConfig[cat].severity > categoryConfig[best].severity)) {
      best = cat;
      bestCount = count;
    }
  }
  return best;
}

/** Returns true if any category warrants auto-expand (Grade 2+, Grade 3, ISH) */
export function hasHighRiskCategory(categories: BPCategory[]): boolean {
  return categories.some(
    (cat) =>
      cat === BPCategory.GRADE_2 ||
      cat === BPCategory.GRADE_3 ||
      cat === BPCategory.ISOLATED_SYSTOLIC
  );
}
