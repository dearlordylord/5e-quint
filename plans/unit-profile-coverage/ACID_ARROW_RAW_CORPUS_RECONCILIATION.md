# Acid Arrow RAW Corpus Reconciliation

Date: 2026-05-22

Ralph L3 morning Task 8 update: 2026-06-06

## Decision

The Acid Arrow RAW reconciliation remains blocked on owner input. Do not admit
`acid_arrow` into the installed Unit catalog, do not repair its Surface damage
shape, and do not promote delayed runtime support until the owner approves a
local SRD corpus correction or an `ASSUMPTIONS.md` entry for the damage
relationship.

Ralph Task 8 (`L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER`) closes by
recording this unresolved disposition as an explicit owner-decision blocker.
The follow-up split remains blocked; there is no owner-approved executable RAW
decision to feed Surface authoring or runtime.

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
Acid Arrow-specific conversion note. Checked `.references/srd/Spells/Acid
Arrow.md` and `.references/srd/Spells (Alt)/Spells A.md`; the archived local
SRD 5.1 corpus does contain immediate hit damage, later hit damage, miss damage,
and higher-slot scaling text. That archived text is useful evidence that the
active SRD 5.2.1 passage may be a local corpus regression, but it is not an
owner-approved SRD 5.2.1 correction or `ASSUMPTIONS.md` entry. The active
runtime-facing decision therefore remains unresolved.

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

## Ralph Blocker Row

- Blocker Type: owner-decision
- Blocker Detail: The owner must approve either a local SRD 5.2.1 corpus
  correction or an `ASSUMPTIONS.md` entry that answers the initial hit damage,
  later hit damage, miss damage derivation, and higher-slot scaling questions
  listed above.
- Blocking Follow-ups:
  `L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION`,
  `L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE`, and
  `L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT`.

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

**Changes:** A future Surface repair task may repair
`packages/surface/content/acid_arrow.dhall` and generated JSON to encode the
approved initial, miss, later, and higher-level damage facts. A future runtime
task may then promote delayed runtime support against the repaired Surface
shape.
```

## Plan Impact

- `L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER` can be marked `done`: it
  rechecked the local SRD 5.2.1 spell text, local conversion notes, archived
  local SRD corpus, `ASSUMPTIONS.md`, and ubiquitous-language terms, and found
  no owner-approved executable decision.
- `L3MWILD-09-RESIDUAL-LEDGER-CONSOLIDATION` can be unblocked after the decider
  records Task 8 as done, because Acid Arrow now has a non-stale blocker row
  rather than a stale dependency label.
- The Acid Arrow RAW reconciliation, Surface damage shape, and delayed runtime
  support follow-ups remain blocked on the owner decision above.

## Verification

- `pnpm unit-profile-coverage:check --write` passed and regenerated the
  task-claim report/matrix row. Unit profile coverage reported 275 Units and
  159 profiles.
- `pnpm unit-profile-coverage:check` passed.
- `git diff --check` passed.
- `pnpm quality` was run and failed in `@dnd/app` typecheck on existing app demo
  reaction/known-language API mismatches outside this task's touched files. No
  Acid Arrow, Unit profile coverage, or generated ledger check failed.
- MBT was not run because this reconciliation changes no runtime, Quint, or MBT
  bridge behavior.

## Reviewer Loop

- RAW traceability: checked the local Acid Arrow SRD passage, the local 5.2.1
  conversion guide, and the archived local SRD corpus.
- Ubiquitous language: checked only terms present in `UBIQUITOUS_LANGUAGE.md`.
- Architecture and connascence: no new state, duplicated data, runtime adapter,
  or authored-identity dispatch was added; the remaining `only` wording is the
  Acid Arrow miss-branch text and the exact owner question derived from it.
- Code-review pass: documentation/ledger-only change plus generated
  Unit-profile report and matrix refresh, no assertions, no throws, no tests
  that merely restate compile-time facts, and no runtime behavior changes.
