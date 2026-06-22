import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // 降级为 warn — V4 CI 管线允许 any 类型通过（存量代码清理中）
      "@typescript-eslint/no-explicit-any": "warn",
      // 降级为 warn — 存量 img 标签后续迁移到 next/image
      "@next/next/no-img-element": "warn",
      // 降级为 warn — 存量 effect 副作用后续重构
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
