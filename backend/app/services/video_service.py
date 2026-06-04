from __future__ import annotations

import re
from typing import Literal


SOCIAL_VIDEO_PATTERN = re.compile(
    r"^(https?:\/\/)?([a-z0-9-]+\.)*"
    r"(facebook\.com|fb\.com|fb\.watch|instagram\.com|instagr\.am|x\.com|twitter\.com|tiktok\.com|snapchat\.com|linkedin\.com|youtube\.com|youtu\.be|pinterest\.com|pin\.it|reddit\.com|whatsapp\.com|wa\.me|telegram\.org|t\.me|telegram\.me|discord\.com|discord\.gg|discordapp\.com|vimeo\.com|threads\.net|medium\.com)"
    r"($|\/.*)",
    re.IGNORECASE,
)


def is_valid_social_video_url(url: str) -> bool:
    return bool(SOCIAL_VIDEO_PATTERN.match(url.strip()))

