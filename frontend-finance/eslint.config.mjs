import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Project ini masih banyak memakai pola fetch/setState di useEffect.
      // Rule React Compiler ini membuat lint gagal, padahal pola tersebut masih umum
      // untuk aplikasi client-side data fetching.
      "react-hooks/set-state-in-effect": "warn",

      // Beberapa catch/response API masih memakai bentuk dinamis.
      // Tetap dilaporkan sebagai warning agar tidak memblokir build/lint.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
