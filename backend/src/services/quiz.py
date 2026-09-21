from google.genai import types

from .. import config
from .gemini_client import get_client

STYLE_PREFIX = (
    "A flat-color, friendly children's storybook illustration, square "
    "composition, soft rounded shapes, bright cheerful palette, no text or "
    "letters anywhere in the image, safe and non-graphic even when depicting "
    "danger. Subject: "
)

# The fixed set of images the two quiz mini-games need. Filenames match what
# the frontend scenario/question data in src/app/skills/**/page.jsx expects
# under frontend/public/assets/generated/.
RECOGNIZE_SCENARIO_IMAGES = {
    "kitchen-smoke.png": "a child standing in a kitchen doorway noticing a faint wisp of smoke drifting from the stove",
    "stove-fire.png": "a small contained fire flickering on a stovetop pan in a kitchen, seen from a safe distance",
    "window-open.png": "a child opening a window in a smoky room to let smoke out, smoke gently swirling near the ceiling",
    "fire-worse.png": "a kitchen fire that has grown larger on the stove after water was poured on it, flames a bit higher",
    "see-fire.png": "a child standing safely outside on the sidewalk looking back at their house with light smoke coming from a window",
    "burning-house.png": "a house with smoke coming from an upstairs window, seen from across the street at a safe distance",
    "call-help.png": "a child and a friendly neighbor standing together outside a house, the neighbor pointing at a phone",
}

COMMUNICATE_OPTION_IMAGES = {
    "emergency-fire.png": "a small cheerful cartoon flame icon representing a fire emergency",
    "emergency-medical.png": "a friendly cartoon ambulance icon representing a medical emergency",
    "emergency-danger.png": "a friendly cartoon police officer badge icon representing danger or needing safety help",
    "emergency-other.png": "a friendly cartoon firefighter helmet icon representing another kind of emergency",
    "location-home.png": "a cute cartoon icon of a cozy house representing being at home",
    "location-school.png": "a cute cartoon icon of a school building representing being at school",
    "location-park.png": "a cute cartoon icon of a playground with a slide representing being at a park",
    "location-mall.png": "a cute cartoon icon of a shopping mall storefront representing being at a shopping mall",
    "hurt-me.png": "a cute cartoon icon of a single child pointing at themselves representing 'just me'",
    "hurt-parents.png": "a cute cartoon icon of two parent figures representing 'my parents'",
    "hurt-friends.png": "a cute cartoon icon of two kids giving a high five representing 'my friends'",
    "hurt-siblings.png": "a cute cartoon icon of two sibling kids standing together representing 'my siblings'",
    "problem-stuck.png": "a cute cartoon icon of a small hole or gap representing being stuck",
    "problem-broken-leg.png": "a cute cartoon icon of a leg with a cast representing a broken leg",
    "problem-dizzy.png": "a cute cartoon icon of a swirl/dizzy-eyes symbol representing feeling dizzy",
    "problem-stomach.png": "a cute cartoon icon of a stomach with a small ache symbol representing a stomach ache",
}

ALL_QUIZ_IMAGES = {**RECOGNIZE_SCENARIO_IMAGES, **COMMUNICATE_OPTION_IMAGES}


def generate_image(prompt: str) -> bytes:
    response = get_client().models.generate_content(
        model=config.IMAGE_MODEL,
        contents=[STYLE_PREFIX + prompt],
        config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            return part.inline_data.data
    raise RuntimeError(f"Gemini returned no image for prompt: {prompt!r}")
