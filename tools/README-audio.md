# Audio pipeline

The MVP used the browser's `speechSynthesis`, which falls back to whatever the OS has installed (often a robotic formant voice). The A1 build ships **pre-generated Microsoft neural Korean audio** instead.

- Main narrator: `ko-KR-SunHiNeural` (female, natural)
- Second dialogue voice: `ko-KR-InJoonNeural` (male)
- Engine: [`edge-tts`](https://github.com/rany2/edge-tts) — uses the Edge read-aloud endpoint, no API key
- Format: 24 kHz mono MP3, 48 kbps (speech-optimised)
- Location: `app/audio/{s,w,d,g}/…`, with `app/audio/manifest.json`

Sentences also get a slow version (`<id>-slow.mp3`, rate −18 %) for the “slow” replay button.

## Regenerate

```bash
python3 -m venv /tmp/ttsenv
/tmp/ttsenv/bin/pip install edge-tts

node tools/build-content.mjs          # content → app/data/a1.js
node tools/generate-audio.mjs        # only missing clips
node tools/generate-audio.mjs --force # redo everything
node tools/generate-audio.mjs --only=s --limit=20   # smoke test
```

The generated files are committed so the app works offline with no runtime key.

## Fallback

`app/js/core/audio.js` uses the bundled clip first. If a clip is missing it falls back to `speechSynthesis` with the best available `ko-KR` voice, then to silence — audio never blocks a lesson.
