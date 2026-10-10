#!/bin/sh
# Builds the GitHub Pages copy of the site from index.html (the claude.ai artifact source).
# The artifact host adds its own <!doctype>/<html>; a static host needs them in the file.
set -e
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="he" dir="rtl">\n'; cat index.html; printf '\n</html>\n'; } > pages/index.html
echo "pages/index.html written"
