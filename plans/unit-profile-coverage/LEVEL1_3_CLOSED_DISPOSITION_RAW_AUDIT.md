# Level 1-3 Closed Disposition RAW Audit

Date: 2026-05-26

Task: L13UG-A13-LEVEL13-CLOSED-DISPOSITION-RAW-AUDIT

## Decision

One sampled `closed-runtime-detached-table-adjudication` closure overreaches:
`suggestion` has a battle-visible save-gated Charmed condition lifecycle that
should be split from its table/social command adjudication and promoted or
explicitly blocked by a concrete runtime follow-up.

The other sampled rows keep executable battle facts separate from table-owned
detection, perception, social, and spatial adjudication facts.

This audit checked the highest-risk closed rows because they contain mechanics
that are easy to mistake for promoted battle-runtime state: sensing hidden
things, observer-scoped knowledge, social control, and area membership.

## Source Artifacts Checked

- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-3-full-support.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Language Check

Checked local RAW for the sampled rows:

- Detect Evil and Good, Detect Magic, and Detect Poison and Disease:
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1407`,
  `:1422`, and `:1437`.
- Mind Spike:
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md:322`.
- Charm Person:
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md:692` and
  `.references/srd-5.2.1/Rules-Glossary.md:221`.
- Suggestion:
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:608`.
- Spike Growth:
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:480` and
  `.references/srd-5.2.1/Rules-Glossary.md:858`.

Checked `UBIQUITOUS_LANGUAGE.md` for the terms used in this audit:
`Spell Definition`, `Spell Invocation`, `Spell Effect`, `Concentration`,
`Saving Throw`, `Ability Check`, `Search`, `Perception`, `Invisible`,
`Hidden`, `Charmed`, `Movement`, `Difficult Terrain`, and `Area of Effect`.

## Sampled Closures

| Unit | Risk axis | Existing disposition | RAW evidence | Audit result |
| --- | --- | --- | --- | --- |
| `detect_magic` | Detection and knowledge | `closed-runtime-detached-table-adjudication`; closure kind `outside-runtime-presentation-exploration` | RAW senses magical effects within 30 feet, has a later Magic action to view visible auras and learn spell school, and includes material occlusion. The related Detect Evil and Good / Detect Poison and Disease rows use the same sensing-plus-occlusion shape. | Closure holds. The row is not merely missing a damage or condition reducer; it needs a detection owner for presence, visibility, aura/school disclosure, and occluding materials. Promoted battle runtime should not store generic magical-aura knowledge as parallel encounter state. |
| `mind_spike` | Perception, Hidden, Invisible, location knowledge | `profile-subset-supported` with deferred mechanics closed as `outside-runtime-presentation-exploration` | RAW has executable save damage and failed-save Concentration duration, then separately grants same-plane location knowledge, prevents the target becoming hidden from the caster, and denies Invisible-condition benefit only against that caster. | Closure holds. The supported subset owns Spell Invocation, target admission, Wisdom Saving Throw, Psychic damage, Spell Slot spend, Concentration, and cleanup. The deferred clause is observer-scoped knowledge and visibility benefit adjudication, not a global battle condition or duplicate location store. Selected-identity evidence remains present for the supported subset. |
| `charm_person` | Social disposition and Charmed split | `profile-subset-supported` with deferred mechanics closed as `social-knowledge-effect` | RAW applies Charmed on a failed Wisdom Saving Throw, ends on damage from caster or allies, makes the creature Friendly to the caster, and gives post-spell knowledge. The Charmed condition itself also includes Social Advantage. | Closure holds. The battle-visible Charmed condition, target type, hostile-target Advantage on the save, duration, damage ending, and slot-scaled targets are supported. Friendly attitude, social interaction Advantage, and post-spell knowledge are not represented as battle state and are correctly left to the social/knowledge owner. |
| `suggestion` | Social command and agency plus Charmed lifecycle | `closed-runtime-detached-table-adjudication`; closure kind `social-knowledge-effect` | RAW requires a heard and understood 25-word activity and table judgment for achievable/not-obviously-damaging command content. RAW also requires a Wisdom Saving Throw, failed-save Charmed condition for the duration, and ending when caster or allies deal damage. | Closure overreaches. The command content, hearing/understanding gate, target pursuit, and activity-completion ending remain table/social-owned, but the failed-save Charmed condition, Concentration duration, and caster/allies damage ending match the promoted Charm Person battle-visible lifecycle shape and need the follow-up below. |
| `spike_growth` | Spatial/perception recognition | `profile-subset-supported` with deferred Search/perception mechanics closed as `outside-runtime-presentation-exploration` | RAW makes the area Difficult Terrain and applies Piercing damage by movement distance. Separately, camouflaged terrain recognition depends on whether a creature saw the area when cast, a Search action before entry, and a Wisdom (Perception or Survival) result. | Closure holds. Runtime owns the caller-supplied area identity, Concentration, movement-cost and damage projection, and cleanup. The recognition clause is per-observer terrain knowledge driven by table visibility and Search facts; storing it beside the hazard would duplicate perception state. |

## Reviewer Loop

Round 1 findings:

- The detection rows are correctly closed rather than promoted. They require
  generic sensing, aura, school, creature-kind, poison/disease, Hallow, and
  occlusion knowledge owners; no sampled detection row has a narrower existing
  battle reducer that could consume those facts directly.
- Mind Spike is the highest selected-identity risk. The supported damage and
  Concentration subset has deterministic and selected-identity evidence, while
  the deferred location/Hidden/Invisible clause is observer-scoped perception
  state and remains outside replay.
- Charm Person and Suggestion both use Charmed. Charm Person already has a
  promoted battle-visible condition subset. Suggestion's command content and
  social adjudication remain runtime-detached, but its failed-save Charmed
  condition, Concentration duration, and caster/allies damage ending are an
  over-closed executable subset.
- Spike Growth's movement hazard support is real, and the recognition clause is
  not the same state as the active hazard. It depends on visibility at cast
  time, Search declaration, and an Ability Check result.

Round 2 findings:

- The Suggestion row needs a concrete executable follow-up for its Charmed
  lifecycle subset. That follow-up must use Surface shape, support-profile
  readers, typed procedure facts, and explicit runtime state rather than
  authored-identity dispatch.
- No sampled closure uses authored identity as a runtime dispatch shortcut.
- No sampled closure stores derivable or duplicate table knowledge in battle
  state.
- The existing closure vocabulary is domain-backed: detection knowledge,
  social/knowledge effects, and table/spatial-perception witnesses are distinct
  from Spell Invocation and Spell Effect state.

## Follow-Up Proposal

| Follow-up | Owner | Mechanic | Required output |
| --- | --- | --- | --- |
| `L13UG-FOLLOWUP-SUGGESTION-CHARMED-LIFECYCLE` | battle-runtime Spell Invocation and Charmed condition lifecycle, Surface support-profile admission, and focused Quint parity | Promote or explicitly block Suggestion's executable subset: Magic Action and level-2 Spell Slot spend, one visible creature target supplied by caller facts, Wisdom Saving Throw against the caster Spell Save DC, failed-save spell-owned Charmed condition for Concentration up to 8 hours, cleanup on Concentration or duration end, and cleanup when the caster or allies damage the target. Keep hearing/understanding, the suggested activity text, achievable/not-obviously-damaging judgment, target pursuit, and activity-completion ending runtime-detached under the table/social owner. | A `profile-subset-supported` or concrete blocked-follow-up Unit claim, deterministic admission/projection evidence, focused runtime tests, selected-identity evidence for the supported subset if promoted, and promoted Quint/runtime parity for the save-gated Charmed lifecycle without authored-identity dispatch. |

## Plan Impact

- Task 14: leave unchanged. Checker self-tests are still useful for aggregate
  gate behavior, but this audit does not require changing checker semantics.
- Tasks 15-18: leave unchanged. Their level-3 missing-Unit admissions are
  unaffected by these closed runtime-detached rows.
- Task 19: added as `L13UG-FOLLOWUP-SUGGESTION-CHARMED-LIFECYCLE`.
- Task 20: revised from closeout Task 19; it should consume the Suggestion
  follow-up result before closing the lane.
- Task 21: revised from recursive planning Task 20.

Required plan edits: applied in the lane plan.
