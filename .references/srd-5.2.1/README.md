# SRD 5.2.1 Markdown corpus

This directory is the project's working RAW authority. Its content is a
PDF-checked migration of
[`downfallx/dnd-5e-srd-markdown`](https://github.com/downfallx/dnd-5e-srd-markdown)
at commit `1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4`.

The authoritative source artifact is
[`../SRD_CC_v5.2.1.pdf`](../SRD_CC_v5.2.1.pdf), whose SHA-256 digest is
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.
The exact legal notice is in [legal.md](legal.md), and [attribution.md](attribution.md)
records the conversion provenance.

Run the deterministic extraction experiment and fidelity checks with:

```sh
pnpm srd:extract
pnpm srd:verify
pnpm srd:verify:ocr
```

The extractor writes page-traceable Markdown from the PDF to an ignored output
directory. The checked-in corpus remains the curated, reviewed publication;
the verifier compares it with independent PDF text extraction and selected OCR
oracles. See the qualification report in
[`../../docs/research/srd-5.2.1-markdown-qualification.md`](../../docs/research/srd-5.2.1-markdown-qualification.md).
