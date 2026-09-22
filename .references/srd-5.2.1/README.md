# SRD 5.2.1 Markdown corpus

This directory is the project's working RAW authority. Its content is a
deterministic Markdown publication generated solely from the checked-in
official SRD 5.2.1 PDF.

The authoritative source artifact is
[`../SRD_CC_v5.2.1.pdf`](../SRD_CC_v5.2.1.pdf), whose SHA-256 digest is
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.
The exact legal notice is in [legal.md](legal.md), [attribution.md](attribution.md)
records the source and license, and [.source-map.json](.source-map.json) maps
every PDF page to its generated file and line interval.

Run the deterministic extraction experiment and fidelity checks with:

```sh
pnpm srd:generate
pnpm srd:autoresearch:check
pnpm srd:verify:ocr
```

The generator writes page-traceable Markdown from the PDF to an ignored output
directory. The checked-in corpus is a materialization of that generated tree;
the checks compare deterministic generations, independent PDF text extraction,
and selected OCR oracles. See the qualification report in
[`../../docs/research/srd-5.2.1-markdown-qualification.md`](../../docs/research/srd-5.2.1-markdown-qualification.md).
