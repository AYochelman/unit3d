#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Unit 3D printer agent — install on a Raspberry Pi (or any Linux box).
#
# Run once:   bash pi-install.sh
#
# It installs Node if the Pi does not have a new enough one, asks the same five
# questions the Windows wizard asks, and then registers the agent as a service:
# it starts by itself when the Pi boots, restarts by itself if it ever stops,
# and needs no screen, keyboard or logged-in session. Unlike the PC, a Pi can be
# left plugged in behind the printer and forgotten.
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")"
HERE="$(pwd)"
SERVICE=unit3d-agent

say() { printf '\n\033[1;32m%s\033[0m\n' "$1"; }
die() { printf '\n\033[1;31m%s\033[0m\n\n' "$1"; exit 1; }

[ "$(id -u)" -eq 0 ] && die "Do not run this with sudo. Run it as your normal user: bash pi-install.sh"

# ─── Node ────────────────────────────────────────────────────────────────────
node_major() { command -v node >/dev/null 2>&1 && node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0; }

if [ "$(node_major)" -lt 18 ]; then
  say "Installing Node.js (this takes a few minutes on a Pi)..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq nodejs npm curl >/dev/null 2>&1 || true
  if [ "$(node_major)" -lt 18 ]; then
    # Raspberry Pi OS ships an old Node on older releases; NodeSource has current
    # builds for both 32- and 64-bit Pi.
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null
    sudo apt-get install -y nodejs
  fi
fi
[ "$(node_major)" -lt 18 ] && die "Could not install Node.js 18 or newer. Install it manually and run this again."
say "Node.js $(node -v) — ok"

# ─── The agent's own packages ────────────────────────────────────────────────
say "Installing the agent's packages..."
npm install --no-audit --no-fund --silent

# ─── Settings ────────────────────────────────────────────────────────────────
if [ -f config.json ]; then
  say "config.json already exists — keeping it. (Run 'node setup.mjs' to change it.)"
else
  say "Five questions. Press Enter to accept anything in [brackets]."
  node setup.mjs
fi
[ -f config.json ] || die "No config.json was written, so there is nothing to run yet."

# ─── The service ─────────────────────────────────────────────────────────────
say "Registering the agent so it starts on boot..."
sudo tee /etc/systemd/system/$SERVICE.service >/dev/null <<UNIT
[Unit]
Description=Unit 3D printer agent
Documentation=https://unit-3d.com/livestream
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HERE
ExecStart=$(command -v node) $HERE/printer-agent.mjs
Restart=always
RestartSec=10
# The printer is on the LAN and may answer late after a power cut; keep trying.
StartLimitIntervalSec=0
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now $SERVICE >/dev/null 2>&1
sleep 3

say "Done. The agent is running and will come back on its own after a reboot."
cat <<TXT

  See what it is doing now:   bash pi-logs.sh
  Stop it:                    sudo systemctl stop $SERVICE
  Start it again:             sudo systemctl start $SERVICE
  Change the settings:        node setup.mjs  &&  sudo systemctl restart $SERVICE
  Check the connection:       node check.mjs

TXT
systemctl --no-pager --lines=12 status $SERVICE || true
