#!/usr/bin/env python3
"""Fetch and parse sageadvice.eu official answers archive → JSONL corpus.

Paginates the official-answer tag archive, fetches individual post pages,
extracts Q&A pairs (question from title/content, answer from blockquote),
and outputs a JSONL corpus file. Caches all fetched HTML.
"""

import hashlib
import json
import os
import re
import time

from qa_utils import fetch_url, strip_html

ARCHIVE_URL = "https://www.sageadvice.eu/tag/official-answer/page/{n}/"
RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
PAGES_DIR = os.path.join(RAW_DIR, "sageadvice_eu_pages")
POSTS_DIR = os.path.join(RAW_DIR, "sageadvice_eu_posts")
OUTPUT = os.path.join(os.path.dirname(__file__), "../../.references/qa/sageadvice_eu_corpus.jsonl")


def fetch_archive_pages():
    """Paginate archive pages until 404. Returns list of (url, title) tuples."""
    os.makedirs(PAGES_DIR, exist_ok=True)
    seen_urls = set()
    post_links = []
    page_num = 1

    while True:
        url = ARCHIVE_URL.format(n=page_num)
        cache_path = os.path.join(PAGES_DIR, f"page_{page_num}.html")
        print(f"Fetching archive page {page_num}...")
        raw = fetch_url(url, cache_path)
        if raw is None:
            print(f"Page {page_num} returned 404 — done paginating.")
            break

        # Extract post links from archive page
        # sageadvice.eu uses <h1 class="entry-title"><a href="...">
        links = re.findall(
            r'<h[123][^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a\s+href="([^"]+)"[^>]*>(.*?)</a>',
            raw, re.DOTALL
        )

        for href, title in links:
            # Filter out non-post links (tag pages, category pages, etc.)
            if "/tag/" in href or "/category/" in href or "/page/" in href:
                continue
            if href in seen_urls:
                continue
            seen_urls.add(href)
            post_links.append((href, strip_html(title)))

        page_num += 1
        time.sleep(1)  # polite crawling

    print(f"Found {len(post_links)} post links across {page_num - 1} archive pages")
    return post_links


def parse_post(url, raw_html):
    """Extract Q&A from a single sageadvice.eu post page.

    Typical structure: the post contains a question (in the title or content)
    and an official answer in a blockquote.

    TODO: Verify exact HTML structure against live pages.
    """
    # Extract title from <h1> or <title>
    title_match = re.search(r"<h1[^>]*class=\"[^\"]*entry-title[^\"]*\"[^>]*>(.*?)</h1>", raw_html, re.DOTALL)
    if not title_match:
        title_match = re.search(r"<title>(.*?)</title>", raw_html, re.DOTALL)
    title = strip_html(title_match.group(1)) if title_match else ""

    # Extract main content area — use greedy match to handle nested divs,
    # bounded by the next entry-content or end-of-file
    content_match = re.search(
        r'<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*?)(?=<div[^>]*class="[^"]*entry-|$)',
        raw_html, re.DOTALL
    )
    content = content_match.group(1) if content_match else raw_html

    # Extract blockquotes — typical structure: BQ1=question tweet, BQ2=official answer
    # Search full page (not just entry-content which may be truncated by ads/widgets)
    blockquotes = re.findall(r"<blockquote[^>]*>(.*?)</blockquote>", raw_html, re.DOTALL)
    if not blockquotes:
        return None

    answer = strip_html(blockquotes[-1])  # Last blockquote is the official answer

    # Question: use first blockquote if multiple, otherwise fall back to title
    if len(blockquotes) >= 2:
        question = strip_html(blockquotes[0])
    else:
        question = title

    if len(answer) < 10:
        return None

    return {"title": title, "question": question, "answer": answer}


def main():
    post_links = fetch_archive_pages()
    if not post_links:
        print("No post links found. Archive structure may have changed.")
        return

    os.makedirs(POSTS_DIR, exist_ok=True)
    entries = []
    fetched = 0

    for url, archive_title in post_links:
        # Generate a stable filename from URL
        url_hash = hashlib.sha256(url.encode()).hexdigest()[:12]
        cache_path = os.path.join(POSTS_DIR, f"{url_hash}.html")

        was_cached = os.path.exists(cache_path)
        raw = fetch_url(url, cache_path)
        if raw is None:
            continue

        if not was_cached:
            fetched += 1
            if fetched % 50 == 0:
                print(f"  Fetched {fetched} posts...")
            time.sleep(0.5)  # polite crawling

        result = parse_post(url, raw)
        if result is None:
            continue

        entry_id = f"saeu_{url_hash}"
        entries.append({
            "source": "sageadvice_eu",
            "id": entry_id,
            "title": result["title"] or archive_title,
            "question": result["question"],
            "answer": result["answer"],
            "tags": ["sage-advice", "official", "crawford"],
            "url": url,
        })

    print(f"Parsed {len(entries)} Q&A pairs from {len(post_links)} posts")

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"Wrote {len(entries)} entries to {OUTPUT}")


if __name__ == "__main__":
    main()
