import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
    },
  },
  plugins: {
    "@typescript-eslint": tseslint.plugin,
  },
  rules: {
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-this-alias": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        // allow _ prefixing for unused vars
        args: "all",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
  },
  files: ["./**/*.{ts,tsx}"],
});
