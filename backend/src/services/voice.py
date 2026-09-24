import io
import wave

from google.genai import types

from .. import config
from .gemini_client import get_client

# Gemini's TTS models stream raw 16-bit PCM mono audio at this rate.
_PCM_SAMPLE_RATE = 24000
_PCM_SAMPLE_WIDTH = 2
_PCM_CHANNELS = 1


def _pcm_to_wav(pcm_bytes: bytes) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(_PCM_CHANNELS)
        wav_file.setsampwidth(_PCM_SAMPLE_WIDTH)
        wav_file.setframerate(_PCM_SAMPLE_RATE)
        wav_file.writeframes(pcm_bytes)
    return buffer.getvalue()


def synthesize_speech(text: str) -> bytes:
    response = get_client().models.generate_content(
        model=config.TTS_MODEL,
        contents=text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=config.TTS_VOICE)
                )
            ),
        ),
    )
    pcm_bytes = response.candidates[0].content.parts[0].inline_data.data
    return _pcm_to_wav(pcm_bytes)


def transcribe_audio(audio_bytes: bytes, mime_type: str) -> str:
    response = get_client().models.generate_content(
        model=config.DISPATCHER_MODEL,
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            "Transcribe exactly what is said in this audio clip. "
            "Reply with only the transcript text, nothing else. "
            "If nothing understandable was said, reply with an empty string.",
        ],
    )
    return (response.text or "").strip()
