# PLAN: New Scrapers for D&D 2024 QA Corpus

Five new data sources for the QA pipeline, in priority order. Each feeds into the existing `classify.py` -> `generate_assertions.py` pipeline.

**Current corpus size:** 239 SE + 9,702 Reddit = 9,941 entries (2024 edition).

---

## Scraper 1: SE — add `dnd-5.5e` tag (priority: immediate)

**Effort:** One-line fix. **Yield:** +50-120 Q&A pairs. **Risk:** Zero.

The `dnd-5.5e` tag is used on RPG.SE for 2024-edition questions alongside (and sometimes instead of) `dnd-5e-2024`. These are definitively 2024-edition — no filtering ambiguity.

### Files to modify

- `scripts/qa/parse_se.py` — line 41

### Implementation

Change the tag filter from:

```python
if post_type == "1" and "dnd-5e-2024" in tags:
```

to:

```python
if post_type == "1" and ("dnd-5e-2024" in tags or "dnd-5.5e" in tags):
```

That's it. Re-run `python3 scripts/qa/parse_se.py` to regenerate `se_corpus.jsonl`.

### Pipeline integration

None needed — output format is identical. Existing `classify.py --source se` works as-is.

### Blockers

None.

---

## Scraper 2: SE — `dnd-5e-2014` posts after Sept 17, 2024 (priority: high)

**Effort:** ~30 lines changed. **Yield:** +100-175 Q&A pairs. **Risk:** Medium — some posts are genuinely 2014-only, but the classifier handles this.

After the 2024 PHB release (Sept 17, 2024), many rules questions tagged `dnd-5e-2014` or `dnd-5e` are actually about rules that carry forward to the 2024 edition. The cutoff date acts as a proxy: if someone is asking about 5e mechanics after the 2024 book is out, there's a good chance the rule applies to both editions.

### Files to modify

- `scripts/qa/parse_se.py` — add CreationDate parsing, date filter, strategy field

### Implementation

```python
import datetime

# New constant
EDITION_2024_RELEASE = "2024-09-17T00:00:00.000"

def parse():
    # ... existing Pass 1 code, add a second branch after the dnd-5e-2024 check:

    for event, elem in ET.iterparse(POSTS_XML, events=("end",)):
        if elem.tag != "row":
            continue
        post_type = elem.get("PostTypeId")
        tags = elem.get("Tags", "")
        post_id = elem.get("Id")
        creation_date = elem.get("CreationDate", "")

        strategy = None

        if post_type == "1" and ("dnd-5e-2024" in tags or "dnd-5.5e" in tags):
            strategy = "2024_native"
        elif (post_type == "1"
              and ("dnd-5e-2014" in tags or "dnd-5e" in tags)
              and creation_date >= EDITION_2024_RELEASE):
            strategy = "2014_post_cutoff"

        if post_type == "1" and strategy:
            questions[post_id] = {
                "id": post_id,
                "title": elem.get("Title", ""),
                "body": elem.get("Body", ""),
                "tags": re.findall(r"<([^>]+)>", tags),
                "score": int(elem.get("Score", 0)),
                "accepted_answer_id": elem.get("AcceptedAnswerId"),
                "answer_count": int(elem.get("AnswerCount", 0)),
                "creation_date": creation_date,
                "strategy": strategy,
            }
        elif post_type == "2":
            answers[post_id] = {
                "id": post_id,
                "body": elem.get("Body", ""),
                "score": int(elem.get("Score", 0)),
                "parent_id": elem.get("ParentId"),
            }
        elem.clear()

    # In Pass 2, include strategy in the output entry:
    entry = {
        "source": "se",
        "id": q["id"],
        "title": q["title"],
        "question": strip_html(q["body"]),
        "answer": strip_html(a["body"]),
        "tags": q["tags"],
        "q_score": q["score"],
        "a_score": a["score"],
        "strategy": q.get("strategy", "2024_native"),
        "url": f"https://rpg.stackexchange.com/q/{q['id']}",
    }
```

### Pipeline integration

- `classify.py` needs no changes — the `strategy` field is carried through as metadata but doesn't affect classification logic. The classifier already determines whether a question is about RAW mechanics.
- `generate_assertions.py` needs no changes — it reads from `classified.jsonl` which inherits the `strategy` field.
- The `strategy` field is useful for debugging: if a generated assertion fails, you can check whether it came from a `2014_post_cutoff` entry (higher chance the rule changed between editions).

