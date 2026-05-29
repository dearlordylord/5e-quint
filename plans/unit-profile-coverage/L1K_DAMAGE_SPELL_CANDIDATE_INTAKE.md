# L1K Damage Spell Candidate Intake

Date: 2026-05-17

## Decision

Task 2 is an intake decision, not a runtime promotion. Do not add Unit claims,
catalog admission, QNT behavior, battle reducer behavior, or MBT evidence from
this task.

The seven seed Spell Definitions split into:

- existing damage profile fit: `blight`
- new damage profile need: `acid_arrow`, `scorching_ray`, `shatter`,
  `lightning_bolt`, `cone_of_cold`
- later expansion queue: `mind_spike`

The "existing damage profile fit" bucket means the damage procedure core fits a
promoted profile already present in `profiles.jsonl`. It does not mean a full
Spell Definition support claim is ready. Any future claim still needs
deterministic catalog/access/invocation evidence and explicit subset/deferred
mechanics where the SRD text contains non-damage clauses.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: all seven candidates are
  authored SRD spell records with `srd-candidate` catalog-admission disposition.
- `plans/unit-profile-coverage/unit-matrix.json`: all seven candidates remain
  not in the installed Unit catalog.
- `plans/unit-profile-coverage/unit-claims.jsonl`: none of the seven candidates
  has a supported or unsupported Unit claim.
- `plans/unit-profile-coverage/profiles.jsonl`: existing relevant promoted
  profiles are `spell.invocation-damage-save-or-attack`,
  `spell.invocation-independent-attack-sequence`, and
  `spell.invocation-chained-attack-damage`.
