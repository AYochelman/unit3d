// Skip lint compat layer — ESLint 9 + eslint-config-next FlatCompat has known issues.
// Validation runs via `next build` (TypeScript) instead.
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "handoff/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
