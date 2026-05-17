# L1K Protection Restoration Spell Candidate Intake

Date: 2026-05-17

## Decision

Task 4 is an intake decision, not a runtime promotion. Do not add Unit claims,
catalog admission, QNT behavior, battle reducer behavior, or MBT evidence from
this task.

The six seed Spell Definitions split into:

- existing scalar buff exact fit: none
- scalar buff widening needs: `aid`, `barkskin`
- condition removal needs: `lesser_restoration`, `protection_from_poison`
- damage and death prevention needs: `protection_from_energy`, `death_ward`

The existing `spell.scalar-buff` profile is a useful precedent, but it currently
admits Temporary Hit Points, Speed increases, and flat Armor Class bonuses. It
does not admit Hit Point Maximum increases, current Hit Point increases tied to
a maximum increase, or Armor Class floors. The existing
`spell.invocation-damage-reduction` profile is the Resistance cantrip's d4
reduction, not SRD damage-type Resistance.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: all six candidates are authored
  SRD spell records with `srd-candidate` catalog-admission disposition.
- `plans/unit-profile-coverage/unit-matrix.json`: all six candidates remain not
  in the installed Unit catalog.
- `plans/unit-profile-coverage/unit-claims.jsonl`: none of the six candidates
  has a supported or unsupported Unit claim.
- `plans/unit-profile-coverage/profiles.jsonl`: relevant existing promoted
  profiles include `spell.scalar-buff`, `spell.hit-point-restoration`,
  `spell.invocation-damage-reduction`,
  `spell.creature-type-protection-and-charm`, and
  `unit-feature.zero-hit-point-replacement`.
- `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts`: the
  scalar-buff admission gate accepts `grant_temp_hp`, `modify_speed`, and flat
  `modify_ac`; it does not accept `modify_max_hp`, `modify_ac_set_floor`,
  `grant_resistance`, `remove_condition`, `prevent_drop_to_0_hp`, or
  `negate_instant_death`.

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Aid, Barkskin, and Death
  Ward.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Lesser Restoration.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Protection from Energy
  and Protection from Poison.
- `.references/srd-5.2.1/Playing-the-Game.md`: Armor Class, Hit Points,
  Healing, Dropping to 0 Hit Points, Resistance and Vulnerability, Immunity,
  Damage Rolls, and Saving Throws and Damage.
- `.references/srd-5.2.1/Rules-Glossary.md`: Armor Class, Condition,
  Concentration, Hit Points, Poisoned, Resistance, Saving Throw, and Temporary
  Hit Points.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect,
  Concentration, Duration, Armor Class, Hit Points, Hit Point Maximum,
  Temporary Hit Points, Resistance, Immunity, Condition, Poisoned, Saving
  Throw, D20 Test, and Damage Type.

## Candidate Split

| Candidate | RAW protection/restoration shape | Classification | Decision |
| --- | --- | --- | --- |
| `aid` | Action, up to three creatures within 30 feet, 8-hour duration. Each target's Hit Point Maximum and current Hit Points increase by 5, with slot scaling by 5 per slot level above 2. | Scalar buff widening need | This is not direct Hit Point restoration and not Temporary Hit Points. Future admission needs a persistent maximum-HP Spell Effect that also raises current Hit Points and later expires cleanly without storing duplicate HP state. |
| `barkskin` | Bonus Action, touched willing creature, 1-hour duration. The target has Armor Class 17 if its AC is lower. | Scalar buff widening need | This is not a flat Armor Class bonus like Shield of Faith and not Mage Armor's base AC formula. Future admission should use the existing Armor Class calculation owner as an AC floor, so the floor composes with armor, shields, bonuses, and other base formulas without duplicating Armor Class state. |
| `lesser_restoration` | Bonus Action, touched creature, instantaneous. The caster ends one chosen condition on the target: Blinded, Deafened, Paralyzed, or Poisoned. | Condition removal need | This needs a direct condition-removal Spell Invocation profile. It should remove the chosen Condition and any execution-owned active effect that would otherwise reproject that same condition at one condition-owner boundary. |
| `protection_from_poison` | Action, touched creature, 1-hour duration. It ends Poisoned, grants Advantage on Saving Throws to avoid or end Poisoned, and grants Resistance to Poison damage. | Condition removal plus damage prevention need | This is a composite protection/restoration spell, not an exact Lesser Restoration or Protection from Energy fit. Future admission needs immediate Poisoned removal, a timed Poisoned-saving-throw roll-mode effect, and timed Poison damage Resistance through the normal damage pipeline. |
| `protection_from_energy` | Action, touched willing creature, Concentration up to 1 hour. The caster chooses Acid, Cold, Fire, Lightning, or Thunder; the target has Resistance to that damage type. | Damage prevention need | This needs an ongoing chosen damage-type Resistance Spell Effect. Do not route it through the Resistance cantrip profile, which reduces damage by 1d4 once per turn rather than granting SRD Resistance. |
| `death_ward` | Action, touched creature, 8-hour duration. The first time the target would drop to 0 Hit Points, it drops to 1 Hit Point and the spell ends; if an effect would kill it instantly without damage, that effect is negated and the spell ends. | Death prevention need | This should reuse the zero-Hit-Point lifecycle boundary rather than inventing a parallel death-prevention state. Exact support also needs the instant-death-without-damage negation branch, so it is broader than the current feature-only zero-HP replacement profile. |

