import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";

export default function Eula() {
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
        <h1 className="text-lg font-semibold text-slate-800">License Agreement (EULA)</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        <p className="text-xs text-slate-400">อัปเดตล่าสุด: 29 มีนาคม 2568 (2025)</p>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">สัญญาอนุญาตผู้ใช้ปลายทาง (EULA)</h2>
          <p>
            สัญญาอนุญาตนี้ ("EULA") เป็นข้อตกลงระหว่างคุณและ NeverJod สำหรับการใช้งานแอปพลิเคชัน
            NeverJod บนอุปกรณ์ iOS/Android ของคุณ
          </p>

          <h3 className="font-semibold text-slate-800">1. การอนุญาตใช้งาน</h3>
          <p className="text-slate-600">
            NeverJod มอบสิทธิ์ที่จำกัด ไม่ผูกขาด และไม่สามารถโอนได้ ให้คุณติดตั้งและใช้งานแอป
            บนอุปกรณ์ Apple ที่คุณเป็นเจ้าของหรือควบคุม ตามที่อนุญาตโดย App Store Terms of Service
          </p>

          <h3 className="font-semibold text-slate-800">2. ข้อจำกัด</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>ห้ามคัดลอก ดัดแปลง หรือแจกจ่ายแอปโดยไม่ได้รับอนุญาต</li>
            <li>ห้ามทำ reverse engineering หรือ decompile แอป</li>
            <li>ห้ามใช้แอปเพื่อวัตถุประสงค์ที่ผิดกฎหมาย</li>
            <li>ห้ามแชร์หรือขายต่อบัญชี Premium</li>
          </ul>

          <h3 className="font-semibold text-slate-800">3. ทรัพย์สินทางปัญญา</h3>
          <p className="text-slate-600">
            แอป NeverJod รวมถึงโค้ด การออกแบบ และเนื้อหาทั้งหมดเป็นทรัพย์สินของ NeverJod
            และได้รับการคุ้มครองโดยกฎหมายลิขสิทธิ์
          </p>

          <h3 className="font-semibold text-slate-800">4. การบริการและการสนับสนุน</h3>
          <p className="text-slate-600">
            NeverJod จะพยายามอย่างเต็มที่ในการให้บริการที่เสถียร แต่ไม่รับประกันว่าบริการจะ
            พร้อมใช้งานตลอดเวลา เราสงวนสิทธิ์ในการปรับปรุง เปลี่ยนแปลง หรือหยุดให้บริการ
            บางส่วนได้โดยไม่ต้องแจ้งล่วงหน้า
          </p>

          <h3 className="font-semibold text-slate-800">5. การยกเลิก</h3>
          <p className="text-slate-600">
            สิทธิ์การใช้งานนี้จะสิ้นสุดทันทีหากคุณละเมิดข้อกำหนดใดๆ ในสัญญานี้ เมื่อสิ้นสุด
            คุณต้องลบแอปออกจากอุปกรณ์ทั้งหมด
          </p>

          <h3 className="font-semibold text-slate-800">6. Apple และ Google</h3>
          <p className="text-slate-600">
            NeverJod แจกจ่ายผ่าน Apple App Store และ Google Play Store การใช้งานแอปอยู่ภายใต้
            นโยบายของ App Store ด้วย Apple และ Google ไม่ใช่คู่สัญญาใน EULA นี้ และไม่รับผิดชอบ
            ต่อแอปหรือเนื้อหาในแอป
          </p>

          <h3 className="font-semibold text-slate-800">7. กฎหมายที่บังคับใช้</h3>
          <p className="text-slate-600">
            EULA นี้อยู่ภายใต้กฎหมายของประเทศไทย ข้อพิพาทใดๆ ให้อยู่ในเขตอำนาจศาลไทย
          </p>

          <h3 className="font-semibold text-slate-800">8. ติดต่อเรา</h3>
          <p className="text-slate-600">
            ติดต่อได้ที่:{" "}
            <span className="text-sky-600 font-medium">support@neverjod.com</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-800">End User License Agreement (English)</h2>
          <p>
            This EULA is an agreement between you and NeverJod for the use of the NeverJod app on
            your iOS/Android device.
          </p>

          <h3 className="font-semibold text-slate-800">License Grant</h3>
          <p className="text-slate-600">
            NeverJod grants you a limited, non-exclusive, non-transferable license to install and
            use the app on Apple devices you own or control, subject to the App Store Terms of Service.
          </p>

          <h3 className="font-semibold text-slate-800">Restrictions</h3>
          <ul className="space-y-1 list-disc list-inside text-slate-600">
            <li>No copying, modifying, or distributing the app without permission</li>
            <li>No reverse engineering or decompiling</li>
            <li>No sharing or reselling Premium accounts</li>
          </ul>

          <h3 className="font-semibold text-slate-800">Apple / Google</h3>
          <p className="text-slate-600">
            Apple and Google are not parties to this EULA and bear no responsibility for the app.
            Usage is also subject to App Store Terms of Service.
          </p>

          <h3 className="font-semibold text-slate-800">Governing Law</h3>
          <p className="text-slate-600">This EULA is governed by the laws of Thailand.</p>

          <h3 className="font-semibold text-slate-800">Contact</h3>
          <p className="text-slate-600">
            Email us at{" "}
            <span className="text-sky-600 font-medium">support@neverjod.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
