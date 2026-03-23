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

BASE_DIR = os.path.join(os.path.dirname(__file__), "../..")
QA_DIR = os.path.join(BASE_DIR, ".references/qa")
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
    return passed, failed


def write_results(passed, failed, output):
    with open(RESULTS_FILE, "w") as f:
        for name in passed:
            f.write(json.dumps({"test": name, "status": "pass"}) + "\n")
        for name in failed:
            f.write(json.dumps({"test": name, "status": "fail"}) + "\n")

    total = len(passed) + len(failed)
    print(f"\n{total} tests: {len(passed)} passed, {len(failed)} failed")
    if failed:
        print(f"\nFailed tests:")
        for name in failed:
            print(f"  - {name}")
        print(f"\nResults written to {RESULTS_FILE}")
        print(f"Full output above. To investigate, find the cache entry:")
        print(f"  grep -rl '<test_name>' .references/qa/cache/assertions/")
    else:
        print("All tests passed.")
        print(f"Results written to {RESULTS_FILE}")


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

    passed, failed = parse_results(output)
    write_results(passed, failed, output)

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
