import { useState } from "react";
import { ChevronUp, ChevronDown, Lock, LockOpen } from "lucide-react";

export default function Index() {
  const [display, setDisplay] = useState("0");
  const [value, setValue] = useState(0);
  const [numpadSize, setNumpadSize] = useState(80);
  const [numpadOffset, setNumpadOffset] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

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

  const handleMoveUp = () => {
    if (!isLocked) {
      setNumpadOffset(0);
    }
  };

  const handleMoveDown = () => {
    if (!isLocked) {
      setNumpadOffset((prev) => prev + 5);
    }
  };

  const handleToggleLock = () => {
    setIsLocked(!isLocked);
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

          {/* Size Controls Row - Full width, moves with numpad */}
          <div
            style={{
              transform: `translateY(${numpadOffset}px)`,
              transition: "transform 0.1s ease-out",
            }}
            className="px-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200 py-4 mb-0"
          >
            <div className="flex gap-4 items-center">
              {[75, 80, 85].map((size) => (
                <button
                  key={size}
                  onClick={() => setNumpadSize(size)}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    numpadSize === size
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {size}%
                </button>
              ))}

              {/* Full Button */}
              <button
                onClick={() => setNumpadSize(100)}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                  numpadSize === 100
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Full
              </button>

              {/* Right Toggle Button */}
              <button
                className="flex-1 py-2 rounded-lg font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                title="Toggle right position"
              >
                Right
              </button>
            </div>
          </div>

          {/* Header Section - Moved between percentage controls and numpad, moves with numpad */}
          <div
            style={{
              transform: `translateY(${numpadOffset}px)`,
              transition: "transform 0.1s ease-out",
            }}
            className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-3 py-4"
          >
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              ฿{display}
            </div>
          </div>

          {/* Numpad Section */}
          <div className="relative px-6 py-2 min-h-96 flex gap-4">
            {/* Numpad Container with dynamic sizing and positioning */}
            <div
              style={{
                width: `${numpadSize}%`,
                transform: `translateY(${numpadOffset}px)`,
                transition: "transform 0.1s ease-out",
              }}
            >
              {/* Numpad Grid - First 3 rows (3 columns) */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {/* Row 1: 7, 8, 9 */}
                <button
                  onClick={() => handleNumberClick(7)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  7
                </button>
                <button
                  onClick={() => handleNumberClick(8)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  8
                </button>
                <button
                  onClick={() => handleNumberClick(9)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  9
                </button>

                {/* Row 2: 4, 5, 6 */}
                <button
                  onClick={() => handleNumberClick(4)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  4
                </button>
                <button
                  onClick={() => handleNumberClick(5)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  5
                </button>
                <button
                  onClick={() => handleNumberClick(6)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  6
                </button>

                {/* Row 3: 1, 2, 3 */}
                <button
                  onClick={() => handleNumberClick(1)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  1
                </button>
                <button
                  onClick={() => handleNumberClick(2)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  2
                </button>
                <button
                  onClick={() => handleNumberClick(3)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  3
                </button>
              </div>

              {/* Numpad Grid - Row 4 (4 columns) */}
              <div className="grid grid-cols-4 gap-3">
                {/* Row 4: Save, 0, ., DEL */}
                <button
                  onClick={handleConfirm}
                  className="py-4 px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md"
                >
                  Save
                </button>
                <button
                  onClick={() => handleNumberClick(0)}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  0
                </button>
                <button
                  onClick={handleDecimal}
                  className="py-4 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  .
                </button>
                <button
                  onClick={handleDelete}
                  className="py-4 px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  ⌫
                </button>
              </div>
            </div>

            {/* Up/Down/Lock Buttons - Aligned right with numpad rows, moves with numpad */}
            <div
              className="flex flex-col gap-3 flex-1"
              style={{
                transform: `translateY(${numpadOffset}px)`,
                transition: "transform 0.1s ease-out",
              }}
            >
              <button
                onClick={handleMoveUp}
                disabled={isLocked}
                className={`px-3 rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center ${
                  isLocked
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 font-bold"
                }`}
                style={{ height: "calc(2 * 3.5rem + 12px)" }}
                title={isLocked ? "Position locked" : "Move up (5px)"}
              >
                <ChevronUp size={32} />
              </button>
              <button
                onClick={handleMoveDown}
                disabled={isLocked}
                className={`px-3 rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center ${
                  isLocked
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 font-bold"
                }`}
                style={{ height: "calc(2 * 3.5rem + 12px)" }}
                title={isLocked ? "Position locked" : "Move down (5px)"}
              >
                <ChevronDown size={32} />
              </button>
              <button
                onClick={handleToggleLock}
                className={`px-3 rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center font-bold ${
                  isLocked
                    ? "bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white"
                    : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700"
                }`}
                style={{ height: "calc(3.5rem)" }}
                title={isLocked ? "Unlock position" : "Lock position"}
              >
                {isLocked ? <Lock size={24} /> : <LockOpen size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
