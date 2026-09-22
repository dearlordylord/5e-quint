"""Verify a selective, layout-diverse sample against independently rendered OCR."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import pymupdf
from rapidocr import RapidOCR


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def main() -> None:
    source_contract = json.loads(
        Path("scripts/srd521/pdf-source.json").read_text(encoding="utf-8")
    )
    pdf_path = Path(source_contract["path"])
    manifest_path = Path("scripts/srd521/evaluation/page-oracles.json")
    digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    if digest != source_contract["sha256"]:
        raise SystemExit(f"unexpected PDF SHA-256: {digest}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    document = pymupdf.open(pdf_path)
    if document.page_count != source_contract["pages"]:
        raise SystemExit(
            f"unexpected PDF page count: {document.page_count}; "
            f"expected {source_contract['pages']}"
        )
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
                "visualOnlyMustContain": sample.get(
                    "visualOnlyMustContain", []
                ),
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
