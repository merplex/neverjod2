import { getTransactionsList } from "./transactionData";

export interface MatchResult {
  categoryId?: string;
  accountId?: string;
  amount?: number;
  description: string;
}

// Default categories and accounts with keywords
const defaultCategoriesWithKeywords: Record<string, { name: string; keywords: string[] }> = {
  food: { name: "Food", keywords: ["food", "eat", "meal", "restaurant", "dining"] },
  transport: { name: "Transport", keywords: ["transport", "taxi", "bus", "car", "fuel"] },
  entertainment: { name: "Entertainment", keywords: ["entertainment", "movie", "game", "fun"] },
  shopping: { name: "Shopping", keywords: ["shopping", "shop", "buy", "purchase"] },
  bills: { name: "Bills", keywords: ["bills", "bill", "pay"] },
  health: { name: "Health", keywords: ["health", "doctor", "medicine", "hospital"] },
  education: { name: "Education", keywords: ["education", "school", "course", "study"] },
  utilities: { name: "Utilities", keywords: ["utilities", "electric", "water", "internet"] },
  salary: { name: "Salary", keywords: ["salary", "wage", "income"] },
  bonus: { name: "Bonus", keywords: ["bonus", "incentive"] },
  freelance: { name: "Freelance", keywords: ["freelance", "freelancing", "gig"] },
  other: { name: "Other", keywords: ["other", "misc"] },
};

const defaultAccountsWithKeywords: Record<string, { name: string; keywords: string[] }> = {
  uob: { name: "UOB", keywords: ["uob", "united"] },
  banka: { name: "BankA", keywords: ["banka", "bank a"] },
  krungsri: { name: "Krungsri", keywords: ["krungsri", "krungthai"] },
  bangkok: { name: "Bangkok Bank", keywords: ["bangkok", "bank"] },
  kasikorn: { name: "Kasikornbank", keywords: ["kasikorn", "kbank"] },
  tmb: { name: "TMB", keywords: ["tmb", "thai military"] },
  scb: { name: "SCB", keywords: ["scb", "siam commercial"] },
  acme: { name: "ACME", keywords: ["acme"] },
  cash: { name: "Cash", keywords: ["cash"] },
  crypto: { name: "Crypto", keywords: ["crypto", "bitcoin", "ethereum"] },
  baht_pay: { name: "Baht Pay", keywords: ["baht pay", "bahtpay"] },
  other_acc: { name: "Other", keywords: ["other"] },
  kbank: { name: "K-Bank", keywords: ["kbank", "k-bank"] },
  revolut: { name: "Revolut", keywords: ["revolut"] },
  wise: { name: "Wise", keywords: ["wise"] },
  stripe: { name: "Stripe", keywords: ["stripe"] },
  paypal: { name: "PayPal", keywords: ["paypal", "paypal"] },
};

// Get categories from localStorage or use defaults
function getCategoriesWithKeywords(): Record<string, { name: string; keywords: string[] }> {
  try {
    const stored = localStorage.getItem("app_categories");
    if (stored) {
      const categories = JSON.parse(stored);
      const result: Record<string, { name: string; keywords: string[] }> = {};
      for (const cat of categories) {
        result[cat.id] = {
          name: cat.name,
          keywords: [...(cat.keywords || []), cat.name.toLowerCase()],
        };
      }
      return result;
    }
  } catch (e) {
    console.log("Could not load categories from localStorage");
  }
  return defaultCategoriesWithKeywords;
}

// Get accounts from localStorage or use defaults
function getAccountsWithKeywords(): Record<string, { name: string; keywords: string[] }> {
  try {
    const stored = localStorage.getItem("app_accounts");
    if (stored) {
      const accounts = JSON.parse(stored);
      const result: Record<string, { name: string; keywords: string[] }> = {};
      for (const acc of accounts) {
        result[acc.id] = {
          name: acc.name,
          keywords: [...(acc.keywords || []), acc.name.toLowerCase()],
        };
      }
      return result;
    }
  } catch (e) {
    console.log("Could not load accounts from localStorage");
  }
  return defaultAccountsWithKeywords;
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

export function matchKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase().trim();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

export function matchCategory(text: string): string | undefined {
  const categoriesWithKeywords = getCategoriesWithKeywords();
  for (const [categoryId, { keywords }] of Object.entries(categoriesWithKeywords)) {
    if (matchKeyword(text, keywords)) {
      return categoryId;
    }
  }
  return undefined;
}

export function matchAccount(text: string): string | undefined {
  const accountsWithKeywords = getAccountsWithKeywords();
  for (const [accountId, { keywords }] of Object.entries(accountsWithKeywords)) {
    if (matchKeyword(text, keywords)) {
      return accountId;
    }
  }
  return undefined;
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
