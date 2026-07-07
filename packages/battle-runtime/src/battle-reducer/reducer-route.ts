// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { battleFillKind } from "../battle-protocol-kinds.ts";
import type { Ability, Condition } from "@dnd/shared/types";
import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type {
  AttackSpellDamageAddition,
  AvailableBattleAct,
  BattleActiveEffect,
  BattleCreatureState,
  BattleDamageRollHole,
  BattleFill,
  BattleInterruptCheckpoint,
  BattleInterruptProcedureSelection,
  BattleHole,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import {
  battleHoleFamilyKind,
  requiredAbilityCheckRollMode,
} from "./hole-helpers.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  DISTANT_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  SEEKING_METAMAGIC_EFFECT_KIND,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TWINNED_METAMAGIC_EFFECT_KIND,
} from "./metamagic-support.ts";
import { isHeightenedSpellTargetChoiceHoleId } from "./spells-damage-fills.ts";
import {
  conditionApplicationPreventedByCreatureTypeProtection,
  resolveBattlePossessionAttempt,
} from "./spell-condition-effects-helpers.ts";
import { supportedSpellInvocationMatchesRef } from "./spells-invocation-ref.ts";
import { supportedSpellActs } from "./spells-profiles.ts";
import {
  conditionSpellEndTurnRepeatSaveHoleIds,
  isCreatureSpaceTraversalMovementFactValidationMessage,
  sleepRepeatSaveSavingThrowHoleIds,
  spellTurnStartSavingThrowOutcomeHoleId,
} from "./turn-end-movement.ts";
import { activeDruidWildShapeEffect } from "./druid-wild-shape.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
  ongoingFeatureSourceKeyForUnit,
} from "./creature-state.ts";
import {
  currentActorId,
  zeroHpLifecycleIsTerminal,
} from "./creature-state-leaves.ts";

type AfterHitDamageRiderChoice = Extract<
  BattleInterruptCheckpoint["choices"][number],
  { readonly kind: "castAttackHitBonusActionSpell" }
>;
type AfterHitDamageRiderSelection = Extract<
  BattleInterruptProcedureSelection,
  { readonly kind: "castAttackHitBonusActionSpell" }
>;

export type BattleReducerRouteSubjectFamily =
  | "activeFormLifecycle"
  | "concentrationTeardown"
  | "commandEffect"
  | "charmSourceDamageBreak"
  | "creatureTypeTargetAdmission"
  | "deathSavingThrow"
  | "hitPointRestoration"
  | "interruptStackResume"
  | "metamagicBonusActionCastingTime"
  | "metamagicDamageDiceReroll"
  | "metamagicDamageTypeSubstitution"
  | "metamagicEffectiveSpellLevel"
  | "metamagicMissedSpellAttackReroll"
  | "metamagicSavingThrowProtection"
  | "metamagicSavingThrowRollMode"
  | "metamagicSpellGovernor"
  | "metamagicSpellRangeProjection"
  | "metamagicSpellDurationProjection"
  | "metamagicSpellComponentProjection"
  | "passiveSavingThrowRollMode"
  | "creatureSpaceMovementPermission"
  | "reactionSpell"
  | "rollModifierEffect"
  | "saveGatedSpell"
  | "scalarBuffEffect"
  | "spellHostedWeaponAttack"
  | "weaponDamageRider"
  | "heldWeaponActiveEffect"
  | "protectionCharmActiveEffect"
  | "hitPointRegainPrevention"
  | "nextAttackRollMode"
  | "reactionInterdiction"
  | "repeatSaveConditionEffect"
  | "turnBoundaryEffectLifecycle"
  | "zeroHitPointSpellEffectTeardown"
  | "afterHitDamageRider"
  | "markedDamageRiderEffect"
  | "conditionImmunityTemporaryHitPointEffect"
  | "attackActionAreaSaveDamageReplacement"
  | "unitFeatureBonusAction"
  | "activeFeatureSpellSaveDc"
  | "activeFeatureSpellAttackRollMode"
  | "companionLifecycle"
  | "companionSharedSenses"
  | "companionTouchDelivery"
  | "companionReactionAttack"
  | "slotSpell"
  | "spellAttackProcedure"
  | "weaponAttack"
  | "weaponMasteryProperty"
  | "zeroHitPointStabilization";

export type BattleReducerRouteOwnerGroup =
  | "battleActionEconomy"
  | "battleAttackActionProcedure"
  | "battleSpellSlotAndActionEconomy"
  | "battleCompanion"
  | "battleHoleFrontier"
  | "battleTargetSelection"
  | "battleAreaShape"
  | "battleObjectTargetBoundary"
  | "battleAbilityCheckRollMode"
  | "battleAttackRoll"
  | "battleSpellAttackProcedure"
  | "battleAbilityCheck"
  | "battleSavingThrowOutcome"
  | "battleSavingThrowRollMode"
  | "battleHitPointAndZeroHpLifecycle"
  | "battleHitPoint"
  | "battleDamageRoll"
  | "battleDamageType"
  | "battleConcentration"
  | "battleActiveEffect"
  | "battleConditionLifecycle"
  | "battleCreatureState"
  | "battleCreatureSpaceMovement"
  | "battleDamageAdjustment"
  | "battleFeatureResource"
  | "battleStatBlockAction"
  | "battleMovementResource"
  | "battleTemporaryHitPoint"
  | "battleInterruptStack"
  | "battleTurnBoundary";

export type BattleReducerRouteHole =
  | "abilityCheck"
  | "abilityChoice"
  | "attackRoll"
  | "commandOptionChoice"
  | "damageTypeChoice"
  | "interruptDecision"
  | "concentrationSavingThrow"
  | "deathSavingThrow"
  | "hitPointHealingDistribution"
  | "movement"
  | "rolledDice"
  | "savingThrowOutcome"
  | "skillChoice"
  | "spellTargetAllocation"
  | "spellTargetList"
  | "targetAbilityChoices"
  | "targetChoice"
  | "unitFeatureDecision"
  | "wildShapeEquipmentDisposition";

export type BattleReducerRouteFillKind =
  | "abilityCheck"
  | "abilityChoice"
  | "attackRoll"
  | "commandOptionChoice"
  | "concentrationSavingThrow"
  | "deathSavingThrow"
  | "hitPointHealingDistribution"
  | "interruptDecision"
  | "damageTypeChoice"
  | "movement"
  | "rolledDice"
  | "savingThrowOutcome"
  | "skillChoice"
  | "spellTargetAllocation"
  | "spellTargetList"
  | "targetAbilityChoices"
  | "targetChoice"
  | "unitFeatureDecision"
  | "wildShapeEquipmentDisposition";
export type BattleReducerRouteFill =
  | BattleReducerRouteFillKind
  | {
      readonly kind: "skillChoice";
      readonly skill: Extract<
        BattleFill,
        { readonly kind: "skillChoice" }
      >["value"];
    }
  | {
      readonly kind: "abilityChoice";
      readonly ability: Extract<
        BattleFill,
        { readonly kind: "abilityChoice" }
      >["value"];
    }
  | {
      readonly kind: "targetAbilityChoices";
      readonly choices: {
        readonly primary: Extract<
          BattleFill,
          { readonly kind: "abilityChoice" }
        >["value"];
        readonly secondary: Extract<
          BattleFill,
          { readonly kind: "abilityChoice" }
        >["value"];
      };
    };

export type BattleReducerRouteEvent =
  | {
      readonly kind: "startBattle";
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "discoverBattleActs";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleSubject";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly fill: BattleReducerRouteFill;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleSubjectWithoutFill";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleInterrupt";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly fill: BattleReducerRouteFill;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    };

export type BattleReducerRouteEvents = readonly [
  BattleReducerRouteEvent,
  ...BattleReducerRouteEvent[],
];

export function battleReducerStartRouteEvent(): BattleReducerRouteEvent {
  return { kind: "startBattle", owner: "battleActionEconomy" };
}

export function activeFeatureSpellSaveDcRouteEvents(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
}): BattleReducerRouteEvents | undefined {
  if (!hasActiveFeatureSpellSaveDcModifier(input.state, input.casterId)) {
    return undefined;
  }
  return [
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "activeFeatureSpellSaveDc",
      holes: [],
      owner: "battleActiveEffect",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "activeFeatureSpellSaveDc",
      holes: [],
      owner: "battleSpellSlotAndActionEconomy",
    },
  ];
}

export function passiveSavingThrowRollModeRouteEvents(input: {
  readonly state: BattleState;
  readonly ability: Ability;
  readonly condition?: Condition;
}): BattleReducerRouteEvents | undefined {
  const disposition = passiveSavingThrowRollModeRouteDisposition(input);
  if (disposition === null) {
    return undefined;
  }
  const routeStart: BattleReducerRouteEvent = {
    kind: "startBattle",
    owner: "battleSavingThrowRollMode",
  };
  const holes: readonly BattleReducerRouteHole[] =
    disposition === "projected" ? ["savingThrowOutcome"] : [];
  return [
    routeStart,
    {
      kind: "discoverBattleActs",
      subject: "passiveSavingThrowRollMode",
      holes,
      owner: "battleSavingThrowRollMode",
    },
    disposition === "projected"
      ? {
          kind: "resolveBattleSubject",
          subject: "passiveSavingThrowRollMode",
          fill: "savingThrowOutcome",
          holes: [],
          owner: "battleSavingThrowRollMode",
        }
      : {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "passiveSavingThrowRollMode",
          holes: [],
          owner: "battleConditionLifecycle",
        },
  ];
}

type PassiveSavingThrowRollModeRouteDisposition = "projected" | "suppressed";

function passiveSavingThrowRollModeRouteDisposition(input: {
  readonly state: BattleState;
  readonly ability: Ability;
  readonly condition?: Condition;
}): PassiveSavingThrowRollModeRouteDisposition | null {
  let suppressed = false;
  for (const target of input.state.combatants.values()) {
    const disposition = passiveSavingThrowRollModeDispositionForTarget(
      target,
      input.ability,
      input.condition,
    );
    if (disposition === "projected") {
      return "projected";
    }
    suppressed ||= disposition === "suppressed";
  }
  return suppressed ? "suppressed" : null;
}

function passiveSavingThrowRollModeDispositionForTarget(
  target: BattleCreatureState,
  ability: Ability,
  condition: Condition | undefined,
): PassiveSavingThrowRollModeRouteDisposition | null {
  if (target.origin.kind !== "character") {
    return null;
  }
  const targetIncapacitated = isIncapacitated(target.conditions);
  for (const profile of target.origin.passiveSavingThrowRollModeProfiles.values()) {
    if (profile.savingThrow.scope.kind === "condition") {
      if (profile.savingThrow.scope.condition === condition) {
        return "projected";
      }
      continue;
    }
    if (profile.savingThrow.scope.ability !== ability) {
      continue;
    }
    if (profile.savingThrow.scope.suppressedByCondition !== "incapacitated") {
      continue;
    }
    return targetIncapacitated ? "suppressed" : "projected";
  }
  return null;
}

export function battleReducerRouteEventsForDiscoveredAct(
  state: BattleState,
  act: AvailableBattleAct,
): BattleReducerRouteEvents | undefined {
  if (isUnitFeatureBonusActionRouteSubject(state, act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "unitFeatureBonusAction",
        holes: [],
        owner: "battleFeatureResource",
      },
    ];
  }
  const companionRoute = companionRouteForDiscoveredAct(act);
  if (companionRoute !== undefined) {
    return [companionRoute];
  }
  if (isTwinnedEffectiveSpellLevelDiscoveryAct(act)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicEffectiveSpellLevel",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner: "battleFeatureResource",
      },
    ];
  }
  const rollModifierRoute = rollModifierRouteForDiscoveredAct(act);
  if (rollModifierRoute !== undefined) {
    return [rollModifierRoute];
  }
  const afterHitDamageRiderDiscoveryRoute =
    afterHitDamageRiderDiscoveryRoutesForDiscoveredAct(state, act);
  if (afterHitDamageRiderDiscoveryRoute !== undefined) {
    return afterHitDamageRiderDiscoveryRoute;
  }
  const levelOneBuffSubstrateRoute =
    levelOneBuffMarkSmiteSubstrateRouteForDiscoveredAct(state, act);
  if (levelOneBuffSubstrateRoute !== undefined) {
    return [levelOneBuffSubstrateRoute];
  }
  if (isSubtleSpellComponentProjectionSubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicSpellComponentProjection",
        holes: [],
        owner: "battleFeatureResource",
      },
    ];
  }
  const protectionCharmRoute = protectionCharmRouteForDiscoveredAct(state, act);
  if (protectionCharmRoute !== undefined) {
    return protectionCharmRoute;
  }
  const scalarBuffRoute = scalarBuffRouteForDiscoveredAct(act);
  if (scalarBuffRoute !== undefined) {
    return [scalarBuffRoute];
  }
  const sleepRepeatSaveRoute = sleepRepeatSaveRouteForDiscoveredAct(act);
  if (sleepRepeatSaveRoute !== undefined) {
    return [sleepRepeatSaveRoute];
  }
  const attackActionAreaSaveDamageReplacementRoute =
    attackActionAreaSaveDamageReplacementRouteForDiscoveredAct(state, act);
  if (attackActionAreaSaveDamageReplacementRoute !== undefined) {
    return [attackActionAreaSaveDamageReplacementRoute];
  }
  const activeFormLifecycleRoute =
    activeFormLifecycleRouteForDiscoveredAct(act);
  if (activeFormLifecycleRoute !== undefined) {
    return [activeFormLifecycleRoute];
  }
  if (isWeaponAttackSubject(act.subject)) {
    const markedDamageRiderWeaponAttackDiscoveryRoute =
      markedDamageRiderWeaponAttackRouteForDiscoveredAct(state, act);
    const weaponAttackRoute: BattleReducerRouteEvent = {
      kind: "discoverBattleActs",
      subject: "weaponAttack",
      holes: battleReducerRouteHoles(act.initialHoles),
      owner: "battleActionEconomy",
    };
    return markedDamageRiderWeaponAttackDiscoveryRoute === undefined
      ? [weaponAttackRoute]
      : [markedDamageRiderWeaponAttackDiscoveryRoute, weaponAttackRoute];
  }
  if (isConcentrationTeardownDiscoverySubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "concentrationTeardown",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner:
          act.subject.tag === "actionSpell"
            ? "battleSpellSlotAndActionEconomy"
            : "battleConcentration",
      },
    ];
  }
  if (isExtendedSpellDurationProjectionSubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicSpellDurationProjection",
        holes: [],
        owner: "battleFeatureResource",
      },
    ];
  }
  if (isCommandEffectDiscoverySubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "commandEffect",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner:
          act.subject.tag === "actionSpell"
            ? "battleSpellSlotAndActionEconomy"
            : "battleActiveEffect",
      },
    ];
  }
  if (isQuickenedBonusActionCastingTimeSubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicBonusActionCastingTime",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner: "battleFeatureResource",
      },
    ];
  }
  if (isCarefulSavingThrowProtectionSubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicSavingThrowProtection",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner: "battleFeatureResource",
      },
    ];
  }
  if (isTransmutedDamageTypeSubstitutionSubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicDamageTypeSubstitution",
        holes: ["damageTypeChoice"],
        owner: "battleFeatureResource",
      },
    ];
  }
  if (isDistantSpellRangeProjectionSubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicSpellRangeProjection",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner: "battleFeatureResource",
      },
    ];
  }
  if (isHitPointRestorationDiscoverySubject(act)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "hitPointRestoration",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner: hitPointRestorationDiscoveryOwner(act.subject),
      },
    ];
  }
  if (isZeroHitPointStabilizationSubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "zeroHitPointStabilization",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner: "battleActionEconomy",
      },
    ];
  }
  if (isSlotSpellDiscoverySubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "slotSpell",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner: "battleSpellSlotAndActionEconomy",
      },
    ];
  }
  if (
    act.subject.tag === "actionSpell" &&
    isSaveGatedSpellProcedure(act.subject.invocation.procedure)
  ) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "saveGatedSpell",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner:
          act.subject.invocation.tag === "spellSlot"
            ? "battleSpellSlotAndActionEconomy"
            : "battleActionEconomy",
      },
    ];
  }
  if (
    act.subject.tag !== "actionSpell" ||
    !isSpellAttackProcedure(act.subject.invocation.procedure)
  ) {
    return undefined;
  }
  const actionOwner =
    act.subject.invocation.procedure === "spellAttackSequence"
      ? "battleSpellAttackProcedure"
      : act.subject.invocation.tag === "spellSlot"
        ? "battleSpellSlotAndActionEconomy"
        : "battleActionEconomy";
  const actionEconomyEvent: BattleReducerRouteEvent = {
    kind: "discoverBattleActs",
    subject: "spellAttackProcedure",
    holes:
      act.subject.invocation.procedure === "spellAttackSequence"
        ? spellAttackSequenceRouteHoles(
            battleReducerRouteHoles(act.initialHoles),
          )
        : battleReducerRouteHoles(act.initialHoles),
    owner: actionOwner,
  };
  if (act.subject.invocation.procedure === "spellAttackSequence") {
    return nonEmptyRouteEvents([
      actionEconomyEvent,
      ...activeFeatureSpellAttackRollModeDiscoveryRouteEvents(
        state,
        act.subject,
        act.initialHoles,
      ),
    ]);
  }
  const hasObjectTargetBoundary = act.initialHoles.some(
    (hole) => hole.kind === "objectTargetChoice",
  );
  if (!hasObjectTargetBoundary) {
    return nonEmptyRouteEvents([
      actionEconomyEvent,
      ...activeFeatureSpellAttackRollModeDiscoveryRouteEvents(
        state,
        act.subject,
        act.initialHoles,
      ),
    ]);
  }
  return nonEmptyRouteEvents([
    actionEconomyEvent,
    {
      kind: "discoverBattleActs",
      subject: "spellAttackProcedure",
      holes: battleReducerRouteHoles(
        act.initialHoles.filter((hole) => hole.kind === "objectTargetChoice"),
      ),
      owner: "battleObjectTargetBoundary",
    },
    ...activeFeatureSpellAttackRollModeDiscoveryRouteEvents(
      state,
      act.subject,
      act.initialHoles,
    ),
  ]);
}

