import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildId = process.env.APP_BUILD_ID ?? "dev";

/** Firebase Functions emulator: `api` in europe-west1, Express mounts at `/api/...`. */
const EMULATOR_FUNCTIONS_BASE =
  "/fin-brdg/europe-west1/api/api";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, EMULATOR_FUNCTIONS_BASE),
      },
    },
  },
});
