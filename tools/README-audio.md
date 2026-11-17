# Audio pipeline

The MVP used the browser's `speechSynthesis`, which falls back to whatever the OS has installed (often a robotic formant voice). The A1 build ships **pre-generated Microsoft neural Korean audio** instead.

- Main narrator: `ko-KR-SunHiNeural` (female) · second dialogue voice: `ko-KR-InJoonNeural` (male) · optional `ko-KR-HyunsuMultilingualNeural`
- Engine: [`edge-tts`](https://github.com/rany2/edge-tts) — Edge read-aloud endpoint, no API key
- Format: **24 kHz mono MP3 at 96 kbps** — edge-tts hardcodes 48 kbps, so `setup-tts.sh` patches it. The higher bitrate is audibly cleaner.
- Prosody: rate −6 %, pitch −2 Hz for sentences; words −10 %/−1 Hz; slow replays −24 %
- Location: `app/audio/{s,w,d,g}/…`, cached dynamic clips in `app/audio/dyn/`
- Sentences also get a slow version (`<id>-slow.mp3`) for the “slow” replay button

## Runtime voice switching

`app/js/core/audio.js` plays the bundled SunHi clips by default. If the learner picks InJoon or Hyunsu in Settings, the same text is streamed from `GET /api/tts` and cached by hash. The personalised first sentence (which cannot be pre-generated because it contains the learner's name) always uses that endpoint, so no OS voice is ever heard.

## Regenerate

```bash
bash tools/setup-tts.sh        # creates /tmp/ttsenv and patches 48 → 96 kbps

node tools/build-content.mjs          # content → app/data/a1.js
node tools/generate-audio.mjs        # only missing clips
node tools/generate-audio.mjs --force # redo everything
node tools/generate-audio.mjs --only=s --limit=20   # smoke test
```

The generated files are committed so the app works offline with no runtime key.

## Fallback

`app/js/core/audio.js` uses the bundled clip first. If a clip is missing it falls back to `speechSynthesis` with the best available `ko-KR` voice, then to silence — audio never blocks a lesson.
