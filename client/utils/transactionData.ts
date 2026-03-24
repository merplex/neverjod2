export interface Transaction {
  id: string;
  date: Date;
  time: string;
  category: string;
  amount: number;
  description: string;
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

      // Amount based on category
      let amount = 0;
      if (category === "Salary" || category === "Bonus") {
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
