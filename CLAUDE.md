# งานค้าง

## iOS: Google + Apple Sign-In (ต้องทำบน Mac)

Google + Apple Sign-In ถูกเพิ่มเข้าโปรเจกต์แล้ว (client: `client/utils/socialAuth.ts`, `client/components/CloudAuthModal.tsx`; server: `server/routes/auth.ts`) ทดสอบผ่านแล้วบน Android แต่ฝั่ง iOS ยังไม่ได้แตะเลย ต้องทำดังนี้:

1. `npm install` ให้ `node_modules/@capgo/capacitor-social-login` มีอยู่จริง — จำเป็นเพราะ `ios/App/CapApp-SPM/Package.swift` ชี้ path ไปที่ node_modules โดยตรง ถ้าไม่ install SPM resolve ไม่ผ่านตอน build บน Xcode
2. `npx cap sync ios`
3. เช็คว่า `ios/App/App/Info.plist` ต้องเพิ่ม URL scheme (REVERSED_CLIENT_ID: `com.googleusercontent.apps.1000658465875-g5g1rrrjjp3nhkd7pkglud69o4d4k93h`) หรือไม่ — ยังไม่ยืนยันจาก docs ปลั๊กอิน ต้องดูตอน build จริงว่า sign-in fail ไหมถ้าไม่ใส่ ถ้า fail ให้เพิ่ม `CFBundleURLTypes`
4. เปิด "Sign In with Apple" capability ให้ App ID `com.neverjod.app` ที่ developer.apple.com/account → Certificates, Identifiers & Profiles → Identifiers → เลือก App ID → ติ๊ก "Sign In with Apple" → Save แล้วเพิ่ม capability เดียวกันใน Xcode (target "App" → Signing & Capabilities → + Capability → Sign in with Apple)
5. Build บน Xcode แล้วทดสอบกดปุ่ม Google Sign-In และ Apple Sign-In จริงบนอุปกรณ์/simulator

Google Cloud OAuth clients ที่สร้างไว้แล้ว (project `1000658465875`):
- Web: `1000658465875-iiento0achi8mvnev51h5s9rbp5b0hk2` → `.env`: `GOOGLE_CLIENT_ID_WEB` / `VITE_GOOGLE_WEB_CLIENT_ID`
- iOS: `1000658465875-g5g1rrrjjp3nhkd7pkglud69o4d4k93h` (bundle `com.neverjod.app`, Team ID `LJ62FXNW3J`) → `.env`: `GOOGLE_CLIENT_ID_IOS` / `VITE_GOOGLE_IOS_CLIENT_ID`
- Android debug: `1000658465875-tg79jc20onbcn56i59mn3jb55nkp8fkl` (SHA-1 `A3:5B:FE:6E:74:54:1C:BE:C4:56:23:A6:A7:5D:7C:F4:8E:DC:AB:35`)
- Android production/Play App Signing: `1000658465875-dbslc31ak6oum4a06n76dlc2i76rsnh8` (SHA-1 `87:88:85:0E:F5:45:30:C9:4D:24:53:2E:DB:05:7B:AC:48:DC:B8:4E`)

`.env` commit เข้า git ปกติ (ไม่ gitignore) — Railway อ่านตรงจากไฟล์นี้ ไม่ต้องตั้ง env var ซ้ำใน Railway dashboard

เมื่อทำครบ 5 ข้อและทดสอบผ่านแล้ว ให้ลบหัวข้อนี้ทิ้งจากไฟล์นี้