### Blockers

- The string comparison `creation_date >= EDITION_2024_RELEASE` works because SE's `CreationDate` format is ISO 8601 (`2024-09-17T12:34:56.789`), which sorts lexicographically. No datetime parsing needed.

---

## Scraper 3: D&D Beyond Sage Advice Compendium (priority: high)

**Effort:** New script (~120 lines). **Yield:** ~80-150 Q&A pairs (very high signal). **Risk:** Low-medium (DDB may require JS rendering).

The official Sage Advice Compendium is a curated list of rules clarifications from WotC. Every entry is a Q&A pair about RAW. This is the highest-signal source possible — most entries should pass classification as `is_raw: true` with no ambiguity.

### Files to create

- `scripts/qa/download_sage_advice.py` — fetch and parse the Sage Advice page

### Implementation steps

1. **Probe static HTML first.** Try a plain `urllib.request` fetch with a browser User-Agent header. If DDB serves the Q&A content in static HTML, parsing is straightforward. If it's a JS-rendered SPA, fall back to step 2.

2. **Fallback: headless fetch.** If static HTML is empty/shell, use `curl` with full browser headers, or document that the user needs to save-as-HTML from a browser. Avoid adding a Selenium/Playwright dependency to the pipeline.

3. **Parse Q&A pairs.** The Sage Advice page is structured as sections with `<h3>` or `<h4>` category headers, followed by alternating bold questions and paragraph answers. Parse structure:

```python
#!/usr/bin/env python3
"""Download and parse D&D Beyond Sage Advice Compendium."""

import json
import os
import re
import urllib.request
from html.parser import HTMLParser

SOURCE_URL = "https://www.dndbeyond.com/sources/dnd/sae/sage-advice-compendium"
RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
OUTPUT = os.path.join(os.path.dirname(__file__), "../../.references/qa/sage_advice_corpus.jsonl")

def fetch_page():
    """Fetch the Sage Advice page. Returns HTML string."""
    cache_path = os.path.join(RAW_DIR, "sage_advice_raw.html")
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return f.read()
    req = urllib.request.Request(SOURCE_URL)
    req.add_header("User-Agent", "Mozilla/5.0 (compatible; dnd-qa-corpus/1.0)")
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8")
    os.makedirs(RAW_DIR, exist_ok=True)
    with open(cache_path, "w") as f:
        f.write(html)
    return html

def parse_qa_pairs(html):
    """Extract Q&A pairs from the Sage Advice HTML.

    Expected structure: bold/strong text = question, following <p> = answer,
    grouped under section headers = category.
    Actual structure will need to be confirmed against the live page.
    """
    # Implementation depends on actual HTML structure — stub:
    pairs = []
    # ... regex or HTMLParser-based extraction ...
    return pairs

def main():
    html = fetch_page()
    pairs = parse_qa_pairs(html)
    with open(OUTPUT, "w") as f:
        for i, pair in enumerate(pairs):
            entry = {
                "source": "sage_advice",
                "id": f"sa_{i}",
                "title": pair["question"][:100],
                "question": pair["question"],
                "answer": pair["answer"],
                "category": pair.get("category", ""),
                "tags": ["sage-advice", "official"],
                "url": SOURCE_URL,
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"Wrote {len(pairs)} Q&A pairs to {OUTPUT}")
```

4. **Output format.** JSONL with the same fields as `se_corpus.jsonl` plus `category` from the page's section structure. The `source` field is `"sage_advice"` to distinguish from SE/Reddit.

### Pipeline integration

- `classify.py`: Add `SAGE_ADVICE_CORPUS` path constant and extend `load_corpus()` to accept `--source sage_advice`:

```python
SAGE_ADVICE_CORPUS = os.path.join(QA_DIR, "sage_advice_corpus.jsonl")

def load_corpus(source):
    entries = []
    if source in ("se", "all"):
        # ... existing ...
    if source in ("reddit", "all"):
        # ... existing ...
    if source in ("sage_advice", "all"):
        if os.path.exists(SAGE_ADVICE_CORPUS):
            with open(SAGE_ADVICE_CORPUS) as f:
                for line in f:
                    entries.append(json.loads(line))
    return entries
```

- `classify.py --source` choices: add `"sage_advice"` to the `choices` list in argparse.
- `generate_assertions.py`: No changes needed — it reads `classified.jsonl` which already includes all sources.

### Blockers

