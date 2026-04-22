import { ChevronLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";

export default function Support() {
  const navigate = useNavigate();
  useSwipeBack();

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-white border-b border-slate-200 px-4 pb-4 pt-safe-header flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">Support</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">ติดต่อทีมงาน NeverJod</h2>
          <p>
            หากมีปัญหาการใช้งาน คำถามเกี่ยวกับ Premium subscription หรือข้อเสนอแนะ
            สามารถติดต่อทีมงานได้ทางอีเมล เราจะตอบกลับโดยเร็วที่สุด
          </p>

          <a
            href="mailto:support@neverjod.com"
            className="flex items-center gap-3 p-4 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
          >
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">อีเมล</p>
              <p className="text-sm font-semibold text-sky-700">support@neverjod.com</p>
            </div>
          </a>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800">เวลาตอบกลับ</h3>
            <p className="text-slate-600 text-xs">
              โดยปกติภายใน 1–3 วันทำการ (จันทร์–ศุกร์)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">Contact NeverJod</h2>
          <p>
            For app issues, Premium subscription questions, or feedback, reach out by email.
            We aim to reply as soon as possible.
          </p>

          <a
            href="mailto:support@neverjod.com"
            className="flex items-center gap-3 p-4 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
          >
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-semibold text-sky-700">support@neverjod.com</p>
            </div>
          </a>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800">Response time</h3>
            <p className="text-slate-600 text-xs">
              Typically within 1–3 business days (Mon–Fri).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
