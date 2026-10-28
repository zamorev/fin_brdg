import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildId = process.env.APP_BUILD_ID ?? "dev";

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
        rewrite: (path) =>
          path.replace(/^\/api/, "/fin-brdg/us-central1/api/api"),
      },
    },
  },
});
