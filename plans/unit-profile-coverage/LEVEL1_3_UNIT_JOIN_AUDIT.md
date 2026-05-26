# Level 1-3 Unit Rules-Kernel Join Audit

Task 11 audited the generated level 1-3 full-support report against the Unit
matrix and rules-kernel profile-obligation join. No runtime behavior, Surface
content, Unit claims, profile rows, or rules-kernel obligations changed.

## Inputs

- `plans/unit-profile-coverage/level1-3-full-support.json`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/rules-kernel-coverage/profile-obligations.jsonl`
- `plans/rules-kernel-coverage/obligations.jsonl`
- `plans/unit-profile-coverage/README.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Vocabulary Check

This task did not model or revise a D&D rule. It audited generated evidence
joins that are already owned by Unit claims, profiles, and rules-kernel
obligations. `UBIQUITOUS_LANGUAGE.md` was checked for the runtime vocabulary
used by the joined obligations, including Spell Invocation, Spell Effect, Magic
Action, Spell Slot, Reaction, D20 Roll, Attack Roll, Saving Throw, Ability
Check, Damage Type, Condition, Movement, Hit Points, and runtime/table ownership
language.

The join source boundary remains:

```text
authored Surface Unit
  -> Unit catalog/support admission
  -> supported mechanics profile
  -> rules-kernel semantic obligation
  -> QNT owner
  -> executable TS parity witness
```

`profile-obligations.jsonl` remains the only source for the
profile-to-obligation mapping; this audit does not duplicate that mapping into
another maintained data structure.

## Audit Result

The level 1-3 strict supported Unit set has no orphan reducer Unit.

| Check | Result |
| --- | ---: |
| Level 1-3 `supported-profile` Units | 121 |
| Level 1-3 supported Units in rules-kernel join denominator | 121 |
| Diff between those two Unit id sets | 0 |
| Joined profile records with non-covered status or no obligation | 0 |
| Distinct joined profile ids missing from `profile-obligations.jsonl` | 0 |
| Distinct joined obligation ids missing from `obligations.jsonl` | 0 |
| Joined obligations with non-covered status | 0 |

`level1-3-full-support.json` reports
`rulesKernelSupportedUnitJoin.metrics.rulesKernelSupportedUnitCoverage` as
121/121 (100%). The same scoped metric appears in
`LEVEL1_3_FULL_SUPPORT.md` as "Supported Unit rules-kernel chain" 121/121
(100%).

`unit-matrix.json` reports the wider all-matrix
`rulesKernelSupportedUnitCoverage` as 144/144 (100%). The difference between
144 and 121 is scope, not a missing join: the level 1-3 audit uses the strict
level 1-3 support denominator from `level1-3-full-support.json`.

## Frontier Rows

The 31 level 1-3 `profile-subset-supported` rows with executable mechanics are
not counted as supported Units for this strict full-support join. They remain
explicit frontier closures or blocked follow-up splits until promoted to full
`supported-profile` status. Those rows therefore do not create hidden
rules-kernel orphans in Task 11.

Current subset-supported frontier statuses:

| Status | Rows |
| --- | ---: |
| `blocked-follow-up-split` | 5 |
| `closed-character-fact-and-runtime-detached-split` | 1 |
| `closed-companion-control-boundary` | 1 |
| `closed-later-level-only` | 11 |
| `closed-outside-battle-runtime-boundary` | 4 |
| `closed-runtime-detached-table-adjudication` | 9 |

The blocked follow-up split rows remain owned by their existing generated
follow-up text in `LEVEL1_3_FULL_SUPPORT.md`; Task 11 found no additional
rules-kernel join follow-up.

## Review Loop

- Round 1, RAW/ubiquitous-language: no new rule model was introduced; existing
  Unit/profile/obligation owners retain RAW traceability.
- Round 1, architecture/connascence: the audit preserves
  `profile-obligations.jsonl` as the single profile-to-obligation source and
  derives all counts from generated artifacts.
- Round 1, code review: no executable code changed, and no unsupported authored
  identity dispatch or parallel data structure was added.
- Round 2, architecture/code review: rechecked the supported Unit set,
  profile-obligation membership, obligation membership, and covered statuses;
  no reasonable findings remained.

## Follow-Up Tasks

None. The supported Unit rules-kernel chain remains 100% for the level 1-3
strict support scope, with no orphan supported reducer Unit found.
