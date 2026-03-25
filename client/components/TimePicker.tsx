import { useState } from "react";
import { X, Keyboard } from "lucide-react";

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  // Ensure value is a Date object
  const dateValue = value instanceof Date ? value : new Date();

  const [hours, setHours] = useState(dateValue.getHours());
  const [minutes, setMinutes] = useState(dateValue.getMinutes());
  const [mode, setMode] = useState<"hours" | "minutes">("hours");

  const handleClockClick = (num: number) => {
    if (mode === "hours") {
      setHours(num);
      setMode("minutes");
    } else {
      setMinutes(num * 5);
      setMode("hours");
    }
  };

  const handleConfirm = () => {
    const newDate = new Date(dateValue);
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
          <h2 className="text-lg font-bold text-slate-900">Select Time</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Time Display */}
        <div
          onClick={() => setMode(mode === "hours" ? "minutes" : "hours")}
          className="bg-gradient-to-br from-theme-600 to-theme-700 text-white text-center py-4 rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="text-5xl font-bold font-mono tracking-tight">
            <span className={mode === "hours" ? "text-theme-200" : ""}>
              {hours < 10 ? `0${hours}` : `${hours}`}
            </span>
            <span>:</span>
            <span className={mode === "minutes" ? "text-theme-200" : ""}>
              {minutes < 10 ? `0${minutes}` : `${minutes}`}
            </span>
          </div>
        </div>

        {/* Clock */}
        <div className="flex justify-center mb-6">
          <svg viewBox="0 0 240 240" className="w-72 h-72">
            {/* Outer clock circle */}
            <circle cx="120" cy="120" r="110" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />

            {/* Inner clock circle */}
            <circle cx="120" cy="120" r="70" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

            {/* Center dot with border */}
            <circle cx="120" cy="120" r="14" fill="none" stroke="#4f46e5" strokeWidth="3" />
            <circle cx="120" cy="120" r="8" fill="#4f46e5" />

            {/* Pointer */}
            {mode === "hours" ? (
              <line
                x1="120"
                y1="120"
                x2="120"
                y2={35}
                stroke="#4f46e5"
                strokeWidth="4"
                strokeLinecap="round"
                style={{
                  transform: `rotate(${(hours / 24) * 360}deg)`,
                  transformOrigin: "120px 120px",
                  transition: "transform 0.2s",
                }}
              />
            ) : (
              <line
                x1="120"
                y1="120"
                x2="120"
                y2="25"
                stroke="#4f46e5"
                strokeWidth="3"
                strokeLinecap="round"
                style={{
                  transform: `rotate(${minutes * 6}deg)`,
                  transformOrigin: "120px 120px",
                  transition: "transform 0.2s",
                }}
              />
            )}

            {/* Hour markers - 24 hours format */}
            {mode === "hours" ? (
              <>
                {/* Outer ring: 1-12 */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const hour = i === 0 ? 12 : i;
                  const angle = (i * 30) * (Math.PI / 180);
                  const x = 120 + 95 * Math.sin(angle);
                  const y = 120 - 95 * Math.cos(angle);
                  const isSelected = hours === hour;

                  return (
                    <g key={`outer-${i}`} onClick={() => handleClockClick(hour)}>
                      <circle
                        cx={x}
                        cy={y}
                        r="7"
                        fill={isSelected ? "#4f46e5" : "transparent"}
                        className="cursor-pointer hover:fill-theme-100"
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dy="0.35em"
                        fontSize="13"
                        fontWeight="600"
                        fill={isSelected ? "white" : "#1e293b"}
                        className="cursor-pointer font-semibold"
                      >
                        {hour}
                      </text>
                    </g>
                  );
                })}

                {/* Inner ring: 13-24 */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const hour = 13 + i;
                  const angle = (i * 30) * (Math.PI / 180);
                  const x = 120 + 55 * Math.sin(angle);
                  const y = 120 - 55 * Math.cos(angle);
                  const isSelected = hours === hour;

                  return (
                    <g key={`inner-${i}`} onClick={() => handleClockClick(hour)}>
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill={isSelected ? "#4f46e5" : "transparent"}
                        className="cursor-pointer hover:fill-theme-100"
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dy="0.35em"
                        fontSize="11"
                        fontWeight="500"
                        fill={isSelected ? "white" : "#64748b"}
                        className="cursor-pointer"
                      >
                        {hour}
                      </text>
                    </g>
                  );
                })}
              </>
            ) : (
              // Show 12 minutes (0, 5, 10, ... 55)
              Array.from({ length: 12 }).map((_, i) => {
                const minute = i * 5;
                const angle = (i * 30) * (Math.PI / 180);
                const x = 120 + 95 * Math.sin(angle);
                const y = 120 - 95 * Math.cos(angle);
                const isSelected = minutes === minute;

                return (
                  <g key={`minute-${i}`} onClick={() => handleClockClick(i)}>
                    <circle
                      cx={x}
                      cy={y}
                      r="7"
                      fill={isSelected ? "#4f46e5" : "transparent"}
                      className="cursor-pointer hover:fill-theme-100"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize="12"
                      fontWeight="600"
                      fill={isSelected ? "white" : "#1e293b"}
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
        <div className="flex gap-3 justify-between items-center mt-6">
          <button
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            title="Keyboard input"
          >
            <Keyboard size={20} />
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-theme-600 font-semibold hover:text-theme-700 transition-colors text-sm"
            >
              CANCEL
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-theme-600 font-semibold hover:text-theme-700 transition-colors text-sm"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
