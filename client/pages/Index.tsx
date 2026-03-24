import { useState } from "react";

export default function Index() {
  const [display, setDisplay] = useState("0");
  const [value, setValue] = useState(0);

  const handleNumberClick = (num: number) => {
    if (display === "0") {
      setDisplay(num.toString());
      setValue(num);
    } else {
      const newValue = display + num.toString();
      setDisplay(newValue);
      setValue(parseFloat(newValue));
    }
  };

  const handleDecimal = () => {
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setValue(0);
  };

  const handleDelete = () => {
    const newDisplay = display.slice(0, -1) || "0";
    setDisplay(newDisplay);
    setValue(parseFloat(newDisplay) || 0);
  };

  const handleConfirm = () => {
    console.log("Expense entered:", value);
    handleClear();
  };

  const numpadButtons = [
    { label: "7", value: 7 },
    { label: "8", value: 8 },
    { label: "9", value: 9 },
    { label: "4", value: 4 },
    { label: "5", value: 5 },
    { label: "6", value: 6 },
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-8">
            <h1 className="text-white text-sm font-semibold opacity-80 mb-2">
              Enter Amount
            </h1>
            <div className="text-5xl font-bold text-white font-mono tracking-tight">
              ${display}
            </div>
          </div>

          {/* Display Buttons Section */}
          <div className="px-6 py-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <button className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors">
                Food
              </button>
              <button className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors">
                Transport
              </button>
              <button className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors">
                Entertainment
              </button>
              <button className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors">
                Shopping
              </button>
              <button className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors">
                Bills
              </button>
              <button className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors">
                Other
              </button>
            </div>
          </div>

          {/* Numpad Section */}
          <div className="px-6 py-8">
            {/* Number Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {numpadButtons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => handleNumberClick(btn.value)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <button
                onClick={handleDecimal}
                className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
              >
                .
              </button>
              <button
                onClick={() => handleNumberClick(0)}
                className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="py-4 px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm"
              >
                ⌫
              </button>
              <button
                onClick={handleClear}
                className="py-4 px-2 bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm"
              >
                C
              </button>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-lg rounded-xl transition-all active:scale-95 shadow-lg"
            >
              Add Expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
