# QMBT17 Classic Non-SRD Mechanics Intake Policy

Task: QMBT17

This policy defines how private PHB/XPHB mechanics pressure may influence the
public Unit profile matrix without importing private content, protected
expression, or private-source identity into shipped artifacts.

## Source Boundaries

SRD 5.2.1 remains the only rules-text provenance for shipped SRD Units. The
local SRD license text says SRD 5.2.1 is provided under CC-BY-4.0, so SRD
records must stay in the `srd-5.2.1` collection with SRD provenance and
Creative Commons SRD distribution.

Private PHB/XPHB material is not provenance for shipped records in this repo.
It is pressure: it can show that a mechanics profile, Surface widening, or
runtime procedure will matter, but it cannot donate names, labels, prose,
source tags, examples, table presentation, or identity-bearing taxonomy.

The only public collection for non-SRD Classic pressure is
`classic-2024-non-srd-mechanics`. Its records use
`classic-2024-mechanics-source-lane` provenance, synthetic fungi-themed ids and
labels, and mechanics-only structured fields.

## Intake States

Private-source pressure must enter the matrix through exactly one of these
states:

| State | Public artifact | Required evidence |
| --- | --- | --- |
| Public mechanics-only Unit | A `classic-2024-non-srd-mechanics` record with a synthetic id/label and no protected-expression fields. | Collection/provenance/expression checker pass; `unit-claims.jsonl` row; supported profile or explicit closure disposition. |
| Matrix gap | A generated or declared matrix row that names the missing profile shape without private-source identity. | Gap text must describe mechanics in project/SRD vocabulary, not canonical private names; future owner when known. |
| Unsupported profile | `claim.tag = "unsupported-profile"`. | Reason must name the unsupported mechanics boundary, not the private source identity. |
| Surface widening pressure | `claim.tag = "needs-surface-widening"` or generated `unsupported-widening-pressure`. | Issue must name the missing Surface/runtime shape; QMBT18 may choose one such slice for red/green implementation. |
| Needs assumption | `claim.tag = "needs-assumption"`. | Issue must identify the ambiguous rule or execution boundary; closure requires an `ASSUMPTIONS.md` id. |
| Closed by assumption | `claim.tag = "closed-by-assumption"`. | The assumption id is the closure evidence; no extra synthetic Unit is required. |

Do not create a second state by leaving optional profile lists empty. A Unit is
either mapped to supported profiles or closed by one explicit disposition.

## Allowed Mechanics Facts

Classic non-SRD mechanics-only Units may preserve execution facts needed by the
engine:

- level gates, prerequisites, and eligibility facts;
- activation timing, action economy, triggers, and target shape;
- resource cadence, use counts, recharge/reset boundary, and spend/refund
  relationships;
- dice expressions, numeric values, damage types, conditions, durations, and
  movement distances;
- structural relationships such as "this action grants that later response" or
  "this rider modifies that host procedure."

These facts are mechanics, not prose provenance. They still need normal profile
evidence before they count as covered.

## Prohibited Identity And Expression

Classic non-SRD records, matrix prose, report prose, ids, and labels must not
include:

- private-source names or abbreviations such as PHB/XPHB source markers;
- canonical private feature, spell, item, subclass, species, or taxonomy names;
- copied descriptions, flavor text, examples, rules prose, or table
  presentation;
- unique phrasing, artwork or lore labels, or avoidable protected naming
  taxonomy;
- provenance claiming SRD or private-source authorship for the public surrogate
  record.

The existing checker enforces the executable boundary by rejecting SRD
provenance inside the Classic non-SRD collection, missing fungi-themed synthetic
ids/labels, protected-expression fields, duplicate SRD mechanics, and
near-canonical id/label text including PHB/XPHB markers.

## Evidence Requirements

Supported Classic non-SRD Unit claims use the same evidence ladder as SRD Unit
claims:

1. `unit-claims.jsonl` maps the synthetic Unit id to stable profile ids.
2. Profile rows cite QNT owners when they claim executable semantics.
3. Completed runtime parity claims require focused MBT or runtime-test owners.
4. Deterministic admission/projection evidence proves the production catalog or
   support boundary admits the synthetic Unit when the Unit is executable.
5. Selected identity MBT is optional and reserved for representative or
   high-risk identities.

Unsupported, widening, and assumption dispositions are closure evidence, not
test omissions. They keep future work visible without pretending runtime parity
exists.

## QMBT18 Handoff

QMBT18 should select one unsupported or widening row based on mechanics pressure,
not private-source identity. The red/green slice should start from the profile
or Surface/runtime gap, then add public mechanics-only data only if that data can
pass the Classic non-SRD expression and provenance gates.
