# Ralph L5 Extension and L6 Horizontal Slice

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5UG-PRE-01-L5-FULL-QUEUE-CLOSED",
      "status": "done",
      "title": "Verify the L5 full SRD queue is closed"
    },
    {
      "number": 2,
      "id": "L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING",
      "status": "done",
      "title": "Add level-1-5 support report plumbing"
    },
    {
      "number": 3,
      "id": "L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE",
      "status": "done",
      "title": "Wire level-1-5 into the ultra-golden aggregate"
    },
    {
      "number": 4,
      "id": "L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION",
      "status": "done",
      "title": "Reconcile level-1-5 non-MCP ultra-golden layers"
    },
    {
      "number": 38,
      "id": "L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING",
      "status": "done",
      "title": "Resolve level-1-5 open spell-effect accounting rows"
    },
    {
      "number": 39,
      "id": "L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS",
      "status": "done",
      "title": "Resolve level-1-5 later-level residual accounting rows"
    },
    {
      "number": 40,
      "id": "L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES",
      "status": "done",
      "title": "Resolve level-1-5 selected-identity replay gaps"
    },
    {
      "number": 41,
      "id": "L3-FOLLOWUP-BLINK-PLANAR-PHASE-LIFECYCLE",
      "status": "future-follow-up",
      "title": "Promote Blink planar phase lifecycle"
    },
    {
      "number": 42,
      "id": "L3-FOLLOWUP-CONJURE-ANIMALS-PACK-EFFECT",
      "status": "future-follow-up",
      "title": "Promote Conjure Animals pack effect"
    },
    {
      "number": 43,
      "id": "L3-FOLLOWUP-MAGIC-CIRCLE-WARDED-AREA",
      "status": "future-follow-up",
      "title": "Promote Magic Circle warded area"
    },
    {
      "number": 44,
      "id": "L3-FOLLOWUP-MELD-INTO-STONE-MERGED-STATE",
      "status": "future-follow-up",
      "title": "Promote Meld into Stone merged state"
    },
    {
      "number": 45,
      "id": "L12G-FOLLOWUP-RANGER-FAVORED-ENEMY-FREE-CAST-SCALING",
      "status": "future-follow-up",
      "title": "Promote Ranger Favored Enemy free-cast scaling"
    },
    {
      "number": 46,
      "id": "L12G-FOLLOWUP-WIZARD-EVOCATION-SAVANT-NEW-SLOT-LEVEL",
      "status": "future-follow-up",
      "title": "Promote Wizard Evocation Savant new Spell Slot level grant"
    },
    {
      "number": 47,
      "id": "L6-FOLLOWUP-REPEATED-ASI-GRANT-OCCURRENCE",
      "status": "future-follow-up",
      "title": "Promote repeated Ability Score Improvement grant occurrences"
    },
    {
      "number": 48,
      "id": "L6-FOLLOWUP-BARBARIAN-MINDLESS-RAGE-CONDITION-IMMUNITY",
      "status": "future-follow-up",
      "title": "Promote Barbarian Mindless Rage condition immunity"
    },
    {
      "number": 49,
      "id": "L6-FOLLOWUP-BARD-MAGICAL-DISCOVERIES-SPELL-ACCESS",
      "status": "future-follow-up",
      "title": "Promote Bard Magical Discoveries spell-access selection"
    },
    {
      "number": 50,
      "id": "L6-FOLLOWUP-CLERIC-BLESSED-HEALER-SPELL-HEALING-RIDER",
      "status": "future-follow-up",
      "title": "Promote Cleric Blessed Healer spell-healing rider"
    },
    {
      "number": 51,
      "id": "L6-FOLLOWUP-DRUID-NATURAL-RECOVERY-REST-FEATURE",
      "status": "future-follow-up",
      "title": "Promote Druid Natural Recovery rest feature"
    },
    {
      "number": 52,
      "id": "L6-FOLLOWUP-MONK-EMPOWERED-STRIKES-DAMAGE-TYPE",
      "status": "future-follow-up",
      "title": "Promote Monk Empowered Strikes damage-type choice"
    },
    {
      "number": 53,
      "id": "L6-FOLLOWUP-MONK-WHOLENESS-OF-BODY-SELF-HEALING",
      "status": "future-follow-up",
      "title": "Promote Monk Wholeness of Body feature-resource self-healing"
    },
    {
      "number": 54,
      "id": "L6-FOLLOWUP-PALADIN-AURA-OF-PROTECTION-SAVE-BONUS",
      "status": "future-follow-up",
      "title": "Promote Paladin Aura of Protection passive aura and Saving Throw modifier"
    },
    {
      "number": 55,
      "id": "L6-FOLLOWUP-SORCERER-ELEMENTAL-AFFINITY-DAMAGE",
      "status": "future-follow-up",
      "title": "Promote Sorcerer Elemental Affinity damage affinity"
    },
    {
      "number": 56,
      "id": "L6-FOLLOWUP-WARLOCK-DARK-ONES-OWN-LUCK-D20-MODIFIER",
      "status": "future-follow-up",
      "title": "Promote Warlock Dark One's Own Luck Ability Check and Saving Throw d10 modifier"
    },
    {
      "number": 57,
      "id": "L6-FOLLOWUP-WIZARD-SCULPT-SPELLS-SAVE-DAMAGE-EXEMPTION",
      "status": "future-follow-up",
      "title": "Promote Wizard Sculpt Spells selected area spell save-damage exemption"
    },
    {
      "number": 5,
      "id": "L5UG-MCP-01-LEVEL5-VERTICAL-DECISION",
      "status": "done",
      "title": "Choose the level-5 MCP vertical scenario"
    },
    {
      "number": 6,
      "id": "L5UG-MCP-02-LEVEL5-SHEET-SCENARIO",
      "status": "done",
      "title": "Implement level-5 MCP creation and sheet scenario coverage"
    },
    {
      "number": 7,
      "id": "L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF",
      "status": "done",
      "title": "Extend the level-5 MCP scenario through battle handoff"
    },
    {
      "number": 8,
      "id": "L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY",
      "status": "done",
      "title": "Register the level-5 MCP scenario in acceptance coverage"
    },
    {
      "number": 9,
      "id": "L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE",
      "status": "done",
      "title": "Admit level-1-5 MCP scenario evidence"
    },
    {
      "number": 10,
      "id": "L5UG-FINAL-01-ULTRA-GOLDEN-REFRESH",
      "status": "done",
      "title": "Refresh and verify the level-1-5 ultra-golden gate"
    },
    {
      "number": 11,
      "id": "L6FULL-PRE-01-L5-QUEUES-CLOSED",
      "status": "done",
      "title": "Verify L5 full and L5 ultra-golden queues are closed"
    },
    {
      "number": 12,
      "id": "L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY",
      "status": "done",
      "title": "Verify level-6 scope and inventory baseline"
    },
    {
      "number": 13,
      "id": "L6FULL-SEED-01-RANGER-ROVING",
      "status": "done",
      "title": "Verify existing Ranger Roving level-6 support evidence"
    },
    {
      "number": 14,
      "id": "L6FULL-SEED-02-ROGUE-EXPERTISE",
      "status": "done",
      "title": "Verify existing Rogue Expertise level-6 support evidence"
    },
    {
      "number": 15,
      "id": "L6FULL-CLOSE-01-LEVEL6-CLASS-TABLES",
      "status": "done",
      "title": "Explicitly close the twelve level-6 class-table summary rows"
    },
    {
      "number": 16,
      "id": "L6FULL-ASI-01-FIGHTER-ASI-L6",
      "status": "done",
      "title": "Admit or close Fighter level-6 Ability Score Improvement"
    },
    {
      "number": 17,
      "id": "L6FULL-OWN-01-BARBARIAN-MINDLESS-RAGE",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Barbarian Mindless Rage"
    },
    {
      "number": 18,
      "id": "L6FULL-OWN-02-BARD-MAGICAL-DISCOVERIES",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Bard Magical Discoveries"
    },
    {
      "number": 19,
      "id": "L6FULL-OWN-03-CLERIC-BLESSED-HEALER",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Cleric Blessed Healer"
    },
    {
      "number": 20,
      "id": "L6FULL-OWN-04-DRUID-NATURAL-RECOVERY",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Druid Natural Recovery"
    },
    {
      "number": 21,
      "id": "L6FULL-OWN-05-MONK-EMPOWERED-STRIKES",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Monk Empowered Strikes"
    },
    {
      "number": 22,
      "id": "L6FULL-OWN-06-MONK-WHOLENESS-OF-BODY",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Monk Wholeness of Body"
    },
    {
      "number": 23,
      "id": "L6FULL-OWN-07-PALADIN-AURA-OF-PROTECTION",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Paladin Aura of Protection"
    },
    {
      "number": 24,
      "id": "L6FULL-OWN-08-SORCERER-ELEMENTAL-AFFINITY",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Sorcerer Elemental Affinity"
    },
    {
      "number": 25,
      "id": "L6FULL-OWN-09-WARLOCK-DARK-ONES-OWN-LUCK",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Warlock Dark One's Own Luck"
    },
    {
      "number": 26,
      "id": "L6FULL-OWN-10-WIZARD-SCULPT-SPELLS",
      "status": "done",
      "title": "Resolve level-6 owner evidence for Wizard Sculpt Spells"
    },
    {
      "number": 27,
      "id": "L6FULL-FINAL-01-LEVEL6-ACCOUNTING-REFRESH",
      "status": "done",
      "title": "Refresh and verify level-6 full SRD accounting"
    },
    {
      "number": 28,
      "id": "L6UG-PRE-01-L6-FULL-QUEUE-CLOSED",
      "status": "done",
      "title": "Verify the L6 full SRD queue is closed"
    },
    {
      "number": 29,
      "id": "L6UG-SCOPE-01-LEVEL16-REPORT-PLUMBING",
      "status": "done",
      "title": "Add level-1-6 support report plumbing"
    },
    {
      "number": 30,
      "id": "L6UG-SCOPE-02-ULTRA-GOLDEN-SCOPE",
      "status": "blocked",
      "title": "Wire level-1-6 into the ultra-golden aggregate"
    },
    {
      "number": 31,
      "id": "L6UG-GATE-01-NON-MCP-LAYER-RECONCILIATION",
      "status": "blocked",
      "title": "Reconcile level-1-6 non-MCP ultra-golden layers"
    },
    {
      "number": 32,
      "id": "L6UG-MCP-01-LEVEL6-VERTICAL-DECISION",
      "status": "ready-for-research",
      "title": "Choose the level-6 MCP vertical scenario"
    },
    {
      "number": 33,
      "id": "L6UG-MCP-02-LEVEL6-SHEET-SCENARIO",
      "status": "blocked",
      "title": "Implement level-6 MCP creation and sheet scenario coverage"
    },
    {
      "number": 34,
      "id": "L6UG-MCP-03-LEVEL6-BATTLE-HANDOFF",
      "status": "blocked",
      "title": "Extend the level-6 MCP scenario through battle handoff"
    },
    {
      "number": 35,
      "id": "L6UG-MCP-04-LEVEL6-SCENARIO-REGISTRY",
      "status": "blocked",
      "title": "Register the level-6 MCP scenario in acceptance coverage"
    },
    {
      "number": 36,
      "id": "L6UG-MCP-05-LEVEL16-SCENARIO-EVIDENCE",
      "status": "blocked",
      "title": "Admit level-1-6 MCP scenario evidence"
    },
    {
      "number": 37,
      "id": "L6UG-FINAL-01-ULTRA-GOLDEN-REFRESH",
      "status": "blocked",
      "title": "Refresh and verify the level-1-6 ultra-golden gate"
    }
  ]
}
-->

## Scope

This combined Ralph queue runs the unfinished level-5 ultra-golden MCP
extension first, then completes the level-6 horizontal SRD slice, then raises
the level-6 result to ultra-golden MCP scope coverage. The level-6 work mirrors
the level-5 completion semantics: verify existing evidence, add SDK/tracer or
owner evidence only where support is real, explicitly close table/progression
rows, author or admit missing SRD feature records where needed, resolve future
owner boundaries before SDK claims, refresh generated accounting, and then add
checker-owned MCP scenario evidence.

Run it as a single Ralph plan:

```bash
scripts/ralph-run.sh plans/RALPH_L5_EXTENSION_L6_HORIZONTAL_SLICE.md
```

## Ralph Task-Base Check

Every Ralph task must run the task-base check before research or edits:

1. Log the task-provided Base SHA or Base ref.
2. Log `HEAD`.
3. Run `git merge-base --is-ancestor <Base SHA> HEAD`.
4. Stop and report a branch-base mismatch if the ancestor check fails. Do not
   rebase or repair branch state inside the task.

## Source Artifacts

- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `scripts/unit-profile-coverage-check.cjs`
- `scripts/ultra-golden-gate.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/mcp-protocol.test.ts`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

## Lane Rules

- This queue may change checker, MCP test, generated report, and planning files.
  It must not reopen SDK/accounting rows already closed by the completed L5
  full SRD baseline unless a checker-owned contradiction is found.
- Keep L5 and L6 scope SRD-only. PHB+ content remains out of scope. Level 6
  does not include spell-level-4 work.
- MCP scenarios must follow returned tool state: use returned draft revisions,
  hole ids, option ids, character ids, battle ids, and battle holes. Do not
  branch runtime behavior on authored Unit, class, feature, spell, or scenario
  names.
- Prefer one level-5 vertical scenario that covers workflow discovery,
  character creation or advancement, durable Character Sheet state, and battle
  handoff. Add a second scenario only if one vertical cannot honestly cover all
  four required MCP flows.
- Do not add duplicate state for Spell Slots, prepared spells, spellbook
  contents, feature resources, battle spell slots, or battle actions. Thread or
  project existing owners.
- If level-1-5 ultra-golden cannot pass because a non-MCP layer is genuinely
  missing support or parity after the completed L5 full SRD baseline, split
  that missing work into concrete Ralph tasks in this plan instead of hiding it
  in prose.
- If level-6 full support or level-1-6 ultra-golden cannot pass because a real
  owner, catalog, checker, parity, or MCP layer is missing, split the missing
  work into concrete Ralph tasks and update `ralph-task-index`, `## DAG / Queue
  Order`, and downstream dependencies. Do not close rows with prose-only
  placeholders.
- Do not run MBT for plan-only or MCP-only tasks. Run focused MBT only if a task
  changes battle runtime or QNT parity behavior.

## DAG / Queue Order

