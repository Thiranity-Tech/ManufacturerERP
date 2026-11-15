import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.thiranity.manufacturererp",
  appName: "Manufacturer ERP",
  // This is the exact Vite output used by the website and the Electron app.
  // Keeping one build folder prevents the APK from shipping stale web assets.
  webDir: "frontend/dist",
  server: { androidScheme: "https" },
};

export default config;
