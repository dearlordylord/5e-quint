# Portable Surface cases

`srd-surface-cases.json` is a self-contained, language-neutral case corpus for
the published SRD Surface aggregate. Every ordinary case carries its complete
aggregate input; the duplicate-member case carries its complete raw JSON text.
The document also carries the dependency-field contract from the explicit
language-neutral authority in `srd-surface-dependency-contract.json`. Contract
paths are record-relative dotted paths; `[]` denotes any array element, and
each role names its source and target record family. The production schema
walker is cross-checked against that contract, but it does not generate the
independent expected results.

Each case's `expected.production` describes the typed result from the
production Surface boundary. `expected.independent` describes the
corresponding independent Draft 2020-12 validation lane. The cases contain
complete issue objects (including paths and code-specific metadata) as
unordered collections; rejected outcomes are non-empty. Accepted outcomes
publish a catalog only in the result union, never alongside a rejection. The
cases contain only SRD publication data and synthetic invalid-field/provenance
values. The content-publication check regenerates the bytes in memory and
rejects committed artifact drift without rewriting the file.
