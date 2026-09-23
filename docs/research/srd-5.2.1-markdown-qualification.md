# SRD 5.2.1 Markdown qualification

Qualification date: 2026-09-22.

## Decision

The checked-in `.references/srd-5.2.1-pdf-generated/` directory is a
deterministic Markdown candidate generated solely from the official SRD 5.2.1
PDF. No external Markdown conversion is an input, fixture, fallback,
provenance source, or acceptance oracle for that generator.

The corrected Downfallx-derived `.references/srd-5.2.1/` corpus remains the
working RAW text for current consumers. Historical coverage reviews refer to
the separate, byte-preserved `.references/srd-5.2.1-reviewed/` corpus; they do
not transfer to either later layout. The generated candidate is page-traceable
and human-readable, but a direct comparison has not yet established that it is
more faithful than the pinned Downfallx conversion. The
[comparison report](srd-5.2.1-downfallx-comparison.md) owns that evidence;
[issue #543](https://github.com/dearlordylord/5e-quint/issues/543) owns the
eventual promotion and review migration.

## Pinned authority and outputs

| Fact                  | Value                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| Official PDF          | `.references/SRD_CC_v5.2.1.pdf`                                           |
| Source URL            | `https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf` |
| SHA-256               | `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`        |
| Size                  | 6,031,375 bytes                                                           |
| Pages                 | 364                                                                       |
| Generated rules files | 14                                                                        |
| Excluded pages        | 2–4, the table of contents                                                |

The generator verifies the PDF digest and page count, emits the exact output
manifest, and writes `.source-map.json`. Each included PDF page owns a generated
file/line fragment and content digest; excluded pages record their reason.

## Measured loop

The accepted evaluator combines normalized token F1, contiguous five-token
shingle F1, and six Markdown-polish categories. Sampled content and placement
oracles are additional categories, while source identity, output accounting,
fragment digests, forbidden content, and deterministic generation are hard
checks that cannot trade against the metric.

The accepted Autoresearch loop improved `qualityLossPpm` from the original
PDF-only baseline of 258,125 to a best kept result of 44,077. Final direct
qualification with the same deterministic evaluator measured 43,897 after
maintained documentation changed outside the accepted segment tree policy; it
is not recorded as an additional Autoresearch keep. The qualified artifact digest is
`ad3084d5fd57c9afbb2fa5086b753ad98d1d8bb5f0e06f041783fec80aa53eb1`.
All kept candidates were measured twice with identical fingerprints and output
digests, and all authoritative checks passed.

The largest score correction came from fixing the independent oracle. Direct
review of page 34 shows that its two-column spell tables read down the left
column and then the right; Poppler fixed-layout output incorrectly interleaves
the columns row by row. The evaluator therefore uses raw content-stream order.
It also removes only exact leading running-title/page-number forms because the
publication correctly omits that page furniture.

## Selective visual and OCR evidence

`pnpm srd:verify:ocr` renders and independently recognizes 28 pages chosen by
layout family and boundary risk. The sample covers legal text, excluded contents
pages, two-column prose, callouts, progression and continued tables, every major
rules section, spell and magic-item metadata, monster indexes and stat blocks,
the monster/animal boundary, and the terminal page.

Three direct visual reviews changed or confirmed the method:

- Page 34 confirmed left-column-then-right-column reading order.
- Page 69 exposed two independent three-column spell tables that full-page
  extraction had merged. The manifest now extracts its columns independently
  and supplies explicit document-relative heading replacements.
- Page 364 confirmed the terminal headings are `Warhorse`, `Wolf`, and `Weasel`.
  A former `Wolverine` visual assertion was false and was removed before final
  qualification.

All OCR-required phrases are recognized and the forbidden Telekinesis insertion
is absent. Every sampled candidate phrase passes. Page 344 is represented by
two source-map fragments because the physical page ends the monster appendix
and begins the animals appendix.

## Downstream structural evidence

When pointed at the candidate in the earlier single-corpus layout, the
stat-block catalog diagnostic discovered 330 complete source occurrences and
330 agreeing identities. It reported zero catalog-parity issues against the
330 installed records. This was a large improvement over the initial PDF-only
extraction, which exposed no usable source occurrences.

The complete diagnostic rejected direct substitution because the installed
generated TypeScript aggregate retains line-number provenance for the corrected
conversion's layout. Those 330 source-anchor reports and aggregate out-of-sync
report do not indicate missing or divergent rule records. The candidate
remains separate until issue #543 migrates those downstream anchors.

With the candidate substituted as working RAW, `pnpm raw-coverage:check`
stopped at the first regenerated section identifier (`srd521-animals-0020`):
that inventory derives section IDs, line spans, and text hashes from the
pre-migration layout. The historical review attestations remain checkable
against the byte-preserved older corpus, but must be re-established against
the candidate before promotion, not mechanically carried forward.

## Reproduction and acceptance

```sh
pnpm srd:generate
pnpm srd:autoresearch:check
pnpm srd:autoresearch:test
pnpm srd:verify:ocr
pnpm srd:verify
```

The first command regenerates the corpus below `.scratch/`. The authoritative
check performs two clean generations and requires identical tree digests. The
test suite covers source-map parsing, metric properties, confinement, furniture
normalization, and polish detection.

`pnpm srd:verify` checks the corrected working conversion, not the PDF-generated
candidate. The candidate's 238,420 normalized words and 93.0051% five-gram
PDF coverage were measured while it occupied the working path; those values
must not be reported as the current working-corpus result. The candidate has
84 protected oracle assertions and two byte-identical clean generations. No
full PDF OCR was performed. The metric remains an optimization signal, not
proof of superiority or permission to transfer review attestations.