|   # | Task                                                                                       | Status             | Depends on                                                                                      | Notes                                                                                 |
| --: | ------------------------------------------------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
|   1 | L5UG-PRE-01-L5-FULL-QUEUE-CLOSED - Verify the L5 full SRD queue is closed                  | done               | none                                                                                            | Confirms the SDK/accounting queue is actually closed before ultra-golden work starts.  |
|   2 | L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING - Add level-1-5 support report plumbing              | done               | L5UG-PRE-01-L5-FULL-QUEUE-CLOSED                                                                | Adds the generated level-support report path before ultra-golden consumes it.          |
|   3 | L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE - Wire level-1-5 into the ultra-golden aggregate          | done               | L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING                                                           | Extends the aggregate gate without weakening older scopes.                             |
|   4 | L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION - Reconcile level-1-5 non-MCP ultra-golden layers | done | L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE | Split current non-MCP support blockers into concrete dependency-rewired follow-up tasks. |
|  38 | L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING - Resolve level-1-5 open spell-effect accounting rows | done | L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION | Records concrete follow-up splits for the four table/spatial spell-effect rows and closes current strict accounting. |
|  39 | L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS - Resolve level-1-5 later-level residual accounting rows | done | L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION | Records concrete follow-up splits for the two later-level residual rows and closes current strict accounting. |
|  40 | L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES - Resolve level-1-5 selected-identity replay gaps | done | L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION | Adds or closes the five selected-identity replay blockers without using MCP scenario evidence as parity. |
|  41 | L3-FOLLOWUP-BLINK-PLANAR-PHASE-LIFECYCLE - Promote Blink planar phase lifecycle | future-follow-up | L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING | Future Spell Effect owner for Blink's planar phase lifecycle and table/spatial plane-position witnesses; parked outside this L5/L6 completion pass. |
|  42 | L3-FOLLOWUP-CONJURE-ANIMALS-PACK-EFFECT - Promote Conjure Animals pack effect | future-follow-up | L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING | Future Spell Effect owner for the spectral pack occurrence and table/spatial plane-position witnesses; parked outside this L5/L6 completion pass. |
|  43 | L3-FOLLOWUP-MAGIC-CIRCLE-WARDED-AREA - Promote Magic Circle warded area | future-follow-up | L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING | Future Spell Effect owner for the warded Cylinder and table/spatial crossing witnesses; parked outside this L5/L6 completion pass. |
|  44 | L3-FOLLOWUP-MELD-INTO-STONE-MERGED-STATE - Promote Meld into Stone merged state | future-follow-up | L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING | Future Spell Effect owner for stone merged-state lifecycle and terrain/object occupancy witnesses; parked outside this L5/L6 completion pass. |
|  45 | L12G-FOLLOWUP-RANGER-FAVORED-ENEMY-FREE-CAST-SCALING - Promote Ranger Favored Enemy free-cast scaling | future-follow-up | L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS | Future resource owner for Favored Enemy's Ranger-level free-cast count scaling; parked outside this L5/L6 completion pass. |
|  46 | L12G-FOLLOWUP-WIZARD-EVOCATION-SAVANT-NEW-SLOT-LEVEL - Promote Wizard Evocation Savant new Spell Slot level grant | future-follow-up | L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS | Future character-advancement owner for Evocation Savant's later new Spell Slot level grant; parked outside this L5/L6 completion pass. |
|  47 | L6-FOLLOWUP-REPEATED-ASI-GRANT-OCCURRENCE - Promote repeated Ability Score Improvement grant occurrences | future-follow-up | L6FULL-ASI-01-FIGHTER-ASI-L6 | Future character-creation owner for repeated ASI grant occurrences such as Fighter level 6; parked outside this L6 full accounting pass. |
|  48 | L6-FOLLOWUP-BARBARIAN-MINDLESS-RAGE-CONDITION-IMMUNITY - Promote Barbarian Mindless Rage condition immunity | future-follow-up | L6FULL-OWN-01-BARBARIAN-MINDLESS-RAGE | Future battle-runtime owner for active Rage Charmed/Frightened immunity and enter-rage cleanup; parked outside this L6 full accounting pass. |
|  49 | L6-FOLLOWUP-BARD-MAGICAL-DISCOVERIES-SPELL-ACCESS - Promote Bard Magical Discoveries spell-access selection | future-follow-up | L6FULL-OWN-02-BARD-MAGICAL-DISCOVERIES | Future character-creation and character-sheet owner for Magical Discoveries cross-list always-prepared spell choices and Bard-level replacement; parked outside this L6 full accounting pass. |
|  50 | L6-FOLLOWUP-CLERIC-BLESSED-HEALER-SPELL-HEALING-RIDER - Promote Cleric Blessed Healer spell-healing rider | future-follow-up | L6FULL-OWN-03-CLERIC-BLESSED-HEALER | Future battle-runtime owner for selected Life Domain post-cast self-healing after slot-cast healing of another creature; parked outside this L6 full accounting pass. |
|  51 | L6-FOLLOWUP-DRUID-NATURAL-RECOVERY-REST-FEATURE - Promote Druid Natural Recovery rest feature | future-follow-up | L6FULL-OWN-04-DRUID-NATURAL-RECOVERY | Future character-sheet owner for Natural Recovery's no-slot Circle Spell cast and Short Rest Spell Slot recovery budget; parked outside this L6 full accounting pass. |
|  52 | L6-FOLLOWUP-MONK-EMPOWERED-STRIKES-DAMAGE-TYPE - Promote Monk Empowered Strikes damage-type choice | future-follow-up | L6FULL-OWN-05-MONK-EMPOWERED-STRIKES | Future battle-runtime owner for selected Monk Empowered Strikes Unarmed Strike Force-or-normal damage-type choice; parked outside this L6 full accounting pass. |
|  53 | L6-FOLLOWUP-MONK-WHOLENESS-OF-BODY-SELF-HEALING - Promote Monk Wholeness of Body feature-resource self-healing | future-follow-up | L6FULL-OWN-06-MONK-WHOLENESS-OF-BODY | Future character-sheet and battle-runtime owner for selected Monk Wholeness of Body Bonus Action self-healing and Long Rest use-count state; parked outside this L6 full accounting pass. |
|  54 | L6-FOLLOWUP-PALADIN-AURA-OF-PROTECTION-SAVE-BONUS - Promote Paladin Aura of Protection passive aura and Saving Throw modifier | future-follow-up | L6FULL-OWN-07-PALADIN-AURA-OF-PROTECTION | Future battle-runtime and character-battle owner for selected Paladin Aura of Protection Emanation membership, inactive-while-Incapacitated gating, Charisma-modifier minimum +1 Saving Throw bonus projection, and overlapping Paladin aura choice; parked outside this L6 full accounting pass. |
|  55 | L6-FOLLOWUP-SORCERER-ELEMENTAL-AFFINITY-DAMAGE - Promote Sorcerer Elemental Affinity damage affinity | future-follow-up | L6FULL-OWN-08-SORCERER-ELEMENTAL-AFFINITY | Future character-sheet and battle-runtime owner for selected Draconic Sorcery Elemental Affinity damage type, passive Resistance, and one-roll spell damage Charisma modifier; parked outside this L6 full accounting pass. |
|  56 | L6-FOLLOWUP-WARLOCK-DARK-ONES-OWN-LUCK-D20-MODIFIER - Promote Warlock Dark One's Own Luck Ability Check and Saving Throw d10 modifier | future-follow-up | L6FULL-OWN-09-WARLOCK-DARK-ONES-OWN-LUCK | Future character-sheet and runtime owner for selected Fiend Patron Dark One's Own Luck Long Rest resource and reactionless Ability Check and Saving Throw 1d10 modifier; parked outside this L6 full accounting pass. |
|  57 | L6-FOLLOWUP-WIZARD-SCULPT-SPELLS-SAVE-DAMAGE-EXEMPTION - Promote Wizard Sculpt Spells selected area spell save-damage exemption | future-follow-up | L6FULL-OWN-10-WIZARD-SCULPT-SPELLS | Future battle-runtime owner for selected Sculpt Spells protected-creature choices, automatic Saving Throw success, and successful-save half-damage replacement; parked outside this L6 full accounting pass. |
|   5 | L5UG-MCP-01-LEVEL5-VERTICAL-DECISION - Choose the level-5 MCP vertical scenario            | done               | L5UG-PRE-01-L5-FULL-QUEUE-CLOSED                                                                | Selected the Wizard 5 Fireball MCP vertical and rejected future-owner alternatives.     |
|   6 | L5UG-MCP-02-LEVEL5-SHEET-SCENARIO - Implement level-5 MCP creation and sheet scenario coverage | done | L5UG-MCP-01-LEVEL5-VERTICAL-DECISION                                                            | Adds Wizard 5 Fireball creation/finalization/sheet proof before battle handoff.         |
|   7 | L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF - Extend the level-5 MCP scenario through battle handoff | done | L5UG-MCP-02-LEVEL5-SHEET-SCENARIO, L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING, L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS, L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES | Adds battle handoff after Task 6 sheet coverage; non-MCP support dependencies are complete. |
|   8 | L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY - Register the level-5 MCP scenario in acceptance coverage | done               | L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF                                                               | Wires the executable scenario into MCP acceptance coverage.                             |
|   9 | L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE - Admit level-1-5 MCP scenario evidence              | done | L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY                                                            | Updates checker-owned MCP evidence only after executable coverage exists.              |
|  10 | L5UG-FINAL-01-ULTRA-GOLDEN-REFRESH - Refresh and verify the level-1-5 ultra-golden gate    | done | L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE, L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING, L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS, L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES | Final generated refresh after scope, non-MCP support blockers, parity, and MCP evidence land. |
|  11 | L6FULL-PRE-01-L5-QUEUES-CLOSED - Verify L5 full and L5 ultra-golden queues are closed | done | L5UG-FINAL-01-ULTRA-GOLDEN-REFRESH | L6 starts only after the L5 extension has landed. |
|  12 | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY - Verify level-6 scope and inventory baseline | done | L6FULL-PRE-01-L5-QUEUES-CLOSED | Confirms the 25-row L6 baseline and excludes spell-level-4. |
|  13 | L6FULL-SEED-01-RANGER-ROVING - Verify existing Ranger Roving level-6 support evidence | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Existing catalog/runtime evidence remains checker-readable. |
|  14 | L6FULL-SEED-02-ROGUE-EXPERTISE - Verify existing Rogue Expertise level-6 support evidence | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Preserve existing catalog/character-creation evidence. |
|  15 | L6FULL-CLOSE-01-LEVEL6-CLASS-TABLES - Explicitly close the twelve level-6 class-table summary rows | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Table/progression rows remain explicit non-runtime closures. |
|  16 | L6FULL-ASI-01-FIGHTER-ASI-L6 - Admit or close Fighter level-6 Ability Score Improvement | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed repeated ASI grant occurrence with checker-owned unsupported-profile accounting. |
|  17 | L6FULL-OWN-01-BARBARIAN-MINDLESS-RAGE - Resolve level-6 owner evidence for Barbarian Mindless Rage | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed active Rage condition-immunity and enter-rage cleanup owner boundary. |
|  18 | L6FULL-OWN-02-BARD-MAGICAL-DISCOVERIES - Resolve level-6 owner evidence for Bard Magical Discoveries | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed future-owner-before-SDK spell-access selection boundary; future owner tracked by Task 49. |
|  19 | L6FULL-OWN-03-CLERIC-BLESSED-HEALER - Resolve level-6 owner evidence for Cleric Blessed Healer | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed future-owner-before-SDK spell healing rider boundary; future owner tracked by Task 50. |
|  20 | L6FULL-OWN-04-DRUID-NATURAL-RECOVERY - Resolve level-6 owner evidence for Druid Natural Recovery | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed future-owner-before-SDK rest feature boundary; future owner tracked by Task 51. |
|  21 | L6FULL-OWN-05-MONK-EMPOWERED-STRIKES - Resolve level-6 owner evidence for Monk Empowered Strikes | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed future-owner-before-SDK Unarmed Strike damage-type-choice boundary; future owner tracked by Task 52. |
|  22 | L6FULL-OWN-06-MONK-WHOLENESS-OF-BODY - Resolve level-6 owner evidence for Monk Wholeness of Body | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed future-owner-before-SDK feature-resource self-healing boundary; future owner tracked by Task 53. |
|  23 | L6FULL-OWN-07-PALADIN-AURA-OF-PROTECTION - Resolve level-6 owner evidence for Paladin Aura of Protection | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed future-owner-before-SDK passive aura and Saving Throw modifier boundary; future owner tracked by Task 54. |
|  24 | L6FULL-OWN-08-SORCERER-ELEMENTAL-AFFINITY - Resolve level-6 owner evidence for Sorcerer Elemental Affinity | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed future-owner-before-SDK damage-affinity boundary; future owner tracked by Task 55. |
|  25 | L6FULL-OWN-09-WARLOCK-DARK-ONES-OWN-LUCK - Resolve level-6 owner evidence for Warlock Dark One's Own Luck | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed future-owner-before-SDK Ability Check and Saving Throw modifier boundary; future owner tracked by Task 56. |
|  26 | L6FULL-OWN-10-WIZARD-SCULPT-SPELLS - Resolve level-6 owner evidence for Wizard Sculpt Spells | done | L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY | Closed as a not-installed future-owner-before-SDK selected area spell save-damage exemption boundary; future owner tracked by Task 57. |
|  27 | L6FULL-FINAL-01-LEVEL6-ACCOUNTING-REFRESH - Refresh and verify level-6 full SRD accounting | done | L6FULL-SEED-01-RANGER-ROVING, L6FULL-SEED-02-ROGUE-EXPERTISE, L6FULL-CLOSE-01-LEVEL6-CLASS-TABLES, L6FULL-ASI-01-FIGHTER-ASI-L6, L6FULL-OWN-01-BARBARIAN-MINDLESS-RAGE, L6FULL-OWN-02-BARD-MAGICAL-DISCOVERIES, L6FULL-OWN-03-CLERIC-BLESSED-HEALER, L6FULL-OWN-04-DRUID-NATURAL-RECOVERY, L6FULL-OWN-05-MONK-EMPOWERED-STRIKES, L6FULL-OWN-06-MONK-WHOLENESS-OF-BODY, L6FULL-OWN-07-PALADIN-AURA-OF-PROTECTION, L6FULL-OWN-08-SORCERER-ELEMENTAL-AFFINITY, L6FULL-OWN-09-WARLOCK-DARK-ONES-OWN-LUCK, L6FULL-OWN-10-WIZARD-SCULPT-SPELLS | Final generated refresh after all L6 rows are supported or explicitly closed. |
|  28 | L6UG-PRE-01-L6-FULL-QUEUE-CLOSED - Verify the L6 full SRD queue is closed | done | L6FULL-FINAL-01-LEVEL6-ACCOUNTING-REFRESH | L6 full closure is verified; ultra-golden L6 prerequisite is satisfied. |
|  29 | L6UG-SCOPE-01-LEVEL16-REPORT-PLUMBING - Add level-1-6 support report plumbing | done | L6UG-PRE-01-L6-FULL-QUEUE-CLOSED | Adds checker-owned `level-1-6` report artifacts. |
|  30 | L6UG-SCOPE-02-ULTRA-GOLDEN-SCOPE - Wire level-1-6 into the ultra-golden aggregate | blocked | L6UG-SCOPE-01-LEVEL16-REPORT-PLUMBING | Extends aggregate scope without weakening older scopes. |
|  31 | L6UG-GATE-01-NON-MCP-LAYER-RECONCILIATION - Reconcile level-1-6 non-MCP ultra-golden layers | blocked | L6UG-SCOPE-02-ULTRA-GOLDEN-SCOPE | Support, QNT/generator, and parity layers before MCP closeout. |
|  32 | L6UG-MCP-01-LEVEL6-VERTICAL-DECISION - Choose the level-6 MCP vertical scenario | ready-for-research | L6UG-PRE-01-L6-FULL-QUEUE-CLOSED | Chooses the smallest honest SRD-only L6 vertical. |
|  33 | L6UG-MCP-02-LEVEL6-SHEET-SCENARIO - Implement level-6 MCP creation and sheet scenario coverage | blocked | L6UG-MCP-01-LEVEL6-VERTICAL-DECISION | Proves creation/advancement and durable sheet state. |
|  34 | L6UG-MCP-03-LEVEL6-BATTLE-HANDOFF - Extend the level-6 MCP scenario through battle handoff | blocked | L6UG-MCP-02-LEVEL6-SHEET-SCENARIO, L6UG-GATE-01-NON-MCP-LAYER-RECONCILIATION | Battle handoff only after non-MCP blockers are known. |
|  35 | L6UG-MCP-04-LEVEL6-SCENARIO-REGISTRY - Register the level-6 MCP scenario in acceptance coverage | blocked | L6UG-MCP-03-LEVEL6-BATTLE-HANDOFF | Wires executable scenario into acceptance metadata. |
|  36 | L6UG-MCP-05-LEVEL16-SCENARIO-EVIDENCE - Admit level-1-6 MCP scenario evidence | blocked | L6UG-MCP-04-LEVEL6-SCENARIO-REGISTRY | Updates checker-owned MCP evidence after executable coverage exists. |
|  37 | L6UG-FINAL-01-ULTRA-GOLDEN-REFRESH - Refresh and verify the level-1-6 ultra-golden gate | blocked | L6UG-MCP-05-LEVEL16-SCENARIO-EVIDENCE | Final generated refresh after scope, parity, and MCP evidence land. |

## Shared Verification

