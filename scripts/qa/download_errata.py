#!/usr/bin/env python3
"""Parse D&D 2024 PHB errata from a community-compiled source → JSONL corpus.

DDB applies errata silently inline — there is no standalone errata page.
This script parses a manually-provided HTML file containing errata corrections
(e.g., saved from a community wiki or Reddit compilation) and converts them
to synthetic Q&A format for the classification pipeline.

Usage:
    1. Save an errata source as HTML to .references/qa/raw/errata_phb_2024_raw.html
    2. python3 scripts/qa/download_errata.py
"""

import hashlib
import json
import os
import re

from qa_utils import strip_html

# No live URL — DDB has no standalone errata page (corrections are applied inline).
# Place a manually-saved HTML file at CACHE_FILE to use this script.
ERRATA_URL = ""
RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
CACHE_FILE = os.path.join(RAW_DIR, "errata_phb_2024_raw.html")
OUTPUT = os.path.join(os.path.dirname(__file__), "../../.references/qa/errata_corpus.jsonl")

BOOK = "Player's Handbook (2024)"


def parse_errata(raw_html):
    """Parse errata entries from the D&D Beyond errata page.

    Expected structure: sections by chapter/topic, each containing errata items
    with original text and corrected text.

    TODO: The exact HTML structure depends on D&D Beyond's current page layout.
    This parser attempts multiple common patterns but may need adjustment.
    """
    entries = []
    current_section = "General"

    # Split by section headings
    sections = re.split(r"<h[23][^>]*>(.*?)</h[23]>", raw_html, flags=re.DOTALL)

    for i in range(1, len(sections) - 1, 2):
        heading = strip_html(sections[i])
        content = sections[i + 1]
        if heading:
            current_section = heading

        # Extract text from <p> and <li> elements separately to avoid
        # mismatched open/close tags (e.g. <li><p>nested</p></li>)
        # TODO: Verify against live page structure
        corrections = (
            re.findall(r'<p[^>]*>(.*?)</p>', content, re.DOTALL) +
            re.findall(r'<li[^>]*>(.*?)</li>', content, re.DOTALL)
        )

        for correction_html in corrections:
            text = strip_html(correction_html)
            if len(text) < 20:
                continue

            # Try to split into original/corrected
            original = ""
            corrected = text

            # Pattern: "X has been changed to Y"
            changed_match = re.search(
                r'["\u201c](.+?)["\u201d]\s+has been (?:changed|replaced|corrected) to\s+["\u201c](.+?)["\u201d]',
                text, re.DOTALL
            )
            if changed_match:
                original = changed_match.group(1).strip()
                corrected = changed_match.group(2).strip()
            else:
                # Pattern: "Was: X" / "Now: Y" or similar
                was_match = re.search(r'(?:Was|Old|Before)[:\s]+(.+?)(?:Now|New|After)[:\s]+(.+)', text, re.DOTALL)
                if was_match:
                    original = was_match.group(1).strip()
                    corrected = was_match.group(2).strip()
                else:
                    # Single correction statement — use as-is
                    original = ""
                    corrected = text

            # Generate stable ID
            c_hash = hashlib.sha256(text.encode()).hexdigest()[:12]
            entry_id = f"errata_{c_hash}"

            # Build synthetic Q&A
            if original:
                question = f'In {BOOK}, {current_section}: does the rule "{original}" apply?'
                answer = f'No. Corrected by errata. Current rule: "{corrected}"'
            else:
                question = f"In {BOOK}, {current_section}: what is the current errata correction?"
                answer = f"Errata correction: {corrected}"

            entries.append({
                "source": "errata",
                "id": entry_id,
                "title": f"Errata: {current_section} — {text[:80]}",
                "question": question,
                "answer": answer,
                "tags": ["errata", "official"],
                "original_text": original,
                "corrected_text": corrected,
                "book": BOOK,
                "section": current_section,
                "url": ERRATA_URL,
            })

    return entries


def main():
    if not os.path.exists(CACHE_FILE):
        print(f"No errata HTML found at {CACHE_FILE}")
        print("DDB has no standalone errata page — corrections are applied inline.")
        print("To use this script: save a community errata compilation as HTML to that path.")
        return
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        raw_html = f.read()
    entries = parse_errata(raw_html)
    print(f"Parsed {len(entries)} errata entries")

    if not entries:
        print("WARNING: No errata entries found. The page structure may have changed.")
        print("Check the cached HTML and update the parser.")
        return

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"Wrote {len(entries)} entries to {OUTPUT}")


if __name__ == "__main__":
    main()
