# Young Heroes — original pitch

Source: [Devpost submission](https://devpost.com/software/young-heroes-hmi2vl)
(VietRocHack hackathon). Preserved here so "why does this exist" survives
independent of whoever built it.

## Inspiration

Only 34% of surveyed kids have been shown how to call 911 effectively, and
just 20% know what to say when they do. With the right knowledge, any child
can be a "young hero" by communicating effectively with 911 in an emergency.

## What it does

Young Heroes is pitched as "the world's first mobile app designed to create a
safe and accessible space for children aged 4 to 12" to recognize critical
situations and communicate effectively with 911.

- An interactive 911 dispatcher simulation where kids talk with an AI
  dispatcher in real time.
- AI-generated realistic scenarios, with multimedia elements — voice, text,
  and pictures.
- A user-friendly assessment component to verify the knowledge actually
  landed.

## Original tech stack (hackathon build)

- Frontend: React, Tailwind CSS, Figma for design, a voice-call simulation UI.
- Backend: Python/Flask, Claude 3.5 Sonnet as a custom-instructed dispatcher
  LLM, Whisper for speech-to-text/text-to-speech.

(The as-shipped hackathon code actually used OpenAI end-to-end — Assistants
API, OpenAI TTS, OpenAI Whisper — not Claude; see
`docs/adr/0002-gemini-for-voice-and-quiz.md` for what it's been migrated to
since.)

## Challenges called out

First time working with audio models, managing API call latency, prompt
engineering for child safety, and integrating the voice call simulation with
the UI smoothly.

## Future vision

Reach every child in America, then expand to multiple languages for global
accessibility.
