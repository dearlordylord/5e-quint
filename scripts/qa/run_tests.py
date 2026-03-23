#!/usr/bin/env python3
"""Run QA-generated Quint tests and write structured results.

Usage:
    python3 scripts/qa/run_tests.py              # run all, report failures
    python3 scripts/qa/run_tests.py --rebuild    # rebuild .qnt first, then run
"""

import argparse
import json
import os
import re
import subprocess
import sys

BASE_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__), "../.."))
QA_DIR = os.path.join(BASE_DIR, ".references/qa")
CACHE_DIR = os.path.join(QA_DIR, "cache/assertions")
OUTPUT_QNT = os.path.join(BASE_DIR, "qa_generated.qnt")
RESULTS_FILE = os.path.join(QA_DIR, "test_results.jsonl")


def run_tests():
    result = subprocess.run(
        ["quint", "test", OUTPUT_QNT, "--main", "qa_generated",
         "--match", "qa_", "--verbosity", "5"],
        capture_output=True, text=True, timeout=300,
    )
    output = result.stdout + result.stderr
    return result.returncode, output


def parse_results(output):
    passed = []
    failed = []
    # Extract failure details: block between "N) test_name:" and next "N)" or end
    failure_details = {}
    for line in output.split("\n"):
        line = line.strip()
        # "ok qa_some_test passed 1 test(s)"
        m = re.match(r"ok\s+(\S+)\s+passed", line)
        if m:
            passed.append(m.group(1))
            continue
        # "FAILED qa_some_test ..." or "failed qa_some_test ..."
        m = re.match(r"(?:FAILED|failed)\s+(\S+)", line)
        if m:
            failed.append(m.group(1))
            continue
        # Quint numbered failure: "1) qa_some_test:" or "1) qa_some_test"
        m = re.match(r"\d+\)\s+(qa_\S+?)[:.]?\s*$", line)
        if m:
            name = m.group(1).rstrip(":")
            if name not in failed:
                failed.append(name)
            continue

    # Extract error blocks per failed test
    # Quint format at end of output:
    #   1) qa_test_name:
    #        Error [QNT508]: Assertion failed
    #         at file.qnt:line:col
    #         line:     assert(...)
    #                   ^^^^^
    #     Use --seed=... to repeat.
    for name in failed:
        pattern = re.compile(
            rf"\d+\)\s+{re.escape(name)}:\s*\n(.*?)Use --seed=",
            re.DOTALL
        )
        m = pattern.search(output)
        if m:
            failure_details[name] = m.group(1).strip()

    return passed, failed, failure_details


def find_cache_file(test_name):
    """Find the cache .qnt file containing a given test name."""
    for fname in os.listdir(CACHE_DIR):
        if not fname.endswith(".qnt"):
            continue
        path = os.path.join(CACHE_DIR, fname)
        with open(path) as f:
            content = f.read()
        if test_name in content:
            return path, content
    return None, None


def extract_source_url(content):
    """Extract // Source: URL from cache file content."""
    m = re.match(r"// Source: (\S+)", content)
    return m.group(1) if m else None


def extract_test_block(test_name, content):
    """Extract the run block for a specific test from cache file content."""
    lines = content.split("\n")
    block = []
    in_block = False
    for line in lines:
        if f"run {test_name}" in line:
            in_block = True
        if in_block:
            block.append(line)
            if line.strip() == "}":
                break
    return "\n".join(block) if block else None


def write_results(passed, failed, failure_details):
    # Look up cache files once per failure
    cache_info = {}
    for name in failed:
        path, content = find_cache_file(name)
        cache_info[name] = (path, content)

    with open(RESULTS_FILE, "w") as f:
        for name in passed:
            f.write(json.dumps({"test": name, "status": "pass"}) + "\n")
        for name in failed:
            cache_path, content = cache_info[name]
            url = extract_source_url(content) if content else None
            code = extract_test_block(name, content) if content else None
            record = {
                "test": name,
                "status": "fail",
                "source_url": url,
                "cache_file": cache_path,
                "error": failure_details.get(name, ""),
                "code": code,
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    total = len(passed) + len(failed)
    print(f"\n{'='*60}")
    print(f"{total} tests: {len(passed)} passed, {len(failed)} failed")

    if not failed:
        print("All tests passed.")
        print(f"Results: {RESULTS_FILE}")
        return

    print(f"\n{'='*60}")
    print("FAILURES")
    print(f"{'='*60}\n")

    for i, name in enumerate(failed, 1):
        cache_path, content = cache_info[name]
        url = extract_source_url(content) if content else None

        print(f"--- [{i}/{len(failed)}] {name} ---")
        if url:
            print(f"Q&A: {url}")
        if cache_path:
            print(f"Cache: {cache_path}")

        err = failure_details.get(name, "")
        if err:
            for line in err.split("\n"):
                print(f"  {line}")

        code = extract_test_block(name, content) if content else None
        if code:
            print(f"\n  Code:")
            for line in code.split("\n"):
                print(f"    {line}")

        print(f"\n  Action:")
        if cache_path:
            print(f"    rm {cache_path}  # delete & regenerate on next run")
        print()

    print(f"Results: {RESULTS_FILE}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rebuild", action="store_true", help="Rebuild .qnt before running")
    args = parser.parse_args()

    if args.rebuild:
        subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "generate_assertions.py"), "--rebuild"],
            check=True,
        )

    if not os.path.exists(OUTPUT_QNT):
        print(f"No test file at {OUTPUT_QNT}. Run generate_assertions.py first.")
        sys.exit(1)

    print(f"Running: quint test {OUTPUT_QNT} --main qa_generated --match qa_")
    returncode, output = run_tests()
    print(output)

    passed, failed, failure_details = parse_results(output)
    write_results(passed, failed, failure_details)

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
