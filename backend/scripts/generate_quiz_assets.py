"""One-time script: generate the quiz scenario/option images with Gemini and
write them into the frontend's public assets.

Run once (and again only if the prompts change), not on every request — see
docs/adr/0003-quiz-images-pregenerated.md for why these are static files
instead of a live generation endpoint.

Usage:
    GEMINI_API_KEY=... python backend/scripts/generate_quiz_assets.py
"""

import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from src.services.quiz import ALL_QUIZ_IMAGES, generate_image  # noqa: E402

OUTPUT_DIR = pathlib.Path(__file__).resolve().parents[2] / "frontend" / "public" / "assets" / "generated"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, prompt in ALL_QUIZ_IMAGES.items():
        out_path = OUTPUT_DIR / filename
        print(f"Generating {filename} ...")
        image_bytes = generate_image(prompt)
        out_path.write_bytes(image_bytes)
        print(f"  wrote {out_path} ({len(image_bytes)} bytes)")
        time.sleep(1)  # be gentle with rate limits


if __name__ == "__main__":
    main()
