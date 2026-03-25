#!/usr/bin/env python3
"""Parse RPG Stack Exchange dump → JSONL corpus of dnd-5e-2024 Q&A pairs.

Strategies:
  - 2024_native: questions tagged dnd-5e-2024 or dnd-5.5e
  - 2014_post_cutoff: questions tagged dnd-5e-2014 or dnd-5e, posted after 2024-09-17
"""

import json
import os
import re
import xml.etree.ElementTree as ET

from qa_utils import strip_html

RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
POSTS_XML = os.path.join(RAW_DIR, "rpg.stackexchange.com", "Posts.xml")
OUTPUT = os.path.join(os.path.dirname(__file__), "../../.references/qa/se_corpus.jsonl")

# 2024 edition release date — posts after this with 2014 tags likely apply to both editions
EDITION_2024_RELEASE = "2024-09-17T00:00:00.000"


def parse():
    if not os.path.exists(POSTS_XML):
        print(f"Posts.xml not found at {POSTS_XML}")
        print("Run download_se.py first.")
        return

    # Pass 1: index all posts
    questions = {}  # id -> row dict
    answers = {}    # id -> row dict

    print("Parsing Posts.xml ...")
    for event, elem in ET.iterparse(POSTS_XML, events=("end",)):
        if elem.tag != "row":
            continue
        post_type = elem.get("PostTypeId")
        tags = elem.get("Tags", "")
        post_id = elem.get("Id")

        if post_type == "1":
            # Determine strategy for 2024-relevant questions
            creation_date = elem.get("CreationDate", "")
            # Parse tags into a set for exact matching (avoids substring false positives)
            tag_set = set(re.findall(r"<([^>]+)>", tags))
            strategy = None
            if tag_set & {"dnd-5e-2024", "dnd-5.5e"}:
                strategy = "2024_native"
            elif tag_set & {"dnd-5e-2014", "dnd-5e"} and \
                    creation_date >= EDITION_2024_RELEASE:  # ISO 8601 sorts lexicographically
                strategy = "2014_post_cutoff"

            if strategy:
                questions[post_id] = {
                    "id": post_id,
                    "title": elem.get("Title", ""),
                    "body": elem.get("Body", ""),
                    "tags": sorted(tag_set),
                    "score": int(elem.get("Score", 0)),
                    "accepted_answer_id": elem.get("AcceptedAnswerId"),
                    "answer_count": int(elem.get("AnswerCount", 0)),
                    "strategy": strategy,
                    "creation_date": creation_date,
                }
        elif post_type == "2":
            # Answer — index all, we'll filter to accepted ones
            answers[post_id] = {
                "id": post_id,
                "body": elem.get("Body", ""),
                "score": int(elem.get("Score", 0)),
                "parent_id": elem.get("ParentId"),
            }
        elem.clear()

    native = sum(1 for q in questions.values() if q["strategy"] == "2024_native")
    post_cutoff = sum(1 for q in questions.values() if q["strategy"] == "2014_post_cutoff")
    print(f"Found {len(questions)} questions ({native} 2024_native, {post_cutoff} 2014_post_cutoff), {len(answers)} total answers")

    # Pass 2: join questions with accepted answers
    paired = 0
    with open(OUTPUT, "w") as f:
        for q in questions.values():
            aid = q["accepted_answer_id"]
            if not aid or aid not in answers:
                continue
            a = answers[aid]
            entry = {
                "source": "se",
                "id": q["id"],
                "title": q["title"],
                "question": strip_html(q["body"]),
                "answer": strip_html(a["body"]),
                "tags": q["tags"],
                "q_score": q["score"],
                "a_score": a["score"],
                "strategy": q["strategy"],
                "creation_date": q["creation_date"],
                "url": f"https://rpg.stackexchange.com/q/{q['id']}",
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            paired += 1

    print(f"Wrote {paired} Q&A pairs to {OUTPUT}")


if __name__ == "__main__":
    parse()
