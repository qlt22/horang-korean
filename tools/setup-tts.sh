#!/usr/bin/env bash
# Reproducible neural TTS setup. Generates at 96 kbps (edge-tts defaults to 48).
set -euo pipefail
VENV="${HORANG_TTS_VENV:-/tmp/ttsenv}"
python3 -m venv "$VENV"
"$VENV/bin/pip" install -q --upgrade pip edge-tts
# edge-tts hardcodes 24 kHz / 48 kbps. Higher bitrate is noticeably cleaner.
find "$VENV" -path '*edge_tts/communicate.py' -exec sed -i \
  's/audio-24khz-48kbitrate-mono-mp3/audio-24khz-96kbitrate-mono-mp3/g' {} \;
echo "TTS ready: $VENV/bin/edge-tts (96 kbps)"
