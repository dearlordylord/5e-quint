#!/usr/bin/env python3
"""Fetch and parse D&D Beyond 2024 PHB errata → JSONL corpus.

Fetches the official errata page from D&D Beyond, parses correction entries,
converts them to synthetic Q&A format, and outputs a JSONL corpus file.
"""

import hashlib
import json
import os
import re

from qa_utils import fetch_url, strip_html

# NOTE: DDB errata URLs return 404 for automated fetches (JS-rendered or auth-gated).
# To use this scraper: save the errata page as HTML from a browser, place it at CACHE_FILE below.
# Tested URLs (all 404): /errata/phb-2024, /errata, /errata/players-handbook-2024, /errata/ph-2024
ERRATA_URL = "https://www.dndbeyond.com/sources/dnd/errata/phb-2024"
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
    os.makedirs(RAW_DIR, exist_ok=True)
    raw_html = fetch_url(ERRATA_URL, CACHE_FILE)
    if raw_html is None:
        print(f"Failed to fetch {ERRATA_URL} (404)")
        return
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
