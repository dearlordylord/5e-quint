import { Match } from "effect";
import type { OperationDomains } from "./execution-domains.ts";
import { CHATGPT_TOOL_PLAN, type ChatGptToolName } from "./tool-catalog.ts";
import {
  tool,
  refine,
  internal,
  unavailable,
  type ChatGptExposure,
  type ChatGptExposureAccounting,
} from "./operation-exposure.ts";
import { BATTLE_SUBJECT_EXPOSURE } from "./battle-subject-exposure.ts";
import {
  UNIT_FEATURE_EXPOSURE,
  UNIT_SUPPORT_EXPOSURE,
} from "./unit-procedure-exposure.ts";
import {
  SPELL_PROCEDURE_EXPOSURE,
  SPELL_OPERATION_EXPOSURE,
} from "./spell-operation-exposure.ts";
export { CHATGPT_TOOL_PLAN };
export type { ChatGptToolName, ChatGptToolFamily } from "./tool-catalog.ts";
export type {
  ChatGptExposure,
  ChatGptExposureAccounting,
} from "./operation-exposure.ts";

export const CHATGPT_ORDINARY_BATTLE_CONTINUATION = tool("answer_battle_hole");

// A ChatGPT-specific exposure plan. This module does not register MCP tools.
// The ordinary MCP continues to use its existing definitions and handlers.
// Every key is a canonical execution discriminator. References must be refined
// to a concrete procedure or retained action before selecting an exposed tool.
export const CHATGPT_OPERATION_EXPOSURE = {
  publicTools: {
    apply_character_session_operation: refine("characterMutations"),
    battle_lifecycle: refine("battleLifecycle"),
    create_character_draft: tool("create_character_draft"),
    create_play_session: tool("create_play_session"),
    delete_saved_play_session: tool("delete_saved_play_session"),
    describe_mcp_workflow: tool("describe_mcp_workflow"),
    discover_battle_acts: tool("discover_battle_acts"),
    discover_creation_holes: tool("discover_creation_holes"),
    end_battle: tool("end_battle"),
    end_turn: tool("end_turn"),
    fill_battle_hole: refine("battleContinuations"),
    fill_creation_holes: tool("fill_creation_holes"),
    finalize_character: tool("finalize_character"),
    inspect_catalog_unit: tool("inspect_catalog_unit"),
    inspect_character_session: tool("inspect_character_session"),
    list_catalog_units: tool("list_catalog_units"),
    list_characters: tool("list_characters"),
    list_saved_play_sessions: tool("list_saved_play_sessions"),
    list_stat_blocks: tool("list_stat_blocks"),
    query_character_session: refine("characterQueries"),
    read_battle_state: tool("read_battle_state"),
    read_play_session: tool("read_play_session"),
    resolve_battle_act: refine("battleSubjects"),
    roll_dice: tool("roll_dice"),
    select_stat_block: tool("select_stat_block"),
    start_battle: tool("start_battle"),
  },
  battleSubjects: BATTLE_SUBJECT_EXPOSURE,
  battleInterruptSubjects: {
    "runtimeCommand.castAttackHitBonusActionSpell":
      BATTLE_SUBJECT_EXPOSURE["runtimeCommand.castAttackHitBonusActionSpell"],
    "runtimeCommand.castTriggeredReactionSpell":
      BATTLE_SUBJECT_EXPOSURE["runtimeCommand.castTriggeredReactionSpell"],
    "runtimeCommand.opportunityAttack":
      BATTLE_SUBJECT_EXPOSURE["runtimeCommand.opportunityAttack"],
    "runtimeCommand.releaseReadiedAction":
      BATTLE_SUBJECT_EXPOSURE["runtimeCommand.releaseReadiedAction"],
    "runtimeCommand.releaseReadiedAttack":
      BATTLE_SUBJECT_EXPOSURE["runtimeCommand.releaseReadiedAttack"],
    "runtimeCommand.releaseReadiedMovement":
      BATTLE_SUBJECT_EXPOSURE["runtimeCommand.releaseReadiedMovement"],
    "runtimeCommand.releaseReadiedSpell":
      BATTLE_SUBJECT_EXPOSURE["runtimeCommand.releaseReadiedSpell"],
    "runtimeCommand.retaliationAttack":
      BATTLE_SUBJECT_EXPOSURE["runtimeCommand.retaliationAttack"],
  },
  readiedActionSubjects: {
    "action.dash": BATTLE_SUBJECT_EXPOSURE["action.dash"],
    "action.disengage": BATTLE_SUBJECT_EXPOSURE["action.disengage"],
    "action.dodge": BATTLE_SUBJECT_EXPOSURE["action.dodge"],
    "action.escapeGrapple": BATTLE_SUBJECT_EXPOSURE["action.escapeGrapple"],
    "action.escapeSpellRestraint":
      BATTLE_SUBJECT_EXPOSURE["action.escapeSpellRestraint"],
    "action.grapple": BATTLE_SUBJECT_EXPOSURE["action.grapple"],
    "action.helpAttack": BATTLE_SUBJECT_EXPOSURE["action.helpAttack"],
    "action.hide": BATTLE_SUBJECT_EXPOSURE["action.hide"],
    "action.search": BATTLE_SUBJECT_EXPOSURE["action.search"],
    "action.shakeAwakeFromAreaControl":
      BATTLE_SUBJECT_EXPOSURE["action.shakeAwakeFromAreaControl"],
    "action.shakeAwakeFromStagedCondition":
      BATTLE_SUBJECT_EXPOSURE["action.shakeAwakeFromStagedCondition"],
    "action.shove": BATTLE_SUBJECT_EXPOSURE["action.shove"],
  },
  battleAdmissions: {
    bonusActionStandardAction: refine("battleSubjects"),
    bonusActionStandardActionRejection: unavailable(),
    druidWildShape: refine("battleSubjects"),
    general: refine("battleSubjects"),
    unitFeature: refine("unitFeatureProcedures"),
  },
  battleContinuations: {
    abilityCheck: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    abilityChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    areaWindStrength: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    attackDamageDisposition: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    attackRoll: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    companionReappearanceInitiative: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    companionReappearancePlacement: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    compelledBehaviorOptionChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    concentrationSavingThrow: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    conditionChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    controlledVerticalSuspensionAltitudeChange:
      CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    controlledVerticalSuspensionInitialRise:
      CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    cunningStrikeEndTurnCoverFacts: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    damageRelationshipDecisions: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    damageTypeChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    deathSavingThrow: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    directionalPersistentAreaDirectionChoice:
      CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    grappleOutcome: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    heldObjectFacts: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    helpAttackAllyDecision: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    helpAttackEnemyDecision: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    hitPointHealingDistribution: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    interruptDecision: refine("interruptDecisions"),
    movableLightPlacement: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    movableZoneRamMovement: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    movableZoneRepositionMovement: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    movement: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    objectContactTargets: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    objectDropResolution: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    objectTargetChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    ongoingSpellTargetChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    persistentAreaSourceTurnTranslation: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    readyDeclaration: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    rolledDice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    savingThrowOutcome: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    selfTransformationModeChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    shoveOutcome: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    skillChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    spatialMeleeSpellAttackProxyPosition: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    spawnedCompanionConnection: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    spellAreaChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    spellTargetAllocation: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    spellTargetList: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    startTurnOccurrenceOrder: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    statBlockRechargeRoll: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    targetAbilityChoices: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    targetChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    targetSpatialFacts: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    targetingSaveInterdictionOutcome: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    teleportDestination: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    temporaryAbilityCheckRollModeActiveEffectCount:
      CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    temporaryHitPointChoice: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    toolPossessionFacts: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    turnConstraintSomaticSpellFailureOutcome:
      CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    unitFeatureDecision: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    weaponAttackDamageEnhancementTargetItem:
      CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    wildShapeEquipmentDisposition: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
  },
  unitFeatureDecisionChoices: {
    applyConditionOnFailedSave: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    attempt: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    decline: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    denyOpportunityAttacks: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    forceful_blow: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    hamstring_blow: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    healFirst: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    moveFirst: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    push: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    pushAwayOnFailedSave: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    sap: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    slow: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
    use: CHATGPT_ORDINARY_BATTLE_CONTINUATION,
  },
  interruptDecisions: {
    decline: tool("decline_reaction"),
    resolve: refine("interruptSelections"),
  },
  interruptSelections: {
    castAttackHitBonusActionSpell: tool("cast_spell"),
    castTriggeredReactionSpell: tool("cast_spell"),
    opportunityAttack: tool("attack"),
    reactionRollOrDamageReduction: refine("reactionModifiers"),
    releaseReadiedAction: refine("readiedActionSubjects"),
    releaseReadiedAttack: tool("attack"),
    releaseReadiedMovement: tool("move"),
    releaseReadiedSpell: tool("release_readied_spell"),
    retaliationAttack: tool("attack"),
  },
  reactionModifiers: {
    abilityCheckReduction: tool("reduce_ability_check"),
    attackDamageReduction: tool("reduce_attack_damage"),
    attackRollReduction: tool("reduce_attack_roll"),
    damageRollReduction: tool("reduce_damage_roll"),
    fallDamageReduction: tool("reduce_fall_damage"),
  },
  spellProcedures: SPELL_PROCEDURE_EXPOSURE,
  spellOperations: SPELL_OPERATION_EXPOSURE,
  staticSpellMechanics: {
    glyphDurableOccurrence: internal(),
    spawnedCompanionLifecycle: internal(),
  },
  procedureBindings: {
    effectOccurrenceSource: internal(),
    spellInvocation: refine("spellOperations"),
    unavailableSpellInvocation: unavailable(),
    unitFeature: refine("unitFeatureProcedures"),
    unitSupportProfile: refine("unitSupportProcedures"),
  },
  unitFeatureProcedures: UNIT_FEATURE_EXPOSURE,
  unitSupportProcedures: UNIT_SUPPORT_EXPOSURE,
  statBlockProcedures: {
    attack: tool("attack"),
    bonusActionOption: refine("statBlockBonusActions"),
    effectOccurrenceSource: internal(),
    multiattack: tool("multiattack"),
    spellcasting: refine("spellOperations"),
    unarmedStrike: tool("attack"),
  },
  statBlockBonusActions: {
    disengage: tool("disengage"),
    hide: tool("hide"),
  },
  spellRegistryPorts: {
    executionFor: refine("spellOperations"),
    releaseStoredGlyph: internal(),
    resolveStoredGlyph: internal(),
  },
  characterMutations: {
    advanceClassLevel: tool("advance_class_level"),
    applyLayOnHands: tool("apply_lay_on_hands"),
    applySpellRestBenefit: tool("apply_spell_rest_benefit"),
    completeLongRest: tool("complete_long_rest"),
    completeShortRest: tool("complete_short_rest"),
    convertFontOfMagicSorceryPointsToSpellSlot: tool(
      "convert_font_of_magic_sorcery_points_to_spell_slot",
    ),
    convertFontOfMagicSpellSlotToSorceryPoints: tool(
      "convert_font_of_magic_spell_slot_to_sorcery_points",
    ),
    interruptLongRest: tool("interrupt_long_rest"),
    interruptShortRest: tool("interrupt_short_rest"),
    passCalendarTime: tool("pass_calendar_time"),
    replaceDruidWildShapeKnownForm: tool("replace_druid_wild_shape_known_form"),
    retainOneAtATimeCompanion: tool("retain_one_at_a_time_companion"),
    setEquipmentLoadout: tool("set_equipment_loadout"),
    spendSpellAccessFreeCast: tool("spend_spell_access_free_cast"),
    useMonkUncannyMetabolismWhenRollingInitiative: tool(
      "use_monk_uncanny_metabolism_when_rolling_initiative",
    ),
  },
  characterQueries: {
    abilityCheckAbility: tool("query_ability_check_ability"),
    abilityCheckProficiencyBonus: tool("query_ability_check_proficiency_bonus"),
    armorClass: tool("query_armor_class"),
    jumpDistanceAbility: tool("query_jump_distance_ability"),
    knownForms: tool("query_known_forms"),
    linkedSpeedGrants: tool("query_linked_speed_grants"),
    spellAccess: tool("query_spell_access"),
    spellInvocation: tool("query_spell_invocation"),
    spellbookRitualAccess: tool("query_spellbook_ritual_access"),
    spellbookRitualAccesses: tool("query_spellbook_ritual_accesses"),
    weaponMasterySelections: tool("query_weapon_mastery_selections"),
  },
  battleLifecycle: {
    addCombatant: tool("add_combatant"),
    applyInitiativeSwap: tool("apply_initiative_swap"),
    finalizeInitialInitiativeSetup: tool("finalize_initial_initiative_setup"),
    removeCombatant: tool("remove_combatant"),
  },
  creationInputs: {
    abilityScores: tool("fill_creation_holes"),
    choice: tool("fill_creation_holes"),
  },
} as const satisfies ChatGptExposureAccounting;

