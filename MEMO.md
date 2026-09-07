# Session Memo — 25 Mar 2026

## สิ่งที่ทำวันนี้

### Bug Fixes & Features (merged to main)

| # | รายการ | ไฟล์ |
|---|--------|------|
| 1 | Expense items แสดงสีแดงใน Transaction page | `AllTransactions.tsx` |
| 2 | Report → Summary แสดงแค่ balance (name ซ้าย, balance ขวา) บรรทัดเดียว | `Stats.tsx` |
| 3 | Swipe back navigation + Settings toggle (right/left) | `hooks/useSwipeBack.ts`, `Settings.tsx` |
| 4 | Settings bottom menu โดนตัด → เพิ่ม `pb-24` | `Settings.tsx` |
| 5 | Custom accounts/categories ไม่โชว์ใน home selector → fix icon loader | `Index.tsx` |
| 6 | Edit account/category: เพิ่มปุ่ม edit icon + grid picker | `AccountsManagement.tsx`, `Categories.tsx` |
| 7 | Onboarding Guide 2 placeholder slides | `OnboardingGuide.tsx` |
| 8 | Summary balance = startBalance + income - expense (ไม่ใช่แค่ transactions) | `Stats.tsx` |
| 9 | Edit icon picker: pre-select icon ปัจจุบัน | `AccountsManagement.tsx`, `Categories.tsx` |
| 10 | Icon options เพิ่มเป็น 36 ตัว (จาก 18) | `AccountsManagement.tsx`, `Categories.tsx`, `Index.tsx` |

---

## Sync Logic ที่ออกแบบไว้ (ยังไม่ implement)

### Stack
- **Backend**: Node.js + Express บน Railway
- **DB**: PostgreSQL (Railway plugin)
- **Auth**: email + password → JWT

### Schema เพิ่มใน transaction/account/category
```
updated_at  TIMESTAMP   -- ทุกครั้งที่แก้ไข
deleted_at  TIMESTAMP   -- null = ยังอยู่ | มีค่า = soft delete
```

### Sync Flow
```
Order: Categories → Accounts → Transactions

CREATE: fingerprint = date+time+amount+categoryId+accountId
  - fingerprint ตรง → dedup, replace local ID ด้วย server ID
  - ไม่ตรง → push as new

EDIT: Last Write Wins (by updated_at) — เฉพาะ ID เดียวกัน

DELETE: ส่ง { id, deleted_at } ขึ้น server
  - อุปกรณ์อื่น last_modified < deleted_at → ลบ (propagate)
  - อุปกรณ์อื่น last_modified > deleted_at → ทิ้ง delete (edit wins)

SPECIAL:
  - ลบ Category → transactions ย้ายไป nocat (system record, ปลอดภัย)
  - ลบ Account → transactions ย้ายไป account_deleted (system record, ปลอดภัย)
```

### API Endpoints (planned)
```
POST /auth/register
POST /auth/login          → JWT token

POST /sync/pull           → ส่ง last_sync_at, รับ records ที่ใหม่กว่า
POST /sync/push           → ส่ง local records, รับ server IDs กลับ
```

---

## สิ่งที่รอ (Pending)

- [ ] รับ `DATABASE_URL` จาก Railway (เปรมจะส่งทางคอม)
- [ ] สร้าง backend server (`server/` directory)
- [ ] สร้าง DB schema + migrate
- [ ] implement sync service ฝั่ง frontend
- [ ] เพิ่ม Settings toggle "Cloud Backup / Sync" พร้อม login form

---

## Branch
- Feature branch: `claude/thai-language-support-cq0kz`
- Production: `main` (Netlify auto-deploy)

---

# Session Memo — 7 ก.ย. 2026

## R8 / obfuscation (Play Console เตือน obfuscation ~1%) — DONE, commit `ae36753`
- `android/app/build.gradle`: `minifyEnabled true` + bump versionCode 12→13 / 1.0.11→1.0.12
- `android/app/proguard-rules.pro`: keep rules (Capacitor JS bridge, `com.neverjod.app.**`,
  Play Billing, androidbrowserhelper, `-dontwarn` facebook/twitter/okhttp)
- ไม่ใช้ `-optimize` proguard, ไม่เปิด `shrinkResources` (มัน strip `drawable/splash`)
- ผล: classes.dex เดี่ยว 5.3 MB (เดิม 2 dex ~15.8), aab 8.96 MB
- Play Console 3 หัวข้อที่เตือน: (1) obfuscation → แก้แล้ว | (2) edge-to-edge → Capacitor
  จัดการเอง ไม่แก้โค้ด | (3) deprecated API (`setStatusBarColor` ฯลฯ) → มาจาก
  `com.google.androidbrowserhelper` ผ่านปลั๊กอิน Google Sign-In, เป็น lib ของ Google แก้ไม่ได้

