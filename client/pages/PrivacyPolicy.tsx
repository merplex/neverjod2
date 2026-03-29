import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";

export default function PrivacyPolicy() {
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
        <h1 className="text-lg font-semibold text-slate-800">Privacy Policy</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        <p className="text-xs text-slate-400">อัปเดตล่าสุด: 29 มีนาคม 2568 (2025)</p>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">นโยบายความเป็นส่วนตัว</h2>
          <p>
            NeverJod ("แอป", "เรา") ให้ความสำคัญกับความเป็นส่วนตัวของคุณ เอกสารนี้อธิบายว่าเรารวบรวม ใช้
            และปกป้องข้อมูลของคุณอย่างไร
          </p>

          <h3 className="font-semibold text-slate-800">1. ข้อมูลที่เราเก็บ</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>ข้อมูลบัญชี: อีเมล และรหัสผ่านที่เข้ารหัส (สำหรับผู้ใช้ Cloud Sync)</li>
            <li>ข้อมูลทางการเงิน: รายการรับ-จ่ายที่คุณบันทึกไว้ในแอป</li>
            <li>ข้อมูลการใช้งาน: หมวดหมู่, บัญชี, และการตั้งค่าต่างๆ</li>
            <li>ข้อมูลอุปกรณ์: รุ่น OS เพื่อแก้ไขปัญหาทางเทคนิคเท่านั้น</li>
          </ul>

          <h3 className="font-semibold text-slate-800">2. วิธีที่เราใช้ข้อมูล</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>ซิงค์ข้อมูลระหว่างอุปกรณ์ (Cloud Sync สำหรับสมาชิก Premium)</li>
            <li>ปรับปรุงคุณภาพและประสิทธิภาพของแอป</li>
            <li>แก้ไขข้อผิดพลาดทางเทคนิค</li>
          </ul>
          <p className="text-slate-600">เราไม่ขาย ให้เช่า หรือแบ่งปันข้อมูลส่วนตัวของคุณกับบุคคลที่สาม</p>

          <h3 className="font-semibold text-slate-800">3. การจัดเก็บข้อมูล</h3>
          <p className="text-slate-600">
            ข้อมูลส่วนใหญ่เก็บไว้บนอุปกรณ์ของคุณโดยตรง ข้อมูล Cloud Sync จัดเก็บบนเซิร์ฟเวอร์ที่
            ปลอดภัยและเข้ารหัส คุณสามารถลบบัญชีและข้อมูลทั้งหมดได้ทุกเมื่อโดยติดต่อเราทางอีเมล
          </p>

          <h3 className="font-semibold text-slate-800">4. การเข้าถึงไมโครโฟน</h3>
          <p className="text-slate-600">
            แอปขอสิทธิ์ไมโครโฟนเพื่อฟีเจอร์บันทึกเสียง (Voice Input) เท่านั้น เสียงพูดจะถูกประมวลผล
            โดย iOS/Android Speech API โดยตรง ไม่มีการส่งเสียงไปยังเซิร์ฟเวอร์ของเรา
          </p>

          <h3 className="font-semibold text-slate-800">5. สิทธิ์ของคุณ</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>เข้าถึงและแก้ไขข้อมูลของคุณได้ตลอดเวลา</li>
            <li>ลบข้อมูลทั้งหมดได้โดยการลบแอปหรือติดต่อเรา</li>
            <li>ยกเลิก Cloud Sync ได้ทุกเมื่อ</li>
          </ul>

          <h3 className="font-semibold text-slate-800">6. ติดต่อเรา</h3>
          <p className="text-slate-600">
            หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว ติดต่อได้ที่:{" "}
            <span className="text-sky-600 font-medium">privacy@neverjod.com</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">Privacy Policy (English)</h2>
          <p>
            NeverJod ("App", "we") values your privacy. This document explains how we collect, use,
            and protect your information.
          </p>

          <h3 className="font-semibold text-slate-800">Data We Collect</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>Account data: email and encrypted password (Cloud Sync users only)</li>
            <li>Financial data: income/expense records you enter in the app</li>
            <li>Usage data: categories, accounts, and settings</li>
            <li>Device info: OS version for technical troubleshooting only</li>
          </ul>

          <h3 className="font-semibold text-slate-800">How We Use It</h3>
          <p className="text-slate-600">
            We use your data solely to provide and improve the app. We do not sell, rent, or share
            your personal data with third parties.
          </p>

          <h3 className="font-semibold text-slate-800">Microphone Access</h3>
          <p className="text-slate-600">
            Microphone permission is used only for Voice Input. Audio is processed by the iOS/Android
            Speech API on-device and is never sent to our servers.
          </p>

          <h3 className="font-semibold text-slate-800">Contact</h3>
          <p className="text-slate-600">
            Questions? Email us at{" "}
            <span className="text-sky-600 font-medium">privacy@neverjod.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