export type ChatGptExecutionSelection = {
  [Family in keyof OperationDomains]: {
    readonly family: Family;
    readonly operation: OperationDomains[Family];
  };
}[keyof OperationDomains];

type DirectToolSelection<Name extends ChatGptToolName> = {
  [Family in keyof typeof CHATGPT_OPERATION_EXPOSURE]: {
    [Operation in keyof (typeof CHATGPT_OPERATION_EXPOSURE)[Family]]: (typeof CHATGPT_OPERATION_EXPOSURE)[Family][Operation] extends {
      readonly kind: "tools";
      readonly tools: infer Names extends readonly ChatGptToolName[];
    }
      ? Name extends Names[number]
        ? { readonly family: Family; readonly operation: Operation }
        : never
      : never;
  }[keyof (typeof CHATGPT_OPERATION_EXPOSURE)[Family]];
}[keyof typeof CHATGPT_OPERATION_EXPOSURE];

// Future adapters consume this correlated contract after parsing the engine
// execution selection. A cast selector cannot be passed to the attack handler.
export type ChatGptToolSelection<Name extends ChatGptToolName> =
  DirectToolSelection<Name>;
export type ChatGptToolInvocation = {
  [Name in ChatGptToolName]: {
    readonly tool: Name;
    readonly selection: ChatGptToolSelection<Name>;
  };
}[ChatGptToolName];

function lookupExposure<Family extends keyof OperationDomains>(selection: {
  readonly family: Family;
  readonly operation: OperationDomains[Family];
}): ChatGptExposure {
  const exposure: ChatGptExposureAccounting = CHATGPT_OPERATION_EXPOSURE;
  return exposure[selection.family][selection.operation];
}
export function chatGptExposureFor(
  selection: ChatGptExecutionSelection,
): ChatGptExposure {
  return lookupExposure(selection);
}

// A routing gate for the planned adapter. Engine admission, reference ownership,
// timing and resource validation remain necessary before real execution.
export function chatGptToolAcceptsSelection<Name extends ChatGptToolName>(
  name: Name,
  selection: ChatGptExecutionSelection,
): selection is ChatGptExecutionSelection & ChatGptToolSelection<Name> {
  const exposure = chatGptExposureFor(selection);
  return Match.value(exposure).pipe(
    Match.discriminatorsExhaustive("kind")({
      tools: ({ tools }) => tools.some((tool) => tool === name),
      refine: () => false,
      refineOperations: () => false,
      boundContinuation: () => false,
      internal: () => false,
      unavailable: () => false,
    }),
  );
}
