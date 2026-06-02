#!/usr/bin/env python3
"""Retired root-QNT QA assertion generator.

The corpus download and classification scripts remain useful research tools,
but the assertion-generation lane targeted deleted root QNT restore material.
Only the generated-artifact authored-identity policy self-test remains active
because it is part of the normal quality gate.
"""

import argparse
import os
import re
import tempfile

BASE_DIR = os.path.join(os.path.dirname(__file__), "../..")
QA_DIR = os.path.join(BASE_DIR, ".references/qa")
PRIVATE_IDENTITY_BLOCKLIST = os.path.join(QA_DIR, "non_srd_authored_identities.txt")

RETIRED_MESSAGE = (
    "Root-QNT QA assertion generation is retired. The generator previously "
    "prompted against archived root restore material that has been removed from "
    "the worktree. Use package-local QNT, rule-core QNT, and package-local "
    "parity tests for active verification."
)


def authored_identity_pattern(identity):
    words = [re.escape(part) for part in re.split(r"[\s_-]+", identity)]
    phrase_pattern = r"[\s_-]+".join(words)
    return re.compile(
        rf"(?<![A-Za-z0-9_]){phrase_pattern}(?![A-Za-z0-9_])",
        re.IGNORECASE,
    )


def load_private_identity_blocklist(path=PRIVATE_IDENTITY_BLOCKLIST):
    if not os.path.exists(path):
        raise FileNotFoundError(
            "QA generated QNT identity blocklist is required before materialization: "
            f"{path}"
        )
    identities = []
    with open(path) as f:
        for line in f:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            identities.append(stripped)
    return tuple(identities)


def qa_authored_identity_policy_issues(
    text,
    blocklist_path=PRIVATE_IDENTITY_BLOCKLIST,
):
    identities = load_private_identity_blocklist(blocklist_path)
    patterns = tuple((identity, authored_identity_pattern(identity)) for identity in identities)
    issues = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        for identity, pattern in patterns:
            if pattern.search(line):
                issues.append((line_number, identity, line.strip()))
    return issues


def format_identity_policy_error(artifact_label, issues):
    rendered = "\n".join(
        f"  - {artifact_label}:{line_number} contains non-SRD authored identity "
        f"{identity!r}: {line}"
        for line_number, identity, line in issues
    )
    return (
        "QA generated QNT identity policy violation(s) found.\n"
        "Materialized QA QNT may contain only SRD authored identity, visibly "
        "synthetic identity, or runtime projection facts.\n"
        f"{rendered}"
    )


def enforce_qa_authored_identity_policy(
    text,
    artifact_label,
    blocklist_path=PRIVATE_IDENTITY_BLOCKLIST,
):
    issues = qa_authored_identity_policy_issues(text, blocklist_path)
    if issues:
        raise ValueError(format_identity_policy_error(artifact_label, issues))


def write_checked_qnt(
    path,
    text,
    artifact_label,
    blocklist_path=PRIVATE_IDENTITY_BLOCKLIST,
):
    enforce_qa_authored_identity_policy(text, artifact_label, blocklist_path)
    with open(path, "w") as f:
        f.write(text)


def render_qnt(chunks):
    lines = [
        "// -*- mode: Bluespec; -*-",
        "",
        "/// Synthetic self-test artifact for the QA generated identity gate.",
        "",
        "module qa_generated_identity_gate_self_test {",
        "",
    ]
    for chunk in chunks:
        for line in chunk.split("\n"):
            lines.append(f"  {line}")
        lines.append("")
    lines.append("}")
    return "\n".join(lines) + "\n"


