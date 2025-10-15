import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { monacoEditorVitePlugin } from "./scripts/monacoEditorPlugin";
import type { PreRenderedChunk } from "rollup";

const preserveNames = ["background", "content"];

export default defineConfig(async () => ({
  root: "./src",
  plugins: [preact(), tailwindcss(), await monacoEditorVitePlugin()],
  build: {
    outDir: "../dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        popup: "./src/popup.html",
        options: "./src/options.html",
        background: "./src/background.ts",
      },
      output: {
        entryFileNames: (chunkInfo: PreRenderedChunk) => {
          if (preserveNames.includes(chunkInfo.name)) {
            return chunkInfo.name + ".js";
          } else {
            return "assets/[name].[hash].js";
          }
        },
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash][extname]",
      },
    },
  },
  server: {
    port: 3000,
  },
}));
