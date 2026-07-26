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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">ขอลบบัญชีและข้อมูล — NeverJod</h2>
          <p className="text-slate-600">วิธีขอลบบัญชี NeverJod ของคุณ ทำได้ 2 วิธี:</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
            <li>ในแอป: เข้าสู่ระบบ แล้วไปที่ Settings → เลื่อนลงล่างสุด → กด "ลบบัญชี" → ยืนยันการลบ</li>
            <li>
              หรือส่งอีเมลคำขอมาที่{" "}
              <a href="mailto:support@neverjod.com" className="text-sky-600 font-medium underline">
                support@neverjod.com
              </a>{" "}
              พร้อมระบุอีเมลบัญชีที่ต้องการลบ — เราจะดำเนินการลบให้ภายใน 1–3 วันทำการ
            </li>
          </ul>
          <p className="text-slate-600">
            <strong>ข้อมูลที่ถูกลบ:</strong> อีเมล รหัสผ่าน รายการรับ-จ่ายทั้งหมด บัญชีและหมวดหมู่
            ที่ซิงค์ไว้ ประวัติการสมัคร Premium — ลบถาวรทันทีเมื่อดำเนินการเสร็จ
            ไม่มีการเก็บสำรองข้อมูลไว้หลังจากนั้น
          </p>
          <p className="text-slate-600">
            <strong>ขอลบข้อมูลบางส่วนโดยไม่ลบทั้งบัญชี:</strong> เปิดรายการรับ-จ่ายที่ต้องการลบ
            แล้วกด "Delete Transaction" ด้านล่าง หรือไปที่ Settings → จัดการบัญชี/หมวดหมู่
            แล้วกดไอคอนลบที่รายการนั้น — ทำได้เองทันทีในแอปโดยไม่ต้องติดต่อทีมงาน
          </p>
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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">Request account &amp; data deletion — NeverJod</h2>
          <p className="text-slate-600">Two ways to request deletion of your NeverJod account:</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
            <li>In the app: log in, go to Settings → scroll to the bottom → tap "Delete Account" → confirm</li>
            <li>
              Or email{" "}
              <a href="mailto:support@neverjod.com" className="text-sky-600 font-medium underline">
                support@neverjod.com
              </a>{" "}
              with the account email to delete — we'll process it within 1–3 business days.
            </li>
          </ul>
          <p className="text-slate-600">
            <strong>Data deleted:</strong> email, password, all synced transactions, accounts
            and categories, and Premium subscription history — deleted permanently and
            immediately once processed, with no data retained afterward.
          </p>
          <p className="text-slate-600">
            <strong>Request partial data deletion without deleting your account:</strong> open
            the transaction you want to remove and tap "Delete Transaction", or go to
            Settings → manage accounts/categories and tap the delete icon on that item —
            done instantly in the app, no need to contact us.
          </p>
        </div>
      </div>
    </div>
  );
}
