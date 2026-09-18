#!/usr/bin/env node
// Launches Next.js for the studio with this folder as the working directory,
// resolving the `next` binary from wherever it is installed - the repository
// root (the normal case, because the studio shares the root's node_modules) or
// a local install. Keeping it in one script means the npm scripts at the root
// and here stay identical on Windows and Unix.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(here, "..");
const require = createRequire(resolve(projectDir, "package.json"));

let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next");
} catch {
  console.error(
    "\n  Could not find Next.js.\n" +
      "  Reference Studio shares the repository root's dependencies.\n" +
      "  Run `npm install` in the repository root first, then try again.\n",
  );
  process.exit(1);
}

const command = process.argv[2] ?? "dev";
const rest = process.argv.slice(3);
const port = rest.includes("-p") || rest.includes("--port") ? [] : ["-p", process.env.STUDIO_PORT || "3100"];
const args = command === "build" ? [command, ...rest] : [command, ...port, ...rest];

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: projectDir,
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
