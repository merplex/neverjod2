import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.neverjod.app",
  appName: "NeverJod",
  webDir: "dist/spa",
  server: {
    androidScheme: "https",
  },
  ios: {},
  packageClassList: ["SignInWithApple", "IAPPlugin"],
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
};

export default config;
