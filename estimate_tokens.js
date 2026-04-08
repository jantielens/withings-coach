// Token estimation for BP data
// GPT-4 uses ~4 chars per token on average

const charsPerToken = 4;

// A single BP reading row in the table:
// "| 2024-04-06 | 08:15 | 128 | 82 | 68 | Normal | Single | "
// Plus optional diary text (avg ~50 chars)
const avgCharsPerReading = 80;

// System prompt + role + ESC/ESH guidelines + output format
const basePromptChars = 3312; // 828 words * 4 chars/word

// Calculate for different scenarios
function estimate(readingsPerYear, hasDiary = false) {
  const diaryOverhead = hasDiary ? 30 : 0; // avg chars per diary entry
  const totalReadingChars = readingsPerYear * (avgCharsPerReading + diaryOverhead);
  const totalChars = basePromptChars + totalReadingChars;
  const tokens = Math.ceil(totalChars / charsPerToken);
  
  return {
    readingsPerYear,
    hasDiary,
    totalChars,
    estimatedTokens: tokens,
    estimatedKB: Math.ceil(totalChars / 1024)
  };
}

console.log("Token estimates for BP data:");
console.log("=============================\n");

console.log("Base prompt (no data):", estimate(0));
console.log("\n365 readings/year (1/day):", estimate(365, false));
console.log("365 readings + diary:", estimate(365, true));
console.log("\n730 readings/year (2/day):", estimate(730, false));
console.log("730 readings + diary:", estimate(730, true));
console.log("\n1095 readings (3/day, 1 year):", estimate(1095, false));
console.log("\n2 years of data (730 readings):", estimate(1460, false));
console.log("2 years + diary:", estimate(1460, true));

console.log("\n\nContext window capacity:");
console.log("GPT-4o: 128K tokens");
console.log("GPT-4o-mini: 128K tokens");
console.log("GPT-4 Turbo: 128K tokens");
