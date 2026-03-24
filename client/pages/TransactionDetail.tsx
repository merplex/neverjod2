import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { getTransaction, updateTransaction, type Transaction } from "../utils/transactionData";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";

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

export default function TransactionDetail() {
  const { accountId, transactionId } = useParams();
  const navigate = useNavigate();
  const account = accountData[accountId || ""];
  const transaction = transactionId ? getTransaction(transactionId) : null;
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(transaction?.description || "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(transaction?.date || new Date());
  const [currentTime, setCurrentTime] = useState(() => {
    const time = transaction?.time || "00:00";
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date;
  });

  if (!account || !transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4 pb-24">
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

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    if (transaction && transactionId) {
      updateTransaction(transactionId, { date });
    }
  };

  const handleTimeSelect = (timeDate: Date) => {
    setCurrentTime(timeDate);
    const timeString = `${timeDate.getHours().toString().padStart(2, "0")}:${timeDate.getMinutes().toString().padStart(2, "0")}`;
    if (transaction && transactionId) {
      updateTransaction(transactionId, { time: timeString });
    }
    setShowTimePicker(false);
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
              <button
                onClick={() => setShowDatePicker(true)}
                className="space-y-2 text-left p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <h3 className="text-sm font-semibold text-slate-600">Date</h3>
                <p className="text-lg font-bold text-slate-900">
                  {currentDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </button>
              <button
                onClick={() => setShowTimePicker(true)}
                className="space-y-2 text-left p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <h3 className="text-sm font-semibold text-slate-600">Time</h3>
                <p className="text-lg font-bold text-slate-900">
                  {currentTime.getHours().toString().padStart(2, "0")}:{currentTime.getMinutes().toString().padStart(2, "0")}
                </p>
              </button>
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

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DatePicker
          value={currentDate}
          onChange={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <TimePicker
          value={currentTime}
          onChange={handleTimeSelect}
          onClose={() => setShowTimePicker(false)}
        />
      )}
    </div>
  );
}
