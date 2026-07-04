# L6 Ultra Golden MCP Vertical Decision

Date: 2026-07-04

## Decision

Implement the level-6 MCP ultra-golden scenario as:

`create-level-six-rogue-expertise-and-steady-aim-battle-handoff`

The scenario creates a supported SRD Rogue 6 Character Sheet, selects four
Rogue Expertise skill choices through the existing creation holes, persists the
finalized character, starts a battle from that same character, and resolves the
already-supported Rogue Steady Aim battle act.

This is the smallest honest level-6 MCP vertical in the current stack because:

- Character Creation currently admits `class_rogue` level 6 in
  `SUPPORTED_PROGRESSIONS`.
- `rogue_expertise` has current character-creation owner evidence for both the
  level-1 two-choice grant and the level-6 four-choice projection.
- `list_characters` returns the durable Character Sheet `build` directly, so the
  selected Expertise facts remain visible without adding duplicate MCP state.
- `rogue_steady_aim` is a supported Rogue battle owner and has MCP-visible battle
  projections after handoff: the act is discoverable, has no initial holes,
  spends the Bonus Action, grants next-attack Advantage internally, and projects
  Speed 0 in the snapshot.

The selected unit identity for the level-6 row is `rogue_expertise`. The selected
battle handoff act is `rogue_steady_aim`, inherited by the same Rogue 6 build
from the SRD Rogue class table at level 3.

## RAW And Vocabulary Check

RAW anchors:

- `.references/srd-5.2.1/Classes/Rogue.md:36-41` lists Rogue levels 1-6,
  including Expertise at level 1, Steady Aim at level 3, and Expertise again at
  level 6.
- `.references/srd-5.2.1/Classes/Rogue.md:57-61` says Rogue Expertise grants
  Expertise in two skill proficiencies at level 1 and two more skill
  proficiencies at Rogue level 6.
- `.references/srd-5.2.1/Classes/Rogue.md:89-91` says Steady Aim is a Bonus
  Action, gives Advantage on the next attack roll on the current turn, requires
  no prior movement during the turn, and sets Speed to 0 until the end of the
  current turn.

Vocabulary anchors:

- `UBIQUITOUS_LANGUAGE.md:57-59` defines Expertise as a Proficiency Level that
  doubles the Proficiency Bonus for the relevant check.
- `UBIQUITOUS_LANGUAGE.md:197-198` separates Speed, the creature capacity, from
  Movement, the act of spending distance.
- `UBIQUITOUS_LANGUAGE.md:331-332` and `UBIQUITOUS_LANGUAGE.md:370-371`
  separate monster Stat Blocks from PC Character Sheets while allowing both to
  produce creature-level combat statistics for battle.

## Current Owner Boundaries

Creation and sheet owners:

- `packages/character-creation-runtime/src/support-gates.ts:184-201` includes
  `supportedSameClassProgression(SRD_ROGUE_CLASS_UNIT_ID, 6)`.
- `packages/surface/content/class_rogue.json:10-42` grants `rogue_expertise` at
  level 1 and `rogue_steady_aim` at level 3 for Rogue builds.
- `plans/unit-profile-coverage/unit-claims.jsonl` records the
  `character-creation.skill-expertise-choice` supported profile for
  `rogue_expertise`.
- `packages/character-creation-runtime/src/rogue-expertise-level6.test.ts:49-78`
  proves production support admits Rogue 6, discovers four selected
  `rogue_expertise` skills, finalizes, and projects them as CharacterBuild
  Expertise.
- `packages/character-creation-runtime/src/finalization.ts:1038-1102` stores
  finalized proficiency choices on the `CharacterBuild`, and
  `packages/character-creation-runtime/src/finalization.ts:3604-3634` projects
  valid Expertise selections as `skill_expertise` proficiency-choice subjects.
- `packages/character-creation-runtime/src/rogue-expertise-selected-identity.mbt.test.ts:176-190`
  records selected-identity MBT replay for both level-1 and level-6 Rogue
  Expertise.
- `packages/mcp/src/character-session-rows.ts:53-62` returns durable character
  rows with the finalized `build`, hit points, hit dice, resources, and related
  Character Sheet projections.

Battle handoff owners:

- `packages/battle-runtime/src/battle-runtime-class-action-features.test.ts:488-545`
  proves `rogue_steady_aim` discovery and resolution: label `Steady Aim`, no
  initial holes, Bonus Action spent, Speed 0 in the snapshot, and next-attack
  Advantage tracked as a runtime effect.
- `packages/battle-runtime/src/rogue-steady-aim.mbt.test.ts:1-65` records the
  focused MBT owner and selected-identity replay for `rogue_steady_aim`.

No new state is needed for the decision. The MCP scenario should observe the
existing finalized `build` through `list_characters` and the existing battle
snapshot through `read_battle_state` / `resolve_battle_act`.

## Scenario Shape

1. Call `describe_mcp_workflow` and assert the workflow exposes character
   creation, character listing, battle start/read, battle act discovery, and
   battle act resolution.
2. Call `create_character_draft`.
3. Fill the returned `draft.progression.initial` hole with the supported Rogue 6
   progression option:
   `11:class_rogue|11:class_rogue|11:class_rogue|11:class_rogue|11:class_rogue|11:class_rogue:level_6:fixed_hp_gain`.
