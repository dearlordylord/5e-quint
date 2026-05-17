# QMBT33 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT31 and QMBT32 closed the planned Savage Attacker and direct Hit Point
restoration slices. The generated matrix still reports 21/39 supported
executable Units, so the next batch should keep widening one narrow spell
boundary and keep feature-slice selection active.

Append:

- `QMBT34 - Promote Mass Cure Wounds Area Hit Point Restoration`
- `QMBT35 - Select Next SRD Feature Widening Slice After Savage Attacker`
- `QMBT36 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT31 promoted `feat_savage_attacker` as
  `unit-feature.weapon-damage-dice-roll-choice`, including deterministic
  admission/projection evidence and selected identity MBT evidence.
- QMBT32 promoted `cure_wounds` and `mass_healing_word` as
  `spell.hit-point-restoration`, including deterministic admission/projection
  evidence through production spell access and support projection.
- The current generated matrix reports 53 installed Units, 17 stable
  executable profiles, 21/39 supported executable Unit coverage, 21/21
  deterministic admission/projection coverage, and 10/21 selected identity MBT
  coverage.

## Source Check

Local RAW anchors checked for the next spell boundary:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`, `Mass Cure Wounds`:
  Action, 60 feet, a point-origin wave of healing energy, up to six creatures
  in a 30-foot-radius Sphere, `5d8 + spellcasting ability modifier`, plus
  `1d8` per slot level above 5.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Area of Effect`: areas have a
  point of origin, blocked straight lines are excluded, and unseen obstructed
  origin placement is adjusted.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Sphere`: a Sphere extends from
  its point of origin in all directions and includes the origin.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Hit Points` and `Healing`:
  healing restores current Hit Points but cannot exceed Hit Point maximum.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- Hit Points and Temporary Hit Points, to keep HP restoration distinct from
  temporary HP.
- Area of Effect and Sphere, to keep point-origin geometry separate from direct
  target-list selection.
- Spell Definition, Spell Access, Spell Invocation, Spell Effect, Casting Time,
  and Spell Slot via the spell ownership vocabulary used by QMBT28-QMBT32.
- Extra Attack, Unarmored Defense, Weapon Mastery, and Mastery Property, to
  keep QMBT35 feature candidates separated by domain boundary.

## Next-Batch Rationale

`mass_cure_wounds` is the narrow spell follow-on because QMBT32 already proved
direct Hit Point restoration semantics and explicitly left area-centered target
selection out of scope. This next slice should widen target selection from
direct creature lists to a point-origin Sphere without adding condition
removal, max-HP modification, heal-to-max allocation, or object-target
semantics.

The next feature slice is less settled. QMBT29 deferred several domain-distinct
candidates, and QMBT31 closed only the weapon damage dice choice profile.
QMBT35 should do a focused selection pass rather than smuggling a broad feature
family into the plan.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT33-QMBT36.
- `pnpm unit-profile-coverage:check` passed. Matrix docs and generated
  artifacts were not changed.
- reviewer loop round 1: selected `mass_cure_wounds` as the next spell widening
  because the only new executable boundary over QMBT32 is point-origin Sphere
  target selection.
- reviewer loop round 2: no important changes found after the next batch was
  narrowed to one spell implementation, one feature selection, and one
  recursive review.
- MBT not run: QMBT33 is planning-only and makes no promoted battle-runtime
  behavior change.
