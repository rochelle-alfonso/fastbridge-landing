#!/usr/bin/env bash
# Generate Safari HEVC (hvc1) files from Remotion transparent WebM exports.
#
# Prereqs: Mac with ffmpeg + VideoToolbox. Export clean transparent WebMs first:
#   npx remotion render --codec=vp9 --pixel-format=yuva420p --image-format=png \
#     YourComp ../assets/hiw-step-1.webm
#
# Usage (from repo root):
#   ./tools/encode-hiw-hevc.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/assets"

for n in 1 2 3; do
  in="$ASSETS/hiw-step-${n}.webm"
  out="$ASSETS/hiw-step-${n}-hevc.mp4"

  if [[ ! -f "$in" ]]; then
    echo "Missing $in — export from Remotion first." >&2
    exit 1
  fi

  echo "Encoding $out ..."
  # Fail fast if the WebM has no transparent pixels (common when Remotion
  # composition background or a fog layer is left opaque).
  transparent=$(
    ffmpeg -y -i "$in" -frames:v 1 -f rawvideo -pix_fmt rgba - 2>/dev/null \
      | python3 -c "
import sys
data = sys.stdin.buffer.read()
print(sum(1 for i in range(0, len(data), 4) if data[i+3] < 16))
"
  )
  if [[ "${transparent:-0}" -lt 100 ]]; then
    echo "ERROR: $in has no transparent pixels — re-export from Remotion with a transparent composition background (yuva420p)." >&2
    exit 1
  fi

  ffmpeg -y -i "$in" -an \
    -filter_complex "[0:v]format=rgba" \
    -c:v hevc_videotoolbox -allow_sw 1 -alpha_quality 1 -tag:v hvc1 \
    -movflags +faststart \
    "$out"
done

echo "Done. Commit assets/hiw-step-*-hevc.mp4 and deploy."