- DDB may block automated fetches or require authentication. Test with `curl -s "https://www.dndbeyond.com/sources/dnd/sae/sage-advice-compendium" | head -100` first.
- If JS-rendered, document a manual "save page as HTML" step rather than adding browser automation dependencies.

### Dependencies

None — independent of scrapers 1-2.

---

## Scraper 4: sageadvice.eu archive (priority: medium)

**Effort:** New script (~150 lines). **Yield:** +50-200 Q&A pairs (after dedup with Scraper 3). **Risk:** Medium (scraping stability, content overlap).

sageadvice.eu aggregates official Crawford/WotC rulings from Twitter/X and other sources. Many of these are not in the official Sage Advice Compendium. The site has a paginated archive filterable by tags.

### Files to create

- `scripts/qa/download_sageadvice_eu.py` — fetch paginated archive and parse Q&A pairs

### Implementation steps

1. **Paginate the archive.** The tag page at `https://www.sageadvice.eu/tag/official-answer/` is a WordPress archive with standard pagination (`/page/2/`, `/page/3/`, etc.). Fetch pages until a 404 or empty result.

2. **Parse post summaries.** Each archive page lists posts. Each post has a question (title or excerpt) and an embedded answer (typically a tweet screenshot or blockquote). Fetch individual post pages to get the full Q&A text.

3. **Extract Q&A structure:**

```python
#!/usr/bin/env python3
"""Download and parse sageadvice.eu official answers archive."""

import json
import os
import re
import time
import urllib.request

ARCHIVE_URL = "https://www.sageadvice.eu/tag/official-answer/page/{page}/"
RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
PAGES_DIR = os.path.join(RAW_DIR, "sageadvice_eu_pages")
OUTPUT = os.path.join(os.path.dirname(__file__), "../../.references/qa/sageadvice_eu_corpus.jsonl")

def fetch_archive_page(page_num):
    """Fetch a single archive page. Returns HTML or None if 404."""
    cache_path = os.path.join(PAGES_DIR, f"page_{page_num}.html")
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return f.read()
    url = ARCHIVE_URL.format(page=page_num)
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "Mozilla/5.0 (compatible; dnd-qa-corpus/1.0)")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8")
        os.makedirs(PAGES_DIR, exist_ok=True)
        with open(cache_path, "w") as f:
            f.write(html)
        return html
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise

def parse_posts_from_page(html):
    """Extract post URLs and titles from an archive page."""
    # WordPress archive: <h2 class="entry-title"><a href="...">Title</a></h2>
    # Actual selectors depend on theme — adjust after inspecting live page
    posts = re.findall(r'<h2[^>]*class="entry-title"[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)</a>', html)
    return [{"url": url, "title": title} for url, title in posts]

def fetch_and_parse_post(url):
    """Fetch a single post page and extract the Q&A pair."""
    # Cache by URL hash
    # Parse question from title/content, answer from blockquote or tweet embed
    # Return {"question": ..., "answer": ..., "date": ..., "url": ...}
    pass  # Implementation depends on actual post HTML structure

def main():
    os.makedirs(PAGES_DIR, exist_ok=True)
    all_posts = []
    page = 1
    while True:
        html = fetch_archive_page(page)
        if html is None:
            break
        posts = parse_posts_from_page(html)
        if not posts:
            break
        all_posts.extend(posts)
        print(f"  Page {page}: {len(posts)} posts (total: {len(all_posts)})")
        page += 1
        time.sleep(1)  # polite crawling

    print(f"Found {len(all_posts)} posts across {page - 1} pages")

    # Fetch individual posts and write corpus
    count = 0
    with open(OUTPUT, "w") as f:
        for i, post in enumerate(all_posts):
            qa = fetch_and_parse_post(post["url"])
            if qa and qa.get("question") and qa.get("answer"):
                entry = {
                    "source": "sageadvice_eu",
                    "id": f"saeu_{i}",
                    "title": post["title"],
                    "question": qa["question"],
                    "answer": qa["answer"],
                    "tags": ["sage-advice", "official", "crawford"],
                    "url": post["url"],
                }
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
                count += 1
            time.sleep(0.5)

    print(f"Wrote {count} Q&A pairs to {OUTPUT}")
```

4. **Date filtering.** Many sageadvice.eu posts predate the 2024 edition. Two strategies:
   - Filter by post date (>= 2024-09-17) for 2024-specific rulings
   - Include older rulings too and let `classify.py` determine relevance — many older Crawford rulings still apply to 2024 rules

