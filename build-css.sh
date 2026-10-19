#!/bin/sh
# Rebuilds tailwind.css (needs the standalone Tailwind CLI v3: https://github.com/tailwindlabs/tailwindcss/releases)
# Usage: ./build-css.sh [path-to-tailwindcss-binary]
set -e
cd "$(dirname "$0")"
"${1:-tailwindcss}" -c tailwind.config.js -i src/tailwind.input.css -o tailwind.css --minify
