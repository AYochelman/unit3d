#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Unit 3D on a Raspberry Pi — the whole thing, from one line.
#
#   curl -fsSL https://raw.githubusercontent.com/AYochelman/unit3d/main/agent/pi-bootstrap.sh | bash
#
# It fetches the project, then hands over to pi-install.sh, which installs what
# is missing, asks the settings questions and registers the agent as a service.
# Running it again later updates the code and restarts the agent, so it doubles
# as the update command.
# ─────────────────────────────────────────────────────────────────────────────
set -e
REPO=https://github.com/AYochelman/unit3d.git
DIR="$HOME/unit3d"

say() { printf '\n\033[1;32m%s\033[0m\n' "$1"; }

command -v git >/dev/null || { say "Installing git..."; sudo apt-get update -qq && sudo apt-get install -y -qq git; }

if [ -d "$DIR/.git" ]; then
  say "Updating the project already here..."
  git -C "$DIR" pull --ff-only
else
  say "Fetching the project..."
  git clone --depth 1 "$REPO" "$DIR"
fi

cd "$DIR/agent"
exec bash pi-install.sh