4. Fill the remaining returned creation holes with SRD-supported options only.
   The test should use returned hole IDs and option IDs rather than maintaining a
   parallel choice registry. The required Expertise assertion is that the
   `rogue_expertise` class-feature proficiency choice produces four distinct
   `skill_expertise` selections, all over owned skill proficiencies.
5. Call `finalize_character` and assert finalization is `ready`.
6. Call `list_characters` and assert the finalized character row is `available`,
   carries the same `characterId`, includes the finalized `build`, and includes
   four `build.proficiencyChoices` entries with `kind: "skill_expertise"`.
7. Call `start_battle` with that `characterId` and a supported SRD stat-block
   opponent.
8. Call `read_battle_state` and assert the character combatant origin references
   the same `characterId` and appears in turn order.
9. Call `discover_battle_acts` and find the `rogue_steady_aim` unit-feature act
   labeled `Steady Aim` with no initial holes.
10. Call `resolve_battle_act` for Steady Aim with no fills.
11. Assert the resolved battle snapshot has `turn.bonusActionAvailable === false`
    and the Rogue combatant movement projection has `speedFeet: 0` and
    `remainingFeet: 0`.

Expertise is intentionally asserted at the Character Sheet boundary, not as a
new battle effect. The battle portion proves durable Character Sheet to battle
handoff for the same level-6 Rogue and exercises an existing Rogue battle
procedure without inventing runtime semantics for Expertise.

## Alternatives Rejected

### `ranger_roving`

Rejected for this MCP vertical despite having strong battle-runtime evidence.
`ranger_roving` is the preferred pure battle projection candidate because it has
current `unit-feature.passive-speed-kind-grants` evidence and visible movement
snapshot projections. However, the current MCP Character Creation support does
not yet admit a Ranger 6 Character Sheet:

- `packages/character-creation-runtime/src/support-gates.ts:184-201` includes
  Ranger level 2 and all classes at level 3, but not
  `supportedSameClassProgression(SRD_RANGER_CLASS_UNIT_ID, 6)`.
- `packages/surface/content/class_ranger.json:10-37` explicitly describes
  Ranger creation and level 1-5 progression facts and grants through level 5
  Extra Attack, but does not grant level 6 Roving.

Choosing Roving now would require a new character-creation/sheet prerequisite
before Task 33. That is future work, not the smallest current executable MCP
vertical.

### `rogue_expertise` Without Battle Handoff

Rejected as incomplete. Rogue Expertise alone proves a level-6 Character Sheet
projection, but Task 32 requires a vertical that includes battle handoff. Pairing
it with `rogue_steady_aim` keeps the battle portion within already-supported SRD
Rogue semantics.

### Future Owner Closure

Rejected. The decision must use already-supported owners and evidence, not a
scenario that depends on future catalog, sheet, or battle owner work.

## Verification Notes

Task 32 changes only this planning artifact. Appropriate verification is:

- Re-read the Rogue RAW and vocabulary anchors listed above.
- Confirm the selected path does not add duplicated state or authored-identity
  runtime dispatch.
- Run `git diff --check`.

Broad `pnpm quality` is not necessary for this documentation-only decision file.
Downstream implementation tasks should run their focused MCP acceptance tests and
then the plan-specified verification lane for their code changes.

## Reviewer Loop Convergence

Round 1 findings:

- `ranger_roving` has the cleanest visible battle projection, but current MCP
  Character Creation cannot create a Ranger 6 sheet. Rejected for this task and
  documented as future work.
- `rogue_expertise` does not itself define a battle effect. Resolved by keeping
  Expertise at the Character Sheet boundary and using `rogue_steady_aim` only as
  the supported battle handoff procedure for the same Rogue 6 character.

Round 2 findings:

- No additional reasonable findings. The scenario uses SRD authored identities
  only at catalog/selection boundaries and does not require new projections,
  duplicated state, or unsupported runtime behavior.

## Plan Impact

Status: applied

Affected tasks:

- Task 33 (`L6UG-MCP-02-LEVEL6-SHEET-SCENARIO`): unblocked by this decision;
  implement the sheet creation/finalization portion of
  `create-level-six-rogue-expertise-and-steady-aim-battle-handoff`.
- Task 34 (`L6UG-MCP-03-LEVEL6-BATTLE-HANDOFF`): remains blocked on Task 33;
  use this decision once the Rogue 6 sheet helper lands.
- Task 35 (`L6UG-MCP-04-LEVEL6-SCENARIO-REGISTRY`): left unchanged; register the
  completed level-6 scenario after Task 34 lands.
- Task 36 (`L6UG-MCP-05-LEVEL16-SCENARIO-EVIDENCE`): left unchanged; close
  evidence after Task 35 lands.

Observations:

- Ranger 6 Roving remains the strongest future movement-focused vertical, but it
  needs Ranger 6 Character Creation/Character Sheet support before it can be an
  MCP ultra-golden candidate.

Required plan edits:

- Mark Task 32 done.
- Move Task 33 to `ready-for-research` with the selected Rogue 6 Expertise sheet
  target.
- Leave Task 34 blocked on Task 33, using the selected Steady Aim battle handoff
  path after the sheet helper lands.
