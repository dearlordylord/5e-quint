#!/usr/bin/env python3
"""Parse RPG Stack Exchange dump → JSONL corpus of dnd-5e Q&A pairs."""

import html
import json
import os
import re
import xml.etree.ElementTree as ET

RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
POSTS_XML = os.path.join(RAW_DIR, "rpg.stackexchange.com", "Posts.xml")
OUTPUT = os.path.join(os.path.dirname(__file__), "../../.references/qa/se_corpus.jsonl")


def strip_html(s):
    """Rough HTML→text. Good enough for corpus; not for display."""
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"</?p>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()


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

        if post_type == "1" and "dnd-5e" in tags:
            # Question
            questions[post_id] = {
                "id": post_id,
                "title": elem.get("Title", ""),
                "body": elem.get("Body", ""),
                "tags": re.findall(r"<([^>]+)>", tags),
                "score": int(elem.get("Score", 0)),
                "accepted_answer_id": elem.get("AcceptedAnswerId"),
                "answer_count": int(elem.get("AnswerCount", 0)),
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

    print(f"Found {len(questions)} dnd-5e questions, {len(answers)} total answers")

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
                "url": f"https://rpg.stackexchange.com/q/{q['id']}",
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            paired += 1

    print(f"Wrote {paired} Q&A pairs to {OUTPUT}")


if __name__ == "__main__":
    parse()
