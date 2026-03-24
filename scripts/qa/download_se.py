#!/usr/bin/env python3
"""Download and extract RPG Stack Exchange data dump."""

import os
import subprocess
import sys
import urllib.request

DUMP_URL = "https://archive.org/download/stackexchange_20251231/stackexchange_20251231/rpg.stackexchange.com.7z"
RAW_DIR = os.path.join(os.path.dirname(__file__), "../../.references/qa2014/raw")
ARCHIVE_PATH = os.path.join(RAW_DIR, "rpg.stackexchange.com.7z")
EXTRACT_DIR = os.path.join(RAW_DIR, "rpg.stackexchange.com")


def download():
    os.makedirs(RAW_DIR, exist_ok=True)
    if os.path.exists(ARCHIVE_PATH):
        print(f"Archive already exists: {ARCHIVE_PATH}")
        return
    print(f"Downloading {DUMP_URL} ...")
    urllib.request.urlretrieve(DUMP_URL, ARCHIVE_PATH, reporthook=progress)
    print("\nDone.")


def progress(block_num, block_size, total_size):
    downloaded = block_num * block_size
    if total_size > 0:
        pct = min(100, downloaded * 100 // total_size)
        mb = downloaded / (1024 * 1024)
        total_mb = total_size / (1024 * 1024)
        sys.stdout.write(f"\r  {mb:.1f}/{total_mb:.1f} MB ({pct}%)")
        sys.stdout.flush()


def extract():
    if os.path.exists(EXTRACT_DIR) and os.listdir(EXTRACT_DIR):
        print(f"Already extracted: {EXTRACT_DIR}")
        return
    os.makedirs(EXTRACT_DIR, exist_ok=True)
    print(f"Extracting to {EXTRACT_DIR} ...")
    # Try 7z, then 7zz (homebrew), then p7zip
    for cmd in ["7z", "7zz", "7za"]:
        try:
            subprocess.run(
                [cmd, "x", f"-o{EXTRACT_DIR}", ARCHIVE_PATH, "-y"],
                check=True,
            )
            print("Done.")
            return
        except FileNotFoundError:
            continue
    print("ERROR: No 7z extractor found. Install with: brew install 7zip")
    sys.exit(1)


if __name__ == "__main__":
    download()
    extract()
