export interface Transaction {
  id: string;
  date: Date;
  time: string;
  category: string;
  amount: number;
  description: string;
  accountName: string;
  accountId: string;
  type: "income" | "expense";
  isRepeat?: boolean;
  isTransfer?: boolean;
  ledgerName?: string;  // cross-ledger transfer: name of the destination ledger
  currency?: string;
  exchangeRate?: number;
  currencyAmount?: number;
}

const categories = [
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Utilities",
  "Salary",
  "Bonus",
];

const accounts = [
  { id: "uob", name: "UOB" },
  { id: "banka", name: "BankA" },
  { id: "krungsri", name: "Krungsri" },
  { id: "bangkok", name: "Bangkok Bank" },
  { id: "kasikorn", name: "Kasikornbank" },
  { id: "tmb", name: "TMB" },
  { id: "scb", name: "SCB" },
  { id: "acme", name: "ACME" },
  { id: "cash", name: "Cash" },
];

const descriptions: Record<string, string[]> = {
  Food: ["Breakfast", "Lunch", "Dinner", "Coffee", "Snacks", "Groceries"],
  Transport: ["Taxi", "BTS Card", "Uber", "Bus Fare", "Parking", "Gas"],
  Entertainment: ["Movie", "Concert", "Gaming", "Streaming", "Sports"],
  Shopping: ["Clothes", "Electronics", "Books", "Home Decor", "Shoes"],
  Bills: ["Electricity", "Water", "Internet", "Phone Bill", "Rent"],
  Health: ["Doctor", "Medicine", "Gym", "Pharmacy", "Haircut"],
  Education: ["Course", "Books", "Tuition", "Workshop", "Training"],
  Utilities: ["Maintenance", "Repair", "Cleaning", "Service", "Subscription"],
  Salary: ["Monthly Salary", "Paycheck", "Income", "Advance"],
  Bonus: ["Bonus", "Commission", "Tip", "Refund"],
};

// Use a fixed seed for consistent random generation
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const generateAllTransactions = (): Record<string, Transaction> => {
  const transactions: Record<string, Transaction> = {};
  let id = 1;
  const today = new Date();

  // Generate for 6 weeks (42 days)
  for (let i = 41; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // 5 transactions per day
    for (let j = 0; j < 5; j++) {
      const seed = id * 12345; // Use ID as seed for consistency
      
      const categoryIndex = Math.floor(seededRandom(seed) * categories.length);
      const category = categories[categoryIndex];

      const categoryDescriptions = descriptions[category];
      const descIndex = Math.floor(seededRandom(seed + 1) * categoryDescriptions.length);
      const description = categoryDescriptions[descIndex];

      // Account based on seed
      const accountIndex = Math.floor(seededRandom(seed + 5) * accounts.length);
      const account = accounts[accountIndex];

      // Type (income or expense)
      const type: "income" | "expense" = (category === "Salary" || category === "Bonus") ? "income" : "expense";

      // Amount based on category
      let amount = 0;
      if (type === "income") {
        amount = Math.floor(seededRandom(seed + 2) * 20000 + 10000);
      } else {
        amount = Math.floor(seededRandom(seed + 2) * 5000 + 100);
      }

      // Time based on seed
      const hours = Math.floor(seededRandom(seed + 3) * 18) + 6;
      const minutes = Math.floor(seededRandom(seed + 4) * 60);
      const time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

      transactions[id.toString()] = {
        id: id.toString(),
        date: new Date(date),
        time,
        category,
        amount,
        description,
        accountName: account.name,
        accountId: account.id,
        type,
      };

      id++;
    }
  }

  return transactions;
};

// Cache the generated transactions
let transactionCache: Record<string, Transaction> | null = null;

export const getTransactions = (): Record<string, Transaction> => {
  if (!transactionCache) {
    transactionCache = generateAllTransactions();
  }
  return transactionCache;
};

export const getTransaction = (id: string): Transaction | undefined => {
  // Search real user transactions first
  const real = getRealTransactionsList();
  const realFound = real.find((t) => t.id === id);
  if (realFound) return realFound;
  // Fallback to generated demo data
  return getTransactions()[id];
};

export const getTransactionsList = (): Transaction[] => {
  return Object.values(getTransactions());
};

