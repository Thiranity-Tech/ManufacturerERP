import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" makes asset paths relative so the built app loads from a file inside Electron
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
