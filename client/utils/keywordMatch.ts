import { getTransactionsList } from "./transactionData";

export interface MatchResult {
  categoryId?: string;
  accountId?: string;
  amount?: number;
  description: string;
}

// Default categories — keywords are managed by the user via the Categories management page
const defaultCategoriesWithKeywords: Record<string, { name: string; keywords: string[] }> = {
  food:      { name: "Food-sample",      keywords: ["อาหาร"] },
  transport: { name: "Transport-sample", keywords: ["ค่ารถ"] },
  shopping:  { name: "Shopping-sample",  keywords: ["ผลาญเงิน"] },
  house:     { name: "House-sample",     keywords: ["ของใช้ในบ้าน"] },
  travel:    { name: "Travel-sample",    keywords: ["เที่ยว"] },
  salary:    { name: "Salary-sample",    keywords: ["เงินเดือน"] },
};

// Fallback keywords for known built-in category IDs when localStorage has empty keywords
const builtinCategoryKeywords: Record<string, string[]> = {
  food:      ["อาหาร"],
  transport: ["ค่ารถ"],
  shopping:  ["ผลาญเงิน"],
  house:     ["ของใช้ในบ้าน"],
  travel:    ["เที่ยว"],
  salary:    ["เงินเดือน"],
};

// Default accounts — keywords are managed by the user via the Accounts management page
const defaultAccountsWithKeywords: Record<string, { name: string; keywords: string[] }> = {
  kbank: { name: "K-Bank-sample", keywords: ["กสิกร", "kbank"] },
  scb: { name: "SCB-sample", keywords: ["ไทยพาณิชย์", "scb"] },
  bbl: { name: "Bangkok Bank-sample", keywords: ["แบงค์กรุงเทพ", "กรุงเทพ", "bbl"] },
};

// Fallback keywords for known built-in account IDs when localStorage has empty keywords
const builtinAccountKeywords: Record<string, string[]> = {
  kbank: ["กสิกร", "kbank"],
  scb: ["ไทยพาณิชย์", "scb"],
  bbl: ["แบงค์กรุงเทพ", "กรุงเทพ", "bbl"],
};

// Normalize a string to NFC and lowercase — handles iOS vs Android speech recognition differences
function norm(s: string): string {
  return s.normalize("NFC").toLowerCase();
}

// Always include the entity's name as a keyword alongside user-defined keywords
function buildKeywordMap(
  source: Record<string, { name: string; keywords: string[] }>
): Record<string, { name: string; keywords: string[] }> {
  const result: Record<string, { name: string; keywords: string[] }> = {};
  for (const [id, { name, keywords }] of Object.entries(source)) {
    result[id] = { name, keywords: [...keywords, norm(name)] };
  }
  return result;
}

const FREE_CAT_LIMIT = 6;
const FREE_ACC_LIMIT = 3;

// Get categories from localStorage or use defaults, filtering over-limit items for free tier
function getCategoriesWithKeywords(): Record<string, { name: string; keywords: string[] }> {
  try {
    const stored = localStorage.getItem("app_categories");
    if (stored) {
      const isPremium = localStorage.getItem("app_premium") === "true";
      const categories = JSON.parse(stored);
      const reorderable = categories.filter((c: any) => c.id !== "nocat");
      const active = isPremium ? reorderable : reorderable.slice(0, FREE_CAT_LIMIT);
      const raw: Record<string, { name: string; keywords: string[] }> = {};
      for (const cat of active) {
        const stored = cat.keywords && cat.keywords.length > 0 ? cat.keywords : [];
        const fallback = stored.length === 0 ? (builtinCategoryKeywords[cat.id] || []) : [];
        raw[cat.id] = { name: cat.name, keywords: [...stored, ...fallback] };
      }
      return buildKeywordMap(raw);
    }
  } catch (e) {
    console.log("Could not load categories from localStorage");
  }
  return buildKeywordMap(defaultCategoriesWithKeywords);
}

// Get accounts from localStorage or use defaults, filtering over-limit items for free tier
function getAccountsWithKeywords(): Record<string, { name: string; keywords: string[] }> {
  try {
    const stored = localStorage.getItem("app_accounts");
    if (stored) {
      const isPremium = localStorage.getItem("app_premium") === "true";
      const accounts = JSON.parse(stored);
      const reorderable = accounts.filter((a: any) => a.id !== "account_deleted");
      const active = isPremium ? reorderable : reorderable.slice(0, FREE_ACC_LIMIT);
      const raw: Record<string, { name: string; keywords: string[] }> = {};
      for (const acc of active) {
        const stored = acc.keywords && acc.keywords.length > 0 ? acc.keywords : [];
        const fallback = stored.length === 0 ? (builtinAccountKeywords[acc.id] || []) : [];
        raw[acc.id] = { name: acc.name, keywords: [...stored, ...fallback] };
      }
      return buildKeywordMap(raw);
    }
  } catch (e) {
    console.log("Could not load accounts from localStorage");
  }
  return buildKeywordMap(defaultAccountsWithKeywords);
}