### Pipeline integration

- `classify.py`: Same pattern as Scraper 3 — add `SAGEADVICE_EU_CORPUS` path and extend `load_corpus()` with `--source sageadvice_eu`.
- Add to argparse choices: `"sageadvice_eu"`.

### Blockers

- sageadvice.eu is a third-party site — may change structure or go offline.
- Many answers are embedded as tweet screenshots (images, not text). These entries will need to be skipped unless OCR is added (out of scope).
- Significant overlap with Scraper 3 — dedup by question text similarity (exact match or fuzzy) may be needed. Can defer dedup to a later pass since the classifier and assertion generator are idempotent.

### Dependencies

- Independent of Scrapers 1-2.
- Should run after Scraper 3 to plan dedup strategy, but can be developed in parallel.

---

## Scraper 5: D&D Beyond 2024 Errata (priority: low)

**Effort:** New script (~100 lines). **Yield:** +10-40 entries (low volume, high specificity). **Risk:** Medium (errata format may be hard to parse; entries need Q&A conversion).

Errata entries aren't Q&A pairs — they're "before/after" corrections. But they're extremely valuable for catching cases where `dnd.qnt` models the pre-errata (incorrect) version of a rule.

### Files to create

- `scripts/qa/download_errata.py` — fetch and parse errata page(s)

### Implementation steps

1. **Locate errata source.** Check:
   - `https://www.dndbeyond.com/sources/dnd/errata/phb-2024`
   - `https://www.dndbeyond.com/sources/dnd/errata`
   - The errata may be embedded in book source pages rather than a standalone URL.

2. **Fetch and parse.** Errata pages are typically structured as:
   - Book/chapter header
   - List of corrections: "Page X, Section Y. Change [old text] to [new text]."

```python
#!/usr/bin/env python3
"""Download and parse D&D Beyond 2024 errata."""

import json
import os
import re
import urllib.request

# URL TBD — needs manual verification
ERRATA_URLS = [
    "https://www.dndbeyond.com/sources/dnd/errata/phb-2024",
]
RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa/raw")
OUTPUT = os.path.join(os.path.dirname(__file__), "../../.references/qa/errata_corpus.jsonl")

def fetch_errata(url):
    cache_name = re.sub(r'[^\w]', '_', url) + ".html"
    cache_path = os.path.join(RAW_DIR, cache_name)
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return f.read()
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "Mozilla/5.0 (compatible; dnd-qa-corpus/1.0)")
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8")
    os.makedirs(RAW_DIR, exist_ok=True)
    with open(cache_path, "w") as f:
        f.write(html)
    return html

def parse_errata_entries(html):
    """Parse errata entries from HTML. Returns list of dicts.

    Each entry: {book, section, original_text, corrected_text}
    Actual parsing depends on DDB's errata HTML structure.
    """
    entries = []
    # ... implementation depends on actual structure ...
    return entries

def convert_to_qa(errata_entry):
    """Convert an errata before/after pair into a Q&A format.

    Q: Does [original rule] apply?
    A: No, errata changed it to [corrected rule].
    """
    q = (f"In the {errata_entry['book']}, {errata_entry['section']}: "
         f"does the following rule apply? \"{errata_entry['original_text']}\"")
    a = (f"No. This was corrected by errata. The current rule reads: "
         f"\"{errata_entry['corrected_text']}\"")
    return q, a

def main():
    all_entries = []
    for url in ERRATA_URLS:
        html = fetch_errata(url)
        entries = parse_errata_entries(html)
        all_entries.extend(entries)

    count = 0
    with open(OUTPUT, "w") as f:
        for i, entry in enumerate(all_entries):
            q, a = convert_to_qa(entry)
            record = {
                "source": "errata",
                "id": f"errata_{i}",
                "title": f"Errata: {entry['book']} — {entry['section']}",
                "question": q,
                "answer": a,
                "tags": ["errata", "official"],
                "original_text": entry["original_text"],
                "corrected_text": entry["corrected_text"],
                "book": entry["book"],
                "section": entry["section"],
                "url": ERRATA_URLS[0],
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
            count += 1

    print(f"Wrote {count} errata entries to {OUTPUT}")
```

3. **Q&A conversion.** The synthetic Q&A format ("Does X apply?" / "No, errata changed it to Y") is designed to trigger the classifier to mark these as `is_raw: true`. The assertion generator will then try to write a test that checks the corrected (current) rule — if `dnd.qnt` still models the old rule, the test will fail, which is exactly what we want.