- RAW/ubiquitous-language check: before modeling or asserting level-5 or level-6
  behavior, read the relevant `.references/srd-5.2.1/` passages and
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Base commands:
  `pnpm unit-profile-coverage:check:self-test`,
  `pnpm unit-profile-coverage:check`,
  `pnpm rules-kernel-coverage:check:self-test`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm sdk-raw-integration-inventory:check`,
  `pnpm cleanroom-branch-coverage:check`,
  `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`,
  `git diff --check`.
- If checker or generated report files change, run:
  `pnpm unit-profile-coverage:check --write`,
  then rerun `pnpm unit-profile-coverage:check`.
- If battle runtime or QNT parity behavior changes, add the focused runtime/QNT
  verification required by that task. Do not use broad MBT as exploratory
  validation.

## Task Details

### Task 1 - L5UG-PRE-01-L5-FULL-QUEUE-CLOSED

Status: `done`

Depends on: none

Inputs:

- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- Current `pnpm sdk-raw-integration-inventory:check` and
  `pnpm unit-profile-coverage:check` results.

Current state:

- The L5 SDK/accounting queue is complete and removed from the active tree.
- This queue should not start ultra-golden implementation while generated L5
  accounting or SDK inventory still disagrees with that closed baseline.

Output:

- Verify current generated artifacts agree with the post-L5 accounting state.
- Verify the L5 accounting and SDK inventory have no unresolved row that would
  reopen the completed L5 full SRD queue.
- If the closed L5 baseline is contradicted by current artifacts, mark this task
  `blocked` with `Blocker Type: dependency` and name the contradicting row ids.
  Do not edit the rest of this plan.

Completion / Success Criteria:

- It is safe to run the ultra-golden queue because the SDK/accounting queue is
  closed.
- `pnpm sdk-raw-integration-inventory:check` passes.
- `pnpm unit-profile-coverage:check` passes or any failure is documented as a
  pre-existing repository/worktree problem unrelated to level-5 closure.
- Task 2 and Task 5 are unblocked only after this task is accepted.

Verification:

- Shared verification commands that are relevant to a read-only prerequisite
  check.

Plan Impact:

- Applied. Current generated L5 SDK/accounting artifacts agree with the closed
  post-L5 baseline, with no unresolved L5 row reopening the full SRD queue.
- Task 2 and Task 5 are unblocked for research.

### Task 2 - L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING

Status: `done`

Depends on: `L5UG-PRE-01-L5-FULL-QUEUE-CLOSED`

Inputs:

- `scripts/unit-profile-coverage-check.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- Existing level-support report paths for level 1 through level 4.
- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`

Current state:

- Unit-profile coverage emits level-support reports through `level-1-5`.
- The L5 SDK/accounting artifacts are exposed through checker-owned
  `level-1-5` support JSON and Markdown artifacts.

Output:

- Add the checker/config paths needed for a generated `level-1-5` support
  report and JSON artifact.
- Derive the level-1-5 report from generated inventory/accounting inputs rather
  than hand-maintained prose.
- Preserve existing level-1 through level-1-4 report outputs.

Completion / Success Criteria:

- The repository has generated level-1-5 support report paths wired through the
  checker.
- Running the checker write path can produce the new artifacts without
  weakening older level reports.
- Any open level-1-5 support blockers are checker-readable.

Verification:

- `pnpm unit-profile-coverage:check --write`
- Shared verification.

Plan Impact:

- Applied. `plans/unit-profile-coverage/level1-5-full-support.json` and
  `plans/unit-profile-coverage/LEVEL1_5_FULL_SUPPORT.md` are generated by the
  unit-profile checker.
- Current level-1-5 full-support gate remains blocked with checker-readable
  blockers: strict=6, selected-identity=5, SRD-authored-readiness=0.
- Task 3 is unblocked for research.

### Task 3 - L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE

Status: `done`

Depends on: `L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING`

Inputs:

- `scripts/ultra-golden-gate.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- The generated level-1-5 support report and JSON path from Task 2.
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- Existing `ULTRA_GOLDEN_GATE.md` and `ultra-golden-gate.json` shape.

Current state:

- `scripts/ultra-golden-gate.cjs` currently scopes the aggregate through
  `level-1-4`.
- Task 2 created the level-1-5 support report input; this task wires it into
  the aggregate.

Output:

- Add `level-1-5` to the ultra-golden aggregate scope.
- Preserve older scope behavior and report wording.
- Make missing level-1-5 layer evidence appear as explicit checker blockers.

Completion / Success Criteria:

- `ULTRA_GOLDEN_GATE.md` and `ultra-golden-gate.json` include a `level-1-5`
  scope.
- Existing level-1, level-1-2, level-1-3, and level-1-4 scope results are not
  weakened.
- No generated coverage artifact is hand-edited outside the checker write path.

Verification:

- `pnpm unit-profile-coverage:check --write`
- Shared verification.

Plan Impact:

- Applied. `level-1-5` is now a generated ultra-golden aggregate scope in
  `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md` and
  `plans/unit-profile-coverage/ultra-golden-gate.json`.
- Existing `level-1`, `level-1-2`, `level-1-3`, and `level-1-4` scope results
  still pass.
- The generated `level-1-5` scope is blocked only by support completeness and
  MCP scenario evidence; its QNT/generator-readiness and MBT/parity-evidence
  layers pass.
- Task 4 is unblocked for research.

### Task 4 - L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION

Status: `done`

Depends on: `L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE`

Inputs:

- The level-1-5 ultra-golden output from Task 3.
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/cleanroom-branch-coverage/`
- `pnpm rules-kernel-coverage:check` output.
- `pnpm cleanroom-branch-coverage:check` output.

Current state:

- Ultra-golden is conjunctive: support completeness, QNT/generator readiness,
  MBT/parity evidence, and MCP scenario evidence must all pass for the scoped
  level.
- The generated `level-1-5` ultra-golden scope exists and is blocked.
- Its non-MCP blocker is support completeness: `level1-5-full-support.json`
  reports 6 strict target open rows and 5 selected-identity readiness gaps.
- `level-1-5` QNT/generator-readiness and MBT/parity-evidence layers pass.
- MCP scenario evidence is separately blocked by the four required MCP flows
  owned by `L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE`.

Output:

- Reconcile `level-1-5` support completeness, QNT/generator readiness, and
  MBT/parity evidence after Task 3 adds the scope.
- If these layers already pass from existing evidence, record the checker-owned
  result and preserve it.
- Record the current checker-owned result: QNT/generator readiness and
  MBT/parity evidence pass for `level-1-5`, while support completeness remains
  blocked by 6 strict open rows and 5 selected-identity gaps.
- If a non-MCP layer is missing evidence, do not let downstream MCP battle
  handoff unblock prematurely. Either resolve the blocker in this task, or add
  concrete Ralph tasks for the blocker and update `ralph-task-index`,
  `## DAG / Queue Order`, and downstream dependencies so Task 7 and Task 10
  depend on the new blocker tasks.

Completion / Success Criteria:

- The only remaining `level-1-5` ultra-golden blockers are MCP scenario evidence
  blockers, or this plan has concrete additional tasks for every non-MCP
  blocker and downstream dependencies have been rewired to wait for them.
- No parity evidence is inferred from SDK scenarios unless the checker already
  admits that witness kind for the layer.
- If any non-MCP blocker remains unresolved and no dependency-rewired follow-up
  task was added, this task is not complete and must stay non-done.
- No MBT is run unless this task changes battle runtime or QNT parity behavior.

Verification:

- Shared verification plus any focused checker command needed by split blocker
  tasks.

Plan Impact:

- Applied. The checker-owned `level-1-5` QNT/generator-readiness and
  MBT/parity-evidence layers pass.
- The remaining non-MCP support-completeness blockers are split into concrete
  follow-up tasks: Task 38 for four table/spatial spell-effect rows, Task 39
  for two later-level residual rows, and Task 40 for five selected-identity
  replay gaps.
- Tasks 7 and 10 now depend on Tasks 38, 39, and 40 so battle handoff and final
  ultra-golden refresh cannot proceed before these non-MCP blockers resolve.

### Task 38 - L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING

Status: `done`

Depends on: `L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION`

Inputs:

- `plans/unit-profile-coverage/level1-5-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_5_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- Relevant SRD spell text under `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- `level1-5-full-support.json` reports `open-profile-accounting` strict rows
  for `blink`, `conjure_animals`, `magic_circle`, and `meld_into_stone`.
- All four rows are table/spatial derivation spell-effect boundaries. The
  current blocker text says each needs a promoted owner that consumes
  table-supplied spatial or environment witnesses without duplicating map,
  object, companion-control, or authored spell identity state.

Output:

- Resolve each of the four rows through the correct layer: supported or
  profile-subset-supported evidence if a real owner exists, durable closure if
  the promoted runtime boundary does not own the behavior, or a narrower
  dependency-rewired Ralph task if a row cannot honestly close here.
- Update `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, Surface content,
  runtime/QNT owners, and generated reports only where the chosen resolution
  requires it.
- Preserve QNT/generator and MBT/parity evidence discipline. Do not infer
  parity from SDK or MCP scenarios.

Completion / Success Criteria:

- `level1-5-full-support.json` no longer reports `blink`,
  `conjure_animals`, `magic_circle`, or `meld_into_stone` in
  `open-profile-accounting`.
- If any of those units remains open, this plan has an additional concrete
  dependency-rewired task for that exact row before Task 7 and Task 10 can run.
- No runtime owner duplicates table/spatial, object, companion-control, or
  authored identity state.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability for the
  affected spell text.
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check` if rules-kernel joins or QNT ownership
  change.
- Focused runtime/QNT tests and the relevant MBT only if this task changes
  battle runtime or QNT parity behavior.

Plan Impact:

- Applied. `blink`, `conjure_animals`, `magic_circle`, and
  `meld_into_stone` now have checker-owned `followUpTasks`, so the generated
  level-1-5 strict gate classifies them as `blocked-follow-up-split` instead
  of `open-profile-accounting`.
- Added Tasks 41-44 as dependency-ordered Ralph follow-ups for those exact
  promoted owner slices. They do not block Tasks 7 or 10 because Task 38's
  generated accounting now closes the current strict target by explicit split.

### Task 41 - L3-FOLLOWUP-BLINK-PLANAR-PHASE-LIFECYCLE

Status: `future-follow-up`

Future Follow-up Reason: owner-directed queue control. This is a future-owner follow-up
record created by Task 38 so the current level-1-5 strict accounting can close
by explicit split. It does not block Tasks 7 or 10 and is parked outside this
combined L5 ultra-golden plus L6 horizontal completion pass.

Depends on: `L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- Blink Surface spell definition and support-profile facts
- Relevant SRD spell text under `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`
- Battle runtime, QNT, and MBT owners for active Spell Effect lifecycles

Current state:

- Blink is installed as an SRD Surface Spell Definition, but no promoted
  battle-runtime profile owns its planar phase lifecycle.
- Task 38 records the follow-up split in the Unit claim.

Output:

- Promote Blink's typed planar phase lifecycle as a Spell Effect using Surface
  phase-transition facts, caster-turn-end random-table branch,
  already-on-Ethereal spell-ending predicate, origin-space tracking,
  Ethereal-only interaction limits, start-of-next-turn and spell-end return
  placement, caller/table-supplied plane occupancy, visible-unoccupied return
  choices, and nearest-unoccupied fallback witnesses.
- Do not store durable map or plane-position state and do not dispatch on
  Blink id, name, or provenance.

Completion / Success Criteria:

- Blink has a supported-profile or profile-subset-supported claim with
  deterministic admission/projection evidence, focused runtime tests, and
  promoted Quint/runtime parity for the planar phase lifecycle.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused runtime/QNT tests and relevant MBT only if runtime or QNT parity
  behavior changes.

### Task 42 - L3-FOLLOWUP-CONJURE-ANIMALS-PACK-EFFECT

Status: `future-follow-up`

Future Follow-up Reason: owner-directed queue control. This is a future-owner follow-up
record created by Task 38 so the current level-1-5 strict accounting can close
by explicit split. It does not block Tasks 7 or 10 and is parked outside this
combined L5 ultra-golden plus L6 horizontal completion pass.

Depends on: `L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- Conjure Animals Surface spell definition and support-profile facts
- Relevant SRD spell text under `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`
- Battle runtime, QNT, and MBT owners for active Spell Effect lifecycles

Current state:

- Conjure Animals is installed as an SRD Surface Spell Definition, but no
  promoted battle-runtime profile owns its spectral pack occurrence.
- Task 38 records the follow-up split in the Unit claim.

Output:

- Promote Conjure Animals' spectral pack occurrence as a Spell Effect carrying
  pack lifecycle, slot-scaled Slashing damage, caster-selected animal-form
  source fact, caster-proximity Strength Saving Throw Advantage, caster-turn
  reposition command, optional Dexterity Saving Throw damage triggers, and
  shared once-per-turn per-creature trigger state.
- Consume caller/table-supplied pack position, caster proximity,
  visible-creature eligibility, movement/reposition destination, and trigger
  witnesses without adding companion-control state or authored-identity
  dispatch.

Completion / Success Criteria:

- Conjure Animals has a supported-profile or profile-subset-supported claim
  with deterministic admission/projection evidence, focused runtime tests, and
  promoted Quint/runtime parity for the pack Spell Effect.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused runtime/QNT tests and relevant MBT only if runtime or QNT parity
  behavior changes.

### Task 43 - L3-FOLLOWUP-MAGIC-CIRCLE-WARDED-AREA

Status: `future-follow-up`

Future Follow-up Reason: owner-directed queue control. This is a future-owner follow-up
record created by Task 38 so the current level-1-5 strict accounting can close
by explicit split. It does not block Tasks 7 or 10 and is parked outside this
combined L5 ultra-golden plus L6 horizontal completion pass.

Depends on: `L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- Magic Circle Surface spell definition and support-profile facts
- Relevant SRD spell text under `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`
- Battle runtime, QNT, and MBT owners for active Spell Effect lifecycles

Current state:

- Magic Circle is installed as an SRD Surface Spell Definition, but no promoted
  battle-runtime profile owns its warded-area effect.
- Task 38 records the follow-up split in the Unit claim.

Output:

- Promote Magic Circle's warded Cylinder as a Spell Effect carrying chosen
  creature-type set, normal or reversed direction branch, willing nonmagical
  entry or exit prevention, Charisma Saving Throw gates for teleportation and
  interplanar-travel crossing, protected-target Attack Roll Disadvantage, and
  source-scoped possession plus Charmed/Frightened prevention.
- Consume table-supplied ground-point placement, Cylinder membership,
  protected-target location, crossing-attempt, and magical-travel witnesses
  without duplicating battle map state or dispatching on Magic Circle identity.

Completion / Success Criteria:

- Magic Circle has a supported-profile or profile-subset-supported claim with
  deterministic admission/projection evidence, focused runtime tests, and
  promoted Quint/runtime parity for the warded-area Spell Effect.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused runtime/QNT tests and relevant MBT only if runtime or QNT parity
  behavior changes.

### Task 44 - L3-FOLLOWUP-MELD-INTO-STONE-MERGED-STATE

Status: `future-follow-up`

Future Follow-up Reason: owner-directed queue control. This is a future-owner follow-up
record created by Task 38 so the current level-1-5 strict accounting can close
by explicit split. It does not block Tasks 7 or 10 and is parked outside this
combined L5 ultra-golden plus L6 horizontal completion pass.

Depends on: `L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- Meld into Stone Surface spell definition and support-profile facts
- Relevant SRD spell text under `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`
- Battle runtime, QNT, and MBT owners for active Spell Effect lifecycles

Current state:

- Meld into Stone is installed as an SRD Surface Spell Definition, but no
  promoted battle-runtime profile owns its merged-state lifecycle.
- Task 38 records the follow-up split in the Unit claim.

Output:

- Promote Meld into Stone's merged-state Spell Effect carrying stone
  containment target, hidden merged occupancy, outside-sense limits,
  passage-of-time awareness, self-spell permission, voluntary Movement exit,
  otherwise-no-movement restriction, minor-damage harmlessness,
  partial-destruction or shape-change expulsion with 6d6 Force damage,
  complete-destruction or transmutation expulsion with 50 Force damage,
  closest-unoccupied placement, and Prone rider.
- Consume table terrain/object witnesses for stone size, shape, material, entry
  location, damage/destruction/transmutation events, fit-after-shape-change
  predicates, and placement without duplicating battle map/object state or
  dispatching on Meld into Stone identity.

Completion / Success Criteria:

- Meld into Stone has a supported-profile or profile-subset-supported claim
  with deterministic admission/projection evidence, focused runtime tests, and
  promoted Quint/runtime parity for the merged-state Spell Effect.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused runtime/QNT tests and relevant MBT only if runtime or QNT parity
  behavior changes.

### Task 39 - L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS

Status: `done`

Depends on: `L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION`

Inputs:

- `plans/unit-profile-coverage/level1-5-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_5_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- Relevant SRD class text under `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- `level1-5-full-support.json` reports `open-profile-accounting` strict rows
  for `ranger_favored_enemy` and `wizard_evocation_savant`.
- Both rows are classified as `later-level-only` residuals that first enter the
  level-1-5 scope at character level 5.

Output:

- Resolve `ranger_favored_enemy` and `wizard_evocation_savant` through the
  correct source-owned layer: supported/profile-subset evidence, explicit
  non-runtime closure, or a narrower dependency-rewired Ralph task if either
  row cannot honestly close here.
- Update the unit profile coverage evidence and generated reports so the
  full-support checker owns the result.

Completion / Success Criteria:

- `level1-5-full-support.json` no longer reports `ranger_favored_enemy` or
  `wizard_evocation_savant` in `open-profile-accounting`.
- If either row remains open, this plan has an additional concrete
  dependency-rewired task for that exact row before Task 7 and Task 10 can run.
- The resolution is based on SRD source shape and runtime ownership, not class
  or feature authored identity dispatch.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability for the
  affected class text.
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check` if rules-kernel joins or QNT ownership
  change.
- Focused runtime/QNT tests and the relevant MBT only if this task changes
  battle runtime or QNT parity behavior.

Plan Impact:

- Applied. `ranger_favored_enemy` and `wizard_evocation_savant` now have
  checker-owned `followUpTasks`, so the generated level-1-5 strict gate
  classifies them as `blocked-follow-up-split` instead of
  `open-profile-accounting`.
- Added Tasks 45-46 as dependency-ordered Ralph follow-ups for those exact
  promoted owner slices. They do not block Tasks 7 or 10 because Task 39's
  generated accounting now closes the current strict target by explicit split.

### Task 45 - L12G-FOLLOWUP-RANGER-FAVORED-ENEMY-FREE-CAST-SCALING

Status: `future-follow-up`

Future Follow-up Reason: owner-directed queue control. This is a future-owner follow-up
record created by Task 39 so the current level-1-5 strict accounting can close
by explicit split. It does not block Tasks 7 or 10 and is parked outside this
combined L5 ultra-golden plus L6 horizontal completion pass.

Depends on: `L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- Ranger Favored Enemy Surface feature mechanics and `grant_spell_free_casts`
  facts
