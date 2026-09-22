# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = [
#   "pymupdf4llm==1.28.2",
# ]
# ///
"""Deterministically extract page-traceable Markdown from the SRD 5.2.1 PDF."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import pymupdf4llm


EXPECTED_PDF_SHA256 = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87"
SECTIONS = (
    ("legal.md", 1, 1),
    ("table-of-contents.md", 2, 4),
    ("playing-the-game.md", 5, 18),
    ("character-creation.md", 19, 27),
    ("classes.md", 28, 72),
    ("character-origins.md", 73, 86),
    ("feats.md", 87, 89),
    ("equipment.md", 90, 101),
    ("spells.md", 102, 175),
    ("rules-glossary.md", 176, 191),
    ("gameplay-toolbox.md", 192, 201),
    ("magic-items.md", 202, 253),
    ("monsters.md", 254, 257),
    ("monsters-A-Z.md", 258, 344),
    ("animals.md", 345, 364),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pdf",
        type=Path,
        default=Path(".references/SRD_CC_v5.2.1.pdf"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".scratch/srd-5.2.1-extracted"),
    )
    return parser.parse_args()


def main() -> None:
    args = arguments()
    actual_digest = sha256(args.pdf)
    if actual_digest != EXPECTED_PDF_SHA256:
        raise SystemExit(
            f"unexpected PDF SHA-256: {actual_digest}; expected {EXPECTED_PDF_SHA256}"
        )

    args.output.mkdir(parents=True, exist_ok=True)
    pages = pymupdf4llm.to_markdown(
        str(args.pdf),
        page_chunks=True,
        show_progress=False,
        use_ocr=False,
        force_ocr=False,
        header=False,
        footer=False,
    )
    if len(pages) != 364:
        raise SystemExit(f"unexpected PDF page count: {len(pages)}; expected 364")

    for filename, first_page, last_page in SECTIONS:
        chunks = []
        for page_number in range(first_page, last_page + 1):
            text = pages[page_number - 1]["text"].strip()
            chunks.append(f"<!-- source-page: {page_number} -->\n\n{text}\n")
        (args.output / filename).write_text("\n".join(chunks), encoding="utf-8")

    print(
        f"extracted {len(pages)} pages into {len(SECTIONS)} Markdown files at {args.output}"
    )


if __name__ == "__main__":
    main()
