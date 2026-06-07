# Wild Shape Stat Block Action Plan

Status: Phase 1 and Phase 2 inventory complete on
`codex/wild-shape-plan`. Phase 3 mechanic slices remain deferred follow-up
work.

Worktree: `/workspace/typescript/dnd-wild-shape-plan`

## Problem

Wild Shape is already partially promoted. The remaining work is not "implement
Wild Shape"; it is to remove the current battle-runtime brittleness around
known Beast form availability and unsupported Stat Block action shapes.

For the Druid level 2-3 tier, RAW says the character knows four Beast forms
with max CR 1/4 and no Fly Speed. Those four are selected character facts. The
implementation must not dispatch on the authored identity of any recommended
form. Wolf, Spider, Rat, and Riding Horse are examples of Surface shapes, not
runtime keys.

The current battle initialization gate rejects selected known forms unless all
selected form action sections are already in the supported subset. That makes
some RAW-valid selected forms impossible to bring into battle. The visible
examples are:

- attack with multiple on-hit damage components;
- attack with an authored prose rider, such as target Prone on hit;
- trait-derived attack-roll advantage, such as an ally-within-5-feet condition;
- non-Attack or special action sections.

There is also a valid catalog-availability state that must be represented:
the Druid has the Wild Shape feature/resource, but no eligible Beast form
records are loaded or selected. That does not make the character invalid and
must not invent default forms. It only means the assume-form action is
unavailable. Other consumers of the Wild Shape use-count resource can still be
valid if their own requirements are met.

## Ownership Shape

This should start as direct Codex work, not Ralph.

Reason: the first slice is an architecture split, not repeated mechanic
grinding. We need to separate three facts before parallel work is safe:

- the Druid owns a Wild Shape use-count resource;
- the character/sheet may or may not currently have selected known Beast form
  records available to a runtime boundary;
- each selected form has Surface action shapes, some admitted and some not.

After that split, Ralph can grind repeated vertical action-shape slices if the
inventory shows enough independent work. Codex should act as workflow
orchestrator only after the first slice proves the shape and the follow-on
tasks are mechanically parallel.

## Phase 1 - Codex Direct Slice

Status: complete in `fe06c6f12 Relax Wild Shape battle form availability`.

Goal: make the no-loaded-Beast case valid and scanner-visible, without
promoting any new Beast attack mechanics.

Tasks:

1. Re-read local RAW for Wild Shape and Stat Block action sections plus
   `UBIQUITOUS_LANGUAGE.md` Creature/Stat Block terms.
2. Audit current Character Sheet, Character Battle, Battle init, and act
   discovery behavior for missing/empty Wild Shape known-form records.
3. Change the battle boundary so a Druid with the Wild Shape resource but no
   available selected form records can enter battle and simply has no
   `assumeForm` Wild Shape acts.
4. Preserve typed failures where the caller supplies malformed, duplicate, or
   ineligible known-form records. Do not silently coerce invalid selected forms
   into "no forms".
5. Add focused tests for:
   - no Beast records available -> no assume-form acts, battle still starts;
   - malformed/ineligible supplied form remains a typed rejection;
   - selected valid forms still produce one assume-form act per selected form.
6. Update unit-profile/rules-kernel evidence only for this availability
   boundary. No QNT/MBT is required unless reducer behavior beyond act
   discovery changes.

Acceptance:

- No authored Beast id is used as runtime dispatch.
- Missing selected form records is distinct from invalid selected form records.
- No recommended-form fallback is introduced.
- Wild Shape resource state remains usable by other promoted consumers.

Completion notes:

- Character Sheet remains the owner of selected Wild Shape known-form ids.
- Character Sheet battle handoff now derives a battle-available selected-form
  subset from loaded Stat Block records. Missing selected records become
  unavailable to battle rather than invalid.
- Direct `CharacterBuild` and raw battle init still require an explicit
  available-form subset when Wild Shape support is present. Omitted input is
  rejected; explicit `[]` is the valid "no forms available to battle" state.
- Battle state stores the subset as `druidWildShapeAvailableForms`, not as the
  character's full Known Forms roster.
- Duplicate, ineligible, over-CR, forbidden Fly Speed, and missing projection
  facts remain typed rejection paths.
- Unsupported action and trait shapes are filtered out of battle availability;
  they do not make the whole battle invalid and do not execute unsupported
  mechanics.

## Phase 2 - Codex Inventory, Then Decide Ralph

Status: inventory helper complete in `fe06c6f12`; decision is to defer the
vertical mechanic slices to Phase 3.

Goal: classify selected-form action shapes by Surface structure.

Tasks:

1. Build a small inventory script or test helper that classifies eligible
   Druid level 2-3 Beast records by Surface action/trait shape.
2. Output shape categories, not reducer keys:
   - simple literal attack, single damage;
   - multiple fixed damage components on one hit;
   - attack hit rider requiring condition application;
   - trait-derived conditional attack-roll advantage;
   - action sections outside admitted attacks.
3. Use recommended forms only as sanity examples of categories, never as the
   category owner.
4. Decide whether the remaining inventory is small enough for Codex direct
   work or repetitive enough for Ralph lanes.

Acceptance:

- The inventory can be regenerated after content changes.
- It names Surface shapes and example record ids separately.
- It identifies which categories are already promoted, blocked, table-owned,
  or ready for a vertical tracer bullet.

Completion notes:

- Added a reusable Wild Shape action-surface inventory helper over eligible
  forms. The helper takes the Wild Shape support profile and applies the shared
  Beast/CR/Fly Speed eligibility predicate at the helper boundary.
- Inventory categories are Surface-shape categories. Example Stat Block ids are
  reported only as examples, not as runtime dispatch keys.
- The current inventory identifies pressure for multiple damage components,
  attack-hit riders, trait-derived attack-roll Advantage, non-Attack/special
  action sections, and prose-only traits.
- Trait-derived attack-roll Advantage is now part of unsupported admission
  filtering, so a simple attack with an unsupported Pack-Tactics-shaped trait is
  not silently admitted.

## Phase 3 - Vertical Mechanics

Status: deferred.

Each runnable mechanic slice must be a full tracer bullet:

- Surface shape/admission reader if needed;
- focused QNT witness or proof for the shape;
- TS runtime reducer/admission code reached from the real battle reducer;
- focused runtime tests;
- MBT only if the shape changes step/reducer parity rather than deterministic
  projection;
- unit-profile and rules-kernel evidence.

Likely slices, after Phase 2 confirms scope:

1. Multiple damage components on one Stat Block attack.
2. Trait-derived conditional attack-roll advantage.
3. Attack-hit condition rider.

## Recommended Execution Mode

- Phase 1: Codex direct.
- Phase 2: Codex direct, producing a decision.
- Phase 3: Ralph only if Phase 2 yields multiple independent, same-shaped
  tracer bullets. Otherwise Codex direct is cheaper and safer.

Codex workflow-orchestrator mode becomes useful only after Phase 2, if we have
at least two independent action-shape slices that can run in parallel without
editing the same reducer/proof files.
