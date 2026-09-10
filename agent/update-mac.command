#!/bin/bash
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null || { echo "Install Node.js from https://nodejs.org first."; read -r; exit 1; }
node update.mjs
read -r