- Relevant SRD Ranger class text under `.references/srd-5.2.1/Classes/Ranger.md`
- `UBIQUITOUS_LANGUAGE.md`
- Character Sheet resource projection, Character Battle handoff, battle runtime,
  QNT, and MBT owners for class-feature spell free-cast resources

Current state:

- Favored Enemy currently has profile-subset support for always-prepared
  Hunter's Mark access, the two-use Ranger level 1 free-cast resource, Long Rest
  reset, existing marked-damage-rider invocation, Concentration, Bonus Action
  cost, and Spell Slot fallback.
- Task 39 records the follow-up split for later Ranger-level free-cast count
  scaling. The SRD first brings that residual into level-1-5 scope at Ranger
  level 5.

Output:

- Promote Favored Enemy's Ranger-level free-cast count scaling from Surface
  `grant_spell_free_casts` class-level tiers through Character Sheet resource
  projection, Character Battle handoff, and any required battle-runtime
  resource model.
- Include the Ranger level 5 capacity increase to three Hunter's Mark free
  casts while preserving the existing marked-damage rider, Concentration,
  Bonus Action, Long Rest reset, and Spell Slot fallback behavior.
- Do not add duplicate free-cast state and do not dispatch on authored class,
  feature, or spell identity.

Completion / Success Criteria:

- `ranger_favored_enemy` has a supported-profile or profile-subset-supported
  claim update with deterministic admission/resource projection evidence.
- Focused Character Sheet and Character Battle runtime tests cover the scaled
  free-cast capacity and existing Hunter's Mark behavior.
- Promoted Quint/runtime parity is updated if the battle resource model changes.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check` if rules-kernel joins or QNT ownership
  change.
- Focused runtime/QNT tests and relevant MBT only if runtime or QNT parity
  behavior changes.

### Task 46 - L12G-FOLLOWUP-WIZARD-EVOCATION-SAVANT-NEW-SLOT-LEVEL

Status: `future-follow-up`

Future Follow-up Reason: owner-directed queue control. This is a future-owner follow-up
record created by Task 39 so the current level-1-5 strict accounting can close
by explicit split. It does not block Tasks 7 or 10 and is parked outside this
combined L5 ultra-golden plus L6 horizontal completion pass.

Depends on: `L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- Wizard Evocation Savant Surface feature mechanics and
  `wizard_spellbook_learning` facts
- Relevant SRD Wizard class text under `.references/srd-5.2.1/Classes/Wizard.md`
- `UBIQUITOUS_LANGUAGE.md`
- Character Creation class-level advancement, Wizard spellbook learning, QNT,
  and runtime replay owners

Current state:

- Evocation Savant currently has profile-subset support for the level-3
  acquisition-time two-spell Evocation spellbook choice, retained subclass
  feature Unit refs, duplicate spellbook rejection, and the replay evidence that
  the later new Spell Slot level grant does not create a level-3 Character
  Creation hole.
- Task 39 records the follow-up split for the later grant. The SRD first brings
  that residual into level-1-5 scope when the Wizard gains level 3 Spell Slots
  at Wizard level 5.

Output:

- Promote Evocation Savant's `new_spell_slot_level_access` grant when a Wizard
  later gains access to a new Wizard Spell Slot level after subclass
  acquisition.
- Discover and finalize exactly one eligible Wizard Evocation spell into the
  existing Wizard spellbook without duplicating spellbook state, duplicating an
  Evoker spell roster, or dispatching on authored feature or spell identity.
- Preserve the existing acquisition-time level-3 choices and duplicate
  spellbook rejection behavior.

Completion / Success Criteria:

- `wizard_evocation_savant` has a supported-profile or profile-subset-supported
  claim update with focused Character Creation advancement evidence.
- Focused runtime and QNT replay cover the level-5 new Spell Slot level grant,
  duplicate spellbook rejection, and preservation of the existing
  acquisition-time level-3 choices.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check` if rules-kernel joins or QNT ownership
  change.
- Focused runtime/QNT tests and relevant MBT only if runtime or QNT parity
  behavior changes.

### Task 47 - L6-FOLLOWUP-REPEATED-ASI-GRANT-OCCURRENCE

Status: `future-follow-up`

Future Follow-up Reason: Task 16 closed the current Fighter level-6 ASI row by
explicit non-admission, but the durable owner for repeated ASI grant occurrences
is still a separate character-creation/catalog modeling problem. This follow-up
does not block Task 27 because the current L6 row is checker-closed as
`catalog-only/dead-for-now`.

Depends on: `L6FULL-ASI-01-FIGHTER-ASI-L6`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Fighter.md:36`
- `.references/srd-5.2.1/Classes/Fighter.md:90`
- `packages/surface/content/fighter_ability_score_improvement_l4.json`
- `packages/surface/content/class_fighter.json`
- `packages/character-creation-runtime/src/index.test.ts`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The level-4 Fighter Ability Score Improvement feature record is installed and
  closed as a selection-grant container whose selected feat Units own executable
  behavior.
- The Fighter level-6 ASI mined row is not installed and is checker-closed by
  Task 16 as a repeated grant occurrence, because the current catalog boundary
  cannot admit the second ASI without either duplicating level-4 ASI rule text
  or installing incomplete Fighter level-6 progression.

Output:

- Promote a catalog-backed repeated ASI grant-occurrence model that can admit
  Fighter level 6 and adjacent repeated ASI grants from existing SRD ASI source
  facts without duplicating derived state or copied rule text.
- Keep selected feat Units as the executable owners and keep ASI ability-score
  mutation in character-creation or character-sheet state, not battle runtime.
- Do not dispatch on authored class, feature, or level-4/level-6 synthetic row
  identity in runtime semantics.

Completion / Success Criteria:

- Repeated ASI grant occurrences are represented by a domain-backed Surface and
  character-creation model that makes level-4 versus level-6 ownership
  unambiguous.
- `fighter_ability_score_improvement_l6` is either admitted with real catalog
  and character-creation evidence or remains explicitly closed for a narrower
  durable reason discovered by this follow-up.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused character-creation runtime tests if creation or advancement behavior
  changes.

### Task 48 - L6-FOLLOWUP-BARBARIAN-MINDLESS-RAGE-CONDITION-IMMUNITY

Status: `future-follow-up`

Future Follow-up Reason: Task 17 closed the current Barbarian Mindless Rage row
by explicit non-admission, but the durable owner for subclass-gated active Rage
Charmed/Frightened immunity and enter-rage cleanup is still a separate
battle-runtime/catalog modeling problem. This follow-up does not block Task 27
because the current L6 row is checker-closed as `catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-01-BARBARIAN-MINDLESS-RAGE`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Barbarian.md:182`
- `packages/battle-runtime/src/battle-reducer.ts`
- `packages/battle-runtime/src/battle-reducer/barbarian-frenzy.ts`
- `packages/battle-runtime/src/active-effect/types.ts`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Barbarian Rage owner supports activation, use-count spend,
  duration/extension, Bludgeoning/Piercing/Slashing Resistance, Rage Damage,
  Concentration break/prevention, and spellcasting restriction.
- The Barbarian Mindless Rage mined row is not installed and is checker-closed
  by Task 17 because current promoted owners do not admit subclass-gated active
  Rage Charmed/Frightened immunity or remove existing Charmed/Frightened active
  effects on entering Rage.

Output:

- Promote a Surface and battle-runtime owner that consumes typed Berserker
  feature facts, derives Charmed/Frightened immunity from the active Rage
  occurrence, and removes existing Charmed/Frightened effects when Rage starts.
- Preserve the existing Rage occurrence as the active runtime fact; do not
  duplicate Rage state, condition state, subclass selection state, or dispatch
  on authored class/subclass/feature identity.
- Update focused QNT/runtime parity and owner evidence if the row is admitted.

Completion / Success Criteria:

- `barbarian_mindless_rage` is either admitted with real catalog,
  battle-runtime, and parity evidence or remains explicitly closed for a
  narrower durable reason discovered by this follow-up.
- The implementation makes the active-Rage immunity and enter-rage cleanup
  boundary executable without overclaiming generic condition immunity support.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused battle-runtime tests and focused MBT only if battle runtime or QNT
  parity behavior changes.

### Task 49 - L6-FOLLOWUP-BARD-MAGICAL-DISCOVERIES-SPELL-ACCESS

Status: `future-follow-up`

Future Follow-up Reason: Task 18 closed the current Bard Magical Discoveries
row by explicit non-admission, but the durable owner for cross-list
always-prepared spell choices and Bard-level replacement is still a separate
character-creation, Character Sheet, and catalog modeling problem. This
follow-up does not block Task 27 because the current L6 row is checker-closed
as `catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-02-BARD-MAGICAL-DISCOVERIES`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Bard.md:336`
- `packages/surface/content/subclass_bard_college_of_lore.json`
- `packages/surface/content/class_bard.json`
- `packages/character-creation-runtime/src/index.test.ts`
- `packages/character-sheet-runtime/src/class-feature-spells.test.ts`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Surface catalog has the College of Lore subclass record and installed
  level-3 Lore feature rows, but no installed `bard_magical_discoveries`
  feature record.
- Bard class spellcasting already owns prepared-spell counts, ordinary Bard
  Spell Access, and Bard Spell Slot facts. Current promoted spell-access
  owners do not admit a College of Lore level-6 choice of exactly two
  always-prepared spells from the Cleric, Druid, or Wizard spell lists with
  Bard-level replacement.

Output:

- Promote a Surface, Character Creation, and Character Sheet owner that
  consumes typed College of Lore feature facts, canonical spell-list facts, and
  Bard Spell Slot facts to choose exactly two eligible spells.
- Model eligibility as Cleric, Druid, or Wizard list membership plus cantrip or
  Bard Spell Slot eligibility, and model replacement of one chosen spell when
  the character gains a Bard level.
- Retain the selected spells as source-scoped Spell Access facts without
  duplicating the prepared-spell list, duplicating Spell Slot state, or
  dispatching on authored Bard, College of Lore, Magical Discoveries, or
  selected Spell Definition identity.
- Keep individual Spell Definition invocation behavior owned by spell
  invocation profiles.

Completion / Success Criteria:

- `bard_magical_discoveries` is either admitted with real catalog,
  Character Creation, Character Sheet, and evidence updates or remains
  explicitly closed for a narrower durable reason discovered by this follow-up.
- The implementation makes eligibility and Bard-level replacement executable
  without overclaiming generic cross-list spell-choice support.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused character-creation and Character Sheet tests if creation,
  advancement, or sheet projection behavior changes.

### Task 50 - L6-FOLLOWUP-CLERIC-BLESSED-HEALER-SPELL-HEALING-RIDER

Status: `future-follow-up`

Future Follow-up Reason: Task 19 closed the current Cleric Blessed Healer row
by explicit non-admission, but the durable owner for selected Life Domain
post-cast self-healing is still a separate Surface, battle-runtime, and parity
modeling problem. This follow-up does not block Task 27 because the current L6
row is checker-closed as `catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-03-CLERIC-BLESSED-HEALER`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Cleric.md:334`
- `packages/surface/content/subclass_cleric_life_domain.json`
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/direct-hit-point-restoration.ts`
- `packages/battle-runtime/src/battle-reducer/damage-apply.ts`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Surface catalog has the Life Domain subclass record and installed
  level-3 Life Domain feature rows, but no installed `cleric_blessed_healer`
  feature record or selected level-6 feature grant.
- Promoted `spell.hit-point-restoration` owners spend Spell Slots, select
  healing targets, and restore Hit Points for Cure Wounds, Healing Word, Mass
  Cure Wounds, and Mass Healing Word.
- The promoted `unit-feature.spell-slot-healing-modifier` owner applies
  Disciple of Life's 2 plus Spell Slot level bonus to each healed target. It
  does not admit a selected-feature post-cast self-heal for the caster once a
  qualifying spell restores Hit Points to at least one other creature.

Output:

- Promote a Surface and battle-runtime owner that consumes typed selected Life
  Domain feature facts, the existing Spell Slot invocation level, and the
  resolved healed-target set with at least one non-caster target.
- Apply the caster's 2 plus Spell Slot level Hit Point restoration through the
  shared healing transition immediately after the qualifying spell cast.
- Preserve the existing Spell Slot, prepared Spell Access, healing target, Hit
  Point, and subclass selection owners; do not add parallel state or dispatch
  on authored Cleric, Life Domain, Blessed Healer, or healing spell identity.
- Update focused QNT/runtime parity and owner evidence if the row is admitted.

Completion / Success Criteria:

- `cleric_blessed_healer` is either admitted with real catalog,
  battle-runtime, and parity evidence or remains explicitly closed for a
  narrower durable reason discovered by this follow-up.
- The implementation makes the post-cast self-heal boundary executable without
  overclaiming generic spell-healing rider support.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused spell/healing runtime tests and focused MBT only if battle runtime or
  QNT parity behavior changes.

### Task 51 - L6-FOLLOWUP-DRUID-NATURAL-RECOVERY-REST-FEATURE

Status: `future-follow-up`

Future Follow-up Reason: Task 20 closed the current Druid Natural Recovery row
by explicit non-admission, but the durable owner for the selected Circle of the
Land no-slot Circle Spell cast and Short Rest Spell Slot recovery budget is
still a separate Surface and Character Sheet modeling problem. This follow-up
does not block Task 27 because the current L6 row is checker-closed as
`catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-04-DRUID-NATURAL-RECOVERY`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Druid.md:412`
- `packages/surface/content/subclass_druid_circle_of_the_land.json`
- `packages/surface/content/druid_circle_of_the_land_spells.json`
- `packages/character-sheet-runtime/src/healing-rest-benefit.ts`
- `packages/character-sheet-runtime/src/druid-features.ts`
- `packages/character-sheet-runtime/src/class-feature-spells.ts`
- `packages/character-sheet-runtime/src/spell-slots.ts`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Surface catalog has the Circle of the Land subclass record and installed
  level-3 Circle Spells feature, but no installed `druid_natural_recovery`
  feature record or selected level-6 feature grant.
- Promoted `character-sheet.short-rest-spell-slot-recovery` support covers the
  shared Short Rest Spell Slot recovery shape and Long Rest-cleared use state,
  and promoted `character-sheet.druid-circle-land-spell-access` support owns
  selected-land prepared Spell Access from Circle Spells.
- Current promoted owners do not admit a selected level-6 Circle of the Land
  feature that combines the once-per-Long-Rest no-slot Circle Spell cast,
  Druid-level Short Rest Spell Slot recovery budget, existing Circle Spells
  prepared access, and canonical Spell Slot expenditure state.

Output:

- Promote a Surface and Character Sheet owner that consumes typed selected
  Natural Recovery facts, existing Circle Spells prepared access, existing
  Druid class level, and existing Spell Slot expenditure state.
- Admit the once-per-Long-Rest no-slot cast of a prepared level 1+ Circle Spell
  and the Short Rest recovery of expended Spell Slots with a combined level no
  greater than half Druid level rounded up and no level 6+ recovered slot.
- Update the canonical Character Sheet Spell Slot owner and rest-feature use
  state without adding duplicate Spell Slot state, prepared Spell Access,
  subclass selection state, or dispatching on authored Druid, Circle of the
  Land, Natural Recovery, or spell identity.

Completion / Success Criteria:

- `druid_natural_recovery` is either admitted with real catalog, Character
  Sheet, and evidence updates or remains explicitly closed for a narrower
  durable reason discovered by this follow-up.
- The implementation makes the no-slot cast and Short Rest slot recovery
  boundary executable without overclaiming generic rest feature support.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused Character Sheet rest, spell-slot, and Circle Spells tests if rest
  feature behavior changes.

### Task 52 - L6-FOLLOWUP-MONK-EMPOWERED-STRIKES-DAMAGE-TYPE

Status: `future-follow-up`

Future Follow-up Reason: Task 21 closed the current Monk Empowered Strikes row
by explicit non-admission, but the durable owner for selected Monk Unarmed
Strike Force-or-normal damage-type choice is still a separate Surface and
battle-runtime modeling problem. This follow-up does not block Task 27 because
the current L6 row is checker-closed as `catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-05-MONK-EMPOWERED-STRIKES`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Monk.md:128`
- `packages/surface/content/monk_martial_arts.json`
- `packages/surface/content/class_monk.json`
- `packages/battle-runtime/src/battle-reducer/attack-damage-apply.ts`
- `packages/battle-runtime/src/unit-feature-support.ts`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Surface catalog has `monk_martial_arts` installed, and promoted Martial
  Arts support owns Unarmed Strike damage die replacement, Dexterity attack and
  damage projection, Grapple/Shove DC projection, and Bonus Action Unarmed
  Strike discovery.
