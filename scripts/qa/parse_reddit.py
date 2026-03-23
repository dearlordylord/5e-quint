#!/usr/bin/env python3
"""Parse downloaded Reddit dndnext data → JSONL corpus."""

import json
import os

RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
POSTS_PATH = os.path.join(RAW_DIR, "dndnext_posts.jsonl")
COMMENTS_DIR = os.path.join(RAW_DIR, "dndnext_comments")
OUTPUT = os.path.join(os.path.dirname(__file__), "../../.references/qa/reddit_corpus.jsonl")

TOP_N_COMMENTS = 10


def get_top_comments(post_id):
    """Get top N root-level comments for a post, sorted by score."""
    comment_file = os.path.join(COMMENTS_DIR, f"{post_id}.json")
    if not os.path.exists(comment_file):
        return []
    with open(comment_file) as f:
        comments = json.load(f)
    if not comments:
        return []

    # Unwrap {"kind": "t1", "data": {...}} envelope if present
    unwrapped = []
    for c in comments:
        if isinstance(c, dict) and "data" in c:
            unwrapped.append(c["data"])
        else:
            unwrapped.append(c)

    # Filter to root-level comments (parent is the post itself)
    link_id = f"t3_{post_id}"
    root_comments = [
        c for c in unwrapped
        if c.get("parent_id") == link_id
        and c.get("author") not in ("[deleted]", "AutoModerator")
        and c.get("body") not in ("[deleted]", "[removed]", "")
    ]
    root_comments.sort(key=lambda c: c.get("score", 0), reverse=True)
    return [
        {"author": c.get("author", ""), "body": c.get("body", ""), "score": c.get("score", 0)}
        for c in root_comments[:TOP_N_COMMENTS]
    ]


def parse():
    if not os.path.exists(POSTS_PATH):
        print(f"Posts file not found: {POSTS_PATH}")
        print("Run download_reddit.py posts first.")
        return

    count = 0
    skipped = 0
    with open(POSTS_PATH) as fin, open(OUTPUT, "w") as fout:
        for line in fin:
            post = json.loads(line)
            post_id = post["id"]

            # Skip posts with no self text (link posts, images, etc.)
            selftext = post.get("selftext", "")
            if not selftext or selftext in ("[deleted]", "[removed]"):
                skipped += 1
                continue

            comments = get_top_comments(post_id)
            if not comments:
                skipped += 1
                continue

            entry = {
                "source": "reddit",
                "id": post_id,
                "title": post.get("title", ""),
                "question": selftext,
                "comments": comments,
                "flair": post.get("link_flair_text", ""),
                "score": post.get("score", 0),
                "url": f"https://reddit.com/r/dndnext/comments/{post_id}/",
            }
            fout.write(json.dumps(entry, ensure_ascii=False) + "\n")
            count += 1

    print(f"Wrote {count} posts with comments to {OUTPUT} (skipped {skipped})")


if __name__ == "__main__":
    parse()
