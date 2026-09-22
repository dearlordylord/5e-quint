# SRD 5.2.1 Markdown qualification

Qualification date: 2026-09-22.

## Decision

The former local Markdown was not as reliable as
[`downfallx/dnd-5e-srd-markdown`](https://github.com/downfallx/dnd-5e-srd-markdown)
at commit `1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4`. The external conversion has
materially better measured correspondence to the official PDF, especially in
the monster corpus, and contains content omitted by the former local corpus.
It was therefore adopted as the base conversion.

The external repository was not accepted on trust or treated as verbatim. Its
content was checked against the official PDF, and three kinds of defects were
repaired locally: an extra Telekinesis sentence absent from the PDF, malformed
HTML ability tables for three monsters, and missing legal/provenance files.

The resulting corpus is qualified as a high-confidence, human-readable
Markdown representation of SRD 5.2.1. It is not claimed to be byte-for-byte or
markup-for-markup equivalent to the PDF. PDF reading order, page furniture,
line wrapping, and table layout are intentionally normalized.

## Pinned inputs

| Input               | Pin                                                                               |
| ------------------- | --------------------------------------------------------------------------------- |
| Official SRD PDF    | `.references/SRD_CC_v5.2.1.pdf`                                                   |
| PDF source URL      | `https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf`         |
| PDF SHA-256         | `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`                |
| PDF size            | 6,031,375 bytes                                                                   |
| PDF pages           | 364                                                                               |
| Imported conversion | `downfallx/dnd-5e-srd-markdown` commit `1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4` |

The PDF is checked into Git. The extraction and verification commands reject a
different PDF digest.

## Comparative measurement

The comparison normalized Unicode punctuation, case, whitespace, and Markdown
or HTML presentation, then measured the fraction of each Markdown corpus's
contiguous five-word sequences also present in native text extracted from the
official PDF. This is a strong detector for copied, reordered, duplicated, or
invented prose, but it is not by itself a completeness proof. The independent
checks below cover omissions and difficult layouts.

| Section            | Former local words | Imported words | Former PDF coverage | Imported PDF coverage |
| ------------------ | -----------------: | -------------: | ------------------: | --------------------: |
| Playing the game   |              9,773 |          9,821 |             90.399% |               90.972% |
| Character creation |              6,090 |          6,090 |             92.561% |               92.816% |
| Character origins  |              2,634 |          2,634 |             94.297% |               93.938% |
| Classes            |             29,875 |         29,863 |             93.826% |               94.220% |
| Equipment          |              9,525 |          9,523 |             93.724% |               93.813% |
| Feats              |              1,279 |          1,279 |             94.572% |               95.032% |
| Gameplay toolbox   |              7,795 |          7,801 |             92.753% |               92.685% |
| Rules glossary     |             10,934 |         10,931 |             90.107% |               90.359% |
| Spells             |             54,392 |         54,346 |             93.399% |               93.963% |
| Magic items        |             38,216 |         38,389 |             93.586% |               94.299% |
| Monsters           |             58,427 |         58,122 |             84.129% |               95.788% |
| Animals            |             11,476 |         11,474 |             98.016% |               98.156% |

Small reversals in individual sections come mostly from presentation choices.
The decisive difference is not only the aggregate score: direct inspection
found correctness and completeness defects in the former local corpus.

## Confirmed former-corpus defects

The PDF comparison confirmed all of the following rather than inferring them
from disagreement between two Markdown repositories:

- Four duplicated monster entries: Stone Giant, Stone Golem, Storm Giant, and
  Succubus.
- Missing magic-item content: Mantle of Spell Resistance and the Giant Fly and
  Avatar of Death stat blocks.
- Pony Hooves used `7 (1d8 + 3)` rather than the PDF's `4 (1d4 + 2)`.
- Giant Octopus represented its Wisdom save as `-4` rather than `+0`.
- Triceratops contained an extra word in its charge text.
- Additional wording defects occurred in the feats, playing-the-game, class,
  and spell sections.

These findings make the answer to the original comparison question unambiguous:
the former local rulebook was worse as a representation of the official PDF.

## Imported-conversion defects repaired

The imported conversion also required review and correction:

- Telekinesis contained a sentence beginning “opening a door or a container”
  that is not present on PDF page 168. It was removed.
- The Ancient Red Dragon, Remorhaz, and Will-o'-Wisp ability-score tables had
  malformed HTML cells. They were reconstructed from the corresponding PDF
  stat blocks.
- The external conversion did not carry the complete local legal and
  provenance documentation. `legal.md` and `attribution.md` now preserve it.

The verifier includes positive checks for known omissions and corruptions and
a negative check that prevents the Telekinesis insertion from returning.

## Reproducible extraction experiment

Run:

```sh
pnpm srd:generate
```

The generator is pinned to `pymupdf4llm==1.28.2`, verifies the PDF digest and
364-page count, and produces 14 page-traceable Markdown files plus a source map
under `.scratch/srd-5.2.1-candidate/`. It currently supplies a deterministic
baseline for the PDF-only generation experiment; it does not yet reproduce the
checked-in publication-quality corpus. The protected evaluator and experiment
contract are documented in [`scripts/srd521/README.md`](../../scripts/srd521/README.md).

## Whole-corpus verification

Run:

```sh
pnpm srd:verify
```

The current result is:

| Measure                               |   Result |
| ------------------------------------- | -------: |
| Content/legal Markdown files          |       14 |
| Normalized corpus words               |  237,134 |
| Markdown five-grams found in PDF text | 94.2972% |
| Targeted regression assertions        |      8/8 |

The 90% gate allows unavoidable reading-order differences around multi-column
pages and tables while remaining sensitive to substantial invented or damaged
prose. The regression assertions cover the legal grant, a known action
omission, continued class tables, the missing magic item, both corrected animal
values, and the Telekinesis boundary.

## Independent visual/OCR validation

Native PDF text extraction and Markdown derived from it can share reading-order
failures. A separate OCR engine therefore checks rendered page images:

```sh
pnpm srd:verify:ocr
```

The protected manifest selects 28 pages (about 7.7 percent of the PDF) by
layout family, major section, and difficult boundary rather than by convenient
prose. It covers legal text and the excluded contents index; two-column prose;
callouts; simple, continued, and progression tables; every major rules section;
spell and magic-item metadata; monster indexes and stat blocks; the shared
monster/animal physical-page boundary; and the terminal page. The owning page
set, rationale, and required phrases are in
[`page-oracles.json`](../../scripts/srd521/evaluation/page-oracles.json).

Every OCR-required phrase was recognized and the forbidden Telekinesis
insertion was absent. The terminal `Wolverine` heading is visibly present but
is missed by both Poppler native text and RapidOCR; it is therefore recorded as
a visually confirmed, candidate-required oracle rather than deleted from the
acceptance evidence. The current raw generator omits it, and the benchmark
measures that omission as content loss.

## Confidence and remaining limits

Confidence is high because the result combines a pinned source artifact, a
reproducible independent extraction, normalized whole-corpus measurement,
targeted regression checks, selective image OCR, visual review of difficult
layouts, and downstream parser checks. No one of these is treated as proof by
itself.

The qualification does not assert typographic identity, exact PDF reading
order, or exhaustive OCR of all 364 pages. It also does not silently rewrite
runtime-authored records when the corrected RAW exposes a pre-existing data
disagreement; those are behavioral changes and must be reviewed separately.

At qualification time, `pnpm check:srd-stat-block-catalog` discovers and
strictly decodes all 330 standalone stat blocks, with complete source coverage,
unique identities, synchronized generated peers, catalog parity, and valid
provenance. Its scoped-fidelity phase reports 86 authored-mechanics
disagreements. Three are the directly PDF-confirmed Giant Octopus, Pony, and
Triceratops defects listed above. Other examples include authored projections
such as ammunition facts that are not printed in the stat-block action text.
The gate is deliberately left failing: changing runtime-authored mechanics or
weakening the fidelity contract would exceed this documentation-only migration.

The pre-existing RAW-coverage review ledger also needs a separate review
migration because its generated section identities and hashes describe the
former split corpus; `pnpm raw-coverage:check` currently stops at the first new
unreviewed section (`srd521-animals-0065`). Automatically carrying a review
decision onto text with a different source span would manufacture evidence, so
this migration updates paths and anchors but does not assert replacement review
outcomes. `pnpm check:surface-publication-self-test` consequently remains red
at scoped stat-block fidelity/publication, while type checking, source
discovery, aggregate synchronization, the 439-Unit inventory, source-binding
tests, deterministic extraction, native-text verification, and selective OCR
pass.
