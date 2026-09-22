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
EXTRACTION_TAG = re.compile(r"</?(?:mark|u)>\s*", re.IGNORECASE)
DECORATED_HEADING = re.compile(r"^(#{1,6}\s+)\*\*(.+)\*\*$")
DEEP_HEADING = re.compile(r"^(#{4,6})(\s+.+)$")
LINE_BREAK_HYPHENATION = re.compile(
    r"(?<=[A-Za-z])-\s*\n(?:\s*\n)*\s*(?=[a-z])"
)


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


def lines_for_page(
    text: str, heading_replacements: dict[str, str] | None = None
) -> list[str]:
    lines: list[str] = []
    normalized_text = EXTRACTION_TAG.sub("", text)
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
        lines.append(
            heading_replacements[heading]
            if heading_replacements is not None
            and heading is not None
            and heading in heading_replacements
            else normalized_line
        )
    return lines


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
    column_splits = {split["page"]: split for split in manifest["columnSplits"]}
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
    source_pages: list[dict[str, Any]] = []
    output_files: list[str] = []
    for section in manifest["sections"]:
        if section["kind"] == "excluded":
            for page_number in range(section["firstPage"], section["lastPage"] + 1):
                source_pages.append(
                    {
                        "page": page_number,
                        "kind": "excluded",
                        "reason": section["reason"],
                    }
                )
            continue

        filename = section["file"]
        output_files.append(filename)
        file_lines: list[str] = []
        for page_number in range(section["firstPage"], section["lastPage"] + 1):
            split = column_splits.get(page_number)
            page_lines = lines_for_page(
                pages[page_number - 1]["text"],
                split["headingReplacements"] if split is not None else None,
            )
            if file_lines:
                file_lines.append("")
            first_line = len(file_lines) + 1
            file_lines.extend(page_lines)
            last_line = len(file_lines)
            page_text = "\n".join(page_lines)
            source_pages.append(
                {
                    "page": page_number,
                    "kind": "generated",
                    "fragments": [
                        {
                            "file": filename,
                            "firstLine": first_line,
                            "lastLine": last_line,
                            "contentSha256": sha256_bytes(
                                page_text.encode("utf-8")
                            ),
                        }
                    ],
                }
            )
        (output / filename).write_text(
            "\n".join(file_lines).rstrip() + "\n", encoding="utf-8"
        )

    source_pages.sort(key=lambda page: page["page"])
    source_map = {
        "schemaVersion": 1,
        "pdfSha256": actual_digest,
        "pdfPages": expected_pages,
        "outputFiles": sorted(output_files),
        "pages": source_pages,
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
