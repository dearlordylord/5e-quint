# SRD 5.2.1 Markdown corpus

This directory is the project's current working RAW text for rule and content
consumers. Its content is a PDF-checked migration of
[`downfallx/dnd-5e-srd-markdown`](https://github.com/downfallx/dnd-5e-srd-markdown)
at commit `1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4`.

The authoritative source artifact is
[`../SRD_CC_v5.2.1.pdf`](../SRD_CC_v5.2.1.pdf), whose SHA-256 digest is
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.

## Attribution and source

The [SRD 5.2.1 legal page](legal.md) requires this attribution statement for
works using its content:

> This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

This Markdown corpus is adapted from the community-maintained
[`downfallx/dnd-5e-srd-markdown` conversion](https://github.com/downfallx/dnd-5e-srd-markdown/blob/1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4/README.md)
at the pinned commit above. We changed its layout and corrected text and tables
against the official PDF; the conversion and this project are not official
Wizards publications. [attribution.md](attribution.md) records the pinned
conversion provenance, and [NOTICE](../../NOTICE) carries the repository-level
SRD notice.

The historical RAW coverage attestations belong to the byte-preserved
pre-migration corpus in
[`../srd-5.2.1-reviewed/`](../srd-5.2.1-reviewed/), not this
later layout. [Issue #543](https://github.com/dearlordylord/5e-quint/issues/543)
owns reconciling the review attestations with this working corpus.

Run the current working-corpus fidelity check with:

```sh
pnpm srd:verify
```

The verifier compares this corpus with independent PDF text extraction. See
the [comparison report](../../docs/research/srd-5.2.1-downfallx-comparison.md)
for the limits of aggregate text metrics and selected PDF page checks.
