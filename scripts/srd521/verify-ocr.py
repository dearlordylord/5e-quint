"""Verify a selective, layout-diverse sample against independently rendered OCR."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

import pymupdf
from rapidocr import RapidOCR


EXPECTED_PDF_SHA256 = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87"


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def main() -> None:
    pdf_path = Path(".references/SRD_CC_v5.2.1.pdf")
    manifest_path = Path("scripts/srd521/ocr-manifest.json")
    digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    if digest != EXPECTED_PDF_SHA256:
        raise SystemExit(f"unexpected PDF SHA-256: {digest}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    document = pymupdf.open(pdf_path)
    engine = RapidOCR()
    results = []
    for sample in manifest:
        page_number = sample["page"]
        pixmap = document[page_number - 1].get_pixmap(
            matrix=pymupdf.Matrix(2, 2), alpha=False
        )
        result = engine(pixmap.tobytes("png"))
        ocr_text = " ".join(result.txts or [])
        comparable = normalized(ocr_text)
        missing = [
            phrase
            for phrase in sample["mustContain"]
            if normalized(phrase) not in comparable
        ]
        forbidden = [
            phrase
            for phrase in sample.get("mustNotContain", [])
            if normalized(phrase) in comparable
        ]
        if missing or forbidden:
            raise SystemExit(
                f"OCR page {page_number} failed; missing={missing}; forbidden={forbidden}"
            )
        results.append(
            {
                "page": page_number,
                "rationale": sample["rationale"],
                "recognizedLines": len(result.txts or []),
                "meanConfidence": round(
                    sum(result.scores or []) / max(len(result.scores or []), 1), 6
                ),
            }
        )

    print(
        json.dumps(
            {
                "pdfSha256": digest,
                "engine": "RapidOCR 3.4.2 (ONNX Runtime CPU)",
                "renderScale": 2,
                "samples": results,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
