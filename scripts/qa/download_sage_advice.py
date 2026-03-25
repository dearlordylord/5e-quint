#!/usr/bin/env python3
"""Fetch and parse the D&D Beyond Sage Advice Compendium → JSONL corpus.

Fetches the official Sage Advice Compendium from D&D Beyond, parses Q&A pairs
from the HTML (bold questions + paragraph answers grouped by section), and
outputs a JSONL corpus file.
"""

import hashlib
import json
import os
import re

from qa_utils import fetch_url, strip_html

BASE_URL = "https://www.dndbeyond.com/sources/dnd/sae/sage-advice-compendium"
RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
CACHE_FILE = os.path.join(RAW_DIR, "sage_advice_raw.html")
OUTPUT = os.path.join(os.path.dirname(__file__), "../../.references/qa/sage_advice_corpus.jsonl")


def parse_qa_pairs(raw_html):
    """Parse Q&A pairs from the Sage Advice Compendium HTML.

    The expected structure is sections with headings (h2/h3), where each Q&A
    is a bold/strong question followed by paragraph answer text.

    TODO: The exact HTML structure depends on D&D Beyond's current page layout.
    This parser attempts to handle common patterns but may need adjustment
    if the page structure changes.
    """
    pairs = []
    current_category = "General"

    # Extract section headings — try h2 and h3
    # TODO: Verify heading level used on live page
    sections = re.split(r"<h[23][^>]*>(.*?)</h[23]>", raw_html, flags=re.DOTALL)

    # sections[0] is preamble, then alternating: heading, content, heading, content ...
    for i in range(1, len(sections) - 1, 2):
        heading = strip_html(sections[i])
        content = sections[i + 1]
        if heading:
            current_category = heading

        # Find Q&A pairs: bold/strong text = question, following text = answer
        # Pattern 1: <p><strong>Q?</strong> ... </p> <p>A? ...</p>
        # Pattern 2: <strong>Q?</strong> followed by paragraph(s)
        # TODO: Confirm which pattern the live page uses
        qa_blocks = re.split(r"<(?:strong|b)[^>]*>(.*?)</(?:strong|b)>", content, flags=re.DOTALL)

        for j in range(1, len(qa_blocks) - 1, 2):
            question_raw = qa_blocks[j]
            answer_raw = qa_blocks[j + 1]

            question = strip_html(question_raw).strip()
            answer = strip_html(answer_raw).strip()

            # Skip very short or empty entries
            if len(question) < 10 or len(answer) < 10:
                continue

            # Generate a stable ID from question content
            q_hash = hashlib.sha256(question.encode()).hexdigest()[:12]
            entry_id = f"sa_{q_hash}"

            pairs.append({
                "source": "sage_advice",
                "id": entry_id,
                "title": question[:120],
                "question": question,
                "answer": answer,
                "category": current_category,
                "tags": ["sage-advice", "official"],
                "url": BASE_URL,
            })

    return pairs


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    raw_html = fetch_url(BASE_URL, CACHE_FILE)
    if raw_html is None:
        print(f"Failed to fetch {BASE_URL} (404)")
        return
    pairs = parse_qa_pairs(raw_html)
    print(f"Parsed {len(pairs)} Q&A pairs")

    if not pairs:
        print("WARNING: No Q&A pairs found. The page structure may have changed.")
        print("Check the cached HTML and update the parser.")
        return

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        for entry in pairs:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"Wrote {len(pairs)} entries to {OUTPUT}")


if __name__ == "__main__":
    main()
