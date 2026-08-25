# Portable Surface cases

`srd-surface-case-index.json` is a language-neutral case corpus for the
published SRD Surface aggregate. `baseArtifact` is relative to this directory;
each case applies the listed JSON Patch-style operations (`add`, `replace`,
`remove`, or `copy`) using JSON Pointer paths.

`productionIssueCodes` describes the typed result from the production Surface
boundary. `independentIssueCodes` describes the corresponding independent
Draft 2020-12 validation lane. The cases contain only SRD publication data and
synthetic invalid-field/provenance values.
