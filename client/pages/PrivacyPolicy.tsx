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
        <p className="text-xs text-slate-400">อัปเดตล่าสุด: 21 สิงหาคม 2569 (2026)</p>

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
            <li>
              ข้อมูลการวิเคราะห์การใช้งาน (Analytics): เก็บผ่าน Firebase Analytics ของ Google เช่น
              การเปิด/ใช้งานแอป ประเทศ/ภูมิภาคโดยประมาณ และรุ่นอุปกรณ์ เพื่อดูภาพรวมการใช้งานและ
              ประสิทธิภาพของแคมเปญโฆษณา ข้อมูลนี้เป็นข้อมูลรวม (aggregated) ไม่ได้ผูกกับตัวตนของคุณ
              โดยตรง เว้นแต่คุณจะอนุญาตการติดตาม (App Tracking Transparency) เพิ่มเติมบน iOS
            </li>
            <li>
              ข้อมูลจากการเข้าสู่ระบบผ่านบุคคลที่สาม: หากคุณเลือกเข้าสู่ระบบด้วย Google Sign-In หรือ
              Apple Sign-In เราจะได้รับอีเมลและชื่อพื้นฐานจากผู้ให้บริการนั้นตามที่คุณยินยอม เพื่อใช้สร้าง
              และผูกบัญชี Cloud Sync ของคุณเท่านั้น
            </li>
          </ul>

          <h3 className="font-semibold text-slate-800">2. วิธีที่เราใช้ข้อมูล</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>ซิงค์ข้อมูลระหว่างอุปกรณ์ (Cloud Sync สำหรับสมาชิก Premium)</li>
            <li>เข้าสู่ระบบและยืนยันตัวตนผ่าน Google/Apple Sign-In (ถ้าคุณเลือกใช้)</li>
            <li>วิเคราะห์การใช้งานแอปแบบรวม (aggregated) เพื่อปรับปรุงคุณภาพและวัดผลแคมเปญโฆษณา</li>
            <li>ปรับปรุงคุณภาพและประสิทธิภาพของแอป</li>
            <li>แก้ไขข้อผิดพลาดทางเทคนิค</li>
          </ul>
          <p className="text-slate-600">
            เราไม่ขายหรือให้เช่าข้อมูลส่วนตัวของคุณกับบุคคลที่สาม ข้อมูล analytics และการเข้าสู่ระบบ
            ข้างต้นถูกประมวลผลโดยผู้ให้บริการที่เราใช้งาน (Google Firebase, Google Sign-In, Apple
            Sign-In) เท่าที่จำเป็นต่อการให้บริการฟีเจอร์เหล่านั้นเท่านั้น
          </p>

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
            <span className="text-sky-600 font-medium">support@neverjod.com</span>
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
            <li>
              Analytics data: collected via Google Firebase Analytics — e.g. app opens/usage,
              approximate country/region, and device model — to understand overall usage and
              measure ad campaign performance. This data is aggregated and not tied to your
              identity unless you separately grant App Tracking Transparency permission on iOS.
            </li>
            <li>
              Third-party sign-in data: if you choose to sign in with Google Sign-In or Apple
              Sign-In, we receive your email and basic name from that provider, as authorized by
              you, solely to create and link your Cloud Sync account.
            </li>
          </ul>

          <h3 className="font-semibold text-slate-800">How We Use It</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>Sync your data across devices (Cloud Sync for Premium members)</li>
            <li>Sign in and authenticate you via Google/Apple Sign-In (if you choose to use it)</li>
            <li>Analyze aggregated app usage to improve the app and measure ad campaigns</li>
            <li>Fix technical issues</li>
          </ul>
          <p className="text-slate-600">
            We do not sell or rent your personal data to third parties. The analytics and sign-in
            data above is processed by the service providers we use (Google Firebase, Google
            Sign-In, Apple Sign-In) only to the extent needed to provide those features.
          </p>

          <h3 className="font-semibold text-slate-800">Microphone Access</h3>
          <p className="text-slate-600">
            Microphone permission is used only for Voice Input. Audio is processed by the iOS/Android
            Speech API on-device and is never sent to our servers.
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
