import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

// must use a separate config for content.js to bundle all files, preventing imports
export default defineConfig({
  root: "./src",
  plugins: [preact(), tailwindcss()],
  build: {
    outDir: "../dist",
    emptyOutDir: false,
    rollupOptions: {
      input: "./src/content.ts",
      output: {
        entryFileNames: "content.js",
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port: 3000,
  },
});
