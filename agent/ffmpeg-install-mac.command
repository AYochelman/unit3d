#!/bin/bash
# Reading the printer's video stream needs ffmpeg. On a Mac, Homebrew has it.
cd "$(dirname "$0")" || exit 1
if command -v ffmpeg >/dev/null; then echo "ffmpeg is already installed."; read -r; exit 0; fi
if ! command -v brew >/dev/null; then
  echo "Install Homebrew first: https://brew.sh — then run this again."
  read -r; exit 1
fi
brew install ffmpeg
echo
echo "Done. Close the agent window and run start-mac.command again."
read -r
