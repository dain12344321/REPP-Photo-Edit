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
ALLOWED_MODELS = frozenset({"grok-imagine-image-2.0"})
ASPECT_RATIO = "3:2"
RESOLUTION = "2k"
QUALITY = "medium"
EDIT_URL = "https://api.x.ai/v1/images/edits"
MAX_INPUT_IMAGES = 3
PREFLIGHT_LONG_EDGE = 2048
PREFLIGHT_JPEG_QUALITY = 95
MIN_OUTPUT_LONG_EDGE = 1920

JPEG_SUFFIXES = {".jpg", ".jpeg", ".jpe"}

# Official Drive folders (Lakeshore INBOX / OUTBOX).
DRIVE_INBOX_ID = "1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ"
DRIVE_OUTBOX_ID = "1-W86toL_viRDEoyXX5JMR0ab68g2x62G"

# Cluster frames shot within this many seconds as one bracket set.
BRACKET_WINDOW_SECONDS = 12
# Require at least this EV spread (stops) to treat a trio as HDR.
MIN_EV_SPREAD = 2.0