export function extractNumberFromText(text: string): number | undefined {
  // First, try to find direct numeric matches like "500", "1020", "5,000"
  const numberMatches = text.match(/\d+(?:[.,]\d+)?/g);
  if (numberMatches && numberMatches.length > 0) {
    // Find the largest number (assuming the amount is the largest number mentioned)
    let largestNumber = numberMatches[0];
    for (const num of numberMatches) {
      const val1 = parseFloat(num.replace(/,/g, ""));
      const val2 = parseFloat(largestNumber.replace(/,/g, ""));
      if (val1 > val2) {
        largestNumber = num;
      }
    }
    return parseFloat(largestNumber.replace(/,/g, ""));
  }

  // Second, try to convert word numbers to digits (English)
  const englishWordNumbers: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    hundred: 100, thousand: 1000, million: 1000000,
  };

  const lowerText = text.toLowerCase();
  let result = 0;
  let current = 0;

  for (const word of lowerText.split(/\s+/)) {
    const cleanWord = word.replace(/[^\w]/g, '');
    const num = englishWordNumbers[cleanWord];

    if (num !== undefined) {
      if (num >= 1000) {
        result += current * num;
        current = 0;
      } else if (num === 100) {
        current *= num;
      } else {
        current += num;
      }
    }
  }

  const total = result + current;
  return total > 0 ? total : undefined;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[m][n];
}

function wordMatchesKeyword(word: string, keyword: string, threshold = 0.7): boolean {
  if (word === keyword) return true;
  // Short keywords (1-3 chars) require exact match only
  if (keyword.length <= 3) return word === keyword;
  const dist = levenshtein(word, keyword);
  return 1 - dist / Math.max(word.length, keyword.length) >= threshold;
}

export function matchKeyword(text: string, keywords: string[]): boolean {
  return matchKeywordBestScore(text, keywords) > 0;
}

// Returns a score for the best-matching keyword (0 = no match).
// Exact substring match scores length * 1000 so it ALWAYS beats any fuzzy match,
// regardless of keyword length. Fuzzy match scores length only.
// Example: say "scb" → exact hits keyword "scb" (score 3000),
//          fuzzy might hit "jscb" (score 4) → exact wins correctly.
function matchKeywordBestScore(text: string, keywords: string[]): number {
  const lowerText = norm(text).trim();
  const condensedText = lowerText.replace(/\s+/g, "");
  const words = lowerText.split(/\s+/);
  let best = 0;

  for (const keyword of keywords) {
    const lowerKeyword = norm(keyword);
    const condensedKeyword = lowerKeyword.replace(/\s+/g, "");

    // 1. Exact substring match — high-priority score
    if (lowerText.includes(lowerKeyword) || condensedText.includes(condensedKeyword)) {
      best = Math.max(best, lowerKeyword.length * 1000);
      continue;
    }

    // 2. Per-word fuzzy match (~70% similarity) — low-priority score
    for (const word of words) {
      if (word.length < 2) continue;
      if (wordMatchesKeyword(word, lowerKeyword)) {
        best = Math.max(best, lowerKeyword.length);
        break;
      }
    }
  }

  return best;
}

export function matchCategory(text: string): string | undefined {
  const categoriesWithKeywords = getCategoriesWithKeywords();
  let bestId: string | undefined;
  let bestScore = 0;
  for (const [categoryId, { keywords }] of Object.entries(categoriesWithKeywords)) {
    const score = matchKeywordBestScore(text, keywords);
    if (score > bestScore) { bestScore = score; bestId = categoryId; }
  }
  return bestId;
}

export function matchAccount(text: string): string | undefined {
  const accountsWithKeywords = getAccountsWithKeywords();
  let bestId: string | undefined;
  let bestScore = 0;
  for (const [accountId, { keywords }] of Object.entries(accountsWithKeywords)) {
    const score = matchKeywordBestScore(text, keywords);
    if (score > bestScore) { bestScore = score; bestId = accountId; }
  }
  return bestId;
}

export function parseVoiceInput(transcript: string): MatchResult {
  // Try to match category and account from the transcript
  const categoryId = matchCategory(transcript);
  const accountId = matchAccount(transcript);
  const amount = extractNumberFromText(transcript);

  return {
    categoryId,
    accountId,
    amount,
    description: transcript,
  };
}
