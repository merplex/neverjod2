import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export default function DatePicker({ value, onChange, onClose }: DatePickerProps) {
  // Ensure value is a Date object
  const dateValue = value instanceof Date ? value : new Date();

  const [currentDate, setCurrentDate] = useState(new Date(dateValue));
  const [displayMonth, setDisplayMonth] = useState(new Date(dateValue));

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1));
  };

  const selectDay = (day: number) => {
    const selected = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    setCurrentDate(selected);
    onChange(selected);
    onClose();
  };

  const daysInMonth = getDaysInMonth(displayMonth);
  const firstDay = getFirstDayOfMonth(displayMonth);
  const days = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = displayMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">Select Date</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Date Display */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-center py-4 rounded-lg mb-4">
          <div className="text-2xl font-bold font-mono">{formattedDate}</div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-700" />
          </button>
          <h3 className="font-bold text-lg text-slate-900">{monthName}</h3>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="text-slate-700" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div key={day} className="h-8 flex items-center justify-center text-xs font-semibold text-slate-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 mb-6">
          {days.map((day, index) => (
            <div key={index}>
              {day ? (
                <button
                  onClick={() => selectDay(day)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                    currentDate.getDate() === day &&
                    currentDate.getMonth() === displayMonth.getMonth() &&
                    currentDate.getFullYear() === displayMonth.getFullYear()
                      ? "bg-indigo-600 text-white shadow-md"
                      : "hover:bg-indigo-50 text-slate-900"
                  }`}
                >
                  {day}
                </button>
              ) : (
                <div className="w-9 h-9" />
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors text-sm"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
