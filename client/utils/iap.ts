import { registerPlugin, Capacitor } from "@capacitor/core";

const IAPPlugin = registerPlugin("IAP");

const PRODUCT_IDS = {
  monthly: "com.neverjod.premium.monthly",
  yearly: "com.neverjod.premium.yearly",
};

export async function purchaseProduct(plan: "monthly" | "yearly"): Promise<{ productId: string; receipt: string }> {
  if (!Capacitor.isNativePlatform()) throw new Error("IAP ไม่พร้อมใช้งาน");
  const productId = PRODUCT_IDS[plan];
  return IAPPlugin.purchase({ productId }) as Promise<{ productId: string; receipt: string }>;
}

export async function restorePurchases(): Promise<{ receipt: string }> {
  if (!Capacitor.isNativePlatform()) return { receipt: "" };
  return IAPPlugin.restorePurchases() as Promise<{ receipt: string }>;
}
