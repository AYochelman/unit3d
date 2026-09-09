#!/bin/bash
# What the agent is saying, live. Ctrl+C to stop watching (the agent keeps running).
exec journalctl -u unit3d-agent -f -n 40 --no-pager
