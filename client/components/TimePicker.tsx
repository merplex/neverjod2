import { useState } from "react";
import { X, Keyboard } from "lucide-react";

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  const dateValue = value instanceof Date ? value : new Date();

  const [hours, setHours] = useState(dateValue.getHours());
  const [minutes, setMinutes] = useState(dateValue.getMinutes());
  const [mode, setMode] = useState<"hours" | "minutes">("hours");

  // Called only for hour number clicks
  const handleHourClick = (num: number) => {
    setHours(num);
    setMode("minutes");
  };

  // Handles tap anywhere on SVG in minutes mode
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== "minutes") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (240 / rect.width);
    const svgY = (e.clientY - rect.top) * (240 / rect.height);
    const dx = svgX - 120;
    const dy = svgY - 120;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 25) return;
    let angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angleDeg < 0) angleDeg += 360;
    const minute = Math.round(angleDeg / 6) % 60;
    setMinutes(minute);
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
          <svg viewBox="0 0 240 240" className="w-72 h-72" onClick={handleSvgClick} style={{ cursor: mode === "minutes" ? "pointer" : "default" }}>
            {/* Outer clock circle */}
            <circle cx="120" cy="120" r="110" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />

            {/* Inner clock circle */}
            <circle cx="120" cy="120" r="70" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

            {/* Center dot */}
            <circle cx="120" cy="120" r="14" fill="none" stroke="#4f46e5" strokeWidth="3" />
            <circle cx="120" cy="120" r="8" fill="#4f46e5" />

            {/* Pointer */}
            {mode === "hours" ? (
              <line
                x1="120" y1="120" x2="120" y2={35}
                stroke="#4f46e5" strokeWidth="4" strokeLinecap="round"
                style={{
                  transform: `rotate(${(hours / 24) * 360}deg)`,
                  transformOrigin: "120px 120px",
                  transition: "transform 0.2s",
                }}
              />
            ) : (
              <g style={{
                transform: `rotate(${minutes * 6}deg)`,
                transformOrigin: "120px 120px",
                transition: "transform 0.2s",
              }}>
                <line x1="120" y1="120" x2="120" y2="32" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
                <circle cx="120" cy="32" r="10" fill="#4f46e5" />
              </g>
            )}

            {/* Hour markers */}
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
                    <g key={`outer-${i}`} onClick={() => handleHourClick(hour)}>
                      <circle cx={x} cy={y} r="14" fill="transparent" className="cursor-pointer" />
                      <text x={x} y={y} textAnchor="middle" dy="0.35em" fontSize="13"
                        fontWeight={isSelected ? "700" : "600"}
                        fill={isSelected ? "#4f46e5" : "#1e293b"}
                        className="cursor-pointer"
                      >{hour}</text>
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
                    <g key={`inner-${i}`} onClick={() => handleHourClick(hour)}>
                      <circle cx={x} cy={y} r="12" fill="transparent" className="cursor-pointer" />
                      <text x={x} y={y} textAnchor="middle" dy="0.35em" fontSize="11"
                        fontWeight={isSelected ? "700" : "500"}
                        fill={isSelected ? "#4f46e5" : "#64748b"}
                        className="cursor-pointer"
                      >{hour}</text>
                    </g>
                  );
                })}
              </>
            ) : (
              <>
                {/* 60 tick marks: long every 5 min, short every 1 min */}
                {Array.from({ length: 60 }).map((_, i) => {
                  const rad = i * 6 * (Math.PI / 180);
                  const isFive = i % 5 === 0;
                  const r1 = isFive ? 93 : 101;
                  const r2 = 107;
                  const x1 = 120 + r1 * Math.sin(rad);
                  const y1 = 120 - r1 * Math.cos(rad);
                  const x2 = 120 + r2 * Math.sin(rad);
                  const y2 = 120 - r2 * Math.cos(rad);
                  const isSel = minutes === i;
                  return (
                    <line key={`tick-${i}`}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isSel ? "#4f46e5" : isFive ? "#64748b" : "#cbd5e1"}
                      strokeWidth={isFive ? 2.5 : 1.5}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Minute numbers at 5-min intervals */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const minute = i * 5;
                  const rad = i * 30 * (Math.PI / 180);
                  const x = 120 + 82 * Math.sin(rad);
                  const y = 120 - 82 * Math.cos(rad);
                  const isSel = minutes === minute;
                  return (
                    <text key={`min-${i}`}
                      x={x} y={y} textAnchor="middle" dy="0.35em"
                      fontSize="10" fontWeight={isSel ? "700" : "500"}
                      fill={isSel ? "#4f46e5" : "#475569"}
                    >
                      {minute.toString().padStart(2, "0")}
                    </text>
                  );
                })}
              </>
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
