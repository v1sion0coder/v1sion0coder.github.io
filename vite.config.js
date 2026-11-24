import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  base: "/",
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 800,
    rollupOptions: { input: { main: resolve(import.meta.dirname, "index.html"), order: resolve(import.meta.dirname, "order.html"), lab: resolve(import.meta.dirname, "lab.html") } },
  },
});
