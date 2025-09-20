import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

const preserveNames = ["background", "content"];

export default defineConfig({
  root: "./src",
  plugins: [preact(), tailwindcss()],
  build: {
    outDir: "../dist",
    rollupOptions: {
      input: {
        popup: "./src/popup.html",
        options: "./src/options.html",
        background: "./src/background.ts",
        content: "./src/content.ts",
      },
      output: {
        entryFileNames: (chunkInfo) => {
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
});
