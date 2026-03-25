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
