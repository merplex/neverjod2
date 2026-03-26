// Suppress mic beep on Android (Capacitor native plugin)
// On iOS/web, these are no-ops since the beep doesn't occur the same way

async function callPlugin(method: "muteBeep" | "unmuteBeep") {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { registerPlugin } = await import("@capacitor/core");
    const AudioPlugin = registerPlugin<{ muteBeep: () => Promise<void>; unmuteBeep: () => Promise<void> }>("AudioPlugin");
    await AudioPlugin[method]();
  } catch {}
}

export const muteBeep = () => callPlugin("muteBeep");
export const unmuteBeep = () => callPlugin("unmuteBeep");
