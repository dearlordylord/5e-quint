#!/usr/bin/env python3
"""Download r/onednd posts and comment trees from Arctic Shift API."""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

API_BASE = "https://arctic-shift.photon-reddit.com/api"
RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
POSTS_PATH = os.path.join(RAW_DIR, "onednd_posts.jsonl")
COMMENTS_DIR = os.path.join(RAW_DIR, "onednd_comments")

POST_FIELDS = "id,title,selftext,score,created_utc,num_comments,link_flair_text,author"

MIN_SCORE_FOR_COMMENTS = 5
MIN_COMMENTS = 2
CONCURRENT_REQUESTS = 10


def api_get(endpoint, params, max_retries=5):
    url = f"{API_BASE}/{endpoint}?{urllib.parse.urlencode(params)}"
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url)
            req.add_header("User-Agent", "dnd-qa-corpus/1.0 (research)")
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            if data.get("error"):
                if "Timeout" in data["error"] or "slow down" in data["error"]:
                    wait = 2 ** (attempt + 1)
                    time.sleep(wait)
                    continue
                raise RuntimeError(f"API error: {data['error']}")
            return data["data"]
        except (urllib.error.URLError, TimeoutError) as e:
            wait = 2 ** (attempt + 1)
            time.sleep(wait)
    raise RuntimeError(f"Failed after {max_retries} retries: {url}")


def download_posts():
    """Paginate through all onednd posts using date-based cursor."""
    os.makedirs(RAW_DIR, exist_ok=True)

    last_ts = 0
    existing_count = 0
    if os.path.exists(POSTS_PATH):
        with open(POSTS_PATH) as f:
            for line in f:
                existing_count += 1
                post = json.loads(line)
                last_ts = max(last_ts, post["created_utc"])
        if last_ts > 0:
            print(f"Resuming from {existing_count} existing posts (last ts: {last_ts})")

    after_ts = "2014-01-01" if last_ts == 0 else last_ts
    total = existing_count
    mode = "a" if last_ts > 0 else "w"

    with open(POSTS_PATH, mode) as f:
        while True:
            params = {
                "subreddit": "onednd",
                "limit": "auto",
                "sort": "asc",
                "after": after_ts,
                "fields": POST_FIELDS,
            }
            posts = api_get("posts/search", params)
            if not posts:
                break
            for post in posts:
                f.write(json.dumps(post, ensure_ascii=False) + "\n")
            total += len(posts)
            after_ts = posts[-1]["created_utc"]
            print(f"  Posts: {total} (last: {time.strftime('%Y-%m-%d', time.gmtime(after_ts))})")
            time.sleep(0.5)

    print(f"Total posts downloaded: {total}")
    return total


def fetch_one_comment_tree(post_id):
    """Fetch a single comment tree. Returns (post_id, success). Skips if cached."""
    comment_file = os.path.join(COMMENTS_DIR, f"{post_id}.json")
    if os.path.exists(comment_file):
        return post_id, "skipped"
    try:
        comments = api_get("comments/tree", {"link_id": f"t3_{post_id}"})
        with open(comment_file, "w") as f:
            json.dump(comments, f, ensure_ascii=False)
        return post_id, "fetched"
    except Exception as e:
        return post_id, f"failed: {e}"


def download_comment_trees():
    """Fetch comment trees concurrently using thread pool."""
    os.makedirs(COMMENTS_DIR, exist_ok=True)

    if not os.path.exists(POSTS_PATH):
        print("No posts file found. Run download_posts first.")
        return

    candidates = []
    with open(POSTS_PATH) as f:
        for line in f:
            post = json.loads(line)
            if (post.get("score", 0) >= MIN_SCORE_FOR_COMMENTS
                    and post.get("num_comments", 0) >= MIN_COMMENTS):
                candidates.append(post["id"])

    print(f"Fetching comment trees for {len(candidates)} posts "
          f"(score>={MIN_SCORE_FOR_COMMENTS}, comments>={MIN_COMMENTS}, "
          f"workers={CONCURRENT_REQUESTS})")

    stats = {"fetched": 0, "skipped": 0, "failed": 0}
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=CONCURRENT_REQUESTS) as pool:
        futures = {pool.submit(fetch_one_comment_tree, pid): pid for pid in candidates}
        for future in as_completed(futures):
            pid, result = future.result()
            if result == "skipped":
                stats["skipped"] += 1
            elif result == "fetched":
                stats["fetched"] += 1
            else:
                stats["failed"] += 1
            done = stats["fetched"] + stats["failed"]
            if done > 0 and done % 500 == 0:
                elapsed = time.time() - t0
                rate = done / elapsed
                remaining = (len(candidates) - stats["skipped"] - done) / rate if rate > 0 else 0
                print(f"  {done} done ({stats['fetched']} ok, {stats['failed']} fail, "
                      f"{stats['skipped']} cached) ~{remaining/60:.0f}min left")

    elapsed = time.time() - t0
    print(f"Done in {elapsed/60:.1f}min. "
          f"Fetched {stats['fetched']}, skipped {stats['skipped']}, failed {stats['failed']}.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd in ("posts", "all"):
        download_posts()
    if cmd in ("comments", "all"):
        download_comment_trees()
