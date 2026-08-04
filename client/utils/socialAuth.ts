import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;
const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
const APPLE_BUNDLE_ID = "com.neverjod.app";

export function isIOS() {
  return Capacitor.getPlatform() === "ios";
}

let googleInitPromise: Promise<void> | null = null;

function ensureGoogleInitialized() {
  if (!googleInitPromise) {
    googleInitPromise = SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iOSClientId: GOOGLE_IOS_CLIENT_ID,
        iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
      },
    });
  }
  return googleInitPromise;
}

export async function signInWithGoogle(): Promise<string> {
  await ensureGoogleInitialized();
  const { result } = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["email", "profile"] },
  });
  const idToken = (result as any)?.idToken;
  if (!idToken) throw new Error("ไม่ได้รับ Google idToken");
  return idToken;
}

export async function signInWithApple(): Promise<string> {
  const { response } = await SignInWithApple.authorize({
    clientId: APPLE_BUNDLE_ID,
    redirectURI: "https://neverjod.com/apple-callback",
    scopes: "email name",
  });
  if (!response.identityToken) throw new Error("ไม่ได้รับ Apple identityToken");
  return response.identityToken;
}
