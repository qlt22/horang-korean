# Audio quality — what was wrong and what changed

## Symptoms

The A1 build shipped Microsoft neural clips, but the experience still felt robotic. Two separate causes:

1. **The personalised first sentence had no clip.** `저는 {name}입니다` contains a runtime name, so it fell through to `speechSynthesis` — the operating system voice. On Linux that is usually espeak; it is the first thing a new learner hears, and it sounds synthetic.
2. **The encoder was edge-tts's default: 24 kHz mono at 48 kbps.** That is fine for a phone call, but it adds audible compression artefacts to sibilants and makes the voice sound thinner and flatter than the underlying neural model.

Neither problem was the voice itself — SunHiNeural is a modern neural voice.

## Fixes

| Fix | Detail |
|---|---|
| **96 kbps encoding** | `tools/setup-tts.sh` patches edge-tts's hardcoded `audio-24khz-48kbitrate-mono-mp3` to `audio-24khz-96kbitrate-mono-mp3`. Every clip was regenerated. |
| **Warmer prosody** | Sentences at rate **−6 %**, pitch **−2 Hz**; words −10 %/−1 Hz; slow replay −24 %. Less clipped, better for learners. |
| **No OS voice** | A local neural endpoint, `GET /api/tts?text=…&voice=…&rate=…`, synthesises arbitrary text (names, new content) and caches it by hash in `app/audio/dyn/`. `audio.js` tries the bundle → the endpoint → `speechSynthesis` only as a last resort. |
| **Three real voices** | Settings → *Korean voice*: **SunHi** (bundled, instant), **InJoon** (male, calm), **Hyunsu** (male, conversational). Non-SunHi voices stream the same text through the endpoint and cache it. Each option plays a sample on tap. |
| **First-sentence pre-warm** | After the name step, the app prefetches `저는 {name}입니다` so the hook is instant and neural. |

## Verify it yourself

```bash
# 96 kbps, not 48
ffprobe -v error -show_entries format=bit_rate -of csv=p=0 app/audio/s/s01_1_1.mp3

# dynamic TTS (should return an MP3)
curl -s "http://localhost:4173/api/tts?text=저는%20루카스입니다.&voice=sunhi" -o /tmp/a.mp3
ffprobe -v error -show_entries format=bit_rate,format=duration -of default=noprint_wrappers=1 /tmp/a.mp3
```

In the app: **Me → Settings → Korean voice**, tap each of the three, then *Hear a sample*. Start a lesson: the first sentence should now match the rest of the course.

## Limits

This is still synthetic speech. It is clear, correctly pronounced, and consistent; it is not a human voice actor. For a commercial release, record 300–400 sentences with a Korean voice actor using the ids in `app/audio/manifest.json` — the player needs no code change. Alternatively, swap `/api/tts` for a licensed Azure/Google/Naver key and keep the same interface.