- The Surface catalog has no installed `monk_empowered_strikes` feature record
  or selected level-6 Monk feature grant.
- Current promoted battle-runtime owners do not admit a selected class-feature
  damage-type choice for Unarmed Strike damage. Existing spell and
  weapon-imbue damage-type-choice holes are scoped to their host profiles.

Output:

- Promote a Surface and battle-runtime owner that consumes typed selected
  Empowered Strikes facts and the existing Unarmed Strike damage profile, then
  offers and validates the SRD Force-or-normal damage-type choice at attack
  damage resolution.
- Preserve existing Unarmed Strike, Martial Arts, class progression, and damage
  resolution owners; do not duplicate their state or dispatch on authored Monk,
  Martial Arts, Empowered Strikes, or class-feature identity.
- Update focused QNT/runtime parity and owner evidence if the row is admitted.

Completion / Success Criteria:

- `monk_empowered_strikes` is either admitted with real catalog,
  battle-runtime, and parity evidence or remains explicitly closed for a
  narrower durable reason discovered by this follow-up.
- The implementation makes the per-damage Unarmed Strike damage-type choice
  executable without overclaiming generic attack damage-type substitution.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused battle-runtime tests and focused MBT only if battle runtime or QNT
  parity behavior changes.

### Task 53 - L6-FOLLOWUP-MONK-WHOLENESS-OF-BODY-SELF-HEALING

Status: `future-follow-up`

Future Follow-up Reason: Task 22 closed the current Monk Wholeness of Body row
by explicit non-admission, but the durable owner for selected Warrior of the
Open Hand Bonus Action self-healing and Long Rest use-count state is still a
separate Surface, Character Sheet, battle-runtime, and parity modeling problem.
This follow-up does not block Task 27 because the current L6 row is
checker-closed as `catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-06-MONK-WHOLENESS-OF-BODY`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Monk.md:202`
- `packages/surface/content/subclass_monk_warrior_of_the_open_hand.json`
- `packages/surface/content/monk_martial_arts.json`
- `packages/character-sheet-runtime/src/resources.ts`
- `packages/character-sheet-runtime/src/healing-rest-benefit.ts`
- `packages/battle-runtime/src/battle-reducer/unit-features.ts`
- `packages/battle-runtime/src/unit-feature-support.ts`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Surface catalog has the Warrior of the Open Hand subclass record and
  installed level-3 Open Hand Technique feature, but no installed
  `monk_wholeness_of_body` feature record or selected level-6 subclass feature
  grant.
- Promoted Martial Arts support owns the Monk-level Martial Arts die
  projection, existing character facts own Wisdom ability scores, and existing
  Hit Point restoration owners apply positive healing through canonical HP
  state.
- Current `unit-feature.self-bonus-action-healing` support is admitted for
  Second Wind's class-level formula and partial Short Rest/full Long Rest reset
  pattern. Current Character Sheet use-count support is limited to typed
  resource profiles such as Wild Shape and Monk's Focus, not arbitrary selected
  feature ids with Wisdom-modifier capacity.

Output:

- Promote a Surface, Character Sheet, and battle-runtime owner that consumes
  typed selected Wholeness of Body feature facts, the existing Martial Arts die
  projection, Wisdom ability modifier facts, Long Rest use state, and Bonus
  Action spend.
- Apply self Hit Point restoration equal to one Martial Arts die roll plus
  Wisdom modifier, minimum 1 Hit Point regained, through the existing HP
  restoration boundary.
- Model the use-count Pool as Wisdom modifier uses, minimum one, with all
  expended uses restored on Long Rest.
- Preserve existing Hit Point, Martial Arts progression, Wisdom ability,
  use-count expenditure, subclass selection, and action-economy owners; do not
  duplicate their state or dispatch on authored Monk, Warrior of the Open Hand,
  Martial Arts, or Wholeness of Body identity.
- Update focused QNT/runtime parity and owner evidence if the row is admitted.

Completion / Success Criteria:

- `monk_wholeness_of_body` is either admitted with real catalog, Character
  Sheet, battle-runtime, and parity evidence or remains explicitly closed for a
  narrower durable reason discovered by this follow-up.
- The implementation makes the feature-resource self-healing boundary
  executable without overclaiming generic arbitrary feature-resource support.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused Character Sheet, battle-runtime, and focused MBT only if resource,
  battle runtime, or QNT parity behavior changes.

### Task 54 - L6-FOLLOWUP-PALADIN-AURA-OF-PROTECTION-SAVE-BONUS

Status: `future-follow-up`

Future Follow-up Reason: Task 23 closed the current Paladin Aura of Protection
row by explicit non-admission, but the durable owner for selected passive
class-feature aura membership and Saving Throw bonus projection is still a
separate Surface, character-battle, battle-runtime, and parity modeling
problem. This follow-up does not block Task 27 because the current L6 row is
checker-closed as `catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-07-PALADIN-AURA-OF-PROTECTION`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Paladin.md:136`
- `packages/battle-runtime/src/battle-reducer`
- `packages/battle-runtime/src/active-effect`
- `packages/character-battle-runtime`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Surface catalog has no installed `paladin_aura_of_protection` feature
  record or selected level-6 Paladin feature grant.
- Existing character facts own Paladin level and Charisma ability state,
  existing condition state owns Incapacitated, and existing save procedure
  owners resolve Saving Throws.
- Current promoted spell aura support consumes caller/table-supplied area
  membership for spell-specific occurrences, but promoted owners do not admit a
  selected passive class-feature Emanation with ally membership, source
  Charisma bonus projection, inactive-while-Incapacitated gating, or
  overlapping Paladin aura choice.

Output:

- Promote a Surface, character-battle, and battle-runtime owner that consumes
  typed selected Aura of Protection feature facts, existing character and
  condition state, explicit aura-membership witnesses, and the shared Saving
  Throw roll modifier boundary.
- Project the Charisma-modifier Saving Throw bonus with a minimum of +1 only
  while the affected creature is the Paladin or an ally in the active 10-foot
  Emanation.
- Model overlapping Paladin Aura of Protection choice as an explicit witness or
  fill at the Saving Throw modifier boundary.
- Preserve existing Character Sheet ability state, condition state, table
  position state, Saving Throw result state, and aura membership witnesses; do
  not duplicate them or dispatch on authored Paladin or Aura of Protection
  identity.
- Update focused QNT/runtime parity and owner evidence if the row is admitted.

Completion / Success Criteria:

- `paladin_aura_of_protection` is either admitted with real catalog,
  character-battle, battle-runtime, and parity evidence or remains explicitly
  closed for a narrower durable reason discovered by this follow-up.
- The implementation makes passive class-feature aura membership and Saving
  Throw bonus projection executable without overclaiming generic aura or roll
  modifier support.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused battle-runtime tests and focused MBT only if battle runtime or QNT
  parity behavior changes.

### Task 55 - L6-FOLLOWUP-SORCERER-ELEMENTAL-AFFINITY-DAMAGE

Status: `future-follow-up`

Future Follow-up Reason: Task 24 closed the current Sorcerer Elemental
Affinity row by explicit non-admission, but the durable owner for selected
Elemental Affinity damage type, passive Resistance, and the one-roll spell
damage Charisma modifier is still a separate Surface, Character Sheet,
battle-runtime, and parity modeling problem. This follow-up does not block
Task 27 because the current L6 row is checker-closed as
`catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-08-SORCERER-ELEMENTAL-AFFINITY`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Sorcerer.md:432`
- `packages/surface/content/subclass_sorcerer_draconic_sorcery.json`
- `packages/battle-runtime/src/unit-feature-support.ts`
- `packages/battle-runtime/src/battle-reducer/damage-helpers.ts`
- `packages/battle-runtime/src/battle-reducer/spells-damage-fills.ts`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Surface catalog has the Draconic Sorcery subclass record and installed
  level-3 Draconic Resilience/Draconic Spells features, but no installed
  `sorcerer_elemental_affinity` feature record or selected level-6 subclass
  feature grant.
- Existing passive damage Resistance support owns fixed/species Draconic
  Ancestry Resistance only; it does not admit selected class-feature
  damage-type source facts.
- Existing spell damage owners roll/apply damage and some spell damage
  modifiers, but promoted owners do not admit a passive selected-feature
  Charisma modifier to exactly one damage roll of a qualifying spell.
- SRD 5.2.1 Elemental Affinity has no Sorcery Point spend.

Output:

- Promote Surface, Character Sheet, and battle-runtime owners that consume
  typed selected Elemental Affinity facts and one chosen Acid/Cold/Fire/
  Lightning/Poison damage type.
- Retain the single chosen type as character-owned source fact, and derive both
  passive target-side Resistance and spell damage-roll eligibility from it.
- Project passive Resistance through the shared damage adjustment boundary.
- Project the optional Charisma modifier onto exactly one damage roll of a
  spell that deals the chosen type.
- Preserve existing Spell Slot, spell access/invocation, spell damage
  dice/amount, character ability, target-side damage adjustment, Sorcery Point,
  and subclass selection owners; no authored Sorcerer/Draconic Sorcery/
  Elemental Affinity/spell identity dispatch.
- Update focused QNT/runtime parity and owner evidence if the row is admitted.

Completion / Success Criteria:

- `sorcerer_elemental_affinity` is either admitted with real catalog,
  Character Sheet, battle-runtime, and parity evidence or remains explicitly
  closed for a narrower durable reason discovered by this follow-up.
- The implementation makes the linked selected damage type, passive Resistance,
  and one-roll spell damage modifier executable without overclaiming generic
  class-feature damage-affinity support.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused spell/runtime tests and focused MBT only if battle runtime or QNT
  parity behavior changes.

### Task 56 - L6-FOLLOWUP-WARLOCK-DARK-ONES-OWN-LUCK-D20-MODIFIER

Status: `future-follow-up`

Future Follow-up Reason: Task 25 closed the current Warlock Dark One's Own Luck
row by explicit non-admission, but the durable owner for the selected Fiend
Patron Long Rest resource and reactionless Ability Check and Saving Throw d10
modifier is still a separate Surface, Character Sheet, battle-runtime, and
parity modeling problem. This follow-up does not block Task 27 because the
current L6 row is checker-closed as `catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-09-WARLOCK-DARK-ONES-OWN-LUCK`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Warlock.md:477`
- `packages/surface/content/subclass_warlock_fiend_patron.json`
- `packages/battle-runtime/src/unit-feature-support.ts`
- `packages/battle-runtime/src/battle-reducer`
- `packages/character-sheet-runtime`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Surface catalog has the Fiend Patron subclass record and installed
  level-3 Fiend Spells/Dark One's Blessing features, but no installed
  `warlock_dark_ones_own_luck` feature record or selected level-6 subclass
  feature grant.
- Existing Fighter Tactical Mind support is limited to failed Ability Checks
  that spend Second Wind and may refund the spend.
- Existing Bardic Inspiration support is a granted held die spent after an
  already failed D20 Test, existing spell roll-modifier support is active Spell
  Effect state, and existing reaction roll-reduction support spends a Reaction.
- Promoted owners do not admit a selected-feature, reactionless Ability Check
  and Saving Throw modifier window with its own Charisma-modifier Long Rest
  use pool and no-more-than-once-per-roll gate.

Output:

- Promote Surface, Character Sheet, and runtime owners that consume typed
  selected Dark One's Own Luck feature facts, existing Charisma ability state,
  existing Ability Check and Saving Throw roll/result boundaries, and canonical
  Long Rest resource state.
- Project the optional 1d10 modifier only after the roll is known and before
  the roll's effects occur.
- Enforce uses equal to Charisma modifier with a minimum of one, Long Rest
  recovery, and at most one Dark One's Own Luck use per eligible roll.
- Preserve existing D20 roll, Ability Check, Saving Throw, character ability,
  rest resource, and subclass selection owners; no authored Warlock/Fiend
  Patron/Dark One's Own Luck identity dispatch.
- Update focused QNT/runtime parity and owner evidence if the row is admitted.

Completion / Success Criteria:

- `warlock_dark_ones_own_luck` is either admitted with real catalog, Character
  Sheet, runtime, and parity evidence or remains explicitly closed for a
  narrower durable reason discovered by this follow-up.
- The implementation makes the selected feature resource and reactionless
  Ability Check and Saving Throw d10 modifier executable without overclaiming
  generic Ability Check and Saving Throw modifier support.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused runtime tests and focused MBT only if battle runtime or QNT parity
  behavior changes.

### Task 57 - L6-FOLLOWUP-WIZARD-SCULPT-SPELLS-SAVE-DAMAGE-EXEMPTION

Status: `future-follow-up`

Future Follow-up Reason: Task 26 closed the current Wizard Sculpt Spells row by
explicit non-admission, but the durable owner for selected protected creatures
inside eligible Evocation spell effects is still a separate Surface,
battle-runtime, and parity modeling problem. This follow-up does not block Task
27 because the current L6 row is checker-closed as `catalog-only/dead-for-now`.

Depends on: `L6FULL-OWN-10-WIZARD-SCULPT-SPELLS`

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Wizard.md:421`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md:61-64`
- `packages/surface/content/subclass_wizard_evoker.json`
- `packages/battle-runtime/src/unit-feature-support.ts`
- `packages/battle-runtime/src/battle-reducer`
- `packages/shared-algebras/proofs/rule-core`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The Surface catalog has the Evoker subclass record and installed level-3
  Evocation Savant/Potent Cantrip features, but no installed
  `wizard_sculpt_spells` feature record or selected level-6 subclass feature
  grant.
- Existing spell invocation owners can represent Spell Definition School of
  Magic, effective spell level for a casting, affected-creature or area
  witnesses, Saving Throw outcomes, half-damage success branches, and damage
  application.
- Promoted owners do not admit a selected class-feature pre-save exemption
  choice over visible affected creatures that forces successful Saving Throws
  and replaces normal successful-save half damage with no damage.

Output:

- Promote Surface and battle-runtime owners that consume typed selected Sculpt
  Spells feature facts, the existing Spell Definition School of Magic fact, the
  spell invocation's effective spell level for that casting, existing affected
  creature or area membership witnesses, caster sight witnesses, and the shared
  Saving Throw/save-damage boundary.
- Enforce the protected-creature choice limit of 1 plus the spell's effective
  level for the casting.
- Make selected protected creatures automatically succeed on their Saving
  Throws against the spell.
- Replace normal successful-save half damage with no damage for selected
  protected creatures only when the underlying spell would normally deal half
  damage on a successful save.
- Preserve existing spell identity, effective spell level, area membership,
  line-of-sight, target selection, Saving Throw result, damage, subclass
  selection, and Spell Slot owners; no authored Wizard/Evoker/Sculpt
  Spells/spell identity dispatch.
- Update focused QNT/runtime parity and owner evidence if the row is admitted.

Completion / Success Criteria:

- `wizard_sculpt_spells` is either admitted with real catalog, runtime, and
  parity evidence or remains explicitly closed for a narrower durable reason
  discovered by this follow-up.
- The implementation makes selected area spell save-damage exemption executable
  without overclaiming generic Evocation spell support or duplicating spell,
  table/spatial, sight, Saving Throw, or damage state.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability.
- `pnpm unit-profile-coverage:check`
- Focused spell/runtime tests and focused MBT only if battle runtime or QNT
  parity behavior changes.

### Task 40 - L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES

Status: `done`

Depends on: `L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION`

Inputs:

