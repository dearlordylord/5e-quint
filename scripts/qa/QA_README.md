# D&D Rules Q&A Corpus Pipeline

The community Q&A corpus download, parsing, and classification scripts are
research tools. The old assertion-generation lane is retired because it was
prompted against archived root QNT restore material that has been removed from
the worktree.

Active verification now lives in:

- package-local QNT specs such as `packages/battle-runtime/*.qnt`;
- shared rule-core QNT under `packages/shared-algebras/proofs/rule-core/`;
- focused package-local MBT and runtime tests.

## Current Commands

Corpus classification is still usable when the private corpus exists:

```bash
python3 scripts/qa/classify.py --limit 100 --source se --workers 5
```

The root-QNT assertion generator and runner intentionally fail:

```bash
python3 scripts/qa/generate_assertions.py
python3 scripts/qa/run_tests.py
```

`pnpm check:qa-generated-identity` remains active as a lightweight regression
check for the generated-artifact identity policy. It exercises the policy helper
without materializing a root QNT artifact.

## Authored-Identity Boundary

Generated QA QNT, if a future task reintroduces a package-local assertion lane,
may contain only:

- SRD authored identity whose provenance is the repo's redistributable SRD
  corpus;
- visibly synthetic renamed identity for non-SRD mechanics examples;
- runtime projection facts derived from the formal spec, such as concrete rolls,
  hit points, conditions, counters, and procedure inputs.

It must not contain real PHB+ ids, names, slugs, prose labels, source headings,
page references, or recognizable official catalog identity. Community posts,
Sage Advice pages, D&D Beyond pages, and other downloaded data are structured
input for classification and assertion generation only; they are not provenance
for shipped or materialized rules content.

The private scan list lives in the ignored file
`.references/qa/non_srd_authored_identities.txt`, one identity per line. Do not
commit that file or copy its entries into publishable source.

## Historical Recovery

The previous root-QNT assertion generator, generated artifact, and process docs
remain recoverable from git history if a future task needs to mine them for
examples. Do not restore them as active verification gates without first
rewiring them to package-local QNT authority.