### Pipeline integration

- `classify.py`: Add `ERRATA_CORPUS` path and `--source errata` option, same pattern as Scrapers 3-4.
- These synthetic Q&A entries may confuse the classifier since they're not natural questions. Consider bypassing classification for errata entries (mark them `is_raw: true` directly) or adding a `--trust-source` flag.

### Blockers

- Errata URL needs manual verification — DDB's URL structure for 2024 errata is not confirmed.
- Errata volume is small (likely 10-40 entries per book). High effort-to-yield ratio, but unique value in catching pre-errata spec bugs.
- DDB may require JS rendering (same concern as Scraper 3).

### Dependencies

None — fully independent.

---

## Pipeline Integration: classify.py and generate_assertions.py

### classify.py changes

The main change is extending `load_corpus()` to support the new sources.

**1. Add corpus path constants:**

```python
SAGE_ADVICE_CORPUS = os.path.join(QA_DIR, "sage_advice_corpus.jsonl")
SAGEADVICE_EU_CORPUS = os.path.join(QA_DIR, "sageadvice_eu_corpus.jsonl")
ERRATA_CORPUS = os.path.join(QA_DIR, "errata_corpus.jsonl")
```

**2. Extend `load_corpus()`:**

```python
def load_corpus(source):
    entries = []
    if source in ("se", "all"):
        if os.path.exists(SE_CORPUS):
            with open(SE_CORPUS) as f:
                for line in f:
                    entries.append(json.loads(line))
    if source in ("reddit", "all"):
        if os.path.exists(REDDIT_CORPUS):
            with open(REDDIT_CORPUS) as f:
                for line in f:
                    entries.append(json.loads(line))
    if source in ("sage_advice", "all"):
        if os.path.exists(SAGE_ADVICE_CORPUS):
            with open(SAGE_ADVICE_CORPUS) as f:
                for line in f:
                    entries.append(json.loads(line))
    if source in ("sageadvice_eu", "all"):
        if os.path.exists(SAGEADVICE_EU_CORPUS):
            with open(SAGEADVICE_EU_CORPUS) as f:
                for line in f:
                    entries.append(json.loads(line))
    if source in ("errata", "all"):
        if os.path.exists(ERRATA_CORPUS):
            with open(ERRATA_CORPUS) as f:
                for line in f:
                    entries.append(json.loads(line))
    return entries
```

**3. Extend argparse choices:**

```python
parser.add_argument("--source",
    choices=["se", "reddit", "sage_advice", "sageadvice_eu", "errata", "all"],
    default="all")
```

### generate_assertions.py changes

No changes needed. It reads `classified.jsonl` which already aggregates all sources. The `source` field in each entry tracks provenance for debugging.

### QA_README.md updates

Add the new sources to the Data Sources section and File Layout. Update the corpus size table.

### Deduplication (future)

Once multiple official sources are active (Scrapers 3, 4, 5), near-duplicate Q&A pairs may appear. A lightweight dedup pass (exact title match or cosine similarity on question text) could be added between `parse` and `classify` steps. Not blocking for initial implementation — the classifier and cache system handle duplicates gracefully (they just waste a few haiku calls).

---

## Summary

| # | Scraper | Files | Yield | Effort | Risk | Depends on |
|---|---------|-------|-------|--------|------|------------|
| 1 | SE `dnd-5.5e` tag | modify `parse_se.py` | +50-120 | 5 min | Zero | — |
| 2 | SE post-cutoff `dnd-5e-2014` | modify `parse_se.py` | +100-175 | 30 min | Medium | Scraper 1 (same file) |
| 3 | DDB Sage Advice | new `download_sage_advice.py` | +80-150 | 2-3 hrs | Low-Med | — |
| 4 | sageadvice.eu | new `download_sageadvice_eu.py` | +50-200 | 3-4 hrs | Medium | — |
| 5 | DDB Errata | new `download_errata.py` | +10-40 | 2-3 hrs | Medium | — |
| — | Pipeline integration | modify `classify.py`, `QA_README.md` | — | 30 min | Low | All above |

**Total expected yield:** +290-685 Q&A pairs on top of current 239 SE entries.

**Recommended execution order:** 1 -> 2 -> 3 -> pipeline integration -> 4 -> 5. Scrapers 1 and 2 are quick wins that don't require new files. Scraper 3 is the highest-signal new source. Scrapers 4 and 5 can be deferred.
