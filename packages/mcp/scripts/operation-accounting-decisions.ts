import type {
  OperationAccounting,
  OperationAccount,
  AccountRole,
  ExecutionEvidence,
} from "./operation-accounting-contract.ts";

function account(
  role: AccountRole,
  operation: string,
  evidence: ExecutionEvidence,
  reason: string,
  ...additionalEvidence: readonly ExecutionEvidence[]
): OperationAccount {
  return {
    role,
    operation,
    evidence: [evidence, ...additionalEvidence],
    reason,
  };
}
function at(file: string, symbol: string): ExecutionEvidence {
  return { file, symbol };
}

const REASONS = {
  publicEntry:
    "Current public entry point. Bundled selectors and reference-selected execution are expanded in the corresponding families.",
  admittedSubject:
    "Selected by the Battle dispatcher after admission; the referenced resolver owns its effects and resource changes.",
  procedureGateway:
    "Reference-selected execution is expanded by the procedure families; this gateway is not an independently exposed operation.",
  admission:
    "Admission partitions the dispatcher; rejection performs no operation, and admitted branches delegate to the accounted subject/procedure owners.",
  battleContinuation:
    "Typed input to the pending transaction, not an arbitrary executable subject; special decisions are expanded in the interrupt and unit-decision families.",
  unitDecision:
    "A contextual decision for the pending procedure; the value alone is not an operation identity.",
  interruptDecision:
    "Decline advances the responder checkpoint; resolve admits a specific nested procedure or reaction modifier.",
  interruptSelection:
    "Admitted against the current interrupt choices; nested procedure selections map to battleInterruptSubjects and modifiers to reactionModifiers.",
  reactionModifier:
    "Consumes the admitted reaction/resource and modifies the interrupted roll or damage; not a fresh ordinary action.",
  spellLookup:
    "Canonical procedure lookup owns discover/resolve callbacks. The generator verifies the actual declaration and reports its source; spellOperations expands non-cast modes.",
  spellExecution:
    "Dispatches through the canonical profile resolver. Casts, reactions and persistent-effect follow-ups retain distinct execution identities; content records are parameters.",
  staticMechanics:
    "Static mechanics admission has no invocation-registry entry; execution is owned by the durable-occurrence or retained-companion operation, not by an invented cast profile.",
  binding:
    "Binding provenance/availability controls reference lookup; unavailable bindings cannot execute. Executable bindings expand through unit or spell procedure accounting.",
  unitFact:
    "Derived rule fact used by execution; it does not independently select a model-callable operation.",
  unitActivation:
    "The bound procedure enables a caller-selected activation; its resolver, rather than record identity, executes it.",
  unitContinuation:
    "Optional or triggered execution inside the owning action/reaction; must be declared in that operation’s continuation contract.",
  statBlockBinding:
    "Runtime procedure binding, including injected Unarmed Strike; references select admitted mechanics, not authored names. Effect occurrence sources are internal ledger bindings.",
  statBlockBonusAction:
    "The executed runtime subset is Disengage/Hide, narrower than the broad standardAction field advertised by the old generic schema.",
  registryPort:
    "Actual executable registry port; stored-glyph ports are invoked by runtime composition rather than an independent public MCP method.",
  characterMutation:
    "An operation selected by the actual Character Session handler; its typed execution branch must receive individual public exposure.",
  characterQuery:
    "A selected read calculation in the executed query dispatcher, rather than an arbitrary query schema branch.",
  battleLifecycle:
    "Explicit lifecycle operation dispatched by Battle state; invalid phases reject without executing it.",
  creationInput:
    "Draft construction input. Choice ids select authored build data; they are not a registry of executable operations.",
} as const;

