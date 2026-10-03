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
      // Reference Studio is a separate local tool with its own tsconfig and
      // eslint config (tools/reference-studio). It is never built into the
      // shop, so it must not be able to fail the shop's gates either.
      "tools/**",
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
