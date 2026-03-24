import { getTransactionsList } from "./transactionData";

export interface MatchResult {
  categoryId?: string;
  accountId?: string;
  amount?: number;
  description: string;
}

// Sample categories and accounts with keywords
const categoriesWithKeywords: Record<string, { name: string; keywords: string[] }> = {
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

const accountsWithKeywords: Record<string, { name: string; keywords: string[] }> = {
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

export function extractNumberFromText(text: string): number | undefined {
  // Match numbers like "500", "50.50", "5,000"
  const numberMatch = text.match(/\d+(?:[.,]\d+)?/);
  if (numberMatch) {
    return parseFloat(numberMatch[0].replace(/,/g, ""));
  }
  return undefined;
}

export function matchKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase().trim();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

export function matchCategory(text: string): string | undefined {
  for (const [categoryId, { keywords }] of Object.entries(categoriesWithKeywords)) {
    if (matchKeyword(text, keywords)) {
      return categoryId;
    }
  }
  return undefined;
}

export function matchAccount(text: string): string | undefined {
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
