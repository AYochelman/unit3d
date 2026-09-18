/**
 * The same instruction, phrased for the machine it is printed on.
 *
 * The agent runs on a Windows PC, on a Mac, or as a systemd service on a
 * Raspberry Pi. The .bat files exist only on the first of those, so a line
 * like "double-click camera.bat" is, on a Pi, an instruction its owner cannot
 * carry out — printed at the exact moment something has already gone wrong and
 * they are least able to guess the translation.
 *
 * Every user-facing "here is what to do next" goes through here. Adding a
 * platform means adding a branch once, not hunting the strings again.
 */

const WIN = process.platform === "win32";
const MAC = process.platform === "darwin";

/** On a Pi the agent is a service, so "run it again" means restarting that. */
const RESTART = "sudo systemctl restart unit3d-agent";

const pick = (win, mac, linux) => (WIN ? win : MAC ? mac : linux);

export const HINT = {
  /** Re-answer the setup questions. */
  settings: pick(
    "run settings.bat",
    "run settings-mac.command",
    `run: node setup.mjs && ${RESTART}`,
  ),

  /** Start the agent again after a change. */
  start: pick(
    "run start.bat again",
    "run start-mac.command again",
    `run: ${RESTART}`,
  ),

  /** Prove a picture really arrives from the printer's camera. */
  camera: pick(
    "double-click camera.bat",
    "run camera-mac.command",
    "run: node camera.mjs",
  ),

  /** Install ffmpeg, which the video path needs. */
  ffmpeg: pick(
    "double-click ffmpeg-install.bat",
    "run ffmpeg-install-mac.command",
    "run: sudo apt install -y ffmpeg",
  ),

  /** Check the live-video settings end to end. */
  liveCheck: pick(
    "double-click live-check.bat",
    "run live-check.mjs",
    "run: node live-check.mjs",
  ),
};
