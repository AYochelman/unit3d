#!/bin/bash
# A 90-second broadcast without waiting for a print. The agent must be running.
cd "$(dirname "$0")"
node -e "require('fs').writeFileSync('.live-test', String(Date.now()))"
echo
echo "  Asked the agent for a 3-minute test broadcast."
echo "  Open https://unit-3d.com/livestream - video should appear within ~15 seconds."
echo
