import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-old/**",
      "node_modules/**",
      "handoff/**",
      "_recovered-newest/**",
      "next-env.d.ts",
      "out/**",
      // Throw-away Playwright checks run by hand; not part of the site.
      "*.cjs",
      // Vendored bundles shipped inside the impeccable skill install.
      "**/skills/impeccable/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true, argsIgnorePattern: "^_" }],
    },
  },
];

export default eslintConfig;
