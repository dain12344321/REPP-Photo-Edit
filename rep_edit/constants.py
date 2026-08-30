from __future__ import annotations

CONDITIONS = (
    "interior_hdr",
    "interior_single",
    "exterior_single",
    "virtual_twilight",
    "drone",
    "object_remove",
    "declutter",
    "yard_cleanup",
    "window_pull",
    "skipped",
)

# Shot-prompt section numbers in prompts/imagine-shot-prompts.md
CONDITION_TO_SECTION = {
    "interior_hdr": 1,
    "interior_single": 2,
    "exterior_single": 3,
    "virtual_twilight": 4,
    "drone": 5,
    "object_remove": 6,
    "declutter": 7,
    "yard_cleanup": 8,
    "window_pull": 9,
}

VIRTUAL_SUFFIX = {
    "virtual_twilight": "VT",
}

MODEL_DEFAULT = "grok-imagine-image-2.0"
ASPECT_RATIO = "3:2"
RESOLUTION = "2k"
EDIT_URL = "https://api.x.ai/v1/images/edits"
MAX_INPUT_IMAGES = 3

JPEG_SUFFIXES = {".jpg", ".jpeg", ".jpe"}

# Cluster frames shot within this many seconds as one bracket set.
BRACKET_WINDOW_SECONDS = 12
# Require at least this EV spread (stops) to treat a trio as HDR.
MIN_EV_SPREAD = 2.0