- `plans/unit-profile-coverage/level1-5-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_5_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- Existing selected-identity MBT/runtime-test owners named in
  `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- Relevant SRD spell text under `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- `level1-5-full-support.json` reports selected-identity readiness blockers
  for `glyph_of_warding`, `haste`, `protection_from_energy`, `sleet_storm`,
  and `slow`.
- `level-1-5` MBT/parity evidence already passes for reducer-semantic
  obligations. These five rows are selected Unit identity replay gaps, not MCP
  scenario evidence gaps.

Output:

- Add legitimate selected-identity replay evidence for the five Unit ids, or
  update the claim/closure if a row is not actually selected-identity
  applicable.
- Preserve the separation between selected-identity evidence, rules-kernel
  parity evidence, and MCP scenario evidence. Do not use SDK or MCP scenarios
  as selected-identity or parity witnesses unless the checker explicitly
  admits that witness kind.
- Refresh generated unit-profile and ultra-golden reports after the evidence
  changes.

Completion / Success Criteria:

- `level1-5-full-support.json` reports zero selected-identity blockers for
  `glyph_of_warding`, `haste`, `protection_from_energy`, `sleet_storm`, and
  `slow`.
- `ULTRA_GOLDEN_GATE.md` continues to show `level-1-5` QNT/generator readiness
  and MBT/parity evidence as checker-owned pass layers.
- If any selected-identity row remains open, this plan has an additional
  concrete dependency-rewired task for that exact row before Task 7 and Task 10
  can run.

Verification:

- Shared verification, including RAW/ubiquitous-language traceability for the
  affected spell text.
- `pnpm unit-profile-coverage:check`
- Focused selected-identity runtime tests or MBT as required by the evidence
  owner. If MBT is required, use the repo MBT scarcity and background/timing
  protocol.

Plan Impact:

- Applied. Added checker-visible selected-identity MBT evidence for
  `glyph_of_warding`, `haste`, `protection_from_energy`, `sleet_storm`, and
  `slow` through the focused level-3 spell selected-identity owner.
- `level1-5-full-support.json` now reports zero selected-identity blockers for
  those five Units, and the generated level-1-5 support-completeness gate
  passes.
- `ULTRA_GOLDEN_GATE.md` still keeps `level-1-5` blocked on MCP scenario
  evidence, so Tasks 7 and 10 remain scoped to their existing MCP dependencies
  rather than being completed by selected-identity evidence.

### Task 5 - L5UG-MCP-01-LEVEL5-VERTICAL-DECISION

Status: `done`

Depends on: `L5UG-PRE-01-L5-FULL-QUEUE-CLOSED`

Inputs:

- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- L4 uses the executable MCP scenario
  `create-level-four-wizard-asi-and-battle-handoff`.
- L5 needs a comparable user-facing vertical that proves level-5 character
  state, spell access, durable Character Sheet projection, and battle handoff.

Output:

- Write `plans/unit-profile-coverage/L5_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`.
- Choose the smallest honest SRD-only level-5 MCP vertical.
- Prefer a Wizard or other class path that can prove level-3 spell access and
  battle handoff using already-supported level-5 behavior after the completed
  L5 full SRD baseline.
- Record exact local SRD anchors, existing owner boundaries, selected Unit or
  spell candidates, expected Spell Slot projection, and why the vertical covers
  the required MCP flows.
- Update Tasks 6 and 7 in this plan if the chosen scenario requires more
  precise acceptance than the defaults below.

Completion / Success Criteria:

- The decision artifact names one primary scenario and rejects plausible
  alternatives with concrete reasons.
- The chosen scenario does not depend on future-owner-before-SDK rows.
- The scenario can be executed through MCP-returned holes/tool state rather than
  hard-coded internal state.

Verification:

- RAW/ubiquitous-language check for the selected class and spell anchors.
- `git diff --check`.

Plan Impact:

- Applied. Added
  `plans/unit-profile-coverage/L5_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`,
  selecting `create-level-five-wizard-fireball-and-battle-handoff` as the
  SRD-only level-5 MCP vertical.
- Task 6 is unblocked and narrowed to the Wizard 5 Fireball creation, finalized
  Character Sheet, Fireball Spell Access, and 4/3/2 Spell Slot projection
  acceptance target.
- Task 7 remains blocked on Task 6 and is narrowed to the same finalized
  character's battle handoff, Fireball act discovery/resolution, and level-3
  Spell Slot expenditure target.

### Task 6 - L5UG-MCP-02-LEVEL5-SHEET-SCENARIO

Status: `done`

Depends on: `L5UG-MCP-01-LEVEL5-VERTICAL-DECISION`

Inputs:

- Task 5 output:
  `plans/unit-profile-coverage/L5_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/character-tools.ts`
- `packages/mcp/src/protocol-server.ts`
- Local SRD anchors named by the Task 5 decision artifact:
  Wizard level 5 table, Wizard spellbook progression, Wizard subclass,
  Memorize Spell exclusion, Wizard level-3 spell list, Fireball description,
  and project Spell Access/Spell Slot vocabulary.

Current state:

- MCP tests currently include level-3 and level-4 verticals, but no level-5
  vertical.

Output:

- Add the level-5 MCP scenario helper and creation/finalization path in
  `packages/mcp/test-support/mcp-acceptance-scenarios.ts`.
- Create an Elf Soldier Wizard 5 through MCP-returned holes/tool state, selecting
  the returned Wizard 5 progression option, Evoker subclass path, Wizard
  cantrips, Wizard spellbook, prepared spells, equipment, loadout, and any
  current Wizard feature holes returned by the workflow.
- Include `fireball` in both the Wizard spellbook and prepared Spell Access.
  Prefer one additional supported level-3 Wizard spell such as
  `lightning_bolt` or `counterspell` for the second level-5 spellbook addition,
  but do not make that second spell the behavior under test.
- Prove durable Character Sheet state for the finalized Wizard 5 before battle
  starts.
- Keep battle start or battle action assertions out of this task unless they
  are needed to make the helper compile.

Completion / Success Criteria:

- The scenario can create or advance the selected SRD level-5 character through
  MCP-returned holes/tool state.
- The Character Sheet exposes Wizard 5, Fireball Spell Access through the
  spellbook/prepared-spell projection, and Spell Slots 4/3/2 with zero
  expenditure without duplicate Spell Slot state.
- The helper follows returned revisions, hole ids, and option ids.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- Shared verification.

### Task 7 - L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF

Status: `done`

Depends on: `L5UG-MCP-02-LEVEL5-SHEET-SCENARIO`,
`L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING`,
`L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS`,
`L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES`

Inputs:

- The level-5 sheet scenario helper from Task 6.
- Task 5 output:
  `plans/unit-profile-coverage/L5_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- Battle handoff and selected Fireball behavior owners named by the Task 5
  decision.
- Current Task 4 non-MCP layer reconciliation result.
- Completed non-MCP blocker tasks 38, 39, and 40.

Current state:

- Task 6 proves the level-5 character/sheet path.
- This task owns only battle handoff and the selected supported level-5 battle
  behavior.

Output:

- Extend the Task 6 scenario through `start_battle`.
- Inspect battle projection for the finalized Wizard 5 character.
- Discover the Fireball act through returned `discover_battle_acts` labels or
  subject payloads without adding production spell-id dispatch.
- If exercising Fireball, fill returned battle holes with caller-supplied
  `fireballArea`, explicit `objectIgnitionFacts`, and rolled dice facts, then
  assert one level-3 Spell Slot is spent.

Completion / Success Criteria:

- The battle starts from the durable character created by the level-5 scenario.
- Battle handoff exposes Wizard 5 state and Spell Slots 4/3/2 before Fireball.
- If Fireball is resolved, the post-Fireball battle projection is Spell Slots
  4/3/2 with one level-3 slot expended.
- The scenario follows returned battle ids, combatant ids, and battle holes.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- Shared verification.

### Task 8 - L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY

Status: `done`

Depends on: `L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF`

Inputs:

- The executable level-5 MCP scenario from Tasks 6 and 7.
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/mcp-protocol.test.ts`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`

Current state:

- The executable scenario must be listed in MCP acceptance metadata before the
  evidence manifest can cite it.

Output:

- Add the level-5 scenario to the MCP acceptance scenario registry.
- Register the scenario in `packages/mcp/src/mcp-protocol.test.ts` or the
  package-local acceptance runner entry point used by the registry.
- Preserve existing level-1 through level-4 scenarios.

Completion / Success Criteria:

- `verifyAgentConversationScenarios` and the protocol acceptance test include
  the level-5 scenario.
- The scenario id is stable and suitable for
  `plans/unit-profile-coverage/mcp-scenario-evidence.json`.
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence` passes.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `git diff --check`.

### Task 9 - L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE

Status: `done`

Depends on: `L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY`

Inputs:

- Registered scenario id from Task 8.
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`
- `scripts/ultra-golden-gate.cjs`
- Existing level-1 through level-1-4 MCP evidence rows.

Current state:

- `plans/unit-profile-coverage/mcp-scenario-evidence.json` currently records
  required MCP flows through `level-1-4`.

Output:

- Add `level-1-5` to the required MCP flow scope where appropriate.
- Add checker-owned MCP scenario evidence rows for the executable level-5
  scenario.
- Add or update the level-1-5 MCP scope audit decision so evidence admission is
  explicit and checker-owned.
- If any required flow lacks executable evidence, do not admit a placeholder
  closure. Add concrete Ralph implementation tasks and update `ralph-task-index`,
  `## DAG / Queue Order`, and this task's dependencies so this task cannot
  complete before those tasks land.

Completion / Success Criteria:

- `packages/mcp/src/mcp-scenario-evidence.test.ts` accepts the manifest.
- Every `level-1-5` required flow has executable `mcp-scenario` evidence.
- If executable evidence is still missing for any required flow, this task is
  not complete and must stay non-done with dependency-rewired follow-up tasks in
  the plan.
- The manifest references real repo-relative owner and test paths.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- Shared verification.

### Task 10 - L5UG-FINAL-01-ULTRA-GOLDEN-REFRESH

Status: `done`

Depends on: `L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE`,
`L5UG-GATE-02-LEVEL15-OPEN-SPELL-EFFECT-ACCOUNTING`,
`L5UG-GATE-03-LEVEL15-LATER-LEVEL-RESIDUALS`,
`L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES`

Inputs:

- All generated artifacts touched by Tasks 2, 3, 4, 9, 38, 39, and 40.
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- `plans/unit-profile-coverage/ultra-golden-gate.json`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- Shared verification command output.

Current state:

- The final generated reports must be refreshed only after scope, non-MCP
  layers, and MCP evidence are all reconciled.

Output:

- Regenerate unit-profile and ultra-golden artifacts.
- Confirm `level-1-5` passes every ultra-golden layer.
- Update planning text only when a durable new fact was learned during the
  queue.

Completion / Success Criteria:

- `ULTRA_GOLDEN_GATE.md` reports `level-1-5` as pass across support
  completeness, QNT/generator readiness, MBT/parity evidence, and MCP scenario
  evidence.
- `plans/unit-profile-coverage/ultra-golden-gate.json` records the same result.
- Existing level-1 through level-1-4 results remain pass.
- No new broad TODO or prose-only blocker remains in this plan.
- Task 11 is unblocked only after this task is accepted.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `git diff --check`

Plan Impact:

- Applied. The generated unit-profile and ultra-golden artifacts were already
  current after the dependency tasks; the refresh lands as a verification-only
  no-op with `level-1-5` passing the ultra-golden gate.
- Task 11 is unblocked for research.

## L6 RAW Anchors

| Row | Anchor |
| --- | ------ |
| Barbarian table | `.references/srd-5.2.1/Classes/Barbarian.md:40` |
| Barbarian Mindless Rage | `.references/srd-5.2.1/Classes/Barbarian.md:182` |
| Bard table | `.references/srd-5.2.1/Classes/Bard.md:41` |
| Bard Magical Discoveries | `.references/srd-5.2.1/Classes/Bard.md:336` |
| Cleric table | `.references/srd-5.2.1/Classes/Cleric.md:40` |
| Cleric Blessed Healer | `.references/srd-5.2.1/Classes/Cleric.md:334` |
| Druid table | `.references/srd-5.2.1/Classes/Druid.md:37` |
| Druid Natural Recovery | `.references/srd-5.2.1/Classes/Druid.md:412` |
| Fighter table and repeated ASI | `.references/srd-5.2.1/Classes/Fighter.md:36`, `.references/srd-5.2.1/Classes/Fighter.md:90` |
| Monk table | `.references/srd-5.2.1/Classes/Monk.md:37` |
| Monk Empowered Strikes | `.references/srd-5.2.1/Classes/Monk.md:128` |
| Monk Wholeness of Body | `.references/srd-5.2.1/Classes/Monk.md:202` |
| Paladin table | `.references/srd-5.2.1/Classes/Paladin.md:40` |
| Paladin Aura of Protection | `.references/srd-5.2.1/Classes/Paladin.md:136` |
| Ranger table | `.references/srd-5.2.1/Classes/Ranger.md:40` |
| Ranger Roving | `.references/srd-5.2.1/Classes/Ranger.md:114` |
| Rogue table | `.references/srd-5.2.1/Classes/Rogue.md:41` |
| Rogue Expertise | `.references/srd-5.2.1/Classes/Rogue.md:57` |
| Sorcerer table | `.references/srd-5.2.1/Classes/Sorcerer.md:40` |
| Sorcerer Elemental Affinity | `.references/srd-5.2.1/Classes/Sorcerer.md:432` |
| Warlock table | `.references/srd-5.2.1/Classes/Warlock.md:40` |
| Warlock Dark One's Own Luck | `.references/srd-5.2.1/Classes/Warlock.md:477` |
| Wizard table | `.references/srd-5.2.1/Classes/Wizard.md:40` |
| Wizard Sculpt Spells | `.references/srd-5.2.1/Classes/Wizard.md:421` |

## L6 Closure Protocol

Every L6 full-support task must read its RAW anchor and
`UBIQUITOUS_LANGUAGE.md` before changing code or accounting. For each row,
choose one checker-readable outcome:

- Existing support verified: preserve installed SRD catalog data and owner
  evidence, and do not duplicate state already owned by Surface, Character
  Creation, Character Sheet, battle runtime, QNT, or generated accounting.
- New support admitted: author SRD-only Surface records if missing, add the
  narrowest support profile and owner evidence, and add focused tests for the
  package whose owner actually executes or projects the rule.
- Future-owner-before-SDK closure: explicitly record why the rule belongs to a
  future owner before SDK/runtime evidence can honestly exist. Do not mark it
  supported and do not add placeholder support metadata.
- Table/progression closure: keep table summary rows non-runtime and
  checker-owned; do not invent runtime behavior for a table row that only points
  to separately modeled feature grants.

If a task proposes a new field or status, first search for existing fields
across the repo. Reuse, project, or narrow existing data instead of duplicating
it. Any new data shape must make contradictory provenance, contradictory
ownership, and unsupported-without-evidence states unrepresentable.

## L6 Shared Verification

