import { defineConfig } from "vite";

export default defineConfig({
  root: "./src",
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
});
