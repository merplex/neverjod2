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

// Module-scoped lock (survives modal close/reopen, unlike React state) so a
// second tap can never start a second native Google sign-in flow while one
// is still pending. Firing two concurrent flows is what makes the native
// account picker show up twice and return CANCELED (error 16), wedging the
// Credential Manager until the app process is killed.
let googleLoginInFlight: Promise<string> | null = null;

async function performGoogleSignIn(): Promise<string> {
  await ensureGoogleInitialized();
  try {
    const { result } = await SocialLogin.login({
      provider: "google",
      options: {},
    });
    const idToken = (result as any)?.idToken;
    if (!idToken) throw new Error("ไม่ได้รับ Google idToken");
    return idToken;
  } catch (err) {
    // Best-effort: clear native session state on failure so a retry starts
    // clean instead of inheriting a half-open Credential Manager request.
    try {
      await SocialLogin.logout({ provider: "google" });
    } catch {
      // ignore - logout is just cleanup, original error is what matters
    }
    throw err;
  }
}

export function signInWithGoogle(): Promise<string> {
  if (googleLoginInFlight) return googleLoginInFlight;
  googleLoginInFlight = performGoogleSignIn().finally(() => {
    googleLoginInFlight = null;
  });
  return googleLoginInFlight;
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