export function battleReducerRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const metamagicEffectiveSpellLevelRoute =
    metamagicEffectiveSpellLevelRouteForResolution(input, result);
  if (metamagicEffectiveSpellLevelRoute !== undefined) {
    return metamagicEffectiveSpellLevelRoute;
  }
  const rollModifierRoute = rollModifierRouteForResolution(input, result);
  if (rollModifierRoute !== undefined) {
    return rollModifierRoute;
  }
  const metamagicSpellComponentProjectionRoute =
    metamagicSpellComponentProjectionRouteForResolution(input, result);
  if (metamagicSpellComponentProjectionRoute !== undefined) {
    return metamagicSpellComponentProjectionRoute;
  }
  const protectionCharmRoute = protectionCharmRouteForResolution(input, result);
  if (protectionCharmRoute !== undefined) {
    return protectionCharmRoute;
  }
  const scalarBuffRoute = scalarBuffRouteForResolution(input, result);
  if (scalarBuffRoute !== undefined) {
    return scalarBuffRoute;
  }
  const levelOneBuffSubstrateRoute =
    levelOneBuffMarkSmiteSubstrateRouteForResolution(input, result);
  if (levelOneBuffSubstrateRoute !== undefined) {
    return levelOneBuffSubstrateRoute;
  }
  const markedDamageRiderAbilityCheckRoute =
    markedDamageRiderAbilityCheckRollModeRouteForResolution(input, result);
  if (markedDamageRiderAbilityCheckRoute !== undefined) {
    return markedDamageRiderAbilityCheckRoute;
  }
  const rollModifierConcentrationRoute =
    rollModifierConcentrationBreakRouteForResolution(input, result);
  if (rollModifierConcentrationRoute !== undefined) {
    return rollModifierConcentrationRoute;
  }
  const sleepRepeatSaveRoute = sleepRepeatSaveRouteForResolution(input, result);
  if (sleepRepeatSaveRoute !== undefined && !isEndTurnSubject(input.subject)) {
    return sleepRepeatSaveRoute;
  }
  const afterHitEscapeRoute = afterHitDamageRiderEscapeRouteForResolution(
    input,
    result,
  );
  if (afterHitEscapeRoute !== undefined) {
    return afterHitEscapeRoute;
  }
  const repeatSaveConditionEffectRoute =
    repeatSaveConditionEffectRouteForResolution(input, result);
  const deathSavingThrowRoute = deathSavingThrowRouteForResolution(
    input,
    result,
  );
  const turnBoundaryEffectLifecycleRoute =
    turnBoundaryEffectLifecycleRouteForResolution(input, result);
  const conditionImmunityTemporaryHitPointTurnBoundaryRoute =
    conditionImmunityTemporaryHitPointTurnBoundaryRouteForResolution(
      input,
      result,
    );
  const activeFormLifecycleTurnBoundaryRoute =
    activeFormLifecycleTurnBoundaryRouteForResolution(input, result);
  const afterHitTurnBoundaryRoute =
    afterHitDamageRiderTurnBoundaryRouteForResolution(input, result);
  const markedDamageRiderTurnBoundaryRoute =
    markedDamageRiderTurnBoundaryRouteForResolution(input, result);
  if (
    sleepRepeatSaveRoute !== undefined ||
    repeatSaveConditionEffectRoute !== undefined ||
    deathSavingThrowRoute !== undefined ||
    turnBoundaryEffectLifecycleRoute !== undefined ||
    conditionImmunityTemporaryHitPointTurnBoundaryRoute !== undefined ||
    activeFormLifecycleTurnBoundaryRoute !== undefined ||
    afterHitTurnBoundaryRoute !== undefined ||
    markedDamageRiderTurnBoundaryRoute !== undefined
  ) {
    return nonEmptyRouteEvents([
      ...(sleepRepeatSaveRoute ?? []),
      ...(repeatSaveConditionEffectRoute ?? []),
      ...(deathSavingThrowRoute ?? []),
      ...(turnBoundaryEffectLifecycleRoute ?? []),
      ...(conditionImmunityTemporaryHitPointTurnBoundaryRoute ?? []),
      ...(activeFormLifecycleTurnBoundaryRoute ?? []),
      ...(afterHitTurnBoundaryRoute ?? []),
      ...(markedDamageRiderTurnBoundaryRoute ?? []),
    ]);
  }
  const metamagicSpellDurationProjectionRoute =
    metamagicSpellDurationProjectionRouteForResolution(input, result);
  if (metamagicSpellDurationProjectionRoute !== undefined) {
    return metamagicSpellDurationProjectionRoute;
  }
  const activeFormLifecycleTerminalRoute =
    activeFormLifecycleTerminalRouteForResolution(input, result);
  const concentrationRoute = concentrationRouteForResolution(input, result);
  if (concentrationRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      concentrationRoute,
      activeFormLifecycleTerminalRoute,
    );
  }
  const creatureSpaceMovementRoute =
    creatureSpaceMovementPermissionRouteForResolution(input, result);
  if (creatureSpaceMovementRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      creatureSpaceMovementRoute,
      activeFormLifecycleTerminalRoute,
    );
  }
  const commandRoute = commandRouteForResolution(input, result);
  if (commandRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      [commandRoute],
      activeFormLifecycleTerminalRoute,
    );
  }
  const activeFormLifecycleRoute = activeFormLifecycleRouteForResolution(
    input,
    result,
  );
  if (activeFormLifecycleRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      activeFormLifecycleRoute,
      activeFormLifecycleTerminalRoute,
    );
  }
  const metamagicRoute = metamagicRouteForResolution(input, result);
  if (metamagicRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      metamagicRoute,
      activeFormLifecycleTerminalRoute,
    );
  }
  const hitPointRestorationRoute = hitPointRestorationRouteForResolution(
    input,
    result,
  );
  if (hitPointRestorationRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      [hitPointRestorationRoute],
      activeFormLifecycleTerminalRoute,
    );
  }
  const zeroHitPointStabilizationRoute =
    zeroHitPointStabilizationRouteForResolution(input, result);
  if (zeroHitPointStabilizationRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      [zeroHitPointStabilizationRoute],
      activeFormLifecycleTerminalRoute,
    );
  }
  const slotSpellRoute = slotSpellRouteForResolution(input, result);
  if (slotSpellRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      [slotSpellRoute],
      activeFormLifecycleTerminalRoute,
    );
  }
  const saveGatedRoute = saveGatedSpellRouteForResolution(input, result);
  if (saveGatedRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      saveGatedRoute,
      activeFormLifecycleTerminalRoute,
    );
  }
  const attackActionAreaSaveDamageReplacementRoute =
    attackActionAreaSaveDamageReplacementRouteForResolution(input, result);
  if (attackActionAreaSaveDamageReplacementRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      attackActionAreaSaveDamageReplacementRoute,
      activeFormLifecycleTerminalRoute,
    );
  }
  const activeFeatureBonusActionRoute =
    activeFeatureBonusActionRouteForResolution(input, result);
  if (activeFeatureBonusActionRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      activeFeatureBonusActionRoute,
      activeFormLifecycleTerminalRoute,
    );
  }
  const companionRoute = companionRouteForResolution(input, result);
  if (companionRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      companionRoute,
      activeFormLifecycleTerminalRoute,
    );
  }
  const interruptResumeDiscoveryRoute =
    interruptStackResumeDiscoveryRouteForResolution(input, result);
  const afterHitDamageRiderDiscoveryRoutes =
    afterHitDamageRiderDiscoveryRoutesForResolution(result);
  if (
    interruptResumeDiscoveryRoute !== undefined ||
    afterHitDamageRiderDiscoveryRoutes !== undefined
  ) {
    return composeWithActiveFormLifecycleTerminalRoute(
      nonEmptyRouteEvents([
        ...(interruptResumeDiscoveryRoute === undefined
          ? []
          : [interruptResumeDiscoveryRoute]),
        ...(afterHitDamageRiderDiscoveryRoutes ?? []),
      ]),
      activeFormLifecycleTerminalRoute,
    );
  }
  const weaponAttackRoute = weaponAttackRouteForResolution(input, result);
  if (weaponAttackRoute !== undefined) {
    return composeWithActiveFormLifecycleTerminalRoute(
      weaponAttackRoute,
      activeFormLifecycleTerminalRoute,
    );
  }
  const spellAttackRoute = spellAttackProcedureRouteForResolution(
    input,
    result,
  );
  return composeWithActiveFormLifecycleTerminalRoute(
    spellAttackRoute,
    activeFormLifecycleTerminalRoute,
  );
}

function creatureSpaceMovementPermissionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "move"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (
    fill === undefined ||
    fill.kind !== "movement" ||
    fill.value.creatureSpaceTraversal === undefined
  ) {
    return undefined;
  }
  if (
    result.tag === "invalid" &&
    (result.reason !== "invalidFill" ||
      !isCreatureSpaceTraversalMovementFactValidationMessage(result.message))
  ) {
    return undefined;
  }
  if (result.tag === "needsHoles") {
    return undefined;
  }
  const holes: readonly BattleReducerRouteHole[] =
    result.tag === "invalid" ? ["movement"] : [];
  const route: BattleReducerRouteEvent[] = [
    {
      kind: "resolveBattleSubject",
      subject: "creatureSpaceMovementPermission",
      fill: "movement",
      holes,
      owner: "battleCreatureSpaceMovement",
    },
  ];
  if (result.tag === "resolved") {
    route.push({
      kind: "resolveBattleSubjectWithoutFill",
      subject: "creatureSpaceMovementPermission",
      holes: [],
      owner: "battleMovementResource",
    });
  }
  return nonEmptyRouteEvents(route);
}

function isZeroHitPointStabilizationSubject(
  subject: BattleResolutionInput["subject"] | AvailableBattleAct["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.invocation.procedure === "makeStable"
  );
}

function zeroHitPointStabilizationRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (
    !isZeroHitPointStabilizationSubject(input.subject) ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleFillKind(fill) !== "targetChoice") {
    return undefined;
  }
  return {
    kind: "resolveBattleSubject",
    subject: "zeroHitPointStabilization",
    fill: "targetChoice",
    holes: [],
    owner: "battleHitPointAndZeroHpLifecycle",
  };
}

function spellAttackProcedureRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "actionSpell" ||
    !isSpellAttackProcedure(input.subject.invocation.procedure)
  ) {
    return undefined;
  }
  if (result.tag === "invalid") {
    if (result.reason === "staleSubject") {
      return [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "spellAttackProcedure",
          holes: [],
          owner: "battleHoleFrontier",
        },
      ];
    }
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  const holes = spellAttackProcedureRouteHoles(input, result);
  const [firstOwner, ...remainingOwners] = spellAttackProcedureRouteOwners({
    input,
    fill,
    result,
  });
  if (firstOwner === undefined) {
    return undefined;
  }
  const eventForOwner = (
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent => ({
    kind: "resolveBattleSubject",
    subject: "spellAttackProcedure",
    fill: routeFill,
    holes,
    owner,
  });
  return [
    eventForOwner(firstOwner),
    ...remainingOwners.map(eventForOwner),
    ...activeFeatureSpellAttackRollModeResolutionRouteEvents(input, result),
    ...spellAttackHitActiveEffectAdmissionRouteForResolution(input, result),
    ...zeroHitPointSpellEffectTeardownRouteForResolution(input, fill, result),
  ];
}

export function battleReducerRouteForInterrupt(
  before: BattleState,
  fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>,
  result: BattleResolutionResult,
): BattleReducerRouteEvents {
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const reactionSpellRoute = reactionSpellRouteForInterrupt({
    before,
    fill,
    holes,
    result,
  });
  if (reactionSpellRoute !== undefined) {
    return reactionSpellRoute;
  }
  const afterHitDamageRiderRoute = afterHitDamageRiderRouteForInterrupt({
    before,
    fill,
    holes,
    result,
  });
  if (afterHitDamageRiderRoute !== undefined) {
    return afterHitDamageRiderRoute;
  }
  const eventForOwner = (
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent => ({
    kind: "resolveBattleInterrupt",
    subject: "interruptStackResume",
    fill: "interruptDecision",
    holes,
    owner,
  });
  if (
    result.tag === "resolved" &&
    interruptResolutionAddedArmorClassEffect(before, result)
  ) {
    return [
      eventForOwner("battleSpellSlotAndActionEconomy"),
      eventForOwner("battleActiveEffect"),
      eventForOwner("battleInterruptStack"),
    ];
  }
  return [eventForOwner("battleInterruptStack")];
}

function isUnitFeatureBonusActionRouteSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"] | AvailableBattleAct["subject"],
): boolean {
  if (subject.tag !== "unitFeature") {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return false;
  }
  const profile = actor.origin.ongoingFeatureProfiles.get(
    ongoingFeatureSourceKeyForUnit(subject.unitId),
  );
  return profile?.activationTrigger === "bonusAction";
}

function activeFeatureBonusActionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    input.fills.length !== 0 ||
    !isUnitFeatureBonusActionRouteSubject(input.state, input.subject)
  ) {
    return undefined;
  }
  return [
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "unitFeatureBonusAction",
      holes: [],
      owner: "battleActionEconomy",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "unitFeatureBonusAction",
      holes: [],
      owner: "battleFeatureResource",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "unitFeatureBonusAction",
      holes: [],
      owner: "battleActiveEffect",
    },
  ];
}

function hasActiveFeatureSpellSaveDcModifier(
  state: BattleState,
  casterId: CombatantId,
): boolean {
  return activeFeatureSpellModifierExists(
    state,
    casterId,
    (modifier) => modifier.saveDcBonus !== 0,
  );
}

function hasActiveFeatureSpellAttackRollModeModifier(
  state: BattleState,
  casterId: CombatantId,
): boolean {
  return activeFeatureSpellModifierExists(
    state,
    casterId,
    (modifier) => modifier.attackRollMode !== undefined,
  );
}

function activeFeatureSpellModifierExists(
  state: BattleState,
  casterId: CombatantId,
  predicate: (
    modifier: ReturnType<typeof activeFeatureSpellModifiers>[number],
  ) => boolean,
): boolean {
  const caster = state.combatants.get(casterId);
  return activeFeatureSpellModifiers(caster).some(predicate);
}

function activeFeatureSpellModifiers(caster: BattleCreatureState | undefined) {
  if (!isCharacterBattleCreatureState(caster)) {
    return [];
  }
  return [...activeOngoingFeatureOccurrencesForCombatant(caster)].flatMap(
    ([key]) =>
      ongoingFeatureProfileForSourceKey(caster, key)?.spellModifiers ?? [],
  );
}

function activeFeatureSpellAttackRollModeDiscoveryRouteEvents(
  state: BattleState,
  subject: Extract<
    BattleResolutionInput["subject"],
    { readonly tag: "actionSpell" }
  >,
  initialHoles: readonly BattleHole[],
): readonly BattleReducerRouteEvent[] {
  if (!hasActiveFeatureSpellAttackRollModeModifier(state, subject.actorId)) {
    return [];
  }
  const holes = battleReducerRouteHoles(initialHoles);
  if (!holes.includes("targetChoice")) {
    return [];
  }
  return [
    {
      kind: "discoverBattleActs",
      subject: "activeFeatureSpellAttackRollMode",
      holes: ["targetChoice"],
      owner: "battleSpellSlotAndActionEconomy",
    },
  ];
}

function activeFeatureSpellAttackRollModeResolutionRouteEvents(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (
    input.subject.tag !== "actionSpell" ||
    !hasActiveFeatureSpellAttackRollModeModifier(
      input.state,
      input.subject.actorId,
    )
  ) {
    return [];
  }
  const fill = input.fills.at(-1);
  if (fill?.kind !== "targetChoice" || result.tag !== "needsHoles") {
    return [];
  }
  const holes = battleReducerRouteHoles(result.holes);
  if (!holes.includes("attackRoll")) {
    return [];
  }
  return [
    {
      kind: "resolveBattleSubject",
      subject: "activeFeatureSpellAttackRollMode",
      fill: "targetChoice",
      holes: ["attackRoll"],
      owner: "battleTargetSelection",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "activeFeatureSpellAttackRollMode",
      holes: ["attackRoll"],
      owner: "battleActiveEffect",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "activeFeatureSpellAttackRollMode",
      holes: ["attackRoll"],
      owner: "battleSpellAttackProcedure",
    },
  ];
}

function attackActionAreaSaveDamageReplacementRouteForDiscoveredAct(
  state: BattleState,
  act: AvailableBattleAct,
): BattleReducerRouteEvent | undefined {
  if (!isAttackActionAreaSaveDamageReplacementSubject(state, act.subject)) {
    return undefined;
  }
  return {
    kind: "discoverBattleActs",
    subject: "attackActionAreaSaveDamageReplacement",
    holes: battleReducerRouteHoles(act.initialHoles),
    owner: "battleFeatureResource",
  };
}

function attackActionAreaSaveDamageReplacementRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isAttackActionAreaSaveDamageReplacementSubject(input.state, input.subject)
  ) {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    if (result.tag !== "invalid") {
      return undefined;
    }
    return [
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        [],
        "battleFeatureResource",
      ),
    ];
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "savingThrowOutcome") {
    if (result.tag === "invalid") {
      return [
        attackActionAreaSaveDamageReplacementResolveRoute(
          "savingThrowOutcome",
          ["savingThrowOutcome"],
          "battleAreaShape",
        ),
      ];
    }

    const holes =
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
    return [
      attackActionAreaSaveDamageReplacementResolveRoute(
        "savingThrowOutcome",
        holes,
        "battleAreaShape",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        holes,
        "battleSavingThrowOutcome",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        holes,
        "battleDamageType",
      ),
    ];
  }

  if (routeFill !== "rolledDice") {
    return undefined;
  }
  if (result.tag === "invalid") {
    return [
      attackActionAreaSaveDamageReplacementResolveRoute(
        "rolledDice",
        ["rolledDice"],
        "battleDamageRoll",
      ),
    ];
  }
  if (result.tag !== "resolved") {
    return undefined;
  }

  const tail = result.state.currentTurnResources.actionResources.some(
    (resource) =>
      resource.source === "classFeatureExtraAttack" &&
      resource.sourceOwnerId === input.subject.actorId,
  )
    ? [
        {
          kind: "discoverBattleActs" as const,
          subject: "weaponAttack" as const,
          holes: ["targetChoice"] as const,
          owner: "battleAttackActionProcedure" as const,
        },
      ]
    : [
        attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
          [],
          "battleAttackActionProcedure",
        ),
      ];
  return [
    attackActionAreaSaveDamageReplacementResolveRoute(
      "rolledDice",
      [],
      "battleDamageRoll",
    ),
    attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
      [],
      "battleHitPoint",
    ),
    attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
      [],
      "battleFeatureResource",
    ),
    ...tail,
  ];
}

function attackActionAreaSaveDamageReplacementResolveRoute(
  fill: BattleReducerRouteFillKind,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: "attackActionAreaSaveDamageReplacement",
    fill,
    holes,
    owner,
  };
}

function attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "attackActionAreaSaveDamageReplacement",
    holes,
    owner,
  };
}

function isAttackActionAreaSaveDamageReplacementSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"] | AvailableBattleAct["subject"],
): boolean {
  if (subject.tag !== "unitFeature") {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") {
    return false;
  }
  return actor.origin.characterUnitRefs.some(
    (unitRef) =>
      unitRef.unitId === subject.unitId &&
      unitRef.supportProfiles.some(
        (profile) =>
          typeof profile === "object" &&
          profile.kind === "attackActionAreaSaveDamageReplacement",
      ),
  );
}

function afterHitDamageRiderDiscoveryRoutesForResolution(
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = battleReducerRouteHoles(result.holes);
  if (!holes.includes("interruptDecision")) {
    return undefined;
  }
  const frame = currentInterruptCheckpoint(result.state);
  if (
    frame?.trigger !== "attackHit" ||
    !frame.choices.some(isAfterHitDamageRiderChoice)
  ) {
    return undefined;
  }

  const owners = new Set<BattleReducerRouteOwnerGroup>([
    "battleInterruptStack",
  ]);
  for (const choice of frame.choices) {
    if (!isAfterHitDamageRiderChoice(choice)) {
      continue;
    }
    if (choice.invocation.tag === "spellSlot") {
      owners.add("battleSpellSlotAndActionEconomy");
    }
    if (choice.invocation.tag === "classFeatureFreeCast") {
      owners.add("battleFeatureResource");
    }
    if (choice.invocation.procedure === "afterHitDamageAndIllumination") {
      owners.add("battleActiveEffect");
      owners.add("battleConcentration");
    }
  }

  return nonEmptyRouteEvents(
    [...owners].map((owner) =>
      afterHitDamageRiderDiscoverRoute(["interruptDecision"], owner),
    ),
  );
}

function afterHitDamageRiderDiscoveryRoutesForDiscoveredAct(
  state: BattleState,
  act: AvailableBattleAct,
): BattleReducerRouteEvents | undefined {
  if (isAfterHitDamageRiderConcentrationTeardownSubject(state, act.subject)) {
    return [
      afterHitDamageRiderDiscoverRoute(
        battleReducerRouteHoles(act.initialHoles),
        "battleConcentration",
      ),
      afterHitDamageRiderDiscoverRoute(
        battleReducerRouteHoles(act.initialHoles),
        "battleActiveEffect",
      ),
    ];
  }
  if (!isAfterHitEscapeAbilityCheckSubject(state, act.subject)) {
    return undefined;
  }
  const holes = battleReducerRouteHoles(act.initialHoles);
  return nonEmptyRouteEvents([
    afterHitDamageRiderDiscoverRoute(holes, "battleAbilityCheck"),
    afterHitDamageRiderDiscoverRoute(holes, "battleConditionLifecycle"),
    afterHitDamageRiderDiscoverRoute(holes, "battleConcentration"),
  ]);
}

