import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" makes asset paths relative so the built app loads from a file inside Electron
export default defineConfig({
  // The React app lives in frontend/, while the shared Supabase settings live
  // at the repository root. This makes web, Electron, and Android builds use
  // those same settings instead of looking for a separate frontend/.env.local.
  envDir: process.cwd(),
  base: "./",
  plugins: [react(), tailwindcss()],
});
