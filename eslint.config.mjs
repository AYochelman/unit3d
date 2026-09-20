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
      // Caches, and the signed-in MakerWorld browser profile. A Chrome profile
      // is thousands of files of someone else's JavaScript sitting inside the
      // repo, and nothing here is ours to lint or type-check.
      "data/**",
      // Throw-away Playwright checks run by hand; not part of the site.
      "*.cjs",
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