## Structured Source Findings

The local SRD text is the authority for the decisions above. While checking the
structured Surface records, the following candidate-source gaps were found:

- `packages/surface/content/lesser_restoration.json` records Action casting,
  but SRD 5.2.1 says Lesser Restoration has Bonus Action casting time.
- `packages/surface/content/protection_from_poison.json` records Poisoned
  removal and Poison damage Resistance, but its mechanics omit Advantage on
  Saving Throws to avoid or end the Poisoned condition.
- `packages/surface/content/aid.json` records `modify_max_hp`; future admission
  must verify that this authored effect also makes the current Hit Point
  increase executable, since RAW increases both Hit Point Maximum and current
  Hit Points.

Do not add Unit claims for these candidates until the structured source facts
needed by the chosen runtime profile are executable.

## Follow-Up Shape

Recommended future slices, in increasing runtime scope:

1. Repair the structured source facts above before attempting admission for
   `lesser_restoration`, `protection_from_poison`, or `aid`.
2. Add a direct condition-removal Spell Invocation profile for
   `lesser_restoration`, with chosen-condition fills for Blinded, Deafened,
   Paralyzed, and Poisoned.
3. Add a timed damage-type Resistance Spell Effect profile for
   `protection_from_energy`; reuse the damage adjustment pipeline and keep the
   chosen damage type as one source fact.
4. Add `protection_from_poison` as a composite profile only after condition
   removal, timed Poisoned-saving-throw Advantage, and timed Poison damage
   Resistance can be represented together without duplicating Condition or
   Resistance state.
5. Add `barkskin` through an Armor Class floor effect in the Armor Class
   algebra owner, not as a flat Armor Class bonus or a base AC formula.
6. Add `aid` through a persistent Hit Point Maximum plus current Hit Point
   increase profile, including multi-target and slot scaling, with expiry
   behavior tied to the existing HP owner.
7. Add `death_ward` through the existing zero-Hit-Point lifecycle boundary plus
   a spell-owned instant-death-without-damage negation branch.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Split `aid` from direct healing because RAW raises Hit Point Maximum and
  current Hit Points for a duration; it is not `spell.hit-point-restoration`
  and not Temporary Hit Points.
- Split `barkskin` from the existing scalar-buff profile because RAW grants an
  Armor Class floor, not a flat Armor Class bonus.
- Split `protection_from_energy` from the Resistance cantrip profile because
  RAW grants damage-type Resistance, not a d4 damage reduction.
- Kept `protection_from_poison` composite because dropping its Saving Throw
  Advantage or its Resistance would hide authored mechanics.

Round 2 architecture and connascence pass:

- No checker-visible state was added. The candidate ids are repeated only as
  local planning boundaries; generated coverage artifacts remain the source of
  truth for catalog and claim state.
- The source-record findings are recorded as future admission blockers rather
  than patched into a partial runtime path in this intake task.
- Strong remaining coupling is local to the candidate table and follow-up list:
  if a candidate moves buckets, both sections must change together.

## Verification For This Intake

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required because this task changes only a planning artifact and does
not modify QNT, runtime behavior, catalog admission, Unit claims, or evidence.
