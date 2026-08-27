/**
 * Agent-facing workflow guidance for the stateless MCP content tools.
 * Keeping this authored guide beside its tool domain prevents the catalog
 * projection module from owning workflow prose and schema mechanics together.
 */
export function contentWorkflowGuide() {
  return {
    lifecycle: [
      "Call list_catalog_units for catalog ids or create_character_draft to discover currently legal character choices.",
      "Call create_character_draft, then fill only holeIds and optionIds returned in holes. The draft.progression.initial choice is the whole Character Progression profile: starting class plus any post-start advancement entries.",
      "After every accepted fill_creation_holes call, use the returned storedDraft.revision as the next expectedRevision.",
      "Call finalize_character only when finalization.tag is ready or after holes are complete.",
      "Call list_stat_blocks for Stat Block ids. select_stat_block can store one id for inspection, but start_battle Stat Block combatants carry their own statBlockId.",
      "Call start_battle with a non-empty initialCombatants roster. Character-session combatants use characterId from list_characters; Stat Block combatants use statBlockId from list_stat_blocks.",
      "Use battle_lifecycle with applyInitiativeSwap or finalizeInitialInitiativeSetup during initial setup; while a Battle is active, use addCombatant or removeCombatant to change the roster. Add only an available Character Session or an installed Stat Block projection, and retry typed recovery with battleAndCharacterSessionsUnchanged when a transition is rejected.",
      "Call discover_battle_acts and copy a returned subject exactly.",
      "If an act has initialHoles, call fill_battle_hole with the typed subject and one typed fill at a time, reusing the same subject until result.tag is resolved.",
      "If an act has no holes, call resolve_battle_act with the typed subject.",
      "Call end_turn only when no transientBattleFills are pending.",
      "If end_turn asks for a Death Saving Throw hole, fill that pending subject before taking other battle actions.",
      "Call end_battle only when no transientBattleFills are pending, then list_characters for durable HP, zero-HP lifecycle, and Spell Slot handoff.",
      "Call query_character_session with one returned characterId and a discriminated query variant to inspect existing Character Sheet projections; it returns typed rejection while that character is in Battle and admits only ritual Spell Invocation inspection outside Battle.",
    ],
    resultPaths: {
      creationHoles: "holes",
      draftRevision: "draft.revision or storedDraft.revision",
      finalization: "finalization",
      characters: "characters",
      battleActs: "availableActs",
      followUpBattleHoles: "result.holes",
      pendingBattleFills: "session.transientBattleFills",
      battleCombatants: "snapshot.combatants",
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
        '{"kind":"targetChoice","holeId":"copy from result.holes[] or initialHoles[]","value":"target combatantId","spatialFacts":[{"kind":"attackTargetDistance | spellTarget | grappleTargetWithinReach | attackerAllyWithin5FeetOfTarget","actorId":"table/caller combatantId when required","targetId":"table/caller combatantId when required","procedureRef":"copy from the target hole sourceProcedureRef or attack.selection procedureRef when required","attackAbility":"copy from attack.selection when present","attackDamageType":"copy from attack.selection when present","distanceFeet":"nonnegative feet when kind is attackTargetDistance"}]}',
      spellTargetAllocationFill:
        '{"kind":"spellTargetAllocation","holeId":"copy from result.holes[] or initialHoles[]","value":{"allocations":[{"targetId":"target combatantId","count":3}]},"spatialFacts":[{"kind":"spellTarget","casterId":"caster combatantId","targetId":"same target combatantId","sourceProcedureRef":"copy from the target hole sourceProcedureRef"}]}',
      attackRollFill:
        '{"kind":"attackRoll","holeId":"copy from result.holes[] or initialHoles[]","value":{"total":16,"naturalD20":14,"rollMode":"normal | advantage | disadvantage optional"}}',
      savingThrowOutcomeFill:
        '{"kind":"savingThrowOutcome","holeId":"copy from result.holes[] or initialHoles[]","value":{"area":{"originAnchorId":"table-supplied origin combatantId","affectedTargetIds":["table-supplied affected combatantId"]},"outcomes":[{"targetId":"same affected combatantId","succeeded":false}]}}',
      rolledDiceFill:
        '{"kind":"rolledDice","holeId":"copy exact damage-result hole id","value":[{"results":[5]}]}',
      characterSessionOperations:
        "apply_character_session_operation accepts atomic completeShortRest, interruptShortRest, completeLongRest, composed interruptLongRest histories with strictly increasing cumulativeRestedTicks boundaries and a final cumulative resumed segment, and passCalendarTime operations.",
    },
    naturalLanguagePolicy:
      "MCP does not own synonym lists for character options. Use returned Unit names/ids and current creation holes as the source of truth; ask a clarification for terms such as 'warrior' before selecting class_fighter.",
    recovery: [
      "On UNKNOWN_* errors, rediscover current sessions, holes, Stat Blocks, or battle acts.",
      "On revision errors, read storedDraft.revision and retry against the current draft.",
      "On BATTLE_ACT_NOT_AVAILABLE, call discover_battle_acts and use a current subject.",
      "On BATTLE_ACT_REQUIRES_HOLES, use fill_battle_hole instead of resolve_battle_act.",
      "On pending-fill errors, continue filling session.transientBattleFills.subject until the result resolves.",
      "Short Rest, composed Long Rest interruption/resumption, and calendar-time Stable recovery are supported through apply_character_session_operation; unresolved calendar recovery returns result.holes for a subsequent call, while a resumed Long Rest must supply strictly increasing cumulativeRestedTicks segments and its final cumulative segment in the same call.",
    ],
    limits: [
      "Use discover_creation_holes, list_characters, inspect_character_session, query_character_session, list_stat_blocks, and discover_battle_acts for the currently executable workflows, projections, and acts.",
      "Character creation exposes one draft.progression.initial fill for a progression derived from the runtime's contiguous class-level capabilities; MCP does not expose a later level-1 class-entry fill.",
      "roll_dice is an optional independent raw-face roller: it returns bounded groups with server correlation only. It does not derive modifiers or outcomes, inspect or auto-fill Battle holes, retain history, or provide caller idempotency; calculations must use canonical returned facts.",
      "Character Session queries do not persist derived facts, expose generic out-of-Battle casting, maintain a spell ledger, or add search, pagination, indexing, or recommendation infrastructure.",
      "Revival workflows beyond the typed zero-HP character closeout remain unsupported.",
    ],
  };
}