- RAW/ubiquitous-language check: before modeling, closing, or asserting an L6
  row, read the exact `.references/srd-5.2.1/` anchor and
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain. Fix reasonable findings between rounds.
- Base commands:
  `pnpm unit-profile-coverage:check:self-test`,
  `pnpm unit-profile-coverage:check`,
  `pnpm rules-kernel-coverage:check:self-test`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm sdk-raw-integration-inventory:check`,
  `pnpm cleanroom-branch-coverage:check`,
  `git diff --check`.
- MCP extension tasks also run
  `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`.
- If generated unit-profile artifacts change, run
  `pnpm unit-profile-coverage:check --write`, then rerun
  `pnpm unit-profile-coverage:check`.
- Run focused SDK/runtime package tests only when the task touches that
  package's behavior. Run focused MBT only if the task changes battle runtime or
  QNT parity behavior.

## L6 Task Details

### Task 11 - L6FULL-PRE-01-L5-QUEUES-CLOSED

Status: `done`

Depends on: `L5UG-FINAL-01-ULTRA-GOLDEN-REFRESH`

Inputs:

- This plan's Tasks 1 through 10.
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- Current generated coverage checker output.

Output:

- Verify the completed L5 full SRD baseline and L5 ultra-golden queue have no
  remaining runnable, blocked, or deferred work.
- Verify level-1-5 generated support and ultra-golden artifacts agree with the
  completed queues.
- If either the L5 full SRD baseline or L5 ultra-golden queue is not closed,
  leave this task blocked and name the unfinished or contradicting task ids.

Completion / Success Criteria:

- It is safe to start level-6 work from a closed L5 baseline.
- `pnpm unit-profile-coverage:check` and
  `pnpm sdk-raw-integration-inventory:check` pass, or any failure is documented
  as a pre-existing repository/worktree problem unrelated to L5 closure.
- Task 12 is unblocked only after this task is accepted.

Verification:

- L6 shared verification commands relevant to a read-only prerequisite check.

Plan Impact:

- Applied. Current generated level-1-5 full-support and ultra-golden artifacts
  agree with the closed L5 baseline: no strict, selected-identity, or
  SRD-authored-readiness blockers remain, and the `level-1-5` ultra-golden
  aggregate passes.
- Task 12 is unblocked for research.

### Task 12 - L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY

Status: `done`

Depends on: `L6FULL-PRE-01-L5-QUEUES-CLOSED`

Inputs:

- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `scripts/srd-unit-inventory.cjs`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- Generated inventory currently has 25 `level-6` rows: 12
  `class-table-summary` rows, 2 `catalog-installed-owner-evidence-present`
  feature rows, and 11 `level-5-7-follow-up-required` feature rows.
- The mining audit currently reports battle-readiness as `not-applicable` for
  the L6 rows. Do not translate every follow-up row into battle-runtime work;
  choose the owner from the RAW rule shape and existing support boundaries.
- Level 6 does not open spell-level-4 work.

Output:

- Confirm the 25-row baseline and record any checker-owned drift before
  downstream tasks begin.
- Confirm the L6 slice is character-level level 6 only, not spell-level-4.

Completion / Success Criteria:

- Any inventory drift is either reconciled in this plan's task list or this
  task remains blocked with exact row ids.
- Downstream tasks have a stable L6 row baseline.
- Tasks 13 through 26 are unblocked only after this task is accepted.

Verification:

- `pnpm unit-profile-coverage:check`
- `git diff --check`

Plan Impact:

- Applied. The checked-in generated inventory at the accepted integration head
  still has 25 `level-6` rows: 12 `class-table-summary` rows, 2
  `catalog-installed-owner-evidence-present` feature rows, and 11
  `level-5-7-follow-up-required` feature rows.
- The L6 slice remains character-level level 6 only; spell-level-4 work remains
  outside this queue.
- Tasks 13 through 26 are unblocked for research.

### Task 13 - L6FULL-SEED-01-RANGER-ROVING

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Ranger.md:40`
- `.references/srd-5.2.1/Classes/Ranger.md:114`
- `packages/surface/content/ranger_roving.json`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/movement-forced-movement-selected-identity.mbt.test.ts`
- `packages/battle-runtime/src/unit-profile-admission-extra-attack-and-speed-features.test.ts`
- `plans/unit-profile-coverage/QMBT41_ROVING_FEATURE_WIDENING_SLICE_PLAN.md`
- `plans/unit-profile-coverage/task-claims.jsonl` entry for `QMBT44`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Verify `ranger_roving` remains installed SRD catalog data with
  checker-readable owner evidence.
- Verify the current `unit-evidence.jsonl` selected-identity evidence row still
  joins to the intended runtime owner.
- Verify the existing selected-identity battle evidence remains tied to the
  supported runtime owner rather than authored-identity dispatch.
- Do not rewrite this row unless a checker-owned contradiction is found.

Completion / Success Criteria:

- The L6 row remains `catalog-installed-owner-evidence-present` or equivalent
  current checker-owned supported disposition.
- Any changed evidence paths are real repo-relative files and pass the relevant
  checker.

Verification:

- L6 shared verification.
- Focused battle-runtime verification only if this task changes battle runtime
  or QNT parity behavior.

Plan Impact:

- Applied. The checked-in `ranger_roving` SRD catalog record remains installed,
  the level-6 inventory row remains `catalog-installed-owner-evidence-present`,
  and the deterministic plus selected-identity evidence rows still point at
  existing battle-runtime owner tests.
- No runtime, QNT, MBT, or evidence artifact changes were needed.

### Task 14 - L6FULL-SEED-02-ROGUE-EXPERTISE

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Rogue.md:41`
- `.references/srd-5.2.1/Classes/Rogue.md:57`
- `packages/surface/content/rogue_expertise.json`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/character-creation-runtime/src/rogue-expertise-level6.test.ts`
- `packages/character-creation-runtime/src/rogue-expertise-selected-identity.mbt.test.ts`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Verify `rogue_expertise` remains installed SRD catalog data with level-6
  character-creation owner evidence.
- Verify the current `unit-evidence.jsonl` selected-identity evidence row still
  joins to the intended character-creation owner.
- Preserve the distinction between the level-1 and level-6 grants while using
  the single authored feature record where the catalog already owns that
  identity.

Completion / Success Criteria:

- The L6 row remains `catalog-installed-owner-evidence-present` or equivalent
  current checker-owned supported disposition.
- Existing level-6 creation evidence still passes.

Verification:

- `pnpm --filter @dnd/character-creation-runtime test -- rogue-expertise-level6`
- L6 shared verification.

Plan Impact:

- Applied. The checked-in `rogue_expertise` SRD catalog record remains
  installed, the level-6 inventory row remains
  `catalog-installed-owner-evidence-present`, and the level-6
  character-creation evidence still finalizes four distinct Expertise skills
  from the single authored feature record.
- The evidence fixture fills the existing supported species draft hole before
  finalization, so no runtime, QNT, MBT, or evidence artifact changes were
  needed.

### Task 15 - L6FULL-CLOSE-01-LEVEL6-CLASS-TABLES

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- L6 table anchors listed in `## L6 RAW Anchors`.
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`

Output:

- Explicitly preserve or refresh non-runtime closure for the twelve level-6
  class-table summary rows: Barbarian, Bard, Cleric, Druid, Fighter, Monk,
  Paladin, Ranger, Rogue, Sorcerer, Warlock, and Wizard.
- Ensure table rows point to separately modeled progression/runtime rows,
  including class traits, feature grants, spell-access/progression facts,
  mastery/equipment facts, resources, or other narrower owners where the SRD
  table column has executable meaning. Do not carry duplicated runtime support
  state on the table summary row itself.

Completion / Success Criteria:

- All twelve L6 class-table summary rows are checker-owned non-runtime
  closures.
- No table row is counted as runtime support for a separately owned
  progression/runtime row.

Verification:

- `pnpm unit-profile-coverage:check --write`
- L6 shared verification.

Plan Impact:

- Applied. `plans/unit-profile-coverage/L6_PROGRESSION_DELTA_AUDIT.md`
  records the twelve level-6 class-table summary rows as non-runtime
  table-summary closures and maps their executable level-derived facts to
  existing generic owners or the narrower level-6 feature tasks.
- Tasks 16-26 remain the executable owner-resolution surface for the narrower
  feature rows; no runtime support is counted on a class-table summary row.

### Task 16 - L6FULL-ASI-01-FIGHTER-ASI-L6

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Fighter.md:36`
- `.references/srd-5.2.1/Classes/Fighter.md:90`
- `packages/surface/content/class_fighter.json`
- `packages/surface/content/fighter_ability_score_improvement_l4.json`
- `packages/character-creation-runtime/src/index.test.ts`
- `scripts/srd-unit-inventory.cjs`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Current state:

- `fighter_ability_score_improvement_l6` has test-only synthetic pressure in
  `packages/character-creation-runtime/src/index.test.ts`.
- The actual SRD authored/catalog record is missing and must not be treated as
  supported until the catalog/accounting boundary is honestly resolved.

Output:

- Decide whether the correct model is a distinct SRD level-6 feature record, a
  recurring-level projection from the existing ASI feature family, or another
  domain-backed representation that makes repeated ASI identity unambiguous.
- Update Surface catalog, class progression, owner evidence, and inventory
  accounting together if the row is admitted.
- Do not copy test-only synthetic identity into publishable source unless it is
  an SRD-authored identity and the Surface catalog owns it.

Completion / Success Criteria:

- The L6 fighter ASI row is either supported with real catalog and
  character-creation evidence, or explicitly closed with a durable reason that
  prevents unsupported SDK/runtime claims.
- Any repeated-ASI representation avoids duplicated derived state and makes
  level-4 versus level-6 ownership unambiguous.

Verification:

- Focused character-creation runtime tests if creation behavior changes.
- `pnpm unit-profile-coverage:check --write`
- L6 shared verification.

Plan Impact:

- Applied. `fighter_ability_score_improvement_l6` stays not-installed and is
  checker-closed as `catalog-only/dead-for-now` with an `unsupported-profile`
  selection-grant-container claim, rather than being counted as supported from
  synthetic test pressure.
- Task 47 records the future repeated ASI grant-occurrence owner so the current
  L6 full accounting can close without duplicating the level-4 ASI rule text or
  installing incomplete Fighter level-6 progression.

### Task 17 - L6FULL-OWN-01-BARBARIAN-MINDLESS-RAGE

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Barbarian.md:40`
- `.references/srd-5.2.1/Classes/Barbarian.md:182`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `barbarian_mindless_rage` by authoring/admitting SRD catalog data and
  owner evidence if supported, or by recording a future-owner-before-SDK closure
  if the necessary condition/charmed/frightened rage owner is not durable yet.

Completion / Success Criteria:

- The row no longer has `level-5-7-follow-up-required`.
- Any supported path has executable owner evidence; any closed path has a
  checker-readable owner-boundary reason.

Verification:

- L6 shared verification plus focused runtime tests only for changed owners.

Plan Impact:

- Applied. `barbarian_mindless_rage` stays not-installed and is checker-closed
  as `catalog-only/dead-for-now` with an `unsupported-profile` claim for the
  active Rage Charmed/Frightened immunity and enter-rage cleanup boundary.
- Task 48 records the future Mindless Rage condition-immunity owner so the
  current L6 full accounting can close without duplicating Rage state,
  condition state, subclass selection state, or authored-identity dispatch.

### Task 18 - L6FULL-OWN-02-BARD-MAGICAL-DISCOVERIES

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Bard.md:41`
- `.references/srd-5.2.1/Classes/Bard.md:336`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `bard_magical_discoveries` through the Character Creation / spell
  selection owner if support is present, or close it as future-owner-before-SDK
  if expanded spell-list choice support is not durable yet.

Completion / Success Criteria:

- The row is supported with catalog and creation/sheet evidence, or explicitly
  closed with a checker-readable owner boundary.
- No runtime behavior dispatches on Bard or spell authored identity.

Verification:

- L6 shared verification plus focused character-creation tests if behavior
  changes.

Plan Impact:

- Applied. `bard_magical_discoveries` stays not-installed and is
  checker-closed as `catalog-only/dead-for-now` with an `unsupported-profile`
  claim for the future-owner-before-SDK Magical Discoveries spell-access
  selection boundary.
- Task 49 records the future Magical Discoveries spell-access owner so the
  current L6 full accounting can close without duplicating prepared-spell
  state, Spell Slot state, class/subclass selection state, or authored-identity
  dispatch.

### Task 19 - L6FULL-OWN-03-CLERIC-BLESSED-HEALER

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Cleric.md:40`
- `.references/srd-5.2.1/Classes/Cleric.md:334`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `cleric_blessed_healer` by identifying whether spell healing rider
  execution has a current battle-runtime/rules-kernel owner, or by recording
  future-owner-before-SDK closure until that owner exists.

Completion / Success Criteria:

- The row is supported with executable owner evidence or explicitly closed with
  a durable missing-owner reason.

Verification:

- L6 shared verification plus focused spell/healing runtime tests only if
  behavior changes.

Accepted Closure:

- `cleric_blessed_healer` is closed as a not-installed
  future-owner-before-SDK spell healing rider boundary. Current promoted
  `spell.hit-point-restoration` and `unit-feature.spell-slot-healing-modifier`
  owners do not admit the selected Life Domain post-cast self-heal. Task 50
  records the future Blessed Healer rider owner so the current L6 full
  accounting can close without duplicating Spell Slot state, prepared Spell
  Access, healing target state, caster Hit Point state, subclass selection
  state, or authored-identity dispatch.

### Task 20 - L6FULL-OWN-04-DRUID-NATURAL-RECOVERY

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Druid.md:37`
- `.references/srd-5.2.1/Classes/Druid.md:412`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `druid_natural_recovery` by identifying the rest-triggered spell-slot
  recovery owner, or by recording future-owner-before-SDK closure until rest
  recovery support exists.

Completion / Success Criteria:

- The row is supported with resource/rest owner evidence or explicitly closed
  with a checker-readable owner boundary.
- Do not duplicate spell-slot state beside the existing slot owner.

Verification:

- L6 shared verification plus focused resource/rest tests only if behavior
  changes.

Accepted Closure:

- `druid_natural_recovery` is closed as a not-installed
  future-owner-before-SDK Natural Recovery rest feature boundary. Current
  promoted `character-sheet.short-rest-spell-slot-recovery`,
  `character-sheet.class-feature-long-rest-use-state`, and
  `character-sheet.druid-circle-land-spell-access` owners do not admit the
  selected level-6 Circle of the Land feature that combines a no-slot Circle
  Spell cast, a Druid-level Short Rest Spell Slot recovery budget, Short Rest
  trigger, and Long Rest reset. Task 51 records the future Natural Recovery
  rest feature owner so the current L6 full accounting can close without
  duplicating Spell Slot state, prepared Spell Access, subclass selection
  state, or authored-identity dispatch.

### Task 21 - L6FULL-OWN-05-MONK-EMPOWERED-STRIKES

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Monk.md:37`
- `.references/srd-5.2.1/Classes/Monk.md:128`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `monk_empowered_strikes` by admitting supported unarmed-strike damage
  typing evidence, or by closing it to the future combat/damage owner if the
  runtime cannot honestly apply the rule yet.

Completion / Success Criteria:

- The row is supported with executable attack/damage owner evidence or closed
  with a durable owner-boundary reason.

Verification:

- L6 shared verification plus focused battle-runtime/MBT only if attack or QNT
  parity behavior changes.

Accepted Closure:

- `monk_empowered_strikes` is closed as a not-installed
  future-owner-before-SDK Unarmed Strike damage-type-choice boundary. SRD
  Empowered Strikes applies whenever the Monk deals damage with an Unarmed
  Strike, allowing the Monk to choose Force damage or the strike's normal
  damage type. Current promoted Martial Arts support owns Unarmed Strike damage
  die replacement, Dexterity attack and damage projection, Grapple/Shove DC
  projection, and Bonus Action Unarmed Strike discovery, but it does not admit
  selected class-feature damage-type choice. Task 52 records the future
  Empowered Strikes damage-type owner so the current L6 full accounting can
  close without duplicating Unarmed Strike state, Martial Arts state, class
  progression state, damage resolution state, or authored-identity dispatch.

### Task 22 - L6FULL-OWN-06-MONK-WHOLENESS-OF-BODY

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Monk.md:37`
- `.references/srd-5.2.1/Classes/Monk.md:202`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `monk_wholeness_of_body` by admitting supported healing/resource
  evidence, or by closing it to the future action/resource owner if that
  execution path is not durable yet.

Completion / Success Criteria:

- The row is supported with executable owner evidence or explicitly closed with
  a checker-readable owner boundary.

Verification:

- L6 shared verification plus focused runtime tests only if behavior changes.

Accepted Closure:

- `monk_wholeness_of_body` is closed as a not-installed
  future-owner-before-SDK Wholeness of Body feature-resource self-healing
  boundary. SRD Wholeness of Body lets the selected Monk use a Bonus Action to
  roll the Martial Arts die and regain Hit Points equal to the roll plus Wisdom
  modifier, with a minimum of 1 Hit Point regained; uses equal Wisdom modifier
  with a minimum of one use and all expended uses restored on Long Rest.
  Current promoted Martial Arts support owns the die-size projection, current
  character facts own Wisdom ability scores, and existing Hit Point recovery
  owners apply positive healing, but promoted support does not yet admit the
  selected level-6 Warrior of the Open Hand feature resource and healing
  formula. Task 53 records the future Wholeness of Body owner so the current L6
  full accounting can close without duplicating Hit Point state, Martial Arts
  progression, Wisdom ability state, use-count expenditure state, subclass
  selection state, action-economy state, or authored-identity dispatch.

### Task 23 - L6FULL-OWN-07-PALADIN-AURA-OF-PROTECTION

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Paladin.md:40`
- `.references/srd-5.2.1/Classes/Paladin.md:136`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `paladin_aura_of_protection` by identifying the aura/save-bonus
  projection owner, or by recording future-owner-before-SDK closure until aura
  spatial projection and saving throw modifier support exist.

Completion / Success Criteria:

- The row is supported with executable owner evidence or explicitly closed with
  a durable owner-boundary reason.
- No aura state is duplicated if existing battle/character facts can project it.

Verification:

- L6 shared verification plus focused battle-runtime/MBT only if save or aura
  parity behavior changes.

Accepted Closure:

- `paladin_aura_of_protection` is closed as a not-installed
  future-owner-before-SDK passive aura and Saving Throw modifier boundary. SRD
  Aura of Protection creates a 10-foot Emanation from the Paladin, is inactive
  while the Paladin has the Incapacitated condition, grants the Paladin and
  allies in the aura a Saving Throw bonus equal to the Paladin's Charisma
  modifier with a minimum of +1, and requires a creature in multiple Paladin
  auras to choose one. Current promoted owners do not admit selected passive
  class-feature aura membership, source Charisma bonus projection,
  inactive-while-Incapacitated gating, or overlapping-aura choice. Task 54
  records the future Aura of Protection owner so the current L6 full accounting
  can close without duplicating Character Sheet ability state, condition state,
  table position state, Saving Throw result state, aura membership state, or
  authored-identity dispatch.

### Task 24 - L6FULL-OWN-08-SORCERER-ELEMENTAL-AFFINITY

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Sorcerer.md:40`
- `.references/srd-5.2.1/Classes/Sorcerer.md:432`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `sorcerer_elemental_affinity` by identifying the spell damage rider
  and Resistance owner, or by recording future-owner-before-SDK closure
  until those execution facts are durable.

Completion / Success Criteria:

- The row is supported with executable owner evidence or explicitly closed with
  a checker-readable owner boundary.
- Do not dispatch on subclass authored identity; use typed spell/damage and
  resource facts.

Verification:

- L6 shared verification plus focused spell/runtime tests only if behavior
  changes.

