#!/bin/bash
# Double-click to change the agent's settings. Enter keeps a value in [brackets].
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null || { echo "Install Node.js from https://nodejs.org first."; read -r; exit 1; }
node setup.mjs
echo "Done. Restart the agent (start-mac.command)."
read -r