def run_self_test():
    private_blocked_identity = "QA Synthetic Private Blocked Identity"
    good = render_qnt([
        "\n".join([
            "// SRD runtime projection facts write through the QA gate.",
            "run qa_srd_projection = {",
            "  assert(true)",
            "}",
        ]),
    ])

    missing_blocklist_path = None
    missing_artifact_path = None
    try:
        fd, missing_blocklist_path = tempfile.mkstemp()
        os.close(fd)
        os.unlink(missing_blocklist_path)
        fd, missing_artifact_path = tempfile.mkstemp(suffix=".qnt")
        os.close(fd)
        os.unlink(missing_artifact_path)
        try:
            write_checked_qnt(
                missing_artifact_path,
                good,
                missing_artifact_path,
                blocklist_path=missing_blocklist_path,
            )
        except FileNotFoundError:
            pass
        else:
            raise AssertionError("expected missing private blocklist to fail closed")
        if os.path.exists(missing_artifact_path):
            raise AssertionError("missing-blocklist write created an artifact")
    finally:
        for path in (missing_blocklist_path, missing_artifact_path):
            if path is not None:
                try:
                    os.unlink(path)
                except OSError:
                    pass

    if not os.path.exists(PRIVATE_IDENTITY_BLOCKLIST):
        default_artifact_path = None
        try:
            fd, default_artifact_path = tempfile.mkstemp(suffix=".qnt")
            os.close(fd)
            os.unlink(default_artifact_path)
            try:
                write_checked_qnt(default_artifact_path, good, default_artifact_path)
            except FileNotFoundError:
                pass
            else:
                raise AssertionError("expected default missing private blocklist to fail closed")
            if os.path.exists(default_artifact_path):
                raise AssertionError("default missing-blocklist write created an artifact")
        finally:
            if default_artifact_path is not None:
                try:
                    os.unlink(default_artifact_path)
                except OSError:
                    pass

    blocklist_path = None
    try:
        fd, blocklist_path = tempfile.mkstemp()
        with os.fdopen(fd, "w") as f:
            f.write("# Synthetic private blocklist fixture\n")
            f.write(f"{private_blocked_identity}\n")
        loaded_blocklist = load_private_identity_blocklist(blocklist_path)
        if loaded_blocklist != (private_blocked_identity,):
            raise AssertionError("private identity blocklist did not load the expected fixture")

        enforce_qa_authored_identity_policy(
            good,
            "self-test-good.qnt",
            blocklist_path=blocklist_path,
        )

        good_path = None
        fd, good_path = tempfile.mkstemp(suffix=".qnt")
        os.close(fd)
        os.unlink(good_path)
        try:
            write_checked_qnt(
                good_path,
                good,
                good_path,
                blocklist_path=blocklist_path,
            )
            if not os.path.exists(good_path):
                raise AssertionError("checked QNT write did not create the SRD artifact")
        finally:
            if good_path is not None:
                try:
                    os.unlink(good_path)
                except OSError:
                    pass

        bad = render_qnt([
            "\n".join([
                f"// {private_blocked_identity} should not be materialized.",
                "run qa_private_blocked_identity_projection = {",
                "  assert(true)",
                "}",
            ]),
        ])
        issues = qa_authored_identity_policy_issues(bad, blocklist_path=blocklist_path)
        if not any(identity == private_blocked_identity for _, identity, _ in issues):
            raise AssertionError("expected private blocked identity to fail the QA identity gate")

        tmp_path = None
        fd, tmp_path = tempfile.mkstemp(suffix=".qnt")
        os.close(fd)
        os.unlink(tmp_path)
        try:
            try:
                write_checked_qnt(tmp_path, bad, tmp_path, blocklist_path=blocklist_path)
            except ValueError:
                pass
            else:
                raise AssertionError("expected checked QNT write to reject blocked identity")
            if os.path.exists(tmp_path):
                raise AssertionError("checked QNT write created a rejected artifact")
        finally:
            if tmp_path is not None:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
    finally:
        if blocklist_path is not None:
            try:
                os.unlink(blocklist_path)
            except OSError:
                pass

    print("QA generated identity gate self-test OK.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    args, _ = parser.parse_known_args()

    if args.self_test:
        run_self_test()
        return

    parser.error(RETIRED_MESSAGE)


if __name__ == "__main__":
    main()
