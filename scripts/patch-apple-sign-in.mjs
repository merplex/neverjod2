import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Patch @capacitor-community/apple-sign-in Package.swift to support Capacitor 8
// The plugin declares capacitor-swift-pm `from: "7.0.0"` which SPM resolves as 7.0.0..<8.0.0,
// conflicting with CapApp-SPM's `exact: "8.3.0"`. Change to from: "8.0.0" to fix.
const filePath = resolve(
  "node_modules/@capacitor-community/apple-sign-in/Package.swift"
);

try {
  const original = readFileSync(filePath, "utf8");
  const patched = original.replace(
    '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")',
    '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")'
  );
  if (original === patched) {
    console.log("patch-apple-sign-in: already patched or pattern not found, skipping");
  } else {
    writeFileSync(filePath, patched);
    console.log("patch-apple-sign-in: patched capacitor-swift-pm requirement to from: 8.0.0");
  }
} catch (e) {
  console.warn("patch-apple-sign-in: could not patch file —", e.message);
}
