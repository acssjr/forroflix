import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // 1. Regras globais (estritas)
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "error",
    }
  },
  // 2. Overrides para banco de dados, APIs e testes que precisam de 'any' dinâmico por design
  {
    files: [
      "src/lib/db.ts",
      "src/app/api/**/*.ts",
      "tests/**/*.ts",
      "e2e/**/*.ts"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  // 3. Overrides para scripts e configurações que usam require()
  {
    files: [
      "scripts/**/*.js",
      "eslint.config.mjs",
      "playwright.config.ts",
      "src/lib/db.ts"
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  // 4. Overrides para componentes específicos onde o sincronismo prop-to-state em useEffect é tolerado
  {
    files: [
      "src/components/**/*.tsx",
      "src/app/**/*.tsx"
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  }
]);

export default eslintConfig;
