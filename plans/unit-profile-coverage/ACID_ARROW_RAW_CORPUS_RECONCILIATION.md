# Acid Arrow RAW Corpus Reconciliation

Date: 2026-05-22

## Decision

Task 22 is blocked on owner input. Do not admit `acid_arrow` into the installed
Unit catalog, do not repair its Surface damage shape, and do not promote delayed
runtime support until the owner approves a local SRD corpus correction or an
`ASSUMPTIONS.md` entry for the damage relationship.

This task does not add a modeling assumption itself. `ASSUMPTIONS.md` is an
owner-curated boundary, and the local SRD 5.2.1 passage is insufficient to
decide the executable damage relationship without inventing missing rule text.

## Local RAW Check

Checked `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Acid Arrow`.

The local passage has these executable facts:

- Level 2 Evocation spell for Wizard.
- Casting Time: Action.
- Range: 90 feet.
- Components: V, S, M (powdered rhubarb leaf).
- Duration: Instantaneous.
- Make a ranged spell attack against the target.
- The hit branch states 4d4 Acid damage at the end of the target's next turn.
- The miss branch refers to half as much of the initial damage only.
- The higher-level clause says both initial and later damage increase by 1d4
  for each spell slot level above 2.

The contradiction is at the damage timing boundary: the passage references both
initial and later damage, but the hit branch gives a single 4d4 damage amount
and places it at the end of the target's next turn. The local passage does not
define the missing initial hit damage or a separate later-damage amount.

Checked `.references/srd-5.2.1-conversion/07-spells.md`; it does not provide an
Acid Arrow-specific conversion note. Checked `.references/srd/`; no archived SRD
Acid Arrow passage is present in the local corpus.

## Ubiquitous Language Check

Checked `UBIQUITOUS_LANGUAGE.md` terms relevant to this task:

- Attack Roll.
- Spell Attack.
- Spell Invocation.
- Damage Type.
- Boundary Crossing.
- Using a Higher-Level Spell Slot.

The future executable model should use Spell Invocation for the concrete cast,
Attack Roll for the ranged spell attack outcome, Damage Type for Acid damage, and
Boundary Crossing for "the end of the target's next turn."

## Exact Owner Input Needed

The owner must approve one corpus or assumption decision that answers all of
these questions:

1. Does Acid Arrow deal initial hit damage before the end of the target's next
   turn?
2. If initial hit damage exists, what is its base amount and timing?
3. What damage, if any, happens at the end of the target's next turn on a hit,
   and what is its base amount?
4. On a miss, is the damage half of the initial damage only, and is that half
   derived from the slot-scaled initial damage or from the base slot-2 initial
   damage?
5. For slots above level 2, which damage amounts increase by 1d4 per slot level
   above 2?

Until those facts are approved, deriving immediate hit damage or scaled miss
damage from the contradictory prose would be an unapproved interpretation.

## Owner-Ready Patch Shape

If the owner chooses an `ASSUMPTIONS.md` entry rather than editing the local RAW
corpus, use this shape and fill the bracketed decisions:

```markdown
## A50: Acid Arrow local corpus damage relationship

**Assumption:** The local Acid Arrow passage is treated as having [initial hit
damage amount and timing], [later hit damage amount and timing], [miss damage
derivation], and [higher-level scaling rule].

**Rules basis:** `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Acid Arrow`
requires a ranged Spell Attack, names both "initial" and "later" damage in its
miss and higher-level clauses, but the hit branch omits an explicit initial
damage amount and does not separately define the later damage amount. This entry
is the owner-approved corpus reconciliation for that local contradiction.

**Changes:** Task 23 may repair `packages/surface/content/acid_arrow.dhall` and
generated JSON to encode the approved initial, miss, later, and higher-level
damage facts. Task 24 may then promote delayed runtime support against the
repaired Surface shape.
```

## Plan Impact

- Task 22 should be marked `blocked` unless the owner supplies the decision
  above in the decider pass.
- Task 23 remains blocked on Task 22 because Surface authoring cannot honestly
  encode immediate, miss, delayed, or slot-scaled damage facts without the owner
  decision.
- Task 24 remains blocked on Task 23 because runtime support must project from
  the repaired Surface shape rather than dispatch on Acid Arrow identity.

## Verification

- `pnpm unit-profile-coverage:check` passed: Unit profile coverage OK, 246
  Units and 130 profiles.
- `git diff --cached --check` passed in the integration worktree.
- MBT was not run because this reconciliation changes no runtime, Quint, or MBT
  bridge behavior.

## Reviewer Loop

- RAW traceability: checked the local Acid Arrow SRD passage, the local 5.2.1
  conversion guide, and the archived local SRD corpus.
- Ubiquitous language: checked only terms present in `UBIQUITOUS_LANGUAGE.md`.
- Architecture and connascence: no new state, duplicated data, runtime adapter,
  or authored-identity dispatch was added; the remaining `only` wording is the
  Acid Arrow miss-branch text and the exact owner question derived from it.
- Code-review pass: documentation-only change, no assertions, no throws, no
  tests that merely restate compile-time facts, and no generated artifact churn.
