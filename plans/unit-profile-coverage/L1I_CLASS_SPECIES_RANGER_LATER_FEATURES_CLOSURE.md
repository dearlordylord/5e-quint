# L1I Class Species Ranger Later Feature Closure

Task 7 closes the two loop-owned Ranger later-feature records as explicit
unsupported-profile dispositions. No runtime behavior, Surface schema, Unit
catalog admission, Favored Enemy accounting, Hunter's Mark accounting, or
D-owned Weapon Mastery work changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Ranger.md:44` and
  `.references/srd-5.2.1/Classes/Ranger.md:122-128`: Tireless is acquired at
  Ranger level 10 and grants a Magic action Temporary Hit Points use pool plus
  Short Rest Exhaustion reduction.
- `.references/srd-5.2.1/Classes/Ranger.md:52` and
  `.references/srd-5.2.1/Classes/Ranger.md:144-146`: Feral Senses is acquired
  at Ranger level 18 and grants Blindsight with a range of 30 feet.
- `.references/srd-5.2.1/Rules-Glossary.md:130-132`: Blindsight lets a
  creature see within a specified range without physical sight and see
  Invisible creatures in that range unless they are behind Total Cover.
- `.references/srd-5.2.1/Rules-Glossary.md:446-456`: Exhaustion is a
  cumulative condition with levels, d20-test and Speed effects, and a Long
  Rest removal rule.
- `.references/srd-5.2.1/Rules-Glossary.md:674-685`: Long Rest includes
  Special Feature recharge and ordinary Exhaustion reduction.
- `.references/srd-5.2.1/Rules-Glossary.md:1042-1044` and
  `.references/srd-5.2.1/Playing-the-Game.md:788-808`: Temporary Hit Points
  buffer real Hit Points, do not stack, are not healing, and do not restore
  consciousness at 0 HP.
- `UBIQUITOUS_LANGUAGE.md:32`: Magic Action is the 2024 action used by
  features that require a Magic action.
- `UBIQUITOUS_LANGUAGE.md:40-51`: Pool, Spend, Grant, and rest-reset language
  define the resource side of Tireless.
- `UBIQUITOUS_LANGUAGE.md:72-79` and `UBIQUITOUS_LANGUAGE.md:348`:
  Temporary Hit Points are distinct from Hit Points and Healing.
- `UBIQUITOUS_LANGUAGE.md:97-111`, `UBIQUITOUS_LANGUAGE.md:354-355`, and
  `UBIQUITOUS_LANGUAGE.md:359-360`: Condition, sight/obscurement, Stat Block,
  and Character Sheet vocabulary keep Feral Senses and Tireless ownership
  separate from authored monster senses and current encounter state. Exhaustion
  mechanics are sourced from the SRD 5.2.1 Rules Glossary above.

## Surface Records Read

- `packages/surface/content/ranger_feral_senses.json`
- `packages/surface/content/ranger_tireless.json`

## Existing Owners Read

- `packages/surface/src/surface/unit-catalog.ts:104-107` and
  `packages/surface/src/surface/unit-catalog.ts:251-282`: the installed SRD
  Unit catalog includes `class_ranger`, `ranger_favored_enemy`,
  `ranger_weapon_mastery`, `ranger_extra_attack`, and `ranger_roving`, but not
  the two Task 7 records.
- `packages/battle-runtime/src/unit-feature-support.ts:1545-1585`: the
  promoted feature Temporary Hit Points action profile is the narrower
  Bonus Action Dash plus Proficiency Bonus Temporary Hit Points shape used by
  Adrenaline Rush, not Tireless's Magic action Wisdom-derived pool.
- `packages/battle-runtime/src/unit-feature-support.ts:2173-2195`: the current
  supported Unit feature profile parser has no class-feature sense grant
  profile and no Tireless-shaped Magic action Temporary Hit Points profile.
- `packages/battle-runtime/src/index.test.ts:13383-13395` and
  `packages/battle-runtime/src/index.test.ts:29039-29084`: a Tireless-shaped
  ability-modifier Magic action resource fixture is explicitly rejected unless
  a supported battle profile owns it.
- `packages/battle-runtime/src/battle-reducer.ts:953-962` and
  `packages/battle-runtime/src/battle-reducer/spells-active-effects.ts:374-389`:
  the promoted sight projection currently represents ordinary sight and
  Darkvision adjustment, not Blindsight granted by a class-feature Unit.

## Current Generated State

Before this task, the two Ranger records were authored SRD Surface records with
executable mechanics payloads, but they were absent from the installed Unit
catalog and had no `unit-claims.jsonl` disposition. `UNIT_REPORT.md` therefore
listed them as `unsupported-widening-pressure`.

`ranger_tireless.json` encodes the Magic action Temporary Hit Points half, but
the authored Dhall source explicitly notes that the Short Rest Exhaustion half
requires additional surface widening. A supported-profile claim for the JSON
shape alone would overstate RAW support for the feature.

## Decision

Add `unsupported-profile` Unit claims for:

- `ranger_feral_senses`
- `ranger_tireless`

`ranger_feral_senses` is a level-18 Blindsight sense grant. It should not be
admitted as a generic passive Unit profile until a sight/sense owner can project
class-feature sense grants into battle sight state without duplicating derived
visibility facts.

`ranger_tireless` is a level-10 two-part feature: a Magic action
Wisdom-derived Temporary Hit Points resource and a Short Rest Exhaustion
reduction. The existing Adrenaline Rush profile proves a different feature
shape, and the current Tireless Surface record does not represent the
rest-triggered Exhaustion clause as executable mechanics. A future owner should
either model both Tireless clauses together or split them at an explicit
executable boundary while preserving the single Ranger feature identity.

## Follow-Up Tasks

- No Loop I task should broaden Task 7 into runtime support. This task is a
  catalog-pressure closure only.
- If later-level Ranger battle support is expanded, add an atomic Tireless
  profile task that decides how the Magic action Temporary Hit Points resource
  composes with Short Rest Exhaustion recovery without duplicating current HP,
  Temporary Hit Points, or Exhaustion state across Character Sheet and battle
  runtime owners.
- If class-feature sense grants become a promoted profile family, include
  `ranger_feral_senses` in that sight/sense projection work. That work should
  share the same sense projection owner as any future species Darkvision or
  item/spell sense-grant support rather than create a Ranger-only adapter.

## Review Notes

- RAW and ubiquitous-language pass: the closure uses Magic Action, Temporary
  Hit Points, Short Rest, Long Rest, Blindsight, Invisible, Character Sheet,
  and Stat Block terminology from the local corpus, with Exhaustion mechanics
  traced directly to the SRD 5.2.1 Rules Glossary.
- Architecture/domain pass: no lower-layer workaround or duplicate state was
  added. The authored Surface facts remain the source records, with explicit
  unsupported Unit dispositions and future owners recorded at the profile
  boundary.
- Connascence pass: the repeated Unit ids are localized to `unit-claims.jsonl`,
  this decision artifact, and generated coverage output. The two claim reasons
  are intentionally distinct because Feral Senses is sight/sense projection
  pressure while Tireless combines feature resource, Temporary Hit Points, and
  rest-triggered Exhaustion pressure.
- Code-review pass: no executable code, casts, assertions, parsers, schemas, or
  runtime reducers changed.
- Round 1: confirmed the claims do not install either Ranger feature and do not
  touch `ranger_favored_enemy`, `hunters_mark`, or D-owned Weapon Mastery
  records.
- Round 2: rechecked generated report and matrix output after `--write`; the
  only task-owned generated changes are the two new unsupported-profile claim
  projections.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
