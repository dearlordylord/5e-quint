# SRD 5.2.1 Markdown corpus

This directory is the project's current working RAW text for rule and content
consumers. Its content is a PDF-checked migration of
[`downfallx/dnd-5e-srd-markdown`](https://github.com/downfallx/dnd-5e-srd-markdown)
at commit `1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4`.

The authoritative source artifact is
[`../SRD_CC_v5.2.1.pdf`](../SRD_CC_v5.2.1.pdf), whose SHA-256 digest is
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.
The exact legal notice is in [legal.md](legal.md), and [attribution.md](attribution.md)
records the conversion provenance.

The historical RAW coverage attestations belong to the byte-preserved
pre-migration corpus in
[`../srd-5.2.1-reviewed/`](../srd-5.2.1-reviewed/), not this
later layout. The independent PDF-generated candidate is in
[`../srd-5.2.1-pdf-generated/`](../srd-5.2.1-pdf-generated/).
[Issue #543](https://github.com/dearlordylord/5e-quint/issues/543) owns
reconciling these sources and migrating the attestations and consumers before
any generated-corpus promotion.

Run the current working-corpus fidelity check with:

```sh
pnpm srd:verify
```

The verifier compares this corpus with independent PDF text extraction. The
separate PDF generator writes page-traceable Markdown; its selected OCR checks
apply to that candidate. See the qualification report in
[`../../docs/research/srd-5.2.1-markdown-qualification.md`](../../docs/research/srd-5.2.1-markdown-qualification.md).
