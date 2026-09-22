# SRD 5.2.1 PDF generation

This directory owns the documentation-only experiment for regenerating the
redistributable SRD Markdown corpus from the checked-in official PDF. The PDF
is the sole rules-content authority. The generator and evaluator must not read
an external Markdown conversion, including Downfallx, as input, fixture,
fallback, provenance, or acceptance evidence.

## Boundaries

- `generator/` is candidate-editable implementation. It currently establishes
  a deterministic page-mapped baseline; it is not yet publication quality.
- `section-manifest.json` is the generator's current logical routing. It is
  candidate-editable because physical pages can straddle logical files.
- `evaluation/` is the protected evaluator, test suite, and selectively
  inspected page-oracle set. Once the Autoresearch contract is accepted, a
  packet must not edit it.
- `.references/SRD_CC_v5.2.1.pdf` is the protected authority.
- `pdf-source.json` is the protected single owner of its repository path,
  SHA-256 digest, and page count.
- Generated Markdown is never hand-edited. A generated `.source-map.json`
  maps every PDF page to zero or more file/line fragments; only the explicitly
  excluded table-of-contents pages may have no generated fragment.

The output contract contains fourteen PDF-derived Markdown files. Repository
README and attribution material are maintained metadata and cannot supply
rules text.

## Commands

Generate the current baseline into `.scratch/srd-5.2.1-candidate/`:

```sh
pnpm srd:generate
```

Run the proposed Autoresearch benchmark:

```sh
pnpm srd:autoresearch:benchmark
```

Run the protected invariants twice to prove deterministic generation:

```sh
pnpm srd:autoresearch:check
```

Run the evaluator's example and property tests:

```sh
pnpm srd:autoresearch:test
```

Qualify the protected page-oracle phrases against separately rendered OCR:

```sh
pnpm srd:verify:ocr
```

## Proposed metric

The benchmark emits the integer `qualityLossPpm`; lower is better and zero
means the accepted evaluator detected no loss.

For each generated PDF page:

1. Normalize Unicode punctuation, accents, markup, case, and whitespace.
2. Compute multiset F1 over tokens.
3. Compute multiset F1 over contiguous five-token shingles.
4. Compute page semantic similarity as `0.55 × tokenF1 + 0.45 × shingleF1`.
5. Average page similarity with every generated page weighted equally.

`semanticLossPpm` is one minus that mean, multiplied by one million and
rounded. `polishLossPpm` is the fraction of applicable page/category pairs that
fail, multiplied by one million and rounded. Six categories apply to every
generated page: extraction-only markup, decorated headings, heading-level
jumps, line-break hyphenation, page furniture, and malformed Markdown tables.
Protected oracle-content and oracle-placement categories apply only to sampled
pages with required phrases or an expected logical file set.

The final metric is:

```text
qualityLossPpm = round(0.80 × semanticLossPpm + 0.20 × polishLossPpm)
```

The metric cannot trade against hard checks. A benchmark result is usable only
when the PDF digest/page count, exact output manifest, complete source-map
accounting, fragment digests, absence of an external conversion dependency,
and clean-generation determinism all pass. Known forbidden oracle phrases are
hard failures. Required candidate phrases are
measured loss until final acceptance so an incomplete baseline remains
measurable. Separately rendered OCR qualifies that those phrases really appear
in the PDF; native Poppler text misses are observations rather than evidence of
source absence.

The metric is an optimization signal, not final proof. Completion additionally
requires review of every nonzero residual, selective final visual/OCR evidence,
downstream reference/parser checks, removal of external-conversion provenance,
materialization of the generated corpus, and a second clean generation with
zero Git diff.
