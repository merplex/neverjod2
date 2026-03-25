import { useState } from "react";
import { X, Mic, Tag, Wallet, BarChart2, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    icon: <span className="text-5xl">👋</span>,
    title: "ยินดีต้อนรับ!",
    description: "แอปบันทึกรายรับ-รายจ่ายด้วยเสียง\nบันทึกง่าย รวดเร็ว แค่พูดก็จบ",
  },
  {
    icon: <Mic size={52} className="text-theme-600" />,
    title: "บันทึกด้วยเสียง",
    description: "กดปุ่มไมค์ที่หน้าหลักแล้วพูด เช่น\n\"กินข้าว ห้าสิบบาท SCB\"\nระบบจะจับหมวดหมู่และบัญชีให้อัตโนมัติ",
  },
  {
    icon: <Tag size={52} className="text-theme-600" />,
    title: "ตั้ง Keywords",
    description: "ไปที่ Category แล้วเพิ่ม Keywords\nเช่น หมวด Food ใส่ \"ข้าว, กิน, ร้านอาหาร\"\nเมื่อพูดคำเหล่านั้น ระบบจะเลือกหมวดให้เอง",
  },
  {
    icon: <Wallet size={52} className="text-theme-600" />,
    title: "จัดการบัญชี",
    description: "ไปที่ Account แล้วเพิ่มบัญชีพร้อม Keywords\nเช่น ใส่ \"กรุงศรี, อยุธยา\"\nเพื่อให้ระบบเลือกบัญชีอัตโนมัติตอนพูด",
  },
  {
    icon: <BarChart2 size={52} className="text-theme-600" />,
    title: "ดูรายงาน",
    description: "หน้า Stats แสดงสรุปรายรับ-รายจ่าย\nรายเดือน แยกตามหมวดหมู่\nพร้อมกราฟให้ดูภาพรวมได้ทันที",
  },
  {
    icon: <CheckCircle size={52} className="text-theme-600" />,
    title: "พร้อมใช้งานแล้ว!",
    description: "เริ่มบันทึกรายการได้เลย\nสามารถกลับมาดูคู่มือนี้ได้ที่\nSettings → Guide",
  },
];

interface Props {
  onClose: () => void;
}

export default function OnboardingGuide({ onClose }: Props) {
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;
  const slide = slides[index];

  const finish = () => {
    try { localStorage.setItem("app_onboarding_done", "1"); } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" style={{ height: "70vh" }}>

        {/* Close */}
        <div className="flex justify-end px-4 pt-4">
          <button onClick={finish} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="flex items-center justify-center w-24 h-24 bg-theme-50 rounded-3xl">
            {slide.icon}
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-800">{slide.title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{slide.description}</p>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === index ? "w-5 h-2 bg-theme-600" : "w-2 h-2 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 px-6 pb-6">
          {index > 0 && (
            <button
              onClick={() => setIndex(index - 1)}
              className="flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex-shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <button
            onClick={() => isLast ? finish() : setIndex(index + 1)}
            className="flex-1 h-11 rounded-xl bg-theme-600 text-white font-semibold text-sm hover:bg-theme-700 transition-colors flex items-center justify-center gap-1"
          >
            {isLast ? "เริ่มใช้งาน" : (
              <>ถัดไป <ChevronRight size={16} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