export const updateTransaction = (id: string, updates: Partial<Transaction>): void => {
  const transactions = getTransactions();
  if (transactions[id]) {
    transactions[id] = { ...transactions[id], ...updates };
  }
};

// Default category/account name lookup (fallback when localStorage is empty)
const defaultCategoryNames: Record<string, { name: string; type: "income" | "expense" }> = {
  food: { name: "Food", type: "expense" },
  transport: { name: "Transport", type: "expense" },
  entertainment: { name: "Entertainment", type: "expense" },
  shopping: { name: "Shopping", type: "expense" },
  bills: { name: "Bills", type: "expense" },
  health: { name: "Health", type: "expense" },
  education: { name: "Education", type: "expense" },
  utilities: { name: "Utilities", type: "expense" },
  salary: { name: "Salary", type: "income" },
  bonus: { name: "Bonus", type: "income" },
  freelance: { name: "Freelance", type: "income" },
  other: { name: "Other", type: "expense" },
  travel: { name: "Travel", type: "expense" },
  gifts: { name: "Gifts", type: "expense" },
  sports: { name: "Sports", type: "expense" },
  clothing: { name: "Clothing", type: "expense" },
  investment: { name: "Investment", type: "income" },
  rental: { name: "Rental", type: "income" },
  food_delivery: { name: "Food Delivery", type: "expense" },
  subscription: { name: "Subscription", type: "expense" },
  insurance: { name: "Insurance", type: "expense" },
  car: { name: "Car", type: "expense" },
  phone: { name: "Phone", type: "expense" },
  internet: { name: "Internet", type: "expense" },
  hobby: { name: "Hobby", type: "expense" },
  pets: { name: "Pets", type: "expense" },
  childcare: { name: "Childcare", type: "expense" },
  loan: { name: "Loan", type: "expense" },
  nocat: { name: "No Category", type: "expense" },
  transfer_out: { name: "Transfer", type: "expense" },
  transfer_in: { name: "Transfer", type: "income" },
};

const defaultAccountNames: Record<string, string> = {
  kbank: "KBank", scb: "SCB", uob: "UOB", travel_card: "Travel Card", cash: "Cash",
  // legacy ids (for old data)
  banka: "BankA", krungsri: "Krungsri", bangkok: "Bangkok Bank",
  kasikorn: "Kasikornbank", tmb: "TMB", acme: "ACME",
  crypto: "Crypto", baht_pay: "Baht Pay", other_acc: "Other",
  revolut: "Revolut", wise: "Wise", stripe: "Stripe", paypal: "PayPal",
};

import { lk } from "./ledgerStorage";

// Read real transactions saved by the user from localStorage
export const getRealTransactionsList = (): Transaction[] => {
  try {
    const stored = localStorage.getItem(lk("app_transactions"));
    if (!stored) return [];

    const raw: any[] = JSON.parse(stored);
    const storedCats: any[] = JSON.parse(localStorage.getItem(lk("app_categories")) || "[]");
    const storedAccs: any[] = JSON.parse(localStorage.getItem(lk("app_accounts")) || "[]");

    return raw.map((t): Transaction => {
      const cat = storedCats.find((c) => c.id === t.categoryId) || defaultCategoryNames[t.categoryId];
      const acc = storedAccs.find((a) => a.id === t.accountId);
      const accName = acc?.name || defaultAccountNames[t.accountId] || t.accountId;
      const catName = (cat as any)?.name || t.categoryId;
      const catType: "income" | "expense" = (cat as any)?.type === "income" ? "income" : "expense";
      const date = new Date(t.date);

      return {
        id: t.id,
        date,
        time: t.time || date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        category: catName,
        amount: Number(t.amount) || 0,
        description: t.description || "",
        accountName: accName,
        accountId: t.accountId,
        type: catType,
        isRepeat: t.isRepeat || false,
        isTransfer: t.isTransfer || t.categoryId === "transfer_out" || t.categoryId === "transfer_in",
        ledgerName: t.ledgerName,
        ...(t.currency ? { currency: t.currency, exchangeRate: Number(t.exchangeRate) || 1, currencyAmount: Number(t.currencyAmount) || 0 } : {}),
      };
    });
  } catch (e) {
    return [];
  }
};
