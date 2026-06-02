#!/usr/bin/env python3
"""Retired root-QNT QA assertion runner."""

import argparse

RETIRED_MESSAGE = (
    "Root-QNT QA assertion tests are retired because the generated root QNT "
    "artifact and its archived prompt spec were removed from the worktree. "
    "Use package-local QNT proofs, MBT drivers, and runtime tests for active "
    "verification."
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rebuild", action="store_true")
    parser.error(RETIRED_MESSAGE)


if __name__ == "__main__":
    main()