function afterHitDamageRiderRouteForInterrupt(input: {
  readonly before: BattleState;
  readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
  readonly holes: readonly BattleReducerRouteHole[];
  readonly result: BattleResolutionResult;
}): BattleReducerRouteEvents | undefined {
  if (input.fill.value.kind !== "resolve") {
    return undefined;
  }
  const choice = input.fill.value.choice;
  if (!isAfterHitDamageRiderSelection(choice)) {
    return undefined;
  }

  const choiceFillKinds = choice.fills
    .map(battleReducerRouteFill)
    .filter((fill): fill is BattleReducerRouteFill => fill !== undefined);
  const hasSaveFill = choiceFillKinds.includes("savingThrowOutcome");
  const choiceHoles: readonly BattleReducerRouteHole[] = hasSaveFill
    ? ["savingThrowOutcome"]
    : input.holes;
  const choiceFill: BattleReducerRouteFill = hasSaveFill
    ? "savingThrowOutcome"
    : "interruptDecision";
  const route: BattleReducerRouteEvent[] = [
    afterHitDamageRiderResolveRoute(
      "interruptDecision",
      choiceHoles,
      "battleInterruptStack",
    ),
  ];

  if (choice.invocation.tag === "spellSlot") {
    route.push(
      afterHitDamageRiderDiscoverRoute(
        hasSaveFill ? ["savingThrowOutcome"] : ["interruptDecision"],
        "battleSpellSlotAndActionEconomy",
      ),
      afterHitDamageRiderResolveRoute(
        choiceFill,
        input.holes,
        "battleSpellSlotAndActionEconomy",
      ),
    );
  }
  if (choice.invocation.tag === "classFeatureFreeCast") {
    route.push(
      afterHitDamageRiderDiscoverRoute(
        hasSaveFill ? ["savingThrowOutcome"] : ["interruptDecision"],
        "battleFeatureResource",
      ),
      afterHitDamageRiderResolveRoute(
        choiceFill,
        input.holes,
        "battleFeatureResource",
      ),
    );
  }
  if (choice.invocation.procedure === "afterHitSaveGatedCondition") {
    if (
      input.result.tag !== "invalid" &&
      combatantConditionsChanged(input.before, input.result.state)
    ) {
      route.push(
        afterHitDamageRiderDiscoverRoute(
          ["savingThrowOutcome"],
          "battleConditionLifecycle",
        ),
        afterHitDamageRiderResolveRoute(
          "savingThrowOutcome",
          input.holes,
          "battleConditionLifecycle",
        ),
      );
    }
    if (
      input.result.tag !== "invalid" &&
      combatantsConcentrationChanged(input.before, input.result.state)
    ) {
      route.push(
        afterHitDamageRiderDiscoverRoute(
          ["savingThrowOutcome"],
          "battleConcentration",
        ),
        afterHitDamageRiderResolveRoute(
          "savingThrowOutcome",
          input.holes,
          "battleConcentration",
        ),
      );
    }
  }
  if (
    choice.invocation.procedure === "afterHitDamageAndIllumination" &&
    input.result.tag !== "invalid"
  ) {
    if (combatantsActiveEffectsChanged(input.before, input.result.state)) {
      route.push(
        afterHitDamageRiderResolveRoute(
          "interruptDecision",
          input.holes,
          "battleActiveEffect",
        ),
      );
    }
    if (combatantsConcentrationChanged(input.before, input.result.state)) {
      route.push(
        afterHitDamageRiderResolveRoute(
          "interruptDecision",
          input.holes,
          "battleConcentration",
        ),
      );
    }
  }
  if (input.holes.includes("rolledDice")) {
    route.push(afterHitDamageRiderDiscoverRoute(input.holes, "battleHitPoint"));
  }

  return nonEmptyRouteEvents(route);
}

function afterHitDamageRiderEscapeRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isAfterHitEscapeAbilityCheckSubject(input.state, input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  const routeFill =
    fill === undefined ? undefined : battleReducerRouteFill(fill);
  if (routeFill !== "abilityCheck") {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [
    afterHitDamageRiderResolveRoute(routeFill, holes, "battleAbilityCheck"),
  ];
  if (combatantConditionsChanged(input.state, result.state)) {
    route.push(
      afterHitDamageRiderResolveRoute(
        routeFill,
        holes,
        "battleConditionLifecycle",
      ),
    );
  }
  if (combatantsConcentrationChanged(input.state, result.state)) {
    route.push(
      afterHitDamageRiderResolveRoute(routeFill, holes, "battleConcentration"),
    );
  }
  return nonEmptyRouteEvents(route);
}

function isAfterHitEscapeAbilityCheckSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag !== "action" || subject.action !== "escapeSpellRestraint") {
    return false;
  }
  const target = state.combatants.get(subject.targetId);
  return (
    target?.activeEffects.some(
      (effect) =>
        effect.kind === "spellCondition" &&
        effect.sourceSpellId === subject.sourceSpellId &&
        effect.sourceCombatantId === subject.sourceCombatantId &&
        effect.condition === "restrained" &&
        effect.turnStartDamage !== null &&
        effect.escape?.kind === "abilityCheck",
    ) ?? false
  );
}

function isAfterHitDamageRiderConcentrationTeardownSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (
    subject.tag !== "runtimeCommand" ||
    subject.command !== "endConcentration"
  ) {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  const concentration = actor?.concentration ?? null;
  if (concentration === null) {
    return false;
  }
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "shiningSmiteIllumination" &&
        effect.sourceSpellId === concentration.sourceSpellId &&
        effect.sourceCombatantId === subject.actorId,
    ),
  );
}

function isConditionImmunityTemporaryHitPointConcentrationTeardownSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (
    subject.tag !== "runtimeCommand" ||
    subject.command !== "endConcentration"
  ) {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  const concentration = actor?.concentration ?? null;
  if (concentration === null) {
    return false;
  }
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        (effect.kind === "conditionImmunity" ||
          effect.kind === "turnStartTemporaryHitPoints") &&
        effect.sourceSpellId === concentration.sourceSpellId &&
        effect.sourceCombatantId === subject.actorId,
    ),
  );
}

function isAfterHitDamageRiderChoice(
  choice: BattleInterruptCheckpoint["choices"][number],
): choice is AfterHitDamageRiderChoice {
  return choice.kind === "castAttackHitBonusActionSpell";
}

function isAfterHitDamageRiderSelection(
  choice: BattleInterruptProcedureSelection,
): choice is AfterHitDamageRiderSelection {
  return choice.kind === "castAttackHitBonusActionSpell";
}

function afterHitDamageRiderDiscoverRoute(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: "afterHitDamageRider",
    holes,
    owner,
  };
}

function afterHitDamageRiderResolveRoute(
  fill: BattleReducerRouteFill,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: "afterHitDamageRider",
    fill,
    holes,
    owner,
  };
}

function afterHitDamageRiderResolveWithoutFillRoute(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "afterHitDamageRider",
    holes,
    owner,
  };
}

function combatantsConcentrationChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some((combatant) =>
    combatantConcentrationChanged(before, after, combatant.combatantId),
  );
}

function reactionSpellRouteForInterrupt(input: {
  readonly before: BattleState;
  readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
  readonly holes: readonly BattleReducerRouteHole[];
  readonly result: BattleResolutionResult;
}): BattleReducerRouteEvents | undefined {
  if (input.fill.value.kind !== "resolve") {
    return undefined;
  }
  if (input.fill.value.choice.kind !== "castTriggeredReactionSpell") {
    return undefined;
  }
  const frame = currentInterruptCheckpoint(input.before);
  if (frame === undefined || !isReactionSpellCastingTimeFrame(frame)) {
    return undefined;
  }

  const eventForOwner = (
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent => ({
    kind: "resolveBattleInterrupt",
    subject: "reactionSpell",
    fill: "interruptDecision",
    holes: input.holes,
    owner,
  });
  if (frame.trigger === "afterDamage" && input.result.tag === "resolved") {
    const route: BattleReducerRouteEvents = [
      eventForOwner("battleInterruptStack"),
      eventForOwner("battleSpellSlotAndActionEconomy"),
    ];
    return combatantHitPointsChanged(input.before, input.result.state)
      ? [...route, eventForOwner("battleHitPoint")]
      : route;
  }
  if (frame.trigger === "spellCast") {
    return [
      eventForOwner("battleInterruptStack"),
      eventForOwner("battleSpellSlotAndActionEconomy"),
    ];
  }
  return undefined;
}

function metamagicRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (
    fill === undefined &&
    result.tag === "invalid" &&
    isBonusActionSpellWithMetamagicSubject(input.subject)
  ) {
    return [metamagicGovernorInvalidRoute(input)];
  }
  if (!isQuickenedBonusActionCastingTimeSubject(input.subject)) {
    return (
      metamagicSpellRangeProjectionRouteForResolution(input, result, fill) ??
      metamagicSavingThrowProtectionRouteForResolution(input, result, fill) ??
      metamagicSavingThrowRollModeRouteForResolution(input, result, fill) ??
      metamagicDamageTypeSubstitutionRouteForResolution(input, result, fill) ??
      metamagicMissedSpellAttackRerollRouteForResolution(input, result, fill) ??
      metamagicDamageDiceRerollRouteForResolution(input, result, fill)
    );
  }

  if (fill === undefined) {
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  if (routeFill === "targetChoice") {
    return [
      ...metamagicBonusActionTimingRoutes(["targetChoice"]),
      {
        kind: "resolveBattleSubject",
        subject: "metamagicBonusActionCastingTime",
        fill: routeFill,
        holes,
        owner: "battleTargetSelection",
      },
    ];
  }
  if (routeFill === "attackRoll") {
    if (
      input.subject.invocation.procedure === "spellAttackSequence" &&
      result.tag === "resolved"
    ) {
      return [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "metamagicBonusActionCastingTime",
          holes: [],
          owner: "battleTurnBoundary",
        },
      ];
    }
    return [
      {
        kind: "resolveBattleSubject",
        subject: "metamagicBonusActionCastingTime",
        fill: routeFill,
        holes,
        owner: "battleSpellAttackProcedure",
      },
    ];
  }
  if (routeFill === "spellTargetList" && result.tag === "resolved") {
    return [
      ...metamagicBonusActionTimingRoutes(["spellTargetList"]),
      {
        kind: "resolveBattleSubject",
        subject: "metamagicBonusActionCastingTime",
        fill: routeFill,
        holes,
        owner: "battleTargetSelection",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicBonusActionCastingTime",
        holes: [],
        owner: "battleActiveEffect",
      },
    ];
  }
  if (
    routeFill === "savingThrowOutcome" &&
    input.subject.invocation.procedure === "saveGatedDamage" &&
    result.tag !== "invalid"
  ) {
    return [
      ...metamagicBonusActionTimingRoutes(["savingThrowOutcome"]),
      {
        kind: "resolveBattleSubject",
        subject: "metamagicBonusActionCastingTime",
        fill: routeFill,
        holes,
        owner: "battleSavingThrowOutcome",
      },
      ...(result.tag === "resolved"
        ? [
            {
              kind: "resolveBattleSubjectWithoutFill" as const,
              subject: "metamagicBonusActionCastingTime" as const,
              holes: [],
              owner: metamagicSaveGatedFinalOwner(input.state, result.state),
            },
          ]
        : []),
    ];
  }
  if (routeFill === "savingThrowOutcome" && result.tag === "resolved") {
    return [
      ...metamagicBonusActionTimingRoutes(["savingThrowOutcome"]),
      {
        kind: "resolveBattleSubject",
        subject: "metamagicBonusActionCastingTime",
        fill: routeFill,
        holes,
        owner: "battleSavingThrowOutcome",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicBonusActionCastingTime",
        holes: [],
        owner: metamagicSaveGatedFinalOwner(input.state, result.state),
      },
    ];
  }
  if (routeFill === "rolledDice" && result.tag === "resolved") {
    if (input.subject.invocation.procedure === "directHitPointRestoration") {
      return [
        {
          kind: "resolveBattleSubject",
          subject: "metamagicBonusActionCastingTime",
          fill: routeFill,
          holes,
          owner: "battleHitPointAndZeroHpLifecycle",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "metamagicBonusActionCastingTime",
          holes: [],
          owner: "battleTurnBoundary",
        },
      ];
    }
    if (input.subject.invocation.procedure === "saveGatedDamage") {
      return [
        {
          kind: "resolveBattleSubject",
          subject: "metamagicBonusActionCastingTime",
          fill: routeFill,
          holes,
          owner: "battleDamageRoll",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "metamagicBonusActionCastingTime",
          holes: [],
          owner: "battleTurnBoundary",
        },
      ];
    }
    return [
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicBonusActionCastingTime",
        holes: [],
        owner: "battleTurnBoundary",
      },
    ];
  }
  return undefined;
}

function metamagicSavingThrowProtectionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isCarefulSavingThrowProtectionSubject(input.subject)) {
    return undefined;
  }
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "spellTargetList") {
    return [
      {
        kind: "resolveBattleSubject",
        subject: "metamagicSavingThrowProtection",
        fill: routeFill,
        holes:
          result.tag === "needsHoles"
            ? battleReducerRouteHoles(result.holes)
            : [],
        owner: "battleFeatureResource",
      },
    ];
  }
  if (routeFill === "savingThrowOutcome") {
    const holes =
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
    return [
      {
        kind: "resolveBattleSubject",
        subject: "metamagicSavingThrowProtection",
        fill: routeFill,
        holes,
        owner: "battleSavingThrowOutcome",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicSavingThrowProtection",
        holes,
        owner: "battleDamageAdjustment",
      },
      ...(result.tag === "resolved"
        ? [
            {
              kind: "resolveBattleSubjectWithoutFill",
              subject: "metamagicSavingThrowProtection",
              holes: [],
              owner: "battleFeatureResource",
            } satisfies BattleReducerRouteEvent,
          ]
        : []),
    ];
  }
  if (routeFill === "rolledDice" && result.tag === "resolved") {
    return [
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicSavingThrowProtection",
        holes: [],
        owner: "battleFeatureResource",
      },
    ];
  }
  return undefined;
}

function metamagicDamageTypeSubstitutionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (
    !isTransmutedDamageTypeSubstitutionSubject(input.subject) ||
    fill === undefined ||
    result.tag === "invalid"
  ) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  if (
    (routeFill === "savingThrowOutcome" || routeFill === "attackRoll") &&
    holes.includes("rolledDice")
  ) {
    return [
      {
        kind: "resolveBattleSubject",
        subject: "metamagicDamageTypeSubstitution",
        fill: "damageTypeChoice",
        holes,
        owner: "battleDamageType",
      },
    ];
  }
  if (routeFill === "rolledDice" && result.tag === "resolved") {
    return [
      {
        kind: "resolveBattleSubject",
        subject: "metamagicDamageTypeSubstitution",
        fill: routeFill,
        holes: [],
        owner: "battleDamageRoll",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicDamageTypeSubstitution",
        holes: [],
        owner: "battleHitPoint",
      },
    ];
  }
  return undefined;
}

function metamagicSavingThrowRollModeRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isHeightenedSavingThrowRollModeSubject(input.subject)) {
    return undefined;
  }
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (
    routeFill === "targetChoice" &&
    fill.kind === "targetChoice" &&
    isHeightenedSpellTargetChoiceHoleId(fill.holeId) &&
    result.tag === "needsHoles" &&
    battleReducerRouteHoles(result.holes).includes("savingThrowOutcome")
  ) {
    const holes = battleReducerRouteHoles(result.holes);
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicSavingThrowRollMode",
        holes,
        owner: "battleFeatureResource",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicSavingThrowRollMode",
        holes,
        owner: "battleSavingThrowRollMode",
      },
    ];
  }
  if (routeFill === "savingThrowOutcome" && result.tag === "resolved") {
    return [
      {
        kind: "resolveBattleSubject",
        subject: "metamagicSavingThrowRollMode",
        fill: routeFill,
        holes: [],
        owner: "battleSavingThrowOutcome",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicSavingThrowRollMode",
        holes: [],
        owner: "battleConditionLifecycle",
      },
    ];
  }
  return undefined;
}

function metamagicEffectiveSpellLevelRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isTwinnedEffectiveSpellLevelSubject(input.subject) ||
    result.tag === "invalid"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (
    fill === undefined ||
    battleReducerRouteFill(fill) !== "spellTargetList"
  ) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  return [
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicEffectiveSpellLevel",
      holes: ["spellTargetList"],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleSubject",
      subject: "metamagicEffectiveSpellLevel",
      fill: "spellTargetList",
      holes,
      owner: "battleTargetSelection",
    },
  ];
}

function metamagicSpellRangeProjectionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isDistantSpellRangeProjectionSubject(input.subject)) {
    return undefined;
  }
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "targetChoice") {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  return [
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicSpellRangeProjection",
      holes: ["targetChoice"],
      owner: "battleObjectTargetBoundary",
    },
    {
      kind: "resolveBattleSubject",
      subject: "metamagicSpellRangeProjection",
      fill: routeFill,
      holes,
      owner: "battleTargetSelection",
    },
  ];
}

function metamagicSpellDurationProjectionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    !isExtendedSpellDurationProjectionSubject(input.subject) ||
    !metamagicSpellDurationProjectionChangedState(input, result.state)
  ) {
    return undefined;
  }
  return [
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicSpellDurationProjection",
      holes: [],
      owner: "battleActiveEffect",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicSpellDurationProjection",
      holes: [],
      owner: "battleConcentration",
    },
  ];
}

function metamagicSpellDurationProjectionChangedState(
  input: BattleResolutionInput,
  after: BattleState,
): boolean {
  return (
    combatantsActiveEffectsChanged(input.state, after) ||
    (input.subject.tag === "actionSpell" &&
      combatantConcentrationChanged(input.state, after, input.subject.actorId))
  );
}

function combatantsActiveEffectsChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      before.combatants.get(combatant.combatantId)?.activeEffects !==
      combatant.activeEffects,
  );
}

function metamagicSpellComponentProjectionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    !isSubtleSpellComponentProjectionSubject(input.subject)
  ) {
    return undefined;
  }
  return [
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicSpellComponentProjection",
      holes: [],
      owner: "battleSpellSlotAndActionEconomy",
    },
  ];
}

function metamagicDamageDiceRerollRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isSpellAttackDamageSubject(input.subject)) {
    return undefined;
  }
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (
    routeFill === "attackRoll" &&
    result.tag === "needsHoles" &&
    hasEmpoweredSpellDamageRerollHole(result.holes)
  ) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicDamageDiceReroll",
        holes: battleReducerRouteHoles(result.holes),
        owner: "battleFeatureResource",
      },
    ];
  }
  if (
    routeFill !== "rolledDice" ||
    fill.kind !== "rolledDice" ||
    fill.spellDamageReroll?.effectKind !== EMPOWERED_METAMAGIC_EFFECT_KIND ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  return [
    {
      kind: "resolveBattleSubject",
      subject: "metamagicDamageDiceReroll",
      fill: routeFill,
      holes: ["rolledDice"],
      owner: "battleDamageRoll",
    },
    {
      kind: "resolveBattleSubject",
      subject: "metamagicDamageDiceReroll",
      fill: routeFill,
      holes: [],
      owner: "battleDamageRoll",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicDamageDiceReroll",
      holes: [],
      owner: "battleHitPoint",
    },
  ];
}

function metamagicMissedSpellAttackRerollRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isSpellAttackDamageSubject(input.subject)) {
    return undefined;
  }
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "attackRoll") {
    return metamagicMissedSpellAttackRerollCompletionRoute(input, result, fill);
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  if (
    result.tag === "needsHoles" &&
    hasSeekingSpellAttackRerollHole(result.holes)
  ) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "metamagicMissedSpellAttackReroll",
        holes,
        owner: "battleFeatureResource",
      },
      {
        kind: "resolveBattleSubject",
        subject: "metamagicMissedSpellAttackReroll",
        fill: routeFill,
        holes,
        owner: "battleAttackRoll",
      },
    ];
  }
  if (
    fill.kind !== "attackRoll" ||
    fill.value.spellAttackReroll?.effectKind !== SEEKING_METAMAGIC_EFFECT_KIND
  ) {
    return undefined;
  }
  return [
    {
      kind: "resolveBattleSubject",
      subject: "metamagicMissedSpellAttackReroll",
      fill: routeFill,
      holes,
      owner: "battleAttackRoll",
    },
  ];
}

function metamagicMissedSpellAttackRerollCompletionRoute(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    battleReducerRouteFill(fill) !== "rolledDice" ||
    !input.fills.some(
      (candidate) =>
        candidate.kind === "attackRoll" &&
        candidate.value.spellAttackReroll?.effectKind ===
          SEEKING_METAMAGIC_EFFECT_KIND,
    )
  ) {
    return undefined;
  }
  return [
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicMissedSpellAttackReroll",
      holes: [],
      owner: "battleFeatureResource",
    },
  ];
}

function hasSeekingSpellAttackRerollHole(
  holes: readonly BattleHole[],
): boolean {
  return holes.some(
    (hole) =>
      hole.kind === "attackRoll" &&
      "spellAttackRerolls" in hole &&
      hole.spellAttackRerolls?.some(
        (option) => option.effectKind === SEEKING_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
}

function hasEmpoweredSpellDamageRerollHole(
  holes: readonly BattleHole[],
): boolean {
  return holes.some(
    (hole) =>
      hole.kind === "rolledDice" &&
      "spellDamageRerolls" in hole &&
      hole.spellDamageRerolls?.some(
        (option) => option.effectKind === EMPOWERED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
}

function metamagicBonusActionTimingRoutes(
  holes: readonly BattleReducerRouteHole[],
): readonly [BattleReducerRouteEvent, BattleReducerRouteEvent] {
  return [
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes,
      owner: "battleActionEconomy",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes,
      owner: "battleSpellSlotAndActionEconomy",
    },
  ];
}

function metamagicSaveGatedFinalOwner(
  before: BattleState,
  after: BattleState,
): BattleReducerRouteOwnerGroup {
  return combatantsGainedActiveEffect(before, after)
    ? "battleActiveEffect"
    : "battleConditionLifecycle";
}

function combatantsGainedActiveEffect(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      combatant.activeEffects.length >
      (before.combatants.get(combatant.combatantId)?.activeEffects.length ?? 0),
  );
}

function metamagicGovernorInvalidRoute(
  input: BattleResolutionInput,
): BattleReducerRouteEvent {
  if (
    isQuickenedBonusActionCastingTimeSubject(input.subject) &&
    input.state.currentTurnResources.levelOnePlusSpellCastsThisTurn.includes(
      input.subject.actorId,
    )
  ) {
    return {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: [],
      owner: "battleTurnBoundary",
    };
  }
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "metamagicSpellGovernor",
    holes: [],
    owner: "battleFeatureResource",
  };
}

function isTwinnedEffectiveSpellLevelDiscoveryAct(
  act: AvailableBattleAct,
): boolean {
  return (
    isTwinnedEffectiveSpellLevelSubject(act.subject) &&
    act.initialHoles.some((hole) => hole.kind === "spellTargetList")
  );
}

function isCarefulSavingThrowProtectionSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isDistantSpellRangeProjectionSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.mode.tag === "cast" &&
    subject.invocation.procedure === "objectLight" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === DISTANT_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isHeightenedSavingThrowRollModeSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isTransmutedDamageTypeSubstitutionSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    (subject.invocation.procedure === "saveGatedDamage" ||
      subject.invocation.procedure === "spellAttackDamage") &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isTwinnedEffectiveSpellLevelSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.mode.tag === "cast" &&
    subject.invocation.procedure === "rollModifier" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isExtendedSpellDurationProjectionSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.mode.tag === "cast" &&
    (subject.invocation.procedure === "creatureSizeIncrease" ||
      subject.invocation.procedure === "creatureSizeDecrease") &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === EXTENDED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isSubtleSpellComponentProjectionSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    (subject.tag === "actionSpell" || subject.tag === "bonusActionSpell") &&
    subject.mode.tag === "cast" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === SUBTLE_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isSpellAttackDamageSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.invocation.procedure === "spellAttackDamage"
  );
}

function deathSavingThrowRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }

  const deathSavingThrowFill = input.fills.find(
    (fill) => fill.kind === "deathSavingThrow",
  );
  if (deathSavingThrowFill !== undefined) {
    if (result.tag === "invalid" && result.reason !== "wrongActor") {
      return undefined;
    }
    return nonEmptyRouteEvents([
      {
        kind: "resolveBattleSubject",
        subject: "deathSavingThrow",
        fill: "deathSavingThrow",
        holes:
          result.tag === "needsHoles"
            ? deathSavingThrowRouteHoles(result.holes)
            : [],
        owner: "battleHitPointAndZeroHpLifecycle",
      },
    ]);
  }

  if (
    result.tag !== "needsHoles" ||
    !deathSavingThrowRouteHoles(result.holes).includes("deathSavingThrow")
  ) {
    return undefined;
  }

  return nonEmptyRouteEvents([
    {
      kind: "discoverBattleActs",
      subject: "deathSavingThrow",
      holes: deathSavingThrowRouteHoles(result.holes),
      owner: "battleHitPointAndZeroHpLifecycle",
    },
  ]);
}

function deathSavingThrowRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter((hole) => hole.kind === "deathSavingThrow"),
  );
}

function concentrationRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isConcentrationTeardownSubject(input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }

  const routeFills = input.fills
    .map(battleReducerRouteFill)
    .filter((fill): fill is BattleReducerRouteFill => fill !== undefined);
  if (
    routeFills.includes("rolledDice") &&
    routeFills.includes("savingThrowOutcome")
  ) {
    return [
      afterHitDamageRiderResolveRoute(
        "rolledDice",
        ["savingThrowOutcome"],
        "battleHitPoint",
      ),
      afterHitDamageRiderResolveRoute(
        "savingThrowOutcome",
        [],
        "battleActiveEffect",
      ),
    ];
  }

  const fill = input.fills.at(-1);
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  if (fill === undefined) {
    if (input.subject.tag === "actionSpell") {
      const priorConcentration =
        input.state.combatants.get(input.subject.actorId)?.concentration ??
        null;
      const castRoute: BattleReducerRouteEvents = [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleActiveEffect",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleConcentration",
        },
      ];
      if (priorConcentration === null) {
        return castRoute;
      }
      return [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleConcentration",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleActiveEffect",
        },
        ...castRoute,
      ];
    }
    if (
      input.subject.tag === "runtimeCommand" &&
      input.subject.command === "endConcentration"
    ) {
      const afterHitRoutes = isAfterHitDamageRiderConcentrationTeardownSubject(
        input.state,
        input.subject,
      )
        ? [
            afterHitDamageRiderResolveWithoutFillRoute(
              holes,
              "battleConcentration",
            ),
            afterHitDamageRiderResolveWithoutFillRoute(
              holes,
              "battleActiveEffect",
            ),
          ]
        : [];
      const conditionImmunityRoutes =
        isConditionImmunityTemporaryHitPointConcentrationTeardownSubject(
          input.state,
          input.subject,
        )
          ? [
              levelOneBuffMarkSmiteResolveWithoutFillRoute(
                "conditionImmunityTemporaryHitPointEffect",
                holes,
                "battleConcentration",
              ),
              levelOneBuffMarkSmiteResolveWithoutFillRoute(
                "conditionImmunityTemporaryHitPointEffect",
                holes,
                "battleActiveEffect",
              ),
            ]
          : [];
      const markedDamageRiderRoutes = battleCombatantHasActiveEffectKind(
        input.state,
        input.subject.actorId,
        "spellMarkedDamageRider",
      )
        ? [
            levelOneBuffMarkSmiteResolveWithoutFillRoute(
              "markedDamageRiderEffect",
              holes,
              "battleConcentration",
            ),
            levelOneBuffMarkSmiteResolveWithoutFillRoute(
              "markedDamageRiderEffect",
              holes,
              "battleActiveEffect",
            ),
          ]
        : [];
      return [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleConcentration",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleActiveEffect",
        },
        ...afterHitRoutes,
        ...conditionImmunityRoutes,
        ...markedDamageRiderRoutes,
      ];
    }
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  if (routeFill === "concentrationSavingThrow") {
    const concentrationEvent: BattleReducerRouteEvent = {
      kind: "resolveBattleSubject",
      subject: "concentrationTeardown",
      fill: routeFill,
      holes,
      owner: "battleConcentration",
    };
    return result.tag === "resolved"
      ? [
          concentrationEvent,
          {
            kind: "resolveBattleSubjectWithoutFill",
            subject: "concentrationTeardown",
            holes: [],
            owner: "battleActiveEffect",
          },
        ]
      : [concentrationEvent];
  }
  if (
    routeFill === "rolledDice" &&
    battleReducerRouteHoles(
      result.tag === "needsHoles" ? result.holes : [],
    ).includes("concentrationSavingThrow")
  ) {
    return [
      {
        kind: "resolveBattleSubject",
        subject: "concentrationTeardown",
        fill: routeFill,
        holes,
        owner: "battleConcentration",
      },
    ];
  }
  return undefined;
}

function hitPointRestorationRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  if (!isHitPointRestorationResolution(input.subject, fill)) {
    return undefined;
  }
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }

  return {
    kind: "resolveBattleSubject",
    subject: "hitPointRestoration",
    fill: routeFill,
    holes:
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    owner: hitPointRestorationRouteOwner(routeFill, result),
  };
}

function hitPointRestorationRouteOwner(
  fill: BattleReducerRouteFill,
  result: BattleResolutionResult,
): BattleReducerRouteOwnerGroup {
  if (fill === "rolledDice" && result.tag === "resolved") {
    return "battleHitPointAndZeroHpLifecycle";
  }
  if (fill === "hitPointHealingDistribution") {
    return "battleHitPointAndZeroHpLifecycle";
  }
  return "battleHoleFrontier";
}

function slotSpellRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (!isSlotSpellResolutionSubject(input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "spellTargetAllocation" && routeFill !== "rolledDice") {
    return undefined;
  }

  return {
    kind: "resolveBattleSubject",
    subject: "slotSpell",
    fill: routeFill,
    holes:
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    owner:
      routeFill === "rolledDice" && result.tag === "resolved"
        ? "battleHitPoint"
        : "battleHoleFrontier",
  };
}

function commandRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (!isCommandEffectSubject(input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return commandRouteWithoutFill(input);
  }

  const routeFill = commandRouteFill(fill);
  if (routeFill === undefined) {
    return commandRouteWithoutFill(input);
  }

  return {
    kind: "resolveBattleSubject",
    subject: "commandEffect",
    fill: routeFill,
    holes: commandRouteHolesAfter(input, result),
    owner: commandRouteOwner(input, result, routeFill),
  };
}

function commandRouteWithoutFill(
  input: BattleResolutionInput,
): BattleReducerRouteEvent | undefined {
  const owner = commandRouteOwnerWithoutFill(input);
  return owner === undefined
    ? undefined
    : {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "commandEffect",
        holes: [],
        owner,
      };
}

function commandRouteOwnerWithoutFill(
  input: BattleResolutionInput,
): BattleReducerRouteOwnerGroup | undefined {
  const subject = input.subject;
  if (subject.tag !== "runtimeCommand") {
    return undefined;
  }
  if (subject.command === "commandGrovel") {
    return "battleConditionLifecycle";
  }
  if (subject.command === "commandDrop") {
    return "battleActiveEffect";
  }
  if (
    subject.command === "commandApproach" ||
    subject.command === "commandFlee"
  ) {
    return "battleMovementResource";
  }
  if (
    subject.command === "endTurn" &&
    input.state.currentTurnResources.commandHalt !== null
  ) {
    return "battleActiveEffect";
  }
  return undefined;
}

function commandRouteOwner(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleReducerRouteFill,
): BattleReducerRouteOwnerGroup {
  if (input.subject.tag === "actionSpell") {
    if (fill === "savingThrowOutcome" && result.tag === "resolved") {
      return "battleActiveEffect";
    }
    return "battleHoleFrontier";
  }
  if (input.subject.tag === "runtimeCommand") {
    if (input.subject.command === "commandFlee" && result.tag === "invalid") {
      return "battleHoleFrontier";
    }
    if (
      fill === "movement" &&
      result.tag === "needsHoles" &&
      battleReducerRouteHoles(result.holes).includes("interruptDecision")
    ) {
      return "battleInterruptStack";
    }
    if (
      input.subject.command === "commandApproach" ||
      input.subject.command === "commandFlee"
    ) {
      return "battleMovementResource";
    }
  }
  return "battleActiveEffect";
}

function saveGatedSpellRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isSaveGatedSpellResolution(input)) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const owner = saveGatedSpellRouteOwner(routeFill);
  if (owner === undefined) {
    return undefined;
  }
  const primaryRoute: BattleReducerRouteEvent = {
    kind: "resolveBattleSubject",
    subject: "saveGatedSpell",
    fill: routeFill,
    holes,
    owner,
  };
  if (result.tag !== "needsHoles") {
    return [primaryRoute];
  }
  if (
    !holes.includes("interruptDecision") ||
    routeFill !== "savingThrowOutcome"
  ) {
    return [primaryRoute];
  }

  return [
    primaryRoute,
    {
      kind: "resolveBattleSubject",
      subject: "saveGatedSpell",
      fill: routeFill,
      holes,
      owner: "battleInterruptStack",
    },
  ];
}

function saveGatedSpellRouteOwner(
  fill: BattleReducerRouteFill,
): BattleReducerRouteOwnerGroup | undefined {
  if (fill === "targetChoice") {
    return "battleTargetSelection";
  }
  if (fill === "spellTargetList") {
    return "battleHoleFrontier";
  }
  if (fill === "savingThrowOutcome") {
    return "battleHoleFrontier";
  }
  if (fill === "rolledDice") {
    return "battleHitPoint";
  }
  return undefined;
}

function spellAttackHitActiveEffectAdmissionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (result.tag === "invalid") {
    return [];
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleFillKind(fill) !== "rolledDice") {
    return [];
  }
  return activeEffectKindsAdded(input.state, result.state).flatMap((kind) => {
    const subject = spellAttackHitActiveEffectRouteSubject(kind);
    return subject === undefined
      ? []
      : [
          {
            kind: "resolveBattleSubjectWithoutFill" as const,
            subject,
            holes: [],
            owner: "battleActiveEffect" as const,
          },
        ];
  });
}

function spellAttackHitActiveEffectRouteSubject(
  kind: BattleActiveEffect["kind"],
): BattleReducerRouteSubjectFamily | undefined {
  if (kind === "hitPointRegainPrevented") {
    return "hitPointRegainPrevention";
  }
  if (kind === "nextAttackRollAgainstSelf") {
    return "nextAttackRollMode";
  }
  if (kind === "opportunityAttackDenied") {
    return "reactionInterdiction";
  }
  return undefined;
}

function activeEffectKindsAdded(
  before: BattleState,
  after: BattleState,
): readonly BattleActiveEffect["kind"][] {
  const beforeCounts = battleActiveEffectKindCounts(before);
  const added = new Set<BattleActiveEffect["kind"]>();
  for (const effect of activeEffects(after)) {
    const previous = beforeCounts.get(effect.kind) ?? 0;
    if (previous === 0) {
      added.add(effect.kind);
      continue;
    }
    beforeCounts.set(effect.kind, previous - 1);
  }
  return [...added];
}

function battleActiveEffectKindCounts(
  state: BattleState,
): Map<BattleActiveEffect["kind"], number> {
  const counts = new Map<BattleActiveEffect["kind"], number>();
  for (const effect of activeEffects(state)) {
    counts.set(effect.kind, (counts.get(effect.kind) ?? 0) + 1);
  }
  return counts;
}

function activeEffects(state: BattleState): readonly BattleActiveEffect[] {
  return [...state.combatants.values()].flatMap(
    (combatant) => combatant.activeEffects,
  );
}

function interruptStackResumeDiscoveryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = battleReducerRouteHoles(result.holes);
  const discoversInterruptDecision = holes.includes("interruptDecision");
  const discoversReplayContinuationHole =
    input.state.interruptStack.at(-1)?.kind === "replayContinuation" &&
    holes.includes("rolledDice");
  if (!discoversInterruptDecision && !discoversReplayContinuationHole) {
    return undefined;
  }

  const frame = currentInterruptCheckpoint(result.state);
  const subject =
    discoversInterruptDecision &&
    frame !== undefined &&
    isReactionSpellCastingTimeFrame(frame) &&
    frame.choices.some((choice) => choice.kind === "castTriggeredReactionSpell")
      ? "reactionSpell"
      : "interruptStackResume";
  return {
    kind: "discoverBattleActs",
    subject,
    holes,
    owner: "battleInterruptStack",
  };
}

function currentInterruptCheckpoint(
  state: BattleState,
): BattleInterruptCheckpoint | undefined {
  const frame = state.interruptStack.at(-1);
  return frame?.kind === "interruptCheckpoint" ? frame.frame : undefined;
}

function isReactionSpellCastingTimeFrame(
  frame: BattleInterruptCheckpoint,
): frame is Extract<
  BattleInterruptCheckpoint,
  { readonly trigger: "afterDamage" | "spellCast" }
> {
  return frame.trigger === "afterDamage" || frame.trigger === "spellCast";
}

function combatantHitPointsChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      combatant.hp !== before.combatants.get(combatant.combatantId)?.hp,
  );
}

function rollModifierRouteForDiscoveredAct(
  act: AvailableBattleAct,
): BattleReducerRouteEvent | undefined {
  if (!isRollModifierEffectDiscoverySubject(act.subject)) {
    return undefined;
  }
  return {
    kind: "discoverBattleActs",
    subject: "rollModifierEffect",
    holes: rollModifierRouteHoles(act.initialHoles),
    owner:
      act.subject.invocation.procedure === "thaumaturgyBoomingVoice"
        ? "battleActiveEffect"
        : "battleSpellSlotAndActionEconomy",
  };
}

function rollModifierRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isRollModifierEffectResolutionSubject(input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  if (input.subject.invocation.procedure === "thaumaturgyBoomingVoice") {
    if (
      fill.kind === "thaumaturgyActiveOneMinuteEffectCount" &&
      result.tag === "resolved"
    ) {
      return [rollModifierResolveWithoutFill([], "battleActiveEffect")];
    }
    return undefined;
  }

  const holes =
    result.tag === "needsHoles" ? rollModifierRouteHoles(result.holes) : [];
  if (
    (fill.kind === "targetChoice" || fill.kind === "spellTargetList") &&
    result.tag === "needsHoles" &&
    holes.includes("savingThrowOutcome")
  ) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "rollModifierEffect",
        holes,
        owner: "battleSpellSlotAndActionEconomy",
      },
    ];
  }
  if (result.tag !== "resolved") {
    return undefined;
  }

  const routeFill = rollModifierRouteFill(fill);
  if (routeFill === undefined) {
    if (fill.kind !== "targetChoice" && fill.kind !== "spellTargetList") {
      return undefined;
    }
    return [
      rollModifierResolveWithoutFill([], "battleActiveEffect"),
      rollModifierResolveWithoutFill([], "battleConcentration"),
    ];
  }
  return [
    {
      kind: "resolveBattleSubject",
      subject: "rollModifierEffect",
      fill: routeFill,
      holes: [],
      owner: "battleActiveEffect",
    },
    rollModifierResolveWithoutFill([], "battleConcentration"),
  ];
}

function rollModifierConcentrationBreakRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "resolved") {
    return undefined;
  }
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "endConcentration"
  ) {
    return undefined;
  }
  if (!hasConcentratingRollModifierEffect(input.state, input.subject.actorId)) {
    return undefined;
  }
  return [
    rollModifierResolveWithoutFill([], "battleConcentration"),
    rollModifierResolveWithoutFill([], "battleActiveEffect"),
  ];
}

function rollModifierResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "rollModifierEffect",
    holes,
    owner,
  };
}

function scalarBuffRouteForDiscoveredAct(
  act: AvailableBattleAct,
): BattleReducerRouteEvent | undefined {
  if (!isScalarBuffEffectSubject(act.subject)) {
    return undefined;
  }
  return {
    kind: "discoverBattleActs",
    subject: "scalarBuffEffect",
    holes: [],
    owner: "battleSpellSlotAndActionEconomy",
  };
}

type LevelOneBuffMarkSmiteSubstrateSubject = Extract<
  BattleReducerRouteSubjectFamily,
  | "spellHostedWeaponAttack"
  | "weaponDamageRider"
  | "heldWeaponActiveEffect"
  | "markedDamageRiderEffect"
  | "conditionImmunityTemporaryHitPointEffect"
>;

function levelOneBuffMarkSmiteSubstrateRouteForDiscoveredAct(
  state: BattleState,
  act: AvailableBattleAct,
): BattleReducerRouteEvent | undefined {
  const subject = levelOneBuffMarkSmiteSpellSubstrateSubject(
    state,
    act.subject,
  );
  if (subject === undefined) {
    return undefined;
  }
  return {
    kind: "discoverBattleActs",
    subject,
    holes: levelOneBuffMarkSmiteDiscoveryHolesForAct(
      state,
      subject,
      act.subject,
      act.initialHoles,
    ),
    owner: levelOneBuffMarkSmiteDiscoveryOwnerForAct(subject, act.subject),
  };
}

function levelOneBuffMarkSmiteSubstrateRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const spellSubject = levelOneBuffMarkSmiteSpellSubstrateRouteForResolution(
    input,
    result,
  );
  if (spellSubject !== undefined) {
    return spellSubject;
  }
  return levelOneBuffMarkSmiteWeaponAttackSubstrateRouteForResolution(
    input,
    result,
  );
}

function levelOneBuffMarkSmiteSpellSubstrateRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const subject = levelOneBuffMarkSmiteSpellSubstrateSubject(
    input.state,
    input.subject,
  );
  if (subject === undefined) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return result.reason === "staleSubject"
      ? [
          levelOneBuffMarkSmiteResolveWithoutFillRoute(
            subject,
            [],
            "battleHoleFrontier",
          ),
        ]
      : undefined;
  }

  const fill = input.fills.at(-1);
  const routeFill =
    fill === undefined ? undefined : battleReducerRouteFill(fill);
  if (fill !== undefined && routeFill === undefined) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [];
  if (routeFill !== undefined) {
    route.push(
      levelOneBuffMarkSmiteResolveRoute(
        subject,
        routeFill,
        holes,
        levelOneBuffMarkSmiteFillOwner(subject, routeFill),
      ),
    );
  }
  if (
    result.tag === "needsHoles" &&
    !levelOneBuffMarkSmiteSuppressNextDiscovery(subject, holes)
  ) {
    route.push(
      levelOneBuffMarkSmiteDiscoverRoute(
        subject,
        holes,
        levelOneBuffMarkSmiteNextDiscoveryOwner(subject, holes),
      ),
    );
  }
  if (result.tag === "resolved") {
    const resolvedOwners = levelOneBuffMarkSmiteResolvedOwners(
      input.state,
      result.state,
      input.subject.actorId,
      subject,
    );
    route.push(
      ...resolvedOwners
        .filter(
          (owner) =>
            !(
              subject === "markedDamageRiderEffect" &&
              typeof routeFill === "object" &&
              routeFill.kind === "abilityChoice" &&
              owner === "battleActiveEffect"
            ),
        )
        .map((owner) =>
          levelOneBuffMarkSmiteResolveWithoutFillRoute(subject, [], owner),
        ),
    );
  }
  return nonEmptyRouteEvents(route);
}

function levelOneBuffMarkSmiteWeaponAttackSubstrateRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isWeaponAttackSubject(input.subject) || result.tag === "invalid") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const hasMarkedDamageRider = battleCombatantHasActiveEffectKind(
    input.state,
    input.subject.actorId,
    "spellMarkedDamageRider",
  );
  if (
    fill.kind === "attackDamageDisposition" &&
    hasMarkedDamageRider &&
    result.tag === "resolved" &&
    markedDamageRiderTransferBecameAvailable(input.state, result.state)
  ) {
    return [
      levelOneBuffMarkSmiteResolveWithoutFillRoute(
        "markedDamageRiderEffect",
        [],
        "battleHitPointAndZeroHpLifecycle",
      ),
      levelOneBuffMarkSmiteResolveWithoutFillRoute(
        "markedDamageRiderEffect",
        [],
        "battleActiveEffect",
      ),
    ];
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [];
  const subject = levelOneBuffMarkSmiteWeaponAttackSubject(
    input.state,
    input.subject,
  );
  if (hasMarkedDamageRider && routeFill === "targetChoice") {
    if (result.tag === "needsHoles") {
      route.push(
        levelOneBuffMarkSmiteResolveRoute(
          "markedDamageRiderEffect",
          routeFill,
          holes,
          "battleTargetSelection",
        ),
      );
    }
  }
  if (hasMarkedDamageRider && routeFill === "attackRoll") {
    route.push(
      levelOneBuffMarkSmiteResolveRoute(
        "markedDamageRiderEffect",
        routeFill,
        holes,
        "battleAttackRoll",
      ),
    );
  }
  if (subject === "heldWeaponActiveEffect" && routeFill === "targetChoice") {
    if (result.tag === "needsHoles") {
      route.push(
        levelOneBuffMarkSmiteDiscoverRoute(
          subject,
          holes,
          "battleActiveEffect",
        ),
      );
    }
  } else if (subject !== undefined) {
    route.push(
      levelOneBuffMarkSmiteResolveRoute(
        subject,
        routeFill,
        holes,
        levelOneBuffMarkSmiteWeaponAttackOwner(subject, routeFill),
      ),
    );
    if (result.tag === "needsHoles") {
      route.push(
        levelOneBuffMarkSmiteDiscoverRoute(
          subject,
          holes,
          subject === "heldWeaponActiveEffect"
            ? "battleActiveEffect"
            : levelOneBuffMarkSmiteNextDiscoveryOwner(subject, holes),
        ),
      );
    }
  }
  if (
    routeFill === "rolledDice" &&
    battleCombatantHasActiveEffectKind(
      input.state,
      input.subject.actorId,
      "spellMarkedDamageRider",
    )
  ) {
    route.push(
      levelOneBuffMarkSmiteResolveRoute(
        "markedDamageRiderEffect",
        routeFill,
        holes,
        "battleHitPoint",
      ),
    );
    if (markedDamageRiderTransferBecameAvailable(input.state, result.state)) {
      route.push(
        levelOneBuffMarkSmiteResolveWithoutFillRoute(
          "markedDamageRiderEffect",
          holes,
          "battleHitPointAndZeroHpLifecycle",
        ),
        levelOneBuffMarkSmiteResolveWithoutFillRoute(
          "markedDamageRiderEffect",
          holes,
          "battleActiveEffect",
        ),
      );
    }
  }
  if (routeFill === "attackRoll" && battleHasWeaponDamageRiderHole(result)) {
    route.push(
      levelOneBuffMarkSmiteDiscoverRoute(
        "weaponDamageRider",
        holes,
        "battleActiveEffect",
      ),
    );
  }
  if (
    routeFill === "rolledDice" &&
    battleCombatantHasActiveEffectKind(
      input.state,
      input.subject.actorId,
      "spellWeaponDamageRider",
    )
  ) {
    route.push(
      levelOneBuffMarkSmiteResolveRoute(
        "weaponDamageRider",
        routeFill,
        holes,
        "battleHitPoint",
      ),
    );
  }
  return nonEmptyRouteEvents(route);
}

function levelOneBuffMarkSmiteSpellSubstrateSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): LevelOneBuffMarkSmiteSubstrateSubject | undefined {
  const invocation = spellInvocationForRouteSubject(state, subject);
  if (invocation?.procedure === "spellHostedWeaponAttack") {
    return "spellHostedWeaponAttack";
  }
  if (invocation?.procedure === "weaponDamageRider") {
    return "weaponDamageRider";
  }
  if (invocation?.procedure === "weaponAttackOverride") {
    return "heldWeaponActiveEffect";
  }
  if (invocation?.procedure === "markedDamageRider") {
    return "markedDamageRiderEffect";
  }
  if (
    invocation?.procedure === "conditionImmunityAndTurnStartTemporaryHitPoints"
  ) {
    return "conditionImmunityTemporaryHitPointEffect";
  }
  return undefined;
}

function levelOneBuffMarkSmiteDiscoveryOwner(
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
): BattleReducerRouteOwnerGroup {
  return subject === "spellHostedWeaponAttack" ||
    subject === "heldWeaponActiveEffect"
    ? "battleActionEconomy"
    : "battleSpellSlotAndActionEconomy";
}

function levelOneBuffMarkSmiteDiscoveryOwnerForAct(
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
  battleSubject: BattleResolutionInput["subject"],
): BattleReducerRouteOwnerGroup {
  if (
    subject === "markedDamageRiderEffect" &&
    battleSubject.tag === "bonusActionSpell" &&
    battleSubject.invocation.tag === "spellEffect"
  ) {
    return "battleActionEconomy";
  }
  return levelOneBuffMarkSmiteDiscoveryOwner(subject);
}

function levelOneBuffMarkSmiteDiscoveryHolesForAct(
  state: BattleState,
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
  battleSubject: BattleResolutionInput["subject"],
  initialHoles: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  const holes = battleReducerRouteHoles(initialHoles);
  const invocation = spellInvocationForRouteSubject(state, battleSubject);
  if (
    subject !== "markedDamageRiderEffect" ||
    !invocationHasChosenAbilityCheckDisadvantage(invocation)
  ) {
    return holes;
  }
  return [...new Set([...holes, "abilityChoice" as const])].sort();
}

function levelOneBuffMarkSmiteSuppressNextDiscovery(
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
  holes: readonly BattleReducerRouteHole[],
): boolean {
  return (
    subject === "markedDamageRiderEffect" &&
    holes.length === 1 &&
    holes[0] === "abilityChoice"
  );
}

function invocationHasChosenAbilityCheckDisadvantage(
  invocation: SupportedSpellInvocation | undefined,
): boolean {
  if (invocation === undefined) {
    return false;
  }
  if (!("abilityCheckBehavior" in invocation)) {
    return false;
  }
  const behavior = invocation.abilityCheckBehavior;
  return (
    typeof behavior === "object" &&
    behavior !== null &&
    "kind" in behavior &&
    behavior.kind === "chosenAbilityDisadvantage"
  );
}

function levelOneBuffMarkSmiteFillOwner(
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
  fill: BattleReducerRouteFill,
): BattleReducerRouteOwnerGroup {
  if (fill === "targetChoice") {
    return "battleTargetSelection";
  }
  if (
    fill === "abilityChoice" ||
    (typeof fill === "object" && fill.kind === "abilityChoice")
  ) {
    return "battleActiveEffect";
  }
  if (fill === "damageTypeChoice") {
    return subject === "spellHostedWeaponAttack"
      ? "battleHoleFrontier"
      : "battleActiveEffect";
  }
  if (fill === "attackRoll") {
    return "battleAttackRoll";
  }
  if (fill === "rolledDice") {
    return "battleHitPoint";
  }
  return levelOneBuffMarkSmiteDiscoveryOwner(subject);
}

function levelOneBuffMarkSmiteNextDiscoveryOwner(
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
  holes: readonly BattleReducerRouteHole[],
): BattleReducerRouteOwnerGroup {
  if (subject === "heldWeaponActiveEffect") {
    return "battleActiveEffect";
  }
  if (holes.includes("targetChoice")) {
    return "battleTargetSelection";
  }
  if (holes.includes("attackRoll")) {
    return "battleAttackRoll";
  }
  if (holes.includes("rolledDice")) {
    return "battleHitPoint";
  }
  return levelOneBuffMarkSmiteDiscoveryOwner(subject);
}

function levelOneBuffMarkSmiteResolvedOwners(
  before: BattleState,
  after: BattleState,
  actorId: CombatantId,
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
): readonly BattleReducerRouteOwnerGroup[] {
  const owners: BattleReducerRouteOwnerGroup[] = [];
  if (combatantsActiveEffectsChanged(before, after)) {
    owners.push("battleActiveEffect");
  }
  if (combatantConcentrationChanged(before, after, actorId)) {
    owners.push("battleConcentration");
  }
  if (
    subject === "conditionImmunityTemporaryHitPointEffect" &&
    combatantTemporaryHitPointsIncreased(before, after)
  ) {
    owners.push("battleTemporaryHitPoint");
  }
  if (
    subject === "conditionImmunityTemporaryHitPointEffect" &&
    combatantConditionsChanged(before, after)
  ) {
    owners.push("battleConditionLifecycle", "battleActiveEffect");
  }
  return owners;
}

function levelOneBuffMarkSmiteWeaponAttackSubject(
  state: BattleState,
  subject: { readonly actorId: CombatantId },
):
  | Extract<
      LevelOneBuffMarkSmiteSubstrateSubject,
      "heldWeaponActiveEffect" | "spellHostedWeaponAttack"
    >
  | undefined {
  if (
    battleCombatantHasActiveEffectKind(
      state,
      subject.actorId,
      "spellWeaponAttackOverride",
    )
  ) {
    return "heldWeaponActiveEffect";
  }
  if (battleHasSpellHostedWeaponAttackDamageAddition(state)) {
    return "spellHostedWeaponAttack";
  }
  return undefined;
}

function levelOneBuffMarkSmiteWeaponAttackOwner(
  _subject: Extract<
    LevelOneBuffMarkSmiteSubstrateSubject,
    "heldWeaponActiveEffect" | "spellHostedWeaponAttack"
  >,
  fill: BattleReducerRouteFill,
): BattleReducerRouteOwnerGroup {
  if (fill === "targetChoice") {
    return "battleTargetSelection";
  }
  if (fill === "attackRoll") {
    return "battleAttackRoll";
  }
  if (fill === "rolledDice") {
    return "battleHitPoint";
  }
  return "battleActionEconomy";
}

function levelOneBuffMarkSmiteResolveRoute(
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
  fill: BattleReducerRouteFill,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject,
    fill,
    holes,
    owner,
  };
}

function levelOneBuffMarkSmiteDiscoverRoute(
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject,
    holes,
    owner,
  };
}

function levelOneBuffMarkSmiteResolveWithoutFillRoute(
  subject: LevelOneBuffMarkSmiteSubstrateSubject,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject,
    holes,
    owner,
  };
}

function markedDamageRiderWeaponAttackRouteForDiscoveredAct(
  state: BattleState,
  act: AvailableBattleAct,
): BattleReducerRouteEvent | undefined {
  if (
    !isWeaponAttackSubject(act.subject) ||
    !battleCombatantHasActiveEffectKind(
      state,
      act.subject.actorId,
      "spellMarkedDamageRider",
    )
  ) {
    return undefined;
  }
  return levelOneBuffMarkSmiteDiscoverRoute(
    "markedDamageRiderEffect",
    battleReducerRouteHoles(act.initialHoles),
    "battleActionEconomy",
  );
}

function markedDamageRiderAbilityCheckRollModeRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag === "invalid" ||
    input.subject.tag !== "action" ||
    input.subject.action !== "search"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (
    fill?.kind !== "abilityCheck" ||
    requiredAbilityCheckRollMode(input.state, input.subject.actorId, "wis") !==
      "disadvantage"
  ) {
    return undefined;
  }
  return [
    levelOneBuffMarkSmiteResolveWithoutFillRoute(
      "markedDamageRiderEffect",
      [],
      "battleAbilityCheckRollMode",
    ),
  ];
}

function conditionImmunityTemporaryHitPointTurnBoundaryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isEndTurnSubject(input.subject) ||
    result.tag !== "resolved" ||
    !conditionImmunityTemporaryHitPointsIncreased(input.state, result.state)
  ) {
    return undefined;
  }
  return [
    levelOneBuffMarkSmiteDiscoverRoute(
      "conditionImmunityTemporaryHitPointEffect",
      [],
      "battleTurnBoundary",
    ),
    levelOneBuffMarkSmiteResolveWithoutFillRoute(
      "conditionImmunityTemporaryHitPointEffect",
      [],
      "battleTemporaryHitPoint",
    ),
  ];
}

function markedDamageRiderTurnBoundaryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isEndTurnSubject(input.subject) ||
    result.tag !== "resolved" ||
    !(
      markedDamageRiderLaterTransferBecameAvailable(
        input.state,
        result.state,
      ) ||
      combatantOwnsMarkedDamageRiderLaterTransfer(
        input.state,
        input.subject.actorId,
      )
    )
  ) {
    return undefined;
  }
  return [
    levelOneBuffMarkSmiteResolveWithoutFillRoute(
      "markedDamageRiderEffect",
      [],
      "battleTurnBoundary",
    ),
  ];
}

function conditionImmunityTemporaryHitPointsIncreased(
  before: BattleState,
  after: BattleState,
): boolean {
  return (
    battleHasActiveEffectKind(before, "turnStartTemporaryHitPoints") &&
    combatantTemporaryHitPointsIncreased(before, after)
  );
}

function battleHasActiveEffectKind(
  state: BattleState,
  kind: BattleActiveEffect["kind"],
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some((effect) => effect.kind === kind),
  );
}

function markedDamageRiderTransferBecameAvailable(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...before.combatants.keys()].some((combatantId) => {
    const beforeEffects = markedDamageRiderEffects(before, combatantId);
    const afterEffects = markedDamageRiderEffects(after, combatantId);
    return beforeEffects.some((beforeEffect) => {
      if (beforeEffect.transfer.kind !== "awaitingTargetDrop") {
        return false;
      }
      const afterEffect = afterEffects.find(
        (candidate) =>
          candidate.sourceSpellId === beforeEffect.sourceSpellId &&
          candidate.sourceCombatantId === beforeEffect.sourceCombatantId,
      );
      return (
        afterEffect !== undefined &&
        (afterEffect.transfer.kind === "available" ||
          afterEffect.transfer.kind === "availableAfterTurn")
      );
    });
  });
}

function markedDamageRiderLaterTransferBecameAvailable(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...before.combatants.keys()].some((combatantId) => {
    const beforeEffects = markedDamageRiderEffects(before, combatantId);
    const afterEffects = markedDamageRiderEffects(after, combatantId);
    return beforeEffects.some((beforeEffect) => {
      if (beforeEffect.transfer.kind !== "availableAfterTurn") {
        return false;
      }
      const afterEffect = afterEffects.find(
        (candidate) =>
          candidate.sourceSpellId === beforeEffect.sourceSpellId &&
          candidate.sourceCombatantId === beforeEffect.sourceCombatantId,
      );
      return afterEffect?.transfer.kind === "available";
    });
  });
}

function combatantOwnsMarkedDamageRiderLaterTransfer(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "spellMarkedDamageRider" &&
        effect.sourceCombatantId === combatantId &&
        effect.transfer.kind === "availableAfterTurn",
    ),
  );
}

function markedDamageRiderEffects(
  state: BattleState,
  combatantId: CombatantId,
): readonly Extract<
  BattleActiveEffect,
  { readonly kind: "spellMarkedDamageRider" }
