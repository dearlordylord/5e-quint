# SRD 5.2.1 Markdown comparison and extraction lessons

Qualification date: 2026-09-22. This is a historical comparison, not an active
PDF-to-Markdown generation workflow. The checked-in
[official PDF](../../.references/SRD_CC_v5.2.1.pdf) is the source oracle. The
[corrected Downfallx-derived corpus](../../.references/srd-5.2.1/) is the
current working RAW; historical review attestations belong to the
[older corpus](../../.references/srd-5.2.1-reviewed/). The independent
PDF-generated candidate and its generator have been retired.

## Whole-corpus measurements

All four pinned publications were compared with the same 364-page PDF Poppler
text stream. Rules Markdown files were concatenated in alphabetical path order,
excluding README and attribution metadata. Text was Unicode-NFKD normalized;
combining marks, HTML tags, punctuation differences, and whitespace were
removed or standardized before lowercasing. Token and contiguous five-token
shingle precision/recall used multiset matches. Verifier-style coverage is the
fraction of Markdown five-gram positions found anywhere in the PDF, without
multiset matching. The PDF stream contained 240,920 normalized words.

| Publication                     | Pinned source                                                                                                                       | Markdown words | Token F1 | Five-gram F1 | Verifier-style five-gram coverage |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------: | -------: | -----------: | --------------------------------: |
| Historically reviewed RAW       | [revision `d6c640d`](https://github.com/dearlordylord/5e-quint/tree/d6c640deab5435c570d82e41a9530fa60f75c6f9/.references/srd-5.2.1) |        241,661 | 97.8045% |     87.5582% |                          89.3291% |
| Downfallx upstream              | [revision `1b4b99d`](https://github.com/downfallx/dnd-5e-srd-markdown/tree/1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4)                |        236,989 | 99.0285% |     91.3352% |                          94.2718% |
| Corrected working RAW           | [revision `fe2ed74`](https://github.com/dearlordylord/5e-quint/tree/fe2ed741bd15ad189b81c0e720d8117ea8c34dcd/.references/srd-5.2.1) |        237,134 | 99.0696% |     91.3891% |                          94.2972% |
| Retired PDF-generated candidate | [revision `f63e5dc`](https://github.com/dearlordylord/5e-quint/tree/f63e5dc290320f2018e07de58852b01b1a97b733/.references/srd-5.2.1) |        238,420 | 98.7979% |     90.5594% |                          93.0051% |

The retired generator's page-weighted `qualityLossPpm` fell from 258,125 to
43,897, but that metric measured improvement against its own extraction
baseline—not superiority to Downfallx. The shared whole-corpus metrics put the
retired candidate below both Downfallx upstream and the corrected working RAW.
Global n-grams also cannot prove local ordering, table-cell association, or the
absence of a small invented passage. The
[defect index](srd-5.2.1-downfallx-defect-index.md) records independently
checked local discrepancies.

## Lessons retained from the retired experiment

- The PDF's column reading order can differ from fixed-layout `pdftotext`
  output. Visual review of page 34 found that two-column Bard spell tables read
  down the left column before the right; fixed-layout extraction interleaved
  them. Page 69 contained two independent three-column spell tables that
  whole-page extraction merged.
- A physical page can straddle logical sections: page 344 ends the monster
  appendix and begins Animals. A page-to-file map must allow two fragments.
- Text extraction and OCR each make mistakes. Visual review of page 364
  confirmed terminal headings `Warhorse`, `Wolf`, and `Weasel`; an earlier
  `Wolverine` OCR assertion was false. The retired experiment selectively OCRed
  28 layout-diverse pages, not the entire PDF.
- On the retired candidate, the stat-block diagnostic found 330 source
  occurrences and 330 matching identities, but direct substitution still
  failed because generated aggregate and RAW coverage attestations referred to
  older line-based anchors. Structural parity did not make the candidate
  migration-ready.
- Selected page comparisons found the corrected working corpus and historical
  RAW both end Telekinesis at the PDF wording, while pinned Downfallx adds
  unsupported text. Downfallx and the corrected corpus have legible six-ability
  Warhorse tables; the retired candidate split ability labels into OCR-like
  fragments. The candidate's page-level traceability was useful, but did not
  compensate for weaker textual and table fidelity.

These are methodological observations, not a complete PDF transcription audit
or a claim that the working conversion has no further defects. The
[defect index](srd-5.2.1-downfallx-defect-index.md) is explicitly non-exhaustive.
