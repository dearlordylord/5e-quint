"""Shared utilities for the QA corpus pipeline."""

import html as html_mod
import hashlib
import json
import os
import re
import urllib.error
import urllib.request

USER_AGENT = "dnd-qa-corpus/1.0 (research)"


def strip_html(s):
    """Rough HTML→text. Good enough for corpus; not for display."""
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"</?p>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    return html_mod.unescape(s).strip()


def fetch_url(url, cache_path):
    """Fetch a URL, caching raw HTML to disk. Returns None on 404."""
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return f.read()
    req = urllib.request.Request(url)
    req.add_header("User-Agent", USER_AGENT)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    except (TimeoutError, urllib.error.URLError, OSError):
        # Network timeout or transient failure — skip this URL
        return None
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(raw)
    return raw


def entry_hash(entry):
    """Content-addressable hash for a corpus entry (sha256, 16-char prefix)."""
    raw = json.dumps(entry, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]
