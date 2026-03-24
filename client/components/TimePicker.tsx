import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:MM" format
  onSelect: (time: string) => void;
  onClose: () => void;
}

export default function TimePicker({ value, onSelect, onClose }: TimePickerProps) {
  const [hours, setHours] = useState(parseInt(value.split(":")[0]));
  const [minutes, setMinutes] = useState(parseInt(value.split(":")[1]));

  const incrementHours = () => {
    setHours((h) => (h + 1) % 24);
  };

  const decrementHours = () => {
    setHours((h) => (h - 1 + 24) % 24);
  };

  const incrementMinutes = () => {
    setMinutes((m) => (m + 1) % 60);
  };

  const decrementMinutes = () => {
    setMinutes((m) => (m - 1 + 60) % 60);
  };

  const handleDone = () => {
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    onSelect(timeString);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h2 className="font-bold text-lg text-slate-900 mb-6 text-center">Select Time</h2>

        {/* Time Display */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <button
              onClick={decrementHours}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors mb-2"
            >
              <ChevronUp size={24} className="text-indigo-600" />
            </button>
            <div className="text-5xl font-bold text-slate-900 w-24 text-center">
              {hours.toString().padStart(2, "0")}
            </div>
            <button
              onClick={incrementHours}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors mt-2"
            >
              <ChevronDown size={24} className="text-indigo-600" />
            </button>
          </div>

          {/* Separator */}
          <div className="text-4xl font-bold text-slate-900 mb-8">:</div>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <button
              onClick={decrementMinutes}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors mb-2"
            >
              <ChevronUp size={24} className="text-indigo-600" />
            </button>
            <div className="text-5xl font-bold text-slate-900 w-24 text-center">
              {minutes.toString().padStart(2, "0")}
            </div>
            <button
              onClick={incrementMinutes}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors mt-2"
            >
              <ChevronDown size={24} className="text-indigo-600" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