>[] {
  return (
    state.combatants
      .get(combatantId)
      ?.activeEffects.filter(
        (
          effect,
        ): effect is Extract<
          BattleActiveEffect,
          { readonly kind: "spellMarkedDamageRider" }
        > => effect.kind === "spellMarkedDamageRider",
      ) ?? []
  );
}

function protectionCharmRouteForDiscoveredAct(
  state: BattleState,
  act: AvailableBattleAct,
): BattleReducerRouteEvents | undefined {
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (isSourceDamageBreakCharmedSaveGatedConditionInvocation(invocation)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "creatureTypeTargetAdmission",
        holes: ["targetChoice"],
        owner: "battleSpellSlotAndActionEconomy",
      },
      {
        kind: "discoverBattleActs",
        subject: "protectionCharmActiveEffect",
        holes: ["savingThrowOutcome", "targetChoice"],
        owner: "battleSpellSlotAndActionEconomy",
      },
    ];
  }
  if (!isCreatureTypeProtectionInvocation(invocation)) {
    return undefined;
  }
  return [
    {
      kind: "discoverBattleActs",
      subject: "protectionCharmActiveEffect",
      holes: ["targetChoice"],
      owner: "battleSpellSlotAndActionEconomy",
    },
  ];
}

function protectionCharmRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (isProtectionRelevantEffectSaveSubject(input.subject)) {
    return protectionRelevantEffectSaveRouteForResolution(result);
  }
  const conditionAttemptRoute = protectionConditionAttemptRouteForResolution(
    input,
    result,
  );
  if (conditionAttemptRoute !== undefined) {
    return conditionAttemptRoute;
  }
  const possessionAttemptRoute = protectionPossessionAttemptRouteForResolution(
    input,
    result,
  );
  if (possessionAttemptRoute !== undefined) {
    return possessionAttemptRoute;
  }
  const invocation = spellInvocationForRouteSubject(input.state, input.subject);
  if (isCreatureTypeProtectionInvocation(invocation)) {
    return creatureTypeProtectionRouteForResolution(input, result);
  }
  if (isCharmedSaveGatedConditionInvocation(invocation)) {
    const preventedCharmRoute =
      protectionPreventedCharmedConditionRouteForResolution(input, result);
    if (preventedCharmRoute !== undefined) {
      return preventedCharmRoute;
    }
  }
  if (isSourceDamageBreakCharmedSaveGatedConditionInvocation(invocation)) {
    return sourceDamageBreakCharmedRouteForResolution(input, result);
  }
  return undefined;
}

function protectionConditionAttemptRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "creatureTypeProtectionConditionAttempt" ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  const target = input.state.combatants.get(input.subject.actorId);
  if (
    target === undefined ||
    !conditionApplicationPreventedByCreatureTypeProtection(
      input.state,
      input.subject.sourceCombatantId,
      target,
      input.subject.condition,
    )
  ) {
    return undefined;
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleConditionLifecycle"),
  ];
}

function protectionPossessionAttemptRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "creatureTypeProtectionPossessionAttempt" ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  const disposition = resolveBattlePossessionAttempt({
    state: input.state,
    sourceCombatantId: input.subject.sourceCombatantId,
    targetId: input.subject.actorId,
  });
  if (
    disposition.tag !== "prevented" ||
    disposition.prevention !== "creatureTypeProtection"
  ) {
    return undefined;
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleCreatureState"),
  ];
}

function protectionRelevantEffectSaveRouteForResolution(
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  if (!battleReducerRouteHoles(result.holes).includes("savingThrowOutcome")) {
    return undefined;
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleSavingThrowRollMode"),
  ];
}

function creatureTypeProtectionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined || battleReducerRouteFill(fill) !== "targetChoice") {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [
    {
      kind: "resolveBattleSubject",
      subject: "protectionCharmActiveEffect",
      fill: "targetChoice",
      holes,
      owner: "battleTargetSelection",
    },
  ];
  if (result.tag === "resolved") {
    if (combatantsActiveEffectsChanged(input.state, result.state)) {
      route.push(protectionCharmResolveWithoutFill([], "battleActiveEffect"));
    }
    if (
      input.subject.tag === "actionSpell" &&
      combatantConcentrationChanged(
        input.state,
        result.state,
        input.subject.actorId,
      )
    ) {
      route.push(protectionCharmResolveWithoutFill([], "battleConcentration"));
    }
  }
  return nonEmptyRouteEvents(route);
}

function sourceDamageBreakCharmedRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "spellTargetList" && result.tag === "needsHoles") {
    return [
      {
        kind: "resolveBattleSubject",
        subject: "protectionCharmActiveEffect",
        fill: "targetChoice",
        holes: battleReducerRouteHoles(result.holes),
        owner: "battleTargetSelection",
      },
    ];
  }
  if (routeFill !== "savingThrowOutcome" || result.tag === "invalid") {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [
    {
      kind: "resolveBattleSubject",
      subject: "protectionCharmActiveEffect",
      fill: "savingThrowOutcome",
      holes,
      owner: "battleSavingThrowOutcome",
    },
  ];
  if (result.tag === "resolved") {
    if (
      combatantConditionsChanged(input.state, result.state) ||
      charmedConditionPreventedByCreatureTypeProtection(input)
    ) {
      route.push(
        protectionCharmResolveWithoutFill([], "battleConditionLifecycle"),
      );
    }
    if (combatantsActiveEffectsChanged(input.state, result.state)) {
      route.push(protectionCharmResolveWithoutFill([], "battleActiveEffect"));
    }
  }
  return nonEmptyRouteEvents(route);
}

function protectionPreventedCharmedConditionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (
    fill === undefined ||
    battleReducerRouteFill(fill) !== "savingThrowOutcome" ||
    result.tag !== "resolved" ||
    !charmedConditionPreventedByCreatureTypeProtection(input)
  ) {
    return undefined;
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleConditionLifecycle"),
  ];
}

function isCreatureTypeProtectionInvocation(
  invocation: SupportedSpellInvocation | undefined,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "creatureTypeProtection" }
> {
  return invocation?.procedure === "creatureTypeProtection";
}

function isCharmedSaveGatedConditionInvocation(
  invocation: SupportedSpellInvocation | undefined,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedCondition" }
> {
  return (
    invocation?.procedure === "saveGatedCondition" &&
    invocation.targeting.kind === "targetList" &&
    invocation.effect.kind === "fixed" &&
    invocation.effect.condition === "charmed"
  );
}

function isSourceDamageBreakCharmedSaveGatedConditionInvocation(
  invocation: SupportedSpellInvocation | undefined,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedCondition" }
> {
  return (
    isCharmedSaveGatedConditionInvocation(invocation) &&
    invocation.effect.escape?.kind === "targetDamagedByCasterOrAlly"
  );
}

function isProtectionRelevantEffectSaveSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "runtimeCommand" &&
    subject.command === "protectionRelevantEffectSave"
  );
}

function charmedConditionPreventedByCreatureTypeProtection(
  input: BattleResolutionInput,
): boolean {
  if (
    !isCharmedSaveGatedConditionInvocation(
      spellInvocationForRouteSubject(input.state, input.subject),
    )
  ) {
    return false;
  }
  return saveGatedConditionFailedTargetIds(input).some((targetId) => {
    const target = input.state.combatants.get(targetId);
    return (
      target !== undefined &&
      conditionApplicationPreventedByCreatureTypeProtection(
        input.state,
        input.subject.actorId,
        target,
        "charmed",
      )
    );
  });
}

function saveGatedConditionFailedTargetIds(
  input: BattleResolutionInput,
): readonly CombatantId[] {
  const saveFill = input.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  return (
    saveFill?.value.outcomes.flatMap((outcome) =>
      outcome.succeeded ? [] : [outcome.targetId],
    ) ?? []
  );
}

function spellInvocationForRouteSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): SupportedSpellInvocation | undefined {
  if (subject.tag !== "actionSpell" && subject.tag !== "bonusActionSpell") {
    return undefined;
  }
  const actor = state.combatants.get(subject.actorId);
  if (actor === undefined) {
    return undefined;
  }
  return supportedSpellActs(actor, state).find((candidate) =>
    supportedSpellInvocationMatchesRef(candidate, subject.invocation),
  );
}

function protectionCharmDiscover(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: "protectionCharmActiveEffect",
    holes,
    owner,
  };
}

function protectionCharmResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "protectionCharmActiveEffect",
    holes,
    owner,
  };
}

function activeFormLifecycleRouteForDiscoveredAct(
  act: AvailableBattleAct,
): BattleReducerRouteEvent | undefined {
  if (act.subject.tag !== "druidWildShape") {
    return undefined;
  }
  return {
    kind: "discoverBattleActs",
    subject: "activeFormLifecycle",
    holes: battleReducerRouteHoles(act.initialHoles),
    owner: "battleActionEconomy",
  };
}

function activeFormLifecycleRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (input.subject.tag !== "druidWildShape" || result.tag !== "resolved") {
    return undefined;
  }
  if (input.subject.action === "dismiss") {
    return activeFormLifecycleResolveWithoutFillRoute(
      "battleActionEconomy",
      "battleActiveEffect",
      "battleCreatureState",
      "battleMovementResource",
    );
  }

  const fill = input.fills.at(-1);
  if (
    fill === undefined ||
    battleReducerRouteFill(fill) !== "wildShapeEquipmentDisposition"
  ) {
    return undefined;
  }
  return [
    {
      kind: "resolveBattleSubject",
      subject: "activeFormLifecycle",
      fill: "wildShapeEquipmentDisposition",
      holes: [],
      owner: "battleActionEconomy",
    },
    ...activeFormLifecycleResolveWithoutFillRoute(
      "battleFeatureResource",
      "battleTemporaryHitPoint",
      "battleActiveEffect",
      "battleCreatureState",
      "battleMovementResource",
    ),
  ];
}

function activeFormLifecycleTurnBoundaryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject) || result.tag !== "resolved") {
    return undefined;
  }
  const nextActor = result.state.combatants.get(currentActorId(result.state));
  if (activeDruidWildShapeEffect(nextActor) === null) {
    return undefined;
  }
  return [
    {
      kind: "discoverBattleActs",
      subject: "activeFormLifecycle",
      holes: [],
      owner: "battleTurnBoundary",
    },
    ...activeFormLifecycleResolveWithoutFillRoute(
      "battleTurnBoundary",
      "battleActionEconomy",
    ),
  ];
}

function activeFormLifecycleTerminalRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "resolved") {
    return undefined;
  }
  for (const [combatantId, before] of input.state.combatants) {
    if (activeDruidWildShapeEffect(before) === null) {
      continue;
    }
    const after = result.state.combatants.get(combatantId);
    if (after === undefined || activeDruidWildShapeEffect(after) !== null) {
      continue;
    }
    if (zeroHpLifecycleIsTerminal(after)) {
      return [
        {
          kind: "discoverBattleActs",
          subject: "activeFormLifecycle",
          holes: [],
          owner: "battleHitPointAndZeroHpLifecycle",
        },
        ...activeFormLifecycleResolveWithoutFillRoute(
          "battleHitPointAndZeroHpLifecycle",
          "battleActiveEffect",
          "battleCreatureState",
          "battleMovementResource",
        ),
      ];
    }
    if (isIncapacitated(after.conditions)) {
      return [
        {
          kind: "discoverBattleActs",
          subject: "activeFormLifecycle",
          holes: [],
          owner: "battleConditionLifecycle",
        },
        ...activeFormLifecycleResolveWithoutFillRoute(
          "battleConditionLifecycle",
          "battleActiveEffect",
          "battleCreatureState",
          "battleMovementResource",
        ),
      ];
    }
  }
  return undefined;
}

function activeFormLifecycleResolveWithoutFillRoute(
  owner: BattleReducerRouteOwnerGroup,
  ...owners: readonly BattleReducerRouteOwnerGroup[]
): BattleReducerRouteEvents {
  const eventForOwner = (
    routeOwner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent => ({
    kind: "resolveBattleSubjectWithoutFill",
    subject: "activeFormLifecycle",
    holes: [],
    owner: routeOwner,
  });
  return [eventForOwner(owner), ...owners.map(eventForOwner)];
}

function scalarBuffRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isScalarBuffEffectSubject(input.subject)) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = scalarBuffRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }

  if (result.tag === "invalid") {
    return result.reason === "staleSubject"
      ? [
          {
            kind: "resolveBattleSubject",
            subject: "scalarBuffEffect",
            fill: routeFill,
            holes: [],
            owner: "battleHoleFrontier",
          },
        ]
      : undefined;
  }
  if (result.tag !== "resolved") {
    return undefined;
  }

  return nonEmptyRouteEvents(
    scalarBuffResolveOwners(
      input.state,
      result.state,
      input.subject.actorId,
    ).map((owner) => scalarBuffResolveWithoutFill([], owner)),
  );
}

function scalarBuffRouteFill(
  fill: BattleFill,
):
  | Extract<
      BattleReducerRouteFill,
      "targetChoice" | "spellTargetList" | "rolledDice"
    >
  | undefined {
  const routeFill = battleReducerRouteFill(fill);
  if (
    routeFill === "targetChoice" ||
    routeFill === "spellTargetList" ||
    routeFill === "rolledDice"
  ) {
    return routeFill;
  }
  return undefined;
}

function scalarBuffResolveOwners(
  before: BattleState,
  after: BattleState,
  actorId: CombatantId,
): readonly BattleReducerRouteOwnerGroup[] {
  if (combatantTemporaryHitPointsIncreased(before, after)) {
    return ["battleTemporaryHitPoint"];
  }

  const addedEffectKinds = scalarBuffAddedActiveEffectKinds(before, after);
  const activeEffectOwners: readonly BattleReducerRouteOwnerGroup[] =
    addedEffectKinds.size > 0 ? ["battleActiveEffect"] : [];
  const projectionOwners: readonly BattleReducerRouteOwnerGroup[] =
    addedEffectKinds.has("speedDelta") ||
    addedEffectKinds.has("specialSpeedGrant")
      ? ["battleMovementResource"]
      : [];
  const hitPointOwners: readonly BattleReducerRouteOwnerGroup[] =
    addedEffectKinds.has("hitPointMaximumIncrease") ? ["battleHitPoint"] : [];
  const concentrationOwners: readonly BattleReducerRouteOwnerGroup[] =
    combatantConcentrationChanged(before, after, actorId)
      ? ["battleConcentration"]
      : [];
  return [
    ...activeEffectOwners,
    ...projectionOwners,
    ...hitPointOwners,
    ...concentrationOwners,
  ];
}

function nonEmptyRouteEvents(
  events: readonly BattleReducerRouteEvent[],
): BattleReducerRouteEvents | undefined {
  const [first, ...rest] = events;
  return first === undefined ? undefined : [first, ...rest];
}

function composeWithActiveFormLifecycleTerminalRoute(
  route: BattleReducerRouteEvents | undefined,
  activeFormLifecycleTerminalRoute: BattleReducerRouteEvents | undefined,
): BattleReducerRouteEvents | undefined {
  if (route === undefined) {
    return activeFormLifecycleTerminalRoute;
  }
  if (activeFormLifecycleTerminalRoute === undefined) {
    return route;
  }
  const [first, ...rest] = route;
  return [first, ...rest, ...activeFormLifecycleTerminalRoute];
}

function combatantTemporaryHitPointsIncreased(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      Number(combatant.tempHp) >
      Number(before.combatants.get(combatant.combatantId)?.tempHp ?? 0),
  );
}

function scalarBuffAddedActiveEffectKinds(
  before: BattleState,
  after: BattleState,
): ReadonlySet<BattleActiveEffect["kind"]> {
  const added = new Set<BattleActiveEffect["kind"]>();
  for (const combatant of after.combatants.values()) {
    const beforeCounts = activeEffectKindCounts(
      before.combatants.get(combatant.combatantId)?.activeEffects ?? [],
    );
    const afterCounts = activeEffectKindCounts(combatant.activeEffects);
    for (const [kind, count] of afterCounts) {
      if (count > (beforeCounts.get(kind) ?? 0)) {
        added.add(kind);
      }
    }
  }
  return added;
}

function activeEffectKindCounts(
  activeEffects: readonly BattleActiveEffect[],
): ReadonlyMap<BattleActiveEffect["kind"], number> {
  const counts = new Map<BattleActiveEffect["kind"], number>();
  for (const effect of activeEffects) {
    counts.set(effect.kind, (counts.get(effect.kind) ?? 0) + 1);
  }
  return counts;
}

function combatantConcentrationChanged(
  before: BattleState,
  after: BattleState,
  combatantId: CombatantId,
): boolean {
  return (
    before.combatants.get(combatantId)?.concentration !==
    after.combatants.get(combatantId)?.concentration
  );
}

function scalarBuffResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "scalarBuffEffect",
    holes,
    owner,
  };
}

export function findFamiliarCompanionLifecycleRouteEvents(): BattleReducerRouteEvents {
  return [
    {
      kind: "discoverBattleActs",
      subject: "companionLifecycle",
      holes: [],
      owner: "battleCompanion",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "companionLifecycle",
      holes: [],
      owner: "battleCompanion",
    },
  ];
}

function companionRouteForDiscoveredAct(
  act: AvailableBattleAct,
): BattleReducerRouteEvent | undefined {
  if (act.subject.tag === "companionLifecycle") {
    return {
      kind: "discoverBattleActs",
      subject: "companionLifecycle",
      holes: battleReducerRouteHoles(act.initialHoles),
      owner: "battleCompanion",
    };
  }
  if (act.subject.tag === "findFamiliarSharedSenses") {
    return {
      kind: "discoverBattleActs",
      subject: "companionSharedSenses",
      holes: battleReducerRouteHoles(act.initialHoles),
      owner: "battleCompanion",
    };
  }
  if (act.subject.tag === "findFamiliarTouchSpell") {
    return {
      kind: "discoverBattleActs",
      subject: "companionTouchDelivery",
      holes: battleReducerRouteHoles(act.initialHoles),
      owner: "battleSpellSlotAndActionEconomy",
    };
  }
  if (act.subject.tag === "pactOfTheChainFamiliarAttack") {
    return {
      kind: "discoverBattleActs",
      subject: "companionReactionAttack",
      holes: battleReducerRouteHoles(act.initialHoles),
      owner: "battleCompanion",
    };
  }
  return undefined;
}

function companionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag === "invalid") {
    return undefined;
  }
  if (input.subject.tag === "companionLifecycle") {
    return [
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "companionLifecycle",
        holes:
          result.tag === "needsHoles"
            ? battleReducerRouteHoles(result.holes)
            : [],
        owner: "battleCompanion",
      },
    ];
  }
  if (input.subject.tag === "findFamiliarSharedSenses") {
    return result.tag === "resolved"
      ? [
          {
            kind: "resolveBattleSubjectWithoutFill",
            subject: "companionSharedSenses",
            holes: [],
            owner: "battleActionEconomy",
          },
          {
            kind: "resolveBattleSubjectWithoutFill",
            subject: "companionSharedSenses",
            holes: [],
            owner: "battleActiveEffect",
          },
        ]
      : undefined;
  }
  if (input.subject.tag === "findFamiliarTouchSpell") {
    return findFamiliarTouchDeliveryRouteForResolution(input, result);
  }
  if (input.subject.tag === "pactOfTheChainFamiliarAttack") {
    return pactFamiliarReactionAttackRouteForResolution(input, result);
  }
  return undefined;
}

function findFamiliarTouchDeliveryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "targetChoice" && routeFill !== "rolledDice") {
    return undefined;
  }
  const event: BattleReducerRouteEvent = {
    kind: "resolveBattleSubject",
    subject: "companionTouchDelivery",
    fill: routeFill,
    holes:
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    owner:
      routeFill === "targetChoice"
        ? "battleCompanion"
        : "battleSpellSlotAndActionEconomy",
  };
  return routeFill === "rolledDice" && result.tag === "resolved"
    ? [
        event,
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "companionTouchDelivery",
          holes: [],
          owner: "battleActionEconomy",
        },
      ]
    : [event];
}

function pactFamiliarReactionAttackRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return [
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "companionReactionAttack",
        holes:
          result.tag === "needsHoles"
            ? battleReducerRouteHoles(result.holes)
            : [],
        owner: "battleStatBlockAction",
      },
    ];
  }
  const routeFill = battleReducerRouteFill(fill);
  if (
    routeFill !== "targetChoice" &&
    routeFill !== "attackRoll" &&
    routeFill !== "rolledDice"
  ) {
    return undefined;
  }
  const event: BattleReducerRouteEvent = {
    kind: "resolveBattleSubject",
    subject: "companionReactionAttack",
    fill: routeFill,
    holes:
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    owner:
      routeFill === "targetChoice"
        ? "battleTargetSelection"
        : routeFill === "attackRoll"
          ? "battleAttackRoll"
          : "battleHitPoint",
  };
  return routeFill === "rolledDice" && result.tag === "resolved"
    ? [
        event,
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "companionReactionAttack",
          holes: [],
          owner: "battleActionEconomy",
        },
      ]
    : [event];
}

function sleepRepeatSaveRouteForDiscoveredAct(
  act: AvailableBattleAct,
): BattleReducerRouteEvent | undefined {
  if (!isSleepTargetAdmissionSubject(act.subject)) {
    return undefined;
  }
  return {
    kind: "discoverBattleActs",
    subject: "repeatSaveConditionEffect",
    holes: sleepTargetAdmissionRouteHoles(act.initialHoles),
    owner: "battleSpellSlotAndActionEconomy",
  };
}

function sleepRepeatSaveRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const endConcentrationRoute = sleepRepeatSaveConcentrationBreakRoute(
    input,
    result,
  );
  if (endConcentrationRoute !== undefined) {
    return endConcentrationRoute;
  }

  const turnBoundaryRoute = sleepRepeatSaveTurnBoundaryRoute(input, result);
  if (turnBoundaryRoute !== undefined) {
    return turnBoundaryRoute;
  }

  if (!isSleepTargetAdmissionSubject(input.subject)) {
    return undefined;
  }
  if (result.tag !== "resolved") {
    return undefined;
  }
  const fill = sleepRepeatSaveSavingThrowFill(input.fills);
  if (fill === undefined) {
    return undefined;
  }
  return sleepRepeatSaveResolvedRoutes({
    before: input.state,
    after: result.state,
    fill: "savingThrowOutcome",
    includeActiveEffectTransition: false,
    sourceCombatantId: input.subject.actorId,
  });
}

function repeatSaveConditionEffectRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  if (input.fills.length === 0) {
    if (result.tag !== "needsHoles") {
      return undefined;
    }
    const holes = repeatSaveConditionEffectRouteHoles(result.holes);
    if (holes.length === 0) {
      return undefined;
    }
    return [
      {
        kind: "discoverBattleActs",
        subject: "repeatSaveConditionEffect",
        holes,
        owner: "battleTurnBoundary",
      },
    ];
  }
  if (
    result.tag !== "resolved" ||
    !fillsIncludeRepeatSaveConditionEffect(input)
  ) {
    return undefined;
  }
  return nonEmptyRouteEvents([
    ...(combatantConditionsChanged(input.state, result.state)
      ? [
          {
            kind: "resolveBattleSubject" as const,
            subject: "repeatSaveConditionEffect" as const,
            fill: "savingThrowOutcome" as const,
            holes: [],
            owner: "battleConditionLifecycle" as const,
          },
        ]
      : []),
    ...(combatantsActiveEffectsChanged(input.state, result.state)
      ? [
          {
            kind: "resolveBattleSubjectWithoutFill" as const,
            subject: "repeatSaveConditionEffect" as const,
            holes: [],
            owner: "battleActiveEffect" as const,
          },
        ]
      : []),
    ...(combatantsConcentrationChanged(input.state, result.state)
      ? [
          {
            kind: "resolveBattleSubjectWithoutFill" as const,
            subject: "repeatSaveConditionEffect" as const,
            holes: [],
            owner: "battleConcentration" as const,
          },
        ]
      : []),
  ]);
}

function fillsIncludeRepeatSaveConditionEffect(
  input: BattleResolutionInput,
): boolean {
  if (!isEndTurnSubject(input.subject)) {
    return false;
  }
  const repeatSaveHoleIds = conditionSpellEndTurnRepeatSaveHoleIds(
    input.state,
    input.subject.actorId,
  );
  return input.fills.some(
    (fill) =>
      fill.kind === "savingThrowOutcome" && repeatSaveHoleIds.has(fill.holeId),
  );
}

function repeatSaveConditionEffectRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(holes.filter(isRepeatSaveConditionEffectHole));
}

function isRepeatSaveConditionEffectHole(hole: BattleHole): boolean {
  return (
    "spellConditionEndTurnSave" in hole || "hideousLaughterRepeatSave" in hole
  );
}

function sleepRepeatSaveConcentrationBreakRoute(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "endConcentration" ||
    !combatantOwnsSleepRepeatSaveEffect(input.state, input.subject.actorId)
  ) {
    return undefined;
  }
  return nonEmptyRouteEvents([
    sleepRepeatSaveResolveWithoutFill([], "battleConcentration"),
    sleepRepeatSaveResolveWithoutFill([], "battleActiveEffect"),
    ...sleepRepeatSaveConditionCleanupRoutes(input.state, result.state),
  ]);
}

function sleepRepeatSaveTurnBoundaryRoute(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  const fill = sleepRepeatSaveEndTurnSavingThrowFill(input);
  if (fill === undefined) {
    if (result.tag === "needsHoles") {
      const holes = sleepRepeatSaveRouteHoles(result.holes);
      return holes.length === 0
        ? undefined
        : [
            {
              kind: "discoverBattleActs",
              subject: "repeatSaveConditionEffect",
              holes,
              owner: "battleTurnBoundary",
            },
          ];
    }
    if (
      result.tag === "resolved" &&
      hasPendingSleepRepeatSaveEffect(input.state)
    ) {
      return [sleepRepeatSaveResolveWithoutFill([], "battleTurnBoundary")];
    }
    return undefined;
  }
  if (
    result.tag !== "resolved" ||
    !hasPendingSleepRepeatSaveEffect(input.state)
  ) {
    return undefined;
  }
  return sleepRepeatSaveResolvedRoutes({
    before: input.state,
    after: result.state,
    fill: "savingThrowOutcome",
    includeActiveEffectTransition: false,
    sourceCombatantId: fill.value.outcomes[0]?.targetId,
  });
}

function sleepRepeatSaveEndTurnSavingThrowFill(
  input: BattleResolutionInput,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  const holeIds = sleepRepeatSaveSavingThrowHoleIds(
    input.state,
    input.subject.actorId,
  );
  return input.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && holeIds.has(fill.holeId),
  );
}

function sleepRepeatSaveResolvedRoutes(input: {
  readonly before: BattleState;
  readonly after: BattleState;
  readonly fill: Extract<BattleReducerRouteFill, "savingThrowOutcome">;
  readonly includeActiveEffectTransition: boolean;
  readonly sourceCombatantId: CombatantId | undefined;
}): BattleReducerRouteEvents | undefined {
  const conditionRoutes = combatantConditionsChanged(input.before, input.after)
    ? [
        {
          kind: "resolveBattleSubject" as const,
          subject: "repeatSaveConditionEffect" as const,
          fill: input.fill,
          holes: [],
          owner: "battleConditionLifecycle" as const,
        },
      ]
    : [];
  const activeEffectRoutes =
    input.includeActiveEffectTransition ||
    sleepRepeatSaveEffectCount(input.after) !==
      sleepRepeatSaveEffectCount(input.before)
      ? [sleepRepeatSaveResolveWithoutFill([], "battleActiveEffect")]
      : [];
  const concentrationRoutes =
    input.sourceCombatantId !== undefined &&
    combatantConcentrationChanged(
      input.before,
      input.after,
      input.sourceCombatantId,
    )
      ? [sleepRepeatSaveResolveWithoutFill([], "battleConcentration")]
      : [];
  return nonEmptyRouteEvents([
    ...conditionRoutes,
    ...activeEffectRoutes,
    ...concentrationRoutes,
  ]);
}

function sleepRepeatSaveConditionCleanupRoutes(
  before: BattleState,
  after: BattleState,
): readonly BattleReducerRouteEvent[] {
  return combatantConditionsChanged(before, after)
    ? [sleepRepeatSaveResolveWithoutFill([], "battleConditionLifecycle")]
    : [];
}

function sleepRepeatSaveResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "repeatSaveConditionEffect",
    holes,
    owner,
  };
}

function turnBoundaryEffectLifecycleRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  if (!battleHasTurnBoundaryLifecycleEffects(input.state)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  const holes =
    result.tag === "needsHoles"
      ? turnBoundaryEffectLifecycleRouteHoles(result.holes)
      : [];
  if (fill === undefined) {
    const discovery = turnBoundaryEffectLifecycleDiscoveryRouteForResolution(
      input,
      result,
    );
    return discovery === undefined ? undefined : [discovery];
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "rolledDice") {
    const hitPointRoute: BattleReducerRouteEvent = {
      kind: "resolveBattleSubject",
      subject: "turnBoundaryEffectLifecycle",
      fill: routeFill,
      holes,
      owner: "battleHitPoint",
    };
    const concentrationRoute =
      turnBoundaryEffectLifecycleConcentrationRouteForResolution(
        routeFill,
        result,
      );
    return result.tag === "resolved" && holes.length === 0
      ? [
          hitPointRoute,
          turnBoundaryEffectLifecycleResolveWithoutFill("battleActiveEffect"),
          turnBoundaryEffectLifecycleResolveWithoutFill("battleTurnBoundary"),
        ]
      : nonEmptyRouteEvents([
          hitPointRoute,
          ...(concentrationRoute === undefined ? [] : [concentrationRoute]),
        ]);
  }
  if (routeFill === "savingThrowOutcome") {
    if (
      fill.kind !== "savingThrowOutcome" ||
      !isTurnBoundaryEffectLifecycleSavingThrowFill(input.state, fill)
    ) {
      return undefined;
    }
    return [
      {
        kind: "resolveBattleSubject",
        subject: "turnBoundaryEffectLifecycle",
        fill: routeFill,
        holes,
        owner: "battleActiveEffect",
      },
    ];
  }
  return undefined;
}

function afterHitDamageRiderTurnBoundaryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  if (!battleHasAfterHitTurnBoundaryEffects(input.state)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }

  const fill = input.fills.at(-1);
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  if (fill === undefined) {
    return holes.length === 0
      ? undefined
      : [afterHitDamageRiderDiscoverRoute(holes, "battleActiveEffect")];
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "rolledDice") {
    const nextHoles =
      result.tag === "resolved" &&
      battleHasAfterHitEscapeAbilityCheck(result.state)
        ? (["abilityCheck"] as const)
        : holes;
    return [
      afterHitDamageRiderResolveRoute(routeFill, nextHoles, "battleHitPoint"),
    ];
  }
  if (routeFill === "savingThrowOutcome") {
    return [
      afterHitDamageRiderResolveRoute(
        "rolledDice",
        ["savingThrowOutcome"],
        "battleHitPoint",
      ),
      afterHitDamageRiderResolveRoute(routeFill, holes, "battleActiveEffect"),
    ];
  }
  return undefined;
}

function turnBoundaryEffectLifecycleConcentrationRouteForResolution(
  fill: BattleReducerRouteFill,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = concentrationSavingThrowRouteHoles(result.holes);
  if (holes.length === 0) {
    return undefined;
  }
  return {
    kind: "resolveBattleSubject",
    subject: "concentrationTeardown",
    fill,
    holes,
    owner: "battleConcentration",
  };
}

function turnBoundaryEffectLifecycleDiscoveryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  if (!battleHasTurnBoundaryLifecycleEffects(input.state)) {
    return undefined;
  }
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = turnBoundaryEffectLifecycleRouteHoles(result.holes);
  if (holes.length === 0) {
    return undefined;
  }
  return {
    kind: "discoverBattleActs",
    subject: "turnBoundaryEffectLifecycle",
    holes,
    owner: "battleTurnBoundary",
  };
}

function turnBoundaryEffectLifecycleResolveWithoutFill(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "turnBoundaryEffectLifecycle",
    holes: [],
    owner,
  };
}

function battleHasTurnBoundaryLifecycleEffects(state: BattleState): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(isTurnBoundaryLifecycleEffect),
  );
}

function battleHasAfterHitTurnBoundaryEffects(state: BattleState): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(isAfterHitTurnBoundaryEffect),
  );
}

function battleHasAfterHitEscapeAbilityCheck(state: BattleState): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "spellCondition" &&
        effect.escape?.kind === "abilityCheck",
    ),
  );
}

function isTurnBoundaryLifecycleEffect(effect: BattleActiveEffect): boolean {
  return (
    effect.kind === "spellTurnStartDamageAndSave" ||
    effect.kind === "spellTurnEndDamage" ||
    (effect.kind === "spellCondition" && effect.turnStartDamage !== null)
  );
}

function isAfterHitTurnBoundaryEffect(effect: BattleActiveEffect): boolean {
  return (
    (effect.kind === "spellTurnStartDamageAndSave" &&
      effect.source === "afterHitTimedDamageAndSave") ||
    (effect.kind === "spellCondition" && effect.turnStartDamage !== null)
  );
}

function isTurnBoundaryEffectLifecycleSavingThrowFill(
  state: BattleState,
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "spellTurnStartDamageAndSave" &&
        fill.holeId ===
          spellTurnStartSavingThrowOutcomeHoleId(combatant.combatantId, effect),
    ),
  );
}

function turnBoundaryEffectLifecycleRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter(isTurnBoundaryEffectLifecycleHole),
  );
}

function concentrationSavingThrowRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter((hole) => hole.kind === "concentrationSavingThrow"),
  );
}

function isTurnBoundaryEffectLifecycleHole(hole: BattleHole): boolean {
  return (
    (hole.kind === "rolledDice" &&
      ("spellTurnStartDamage" in hole || "spellTurnEndDamage" in hole)) ||
    (hole.kind === "savingThrowOutcome" && "spellTurnStartSave" in hole)
  );
}

function sleepRepeatSaveSavingThrowFill(
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
}

function sleepRepeatSaveRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter(
      (hole) => hole.kind === "savingThrowOutcome" && "sleepRepeatSave" in hole,
    ),
  );
}

function sleepTargetAdmissionRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter(
      (hole) =>
        hole.kind === "savingThrowOutcome" &&
        "spell" in hole &&
        hole.spell.procedure === "sleepTargetAdmission",
    ),
  );
}

function hasPendingSleepRepeatSaveEffect(state: BattleState): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) => effect.kind === "sleepPendingRepeatSave",
    ),
  );
}

function combatantOwnsSleepRepeatSaveEffect(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        (effect.kind === "sleepPendingRepeatSave" ||
          effect.kind === "sleepUnconscious") &&
        effect.expiresAt.combatantId === combatantId,
    ),
  );
}

function sleepRepeatSaveEffectCount(state: BattleState): number {
  return [...state.combatants.values()].reduce(
    (count, combatant) =>
      count +
      combatant.activeEffects.filter(
        (effect) =>
          effect.kind === "sleepPendingRepeatSave" ||
          effect.kind === "sleepUnconscious",
      ).length,
    0,
  );
}

function combatantConditionsChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some((combatant) => {
    const beforeConditions = before.combatants.get(
      combatant.combatantId,
    )?.conditions;
    return (
      beforeConditions !== undefined &&
      !sameBooleanRecord(beforeConditions, combatant.conditions)
    );
  });
}

type ComparableConditionState = {
  readonly blinded: boolean;
  readonly charmed: boolean;
  readonly deafened: boolean;
  readonly frightened: boolean;
  readonly grappled: boolean;
  readonly invisible: boolean;
  readonly paralyzed: boolean;
  readonly petrified: boolean;
  readonly poisoned: boolean;
  readonly prone: boolean;
  readonly restrained: boolean;
  readonly stunned: boolean;
  readonly unconscious: boolean;
  readonly directIncapacitated: boolean;
};

const CONDITION_STATE_KEYS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "directIncapacitated",
] as const satisfies ReadonlyArray<keyof ComparableConditionState>;

function sameBooleanRecord(
  left: ComparableConditionState,
  right: ComparableConditionState,
): boolean {
  return CONDITION_STATE_KEYS.every((key) => left[key] === right[key]);
}

function hasConcentratingRollModifierEffect(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        (effect.kind === "d20RollModifier" ||
          effect.kind === "abilityCheckRollMode") &&
        effect.expiresAt.kind === "concentration" &&
        effect.expiresAt.combatantId === combatantId,
    ),
  );
}

function rollModifierRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return [...new Set(holes.flatMap(rollModifierRouteHole))].sort();
}

function rollModifierRouteHole(
  hole: BattleHole,
): readonly BattleReducerRouteHole[] {
  const family = battleHoleFamilyKind(hole);
  if (family === "abilityChoice") return ["abilityChoice"];
  if (family === "savingThrowOutcome") return ["savingThrowOutcome"];
  if (family === "skillChoice") return ["skillChoice"];
  if (family === "targetAbilityChoices") return ["targetAbilityChoices"];
  return [];
}

function rollModifierRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  if (fill.kind === "savingThrowOutcome") return "savingThrowOutcome";
  if (fill.kind === "skillChoice") {
    return { kind: "skillChoice", skill: fill.value };
  }
  if (fill.kind === "abilityChoice") {
    return { kind: "abilityChoice", ability: fill.value };
  }
  if (fill.kind === "targetAbilityChoices") {
    const [primary, secondary, third] = fill.value.choices;
    if (
      primary === undefined ||
      secondary === undefined ||
      third !== undefined
    ) {
      return undefined;
    }
    return {
      kind: "targetAbilityChoices",
      choices: {
        primary: primary.ability,
        secondary: secondary.ability,
      },
    };
  }
  return undefined;
}

function weaponAttackRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isWeaponAttackSubject(input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const event = (
    subject: BattleReducerRouteSubjectFamily,
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent => ({
    kind: "resolveBattleSubject",
    subject,
    fill: routeFill,
    holes,
    owner,
  });

  if (weaponMasteryCleaveRouteStarted(input.fills)) {
    return weaponMasteryCleaveRouteForResolution(input, result, event);
  }

  if (routeFill === "targetChoice") {
    return [
      event("weaponAttack", "battleTargetSelection"),
      ...protectionCharmAttackRollModeRouteForResolution(input, result),
    ];
  }
  if (routeFill === "attackRoll") {
    return holes.includes("savingThrowOutcome")
      ? [event("weaponMasteryProperty", "battleConditionLifecycle")]
      : [event("weaponAttack", "battleAttackRoll")];
  }
  if (routeFill === "savingThrowOutcome") {
    return [event("weaponMasteryProperty", "battleConditionLifecycle")];
  }
  if (routeFill !== "rolledDice") {
    return undefined;
  }

  const weaponDamageRoute = event("weaponAttack", "battleHitPoint");
  const routeTail: BattleReducerRouteEvent[] = [];
  if (battleHasAfterHitAttackDamageAddition(input.state)) {
    routeTail.push(event("afterHitDamageRider", "battleHitPoint"));
  }
  routeTail.push(...charmSourceDamageBreakRouteForResolution(input, result));
  if (holes.includes("unitFeatureDecision")) {
    routeTail.push({
      kind: "resolveBattleSubjectWithoutFill",
      subject: "weaponMasteryProperty",
      holes,
      owner: "battleFeatureResource",
    });
  } else if (combatantsActiveEffectsChanged(input.state, result.state)) {
    routeTail.push({
      kind: "resolveBattleSubjectWithoutFill",
      subject: "weaponMasteryProperty",
      holes,
      owner: "battleActiveEffect",
    });
  }
  if (
    input.state.interruptStack.at(-1)?.kind === "replayContinuation" &&
    result.tag === "resolved"
  ) {
    routeTail.push({
      kind: "resolveBattleSubjectWithoutFill",
      subject: "interruptStackResume",
      holes: [],
      owner: "battleInterruptStack",
    });
  }
  return [weaponDamageRoute, ...routeTail];
}

function protectionCharmAttackRollModeRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (result.tag !== "needsHoles") {
    return [];
  }
  const targetFill = input.fills.at(-1);
  if (targetFill?.kind !== "targetChoice") {
    return [];
  }
  const source = input.state.combatants.get(input.subject.actorId);
  const target = input.state.combatants.get(targetFill.value);
  const sourceCreatureType =
    source === undefined ? null : battleCreatureType(source);
  if (
    sourceCreatureType === null ||
    target === undefined ||
    !result.holes.some(
      (hole) => hole.kind === "attackRoll" && hole.rollMode === "disadvantage",
    ) ||
    !target.activeEffects.some(
      (effect) =>
        effect.kind === "creatureTypeProtection" &&
        effect.protectedAgainstCreatureTypes.includes(sourceCreatureType),
    )
  ) {
    return [];
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleAttackRoll"),
  ];
}

function charmSourceDamageBreakRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (
    result.tag !== "resolved" ||
    !targetDamagedByCasterOrAllySpellConditionRemoved(input.state, result.state)
  ) {
    return [];
  }
  return [
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "charmSourceDamageBreak",
      holes: [],
      owner: "battleHitPoint",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "charmSourceDamageBreak",
      holes: [],
      owner: "battleConditionLifecycle",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "charmSourceDamageBreak",
      holes: [],
      owner: "battleActiveEffect",
    },
  ];
}

function targetDamagedByCasterOrAllySpellConditionRemoved(
  before: BattleState,
  after: BattleState,
): boolean {
  for (const beforeCombatant of before.combatants.values()) {
    const afterCombatant = after.combatants.get(beforeCombatant.combatantId);
    if (afterCombatant === undefined) {
      continue;
    }
    const beforeCount = targetDamagedByCasterOrAllySpellConditionCount(
      beforeCombatant.activeEffects,
    );
    const afterCount = targetDamagedByCasterOrAllySpellConditionCount(
      afterCombatant.activeEffects,
    );
    if (afterCount < beforeCount) {
      return true;
    }
  }
  return false;
}

function targetDamagedByCasterOrAllySpellConditionCount(
  activeEffects: readonly BattleActiveEffect[],
): number {
  return activeEffects.filter(
    (effect) =>
      effect.kind === "spellCondition" &&
      effect.condition === "charmed" &&
      effect.escape?.kind === "targetDamagedByCasterOrAlly",
  ).length;
}

function battleHasAfterHitAttackDamageAddition(state: BattleState): boolean {
  const topFrame = state.interruptStack.at(-1);
  const additions =
    topFrame?.kind === "replayContinuation"
      ? topFrame.continuation.attackDamageAdditions
      : topFrame?.kind === "interruptCheckpoint"
        ? topFrame.frame.activeInterrupt?.pendingAttackDamageAdditions
        : undefined;
  return additions?.some(isAfterHitAttackDamageAddition) ?? false;
}

function battleHasSpellHostedWeaponAttackDamageAddition(
  state: BattleState,
): boolean {
  const topFrame = state.interruptStack.at(-1);
  const additions =
    topFrame?.kind === "replayContinuation"
      ? topFrame.continuation.attackDamageAdditions
      : topFrame?.kind === "interruptCheckpoint"
        ? topFrame.frame.activeInterrupt?.pendingAttackDamageAdditions
        : undefined;
  return (
    additions?.some(
      (addition) => addition.sourceProcedure === "spellHostedWeaponAttack",
    ) ?? false
  );
}

function isAfterHitAttackDamageAddition(
  addition: AttackSpellDamageAddition,
): boolean {
  return (
    addition.sourceProcedure === "afterHitDamage" ||
    addition.sourceProcedure === "afterHitTimedDamageAndSave" ||
    addition.sourceProcedure === "afterHitDamageAndIllumination"
  );
}

function battleCombatantHasActiveEffectKind(
  state: BattleState,
  combatantId: CombatantId,
  kind: BattleActiveEffect["kind"],
): boolean {
  return (
    state.combatants
      .get(combatantId)
      ?.activeEffects.some((effect) => effect.kind === kind) ?? false
  );
}

function battleHasWeaponDamageRiderHole(
  result: BattleResolutionResult,
): boolean {
  return battleDamageRollHoles(result).some(
    (hole) => (hole.spellWeaponDamageRiders?.length ?? 0) > 0,
  );
}

function battleDamageRollHoles(
  result: BattleResolutionResult,
): readonly BattleDamageRollHole[] {
  return result.tag !== "needsHoles"
    ? []
    : result.holes.filter(
        (hole): hole is BattleDamageRollHole =>
          hole.kind === "rolledDice" && "attack" in hole,
      );
}

function weaponMasteryCleaveRouteStarted(
  fills: readonly BattleFill[],
): boolean {
  return fills.some((fill) => fill.kind === "unitFeatureDecision");
}

function weaponMasteryCleaveRouteForResolution(
  input: BattleResolutionInput,
  result: Exclude<BattleResolutionResult, { readonly tag: "invalid" }>,
  event: (
    subject: BattleReducerRouteSubjectFamily,
    owner: BattleReducerRouteOwnerGroup,
  ) => BattleReducerRouteEvent,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "unitFeatureDecision") {
    return [event("weaponMasteryProperty", "battleFeatureResource")];
  }
  if (routeFill === "targetChoice") {
    return [event("weaponMasteryProperty", "battleTargetSelection")];
  }
  if (routeFill === "attackRoll") {
    return [event("weaponMasteryProperty", "battleAttackRoll")];
  }
  if (routeFill !== "rolledDice" || result.tag !== "resolved") {
    return undefined;
  }
  return [
    event("weaponMasteryProperty", "battleHitPoint"),
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "weaponMasteryProperty",
      holes: [],
      owner: "battleFeatureResource",
    },
  ];
}

function commandRouteHolesAfter(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteHole[] {
  if (result.tag === "needsHoles") {
    return battleReducerRouteHoles(result.holes);
  }
  if (
    result.tag === "invalid" &&
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "commandFlee" &&
    input.fills.at(-1)?.kind === "movement"
  ) {
    return ["movement"];
  }
  return [];
}

function commandRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  const kind = battleFillKind(fill);
  if (kind === "commandOptionChoice") return "commandOptionChoice";
  if (kind === "movement") return "movement";
  if (kind === "savingThrowOutcome") return "savingThrowOutcome";
  if (kind === "spellTargetList") return "spellTargetList";
  return undefined;
}

function isSpellAttackProcedure(procedure: string): boolean {
  return (
    procedure === "chainedSpellAttackDamage" ||
    procedure === "spellAttackDamage" ||
    procedure === "spellAttackSequence"
  );
}

function isQuickenedBonusActionCastingTimeSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "bonusActionSpell" }
> {
  return (
    subject.tag === "bonusActionSpell" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isBonusActionSpellWithMetamagicSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "bonusActionSpell" }
> {
  return subject.tag === "bonusActionSpell" && subject.metamagic !== undefined;
}

function isSlotSpellDiscoverySubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return isSlotSpellResolutionSubject(subject);
}

function isSlotSpellResolutionSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    subject.invocation.tag === "spellSlot" &&
    subject.invocation.procedure === "repeatedDamageAllocation"
  );
}

function isSaveGatedSpellResolution(input: BattleResolutionInput): boolean {
  if (input.subject.tag === "actionSpell") {
    return isSaveGatedSpellProcedure(input.subject.invocation.procedure);
  }
  if (
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "releaseReadiedSpell"
  ) {
    const readied = input.state.readiedSpells.get(
      input.subject.readiedSpellCasterId,
    );
    return (
      readied !== undefined &&
      isSaveGatedSpellProcedure(readied.invocation.procedure)
    );
  }
  return false;
}

function isSaveGatedSpellProcedure(procedure: string): boolean {
  return (
    procedure === "hypnoticPattern" ||
    procedure === "saveGatedDamage" ||
    procedure === "saveGatedCondition"
  );
}

function isRollModifierEffectDiscoverySubject(
  subject: AvailableBattleAct["subject"],
): subject is Extract<
  AvailableBattleAct["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    (subject.invocation.procedure === "rollModifier" ||
      subject.invocation.procedure === "thaumaturgyBoomingVoice")
  );
}

function isRollModifierEffectResolutionSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    (subject.invocation.procedure === "rollModifier" ||
      subject.invocation.procedure === "thaumaturgyBoomingVoice")
  );
}

function isScalarBuffEffectSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" | "bonusActionSpell" }
> {
  return (
    (subject.tag === "actionSpell" || subject.tag === "bonusActionSpell") &&
    subject.invocation.procedure === "scalarBuff"
  );
}

function isSleepTargetAdmissionSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    subject.invocation.procedure === "sleepTargetAdmission"
  );
}

function isWeaponAttackSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "action"; readonly action: "attack" }
> {
  return subject.tag === "action" && subject.action === "attack";
}

function isCommandEffectSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return subject.invocation.procedure === "command";
  }
  if (subject.tag !== "runtimeCommand") {
    return false;
  }
  return (
    isCommandPendingRuntimeSubject(subject) || subject.command === "endTurn"
  );
}

function isEndTurnSubject(subject: BattleResolutionInput["subject"]): boolean {
  return subject.tag === "runtimeCommand" && subject.command === "endTurn";
}

function isConcentrationTeardownSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return subject.invocation.procedure === "blurAttackRollDefense";
  }
  if (subject.tag === "action" && subject.action === "attack") {
    return true;
  }
  return (
    subject.tag === "runtimeCommand" && subject.command === "endConcentration"
  );
}

function isConcentrationTeardownDiscoverySubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return subject.invocation.procedure === "blurAttackRollDefense";
  }
  return (
    subject.tag === "runtimeCommand" && subject.command === "endConcentration"
  );
}

function isCommandEffectDiscoverySubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return subject.invocation.procedure === "command";
  }
  if (subject.tag !== "runtimeCommand") {
    return false;
  }
  return isCommandPendingRuntimeSubject(subject);
}

function isHitPointRestorationSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell" || subject.tag === "bonusActionSpell") {
    return subject.invocation.procedure === "directHitPointRestoration";
  }
  return false;
}

function isHitPointRestorationResolution(
  subject: BattleResolutionInput["subject"],
  fill: BattleFill,
): boolean {
  if (isHitPointRestorationSubject(subject)) {
    return true;
  }
  return (
    subject.tag === "unitFeature" && fill.kind === "hitPointHealingDistribution"
  );
}

function isHitPointRestorationDiscoverySubject(
  act: AvailableBattleAct,
): boolean {
  if (isHitPointRestorationSubject(act.subject)) {
    return act.initialHoles.some(
      (hole) =>
        battleReducerRouteHole(hole).includes("targetChoice") ||
        battleReducerRouteHole(hole).includes("spellTargetList"),
    );
  }
  return (
    act.subject.tag === "unitFeature" &&
    act.initialHoles.some((hole) =>
      battleReducerRouteHole(hole).includes("hitPointHealingDistribution"),
    )
  );
}

function hitPointRestorationDiscoveryOwner(
  subject: BattleResolutionInput["subject"],
): BattleReducerRouteOwnerGroup {
  return subject.tag === "actionSpell" || subject.tag === "bonusActionSpell"
    ? "battleSpellSlotAndActionEconomy"
    : "battleActionEconomy";
}

function isCommandPendingRuntimeSubject(
  subject: Extract<
    BattleResolutionInput["subject"],
    { readonly tag: "runtimeCommand" }
  >,
): boolean {
  return (
    subject.command === "commandGrovel" ||
    subject.command === "commandDrop" ||
    subject.command === "commandApproach" ||
    subject.command === "commandFlee"
  );
}

function battleReducerRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return [...new Set(holes.flatMap(battleReducerRouteHole))].sort();
}

function battleReducerRouteHole(
  hole: BattleHole,
): readonly BattleReducerRouteHole[] {
  const family = battleHoleFamilyKind(hole);
  if (family === "abilityCheck") return ["abilityCheck"];
  if (family === "abilityChoice") return ["abilityChoice"];
  if (family === "attackRoll") return ["attackRoll"];
  if (family === "commandOptionChoice") return ["commandOptionChoice"];
  if (family === "concentrationSavingThrow") {
    return ["concentrationSavingThrow"];
  }
  if (family === "damageTypeChoice") return ["damageTypeChoice"];
  if (family === "deathSavingThrow") return ["deathSavingThrow"];
  if (family === "hitPointHealingDistribution") {
    return ["hitPointHealingDistribution"];
  }
  if (family === "interruptDecision") return ["interruptDecision"];
  if (family === "movement") return ["movement"];
  if (family === "objectTargetChoice") return ["targetChoice"];
  if (family === "rolledDice") return ["rolledDice"];
  if (family === "savingThrowOutcome") return ["savingThrowOutcome"];
  if (family === "spellTargetAllocation") return ["spellTargetAllocation"];
  if (family === "spellTargetList") return ["spellTargetList"];
  if (family === "targetChoice") return ["targetChoice"];
  if (family === "unitFeatureDecision") return ["unitFeatureDecision"];
  if (family === "wildShapeEquipmentDisposition") {
    return ["wildShapeEquipmentDisposition"];
  }
  return [];
}

function battleReducerRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  const kind = battleFillKind(fill);
  if (kind === "abilityCheck") return "abilityCheck";
  if (fill.kind === "abilityChoice") {
    return { kind: "abilityChoice", ability: fill.value };
  }
  if (kind === "attackRoll") return "attackRoll";
  if (kind === "concentrationSavingThrow") return "concentrationSavingThrow";
  if (kind === "damageTypeChoice") return "damageTypeChoice";
  if (kind === "deathSavingThrow") return "deathSavingThrow";
  if (kind === "hitPointHealingDistribution") {
    return "hitPointHealingDistribution";
  }
  if (kind === "interruptDecision") return "interruptDecision";
  if (kind === "movement") return "movement";
  if (kind === "objectTargetChoice") return "targetChoice";
  if (kind === "rolledDice") return "rolledDice";
  if (kind === "savingThrowOutcome") return "savingThrowOutcome";
  if (kind === "spellTargetAllocation") return "spellTargetAllocation";
  if (kind === "spellTargetList") return "spellTargetList";
  if (kind === "targetChoice") return "targetChoice";
  if (kind === "unitFeatureDecision") return "unitFeatureDecision";
  if (kind === "wildShapeEquipmentDisposition") {
    return "wildShapeEquipmentDisposition";
  }
  return undefined;
}

function spellAttackProcedureRouteOwners(input: {
  input: BattleResolutionInput;
  fill: BattleFill;
  result: BattleResolutionResult;
}): readonly BattleReducerRouteOwnerGroup[] {
  const kind = battleFillKind(input.fill);
  const isChainedSpellAttack =
    input.input.subject.tag === "actionSpell" &&
    input.input.subject.invocation.procedure === "chainedSpellAttackDamage";
  if (kind === "attackRoll") {
    return ["battleAttackRoll"];
  }
  if (kind === "damageTypeChoice") return ["battleSpellAttackProcedure"];
  if (kind === "rolledDice") {
    const hitPointOwner =
      input.result.tag === "needsHoles" &&
      input.result.holes.some(
        (hole) => hole.kind === "concentrationSavingThrow",
      )
        ? "battleHitPointAndZeroHpLifecycle"
        : "battleHitPoint";
    return isChainedSpellAttack
      ? [hitPointOwner, "battleSpellAttackProcedure"]
      : [hitPointOwner];
  }
  if (kind === "targetChoice") {
    return isChainedSpellAttack
      ? ["battleTargetSelection", "battleSpellAttackProcedure"]
      : ["battleTargetSelection"];
  }
  if (kind === "concentrationSavingThrow") return ["battleConcentration"];
  return [];
}

function spellAttackProcedureRouteHoles(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteHole[] {
  if (result.tag !== "needsHoles") {
    return [];
  }
  const holes = battleReducerRouteHoles(result.holes);
  return input.subject.tag === "actionSpell" &&
    input.subject.invocation.procedure === "spellAttackSequence"
    ? spellAttackSequenceRouteHoles(holes)
    : holes;
}

function spellAttackSequenceRouteHoles(
  holes: readonly BattleReducerRouteHole[],
): readonly BattleReducerRouteHole[] {
  if (holes.includes("targetChoice")) {
    return ["attackRoll", "rolledDice", "targetChoice"];
  }
  if (holes.includes("attackRoll")) {
    return ["attackRoll", "rolledDice"];
  }
  if (holes.includes("rolledDice")) {
    return ["rolledDice"];
  }
  return holes;
}

function zeroHitPointSpellEffectTeardownRouteForResolution(
  input: BattleResolutionInput,
  fill: BattleFill,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (battleFillKind(fill) !== "concentrationSavingThrow") {
    return [];
  }
  if (result.tag === "invalid") {
    return [];
  }
  const teardown = zeroHitPointConcentrationTeardown(input.state, result.state);
  if (teardown === undefined) {
    return [];
  }
  return [
    zeroHitPointSpellEffectTeardownRoute("battleConditionLifecycle"),
    zeroHitPointSpellEffectTeardownRoute("battleConcentration"),
    ...(teardown.concentratingEffectRemoved
      ? [zeroHitPointSpellEffectTeardownRoute("battleActiveEffect")]
      : []),
  ];
}

function zeroHitPointSpellEffectTeardownRoute(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "zeroHitPointSpellEffectTeardown",
    holes: [],
    owner,
  };
}

function zeroHitPointConcentrationTeardown(
  before: BattleState,
  after: BattleState,
): { readonly concentratingEffectRemoved: boolean } | undefined {
  for (const beforeCombatant of before.combatants.values()) {
    const afterCombatant = after.combatants.get(beforeCombatant.combatantId);
    if (afterCombatant === undefined) {
      continue;
    }
    if (
      beforeCombatant.concentration === null ||
      beforeCombatant.concentration.effectKind !== "spellEffect" ||
      beforeCombatant.conditions.unconscious === true ||
      Number(afterCombatant.hp) !== 0 ||
      afterCombatant.conditions.unconscious !== true ||
      afterCombatant.concentration !== null
    ) {
      continue;
    }
    return {
      concentratingEffectRemoved:
        concentratingActiveEffectCount(before, beforeCombatant.combatantId) >
        concentratingActiveEffectCount(after, beforeCombatant.combatantId),
    };
  }
  return undefined;
}

function concentratingActiveEffectCount(
  state: BattleState,
  combatantId: CombatantId,
): number {
  return [...state.combatants.values()].reduce(
    (count, combatant) =>
      count +
      combatant.activeEffects.filter((effect) =>
        activeEffectExpiresWithCombatantConcentration(effect, combatantId),
      ).length,
    0,
  );
}

function activeEffectExpiresWithCombatantConcentration(
  effect: BattleActiveEffect,
  combatantId: CombatantId,
): boolean {
  return (
    "expiresAt" in effect &&
    effect.expiresAt.kind === "concentration" &&
    effect.expiresAt.combatantId === combatantId
  );
}

function interruptResolutionAddedArmorClassEffect(
  before: BattleState,
  result: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
): boolean {
  return [...result.state.combatants.values()].some(
    (combatant) =>
      armorClassEffectCount(combatant.activeEffects) >
      armorClassEffectCount(
        before.combatants.get(combatant.combatantId)?.activeEffects ?? [],
      ),
  );
}

function armorClassEffectCount(
  activeEffects: readonly BattleActiveEffect[],
): number {
  return activeEffects.filter(
    (effect) => effect.kind === "spellArmorClassBonus",
  ).length;
}
