#!/bin/bash
# Double-click on macOS. Same as start.bat, for a Mac beside the printer.
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null || { echo "Install Node.js from https://nodejs.org first."; read -r; exit 1; }
[ -d node_modules ] || npm install --no-audit --no-fund || { echo "install failed"; read -r; exit 1; }
[ -f config.json ] || node setup.mjs || { read -r; exit 1; }
echo "Running. Leave this window open."
node printer-agent.mjs
read -r