Accepted Closure:

- `sorcerer_elemental_affinity` is closed as a not-installed
  future-owner-before-SDK damage-affinity boundary. SRD Elemental Affinity
  chooses one of Acid, Cold, Fire, Lightning, or Poison, grants Resistance to
  the chosen damage type, and lets the Sorcerer add Charisma modifier to one
  damage roll of a spell that deals that type. The local SRD 5.2.1 clause has
  no Sorcery Point spend. Current promoted owners do not admit a selected
  class-feature damage-type source fact shared by passive Resistance and spell
  damage-roll modifier projection, nor one-roll-per-spell accounting for that
  modifier. Task 55 records the future Elemental Affinity owner so current L6
  full accounting can close without duplicating Spell Slot state, spell damage
  dice/totals, character ability state, damage adjustment state, Sorcery Point
  state, subclass selection state, or authored-identity dispatch.

### Task 25 - L6FULL-OWN-09-WARLOCK-DARK-ONES-OWN-LUCK

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Warlock.md:40`
- `.references/srd-5.2.1/Classes/Warlock.md:477`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `warlock_dark_ones_own_luck` by admitting supported d10 modifier and
  rest-resource owner evidence, or by closing it to the future Ability Check
  and Saving Throw reactionless modifier owner.

Completion / Success Criteria:

- The row is supported with executable owner evidence or explicitly closed with
  a durable owner-boundary reason.

Verification:

- L6 shared verification plus focused runtime tests only if behavior changes.

Accepted Closure:

- `warlock_dark_ones_own_luck` is closed as a not-installed
  future-owner-before-SDK Ability Check and Saving Throw modifier boundary.
  SRD Dark One's Own Luck lets the Warlock add 1d10 to the Warlock's own
  Ability Check or Saving Throw after seeing the roll but before any effects
  occur, with uses equal to Charisma modifier minimum one, no more than one use
  per roll, and Long Rest recovery. Current promoted owners do not admit this
  selected-feature
  reactionless modifier window: Fighter Tactical Mind is failed Ability Check
  only and spends Second Wind, Bardic Inspiration is a granted held die used
  after an already failed D20 Test, spell roll modifiers are active Spell
  Effect state, and reaction roll reductions spend a Reaction. Task 56 records
  the future Dark One's Own Luck owner so current L6 full accounting can close
  without duplicating D20 roll state, Ability Check state, Saving Throw state,
  character ability state, rest use-count state, subclass selection state, or
  authored-identity dispatch.

### Task 26 - L6FULL-OWN-10-WIZARD-SCULPT-SPELLS

Status: `done`

Depends on: `L6FULL-PRE-02-LEVEL6-SCOPE-INVENTORY`

Inputs:

- `.references/srd-5.2.1/Classes/Wizard.md:40`
- `.references/srd-5.2.1/Classes/Wizard.md:421`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Output:

- Resolve `wizard_sculpt_spells` by identifying whether area spell target
  exclusion/save-damage handling has a durable owner, or by recording
  future-owner-before-SDK closure until that owner exists.

Completion / Success Criteria:

- The row is supported with executable owner evidence or explicitly closed with
  a checker-readable owner boundary.
- Do not branch on Wizard or spell authored identity; use typed area/spell
  support facts.

Verification:

- L6 shared verification plus focused spell/battle MBT only if parity behavior
  changes.

Accepted Closure:

- `wizard_sculpt_spells` is closed as a not-installed
  future-owner-before-SDK selected area spell save-damage exemption boundary.
  SRD Sculpt Spells lets the caster choose up to 1 plus the spell's level
  visible creatures among the other creatures affected by an Evocation spell
  the caster casts. The chosen creatures automatically succeed on their Saving
  Throws against that spell and take no damage if they would normally take half
  damage on a successful save. Current promoted owners can represent Spell
  Definition School of Magic, effective spell level for a casting,
  affected-creature or area witnesses, Saving Throw outcomes, half-damage
  success branches, and damage application, but they do not admit a selected
  class-feature pre-save exemption choice over visible affected creatures. Task
  57 records the future Sculpt Spells owner so current L6 full accounting can
  close without duplicating spell identity, effective spell level, area
  membership, line-of-sight, target selection, Saving Throw result, damage
  state, subclass selection state, or authored-identity dispatch.

### Task 27 - L6FULL-FINAL-01-LEVEL6-ACCOUNTING-REFRESH

Status: `done`

Depends on: `L6FULL-SEED-01-RANGER-ROVING`,
`L6FULL-SEED-02-ROGUE-EXPERTISE`,
`L6FULL-CLOSE-01-LEVEL6-CLASS-TABLES`,
`L6FULL-ASI-01-FIGHTER-ASI-L6`,
`L6FULL-OWN-01-BARBARIAN-MINDLESS-RAGE`,
`L6FULL-OWN-02-BARD-MAGICAL-DISCOVERIES`,
`L6FULL-OWN-03-CLERIC-BLESSED-HEALER`,
`L6FULL-OWN-04-DRUID-NATURAL-RECOVERY`,
`L6FULL-OWN-05-MONK-EMPOWERED-STRIKES`,
`L6FULL-OWN-06-MONK-WHOLENESS-OF-BODY`,
`L6FULL-OWN-07-PALADIN-AURA-OF-PROTECTION`,
`L6FULL-OWN-08-SORCERER-ELEMENTAL-AFFINITY`,
`L6FULL-OWN-09-WARLOCK-DARK-ONES-OWN-LUCK`,
`L6FULL-OWN-10-WIZARD-SCULPT-SPELLS`

Inputs:

- All generated artifacts touched by Tasks 12 through 26.
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`

Output:

- Regenerate unit-profile inventory/accounting artifacts.
- Verify no `level-6` row remains in an unresolved follow-up disposition unless
  this plan has a concrete blocked follow-up task for it.
- Update planning text only when a durable new fact was learned during the
  queue.

Completion / Success Criteria:

- All 25 L6 rows are either supported with owner evidence or explicitly closed
  in checker-owned accounting.
- The 12 table rows remain non-runtime closures.
- `ranger_roving` and `rogue_expertise` support evidence remains present.
- `fighter_ability_score_improvement_l6` no longer relies only on synthetic
  test pressure.
- Task 28 is unblocked only after this task is accepted.

Verification:

- `pnpm unit-profile-coverage:check --write`
- L6 shared verification.

### Task 28 - L6UG-PRE-01-L6-FULL-QUEUE-CLOSED

Status: `done`

Depends on: `L6FULL-FINAL-01-LEVEL6-ACCOUNTING-REFRESH`

Inputs:

- Tasks 11 through 27.
- Current generated L6 inventory/accounting artifacts.

Output:

- Verify the L6 full queue is closed before ultra-golden implementation starts.
- If any L6 full task is not closed, leave this task blocked and name the
  unfinished task ids.

Completion / Success Criteria:

- It is safe to expose level-1-6 full-support plumbing because L6 full
  accounting is closed.
- Task 29 and Task 32 are unblocked only after this task is accepted.

Verification:

- L6 shared verification commands relevant to a read-only prerequisite check.

Plan Impact:

- Applied. Current generated L6 inventory/accounting artifacts report 25
  level-6 class rows: 12 `non-runtime`, 11 `catalog-only/dead-for-now`, and 2
  `catalog-installed-owner-evidence-present`, with no unfinished L6 full task
  row remaining.
- Tasks 29 and 32 are unblocked for research.

### Task 29 - L6UG-SCOPE-01-LEVEL16-REPORT-PLUMBING

Status: `done`

Depends on: `L6UG-PRE-01-L6-FULL-QUEUE-CLOSED`

Inputs:

- `scripts/unit-profile-coverage-check.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- Existing `level-1` through `level-1-5` support report paths.
- L6 generated inventory/accounting artifacts from Task 27.

Output:

- Add checker/config paths for generated `level-1-6` support report and JSON
  artifact.
- Derive the report from generated inventory/accounting inputs rather than
  hand-maintained prose.
- Preserve older level-support report outputs.

Completion / Success Criteria:

- The checker write path can produce `level-1-6` support artifacts.
- Any open level-1-6 support blockers are checker-readable.

Verification:

- `pnpm unit-profile-coverage:check --write`
- L6 shared verification.

### Task 30 - L6UG-SCOPE-02-ULTRA-GOLDEN-SCOPE

Status: `blocked`

Depends on: `L6UG-SCOPE-01-LEVEL16-REPORT-PLUMBING`

Blocker Type: dependency

Blocker Detail: waiting for `L6UG-SCOPE-01-LEVEL16-REPORT-PLUMBING`.

Inputs:

- `scripts/ultra-golden-gate.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- Generated level-1-6 support report and JSON path from Task 29.
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`

Output:

- Add `level-1-6` to the ultra-golden aggregate scope.
- Preserve older scope behavior and report wording.
- Make missing level-1-6 layer evidence appear as explicit checker blockers.

Completion / Success Criteria:

- `ULTRA_GOLDEN_GATE.md` and `ultra-golden-gate.json` include a `level-1-6`
  scope.
- Existing `level-1` through `level-1-5` results are not weakened.

Verification:

- `pnpm unit-profile-coverage:check --write`
- L6 shared verification.

### Task 31 - L6UG-GATE-01-NON-MCP-LAYER-RECONCILIATION

Status: `blocked`

Depends on: `L6UG-SCOPE-02-ULTRA-GOLDEN-SCOPE`

Blocker Type: dependency

Blocker Detail: waiting for `L6UG-SCOPE-02-ULTRA-GOLDEN-SCOPE`.

Inputs:

- The level-1-6 ultra-golden output from Task 30.
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/rules-kernel-coverage/`
- `plans/cleanroom-branch-coverage/`

Output:

- Reconcile `level-1-6` support completeness, QNT/generator readiness, and
  MBT/parity evidence before MCP evidence closeout.
- If a non-MCP layer is missing evidence, either resolve it here or add
  concrete Ralph tasks and rewire Tasks 34 and 37 to wait for them.

Completion / Success Criteria:

- The only remaining `level-1-6` ultra-golden blockers are MCP scenario
  evidence blockers, or this plan has concrete additional tasks for every
  non-MCP blocker.
- No parity evidence is inferred from SDK scenarios unless the checker already
  admits that witness kind.

Verification:

- L6 shared verification plus any focused checker command needed by split
  blocker tasks.

### Task 32 - L6UG-MCP-01-LEVEL6-VERTICAL-DECISION

Status: `ready-for-research`

Depends on: `L6UG-PRE-01-L6-FULL-QUEUE-CLOSED`

Inputs:

- Task 27's closed L6 accounting result.
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md`

Output:

- Write `plans/unit-profile-coverage/L6_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`.
- Choose the smallest honest SRD-only level-6 MCP vertical that proves workflow
  discovery, character creation or advancement, durable Character Sheet state,
  and battle handoff.
- Prefer an already-supported level-6 row with current battle handoff evidence,
  such as `ranger_roving`, if it can honestly cover the required MCP flows after
  Task 27. `rogue_expertise` is a plausible sheet/creation alternative only if
  it can also be paired with a supported level-6 battle handoff without
  inventing runtime semantics. Do not choose a future-owner closure.
- Record exact SRD anchors, owner boundaries, expected projections, and why
  plausible alternatives were rejected.

Completion / Success Criteria:

- The decision artifact names one primary scenario and rejects alternatives
  with concrete reasons.
- The selected scenario has an honest battle handoff path before Task 32 is
  accepted; if no such path exists, Task 32 stays non-done and the plan must be
  revised with concrete prerequisite tasks before downstream MCP work proceeds.
- The scenario can be executed through MCP-returned tool state rather than
  hard-coded internals.

Verification:

- RAW/ubiquitous-language check for the selected anchors.
- `git diff --check`

### Task 33 - L6UG-MCP-02-LEVEL6-SHEET-SCENARIO

Status: `blocked`

Depends on: `L6UG-MCP-01-LEVEL6-VERTICAL-DECISION`

Blocker Type: dependency

Blocker Detail: waiting for `L6UG-MCP-01-LEVEL6-VERTICAL-DECISION`.

Inputs:

- Future Task 32 output:
  `plans/unit-profile-coverage/L6_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/character-tools.ts`
- `packages/mcp/src/protocol-server.ts`

Output:

- Add the level-6 MCP scenario helper and creation/advancement/finalization path.
- Prove durable Character Sheet state for the selected level-6 character before
  battle starts.
- Keep battle start or battle action assertions out of this task unless they
  are needed to make the helper compile.

Completion / Success Criteria:

- The scenario can create or advance the selected SRD level-6 character through
  MCP-returned holes/tool state.
- The helper follows returned revisions, hole ids, and option ids.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- L6 shared verification.

### Task 34 - L6UG-MCP-03-LEVEL6-BATTLE-HANDOFF

Status: `blocked`

Depends on: `L6UG-MCP-02-LEVEL6-SHEET-SCENARIO`,
`L6UG-GATE-01-NON-MCP-LAYER-RECONCILIATION`

Blocker Type: dependency

Blocker Detail: waiting for `L6UG-MCP-02-LEVEL6-SHEET-SCENARIO` and
`L6UG-GATE-01-NON-MCP-LAYER-RECONCILIATION`.

Inputs:

- The level-6 sheet scenario helper from Task 33.
- Future Task 32 output:
  `plans/unit-profile-coverage/L6_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`
- Battle handoff and selected behavior owners named by Task 32.

Output:

- Extend the Task 33 scenario through `start_battle` for the level-6 vertical
  selected by Task 32.
- Inspect battle projection for the selected level-6 character.
- Exercise or discover the selected supported level-6 battle behavior without
  adding new runtime semantics.

Completion / Success Criteria:

- The battle starts from the durable character created by the level-6 scenario.
- The scenario follows returned battle ids, combatant ids, and battle holes.
- The scenario proves the selected level-6 battle handoff path from Task 32
  without placeholder assertions or new runtime semantics.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- L6 shared verification.

### Task 35 - L6UG-MCP-04-LEVEL6-SCENARIO-REGISTRY

Status: `blocked`

Depends on: `L6UG-MCP-03-LEVEL6-BATTLE-HANDOFF`

Blocker Type: dependency

Blocker Detail: waiting for `L6UG-MCP-03-LEVEL6-BATTLE-HANDOFF`.

Inputs:

- Executable level-6 MCP scenario from Tasks 33 and 34.
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/mcp-protocol.test.ts`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`

Output:

- Add the level-6 scenario to MCP acceptance scenario metadata and runner
  coverage.
- Preserve existing level-1 through level-5 scenarios.

Completion / Success Criteria:

- MCP acceptance coverage includes the level-6 scenario.
- The scenario id is stable and suitable for
  `plans/unit-profile-coverage/mcp-scenario-evidence.json`.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `git diff --check`

### Task 36 - L6UG-MCP-05-LEVEL16-SCENARIO-EVIDENCE

Status: `blocked`

Depends on: `L6UG-MCP-04-LEVEL6-SCENARIO-REGISTRY`

Blocker Type: dependency

Blocker Detail: waiting for `L6UG-MCP-04-LEVEL6-SCENARIO-REGISTRY`.

Inputs:

- Registered scenario id from Task 35.
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`
- `scripts/ultra-golden-gate.cjs`

Output:

- Add `level-1-6` to required MCP flow scope where appropriate.
- Add checker-owned MCP scenario evidence rows for the executable level-6
  scenario.
- Add or update the level-1-6 MCP scope audit decision so evidence admission is
  explicit and checker-owned.
- If any required flow lacks executable evidence, add concrete Ralph
  implementation tasks and rewire dependencies instead of admitting a
  placeholder.

Completion / Success Criteria:

- Every `level-1-6` required flow has executable `mcp-scenario` evidence.
- The manifest references real repo-relative owner and test paths.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- L6 shared verification.

### Task 37 - L6UG-FINAL-01-ULTRA-GOLDEN-REFRESH

Status: `blocked`

Depends on: `L6UG-MCP-05-LEVEL16-SCENARIO-EVIDENCE`

Blocker Type: dependency

Blocker Detail: waiting for `L6UG-MCP-05-LEVEL16-SCENARIO-EVIDENCE`.

Inputs:

- All generated artifacts touched by Tasks 29, 30, 31, and 36.
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- `plans/unit-profile-coverage/ultra-golden-gate.json`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`

Output:

- Regenerate unit-profile and ultra-golden artifacts.
- Confirm `level-1-6` passes every ultra-golden layer.
- Update planning text only when a durable new fact was learned during the
  queue.

Completion / Success Criteria:

- `ULTRA_GOLDEN_GATE.md` reports `level-1-6` as pass across support
  completeness, QNT/generator readiness, MBT/parity evidence, and MCP scenario
  evidence.
- `plans/unit-profile-coverage/ultra-golden-gate.json` records the same result.
- Existing level-1 through level-1-5 results remain pass.
- No broad TODO or prose-only blocker remains in this plan.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `git diff --check`
