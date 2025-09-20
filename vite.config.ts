import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "./src",
  plugins: [preact(), tailwindcss()],
  build: {
    outDir: "./dist",
    rollupOptions: {
      input: {
        popup: "./src/popup.html",
        options: "./src/options.html",
        background: "./src/background.ts",
        content: "./src/content.ts",
      },
    },
  },
  server: {
    port: 3000,
  },
});
