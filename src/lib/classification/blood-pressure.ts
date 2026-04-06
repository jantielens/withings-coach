import { BPCategory } from '@/lib/types/metrics';

const CATEGORY_SEVERITY: Record<BPCategory, number> = {
  [BPCategory.OPTIMAL]: 0,
  [BPCategory.NORMAL]: 1,
  [BPCategory.HIGH_NORMAL]: 2,
  [BPCategory.GRADE_1]: 3,
  [BPCategory.GRADE_2]: 4,
  [BPCategory.GRADE_3]: 5,
  [BPCategory.ISOLATED_SYSTOLIC]: 3, // severity similar to Grade 1
};

function classifySystolic(systolic: number): BPCategory {
  if (systolic >= 180) return BPCategory.GRADE_3;
  if (systolic >= 160) return BPCategory.GRADE_2;
  if (systolic >= 140) return BPCategory.GRADE_1;
  if (systolic >= 130) return BPCategory.HIGH_NORMAL;
  if (systolic >= 120) return BPCategory.NORMAL;
  return BPCategory.OPTIMAL;
}

function classifyDiastolic(diastolic: number): BPCategory {
  if (diastolic >= 110) return BPCategory.GRADE_3;
  if (diastolic >= 100) return BPCategory.GRADE_2;
  if (diastolic >= 90) return BPCategory.GRADE_1;
  if (diastolic >= 85) return BPCategory.HIGH_NORMAL;
  if (diastolic >= 80) return BPCategory.NORMAL;
  return BPCategory.OPTIMAL;
}

/**
 * Classify a blood pressure reading using ESC/ESH 2018 thresholds.
 * When systolic and diastolic fall into different categories,
 * the higher severity category is assigned.
 * Isolated Systolic Hypertension: systolic >= 140 AND diastolic < 90.
 */
export function classifyBloodPressure(systolic: number, diastolic: number): BPCategory {
  // Check for Isolated Systolic Hypertension first
  if (systolic >= 140 && diastolic < 90) {
    return BPCategory.ISOLATED_SYSTOLIC;
  }

  const systolicCategory = classifySystolic(systolic);
  const diastolicCategory = classifyDiastolic(diastolic);

  if (CATEGORY_SEVERITY[systolicCategory] >= CATEGORY_SEVERITY[diastolicCategory]) {
    return systolicCategory;
  }
  return diastolicCategory;
}
