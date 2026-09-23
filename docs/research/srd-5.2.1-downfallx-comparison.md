# SRD 5.2.1 Markdown: direct comparison with Downfallx

Qualification date: 2026-09-22. This report compares four pinned publications
with the [checked-in official SRD PDF](../../.references/SRD_CC_v5.2.1.pdf):

| Publication                                                                                                                                      | Pinned revision                            | Rules files |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ----------: |
| [Historically reviewed RAW](https://github.com/dearlordylord/5e-quint/tree/d6c640deab5435c570d82e41a9530fa60f75c6f9/.references/srd-5.2.1)       | `d6c640deab5435c570d82e41a9530fa60f75c6f9` |          39 |
| [Downfallx upstream](https://github.com/downfallx/dnd-5e-srd-markdown/tree/1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4)                             | `1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4` |          13 |
| [Corrected Downfallx working RAW](https://github.com/dearlordylord/5e-quint/tree/fe2ed741bd15ad189b81c0e720d8117ea8c34dcd/.references/srd-5.2.1) | `fe2ed741bd15ad189b81c0e720d8117ea8c34dcd` |          14 |
| [PDF-generated candidate](https://github.com/dearlordylord/5e-quint/tree/f63e5dc290320f2018e07de58852b01b1a97b733/.references/srd-5.2.1)         | `f63e5dc290320f2018e07de58852b01b1a97b733` |          14 |

The PDF has SHA-256
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`
and 364 pages. The generated candidate is retained at
[`srd-5.2.1-pdf-generated/`](../../.references/srd-5.2.1-pdf-generated/).
The exact 39-file corpus behind historical review attestations is retained at
[`srd-5.2.1-reviewed/`](../../.references/srd-5.2.1-reviewed/).
The corrected Downfallx conversion is the present working RAW at
[`srd-5.2.1/`](../../.references/srd-5.2.1/), pending migration. Downfallx is
a comparison subject, not an input to the PDF generator.

## Shared text measurements

All four publications were measured against the same full-PDF Poppler
`pdftotext` stream. For each publication, concatenate its rules `.md` files in
alphabetical relative-path order, including nested files; exclude README and
attribution notes. Downfallx does not have `legal.md`, so its 13 files are
included as published. Normalize
both sides with Unicode NFKD, remove combining marks and HTML tags, standardize
curly quotes and dash variants, retain letters, numbers, apostrophes, plus
signs, and hyphens, then lowercase and split on whitespace. This is the
[evaluator's normalization](../../scripts/srd521/evaluation/quality.ts) with
combining marks removed explicitly. Count token and contiguous five-token
shingle matches as multisets: each occurrence may match at most once.
Precision divides matches by Markdown occurrences; recall divides by PDF
occurrences; F1 is their harmonic mean. The final column reproduces the
[repository verifier's](../../scripts/srd521/verify.mjs) distinct criterion:
the fraction of Markdown five-gram positions whose text appears anywhere in
the PDF. Values below are full-corpus measures, not the generated-only
evaluator's page-weighted `qualityLossPpm`.

| Publication                     | Markdown words | Token precision | Token recall | Token F1 | Five-gram precision | Five-gram recall | Five-gram F1 | Verifier-style five-gram coverage |
| ------------------------------- | -------------: | --------------: | -----------: | -------: | ------------------: | ---------------: | -----------: | --------------------------------: |
| Historically reviewed RAW       |        241,661 |        97.6546% |     97.9549% | 97.8045% |            87.4239% |         87.6928% |     87.5582% |                          89.3291% |
| Downfallx upstream              |        236,989 |        99.8498% |     98.2206% | 99.0285% |            92.0927% |         90.5901% |     91.3352% |                          94.2718% |
| Corrected Downfallx working RAW |        237,134 |        99.8604% |     98.2911% | 99.0696% |            92.1187% |         90.6710% |     91.3891% |                          94.2972% |
| PDF-generated candidate         |        238,420 |        99.3159% |     98.2853% | 98.7979% |            91.0342% |         90.0895% |     90.5594% |                          93.0051% |

The PDF stream has 240,920 normalized words. The corrected Downfallx working
RAW scores slightly above upstream on these measures; the generated candidate
scores below both, but above historically reviewed RAW. Therefore these measurements
do **not** establish that generated Markdown is textually more faithful than
Downfallx. A high precision value
also cannot rule out local fabrication or omissions, which require spot checks.

To reproduce the inputs, use `git show REV:.references/srd-5.2.1/FILE` for the
two local pre-generation corpora, the pinned Downfallx tree above, and the
generated candidate at
`f63e5dc29`. Use `pdftotext .references/SRD_CC_v5.2.1.pdf -` for the PDF, then
apply the stated normalization and multiset formulas. The verifier-style
coverage differs from multiset precision because one repeated five-gram in
Markdown can match a single PDF occurrence any number of times under that
criterion.

## Selected page checks

These pages were chosen for distinct risks: legal material, columnar tables,
spell prose, and image-like stat-block layouts. They are examples, not an
exhaustive audit.

| PDF page and check                    | Historically reviewed RAW                                                                                                                                                     | Downfallx upstream                                                                                                                                                                                                                                                                               | Corrected working RAW                                                                                                                             | PDF-generated candidate                                                                                                                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page 1, legal notice                  | [Includes `Legal.md`](https://github.com/dearlordylord/5e-quint/blob/d6c640deab5435c570d82e41a9530fa60f75c6f9/.references/srd-5.2.1/Legal.md).                                | Its [rules tree](https://github.com/downfallx/dnd-5e-srd-markdown/tree/1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4) has no `legal.md`; README contains attribution, but not a rules-file transcription of page 1.                                                                                   | [Includes `legal.md`](https://github.com/dearlordylord/5e-quint/blob/fe2ed741bd15ad189b81c0e720d8117ea8c34dcd/.references/srd-5.2.1/legal.md).    | [Includes `legal.md`](../../.references/srd-5.2.1-pdf-generated/legal.md), mapped to page 1.                                                                                                                                                      |
| Page 34, two-column Bard spell tables | [Separate level headings and Markdown tables](https://github.com/dearlordylord/5e-quint/blob/d6c640deab5435c570d82e41a9530fa60f75c6f9/.references/srd-5.2.1/Classes/Bard.md). | [Separate level headings and HTML tables](https://github.com/downfallx/dnd-5e-srd-markdown/blob/1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4/classes.md).                                                                                                                                            | Retains those tables.                                                                                                                             | [Separate level headings and Markdown tables](../../.references/srd-5.2.1-pdf-generated/classes.md); the PDF columns are represented in reading order. This is a successful layout conversion, but not a unique advantage over the other corpora. |
| Page 168, Telekinesis ending          | [Stops at the PDF ending](https://github.com/dearlordylord/5e-quint/blob/d6c640deab5435c570d82e41a9530fa60f75c6f9/.references/srd-5.2.1/Spells/Descriptions-S-Z.md).          | [Adds](https://github.com/downfallx/dnd-5e-srd-markdown/blob/1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4/spells.md) a sentence fragment after “manipulating a simple tool” about opening and pouring from containers. That text is absent from the [PDF page](../../.references/SRD_CC_v5.2.1.pdf). | [Removes the insertion](https://github.com/dearlordylord/5e-quint/blob/fe2ed741bd15ad189b81c0e720d8117ea8c34dcd/.references/srd-5.2.1/spells.md). | [Stops at the PDF ending](../../.references/srd-5.2.1-pdf-generated/spells.md). This is a concrete fidelity gain over uncorrected Downfallx, shared with original RAW and the corrected conversion.                                               |
| Page 364, Warhorse ability scores     | [Presents a six-ability Markdown table](https://github.com/dearlordylord/5e-quint/blob/d6c640deab5435c570d82e41a9530fa60f75c6f9/.references/srd-5.2.1/Animals.md).            | [Presents a six-ability HTML table](https://github.com/downfallx/dnd-5e-srd-markdown/blob/1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4/animals.md) with labels and scores legible.                                                                                                                   | Retains the HTML table.                                                                                                                           | [Leaves OCR-like picture-text markup](../../.references/srd-5.2.1-pdf-generated/animals.md): `S tr`, `D ex`, `C on`, `W IS`, etc. This is a concrete generated formatting regression even though the nearby values appear.                        |

The generated [source map](../../.references/srd-5.2.1-pdf-generated/.source-map.json)
accounts for all 364 pages: 361 generated pages, three explicitly excluded
contents pages, 362 hashed fragments over 14 rules files, and a two-file split
on page 344. The [generator and verification contract](../../scripts/srd521/README.md)
pin the PDF digest and reproduce the output. Upstream Downfallx supplies neither
a page-level source map nor this repository's PDF regeneration procedure.
Those are meaningful traceability and reproducibility advantages, distinct
from textual fidelity.

## Limits and decision

PDF text extraction is itself imperfect: page furniture, column order, table
cell order, and image text can lower n-gram scores without changing a rule.
These full-document scores also include the PDF contents pages, which the
generated publication intentionally excludes, and are insensitive to whether
a rule sits in the right Markdown file. The four page checks expose errors the
aggregate scores can hide. Selective OCR and [the existing generated-corpus
qualification](srd-5.2.1-markdown-qualification.md) add confidence but do not
constitute a full character-by-character PDF transcription check.

The current evidence supports a narrower conclusion: the PDF-generated
candidate is reproducible and page-traceable, and it corrects at least one
specific upstream invention. It does **not** yet demonstrate superior overall
text fidelity or Markdown polish over pinned Downfallx or the locally corrected
Downfallx working RAW. It does exceed the historically reviewed RAW on the shared
text metrics, but that does not settle the layout or migration checks.
Promotion should require repair of the demonstrated stat-block
layout defects and a repeated shared comparison whose textual, structural,
and sampled visual evidence supports the claimed improvement.
