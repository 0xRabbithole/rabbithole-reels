#!/usr/bin/env bash
# Render an animated reel .html to a 1080x1920 MP4 — no screen recording.
# Usage: ./render.sh <html> [seconds] [out.mp4] [voice.mp3]
#   ./render.sh ../../MCP_Reel_01/mcp_reel_visual.html 89 reel_01.mp4 voice.mp3
set -euo pipefail
cd "$(dirname "$0")"

# sandbox: resolve the one missing system lib + skip Playwright's host-deps check
[ -f .ldpath ] && export LD_LIBRARY_PATH="$(cat .ldpath):${LD_LIBRARY_PATH:-}"
export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1

HTML="${1:?path to reel .html required}"
DUR="${2:-89}"
OUT="${3:-reel.mp4}"
VOICE="${4:-}"
mkdir -p "$(dirname "$OUT")"

echo "▶ Recording $HTML (${DUR}s) ..."
node capture_reel.js "$HTML" "$DUR" "$(pwd)" | tee /tmp/cap.log
WEBM="$(grep '^RAW_WEBM=' /tmp/cap.log | tail -1 | cut -d= -f2-)"
[ -f "$WEBM" ] || { echo "✗ no video produced"; exit 1; }

echo "▶ Transcoding to $OUT ..."
if [ -n "$VOICE" ] && [ -f "$VOICE" ]; then
  ffmpeg -y -i "$WEBM" -i "$VOICE" \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p" \
    -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -shortest "$OUT"
else
  ffmpeg -y -i "$WEBM" \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p" \
    -c:v libx264 -crf 18 -preset medium -an "$OUT"
fi

rm -rf _capture
echo "✓ Done: $OUT"