- `packages/battle-runtime/src/battle-reducer.ts` and
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts`:
  the promoted save-gated damage area boundary admits 5-foot point-origin
  Spheres and 15-foot self-origin Cones, so 10-foot Spheres and 60-foot Cones
  need area-boundary widening before admission.

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Acid Arrow, Blight,
  Cone of Cold.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Lightning Bolt.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Mind Spike.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Scorching Ray, Shatter.
- `.references/srd-5.2.1/Rules-Glossary.md`: Area of Effect, Cone, Line,
  Sphere, Damage Roll, Damage Types, Saving Throw.
- `.references/srd-5.2.1/Playing-the-Game.md`: Saving Throws, Attack Rolls,
  Damage Rolls, Saving Throws and Damage.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect,
  Concentration, Area of Effect, Attack Roll, Saving Throw, Damage Roll,
  Damage Type, Hit Points, Condition.

## Candidate Split

| Candidate | RAW damage shape | Classification | Decision |
| --- | --- | --- | --- |
| `cone_of_cold` | Action, Self, 60-foot Cone, Constitution Saving Throw, `8d8` Cold damage, half damage on success, slot scaling. A creature killed by the spell becomes a frozen statue until it thaws. | New profile need | The save-for-half damage procedure resembles `spell.invocation-damage-save-or-attack`, but the promoted self-origin Cone boundary is fixed at 15 feet. Cone of Cold requires a 60-foot self-origin Cone area witness or generalized Cone boundary before admission. Future admission should also defer the frozen-statue death aftermath explicitly or route it to a corpse/object-state owner. |
| `blight` | Action, one visible creature within 30 feet, Constitution Saving Throw, `8d8` Necrotic damage, half damage on success, slot scaling. Plant creatures automatically fail; nonmagical noncreature plants wither and die instead of saving. | Existing damage profile fit | The ordinary creature damage procedure fits `spell.invocation-damage-save-or-attack` through the single-target save-for-half shape. Future admission must not claim exact full support unless Plant auto-fail and noncreature plant targeting are either modeled or explicitly deferred as a subset. |
| `acid_arrow` | Action, ranged spell attack, Acid damage at the end of the target's next turn on hit. The local passage also refers to initial damage on miss and to both initial and later damage scaling, but it never defines initial hit damage. | RAW corpus blocker before profile work | Keep Acid Arrow out of admission until the local RAW contradiction is corrected or resolved by an owner-approved `ASSUMPTIONS.md` entry. After that, model the approved delayed target-end-turn damage lifecycle plus approved hit/miss damage and slot scaling. |
| `scorching_ray` | Action, three independent ranged spell attacks at one target or several, `2d6` Fire per hit, plus one ray per slot level above 2. | Supported profile fit | `spell.invocation-independent-attack-sequence` now admits Scorching Ray through prepared Spell Slot access, slot-scaled independent ray count, repeated or split creature-or-object ray targets, and Fire damage. |
| `shatter` | Action, point-origin 10-foot-radius Sphere, Constitution Saving Throw, `3d8` Thunder damage, half damage on success, slot scaling. Constructs have Disadvantage on the save; nonmagical unworn/un-carried objects in the area also take the damage. | New profile need | The creature damage core resembles a point-origin Sphere save-for-half shape, but the promoted point-origin Sphere boundary is fixed at 5 feet. Exact support also needs a 10-foot Sphere area witness, creature-type save roll mode, and area object damage. Do not claim exact support by dropping those clauses. |
| `lightning_bolt` | Action, Self, 100-foot by 5-foot Line, Dexterity Saving Throw, `8d6` Lightning damage, half damage on success, slot scaling. | New profile need | The promoted save-gated damage profile admits point-origin Spheres/Cubes and self-origin Cones/Cubes, but no self-origin Line target-set boundary. Add a Line area witness before admitting this Spell Definition. |
| `mind_spike` | Action, one visible creature within 120 feet, Wisdom Saving Throw, `3d8` Psychic damage, half damage on success, slot scaling. On a failed save, Concentration grants location knowledge, prevents the target from becoming hidden from the caster, and denies Invisible benefits against the caster while on the same plane. | Later expansion queue | The damage core is a single-target save-for-half fit, but the failed-save Concentration effect is detection/visibility state, not a damage profile. Route this to a detection/visibility follow-up or admit only a documented damage subset after the decider approves that loss of executable scope. |

## Follow-Up Shape

Recommended future slices, in increasing runtime scope:

1. Admit `blight` through the existing single-target save-damage profile only
   if Plant auto-fail and noncreature plant targeting are made executable or
   recorded as subset deferrals.
2. Add a 60-foot self-origin Cone area boundary for `cone_of_cold`; keep
   table-owned area membership and Total Cover blocking as caller-supplied
   facts, and explicitly defer frozen-statue death aftermath if no
   corpse/object-state owner exists.
3. Add a self-origin Line area boundary for `lightning_bolt`; keep table-owned
   area membership and Total Cover blocking as caller-supplied facts.
4. Add a 10-foot point-origin Sphere area boundary, area object damage, and
   creature-type save roll-mode profile before claiming exact `shatter`
   support.
5. Reconcile the local Acid Arrow RAW corpus before adding any delayed
   attack-damage lifecycle. Do not infer initial hit damage or scaled
   half-on-miss damage until the corpus or `ASSUMPTIONS.md` explicitly resolves
   the initial/later damage relationship.
6. Route `mind_spike` to a detection/visibility effect owner before full
   support; do not hide its Concentration effect behind a pure damage claim.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Split `mind_spike` out of the damage promotion path because its durable
  failed-save effect is a Spell Effect with Concentration, location knowledge,
  hidden-state interaction, and Invisible-benefit denial.
- Kept `shatter` out of the existing-fit bucket because the Construct
  Disadvantage and object-damage clauses are executable SRD mechanics, not
  flavor.
- Split Cone of Cold's frozen-statue death aftermath from its save-damage
  procedure before the area-boundary check below.

Round 2 architecture and connascence pass:

- No checker-visible state was added. The candidate ids are repeated only as
  local planning boundaries; generated coverage artifacts remain the source of
  truth for catalog and claim state.
- Existing profile ids are cited from `profiles.jsonl`; this artifact does not
  create parallel support metadata or duplicate runtime gates.
- Strong remaining coupling is local to the follow-up list: if a candidate moves
  buckets, the candidate table and follow-up list must change together.

Round 3 reviewer-feedback pass:

- Moved `cone_of_cold` from existing damage profile fit to new area-boundary
  need because RAW uses a 60-foot self-origin Cone while the promoted
  save-gated damage boundary admits 15-foot self-origin Cones.
- Added Shatter's 10-foot point-origin Sphere boundary need because the
  promoted save-gated damage boundary admits 5-foot point-origin Spheres.

## Verification For This Intake

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required because this task changes only a planning artifact and does
not modify QNT, runtime behavior, catalog admission, Unit claims, or evidence.
