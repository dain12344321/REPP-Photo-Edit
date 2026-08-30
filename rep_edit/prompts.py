from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .constants import CONDITION_TO_SECTION

_SECTION_RE = re.compile(r"^##\s+(\d+)\.\s+(.*)$", re.MULTILINE)
_KEEP_TOKEN = "KEEP-CLAUSE"


@dataclass(frozen=True)
class PromptPack:
    source: Path
    keep_clause: str
    shots: dict[int, str]
    version_line: str

    def for_condition(self, condition: str, *, object_list: Optional[list[str]] = None) -> str:
        if condition == "skipped":
            raise ValueError("skipped items have no Imagine prompt")
        section = CONDITION_TO_SECTION.get(condition)
        if section is None:
            raise ValueError(f"no shot prompt for condition {condition!r}")
        body = self.shots.get(section)
        if not body:
            raise ValueError(f"missing section {section} in {self.source}")
        text = body.strip()
        if condition == "object_remove":
            filled = ", ".join(s.strip() for s in (object_list or []) if s.strip())
            if not filled:
                raise ValueError("object_remove requires a non-empty object list")
            text = text.replace("[LIST]", filled)
        if _KEEP_TOKEN in text:
            text = text.replace(_KEEP_TOKEN, self.keep_clause.strip())
        else:
            text = text.rstrip() + "\n\n" + self.keep_clause.strip()
        return _collapse_extra_blank(text).strip() + "\n"

    def prompt_id(self, condition: str) -> str:
        return condition

    def sha256(self, prompt: str) -> str:
        return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def load_prompt_pack(path: Optional[Path] = None) -> PromptPack:
    root = Path(__file__).resolve().parents[1]
    md_path = path or (root / "prompts" / "imagine-shot-prompts.md")
    raw = md_path.read_text(encoding="utf-8")
    if "source-long" in md_path.name.lower():
        raise ValueError("refusing to load the long manifesto as an Imagine prompt pack")
    version_line = ""
    for line in raw.splitlines()[:8]:
        if line.lower().startswith("version:"):
            version_line = line.split(":", 1)[1].strip()
            break
    matches = list(_SECTION_RE.finditer(raw))
    shots: dict[int, str] = {}
    keep = ""
    for i, match in enumerate(matches):
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else _end_of_shot_pack(raw, start)
        body = raw[start:end]
        body = _strip_horizontal_rules(body)
        n = int(match.group(1))
        if n == 0:
            keep = body.strip()
        else:
            shots[n] = body.strip()
    if not keep:
        raise ValueError(f"sticky keep-clause (section 0) missing in {md_path}")
    if sorted(shots) != list(range(1, 10)):
        raise ValueError(f"expected shot sections 1–9 in {md_path}, got {sorted(shots)}")
    return PromptPack(source=md_path, keep_clause=keep, shots=shots, version_line=version_line)


def _end_of_shot_pack(raw: str, start: int) -> int:
    marker = "\n## Do not send to Imagine"
    idx = raw.find(marker, start)
    return idx if idx != -1 else len(raw)


def _strip_horizontal_rules(body: str) -> str:
    lines = []
    for line in body.splitlines():
        if re.fullmatch(r"-{3,}", line.strip()):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def _collapse_extra_blank(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text)
