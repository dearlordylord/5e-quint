# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = [
#   "pymupdf4llm==1.28.2",
# ]
# ///
"""Generate a page-mapped SRD Markdown candidate from the pinned PDF."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import Any

import pymupdf
import pymupdf4llm


SCRIPT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = SCRIPT_ROOT / "section-manifest.json"
DEFAULT_SOURCE = SCRIPT_ROOT / "pdf-source.json"
SOURCE_MAP_NAME = ".source-map.json"
SPLIT_WORD_TAG = re.compile(
    r"(?<=[A-Za-z])</(?:mark|u)>\s+(?=[a-z])", re.IGNORECASE
)
EXTRACTION_TAG = re.compile(r"</?(?:mark|u)>", re.IGNORECASE)
DECORATED_HEADING = re.compile(r"^(#{1,6}\s+)\*\*(.+)\*\*$")
DEEP_HEADING = re.compile(r"^(#{4,6})(\s+.+)$")
LINE_BREAK_HYPHENATION = re.compile(
    r"(?<=[A-Za-z])-\s*\n(?:\s*\n)*\s*(?=[a-z])"
)
STAT_FIELD_BOUNDARY = re.compile(
    r"\s+(?=\*\*(?:AC|HP|Speed|Skills|Senses|Languages|CR)\*\*)"
)
STAT_FIELDS_WITH_BREAK = re.compile(
    r"^\*\*(?:AC|HP|Speed|Skills|Senses|Languages)\*\*"
)
ABILITY_LABEL = re.compile(
    r"\*\*\s*(Str|Dex|Con|Int|Wis|Cha)\s*\*\*", re.IGNORECASE
)
ABILITY_NAMES = ("str", "dex", "con", "int", "wis", "cha")
STAT_SECTION_HEADINGS = {
    "Traits",
    "Actions",
    "Bonus Actions",
    "Reactions",
    "Legendary Actions",
}
CANONICAL_HEADING_TEXT = {"Will-o’-Wisp": "Will-o'-Wisp"}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".scratch/srd-5.2.1-candidate"),
    )
    parser.add_argument("--replace", action="store_true")
    return parser.parse_args()


def read_manifest(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise SystemExit("section manifest must contain an object")
    return value


def validate_output_path(output: Path) -> Path:
    resolved = output.resolve()
    cwd = Path.cwd().resolve()
    scratch_root = cwd / ".scratch"
    if resolved == scratch_root or not resolved.is_relative_to(scratch_root):
        raise SystemExit(f"output must be below {scratch_root}: {resolved}")
    return resolved


def prepare_output(output: Path, replace: bool) -> None:
    if not output.exists():
        output.mkdir(parents=True)
        return
    if not replace:
        raise SystemExit(f"output already exists (pass --replace): {output}")
    source_map = output / SOURCE_MAP_NAME
    if source_map.is_symlink() or not source_map.is_file():
        raise SystemExit(
            f"refusing to replace output without {SOURCE_MAP_NAME}: {output}"
        )
    shutil.rmtree(output)
    output.mkdir(parents=True)


def visible_heading(line: str) -> str | None:
    match = re.fullmatch(r"#{1,6}\s+(.+)", line)
    return match.group(1).strip().strip("*_") if match else None


def normalize_ability_tables(lines: list[str]) -> list[str]:
    normalized: list[str] = []
    index = 0
    while index < len(lines):
        if not lines[index].startswith("|"):
            normalized.append(lines[index])
            index += 1
            continue
        end = index
        while end < len(lines) and lines[end].startswith("|"):
            end += 1
        table = lines[index:end]
        searchable = " ".join(table).casefold()
        if all(f"**{name}" in searchable for name in ABILITY_NAMES):
            content_rows = [
                row
                for row in table
                if not re.fullmatch(r"\|(?:\s*:?-+:?\s*\|)+", row)
            ]
            flattened = " ".join(
                row.replace("<br>", " ").replace("|", " ")
                for row in content_rows
            )
            flattened = ABILITY_LABEL.sub(
                lambda match: f"**{match.group(1).title()}** ", flattened
            )
            normalized.append(re.sub(r"\s+", " ", flattened).strip())
        else:
            normalized.extend(table)
        index = end
    return normalized


def normalize_split_stat_headings(lines: list[str]) -> list[str]:
    normalized = list(lines)
    for index, line in enumerate(lines):
        heading = visible_heading(line)
        if heading is None:
            continue
        if heading in STAT_SECTION_HEADINGS:
            normalized[index] = f"#### {heading}"
            continue
        following = next(
            (candidate for candidate in lines[index + 1 :] if candidate.strip()), ""
        )
        if following.startswith("_") or following.startswith("**AC**"):
            normalized[index] = f"### {heading}"
    return normalized


def lines_for_page(
    text: str, heading_replacements: dict[str, str] | None = None
) -> list[str]:
    lines: list[str] = []
    joined_text = SPLIT_WORD_TAG.sub("", text)
    normalized_text = EXTRACTION_TAG.sub("", joined_text)
    dehyphenated_text = LINE_BREAK_HYPHENATION.sub("", normalized_text)
    for extracted_line in dehyphenated_text.strip().splitlines():
        line = extracted_line.rstrip()
        decorated_heading = DECORATED_HEADING.fullmatch(line)
        undecorated_line = (
            f"{decorated_heading.group(1)}{decorated_heading.group(2)}"
            if decorated_heading
            else line
        )
        deep_heading = DEEP_HEADING.fullmatch(undecorated_line)
        normalized_line = (
            f"{deep_heading.group(1)[1:]}{deep_heading.group(2)}"
            if deep_heading
            else undecorated_line
        )
        heading = visible_heading(normalized_line)
        if heading in CANONICAL_HEADING_TEXT:
            normalized_line = normalized_line.replace(
                heading, CANONICAL_HEADING_TEXT[heading], 1
            )
            heading = CANONICAL_HEADING_TEXT[heading]
        replaced_line = (
            heading_replacements[heading]
            if heading_replacements is not None
            and heading is not None
            and heading in heading_replacements
            else normalized_line
        )
        stat_parts = STAT_FIELD_BOUNDARY.split(replaced_line)
        lines.extend(
            f"{part} <br>" if STAT_FIELDS_WITH_BREAK.match(part) else part
            for part in stat_parts
        )
    normalized_lines = normalize_ability_tables(lines)
    return (
        normalize_split_stat_headings(normalized_lines)
        if heading_replacements is not None
        and heading_replacements.get("__statBlockColumns__") == "true"
        else normalized_lines
    )


def section_page_lines(
    lines: list[str], section: dict[str, Any], page_number: int
) -> list[str]:
    start = 0
    end = len(lines)
    if page_number == section["firstPage"] and "startAtHeading" in section:
        heading = section["startAtHeading"]
        start = next(
            (
                index
                for index, line in enumerate(lines)
                if visible_heading(line) == heading
            ),
            -1,
        )
        if start < 0:
            raise SystemExit(
                f"page {page_number} is missing start heading {heading!r}"
            )
    if page_number == section["lastPage"] and "endBeforeHeading" in section:
        heading = section["endBeforeHeading"]
        end = next(
            (
                index
                for index, line in enumerate(lines)
                if visible_heading(line) == heading
            ),
            -1,
        )
        if end < 0:
            raise SystemExit(
                f"page {page_number} is missing end heading {heading!r}"
            )
    if start >= end:
        raise SystemExit(f"page {page_number} has an empty or reversed section slice")
    return lines[start:end]


def extract_split_page(
    document: pymupdf.Document, split: dict[str, Any]
) -> str:
    page_number = split["page"]
    source_page = document[page_number - 1]
    width = source_page.rect.width
    height = source_page.rect.height
    clips = (
        pymupdf.Rect(
            split["left"], split["top"], split["gutter"], height - split["bottom"]
        ),
        pymupdf.Rect(
            split["gutter"], split["top"], width - split["right"], height - split["bottom"]
        ),
    )
    columns: list[str] = []
    for clip in clips:
        cropped = pymupdf.open()
        cropped_page = cropped.new_page(width=clip.width, height=clip.height)
        cropped_page.show_pdf_page(cropped_page.rect, document, page_number - 1, clip=clip)
        columns.append(
            pymupdf4llm.to_markdown(
                cropped,
                show_progress=False,
                use_ocr=False,
                force_ocr=False,
                header=False,
                footer=False,
            ).strip()
        )
        cropped.close()
    return "\n\n".join(columns)


def main() -> None:
    args = arguments()
    manifest = read_manifest(args.manifest)
    source_contract = read_manifest(args.source)
    pdf_path = Path(source_contract["path"])
    expected_digest = source_contract["sha256"]
    actual_digest = sha256_file(pdf_path)
    if actual_digest != expected_digest:
        raise SystemExit(
            f"unexpected PDF SHA-256: {actual_digest}; expected {expected_digest}"
        )

    pages = pymupdf4llm.to_markdown(
        str(pdf_path),
        page_chunks=True,
        show_progress=False,
        use_ocr=False,
        force_ocr=False,
        header=False,
        footer=False,
    )
    stat_block_splits = [
        {
            "page": page_number,
            "left": 40,
            "gutter": 303,
            "right": 40,
            "top": 0,
            "bottom": 35,
            "headingReplacements": {"__statBlockColumns__": "true"},
        }
        for page_number in manifest["statBlockColumnSplitPages"]
    ]
    column_splits = {
        split["page"]: split
        for split in [*manifest["columnSplits"], *stat_block_splits]
    }
    if column_splits:
        with pymupdf.open(pdf_path) as document:
            for page_number, split in column_splits.items():
                pages[page_number - 1]["text"] = extract_split_page(document, split)
    expected_pages = source_contract["pages"]
    if len(pages) != expected_pages:
        raise SystemExit(
            f"unexpected PDF page count: {len(pages)}; expected {expected_pages}"
        )

    output = validate_output_path(args.output)
    prepare_output(output, args.replace)
    source_pages: dict[int, dict[str, Any]] = {}
    output_files: list[str] = []
    for section in manifest["sections"]:
        if section["kind"] == "excluded":
            for page_number in range(section["firstPage"], section["lastPage"] + 1):
                source_pages[page_number] = {
                    "page": page_number,
                    "kind": "excluded",
                    "reason": section["reason"],
                }
            continue

        filename = section["file"]
        output_files.append(filename)
        file_lines: list[str] = []
        for page_number in range(section["firstPage"], section["lastPage"] + 1):
            split = column_splits.get(page_number)
            page_lines = section_page_lines(
                lines_for_page(
                    pages[page_number - 1]["text"],
                    split["headingReplacements"] if split is not None else None,
                ),
                section,
                page_number,
            )
            if file_lines:
                file_lines.append("")
            first_line = len(file_lines) + 1
            file_lines.extend(page_lines)
            last_line = len(file_lines)
            page_text = "\n".join(page_lines)
            source_page = source_pages.setdefault(
                page_number,
                {"page": page_number, "kind": "generated", "fragments": []},
            )
            if source_page["kind"] != "generated":
                raise SystemExit(f"page {page_number} is both generated and excluded")
            source_page["fragments"].append(
                {
                    "file": filename,
                    "firstLine": first_line,
                    "lastLine": last_line,
                    "contentSha256": sha256_bytes(page_text.encode("utf-8")),
                }
            )
        (output / filename).write_text(
            "\n".join(file_lines).rstrip() + "\n", encoding="utf-8"
        )

    ordered_source_pages = [source_pages[page] for page in sorted(source_pages)]
    source_map = {
        "schemaVersion": 1,
        "pdfSha256": actual_digest,
        "pdfPages": expected_pages,
        "outputFiles": sorted(output_files),
        "pages": ordered_source_pages,
    }
    (output / SOURCE_MAP_NAME).write_text(
        json.dumps(source_map, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "pdfPages": expected_pages,
                "markdownFiles": len(output_files),
                "sourceMap": str(output / SOURCE_MAP_NAME),
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
