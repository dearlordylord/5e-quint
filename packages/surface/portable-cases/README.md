# Portable Surface cases

`srd-surface-cases.json` is a self-contained, language-neutral case corpus for
the published SRD Surface aggregate. Every ordinary case carries its complete
aggregate input; the duplicate-member case carries its complete raw JSON text.
The document also carries the dependency-field contract derived from the
canonical Surface schema. Contract paths are record-relative dotted paths;
`[]` denotes any array element, and each role names its source and target
record family.

Each case's `expected.production` describes the typed result from the
production Surface boundary. `expected.independent` describes the
corresponding independent Draft 2020-12 validation lane. The cases contain
only SRD publication data and synthetic invalid-field/provenance values.
