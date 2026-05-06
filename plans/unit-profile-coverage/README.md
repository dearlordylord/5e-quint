# Unit Profile Coverage

This directory is the content/profile coverage layer for authored Surface Units.
It is intentionally separate from `plans/raw-coverage/`, which tracks coverage
of SRD rules text spans.

The Unit profile matrix answers which authored Units instantiate supported
mechanics profiles, which Units are explicitly unsupported or need widening, and
which QNT/runtime/verification owners cover each supported profile.

## Collection Boundaries

`srd-5.2.1` is the shipped SRD Surface Unit collection. Its records must carry
only SRD 5.2.1 provenance and Creative Commons SRD distribution policy.

`classic-2024-non-srd-mechanics` is the public renamed mechanics-only lane for
Classic 2024 mechanics that are not already covered by the SRD collection. SRD
5.2.1 is conceptually part of Classic, but it is stored separately because it
has clean SRD provenance and distribution terms. The combined Classic library is
a derived view:

```text
classic2024UnitLibrary =
  srd521UnitCollection
  + classic2024NonSrdMechanicsUnitCollection
```

The derived view is never authored directly.

## Claim Convention

Owner artifacts use a separate claim prefix from RAW coverage:

```text
<claim-prefix> <claim-kind> <profile-id> [<profile-id> ...]
```

where `<claim-prefix>` is `UNIT-PROFILE-COVERAGE:`.

Supported claim kinds are `qnt-owner`, `runtime-owner`,
`verification-owner:qnt-proof`, `verification-owner:focused-mbt`,
`verification-owner:runtime-test`, and `verification-owner:catalog-test`.

## Classic Non-SRD Authoring Lane

Classic non-SRD mechanics-only records may preserve exact mechanics facts:
level gates, prerequisites, action economy, resource cadence, dice, numbers,
conditions, durations, target shapes, and execution relationships.

They must not include protected expression: canonical names, descriptions,
flavor text, examples, rules prose, unique phrasing, table presentation,
artwork/lore labels, or avoidable copyrighted naming taxonomy. Human labels and
ids must use the stable mushroom/fungi synthetic namespace. The label is
decorative; matching and coverage use structured fields.

The checker rejects SRD provenance in the Classic non-SRD collection, duplicate
Unit ids across collections, missing fungi-themed synthetic labels, protected
expression fields, and near-canonical ids/labels from its deny list.

## Workflow

This matrix has two verification layers:

- **Procedure parity**: focused QMBT lanes prove structural QCORE profiles
  through production reducers. These are representative semantics tests for
  the profile, not a catalog loop over every authored Unit id.
- **Specific Unit parity**: Unit claims prove that each authored Unit id is
  classified into supported profiles or an explicit unsupported/widening
  disposition. Deterministic catalog/projection tests should cover all shipped
  Units; focused MBT should be added only for representative or high-risk Unit
  identities.

Run:

```sh
pnpm unit-profile-coverage:check
```

When intentionally changing claims or installed collection inventory, regenerate
the matrix and report with:

```sh
node scripts/unit-profile-coverage-check.cjs --write
```

New Unit authoring tasks must add or update `unit-claims.jsonl`. New QCORE work
that proves Unit-facing mechanics must cite profile ids. New QMBT work that
adds runtime parity must cite the same profile ids.
