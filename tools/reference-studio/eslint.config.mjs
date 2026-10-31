// Same shape as the repository root's config - eslint-config-next 16 ships flat
// configs directly, and going through FlatCompat crashes on them.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "data/**", "next-env.d.ts", "workflows/**"] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true, argsIgnorePattern: "^_" }],
    },
  },
  {
    // The rule is about the pages router, which this app does not have. The
    // stylesheet sits in the App Router's own <head>, so it loads once for the
    // whole app - which is exactly what the rule is asking for.
    files: ["app/layout.tsx"],
    rules: { "@next/next/no-page-custom-font": "off" },
  },
];

export default eslintConfig;