## บั๊กแถบสีเขียวตอน animation เปิด/ปิดแอป — ยังไม่แก้ (deferred, build 14)

### อาการ
แถบสีเขียวมิ้นต์ล่างสุด (บริเวณหลัง gesture nav bar) โผล่ตอน MIUI ย่อ/ขยายหน้าต่างแอป
ทุกหน้า. window ของแอป render สูงกว่าจอ (สี่เหลี่ยมผืนผ้าแนวตั้ง) เลยมีแถบเขียวโผล่ล่าง

### สาเหตุ (ยืนยันแล้ว) — ไม่ใช่ regression
- เครื่องทดสอบอัปเป็น **Android 16** (BP2A.250605.031.A3) + System WebView ≥140
- **Capacitor 8.3.0** `@capacitor/android` `SystemBars.java` มี logic:
  `shouldPassthroughInsets = webViewMajorVersion >= 140 && hasViewportCover(viewport-fit=cover)`
  → หยุด inset WebView, ปล่อยวาดเต็มจอหลัง gesture nav, rebuild WindowInsets
  → ตอน MIUI snapshot หน้าต่างเพื่อทำ animation, บริเวณหลัง nav ที่ยัง composite ไม่ทัน
  = flash surface สีเขียวของ Chromium
- `@capacitor/android` เป็น **8.3.0 มาตั้งแต่ build 11** (เช็ค package-lock) → เป็น OS/WebView
  ที่อัปทีหลังที่ trigger ไม่ใช่โค้ดที่แก้
- **jeen (StudioProjects/jeen) ไม่เป็น** เพราะใช้ `@capacitor/android` **8.2.0** — 8.2.0
  SystemBars บน webView≥140 แค่ `return insets` เฉยๆ ไม่ pad ไม่ rebuild (มี viewport-fit=cover เหมือนกัน)
- พิสูจน์: build `app-build12-pristine.apk` (= commit 7849b40 เป๊ะ, versionCode 12, ไม่มี R8,
  ไม่มี session change ใดๆ) → เขียวเหมือนกัน

### ที่ลองแล้ว — ไม่ได้ผลสักอัน (อย่าทำซ้ำ)
| # | ลองอะไร | ผล |
|---|---------|-----|
| 1 | `shrinkResources true` + `res/raw/keep.xml` | คนละบั๊ก — shrinker ลบ `drawable/splash` ทำให้เกิด**เขียวแฟลชตอนเปิด** (splash หาย). keep.xml แก้ splash กลับได้ แต่สุดท้าย**ปิด shrinkResources ทั้งหมด** เพราะประโยชน์น้อย. ไม่เกี่ยวกับแถบเขียว animation |
| 2 | `client/global.css` → `html { @apply bg-background }` (เดิมทาสีแค่ body) | ไม่มีผลต่อแถบเขียว — revert |
| 3 | `MainActivity.onStart()` → `webView.setBackgroundColor()` สีทึบตาม theme (light/dark) | ไม่มีผล — MIUI compositor ไม่ได้ใช้ webView bg ตอนทำ animation — revert |
| 4 | ลบ `viewport-fit=cover` จาก `index.html` (+ ใส่กลับเฉพาะ iOS ใน `App.tsx`) | ไม่มีผล — แม้ `hasViewportCover=false` แล้ว SystemBars 8.3.0 ก็ยัง `v.setPadding()` + rebuild insets — revert |
| 5 | downgrade `@capacitor/android`+core+cli+ios 8.3.0→8.2.0 | เริ่มทำแล้ว **revert ก่อนเทสต์** (scope creep) — **ยังไม่รู้ว่าได้ผลไหม** |

### ที่ยังไม่ลอง / ทางที่น่าลองต่อ (build 14)
- **downgrade Capacitor ทั้ง suite → 8.2.x** ให้เท่า jeen (jeen ยืนยันว่าไม่เป็น) — ทางที่ direct สุด
- รอ Capacitor patch / เปิด issue ที่ github.com/ionic-team/capacitor (เรื่อง SystemBars
  passthrough + window animation บน OEM launcher)
- ลอง config `plugins.SystemBars.insetsHandling: "disable"` — **แต่ดูโค้ด 8.3.0 แล้ว listener
  ยัง `v.setPadding()` อยู่ดี น่าจะไม่ช่วย**
- ลอง native: override activity window animation / ตั้ง `android:windowBackground` เป็นสี
  ทึบตาม theme (แยก values-night) — ยังไม่ได้ลอง
