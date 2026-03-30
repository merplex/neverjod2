import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";

export default function TermsOfUse() {
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
        <h1 className="text-lg font-semibold text-slate-800">Terms of Use</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        <p className="text-xs text-slate-400">อัปเดตล่าสุด: 29 มีนาคม 2568 (2025)</p>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">ข้อกำหนดการใช้งาน</h2>
          <p>
            โปรดอ่านข้อกำหนดการใช้งานนี้อย่างละเอียดก่อนใช้งานแอป NeverJod การใช้งานแอปถือว่าคุณ
            ยอมรับข้อกำหนดเหล่านี้ทั้งหมด
          </p>

          <h3 className="font-semibold text-slate-800">1. การใช้งานที่ได้รับอนุญาต</h3>
          <p className="text-slate-600">
            NeverJod เป็นแอปบันทึกรายรับ-รายจ่ายส่วนบุคคล คุณสามารถใช้งานแอปเพื่อวัตถุประสงค์
            ส่วนตัวเท่านั้น ไม่อนุญาตให้ใช้เพื่อวัตถุประสงค์เชิงพาณิชย์โดยไม่ได้รับอนุญาต
          </p>

          <h3 className="font-semibold text-slate-800">2. บัญชีผู้ใช้</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>คุณรับผิดชอบต่อความปลอดภัยของบัญชีและรหัสผ่านของคุณ</li>
            <li>ต้องใช้อีเมลจริงและข้อมูลที่ถูกต้องในการสมัคร</li>
            <li>ไม่อนุญาตให้แชร์บัญชีกับผู้อื่น</li>
          </ul>

          <h3 className="font-semibold text-slate-800">3. การสมัครสมาชิก Premium</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>การชำระเงินดำเนินการผ่าน Apple App Store</li>
            <li>สมาชิกภาพต่ออายุอัตโนมัติเว้นแต่ยกเลิกก่อนรอบการต่ออายุ 24 ชั่วโมง</li>
            <li>ยกเลิกการต่ออายุได้ผ่านการตั้งค่า Apple ID บน App Store</li>
            <li>ไม่มีการคืนเงินสำหรับรอบการชำระเงินที่ผ่านมาแล้ว ยกเว้นตามนโยบาย Apple</li>
          </ul>

          <h3 className="font-semibold text-slate-800">4. ข้อมูลทางการเงิน</h3>
          <p className="text-slate-600">
            ข้อมูลรายรับ-รายจ่ายที่คุณบันทึกเป็นความรับผิดชอบของคุณ NeverJod ไม่รับผิดชอบต่อ
            ความถูกต้องหรือผลทางการเงินที่เกิดจากการใช้ข้อมูลในแอป แอปนี้ไม่ใช่คำแนะนำทางการเงิน
          </p>

          <h3 className="font-semibold text-slate-800">5. ข้อจำกัดความรับผิด</h3>
          <p className="text-slate-600">
            NeverJod ให้บริการ "ตามสภาพที่เป็น" เราไม่รับประกันว่าแอปจะทำงานได้โดยไม่มีข้อผิดพลาด
            หรือพร้อมใช้งานตลอดเวลา เราไม่รับผิดชอบต่อความสูญเสียข้อมูลหรือความเสียหายใดๆ
            ที่เกิดจากการใช้งานแอป
          </p>

          <h3 className="font-semibold text-slate-800">6. การเปลี่ยนแปลงข้อกำหนด</h3>
          <p className="text-slate-600">
            เราอาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว การใช้งานแอปต่อเนื่องหลังจากการเปลี่ยนแปลง
            ถือว่าคุณยอมรับข้อกำหนดใหม่
          </p>

          <h3 className="font-semibold text-slate-800">7. ติดต่อเรา</h3>
          <p className="text-slate-600">
            คำถามหรือข้อสงสัย ติดต่อได้ที่:{" "}
            <span className="text-sky-600 font-medium">support@neverjod.com</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">Terms of Use (English)</h2>
          <p>
            Please read these Terms carefully before using NeverJod. By using the app, you agree to
            these terms.
          </p>

          <h3 className="font-semibold text-slate-800">Permitted Use</h3>
          <p className="text-slate-600">
            NeverJod is a personal finance tracking app for personal use only. Commercial use
            without permission is prohibited.
          </p>

          <h3 className="font-semibold text-slate-800">Premium Subscription</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>Payment is processed through Apple App Store</li>
            <li>Subscriptions auto-renew unless cancelled 24 hours before renewal</li>
            <li>Cancel auto-renewal via Apple ID settings in App Store</li>
            <li>No refunds for used subscription periods except per Apple's refund policy</li>
          </ul>

          <h3 className="font-semibold text-slate-800">Disclaimer</h3>
          <p className="text-slate-600">
            NeverJod is provided "as is." We do not guarantee uninterrupted service and are not
            liable for any data loss or financial decisions made based on app data. This app does
            not constitute financial advice.
          </p>

          <h3 className="font-semibold text-slate-800">Contact</h3>
          <p className="text-slate-600">
            Questions? Email us at{" "}
            <span className="text-sky-600 font-medium">support@neverjod.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