// Reviewed execution decisions, not a second runtime dispatch registry.
// Adding a canonical operation or mode requires an explicit decision here.
export const OPERATION_ACCOUNTING = {
  publicTools: {
    apply_character_session_operation: account(
      "dispatch",
      "apply_character_session_operation",
      at("packages/mcp/src/character-tools.ts", "handleCharacterToolCall"),
      REASONS.publicEntry,
    ),
    battle_lifecycle: account(
      "dispatch",
      "battle_lifecycle",
      at("packages/mcp/src/battle-tools.ts", "handleBattleToolCall"),
      REASONS.publicEntry,
    ),
    create_character_draft: account(
      "operation",
      "create_character_draft",
      at("packages/mcp/src/character-tools.ts", "handleCharacterToolCall"),
      REASONS.publicEntry,
    ),
    create_play_session: account(
      "operation",
      "create_play_session",
      at(
        "packages/mcp/src/play-session-protocol.ts",
        "handleCreatePlaySession",
      ),
      REASONS.publicEntry,
    ),
    delete_saved_play_session: account(
      "operation",
      "delete_saved_play_session",
      at(
        "packages/mcp/src/play-session-management-protocol.ts",
        "handleDeleteSavedPlaySession",
      ),
      REASONS.publicEntry,
    ),
    describe_mcp_workflow: account(
      "operation",
      "describe_mcp_workflow",
      at("packages/mcp/src/content-tools.ts", "handleContentToolCall"),
      REASONS.publicEntry,
    ),
    discover_battle_acts: account(
      "operation",
      "discover_battle_acts",
      at("packages/mcp/src/battle-tools.ts", "handleBattleToolCall"),
      REASONS.publicEntry,
    ),
    discover_creation_holes: account(
      "operation",
      "discover_creation_holes",
      at("packages/mcp/src/character-tools.ts", "handleCharacterToolCall"),
      REASONS.publicEntry,
    ),
    end_battle: account(
      "operation",
      "end_battle",
      at("packages/mcp/src/battle-tools.ts", "handleBattleToolCall"),
      REASONS.publicEntry,
    ),
    end_turn: account(
      "operation",
      "end_turn",
      at("packages/mcp/src/battle-tools.ts", "handleBattleToolCall"),
      REASONS.publicEntry,
    ),
    fill_battle_hole: account(
      "dispatch",
      "fill_battle_hole",
      at("packages/mcp/src/battle-tools.ts", "handleBattleToolCall"),
      REASONS.publicEntry,
    ),
    fill_creation_holes: account(
      "operation",
      "fill_creation_holes",
      at("packages/mcp/src/character-tools.ts", "handleCharacterToolCall"),
      REASONS.publicEntry,
    ),
    finalize_character: account(
      "operation",
      "finalize_character",
      at("packages/mcp/src/character-tools.ts", "handleCharacterToolCall"),
      REASONS.publicEntry,
    ),
    inspect_catalog_unit: account(
      "operation",
      "inspect_catalog_unit",
      at("packages/mcp/src/content-tools.ts", "handleContentToolCall"),
      REASONS.publicEntry,
    ),
    inspect_character_session: account(
      "operation",
      "inspect_character_session",
      at("packages/mcp/src/character-tools.ts", "handleCharacterToolCall"),
      REASONS.publicEntry,
    ),
    list_catalog_units: account(
      "operation",
      "list_catalog_units",
      at("packages/mcp/src/content-tools.ts", "handleContentToolCall"),
      REASONS.publicEntry,
    ),
    list_characters: account(
      "operation",
      "list_characters",
      at("packages/mcp/src/character-tools.ts", "handleCharacterToolCall"),
      REASONS.publicEntry,
    ),
    list_saved_play_sessions: account(
      "operation",
      "list_saved_play_sessions",
      at(
        "packages/mcp/src/play-session-management-protocol.ts",
        "handleListSavedPlaySessions",
      ),
      REASONS.publicEntry,
    ),
    list_stat_blocks: account(
      "operation",
      "list_stat_blocks",
      at("packages/mcp/src/content-tools.ts", "handleContentToolCall"),
      REASONS.publicEntry,
    ),
    query_character_session: account(
      "dispatch",
      "query_character_session",
      at("packages/mcp/src/character-tools.ts", "handleCharacterToolCall"),
      REASONS.publicEntry,
    ),
    read_battle_state: account(
      "operation",
      "read_battle_state",
      at("packages/mcp/src/battle-tools.ts", "handleBattleToolCall"),
      REASONS.publicEntry,
    ),
    read_play_session: account(
      "operation",
      "read_play_session",
      at("packages/mcp/src/play-session-protocol.ts", "handleReadPlaySession"),
      REASONS.publicEntry,
    ),
    resolve_battle_act: account(
      "dispatch",
      "resolve_battle_act",
      at("packages/mcp/src/battle-tools.ts", "handleBattleToolCall"),
      REASONS.publicEntry,
    ),
    roll_dice: account(
      "operation",
      "roll_dice",
      at("packages/mcp/src/dice-tools.ts", "executeDiceToolCall"),
      REASONS.publicEntry,
    ),
    select_stat_block: account(
      "operation",
      "select_stat_block",
      at("packages/mcp/src/battle-tools.ts", "handleBattleToolCall"),
      REASONS.publicEntry,
    ),
    start_battle: account(
      "operation",
      "start_battle",
      at("packages/mcp/src/battle-tools.ts", "handleBattleToolCall"),
      REASONS.publicEntry,
    ),
  },
  battleSubjects: {
    "action.attack": account(
      "operation",
      "action.attack",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-main.ts",
        "resolveAttack",
      ),
      REASONS.admittedSubject,
    ),
    "action.dash": account(
      "operation",
      "action.dash",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveDash",
      ),
      REASONS.admittedSubject,
    ),
    "action.disengage": account(
      "operation",
      "action.disengage",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveDisengage",
      ),
      REASONS.admittedSubject,
    ),
    "action.dodge": account(
      "operation",
      "action.dodge",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveDodge",
      ),
      REASONS.admittedSubject,
    ),
    "action.escapeGrapple": account(
      "operation",
      "action.escapeGrapple",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveEscapeGrapple",
      ),
      REASONS.admittedSubject,
    ),
    "action.escapeSpellRestraint": account(
      "operation",
      "action.escapeSpellRestraint",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveEscapeSpellRestraint",
      ),
      REASONS.admittedSubject,
    ),
    "action.grapple": account(
      "operation",
      "action.grapple",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveGrapple",
      ),
      REASONS.admittedSubject,
    ),
    "action.helpAttack": account(
      "operation",
      "action.helpAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveHelpAttack",
      ),
      REASONS.admittedSubject,
    ),
    "action.hide": account(
      "operation",
      "action.hide",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveHide",
      ),
      REASONS.admittedSubject,
    ),
    "action.multiattack": account(
      "operation",
      "action.multiattack",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveMultiattackSubject",
      ),
      REASONS.admittedSubject,
    ),
    "action.ready": account(
      "operation",
      "action.ready",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveReady",
      ),
      REASONS.admittedSubject,
    ),
    "action.search": account(
      "operation",
      "action.search",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveSearch",
      ),
      REASONS.admittedSubject,
    ),
    "action.shakeAwakeFromAreaControl": account(
      "operation",
      "action.shakeAwakeFromAreaControl",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveShakeAwakeFromSaveGatedAreaControl",
      ),
      REASONS.admittedSubject,
    ),
    "action.shakeAwakeFromStagedCondition": account(
      "operation",
      "action.shakeAwakeFromStagedCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveShakeAwakeFromHitPointBudgetCondition",
      ),
      REASONS.admittedSubject,
    ),
    "action.shove": account(
      "operation",
      "action.shove",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveShove",
      ),
      REASONS.admittedSubject,
    ),
    "actionSpell.cast": account(
      "dispatch",
      "actionSpell.cast",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-resolve.ts",
        "resolveSpellAct",
      ),
      REASONS.procedureGateway,
    ),
    "actionSpell.ready": account(
      "dispatch",
      "actionSpell.ready",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-resolve.ts",
        "resolveSpellAct",
      ),
      REASONS.procedureGateway,
    ),
    "bonusAction.martialArtsUnarmedStrike": account(
      "operation",
      "bonusAction.martialArtsUnarmedStrike",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-offhand.ts",
        "resolveMartialArtsBonusUnarmedStrike",
      ),
      REASONS.admittedSubject,
    ),
    "bonusAction.offHandAttack": account(
      "operation",
      "bonusAction.offHandAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-offhand.ts",
        "resolveOffHandAttack",
      ),
      REASONS.admittedSubject,
    ),
    "bonusAction.statBlockActionOption": account(
      "dispatch",
      "bonusAction.statBlockActionOption",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveStatBlockBonusActionOptionSubject",
      ),
      REASONS.procedureGateway,
    ),
    "bonusActionDashSpell.cast": account(
      "dispatch",
      "bonusActionDashSpell.cast",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-resolve.ts",
        "resolveBonusActionDashSpellAct",
      ),
      REASONS.procedureGateway,
    ),
    "bonusActionSpell.cast": account(
      "dispatch",
      "bonusActionSpell.cast",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-resolve.ts",
        "resolveBonusActionSpellAct",
      ),
      REASONS.procedureGateway,
    ),
    "bonusActionStandardAction.dash": account(
      "operation",
      "bonusActionStandardAction.dash",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveBonusActionStandardActionSubject",
      ),
      REASONS.admittedSubject,
    ),
    "bonusActionStandardAction.disengage": account(
      "operation",
      "bonusActionStandardAction.disengage",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveBonusActionDisengage",
      ),
      REASONS.admittedSubject,
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveBonusActionStandardActionSubject",
      ),
    ),
    "bonusActionStandardAction.hide": account(
      "operation",
      "bonusActionStandardAction.hide",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveBonusActionStandardActionSubject",
      ),
      REASONS.admittedSubject,
    ),
    companionAttack: account(
      "operation",
      "companionAttack",
      at(
        "packages/battle-runtime/src/companion-reaction-attack.ts",
        "resolvePactOfTheChainFamiliarReactionAttack",
      ),
      REASONS.admittedSubject,
    ),
    "companionLifecycle.permanentlyDismiss": account(
      "operation",
      "companionLifecycle.permanentlyDismiss",
      at(
        "packages/battle-runtime/src/battle-reducer/companion-lifecycle-procedures.ts",
        "resolveCompanionLifecycleSubject",
      ),
      REASONS.admittedSubject,
    ),
    "companionLifecycle.reappear": account(
      "operation",
      "companionLifecycle.reappear",
      at(
        "packages/battle-runtime/src/battle-reducer/companion-lifecycle-procedures.ts",
        "resolveCompanionLifecycleSubject",
      ),
      REASONS.admittedSubject,
    ),
    "companionLifecycle.temporarilyDismiss": account(
      "operation",
      "companionLifecycle.temporarilyDismiss",
      at(
        "packages/battle-runtime/src/battle-reducer/companion-lifecycle-procedures.ts",
        "resolveCompanionLifecycleSubject",
      ),
      REASONS.admittedSubject,
    ),
    "druidWildShape.assumeForm": account(
      "operation",
      "druidWildShape.assumeForm",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveDruidWildShapeUnitFeature",
      ),
      REASONS.admittedSubject,
    ),
    "druidWildShape.dismiss": account(
      "operation",
      "druidWildShape.dismiss",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveDruidWildShapeUnitFeature",
      ),
      REASONS.admittedSubject,
    ),
    monkFocusFlurryOfBlowsStrike: account(
      "operation",
      "monkFocusFlurryOfBlowsStrike",
      at(
        "packages/battle-runtime/src/battle-reducer/monk-flurry-attack.ts",
        "resolveMonkFocusFlurryOfBlowsStrike",
      ),
      REASONS.admittedSubject,
    ),
    "monkFocusOption.flurryOfBlows": account(
      "operation",
      "monkFocusOption.flurryOfBlows",
      at(
        "packages/battle-runtime/src/battle-reducer/monk-focus.ts",
        "resolveMonkFocusOption",
      ),
      REASONS.admittedSubject,
    ),
    "monkFocusOption.patientDefense.focusDisengageDodge": account(
      "operation",
      "monkFocusOption.patientDefense.focusDisengageDodge",
      at(
        "packages/battle-runtime/src/battle-reducer/monk-focus.ts",
        "resolveMonkFocusOption",
      ),
      REASONS.admittedSubject,
    ),
    "monkFocusOption.patientDefense.freeDisengage": account(
      "operation",
      "monkFocusOption.patientDefense.freeDisengage",
      at(
        "packages/battle-runtime/src/battle-reducer/monk-focus.ts",
        "resolveMonkFocusOption",
      ),
      REASONS.admittedSubject,
    ),
    "monkFocusOption.stepOfTheWind.focusDisengageDash": account(
      "operation",
      "monkFocusOption.stepOfTheWind.focusDisengageDash",
      at(
        "packages/battle-runtime/src/battle-reducer/monk-focus.ts",
        "resolveMonkFocusOption",
      ),
      REASONS.admittedSubject,
    ),
    "monkFocusOption.stepOfTheWind.freeDash": account(
      "operation",
      "monkFocusOption.stepOfTheWind.freeDash",
      at(
        "packages/battle-runtime/src/battle-reducer/monk-focus.ts",
        "resolveMonkFocusOption",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.startSpellCasting": account(
      "operation",
      "runtimeCommand.startSpellCasting",
      at(
        "packages/battle-runtime/src/battle-reducer/long-casting-lifecycle.ts",
        "resolveLongCastingCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.continueSpellCasting": account(
      "operation",
      "runtimeCommand.continueSpellCasting",
      at(
        "packages/battle-runtime/src/battle-reducer/long-casting-lifecycle.ts",
        "resolveLongCastingCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.castAttackHitBonusActionSpell": account(
      "operation",
      "runtimeCommand.castAttackHitBonusActionSpell",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-hit-bonus-action-spell-procedures.ts",
        "resolveCastAttackHitBonusActionSpellCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.castTriggeredReactionSpell": account(
      "operation",
      "runtimeCommand.castTriggeredReactionSpell",
      at(
        "packages/battle-runtime/src/battle-reducer/triggered-reaction-spell-procedures.ts",
        "resolveCastTriggeredReactionSpellCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.controlledVerticalSuspensionAltitudeControl": account(
      "operation",
      "runtimeCommand.controlledVerticalSuspensionAltitudeControl",
      at(
        "packages/battle-runtime/src/battle-reducer/active-spell-control-procedures.ts",
        "resolveControlledVerticalSuspensionAltitudeControlCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.creatureFalls": account(
      "operation",
      "runtimeCommand.creatureFalls",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleCreatureFallsRuntimeTransaction",
      ),
      "MCP uses the dedicated fall transaction; the ordinary dispatcher arm is only a replay marker.",
    ),
    "runtimeCommand.creatureTypeProtectionConditionAttempt": account(
      "operation",
      "runtimeCommand.creatureTypeProtectionConditionAttempt",
      at(
        "packages/battle-runtime/src/battle-reducer/protection-charm-procedures.ts",
        "resolveCreatureTypeProtectionConditionAttemptCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.creatureTypeProtectionPossessionAttempt": account(
      "operation",
      "runtimeCommand.creatureTypeProtectionPossessionAttempt",
      at(
        "packages/battle-runtime/src/battle-reducer/protection-charm-procedures.ts",
        "resolveCreatureTypeProtectionPossessionAttemptCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.directionalPersistentAreaDirectionChange": account(
      "operation",
      "runtimeCommand.directionalPersistentAreaDirectionChange",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.directionalPersistentAreaSave": account(
      "operation",
      "runtimeCommand.directionalPersistentAreaSave",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.endConcentration": account(
      "operation",
      "runtimeCommand.endConcentration",
      at(
        "packages/battle-runtime/src/battle-reducer/concentration-procedures.ts",
        "resolveEndConcentrationCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.endPersistentAreaSaveConditionEscapeForAreaRemoval":
      account(
        "operation",
        "runtimeCommand.endPersistentAreaSaveConditionEscapeForAreaRemoval",
        at(
          "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
          "resolvePersistentSpatialSpellProcedureCommand",
        ),
        REASONS.admittedSubject,
      ),
    "runtimeCommand.endPersistentAreaSaveConditionEscapeForDeparture": account(
      "operation",
      "runtimeCommand.endPersistentAreaSaveConditionEscapeForDeparture",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.endPersistentAreaSaveDamageForEnvironment": account(
      "operation",
      "runtimeCommand.endPersistentAreaSaveDamageForEnvironment",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-effect-cleanup-procedures.ts",
        "resolveDisperseTranslatingPersistentAreaCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.endPersistentAreaTraitForEnvironment": account(
      "operation",
      "runtimeCommand.endPersistentAreaTraitForEnvironment",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-effect-cleanup-procedures.ts",
        "resolveDispersePersistentAreaTraitCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.endTurn": account(
      "operation",
      "runtimeCommand.endTurn",
      at(
        "packages/battle-runtime/src/battle-reducer/turn-boundary-lifecycle.ts",
        "resolveEndTurnCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.executeCompelledApproach": account(
      "operation",
      "runtimeCommand.executeCompelledApproach",
      at(
        "packages/battle-runtime/src/battle-reducer/compelled-behavior-procedures.ts",
        "resolveCompelledBehaviorFollowUp",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.executeCompelledDrop": account(
      "operation",
      "runtimeCommand.executeCompelledDrop",
      at(
        "packages/battle-runtime/src/battle-reducer/compelled-behavior-procedures.ts",
        "resolveCompelledBehaviorFollowUp",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.executeCompelledFlee": account(
      "operation",
      "runtimeCommand.executeCompelledFlee",
      at(
        "packages/battle-runtime/src/battle-reducer/compelled-behavior-procedures.ts",
        "resolveCompelledBehaviorFollowUp",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.executeCompelledGrovel": account(
      "operation",
      "runtimeCommand.executeCompelledGrovel",
      at(
        "packages/battle-runtime/src/battle-reducer/compelled-behavior-procedures.ts",
        "resolveCompelledBehaviorFollowUp",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.fixedCostMovementReplacement": account(
      "operation",
      "runtimeCommand.fixedCostMovementReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-procedures.ts",
        "resolveMovementProcedure",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.grantedAreaSaveDamageAction": account(
      "operation",
      "runtimeCommand.grantedAreaSaveDamageAction",
      at(
        "packages/battle-runtime/src/battle-reducer/granted-area-save-damage.ts",
        "resolveGrantedAreaSaveDamageActionCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.linkedDefenseResistanceDamageShareSeparation": account(
      "operation",
      "runtimeCommand.linkedDefenseResistanceDamageShareSeparation",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-effect-cleanup-procedures.ts",
        "resolveLinkedDefenseResistanceDamageShareSeparationCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.movableZoneRam": account(
      "operation",
      "runtimeCommand.movableZoneRam",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.movableZoneReposition": account(
      "operation",
      "runtimeCommand.movableZoneReposition",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.movableZoneSave": account(
      "operation",
      "runtimeCommand.movableZoneSave",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.move": account(
      "operation",
      "runtimeCommand.move",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-procedures.ts",
        "resolveMovementProcedure",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.opportunityAttack": account(
      "operation",
      "runtimeCommand.opportunityAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/opportunity-attacks.ts",
        "resolveOpportunityAttackCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.persistentAreaSaveCompositeSave": account(
      "operation",
      "runtimeCommand.persistentAreaSaveCompositeSave",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.persistentAreaSaveConditionEscapeSave": account(
      "operation",
      "runtimeCommand.persistentAreaSaveConditionEscapeSave",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.persistentAreaSaveConditionSave": account(
      "operation",
      "runtimeCommand.persistentAreaSaveConditionSave",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.persistentAreaSaveDamageExit": account(
      "operation",
      "runtimeCommand.persistentAreaSaveDamageExit",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.persistentAreaSaveDamageSave": account(
      "operation",
      "runtimeCommand.persistentAreaSaveDamageSave",
      at(
        "packages/battle-runtime/src/battle-reducer/persistent-spatial-spell-procedures.ts",
        "resolvePersistentSpatialSpellProcedureCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.protectionRelevantEffectSave": account(
      "operation",
      "runtimeCommand.protectionRelevantEffectSave",
      at(
        "packages/battle-runtime/src/battle-reducer/protection-charm-procedures.ts",
        "resolveProtectionRelevantEffectSaveCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseGrapple": account(
      "operation",
      "runtimeCommand.releaseGrapple",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveReleaseGrappleCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseReadiedAction": account(
      "operation",
      "runtimeCommand.releaseReadiedAction",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseReadiedAttack": account(
      "operation",
      "runtimeCommand.releaseReadiedAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/opportunity-attacks.ts",
        "resolveOpportunityAttackCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseReadiedMovement": account(
      "operation",
      "runtimeCommand.releaseReadiedMovement",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedMovementCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseReadiedSpell": account(
      "operation",
      "runtimeCommand.releaseReadiedSpell",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedSpellCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseSpellCreatedHeldObject": account(
      "operation",
      "runtimeCommand.releaseSpellCreatedHeldObject",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-resolve-release.ts",
        "resolveReleaseSpellCreatedHeldObjectCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.replaceSelfTransformationMode.aquaticAdaptation": account(
      "operation",
      "runtimeCommand.replaceSelfTransformationMode.aquaticAdaptation",
      at(
        "packages/battle-runtime/src/battle-reducer/active-spell-control-procedures.ts",
        "resolveReplaceSelfTransformationModeCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.replaceSelfTransformationMode.changeAppearance": account(
      "operation",
      "runtimeCommand.replaceSelfTransformationMode.changeAppearance",
      at(
        "packages/battle-runtime/src/battle-reducer/active-spell-control-procedures.ts",
        "resolveReplaceSelfTransformationModeCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.replaceSelfTransformationMode.naturalWeapons": account(
      "operation",
      "runtimeCommand.replaceSelfTransformationMode.naturalWeapons",
      at(
        "packages/battle-runtime/src/battle-reducer/active-spell-control-procedures.ts",
        "resolveReplaceSelfTransformationModeCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.reportReadyTrigger": account(
      "operation",
      "runtimeCommand.reportReadyTrigger",
      at(
        "packages/battle-runtime/src/battle-reducer/ready-trigger.ts",
        "resolveReportReadyTriggerCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.retaliationAttack": account(
      "operation",
      "runtimeCommand.retaliationAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/opportunity-attacks.ts",
        "resolveOpportunityAttackCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.standFromProne": account(
      "operation",
      "runtimeCommand.standFromProne",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-procedures.ts",
        "resolveMovementProcedure",
      ),
      REASONS.admittedSubject,
    ),
    spawnedCompanionSharedSenses: account(
      "operation",
      "spawnedCompanionSharedSenses",
      at(
        "packages/battle-runtime/src/battle-reducer/companion-lifecycle-procedures.ts",
        "resolveSpawnedCompanionSharedSensesSubject",
      ),
      REASONS.admittedSubject,
    ),
    "spawnedCompanionTouchSpellProxy.cast": account(
      "dispatch",
      "spawnedCompanionTouchSpellProxy.cast",
      at(
        "packages/battle-runtime/src/battle-reducer/companion-lifecycle-procedures.ts",
        "resolveSpawnedCompanionTouchSpellSubject",
      ),
      REASONS.procedureGateway,
    ),
    unitFeature: account(
      "dispatch",
      "unitFeature",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveUnitFeature",
      ),
      REASONS.procedureGateway,
    ),
    unitFeatureHeldWeaponActivation: account(
      "operation",
      "unitFeatureHeldWeaponActivation",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveUnitFeatureHeldWeaponActivation",
      ),
      REASONS.admittedSubject,
    ),
  },
  battleInterruptSubjects: {
    "runtimeCommand.castAttackHitBonusActionSpell": account(
      "operation",
      "runtimeCommand.castAttackHitBonusActionSpell",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-hit-bonus-action-spell-procedures.ts",
        "resolveCastAttackHitBonusActionSpellCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.castTriggeredReactionSpell": account(
      "operation",
      "runtimeCommand.castTriggeredReactionSpell",
      at(
        "packages/battle-runtime/src/battle-reducer/triggered-reaction-spell-procedures.ts",
        "resolveCastTriggeredReactionSpellCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.opportunityAttack": account(
      "operation",
      "runtimeCommand.opportunityAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/opportunity-attacks.ts",
        "resolveOpportunityAttackCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseReadiedAction": account(
      "operation",
      "runtimeCommand.releaseReadiedAction",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseReadiedAttack": account(
      "operation",
      "runtimeCommand.releaseReadiedAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/opportunity-attacks.ts",
        "resolveOpportunityAttackCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseReadiedMovement": account(
      "operation",
      "runtimeCommand.releaseReadiedMovement",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedMovementCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.releaseReadiedSpell": account(
      "operation",
      "runtimeCommand.releaseReadiedSpell",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedSpellCommand",
      ),
      REASONS.admittedSubject,
    ),
    "runtimeCommand.retaliationAttack": account(
      "operation",
      "runtimeCommand.retaliationAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/opportunity-attacks.ts",
        "resolveOpportunityAttackCommand",
      ),
      REASONS.admittedSubject,
    ),
  },
  readiedActionSubjects: {
    "action.dash": account(
      "operation",
      "action.dash",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.disengage": account(
      "operation",
      "action.disengage",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.dodge": account(
      "operation",
      "action.dodge",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.escapeGrapple": account(
      "operation",
      "action.escapeGrapple",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.escapeSpellRestraint": account(
      "operation",
      "action.escapeSpellRestraint",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.grapple": account(
      "operation",
      "action.grapple",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.helpAttack": account(
      "operation",
      "action.helpAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.hide": account(
      "operation",
      "action.hide",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.search": account(
      "operation",
      "action.search",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.shakeAwakeFromAreaControl": account(
      "operation",
      "action.shakeAwakeFromAreaControl",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.shakeAwakeFromStagedCondition": account(
      "operation",
      "action.shakeAwakeFromStagedCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
    "action.shove": account(
      "operation",
      "action.shove",
      at(
        "packages/battle-runtime/src/battle-reducer/readied-release.ts",
        "resolveReleaseReadiedActionCommand",
      ),
      "Release resolves the retained action subject. The ChatGPT route must narrow that subject to its named action tool before calling the shared runtime resolver.",
    ),
  },
  battleAdmissions: {
    bonusActionStandardAction: account(
      "dispatch",
      "bonusActionStandardAction",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveBonusActionStandardActionSubject",
      ),
      REASONS.admission,
    ),
    bonusActionStandardActionRejection: account(
      "unavailable",
      "bonusActionStandardActionRejection",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveSpecializedAdmission",
      ),
      REASONS.admission,
    ),
    druidWildShape: account(
      "dispatch",
      "druidWildShape",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveDruidWildShapeUnitFeature",
      ),
      REASONS.admission,
    ),
    general: account(
      "dispatch",
      "general",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveBattleSubjectAfterD20TestNaturalOneReroll",
      ),
      REASONS.admission,
    ),
    unitFeature: account(
      "dispatch",
      "unitFeature",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveUnitFeature",
      ),
      REASONS.admission,
    ),
  },
  battleContinuations: {
    abilityCheck: account(
      "continuation",
      "abilityCheck",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    abilityChoice: account(
      "continuation",
      "abilityChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    areaWindStrength: account(
      "continuation",
      "areaWindStrength",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    attackDamageDisposition: account(
      "continuation",
      "attackDamageDisposition",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    attackRoll: account(
      "continuation",
      "attackRoll",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    companionReappearanceInitiative: account(
      "continuation",
      "companionReappearanceInitiative",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    companionReappearancePlacement: account(
      "continuation",
      "companionReappearancePlacement",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    compelledBehaviorOptionChoice: account(
      "continuation",
      "compelledBehaviorOptionChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    concentrationSavingThrow: account(
      "continuation",
      "concentrationSavingThrow",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    conditionChoice: account(
      "continuation",
      "conditionChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    controlledVerticalSuspensionAltitudeChange: account(
      "continuation",
      "controlledVerticalSuspensionAltitudeChange",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    controlledVerticalSuspensionInitialRise: account(
      "continuation",
      "controlledVerticalSuspensionInitialRise",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    cunningStrikeEndTurnCoverFacts: account(
      "continuation",
      "cunningStrikeEndTurnCoverFacts",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    damageRelationshipDecisions: account(
      "continuation",
      "damageRelationshipDecisions",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    damageTypeChoice: account(
      "continuation",
      "damageTypeChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    deathSavingThrow: account(
      "continuation",
      "deathSavingThrow",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    directionalPersistentAreaDirectionChoice: account(
      "continuation",
      "directionalPersistentAreaDirectionChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    grappleOutcome: account(
      "continuation",
      "grappleOutcome",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    heldObjectFacts: account(
      "continuation",
      "heldObjectFacts",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    helpAttackAllyDecision: account(
      "continuation",
      "helpAttackAllyDecision",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    helpAttackEnemyDecision: account(
      "continuation",
      "helpAttackEnemyDecision",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    hitPointHealingDistribution: account(
      "continuation",
      "hitPointHealingDistribution",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    interruptDecision: account(
      "continuation",
      "interruptDecision",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    movableLightPlacement: account(
      "continuation",
      "movableLightPlacement",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    movableZoneRamMovement: account(
      "continuation",
      "movableZoneRamMovement",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    movableZoneRepositionMovement: account(
      "continuation",
      "movableZoneRepositionMovement",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    movement: account(
      "continuation",
      "movement",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    objectContactTargets: account(
      "continuation",
      "objectContactTargets",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    objectDropResolution: account(
      "continuation",
      "objectDropResolution",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    objectTargetChoice: account(
      "continuation",
      "objectTargetChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    ongoingSpellTargetChoice: account(
      "continuation",
      "ongoingSpellTargetChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    persistentAreaSourceTurnTranslation: account(
      "continuation",
      "persistentAreaSourceTurnTranslation",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    readyDeclaration: account(
      "continuation",
      "readyDeclaration",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    rolledDice: account(
      "continuation",
      "rolledDice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    savingThrowOutcome: account(
      "continuation",
      "savingThrowOutcome",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    selfTransformationModeChoice: account(
      "continuation",
      "selfTransformationModeChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    shoveOutcome: account(
      "continuation",
      "shoveOutcome",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    skillChoice: account(
      "continuation",
      "skillChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    spatialMeleeSpellAttackProxyPosition: account(
      "continuation",
      "spatialMeleeSpellAttackProxyPosition",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    spawnedCompanionConnection: account(
      "continuation",
      "spawnedCompanionConnection",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    spellAreaChoice: account(
      "continuation",
      "spellAreaChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    spellTargetAllocation: account(
      "continuation",
      "spellTargetAllocation",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    spellTargetList: account(
      "continuation",
      "spellTargetList",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    startTurnOccurrenceOrder: account(
      "continuation",
      "startTurnOccurrenceOrder",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    statBlockRechargeRoll: account(
      "continuation",
      "statBlockRechargeRoll",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    targetAbilityChoices: account(
      "continuation",
      "targetAbilityChoices",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    targetChoice: account(
      "continuation",
      "targetChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    targetSpatialFacts: account(
      "continuation",
      "targetSpatialFacts",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    targetingSaveInterdictionOutcome: account(
      "continuation",
      "targetingSaveInterdictionOutcome",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    teleportDestination: account(
      "continuation",
      "teleportDestination",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    temporaryAbilityCheckRollModeActiveEffectCount: account(
      "continuation",
      "temporaryAbilityCheckRollModeActiveEffectCount",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    temporaryHitPointChoice: account(
      "continuation",
      "temporaryHitPointChoice",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    toolPossessionFacts: account(
      "continuation",
      "toolPossessionFacts",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    turnConstraintSomaticSpellFailureOutcome: account(
      "continuation",
      "turnConstraintSomaticSpellFailureOutcome",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    unitFeatureDecision: account(
      "continuation",
      "unitFeatureDecision",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    weaponAttackDamageEnhancementTargetItem: account(
      "continuation",
      "weaponAttackDamageEnhancementTargetItem",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
    wildShapeEquipmentDisposition: account(
      "continuation",
      "wildShapeEquipmentDisposition",
      at(
        "packages/battle-runtime/src/battle-runtime-transaction.ts",
        "settleBattleRuntimeTransaction",
      ),
      REASONS.battleContinuation,
    ),
  },
  unitFeatureDecisionChoices: {
    applyConditionOnFailedSave: account(
      "continuation",
      "applyConditionOnFailedSave",
      at(
        "packages/battle-runtime/src/battle-reducer/open-hand-technique.ts",
        "resolveOpenHandTechniqueAfterHit",
      ),
      REASONS.unitDecision,
    ),
    attempt: account(
      "continuation",
      "attempt",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolvers.ts",
        "resolveAttackFollowUpContinuations",
      ),
      REASONS.unitDecision,
    ),
    decline: account(
      "continuation",
      "decline",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolvers.ts",
        "resolveAttackFollowUpContinuations",
      ),
      REASONS.unitDecision,
    ),
    denyOpportunityAttacks: account(
      "continuation",
      "denyOpportunityAttacks",
      at(
        "packages/battle-runtime/src/battle-reducer/open-hand-technique.ts",
        "resolveOpenHandTechniqueAfterHit",
      ),
      REASONS.unitDecision,
    ),
    forceful_blow: account(
      "continuation",
      "forceful_blow",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-main.ts",
        "resolveBrutalStrikeAfterDamage",
      ),
      REASONS.unitDecision,
    ),
    hamstring_blow: account(
      "continuation",
      "hamstring_blow",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-main.ts",
        "resolveBrutalStrikeAfterDamage",
      ),
      REASONS.unitDecision,
    ),
    healFirst: account(
      "continuation",
      "healFirst",
      at(
        "packages/battle-runtime/src/battle-reducer/bonus-action-healing-movement.ts",
        "resolveBonusActionHealingMovement",
      ),
      REASONS.unitDecision,
    ),
    moveFirst: account(
      "continuation",
      "moveFirst",
      at(
        "packages/battle-runtime/src/battle-reducer/bonus-action-healing-movement.ts",
        "resolveBonusActionHealingMovement",
      ),
      REASONS.unitDecision,
    ),
    push: account(
      "continuation",
      "push",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-roll.ts",
        "selectedWeaponMasteryProperty",
      ),
      REASONS.unitDecision,
    ),
    pushAwayOnFailedSave: account(
      "continuation",
      "pushAwayOnFailedSave",
      at(
        "packages/battle-runtime/src/battle-reducer/open-hand-technique.ts",
        "resolveOpenHandTechniqueAfterHit",
      ),
      REASONS.unitDecision,
    ),
    sap: account(
      "continuation",
      "sap",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-roll.ts",
        "selectedWeaponMasteryProperty",
      ),
      REASONS.unitDecision,
    ),
    slow: account(
      "continuation",
      "slow",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-roll.ts",
        "selectedWeaponMasteryProperty",
      ),
      REASONS.unitDecision,
    ),
    use: account(
      "continuation",
      "use",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolvers.ts",
        "resolveAttackFollowUpContinuations",
      ),
      REASONS.unitDecision,
    ),
  },
  interruptDecisions: {
    decline: account(
      "continuation",
      "decline",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptDecision,
    ),
    resolve: account(
      "continuation",
      "resolve",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptDecision,
    ),
  },
  interruptSelections: {
    castAttackHitBonusActionSpell: account(
      "operation",
      "castAttackHitBonusActionSpell",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptSelection,
    ),
    castTriggeredReactionSpell: account(
      "operation",
      "castTriggeredReactionSpell",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptSelection,
    ),
    opportunityAttack: account(
      "operation",
      "opportunityAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptSelection,
    ),
    reactionRollOrDamageReduction: account(
      "continuation",
      "reactionRollOrDamageReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptSelection,
    ),
    releaseReadiedAction: account(
      "operation",
      "releaseReadiedAction",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptSelection,
    ),
    releaseReadiedAttack: account(
      "operation",
      "releaseReadiedAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptSelection,
    ),
    releaseReadiedMovement: account(
      "operation",
      "releaseReadiedMovement",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptSelection,
    ),
    releaseReadiedSpell: account(
      "operation",
      "releaseReadiedSpell",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptSelection,
    ),
    retaliationAttack: account(
      "operation",
      "retaliationAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveInterruptLifecycleDecision",
      ),
      REASONS.interruptSelection,
    ),
  },
  reactionModifiers: {
    abilityCheckReduction: account(
      "continuation",
      "abilityCheckReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveReactionRollOrDamageReduction",
      ),
      REASONS.reactionModifier,
    ),
    attackDamageReduction: account(
      "continuation",
      "attackDamageReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveReactionRollOrDamageReduction",
      ),
      REASONS.reactionModifier,
    ),
    attackRollReduction: account(
      "continuation",
      "attackRollReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveReactionRollOrDamageReduction",
      ),
      REASONS.reactionModifier,
    ),
    damageRollReduction: account(
      "continuation",
      "damageRollReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveReactionRollOrDamageReduction",
      ),
      REASONS.reactionModifier,
    ),
    fallDamageReduction: account(
      "continuation",
      "fallDamageReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveReactionRollOrDamageReduction",
      ),
      REASONS.reactionModifier,
    ),
  },
  spellProcedures: {
    abilityD20TestRollModeSaveGate: account(
      "dispatch",
      "abilityD20TestRollModeSaveGate",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    afterHitDamage: account(
      "dispatch",
      "afterHitDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    afterHitDamageAndIllumination: account(
      "dispatch",
      "afterHitDamageAndIllumination",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    afterHitSaveGatedCondition: account(
      "dispatch",
      "afterHitSaveGatedCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    afterHitTimedDamageAndSave: account(
      "dispatch",
      "afterHitTimedDamageAndSave",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    areaMovementDistanceDamage: account(
      "dispatch",
      "areaMovementDistanceDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    attackBurstSaveDamage: account(
      "dispatch",
      "attackBurstSaveDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    chainedSpellAttackDamage: account(
      "dispatch",
      "chainedSpellAttackDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    chosenDamageResistance: account(
      "dispatch",
      "chosenDamageResistance",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    compelledNextTurnBehavior: account(
      "dispatch",
      "compelledNextTurnBehavior",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    compositeTargetBuffWithAftermath: account(
      "dispatch",
      "compositeTargetBuffWithAftermath",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    conditionImmunityAndTurnStartTemporaryHitPoints: account(
      "dispatch",
      "conditionImmunityAndTurnStartTemporaryHitPoints",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    conditionRemovalProtection: account(
      "dispatch",
      "conditionRemovalProtection",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    controlledVerticalSuspension: account(
      "dispatch",
      "controlledVerticalSuspension",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    creatureSizeDecrease: account(
      "dispatch",
      "creatureSizeDecrease",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    creatureSizeIncrease: account(
      "dispatch",
      "creatureSizeIncrease",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    creatureTypeProtection: account(
      "dispatch",
      "creatureTypeProtection",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    damageReduction: account(
      "dispatch",
      "damageReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    directCondition: account(
      "dispatch",
      "directCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    directConditionRemoval: account(
      "dispatch",
      "directConditionRemoval",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    directHitPointRestoration: account(
      "dispatch",
      "directHitPointRestoration",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    directionalPersistentArea: account(
      "dispatch",
      "directionalPersistentArea",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    duplicateHitInterception: account(
      "dispatch",
      "duplicateHitInterception",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    fallingCreatureMitigationReaction: account(
      "dispatch",
      "fallingCreatureMitigationReaction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    fixedCostMovementReplacement: account(
      "dispatch",
      "fixedCostMovementReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    grantedAlternateActionCost: account(
      "dispatch",
      "grantedAlternateActionCost",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    grantedAreaSaveDamageAction: account(
      "dispatch",
      "grantedAreaSaveDamageAction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    heldLight: account(
      "dispatch",
      "heldLight",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    heldLightHurl: account(
      "dispatch",
      "heldLightHurl",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    linkedDefenseResistanceDamageShare: account(
      "dispatch",
      "linkedDefenseResistanceDamageShare",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    magicSuppressionEmanation: account(
      "dispatch",
      "magicSuppressionEmanation",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    magicalDarknessPointOrigin: account(
      "dispatch",
      "magicalDarknessPointOrigin",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    makeStable: account(
      "dispatch",
      "makeStable",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    markedDamageRider: account(
      "dispatch",
      "markedDamageRider",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    movableLightManifestation: account(
      "dispatch",
      "movableLightManifestation",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    objectContactDamage: account(
      "dispatch",
      "objectContactDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    objectContactDamageRepeat: account(
      "dispatch",
      "objectContactDamageRepeat",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    objectLight: account(
      "dispatch",
      "objectLight",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    ongoingSpellEnd: account(
      "dispatch",
      "ongoingSpellEnd",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    perceptionGatedAttackRollDefense: account(
      "dispatch",
      "perceptionGatedAttackRollDefense",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    persistentAreaSaveComposite: account(
      "dispatch",
      "persistentAreaSaveComposite",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    persistentAreaSaveCondition: account(
      "dispatch",
      "persistentAreaSaveCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    persistentAreaSaveConditionEscape: account(
      "dispatch",
      "persistentAreaSaveConditionEscape",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    persistentAreaSaveDamage: account(
      "dispatch",
      "persistentAreaSaveDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    persistentAreaTrait: account(
      "dispatch",
      "persistentAreaTrait",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    persistentArmorEffect: account(
      "dispatch",
      "persistentArmorEffect",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    repeatedDamageAllocation: account(
      "dispatch",
      "repeatedDamageAllocation",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    rollModifier: account(
      "dispatch",
      "rollModifier",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    saveGatedAreaControl: account(
      "dispatch",
      "saveGatedAreaControl",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    saveGatedAttackRollAdvantage: account(
      "dispatch",
      "saveGatedAttackRollAdvantage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    saveGatedCondition: account(
      "dispatch",
      "saveGatedCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    saveGatedConditionImmunity: account(
      "dispatch",
      "saveGatedConditionImmunity",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    saveGatedConditionWithRepeat: account(
      "dispatch",
      "saveGatedConditionWithRepeat",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    saveGatedDamage: account(
      "dispatch",
      "saveGatedDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    saveGatedTurnConstraintBundle: account(
      "dispatch",
      "saveGatedTurnConstraintBundle",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    scalarBuff: account(
      "dispatch",
      "scalarBuff",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    seeInvisibleObserverSight: account(
      "dispatch",
      "seeInvisibleObserverSight",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    selfTeleport: account(
      "dispatch",
      "selfTeleport",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    selfTransformationMode: account(
      "dispatch",
      "selfTransformationMode",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    spatialMeleeSpellAttackProxy: account(
      "dispatch",
      "spatialMeleeSpellAttackProxy",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    spellAttackDamage: account(
      "dispatch",
      "spellAttackDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    spellAttackSequence: account(
      "dispatch",
      "spellAttackSequence",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    spellCastInterruptionReaction: account(
      "dispatch",
      "spellCastInterruptionReaction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    spellCreatedHeldObject: account(
      "dispatch",
      "spellCreatedHeldObject",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    spellCreatedHeldObjectAttack: account(
      "dispatch",
      "spellCreatedHeldObjectAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    spellCreatedHeldObjectReEvoke: account(
      "dispatch",
      "spellCreatedHeldObjectReEvoke",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    spellHostedWeaponAttack: account(
      "dispatch",
      "spellHostedWeaponAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    stagedSaveCondition: account(
      "dispatch",
      "stagedSaveCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    targetingSaveInterdiction: account(
      "dispatch",
      "targetingSaveInterdiction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    temporaryAbilityCheckRollMode: account(
      "dispatch",
      "temporaryAbilityCheckRollMode",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    triggeredArmorDefense: account(
      "dispatch",
      "triggeredArmorDefense",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    weaponAttackDamageEnhancement: account(
      "dispatch",
      "weaponAttackDamageEnhancement",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    weaponAttackOverride: account(
      "dispatch",
      "weaponAttackOverride",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
    weaponDamageRider: account(
      "dispatch",
      "weaponDamageRider",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellLookup,
    ),
  },
  spellOperations: {
    abilityD20TestRollModeSaveGate: account(
      "operation",
      "cast:abilityD20TestRollModeSaveGate",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    afterHitDamage: account(
      "operation",
      "cast:afterHitDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    afterHitDamageAndIllumination: account(
      "operation",
      "cast:afterHitDamageAndIllumination",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    afterHitSaveGatedCondition: account(
      "operation",
      "cast:afterHitSaveGatedCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    afterHitTimedDamageAndSave: account(
      "operation",
      "cast:afterHitTimedDamageAndSave",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    areaMovementDistanceDamage: account(
      "operation",
      "cast:areaMovementDistanceDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    attackBurstSaveDamage: account(
      "operation",
      "cast:attackBurstSaveDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    chainedSpellAttackDamage: account(
      "operation",
      "cast:chainedSpellAttackDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    chosenDamageResistance: account(
      "operation",
      "cast:chosenDamageResistance",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    compelledNextTurnBehavior: account(
      "operation",
      "cast:compelledNextTurnBehavior",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    compositeTargetBuffWithAftermath: account(
      "operation",
      "cast:compositeTargetBuffWithAftermath",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    conditionImmunityAndTurnStartTemporaryHitPoints: account(
      "operation",
      "cast:conditionImmunityAndTurnStartTemporaryHitPoints",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    conditionRemovalProtection: account(
      "operation",
      "cast:conditionRemovalProtection",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    controlledVerticalSuspension: account(
      "operation",
      "cast:controlledVerticalSuspension",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    creatureSizeDecrease: account(
      "operation",
      "cast:creatureSizeDecrease",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    creatureSizeIncrease: account(
      "operation",
      "cast:creatureSizeIncrease",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    creatureTypeProtection: account(
      "operation",
      "cast:creatureTypeProtection",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    damageReduction: account(
      "operation",
      "cast:damageReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    directCondition: account(
      "operation",
      "cast:directCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    directConditionRemoval: account(
      "operation",
      "cast:directConditionRemoval",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    directHitPointRestoration: account(
      "operation",
      "cast:directHitPointRestoration",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    directionalPersistentArea: account(
      "operation",
      "cast:directionalPersistentArea",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    duplicateHitInterception: account(
      "operation",
      "cast:duplicateHitInterception",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    fallingCreatureMitigationReaction: account(
      "operation",
      "reaction:fallingCreatureMitigationReaction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    fixedCostMovementReplacement: account(
      "operation",
      "cast:fixedCostMovementReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    grantedAlternateActionCost: account(
      "operation",
      "cast:grantedAlternateActionCost",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    grantedAreaSaveDamageAction: account(
      "operation",
      "cast:grantedAreaSaveDamageAction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    heldLight: account(
      "operation",
      "cast:heldLight",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    heldLightHurl: account(
      "operation",
      "follow-up:heldLightHurl",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    linkedDefenseResistanceDamageShare: account(
      "operation",
      "cast:linkedDefenseResistanceDamageShare",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    magicSuppressionEmanation: account(
      "operation",
      "cast:magicSuppressionEmanation",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    magicalDarknessPointOrigin: account(
      "operation",
      "cast:magicalDarknessPointOrigin",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    makeStable: account(
      "operation",
      "cast:makeStable",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    "markedDamageRider.cast": account(
      "operation",
      "cast:markedDamageRider.cast",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    "markedDamageRider.transfer": account(
      "operation",
      "follow-up:markedDamageRider.transfer",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    "movableLightManifestation.create": account(
      "operation",
      "cast:movableLightManifestation.create",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    "movableLightManifestation.reposition": account(
      "operation",
      "follow-up:movableLightManifestation.reposition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    objectContactDamage: account(
      "operation",
      "cast:objectContactDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    objectContactDamageRepeat: account(
      "operation",
      "follow-up:objectContactDamageRepeat",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    objectLight: account(
      "operation",
      "cast:objectLight",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    ongoingSpellEnd: account(
      "operation",
      "follow-up:ongoingSpellEnd",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    perceptionGatedAttackRollDefense: account(
      "operation",
      "cast:perceptionGatedAttackRollDefense",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    persistentAreaSaveComposite: account(
      "operation",
      "cast:persistentAreaSaveComposite",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    persistentAreaSaveCondition: account(
      "operation",
      "cast:persistentAreaSaveCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    persistentAreaSaveConditionEscape: account(
      "operation",
      "cast:persistentAreaSaveConditionEscape",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    persistentAreaSaveDamage: account(
      "operation",
      "cast:persistentAreaSaveDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    persistentAreaTrait: account(
      "operation",
      "cast:persistentAreaTrait",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    persistentArmorEffect: account(
      "operation",
      "cast:persistentArmorEffect",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    repeatedDamageAllocation: account(
      "operation",
      "follow-up:repeatedDamageAllocation",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    rollModifier: account(
      "operation",
      "cast:rollModifier",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    saveGatedAreaControl: account(
      "operation",
      "cast:saveGatedAreaControl",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    saveGatedAttackRollAdvantage: account(
      "operation",
      "cast:saveGatedAttackRollAdvantage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    saveGatedCondition: account(
      "operation",
      "cast:saveGatedCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    saveGatedConditionImmunity: account(
      "operation",
      "cast:saveGatedConditionImmunity",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    saveGatedConditionWithRepeat: account(
      "operation",
      "cast:saveGatedConditionWithRepeat",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    "saveGatedDamage.action": account(
      "operation",
      "cast:saveGatedDamage.action",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    "saveGatedDamage.reaction": account(
      "operation",
      "reaction:saveGatedDamage.reaction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    saveGatedTurnConstraintBundle: account(
      "operation",
      "cast:saveGatedTurnConstraintBundle",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    scalarBuff: account(
      "operation",
      "cast:scalarBuff",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    seeInvisibleObserverSight: account(
      "operation",
      "cast:seeInvisibleObserverSight",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    selfTeleport: account(
      "operation",
      "cast:selfTeleport",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    selfTransformationMode: account(
      "operation",
      "cast:selfTransformationMode",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    "spatialMeleeSpellAttackProxy.createAndAttack": account(
      "operation",
      "cast:spatialMeleeSpellAttackProxy.createAndAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    "spatialMeleeSpellAttackProxy.repositionAndAttack": account(
      "operation",
      "follow-up:spatialMeleeSpellAttackProxy.repositionAndAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    spellAttackDamage: account(
      "operation",
      "cast:spellAttackDamage",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    spellAttackSequence: account(
      "operation",
      "cast:spellAttackSequence",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    spellCastInterruptionReaction: account(
      "operation",
      "reaction:spellCastInterruptionReaction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    spellCreatedHeldObject: account(
      "operation",
      "cast:spellCreatedHeldObject",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    spellCreatedHeldObjectAttack: account(
      "operation",
      "follow-up:spellCreatedHeldObjectAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    spellCreatedHeldObjectReEvoke: account(
      "operation",
      "follow-up:spellCreatedHeldObjectReEvoke",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    spellHostedWeaponAttack: account(
      "operation",
      "cast:spellHostedWeaponAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    stagedSaveCondition: account(
      "operation",
      "cast:stagedSaveCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    targetingSaveInterdiction: account(
      "operation",
      "cast:targetingSaveInterdiction",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    temporaryAbilityCheckRollMode: account(
      "operation",
      "cast:temporaryAbilityCheckRollMode",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    triggeredArmorDefense: account(
      "operation",
      "reaction:triggeredArmorDefense",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    weaponAttackDamageEnhancement: account(
      "operation",
      "cast:weaponAttackDamageEnhancement",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    weaponAttackOverride: account(
      "operation",
      "cast:weaponAttackOverride",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
    weaponDamageRider: account(
      "operation",
      "cast:weaponDamageRider",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.spellExecution,
    ),
  },
  staticSpellMechanics: {
    glyphDurableOccurrence: account(
      "internal",
      "glyphDurableOccurrence",
      at(
        "packages/battle-runtime/src/battle-reducer/glyph-durable-occurrence.ts",
        "releaseGlyphStoredSpell",
      ),
      REASONS.staticMechanics,
    ),
    spawnedCompanionLifecycle: account(
      "internal",
      "spawnedCompanionLifecycle",
      at(
        "packages/battle-runtime/src/companion-lifecycle.ts",
        "castResolvedSpawnedCompanion",
      ),
      REASONS.staticMechanics,
    ),
  },
  procedureBindings: {
    effectOccurrenceSource: account(
      "internal",
      "effectOccurrenceSource",
      at(
        "packages/battle-runtime/src/effect-execution-ref.ts",
        "allocateBattleEffectOccurrenceForCreature",
      ),
      REASONS.binding,
    ),
    spellInvocation: account(
      "dispatch",
      "spellInvocation",
      at(
        "packages/battle-runtime/src/character-execution-queries.ts",
        "characterSpellProcedure",
      ),
      REASONS.binding,
    ),
    unavailableSpellInvocation: account(
      "unavailable",
      "unavailableSpellInvocation",
      at(
        "packages/battle-runtime/src/character-execution-queries.ts",
        "characterSpellProcedure",
      ),
      REASONS.binding,
    ),
    unitFeature: account(
      "dispatch",
      "unitFeature",
      at(
        "packages/battle-runtime/src/character-execution-queries.ts",
        "characterUnitProcedure",
      ),
      REASONS.binding,
    ),
    unitSupportProfile: account(
      "dispatch",
      "unitSupportProfile",
      at(
        "packages/battle-runtime/src/character-execution-queries.ts",
        "characterUnitProcedure",
      ),
      REASONS.binding,
    ),
  },
  unitFeatureProcedures: {
    acrobaticMovement: account(
      "internal",
      "acrobaticMovement",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-procedures.ts",
        "acrobaticMovementProfileForCombatant",
      ),
      REASONS.unitFact,
    ),
    attackActionAreaSaveDamageReplacement: account(
      "operation",
      "attackActionAreaSaveDamageReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveAttackActionAreaSaveDamageReplacementUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    attackActionAttackCountScaling: account(
      "internal",
      "attackActionAttackCountScaling",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "openClassFeatureExtraAttackResource",
      ),
      REASONS.unitFact,
    ),
    attackDamageDieFloor: account(
      "continuation",
      "attackDamageDieFloor",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "selectedAttackDamageDieFloorChoice",
      ),
      REASONS.unitContinuation,
    ),
    attackDamageRider: account(
      "continuation",
      "attackDamageRider",
      at(
        "packages/battle-runtime/src/battle-reducer/hole-helpers.ts",
        "ordinaryObjectAttackOptionIsSupported",
      ),
      REASONS.unitContinuation,
    ),
    attackRollMissToHitReplacement: account(
      "continuation",
      "attackRollMissToHitReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "selectedAttackRollMissToHitReplacement",
      ),
      REASONS.unitContinuation,
    ),
    bardicInspirationGrant: account(
      "operation",
      "bardicInspirationGrant",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveBardicInspirationGrantUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    bonusActionDashTemporaryHitPoints: account(
      "operation",
      "bonusActionDashTemporaryHitPoints",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveBonusActionDashTemporaryHitPoints",
      ),
      REASONS.unitActivation,
    ),
    bonusActionDelegatedStandardActions: account(
      "operation",
      "bonusActionDelegatedStandardActions",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveSupportedAlternateActionCost",
      ),
      REASONS.unitActivation,
    ),
    creatureSpaceMovementPermission: account(
      "internal",
      "creatureSpaceMovementPermission",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-procedures.ts",
        "creatureSpaceMovementPermissionProfileForCombatant",
      ),
      REASONS.unitFact,
    ),
    d20TestNaturalOneReroll: account(
      "continuation",
      "d20TestNaturalOneReroll",
      at(
        "packages/battle-runtime/src/battle-reducer/d20-test-natural-one-reroll-procedures.ts",
        "resolveD20TestNaturalOneRerollFills",
      ),
      REASONS.unitContinuation,
    ),
    druidWildShapeKnownForm: account(
      "operation",
      "druidWildShapeKnownForm",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveDruidWildShapeUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    enemyZeroHitPointTemporaryHitPoints: account(
      "internal",
      "enemyZeroHitPointTemporaryHitPoints",
      at(
        "packages/battle-runtime/src/battle-reducer/enemy-zero-hit-point-temporary-hit-points.ts",
        "enemyZeroHitPointTemporaryHitPointsAward",
      ),
      REASONS.unitFact,
    ),
    extraActionGrant: account(
      "operation",
      "extraActionGrant",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveExtraActionGrantUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    failedAbilityCheckResourceBoost: account(
      "continuation",
      "failedAbilityCheckResourceBoost",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveFailedAbilityCheckResourceBoost",
      ),
      REASONS.unitContinuation,
    ),
    failedSavingThrowReroll: account(
      "continuation",
      "failedSavingThrowReroll",
      at(
        "packages/battle-runtime/src/battle-reducer/failed-saving-throw-reroll.ts",
        "resolveFailedSavingThrowReroll",
      ),
      REASONS.unitContinuation,
    ),
    grappler: account(
      "internal",
      "grappler",
      at(
        "packages/battle-runtime/src/battle-reducer/grappler-support-profile.ts",
        "combatantHasGrapplerSupportProfile",
      ),
      REASONS.unitFact,
    ),
    hideActionObscurementPermission: account(
      "internal",
      "hideActionObscurementPermission",
      at(
        "packages/battle-runtime/src/battle-reducer/hole-helpers.ts",
        "canHideInCurrentCircumstances",
      ),
      REASONS.unitFact,
    ),
    initiativeProficiencyAndSwap: account(
      "internal",
      "initiativeProficiencyAndSwap",
      at(
        "packages/battle-runtime/src/battle-reducer/api-lifecycle.ts",
        "applyInitiativeSwap",
      ),
      REASONS.unitFact,
    ),
    lightExtraAttackDamageAbilityModifier: account(
      "internal",
      "lightExtraAttackDamageAbilityModifier",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "attackDamageModifier",
      ),
      REASONS.unitFact,
    ),
    magicActionAreaSaveDamageHealing: account(
      "operation",
      "magicActionAreaSaveDamageHealing",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveMagicActionAreaSaveDamageHealingUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    magicActionHealingPool: account(
      "operation",
      "magicActionHealingPool",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveMagicActionHealingPoolUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    magicActionSaveGatedCondition: account(
      "operation",
      "magicActionSaveGatedCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveMagicActionSaveGatedConditionUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    martialArtsAttackProjection: account(
      "internal",
      "martialArtsAttackProjection",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "unarmedStrikeAttackDamage",
      ),
      REASONS.unitFact,
    ),
    monkFocusBattleOptions: account(
      "operation",
      "monkFocusBattleOptions",
      at(
        "packages/battle-runtime/src/battle-reducer/monk-focus.ts",
        "resolveMonkFocusOption",
      ),
      REASONS.unitActivation,
    ),
    ongoingFeature: account(
      "operation",
      "ongoingFeature",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveOngoingFeatureUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    openHandTechnique: account(
      "continuation",
      "openHandTechnique",
      at(
        "packages/battle-runtime/src/battle-reducer/open-hand-technique.ts",
        "resolveOpenHandTechniqueAfterHit",
      ),
      REASONS.unitContinuation,
    ),
    paladinSacredWeapon: account(
      "operation",
      "paladinSacredWeapon",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveUnitFeatureHeldWeaponActivation",
      ),
      REASONS.unitActivation,
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolvePaladinSacredWeaponDismissUnitFeature",
      ),
    ),
    passiveAbilityCheckRollMode: account(
      "internal",
      "passiveAbilityCheckRollMode",
      at(
        "packages/battle-runtime/src/battle-reducer/hole-helpers.ts",
        "passiveConditionEndAbilityCheckRollModeMatches",
      ),
      REASONS.unitFact,
    ),
    passiveArmorClassBonus: account(
      "internal",
      "passiveArmorClassBonus",
      at(
        "packages/character-battle-runtime/src/battle-character-build-projection.ts",
        "armorDefenseBonus",
      ),
      REASONS.unitFact,
    ),
    passiveRangedAttackRollBonus: account(
      "internal",
      "passiveRangedAttackRollBonus",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "passiveRangedAttackRollBonus",
      ),
      REASONS.unitFact,
    ),
    passiveSavingThrowRollMode: account(
      "internal",
      "passiveSavingThrowRollMode",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-damage-fills.ts",
        "passiveSavingThrowRollModeProjection",
      ),
      REASONS.unitFact,
    ),
    passiveSpeedBonus: account(
      "internal",
      "passiveSpeedBonus",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-speed-facts.ts",
        "passiveSpeedBonusDelta",
      ),
      REASONS.unitFact,
    ),
    passiveSpeedKindGrants: account(
      "internal",
      "passiveSpeedKindGrants",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-speed-facts.ts",
        "passiveSpeedBonusDelta",
      ),
      REASONS.unitFact,
    ),
    potentCantrip: account(
      "internal",
      "potentCantrip",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-resolve-save-gates.ts",
        "potentCantripAppliesToSuccessfulSave",
      ),
      REASONS.unitFact,
    ),
    reactionRollOrDamageReduction: account(
      "continuation",
      "reactionRollOrDamageReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveReactionRollOrDamageReduction",
      ),
      REASONS.unitContinuation,
    ),
    remarkableAthlete: account(
      "internal",
      "remarkableAthlete",
      at(
        "packages/battle-runtime/src/battle-reducer/api-lifecycle.ts",
        "requiredInitiativeRollModeForCombatant",
      ),
      REASONS.unitFact,
    ),
    retaliationReactionAttack: account(
      "continuation",
      "retaliationReactionAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-execution.ts",
        "retaliationReactionAttackChoices",
      ),
      REASONS.unitContinuation,
    ),
    rogueSteadyAim: account(
      "operation",
      "rogueSteadyAim",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveRogueSteadyAimUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    saveDamageReplacement: account(
      "internal",
      "saveDamageReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-damage-fills.ts",
        "saveDamageReplacementForInvocation",
      ),
      REASONS.unitFact,
    ),
    selfBonusActionHealing: account(
      "operation",
      "selfBonusActionHealing",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveSelfBonusActionHealingUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    spellSlotHealingModifier: account(
      "internal",
      "spellSlotHealingModifier",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/direct-hit-point-restoration.ts",
        "spellSlotHealingModifierAmount",
      ),
      REASONS.unitFact,
    ),
    stunningStrike: account(
      "continuation",
      "stunningStrike",
      at(
        "packages/battle-runtime/src/battle-reducer/stunning-strike.ts",
        "resolveStunningStrikeAfterHit",
      ),
      REASONS.unitContinuation,
    ),
    weaponDamageDiceRollChoice: account(
      "continuation",
      "weaponDamageDiceRollChoice",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "selectedWeaponDamageDiceRollChoice",
      ),
      REASONS.unitContinuation,
    ),
    zeroHitPointReplacement: account(
      "continuation",
      "zeroHitPointReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/damage-apply.ts",
        "applyHpDamage",
      ),
      REASONS.unitContinuation,
    ),
  },
  unitSupportProcedures: {
    acrobaticMovement: account(
      "internal",
      "acrobaticMovement",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-procedures.ts",
        "acrobaticMovementProfileForCombatant",
      ),
      REASONS.unitFact,
    ),
    alternateActionCost: account(
      "operation",
      "alternateActionCost",
      at(
        "packages/battle-runtime/src/battle-reducer/hole-helpers.ts",
        "alternateActionCostProfilesForActor",
      ),
      REASONS.unitActivation,
    ),
    attackActionAreaSaveDamageReplacement: account(
      "operation",
      "attackActionAreaSaveDamageReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveAttackActionAreaSaveDamageReplacementUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    attackActionAttackCountScaling: account(
      "internal",
      "attackActionAttackCountScaling",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "openClassFeatureExtraAttackResource",
      ),
      REASONS.unitFact,
    ),
    attackDamageDieFloor: account(
      "continuation",
      "attackDamageDieFloor",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "selectedAttackDamageDieFloorChoice",
      ),
      REASONS.unitContinuation,
    ),
    attackDamageReductionZeroDamageRedirect: account(
      "continuation",
      "attackDamageReductionZeroDamageRedirect",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-damage-redirect.ts",
        "resolveAttackDamageReductionZeroDamageRedirectAfterReduction",
      ),
      REASONS.unitContinuation,
    ),
    attackDamageRider: account(
      "continuation",
      "attackDamageRider",
      at(
        "packages/battle-runtime/src/battle-reducer/hole-helpers.ts",
        "ordinaryObjectAttackOptionIsSupported",
      ),
      REASONS.unitContinuation,
    ),
    attackRollDefense: account(
      "continuation",
      "attackRollDefense",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-roll-defense.ts",
        "defenses",
      ),
      REASONS.unitContinuation,
    ),
    attackRollMissToHitReplacement: account(
      "continuation",
      "attackRollMissToHitReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "selectedAttackRollMissToHitReplacement",
      ),
      REASONS.unitContinuation,
    ),
    bardicInspirationGrant: account(
      "operation",
      "bardicInspirationGrant",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveBardicInspirationGrantUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    bonusActionDashTemporaryHitPoints: account(
      "operation",
      "bonusActionDashTemporaryHitPoints",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveBonusActionDashTemporaryHitPoints",
      ),
      REASONS.unitActivation,
    ),
    bonusActionDelegatedStandardActions: account(
      "operation",
      "bonusActionDelegatedStandardActions",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveSupportedAlternateActionCost",
      ),
      REASONS.unitActivation,
    ),
    ongoingFeatureActivationMovementRider: account(
      "continuation",
      "ongoingFeatureActivationMovementRider",
      at(
        "packages/battle-runtime/src/battle-reducer/ongoing-feature-activation-movement.ts",
        "resolveOngoingFeatureActivationMovement",
      ),
      REASONS.unitContinuation,
    ),
    passiveInitiativeRollMode: account(
      "internal",
      "passiveInitiativeRollMode",
      at(
        "packages/battle-runtime/src/battle-reducer/api-lifecycle.ts",
        "requiredInitiativeRollModeForCombatant",
      ),
      REASONS.unitFact,
    ),
    bonusActionHealingMovementRider: account(
      "continuation",
      "bonusActionHealingMovementRider",
      at(
        "packages/battle-runtime/src/battle-reducer/bonus-action-healing-movement.ts",
        "resolveBonusActionHealingMovement",
      ),
      REASONS.unitContinuation,
    ),
    brutalStrike: account(
      "continuation",
      "brutalStrike",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-main.ts",
        "resolveBrutalStrikeAfterDamage",
      ),
      REASONS.unitContinuation,
    ),
    creatureSpaceMovementPermission: account(
      "internal",
      "creatureSpaceMovementPermission",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-procedures.ts",
        "creatureSpaceMovementPermissionProfileForCombatant",
      ),
      REASONS.unitFact,
    ),
    cunningStrike: account(
      "continuation",
      "cunningStrike",
      at(
        "packages/battle-runtime/src/battle-reducer/cunning-strike.ts",
        "resolveCunningStrikeAfterAttackDamage",
      ),
      REASONS.unitContinuation,
    ),
    cunningStrikeOptionGrant: account(
      "continuation",
      "cunningStrikeOptionGrant",
      at(
        "packages/battle-runtime/src/battle-reducer/cunning-strike.ts",
        "eligibleCunningStrikeContexts",
      ),
      REASONS.unitContinuation,
    ),
    d20TestNaturalOneReroll: account(
      "continuation",
      "d20TestNaturalOneReroll",
      at(
        "packages/battle-runtime/src/battle-reducer/d20-test-natural-one-reroll-procedures.ts",
        "resolveD20TestNaturalOneRerollFills",
      ),
      REASONS.unitContinuation,
    ),
    druidWildCompanionSpellCast: account(
      "operation",
      "druidWildCompanionSpellCast",
      at(
        "packages/battle-runtime/src/companion-lifecycle.ts",
        "castWildCompanion",
      ),
      REASONS.unitActivation,
    ),
    druidWildShapeKnownForm: account(
      "operation",
      "druidWildShapeKnownForm",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveDruidWildShapeUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    enemyZeroHitPointTemporaryHitPoints: account(
      "internal",
      "enemyZeroHitPointTemporaryHitPoints",
      at(
        "packages/battle-runtime/src/battle-reducer/enemy-zero-hit-point-temporary-hit-points.ts",
        "enemyZeroHitPointTemporaryHitPointsAward",
      ),
      REASONS.unitFact,
    ),
    failedAbilityCheckResourceBoost: account(
      "continuation",
      "failedAbilityCheckResourceBoost",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveFailedAbilityCheckResourceBoost",
      ),
      REASONS.unitContinuation,
    ),
    failedSavingThrowReroll: account(
      "continuation",
      "failedSavingThrowReroll",
      at(
        "packages/battle-runtime/src/battle-reducer/failed-saving-throw-reroll.ts",
        "resolveFailedSavingThrowReroll",
      ),
      REASONS.unitContinuation,
    ),
    grappler: account(
      "internal",
      "grappler",
      at(
        "packages/battle-runtime/src/battle-reducer/grappler-support-profile.ts",
        "combatantHasGrapplerSupportProfile",
      ),
      REASONS.unitFact,
    ),
    hideActionObscurementPermission: account(
      "internal",
      "hideActionObscurementPermission",
      at(
        "packages/battle-runtime/src/battle-reducer/hole-helpers.ts",
        "canHideInCurrentCircumstances",
      ),
      REASONS.unitFact,
    ),
    huntersPrey: account(
      "continuation",
      "huntersPrey",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-main.ts",
        "resolveHuntersPreyHordeBreakerContinuation",
      ),
      REASONS.unitContinuation,
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "eligibleAttackDamageRiders",
      ),
    ),
    initiativeProficiencyAndSwap: account(
      "internal",
      "initiativeProficiencyAndSwap",
      at(
        "packages/battle-runtime/src/battle-reducer/api-lifecycle.ts",
        "applyInitiativeSwap",
      ),
      REASONS.unitFact,
    ),
    lightExtraAttackDamageAbilityModifier: account(
      "internal",
      "lightExtraAttackDamageAbilityModifier",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "attackDamageModifier",
      ),
      REASONS.unitFact,
    ),
    magicActionAreaSaveDamageHealing: account(
      "operation",
      "magicActionAreaSaveDamageHealing",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveMagicActionAreaSaveDamageHealingUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    magicActionHealingPool: account(
      "operation",
      "magicActionHealingPool",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveMagicActionHealingPoolUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    magicActionSaveGatedCondition: account(
      "operation",
      "magicActionSaveGatedCondition",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveMagicActionSaveGatedConditionUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    markedCreatureDefensesDisclosure: account(
      "internal",
      "markedCreatureDefensesDisclosure",
      at(
        "packages/battle-runtime/src/marked-creature-defenses.ts",
        "markedCreatureDisclosureSpellRefs",
      ),
      REASONS.unitFact,
    ),
    martialArtsAttackProjection: account(
      "internal",
      "martialArtsAttackProjection",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "unarmedStrikeAttackDamage",
      ),
      REASONS.unitFact,
    ),
    monkFocusBattleOptions: account(
      "operation",
      "monkFocusBattleOptions",
      at(
        "packages/battle-runtime/src/battle-reducer/monk-focus.ts",
        "resolveMonkFocusOption",
      ),
      REASONS.unitActivation,
    ),
    openHandTechnique: account(
      "continuation",
      "openHandTechnique",
      at(
        "packages/battle-runtime/src/battle-reducer/open-hand-technique.ts",
        "resolveOpenHandTechniqueAfterHit",
      ),
      REASONS.unitContinuation,
    ),
    paladinSacredWeapon: account(
      "operation",
      "paladinSacredWeapon",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveUnitFeatureHeldWeaponActivation",
      ),
      REASONS.unitActivation,
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolvePaladinSacredWeaponDismissUnitFeature",
      ),
    ),
    passiveAbilityCheckRollMode: account(
      "internal",
      "passiveAbilityCheckRollMode",
      at(
        "packages/battle-runtime/src/battle-reducer/hole-helpers.ts",
        "passiveConditionEndAbilityCheckRollModeMatches",
      ),
      REASONS.unitFact,
    ),
    passiveArmorClassBonus: account(
      "internal",
      "passiveArmorClassBonus",
      at(
        "packages/character-battle-runtime/src/battle-character-build-projection.ts",
        "armorDefenseBonus",
      ),
      REASONS.unitFact,
    ),
    passiveDamageResistance: account(
      "internal",
      "passiveDamageResistance",
      at(
        "packages/battle-runtime/src/battle-reducer/damage-helpers.ts",
        "characterExecutionGrantsPassiveDamageResistance",
      ),
      REASONS.unitFact,
    ),
    passiveRangedAttackRollBonus: account(
      "internal",
      "passiveRangedAttackRollBonus",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "passiveRangedAttackRollBonus",
      ),
      REASONS.unitFact,
    ),
    passiveSavingThrowRollMode: account(
      "internal",
      "passiveSavingThrowRollMode",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-damage-fills.ts",
        "passiveSavingThrowRollModeProjection",
      ),
      REASONS.unitFact,
    ),
    passiveSpeedBonus: account(
      "internal",
      "passiveSpeedBonus",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-speed-facts.ts",
        "passiveSpeedBonusDelta",
      ),
      REASONS.unitFact,
    ),
    passiveSpeedKindGrants: account(
      "internal",
      "passiveSpeedKindGrants",
      at(
        "packages/battle-runtime/src/battle-reducer/movement-speed-facts.ts",
        "passiveSpeedBonusDelta",
      ),
      REASONS.unitFact,
    ),
    potentCantrip: account(
      "internal",
      "potentCantrip",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-resolve-save-gates.ts",
        "potentCantripAppliesToSuccessfulSave",
      ),
      REASONS.unitFact,
    ),
    reactionRollOrDamageReduction: account(
      "continuation",
      "reactionRollOrDamageReduction",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts",
        "resolveReactionRollOrDamageReduction",
      ),
      REASONS.unitContinuation,
    ),
    remarkableAthlete: account(
      "internal",
      "remarkableAthlete",
      at(
        "packages/battle-runtime/src/battle-reducer/api-lifecycle.ts",
        "requiredInitiativeRollModeForCombatant",
      ),
      REASONS.unitFact,
    ),
    retaliationReactionAttack: account(
      "continuation",
      "retaliationReactionAttack",
      at(
        "packages/battle-runtime/src/battle-reducer/interrupt-execution.ts",
        "retaliationReactionAttackChoices",
      ),
      REASONS.unitContinuation,
    ),
    rogueSteadyAim: account(
      "operation",
      "rogueSteadyAim",
      at(
        "packages/battle-runtime/src/battle-reducer/unit-features.ts",
        "resolveRogueSteadyAimUnitFeature",
      ),
      REASONS.unitActivation,
    ),
    saveDamageReplacement: account(
      "internal",
      "saveDamageReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/spells-damage-fills.ts",
        "saveDamageReplacementForInvocation",
      ),
      REASONS.unitFact,
    ),
    spellSlotHealingModifier: account(
      "internal",
      "spellSlotHealingModifier",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/direct-hit-point-restoration.ts",
        "spellSlotHealingModifierAmount",
      ),
      REASONS.unitFact,
    ),
    stunningStrike: account(
      "continuation",
      "stunningStrike",
      at(
        "packages/battle-runtime/src/battle-reducer/stunning-strike.ts",
        "resolveStunningStrikeAfterHit",
      ),
      REASONS.unitContinuation,
    ),
    tacticalMasterReplacement: account(
      "continuation",
      "tacticalMasterReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-roll.ts",
        "selectedWeaponMasteryProperty",
      ),
      REASONS.unitContinuation,
    ),
    weaponDamageDiceRollChoice: account(
      "continuation",
      "weaponDamageDiceRollChoice",
      at(
        "packages/battle-runtime/src/battle-reducer/statblock-attacks.ts",
        "selectedWeaponDamageDiceRollChoice",
      ),
      REASONS.unitContinuation,
    ),
    weaponMasteryCleave: account(
      "continuation",
      "weaponMasteryCleave",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-main.ts",
        "resolveWeaponMasteryCleaveContinuation",
      ),
      REASONS.unitContinuation,
    ),
    weaponMasteryPush: account(
      "continuation",
      "weaponMasteryPush",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-roll.ts",
        "applyWeaponMasteryPushOnHit",
      ),
      REASONS.unitContinuation,
    ),
    weaponMasterySap: account(
      "internal",
      "weaponMasterySap",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-roll.ts",
        "applyWeaponMasterySapOnHit",
      ),
      REASONS.unitFact,
    ),
    weaponMasterySlow: account(
      "internal",
      "weaponMasterySlow",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-roll.ts",
        "applyWeaponMasterySlowAfterDamage",
      ),
      REASONS.unitFact,
    ),
    weaponMasteryTopple: account(
      "continuation",
      "weaponMasteryTopple",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-roll.ts",
        "applyWeaponMasteryToppleSavingThrow",
      ),
      REASONS.unitContinuation,
    ),
    weaponOrUnarmedCriticalRange19: account(
      "internal",
      "weaponOrUnarmedCriticalRange19",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "criticalThresholdForAttack",
      ),
      REASONS.unitFact,
    ),
    zeroHitPointReplacement: account(
      "continuation",
      "zeroHitPointReplacement",
      at(
        "packages/battle-runtime/src/battle-reducer/damage-apply.ts",
        "applyHpDamage",
      ),
      REASONS.unitContinuation,
    ),
  },
  statBlockProcedures: {
    attack: account(
      "operation",
      "attack",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-main.ts",
        "resolveAttack",
      ),
      REASONS.statBlockBinding,
    ),
    bonusActionOption: account(
      "dispatch",
      "bonusActionOption",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveStatBlockBonusActionOptionSubject",
      ),
      REASONS.statBlockBinding,
    ),
    effectOccurrenceSource: account(
      "internal",
      "effectOccurrenceSource",
      at(
        "packages/battle-runtime/src/effect-execution-ref.ts",
        "allocateBattleEffectOccurrenceForCreature",
      ),
      REASONS.statBlockBinding,
    ),
    multiattack: account(
      "operation",
      "multiattack",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveMultiattackSubject",
      ),
      REASONS.statBlockBinding,
    ),
    spellcasting: account(
      "dispatch",
      "spellcasting",
      at(
        "packages/battle-runtime/src/procedure-admission/stat-block-procedure-execution-decision.ts",
        "runtimeSpellcastingBinding",
      ),
      REASONS.statBlockBinding,
    ),
    unarmedStrike: account(
      "operation",
      "unarmedStrike",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-main.ts",
        "resolveAttack",
      ),
      REASONS.statBlockBinding,
    ),
  },
  statBlockBonusActions: {
    disengage: account(
      "operation",
      "bonus:disengage",
      at(
        "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
        "resolveStatBlockBonusActionDisengage",
      ),
      REASONS.statBlockBonusAction,
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveStatBlockBonusActionOptionSubject",
      ),
    ),
    hide: account(
      "operation",
      "bonus:hide",
      at(
        "packages/battle-runtime/src/battle-reducer/dispatcher.ts",
        "resolveStatBlockBonusActionOptionSubject",
      ),
      REASONS.statBlockBonusAction,
    ),
  },
  spellRegistryPorts: {
    executionFor: account(
      "dispatch",
      "executionFor",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
        "registeredSpellProcedureExecutions",
      ),
      REASONS.registryPort,
    ),
    releaseStoredGlyph: account(
      "internal",
      "releaseStoredGlyph",
      at(
        "packages/battle-runtime/src/battle-reducer/glyph-durable-occurrence.ts",
        "releaseGlyphStoredSpell",
      ),
      REASONS.registryPort,
    ),
    resolveStoredGlyph: account(
      "internal",
      "resolveStoredGlyph",
      at(
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/stored-glyph-resolution.ts",
        "executeStoredGlyphSpellProcedure",
      ),
      REASONS.registryPort,
    ),
  },
  characterMutations: {
    advanceClassLevel: account(
      "operation",
      "advanceClassLevel",
      at(
        "packages/mcp/src/character-session-operation-tool.ts",
        "applyAdvanceClassLevelOperation",
      ),
      REASONS.characterMutation,
    ),
    applyLayOnHands: account(
      "operation",
      "applyLayOnHands",
      at(
        "packages/mcp/src/character-session-healing-operation.ts",
        "applyHealingCharacterSessionOperation",
      ),
      REASONS.characterMutation,
    ),
    applySpellRestBenefit: account(
      "operation",
      "applySpellRestBenefit",
      at(
        "packages/mcp/src/character-session-healing-operation.ts",
        "applyHealingCharacterSessionOperation",
      ),
      REASONS.characterMutation,
    ),
    completeLongRest: account(
      "operation",
      "completeLongRest",
      at(
        "packages/mcp/src/character-session-rest-operation.ts",
        "applyCompleteLongRestOperation",
      ),
      REASONS.characterMutation,
    ),
    completeShortRest: account(
      "operation",
      "completeShortRest",
      at(
        "packages/mcp/src/character-session-rest-operation.ts",
        "applyCompleteShortRestOperation",
      ),
      REASONS.characterMutation,
    ),
    convertFontOfMagicSorceryPointsToSpellSlot: account(
      "operation",
      "convertFontOfMagicSorceryPointsToSpellSlot",
      at(
        "packages/mcp/src/character-session-resource-operation.ts",
        "applyCharacterSessionResourceOperation",
      ),
      REASONS.characterMutation,
    ),
    convertFontOfMagicSpellSlotToSorceryPoints: account(
      "operation",
      "convertFontOfMagicSpellSlotToSorceryPoints",
      at(
        "packages/mcp/src/character-session-resource-operation.ts",
        "applyCharacterSessionResourceOperation",
      ),
      REASONS.characterMutation,
    ),
    interruptLongRest: account(
      "operation",
      "interruptLongRest",
      at(
        "packages/mcp/src/character-session-rest-operation.ts",
        "applyInterruptLongRestOperation",
      ),
      REASONS.characterMutation,
    ),
    interruptShortRest: account(
      "operation",
      "interruptShortRest",
      at(
        "packages/mcp/src/character-session-rest-operation.ts",
        "applyInterruptShortRestOperation",
      ),
      REASONS.characterMutation,
    ),
    passCalendarTime: account(
      "operation",
      "passCalendarTime",
      at(
        "packages/mcp/src/character-session-calendar-operation.ts",
        "applyPassCalendarTimeOperation",
      ),
      REASONS.characterMutation,
    ),
    replaceDruidWildShapeKnownForm: account(
      "operation",
      "replaceDruidWildShapeKnownForm",
      at(
        "packages/mcp/src/character-session-operation-tool.ts",
        "applyReplaceDruidWildShapeKnownFormOperation",
      ),
      REASONS.characterMutation,
    ),
    retainOneAtATimeCompanion: account(
      "operation",
      "retainOneAtATimeCompanion",
      at(
        "packages/mcp/src/character-session-companion-operation.ts",
        "applyRetainOneAtATimeCompanionOperation",
      ),
      REASONS.characterMutation,
    ),
    setEquipmentLoadout: account(
      "operation",
      "setEquipmentLoadout",
      at(
        "packages/mcp/src/character-session-equipment-operation.ts",
        "applySetEquipmentLoadoutOperation",
      ),
      REASONS.characterMutation,
    ),
    spendSpellAccessFreeCast: account(
      "operation",
      "spendSpellAccessFreeCast",
      at(
        "packages/mcp/src/character-session-resource-operation.ts",
        "applyCharacterSessionResourceOperation",
      ),
      REASONS.characterMutation,
    ),
    useMonkUncannyMetabolismWhenRollingInitiative: account(
      "operation",
      "useMonkUncannyMetabolismWhenRollingInitiative",
      at(
        "packages/mcp/src/character-session-resource-operation.ts",
        "applyCharacterSessionResourceOperation",
      ),
      REASONS.characterMutation,
    ),
  },
  characterQueries: {
    abilityCheckAbility: account(
      "operation",
      "abilityCheckAbility",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    abilityCheckProficiencyBonus: account(
      "operation",
      "abilityCheckProficiencyBonus",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    armorClass: account(
      "operation",
      "armorClass",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    jumpDistanceAbility: account(
      "operation",
      "jumpDistanceAbility",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    knownForms: account(
      "operation",
      "knownForms",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    linkedSpeedGrants: account(
      "operation",
      "linkedSpeedGrants",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    spellAccess: account(
      "operation",
      "spellAccess",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    spellInvocation: account(
      "operation",
      "spellInvocation",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    spellbookRitualAccess: account(
      "operation",
      "spellbookRitualAccess",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    spellbookRitualAccesses: account(
      "operation",
      "spellbookRitualAccesses",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
    weaponMasterySelections: account(
      "operation",
      "weaponMasterySelections",
      at(
        "packages/mcp/src/character-session-query.ts",
        "projectCharacterSessionQuery",
      ),
      REASONS.characterQuery,
    ),
  },
  battleLifecycle: {
    addCombatant: account(
      "operation",
      "addCombatant",
      at(
        "packages/mcp/src/battle-roster-lifecycle.ts",
        "handleActiveBattleRosterOperation",
      ),
      REASONS.battleLifecycle,
    ),
    applyInitiativeSwap: account(
      "operation",
      "applyInitiativeSwap",
      at("packages/mcp/src/battle-lifecycle-tool.ts", "applySwap"),
      REASONS.battleLifecycle,
    ),
    finalizeInitialInitiativeSetup: account(
      "operation",
      "finalizeInitialInitiativeSetup",
      at("packages/mcp/src/battle-lifecycle-tool.ts", "finalizeSetup"),
      REASONS.battleLifecycle,
    ),
    removeCombatant: account(
      "operation",
      "removeCombatant",
      at(
        "packages/mcp/src/battle-roster-lifecycle.ts",
        "handleActiveBattleRosterOperation",
      ),
      REASONS.battleLifecycle,
    ),
  },
  creationInputs: {
    abilityScores: account(
      "continuation",
      "abilityScores",
      at(
        "packages/character-creation-runtime/src/fill-reducer.ts",
        "fillCreationHoles",
      ),
      REASONS.creationInput,
    ),
    choice: account(
      "continuation",
      "choice",
      at(
        "packages/character-creation-runtime/src/fill-reducer.ts",
        "fillCreationHoles",
      ),
      REASONS.creationInput,
    ),
  },
} as const satisfies OperationAccounting;
