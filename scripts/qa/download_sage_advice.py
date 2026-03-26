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

    DDB structure: h3 = section headings, h4 = questions, following <p> = answers.
    Each h4 has class "compendium-hr heading-anchor" and the question as text.
    Answer is all <p> elements between this h4 and the next h4 (or h3).
    """
    pairs = []
    current_category = "General"

    # Split on h3 (section headings) and h4 (questions)
    # This gives us alternating: content, tag+attrs, heading text, content, ...
    parts = re.split(r"<(h[34])[^>]*>(.*?)</\1>", raw_html, flags=re.DOTALL)

    # parts: [preamble, tag1, heading1, content1, tag2, heading2, content2, ...]
    i = 1
    while i < len(parts) - 2:
        tag = parts[i]       # "h3" or "h4"
        heading = strip_html(parts[i + 1])
        content = parts[i + 2]
        i += 3

        if tag == "h3":
            if heading:
                current_category = heading
            continue

        # tag == "h4" — this is a question
        question = heading.strip()
        if len(question) < 10:
            continue

        # Answer is all <p> content until the next heading
        answer_parts = re.findall(r"<p[^>]*>(.*?)</p>", content, re.DOTALL)
        answer = "\n\n".join(strip_html(p) for p in answer_parts).strip()

        if len(answer) < 10:
            continue

        q_hash = hashlib.sha256(question.encode()).hexdigest()[:12]
        pairs.append({
            "source": "sage_advice",
            "id": f"sa_{q_hash}",
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
