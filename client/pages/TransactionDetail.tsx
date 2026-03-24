import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Edit, Trash2 } from "lucide-react";
import { useState } from "react";

interface Transaction {
  id: string;
  date: Date;
  time: string;
  category: string;
  amount: number;
  description: string;
}

const accountData: Record<string, { name: string; type: string }> = {
  uob: { name: "UOB", type: "credit card" },
  banka: { name: "BankA", type: "debit card" },
  krungsri: { name: "Krungsri", type: "savings account" },
  bangkok: { name: "Bangkok Bank", type: "credit card" },
  kasikorn: { name: "Kasikornbank", type: "debit card" },
  tmb: { name: "TMB", type: "savings account" },
  scb: { name: "SCB", type: "credit card" },
  acme: { name: "ACME", type: "debit card" },
  cash: { name: "Cash", type: "cash" },
  crypto: { name: "Crypto", type: "cryptocurrency" },
  baht_pay: { name: "Baht Pay", type: "digital wallet" },
  other_acc: { name: "Other", type: "other" },
};

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

// Generate sample transactions for finding by ID
const generateSampleTransactions = (): Record<string, Transaction> => {
  const transactions: Record<string, Transaction> = {};
  let id = 1;
  const today = new Date();

  for (let i = 41; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    for (let j = 0; j < 5; j++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const categoryDescriptions = descriptions[category];
      const description =
        categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];

      let amount = 0;
      if (category === "Salary" || category === "Bonus") {
        amount = Math.random() * 20000 + 10000;
      } else {
        amount = Math.random() * 5000 + 100;
      }

      const hours = Math.floor(Math.random() * 18) + 6;
      const minutes = Math.floor(Math.random() * 60);
      const time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

      transactions[id.toString()] = {
        id: id.toString(),
        date: new Date(date),
        time,
        category,
        amount: Math.round(amount),
        description,
      };

      id++;
    }
  }

  return transactions;
};

const allTransactions = generateSampleTransactions();

export default function TransactionDetail() {
  const { accountId, transactionId } = useParams();
  const navigate = useNavigate();
  const account = accountData[accountId || ""];
  const transaction = transactionId ? allTransactions[transactionId] : null;
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(transaction?.description || "");

  if (!account || !transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Transaction not found</h1>
        </div>
      </div>
    );
  }

  const handleSaveEdit = () => {
    // In a real app, this would update the backend
    console.log("Updated description:", editedDescription);
    setIsEditing(false);
  };

  const handleDelete = () => {
    // In a real app, this would delete from backend
    console.log("Deleted transaction:", transactionId);
    navigate(`/account/${accountId}/transactions`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200 flex items-center gap-3">
            <button
              onClick={() => navigate(`/account/${accountId}/transactions`)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} className="text-slate-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{account.name}</h1>
              <p className="text-xs text-slate-600">{account.type}</p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="px-6 py-6 flex-1 space-y-4">
            {/* Category & Description */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-600">Category</h2>
              <p className="text-2xl font-bold text-slate-900">{transaction.category}</p>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-600">Date</h3>
                <p className="text-lg font-bold text-slate-900">
                  {transaction.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-600">Time</h3>
                <p className="text-lg font-bold text-slate-900">{transaction.time}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2 p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg">
              <h3 className="text-sm font-semibold text-indigo-700">Amount</h3>
              <p className="text-3xl font-bold text-indigo-900">
                {transaction.amount > 0 ? "+" : ""}{transaction.amount}฿
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-600">Description</h3>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedDescription(transaction.description);
                      }}
                      className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-lg text-slate-700 p-3 bg-slate-50 rounded-lg">
                  {editedDescription}
                </p>
              )}
            </div>

            {/* Transaction ID */}
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold text-slate-600">Transaction ID</h3>
              <p className="text-slate-600 font-mono">{transaction.id}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200 flex gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Edit size={20} />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
