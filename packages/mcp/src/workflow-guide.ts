import { Match } from "effect";
import type { McpToolSurface } from "./mcp-tool-surface.ts";

export function workflowGuide(toolSurface: McpToolSurface) {
  const {
    characterMutation,
    characterQuery,
    lifecycle,
    fillOperation,
    resolveOperation,
  } = workflowTools(toolSurface);
  return {
    lifecycle: [
      "Call list_catalog_units for catalog ids or create_character_draft to discover currently legal character choices.",
      "Call create_character_draft, then fill only holeIds and optionIds returned in holes. The draft.progression.initial choice is the whole Character Progression profile: starting class plus any post-start advancement entries.",
      "After every accepted fill_creation_holes call, use the returned storedDraft.revision as the next expectedRevision.",
      "Call finalize_character only when finalization.tag is ready or after holes are complete.",
      `After finalization, call ${characterMutation} with setEquipmentLoadout to select or clear owned armor, shield, or weapon references before start_battle; pass references from finalization.build.equipment.owned, omit a slot to retain it, and use null to clear it. Standard finalization stores weapon references in the main slot; passing that main:<unitId> reference as offHandWeapon is the canonical off-hand workflow, and the adapter rekeys it to off:<unitId> before validation. Armor and shield references must retain their own slots.`,
      "Call list_stat_blocks for Stat Block ids and inspect each summary's fixed or alternative Size. select_stat_block can store one id for inspection, but start_battle Stat Block combatants carry their own statBlockId.",
      "Call start_battle with a non-empty initialCombatants roster. Character-session combatants use characterId from list_characters; Stat Block combatants use statBlockId from list_stat_blocks and must pass size when the summary exposes alternatives.",
      `Use ${lifecycle} with applyInitiativeSwap or finalizeInitialInitiativeSetup during initial setup; while a Battle is active, use addCombatant or removeCombatant to change the roster. Add only an available Character Session or an installed Stat Block projection, and retry typed recovery with battleAndCharacterSessionsUnchanged when a transition is rejected.`,
      "Call discover_battle_acts and copy a returned subject exactly.",
      "For every ordinary Holes frontier, read envelope.frontier.pendingProcedure as the canonical procedure awaiting the returned holes. A subjectResolution procedure is replay-root work; a turnBoundary procedure identifies the ending actor, incoming source turn, and either outgoing End Turn, start-turn occurrence ordering, or the exact start-turn occurrence request.",
      toolSurface === "chatgpt"
        ? "Select an Act through its named tool with subject and no fill, even when it has initialHoles. The returned pending transaction owns that operation; supply one ordinary fact at a time through answer_battle_hole with fill and no subject. For an attack target hole, copy actorId and the complete branch-specific selection from hole.attack into the attackTargetDistance fact."
        : `If an act has initialHoles, call ${fillOperation} with the typed subject and one typed fill at a time, reusing the same subject until result.tag is resolved. For an attack target hole, copy actorId from hole.attack.actorId and copy the complete branch-specific selection from hole.attack.selection into the attackTargetDistance fact.`,
      "Ranged Spell Attacks use one canonical spell range, not separate normal/long bands: provide the exact caster-to-target distance and keep it at or below the returned rangeFeet. A separate rangedSpellAttackEnemyProximity fact records any adjacent visible, non-Incapacitated enemy that imposes Disadvantage, regardless of the selected target.",
      `If an act has no holes, call ${resolveOperation} with the typed subject.`,
      "Call end_turn only when no Battle continuation inputs are pending.",
      toolSurface === "chatgpt"
        ? "If end_turn asks for a Death Saving Throw hole, answer it through answer_battle_hole with fill and no subject before taking other Battle actions."
        : `If end_turn asks for a Death Saving Throw hole, copy envelope.frontier.replaySubject into the next ${fillOperation} request as its subject and fill that pending replay subject before taking other battle actions.`,
      "Call end_battle only when no Battle continuation inputs are pending, then list_characters for durable HP, zero-HP lifecycle, and Spell Slot handoff.",
      `Call ${characterQuery} with one returned characterId and a discriminated query variant to inspect existing Character Sheet projections; it returns typed rejection while that character is in Battle and admits only ritual Spell Invocation inspection outside Battle.`,
    ],
    resultPaths: {
      creationHoles: "holes",
      draftRevision: "draft.revision or storedDraft.revision",
      finalization: "finalization",
      characters: "characters",
      battleActs: "envelope.frontier.acts",
      followUpBattleHoles: "envelope.frontier.holes",
      pendingBattleFills: "envelope.frontier",
      pendingBattleProcedure: "envelope.frontier.pendingProcedure",
      battleCombatants: "envelope.checkpoint.combatants",
      characterSessionOperation: "result",
      calendarTimeResult: "result",
      calendarTimeRecoveryHoles: "result.holes",
    },
    acceptedInputs: {
      choiceFill:
        '{"kind":"choice","holeId":"copy from holes[].holeId","optionIds":["copy from holes[].options[].optionId"]}',
      progressionFill:
        '{"kind":"choice","holeId":"cc:draft:draft.progression.initial","optionIds":["copy one progression optionId from holes[].options[]"]}',
      abilityScoresFill:
        '{"kind":"abilityScores","holeId":"copy from holes[].holeId","method":"standardArray","value":{"str":15,"dex":14,"con":13,"int":8,"wis":10,"cha":12}}',
      targetChoiceFill:
        "Copy the current target hole's holeId and use the spatial-fact kind requested by that hole. Attack target branches are documented separately below; spellTarget and other target facts must use only their returned branch fields. When spellTargetSpatialFactRequest.requiresExactDistance is true, include distanceFeet with the exact caster-to-target distance. A chained Spell Attack leap hole requires both that exact spellTarget fact and the spellLeapTargetWithinRange fact named by spellLeapTargetSpatialFactRequest. For a ranged Spell Attack, add one rangedSpellAttackEnemyProximity fact for each adjacent enemy who can see the caster and is not Incapacitated; the selected target may be an ally or a distant creature.",
      characterAttackTargetChoiceFill:
        '{"kind":"targetChoice","holeId":"copy from the current target hole","value":"target combatantId","spatialFacts":[{"kind":"attackTargetDistance","actorId":"copy from current target hole attack.actorId","targetId":"same target combatantId","procedureRef":"copy from current target hole attack.selection.procedureRef","attackAbility":"copy from current target hole attack.selection.attackAbility","attackDamageType":"copy from current target hole attack.selection.attackDamageType","distanceFeet":5}]} Character branch: omit statBlockDamageSelection.',
      statBlockAttackTargetChoiceFill:
        '{"kind":"targetChoice","holeId":"copy from the current target hole","value":"target combatantId","spatialFacts":[{"kind":"attackTargetDistance","actorId":"copy from current target hole attack.actorId","targetId":"same target combatantId","procedureRef":"copy from current target hole attack.selection.procedureRef","statBlockDamageSelection":"copy the complete array from current target hole attack.selection.statBlockDamageSelection","distanceFeet":5}]} Stat Block branch: omit attackAbility and attackDamageType.',
      spellTargetAllocationFill:
        '{"kind":"spellTargetAllocation","holeId":"copy from envelope.frontier.holes[] or envelope.frontier.acts[].initialHoles[]","value":{"allocations":[{"targetId":"target combatantId","count":3}]},"spatialFacts":[{"kind":"spellTarget","casterId":"caster combatantId","targetId":"same target combatantId","sourceProcedureRef":"copy from the target hole sourceProcedureRef","distanceFeet":"include the exact caster-to-target distance when the hole requests requiresExactDistance"}]}',
      attackRollFill:
        '{"kind":"attackRoll","holeId":"copy from envelope.frontier.holes[] or envelope.frontier.acts[].initialHoles[]","value":{"total":16,"d20TestRoll":{"tag":"single","naturalD20":14}}}',
      savingThrowOutcomeFill:
        '{"kind":"savingThrowOutcome","holeId":"copy from envelope.frontier.holes[] or envelope.frontier.acts[].initialHoles[]","value":{"area":{"originAnchorId":"table-supplied origin combatantId","affectedTargetIds":["table-supplied affected combatantId"]},"outcomes":[{"targetId":"same affected combatantId","succeeded":false}]}}',
      rolledDiceFill:
        '{"kind":"rolledDice","holeId":"copy exact damage-result hole id","value":[{"results":[5]}]}',
      characterSessionOperations: `${characterMutation} accepts atomic completeShortRest, interruptShortRest, completeLongRest, composed interruptLongRest histories with strictly increasing cumulativeRestedTicks boundaries and a final cumulative resumed segment, and passCalendarTime operations.`,
      setEquipmentLoadoutOperation: `Use ${characterMutation} with {"kind":"setEquipmentLoadout","loadout":{"armor":"owned armor reference or null","shield":"owned shield reference or null","weapon":{"itemId":"owned main weapon reference","grip":"one_handed"},"offHandWeapon":{"itemId":"owned weapon reference"}}}; omit slots to retain them. Standard finalization stores weapon refs as main:<unitId>; when moving one to offHandWeapon, pass that main:<unitId> ref and the adapter rekeys it to off:<unitId>. Only main/off weapon aliases are accepted; armor and shield refs must keep their own slots. Battle admission remains authoritative for executable weapon mechanics.`,
    },
    selectionPolicies: {
      finesseWeaponAbility:
        "For a Finesse weapon, Battle considers the character's Strength and Dexterity modifiers, selects the stronger modifier as the default attack ability, and returns both attack variants when the modifiers tie. This is a product selection policy over both rules-legal abilities; it does not claim that the SRD requires automatic selection. Separately granted ability choices, such as Pact of the Blade, remain available through their feature contracts.",
    },
    naturalLanguagePolicy:
      "MCP does not own synonym lists for character options. Use returned Unit names/ids and current creation holes as the source of truth; ask a clarification for terms such as 'warrior' before selecting class_fighter.",
    recovery: [
      "On UNKNOWN_* errors, rediscover current sessions, holes, Stat Blocks, or battle acts.",
      "On revision errors, read storedDraft.revision and retry against the current draft.",
      "On BATTLE_ACT_NOT_AVAILABLE, call discover_battle_acts and use a current subject.",
      `On BATTLE_ACT_REQUIRES_HOLES, use ${fillOperation} instead of ${resolveOperation}.`,
      toolSurface === "chatgpt"
        ? "On any ordinary pending-fill response, preserve the returned holes and supply one current fact through answer_battle_hole with fill and no subject. Select each Reaction through its named tool with an interruptDecision fill, no subject, and choice.fills: []; answer its returned ordinary holes through answer_battle_hole."
        : "On any ordinary pending-fill response, preserve envelope.frontier.pendingProcedure with the replaySubject and holes while resubmitting the complete accepted Fill prefix.",
      toolSurface === "chatgpt"
        ? "On pending-fill errors, rediscover the current hole and retry answer_battle_hole with fill and no subject; the retained transaction owns the subject."
        : `On pending-fill errors, copy envelope.frontier.replaySubject into the next ${fillOperation} request as its subject, then continue filling it until the result resolves.`,
      `Short Rest, composed Long Rest interruption/resumption, and calendar-time Stable recovery are supported through ${characterMutation}; unresolved calendar recovery returns result.holes for a subsequent call, while a resumed Long Rest must supply strictly increasing cumulativeRestedTicks segments and its final cumulative segment in the same call.`,
    ],
    limits: [
      `Use discover_creation_holes, list_characters, inspect_character_session, ${characterQuery}, list_stat_blocks, and discover_battle_acts for the currently executable workflows, projections, and acts.`,
      "Character creation exposes one draft.progression.initial fill for a progression derived from the runtime's contiguous class-level capabilities; MCP does not expose a later level-1 class-entry fill.",
      "roll_dice is an optional independent raw-face sampler: it returns bounded groups from the declared DRDice semantic profiles, and each call advances the Play Session's dice sequence. It does not derive modifiers or outcomes, inspect or auto-fill Battle holes, or retain Battle history; calculations must use canonical returned facts.",
      "Character Session queries do not persist derived facts, expose generic out-of-Battle casting, maintain a spell ledger, or add search, pagination, indexing, or recommendation infrastructure.",
      "Revival workflows beyond the typed zero-HP character closeout remain unsupported.",
    ],
  };
}

function workflowTools(surface: McpToolSurface) {
  return Match.value(surface).pipe(
    Match.when("chatgpt", () => ({
      characterMutation:
        "the named character operation (such as set_equipment_loadout)",
      characterQuery: "the named query tool (such as query_spell_access)",
      lifecycle:
        "apply_initiative_swap, finalize_initial_initiative_setup, add_combatant, or remove_combatant",
      fillOperation: "answer_battle_hole, with fill and without subject",
      resolveOperation:
        "the owning named tool from chatGptBattleOperations, omitting fill",
    })),
    Match.when("regular", () => ({
      characterMutation: "apply_character_session_operation",
      characterQuery: "query_character_session",
      lifecycle: "battle_lifecycle",
      fillOperation: "fill_battle_hole",
      resolveOperation: "resolve_battle_act",
    })),
    Match.exhaustive,
  );
}
