import pathlib

from google.genai import types

from .. import config
from .gemini_client import get_client

# All 23 quiz images were originally generated independently with one loose
# text-only style prompt, so each came back in a visibly different art style
# (some full-color storybook scenes, some flat icons, inconsistent linework
# and palette). This anchors every image to the ONE illustration style the
# rest of the app already uses (see frontend/public/assets/teamwork.png on
# the home screen: thin uniform black outlines, minimal white/cream fill, a
# single mint-teal accent color, simple dot eyes, no shading or texture) by
# (1) describing that style explicitly and (2) passing teamwork.png itself as
# a reference image alongside the text prompt on every generation call, since
# text description alone doesn't hold style consistent across many
# independent calls.
_REFERENCE_IMAGE_PATH = (
    pathlib.Path(__file__).resolve().parents[3] / "frontend" / "public" / "assets" / "teamwork.png"
)

_COMMON_STYLE = (
    "Match the exact illustration style of the attached reference image: flat "
    "vector art with uniform thin black outlines, minimal flat color fill and "
    "no gradients, shading, or texture, simple minimal faces (small dot eyes, "
    "no detailed mouths), plain white background. No text or letters anywhere "
    "in the image."
)

# For RECOGNIZE_SCENARIO_IMAGES: full environmental scenes with a child,
# shown large in a rounded rectangle. These need some naturalistic color
# (orange/red flame, gray smoke) so kids can actually recognize the hazard —
# a strict two-tone palette would defeat the point of the illustration.
SCENE_STYLE_PREFIX = (
    _COMMON_STYLE + " Wide, calm scene composition with a simplified child "
    "character in a home or outdoor environment. Keep every element white, "
    "cream, or the reference image's mint-teal accent color EXCEPT where "
    "naturalistic color is needed for safety recognition — warm orange/red "
    "for flame, soft gray for smoke. Reassuring rather than frightening, "
    "appropriate for young children. Subject: "
)

# For COMMUNICATE_OPTION_IMAGES: small symbolic icons shown inside circular
# buttons in a 2-column grid, so they need to read clearly at a small size
# with no scene/background clutter competing with the label under them.
ICON_STYLE_PREFIX = (
    _COMMON_STYLE + " A single centered symbol, bold and simple enough to "
    "read at a small size like an app icon, mostly white/cream fill with the "
    "reference image's mint-teal accent color as the one highlight color, no "
    "scene or background elements, no drop shadow. Subject: "
)

# The fixed set of images the two quiz mini-games need. Filenames match what
# the frontend scenario/question data in src/app/skills/**/page.jsx expects
# under frontend/public/assets/generated/.
RECOGNIZE_SCENARIO_IMAGES = {
    "kitchen-smoke.jpg": "a child standing in a kitchen doorway noticing a faint wisp of smoke drifting from the stove",
    "stove-fire.jpg": "a small contained fire flickering on a stovetop pan in a kitchen, seen from a safe distance",
    "window-open.jpg": "a child opening a window in a smoky room to let smoke out, smoke gently swirling near the ceiling",
    "fire-worse.jpg": "a kitchen fire that has grown larger on the stove after water was poured on it, flames a bit higher",
    "see-fire.jpg": "a child standing safely outside on the sidewalk looking back at their house with light smoke coming from a window",
    "burning-house.jpg": "a house with smoke coming from an upstairs window, seen from across the street at a safe distance",
    "call-help.jpg": "a child and a friendly neighbor standing together outside a house, the neighbor pointing at a phone",
}

COMMUNICATE_OPTION_IMAGES = {
    "emergency-fire.jpg": "a small flame symbol representing a fire emergency",
    "emergency-medical.jpg": "an ambulance symbol representing a medical emergency",
    "emergency-danger.jpg": "a police badge symbol representing danger or needing safety help",
    "emergency-other.jpg": "a firefighter helmet symbol representing another kind of emergency",
    "location-home.jpg": "a cozy house representing being at home",
    "location-school.jpg": "a school building representing being at school",
    "location-park.jpg": "a playground with a slide representing being at a park",
    "location-mall.jpg": "a shopping mall storefront representing being at a shopping mall",
    "hurt-me.jpg": "a single child pointing at themselves representing 'just me'",
    "hurt-parents.jpg": "two parent figures representing 'my parents'",
    "hurt-friends.jpg": "two kids giving a high five representing 'my friends'",
    "hurt-siblings.jpg": "two sibling kids standing together representing 'my siblings'",
    "problem-stuck.jpg": "a small hole or gap representing being stuck",
    "problem-broken-leg.jpg": "a leg with a cast representing a broken leg",
    "problem-dizzy.jpg": "a swirl/dizzy-eyes symbol representing feeling dizzy",
    "problem-stomach.jpg": "a stomach with a small ache symbol representing a stomach ache",
}


def generate_image(styled_prompt: str) -> bytes:
    reference_image = types.Part.from_bytes(
        data=_REFERENCE_IMAGE_PATH.read_bytes(), mime_type="image/png"
    )
    response = get_client().models.generate_content(
        model=config.IMAGE_MODEL,
        contents=[reference_image, styled_prompt],
        config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            return part.inline_data.data
    raise RuntimeError(f"Gemini returned no image for prompt: {styled_prompt!r}")
