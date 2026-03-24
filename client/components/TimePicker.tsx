import { useState } from "react";
import { X } from "lucide-react";

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  const [hours, setHours] = useState(value.getHours());
  const [minutes, setMinutes] = useState(value.getMinutes());
  const [mode, setMode] = useState<"hours" | "minutes">("hours");

  const handleClockClick = (num: number) => {
    if (mode === "hours") {
      setHours(num % 24);
      setMode("minutes");
    } else {
      setMinutes(num * 5);
      setMode("hours");
    }
  };

  const handleConfirm = () => {
    const newDate = new Date(value);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    onChange(newDate);
    onClose();
  };

  const formatTime = () => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">Set Time</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Time Display */}
        <div className="bg-teal-600 text-white text-center py-4 rounded-lg mb-4">
          <div className="text-4xl font-bold font-mono">{formatTime()}</div>
        </div>

        {/* Clock */}
        <div className="flex justify-center mb-6">
          <svg viewBox="0 0 200 200" className="w-64 h-64">
            {/* Clock circle */}
            <circle cx="100" cy="100" r="95" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />

            {/* Center dot */}
            <circle cx="100" cy="100" r="6" fill="#14b8a6" />

            {/* Pointer */}
            {mode === "hours" ? (
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="40"
                stroke="#14b8a6"
                strokeWidth="3"
                strokeLinecap="round"
                style={{
                  transform: `rotate(${(hours % 12) * 30}deg)`,
                  transformOrigin: "100px 100px",
                  transition: "transform 0.2s",
                }}
              />
            ) : (
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="30"
                stroke="#14b8a6"
                strokeWidth="2"
                strokeLinecap="round"
                style={{
                  transform: `rotate(${minutes * 6}deg)`,
                  transformOrigin: "100px 100px",
                  transition: "transform 0.2s",
                }}
              />
            )}

            {/* Hour markers */}
            {mode === "hours" ? (
              // Show 12 hours
              Array.from({ length: 12 }).map((_, i) => {
                const hour = i === 0 ? 12 : i;
                const angle = (i * 30) * (Math.PI / 180);
                const x = 100 + 70 * Math.sin(angle);
                const y = 100 - 70 * Math.cos(angle);
                const isSelected = hours === hour || (hours >= 12 && hour === hours - 12);

                return (
                  <g key={i} onClick={() => handleClockClick(hour)}>
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill={isSelected ? "#14b8a6" : "transparent"}
                      className="cursor-pointer"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dy="0.3em"
                      fontSize="14"
                      fontWeight="500"
                      fill={isSelected ? "white" : "#475569"}
                      className="cursor-pointer"
                    >
                      {hour}
                    </text>
                  </g>
                );
              })
            ) : (
              // Show 12 minutes (0, 5, 10, ... 55)
              Array.from({ length: 12 }).map((_, i) => {
                const minute = i * 5;
                const angle = (i * 30) * (Math.PI / 180);
                const x = 100 + 70 * Math.sin(angle);
                const y = 100 - 70 * Math.cos(angle);
                const isSelected = minutes === minute;

                return (
                  <g key={i} onClick={() => handleClockClick(i)}>
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill={isSelected ? "#14b8a6" : "transparent"}
                      className="cursor-pointer"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dy="0.3em"
                      fontSize="12"
                      fontWeight="500"
                      fill={isSelected ? "white" : "#475569"}
                      className="cursor-pointer"
                    >
                      {minute.toString().padStart(2, "0")}
                    </text>
                  </g>
                );
              })
            )}
          </svg>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            OK
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
