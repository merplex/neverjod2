export type Lang = "th" | "en";

const translations: Record<Lang, Record<string, string>> = {
  th: {
    // Common
    "save": "บันทึก",
    "cancel": "ยกเลิก",
    "delete": "ลบ",
    "confirm_delete": "ยืนยันลบ",
    "edit": "แก้ไข",
    "add": "เพิ่ม",
    "close": "ปิด",
    "ok": "ตกลง",
    "seconds": "วินาที",
    "sec": "วิ",
    "of_each_month": "ของทุกเดือน",
    "items_in_use": "รายการที่ใช้งานอยู่",
    "items": "รายการ",
    "has": "มี",
    "note_placeholder": "เพิ่มหมายเหตุ...",
    "tap_to_select": "Tap to select",
    "tap_to_enter": "Tap to enter",
    "next": "ถัดไป",

    // Days
    "day.sun": "อาทิตย์",
    "day.mon": "จันทร์",
    "day.tue": "อังคาร",
    "day.wed": "พุธ",
    "day.thu": "พฤหัส",
    "day.fri": "ศุกร์",
    "day.sat": "เสาร์",

    // Auth
    "login": "เข้าสู่ระบบ",
    "register": "สมัครสมาชิก",
    "register_short": "สมัคร",
    "logout": "ออกจากระบบ",

    // Settings
    "settings.app_theme": "ธีมสีของแอป",
    "settings.voice_language": "ภาษารับเสียง",
    "settings.voice_lang_thai": "ไทย",
    "settings.voice_lang_auto_hint": "Auto = ใช้ภาษาของเครื่อง · iOS แนะนำเลือกตรงๆ",
    "settings.auto_start_on": "เปิดไมค์อัตโนมัติเมื่อเข้าหน้าแรก",
    "settings.auto_start_off": "ต้องกดปุ่มไมค์เองก่อนพูด",
    "settings.autosave_delay": "หน่วงเวลา autosave",
    "settings.autosave_hint": "ระยะเวลาหลังหยุดพูดก่อน autosave",
    "settings.monthly_reset": "รีเซ็ตรายเดือน",
    "settings.monthly_reset_hint": "วันที่เริ่มนับรอบรายจ่ายใหม่ทุกเดือน",
    "settings.reset_day": "รีเซ็ตวันที่",
    "settings.swipe_direction": "ทิศทาง swipe เพื่อไปหน้ากรอกรายการ",
    "settings.swipe_right": "swipe ขวา = ไปยังหน้ากรอกรายการ",
    "settings.swipe_left": "swipe ซ้าย = ไปยังหน้ากรอกรายการ",
    "settings.display_language": "ภาษาแสดงผลในแอป",
    "settings.language_th": "ภาษาไทย",
    "settings.language_en": "English",
    "settings.user_guide": "คู่มือการใช้งานแอป",
    "settings.view_guide": "ดูคู่มือการใช้งาน",
    "settings.sync_title": "Sync / เข้าสู่ระบบ",
    "settings.sync_hint": "รองรับการใช้หลายอุปกรณ์พร้อมกัน · Premium",
    "settings.connected": "เชื่อมต่อแล้ว",
    "settings.syncing": "กำลังซิงค์อยู่...",
    "settings.sync_failed": "ซิงค์ล้มเหลว ✗",
    "settings.sync_now": "ซิงค์ตอนนี้",
    "settings.legal": "นโยบายและข้อกำหนดการใช้งาน",
    "settings.repeat_hint": "สร้างและจัดการ transaction ที่ทำซ้ำอัตโนมัติ",
    "settings.error": "เกิดข้อผิดพลาด",
    "settings.free_plan_sync": "บัญชีของคุณเป็นแพลนฟรี\nอัปเกรด Premium เพื่อใช้งาน Cloud Sync ข้ามอุปกรณ์",

    // Index
    "index.top_expenses": "อันดับรายจ่าย",
    "index.top_incomes": "อันดับรายรับ",
    "index.no_data": "ยังไม่มีข้อมูล",

    // Stats / Report
    "stats.total": "รวมทั้งหมด",
    "stats.expenses": "รายจ่าย",
    "stats.no_expenses": "ไม่มีรายจ่ายในช่วงนี้",
    "stats.total_expenses": "รวมรายจ่าย",
    "stats.incomes": "รายรับ",
    "stats.no_incomes": "ไม่มีรายรับในช่วงนี้",
    "stats.total_incomes": "รวมรายรับ",
    "stats.by_account": "แยกตาม Account",
    "stats.income_col": "รายรับ",
    "stats.expense_col": "รายจ่าย",
    "stats.total_row": "รวม",
    "stats.no_txn": "ไม่มีรายการในช่วงนี้",

    // Auth modal
    "auth.title": "เข้าสู่ระบบ",

    // Categories
    "cat.delete_title": "ลบ Category",
    "cat.delete_warning": "ถ้ายืนยัน รายการทั้งหมดจะย้ายไปอยู่ใน No Category และลบ category นี้ออก",
    "cat.keywords_label": "Keywords (คั่นด้วย ,)",
    "cat.keywords_placeholder": "ค่าเดินทาง, ค่ารถ, รถไฟฟ้า",
    "cat.free_keyword_limit": "แพลนฟรีเพิ่ม keyword ได้สูงสุด 1 คำต่อหมวดหมู่\nอัปเกรด Premium เพื่อเพิ่ม keyword ได้ไม่จำกัด",
    "cat.free_cat_limit": "แพลนฟรีเพิ่มได้สูงสุด {{limit}} หมวดหมู่\nอัปเกรด Premium เพื่อเพิ่มได้ไม่จำกัด",
    "cat.free_unlock": "แพลนฟรีใช้งานได้ {{limit}} หมวดหมู่\nอัปเกรด Premium เพื่อปลดล็อคทุก category",
    "cat.keyword_duplicate": "Keyword \"{{kw}}\" ซ้ำกับที่มีอยู่ใน {{name}}",

    // Accounts
    "acc.delete_title": "ลบ Account",
    "acc.delete_warning": "ถ้ายืนยัน รายการทั้งหมดจะย้ายไปอยู่ใน Account Deleted และลบ account นี้ออก",
    "acc.keywords_label": "Keywords (คั่นด้วย ,)",
    "acc.keywords_placeholder": "กสิกร, kbank, เขียว",
    "acc.type_placeholder": "เช่น credit card, savings account",
    "acc.free_keyword_limit": "แพลนฟรีเพิ่ม keyword ได้สูงสุด 1 คำต่อบัญชี\nอัปเกรด Premium เพื่อเพิ่ม keyword ได้ไม่จำกัด",
    "acc.free_acc_limit": "แพลนฟรีเพิ่มได้สูงสุด {{limit}} บัญชี\nอัปเกรด Premium เพื่อเพิ่มได้ไม่จำกัด",
    "acc.free_unlock": "แพลนฟรีใช้งานได้ {{limit}} บัญชี\nอัปเกรด Premium เพื่อปลดล็อคทุก account",
    "acc.keyword_duplicate": "Keyword \"{{kw}}\" ซ้ำกับที่มีอยู่ใน {{name}}",
    "acc.transfer_to": "โอนไปยัง {{name}}",
    "acc.transfer_from": "รับโอนจาก {{name}}",
    "acc.transfer_title": "โอนเงิน",
    "acc.from_account": "จากบัญชี",
    "acc.to_account": "ไปยังบัญชี",
    "acc.select_source": "เลือกบัญชีต้นทาง",
    "acc.select_dest": "เลือกบัญชีปลายทาง",
    "acc.amount": "จำนวนเงิน",
    "acc.date": "วันที่",
    "acc.time": "เวลา",
    "acc.transfer": "โอน",

    // Repeat Transactions
    "repeat.empty": "ยังไม่มี repeat transaction",
    "repeat.empty_hint": "กด + เพื่อสร้าง",
    "repeat.next_due": "ถัดไป",
    "repeat.edit_title": "แก้ไข Repeat Transaction",
    "repeat.amount": "จำนวนเงิน",
    "repeat.note": "หมายเหตุ",
    "repeat.frequency": "ความถี่",
    "repeat.delete_confirm": "ลบ repeat transaction นี้?",
    "repeat.delete_hint": "transaction ที่สร้างไปแล้วจะไม่ถูกลบ",

    // Add Transaction Modal
    "modal.category": "Category",
    "modal.account": "Account",
    "modal.repeat_frequency": "ความถี่การทำซ้ำ",
    "modal.save_repeat": "Save Repeat Rule",
    "modal.save_transaction": "Save Transaction",
    "modal.start_day": "เริ่มวัน",
    "modal.every_2weeks": "ทุก 2 สัปดาห์",
    "modal.week": "สัปดาห์",
    "modal.every_day": "ทุกวัน เริ่มวันนี้",
    "modal.day_of_cycle": "วันที่ ของแต่ละรอบ",

    // Premium Modal
    "premium.title": "ต้องการ Premium",
    "premium.feature_sync": "Cloud Sync ข้ามอุปกรณ์ไม่จำกัด",
    "premium.feature_accounts": "Accounts และ Categories ไม่จำกัด",
    "premium.feature_keywords": "Keywords ไม่จำกัดต่อหมวดหมู่",
    "premium.acknowledge": "รับทราบ",
    "premium.monthly": "รายเดือน",
    "premium.yearly": "รายปี",
    "premium.restore": "Restore",
    "premium.error": "เกิดข้อผิดพลาด",
    "premium.subscribe": "สมัคร",

    // Onboarding
    "onboarding.start": "เริ่มใช้งาน",
  },

  en: {
    // Common
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm_delete": "Confirm Delete",
    "edit": "Edit",
    "add": "Add",
    "close": "Close",
    "ok": "OK",
    "seconds": "seconds",
    "sec": "s",
    "of_each_month": "of each month",
    "items_in_use": "items in use",
    "items": "items",
    "has": "Has",
    "note_placeholder": "Add note...",
    "tap_to_select": "Tap to select",
    "tap_to_enter": "Tap to enter",
    "next": "Next",

    // Days
    "day.sun": "Sun",
    "day.mon": "Mon",
    "day.tue": "Tue",
    "day.wed": "Wed",
    "day.thu": "Thu",
    "day.fri": "Fri",
    "day.sat": "Sat",

    // Auth
    "login": "Log In",
    "register": "Sign Up",
    "register_short": "Sign Up",
    "logout": "Log Out",

    // Settings
    "settings.app_theme": "App Theme",
    "settings.voice_language": "Voice Language",
    "settings.voice_lang_thai": "Thai",
    "settings.voice_lang_auto_hint": "Auto = uses device language · iOS: recommended to select manually",
    "settings.auto_start_on": "Auto-start mic when entering home",
    "settings.auto_start_off": "Tap mic button to start speaking",
    "settings.autosave_delay": "Autosave Delay",
    "settings.autosave_hint": "Delay after stopping speech before autosave",
    "settings.monthly_reset": "Monthly Reset",
    "settings.monthly_reset_hint": "Day to start a new expense cycle each month",
    "settings.reset_day": "Reset Day",
    "settings.swipe_direction": "Swipe direction to open entry page",
    "settings.swipe_right": "Swipe right = go to entry page",
    "settings.swipe_left": "Swipe left = go to entry page",
    "settings.display_language": "Display Language",
    "settings.language_th": "ภาษาไทย",
    "settings.language_en": "English",
    "settings.user_guide": "User Guide",
    "settings.view_guide": "View User Guide",
    "settings.sync_title": "Sync / Log In",
    "settings.sync_hint": "Supports multiple devices simultaneously · Premium",
    "settings.connected": "Connected",
    "settings.syncing": "Syncing...",
    "settings.sync_failed": "Sync failed ✗",
    "settings.sync_now": "Sync Now",
    "settings.legal": "Policies & Terms",
    "settings.repeat_hint": "Create and manage auto-repeat transactions",
    "settings.error": "An error occurred",
    "settings.free_plan_sync": "You are on the free plan.\nUpgrade to Premium to use Cloud Sync across devices.",

    // Index
    "index.top_expenses": "Top Expenses",
    "index.top_incomes": "Top Income",
    "index.no_data": "No data yet",

    // Stats / Report
    "stats.total": "Total",
    "stats.expenses": "Expenses",
    "stats.no_expenses": "No expenses this period",
    "stats.total_expenses": "Total Expenses",
    "stats.incomes": "Income",
    "stats.no_incomes": "No income this period",
    "stats.total_incomes": "Total Income",
    "stats.by_account": "By Account",
    "stats.income_col": "Income",
    "stats.expense_col": "Expense",
    "stats.total_row": "Total",
    "stats.no_txn": "No transactions this period",

    // Auth modal
    "auth.title": "Sign In",

    // Categories
    "cat.delete_title": "Delete Category",
    "cat.delete_warning": "If confirmed, all items will be moved to No Category and this category will be deleted.",
    "cat.keywords_label": "Keywords (comma-separated)",
    "cat.keywords_placeholder": "travel, transport, bts",
    "cat.free_keyword_limit": "Free plan: max 1 keyword per category.\nUpgrade to Premium for unlimited keywords.",
    "cat.free_cat_limit": "Free plan: max {{limit}} categories.\nUpgrade to Premium for unlimited.",
    "cat.free_unlock": "Free plan supports {{limit}} categories.\nUpgrade to Premium to unlock all categories.",
    "cat.keyword_duplicate": "Keyword \"{{kw}}\" already exists in {{name}}",

    // Accounts
    "acc.delete_title": "Delete Account",
    "acc.delete_warning": "If confirmed, all items will be moved to Account Deleted and this account will be deleted.",
    "acc.keywords_label": "Keywords (comma-separated)",
    "acc.keywords_placeholder": "kbank, kasikorn, green",
    "acc.type_placeholder": "e.g. credit card, savings account",
    "acc.free_keyword_limit": "Free plan: max 1 keyword per account.\nUpgrade to Premium for unlimited keywords.",
    "acc.free_acc_limit": "Free plan: max {{limit}} accounts.\nUpgrade to Premium for unlimited.",
    "acc.free_unlock": "Free plan supports {{limit}} accounts.\nUpgrade to Premium to unlock all accounts.",
    "acc.keyword_duplicate": "Keyword \"{{kw}}\" already exists in {{name}}",
    "acc.transfer_to": "Transfer to {{name}}",
    "acc.transfer_from": "Received from {{name}}",
    "acc.transfer_title": "Transfer",
    "acc.from_account": "From Account",
    "acc.to_account": "To Account",
    "acc.select_source": "Select source account",
    "acc.select_dest": "Select destination account",
    "acc.amount": "Amount",
    "acc.date": "Date",
    "acc.time": "Time",
    "acc.transfer": "Transfer",

    // Repeat Transactions
    "repeat.empty": "No repeat transactions yet",
    "repeat.empty_hint": "Tap + to create one",
    "repeat.next_due": "Next",
    "repeat.edit_title": "Edit Repeat Transaction",
    "repeat.amount": "Amount",
    "repeat.note": "Note",
    "repeat.frequency": "Frequency",
    "repeat.delete_confirm": "Delete this repeat transaction?",
    "repeat.delete_hint": "Already created transactions will not be deleted.",

    // Add Transaction Modal
    "modal.category": "Category",
    "modal.account": "Account",
    "modal.repeat_frequency": "Repeat Frequency",
    "modal.save_repeat": "Save Repeat Rule",
    "modal.save_transaction": "Save Transaction",
    "modal.start_day": "Start Day",
    "modal.every_2weeks": "Every 2 weeks",
    "modal.week": "week",
    "modal.every_day": "Every day starting today",
    "modal.day_of_cycle": "Day of each cycle",

    // Premium Modal
    "premium.title": "Premium Required",
    "premium.feature_sync": "Unlimited Cloud Sync across devices",
    "premium.feature_accounts": "Unlimited Accounts & Categories",
    "premium.feature_keywords": "Unlimited Keywords per category",
    "premium.acknowledge": "Got it",
    "premium.monthly": "Monthly",
    "premium.yearly": "Yearly",
    "premium.restore": "Restore",
    "premium.error": "An error occurred",
    "premium.subscribe": "Subscribe",

    // Onboarding
    "onboarding.start": "Get Started",
  },
};

export function getLang(): Lang {
  try {
    const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
    return s.language === "en" ? "en" : "th";
  } catch {
    return "th";
  }
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = getLang();
  let text = translations[lang]?.[key] ?? translations.th[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{{${k}}}`, String(v));
    });
  }
  return text;
}
