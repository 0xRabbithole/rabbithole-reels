#!/usr/bin/env bash
# Render an animated reel .html to a 1080x1920 MP4 — no screen recording.
# Usage: ./render.sh <html> [seconds] [out.mp4] [voice.mp3] [cover.png]
#   ./render.sh ../../MCP_Reel_01/mcp_reel_visual.html 89 reel_01.mp4 voice.mp3 cover.png
set -euo pipefail
cd "$(dirname "$0")"

# sandbox: resolve the one missing system lib + skip Playwright's host-deps check
[ -f .ldpath ] && export LD_LIBRARY_PATH="$(cat .ldpath):${LD_LIBRARY_PATH:-}"
export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1

HTML="${1:?path to reel .html required}"
DUR="${2:-89}"
OUT="${3:-reel.mp4}"
VOICE="${4:-}"
COVER="${5:-}"
mkdir -p "$(dirname "$OUT")"

# Hold the cover poster at the very start, and trim the SAME amount off the reel's start
# so the poster flows straight into the already-settled first slide (no blank, no re-stamp).
# Keeping POSTER == PREROLL means the voiceover stays perfectly in sync with no audio delay.
POSTER=2.8
PREROLL=2.8

VF="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,format=yuv420p"

echo "▶ Recording $HTML (${DUR}s) ..."
node capture_reel.js "$HTML" "$DUR" "$(pwd)" | tee /tmp/cap.log
WEBM="$(grep '^RAW_WEBM=' /tmp/cap.log | tail -1 | cut -d= -f2-)"
[ -f "$WEBM" ] || { echo "✗ no video produced"; exit 1; }

USE_COVER=""
[ -n "$COVER" ] && [ -f "$COVER" ] && USE_COVER="1"

echo "▶ Transcoding to $OUT ${USE_COVER:+(+cover poster)} ..."
if [ -n "$VOICE" ] && [ -f "$VOICE" ]; then
  if [ -n "$USE_COVER" ]; then
    # Prepend the clean cover (fonts already loaded) as the first ${POSTER}s so the platform
    # auto-cover (first frame) is the headline, not the blank capture hold. Trim ${PREROLL}s of
    # the reel's blank pre-roll so the poster flows into the headline, and delay the voiceover by
    # the poster length so narration lines up with the reel. apad keeps the CTA held at the end.
    ffmpeg -y -loop 1 -t "$POSTER" -i "$COVER" -ss "$PREROLL" -i "$WEBM" -i "$VOICE" -filter_complex \
"[0:v]$VF[p];[1:v]$VF[r];[p][r]concat=n=2:v=1:a=0[v];[2:a]apad[a]" \
      -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -shortest "$OUT"
  else
    ffmpeg -y -i "$WEBM" -i "$VOICE" -vf "$VF" \
      -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -af apad -shortest "$OUT"
  fi
else
  if [ -n "$USE_COVER" ]; then
    ffmpeg -y -loop 1 -t "$POSTER" -i "$COVER" -ss "$PREROLL" -i "$WEBM" -filter_complex \
"[0:v]$VF[p];[1:v]$VF[r];[p][r]concat=n=2:v=1:a=0[v]" \
      -map "[v]" -c:v libx264 -crf 18 -preset medium -an "$OUT"
  else
    ffmpeg -y -i "$WEBM" -vf "$VF" -c:v libx264 -crf 18 -preset medium -an "$OUT"
  fi
fi

rm -rf _capture
echo "✓ Done: $OUT"
