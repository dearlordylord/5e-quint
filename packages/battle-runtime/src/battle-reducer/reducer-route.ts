// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { battleFillKind } from "../battle-protocol-kinds.ts";
import type {
  AvailableBattleAct,
  BattleActiveEffect,
  BattleFill,
  BattleInterruptCheckpoint,
  BattleHole,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { battleHoleFamilyKind } from "./hole-helpers.ts";
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
import { spellTurnStartSavingThrowOutcomeHoleId } from "./turn-end-movement.ts";

export type BattleReducerRouteSubjectFamily =
  | "concentrationTeardown"
  | "commandEffect"
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
  | "reactionSpell"
  | "rollModifierEffect"
  | "saveGatedSpell"
  | "scalarBuffEffect"
  | "repeatSaveConditionEffect"
  | "turnBoundaryEffectLifecycle"
  | "slotSpell"
  | "spellAttackProcedure"
  | "weaponAttack"
  | "weaponMasteryProperty";

export type BattleReducerRouteOwnerGroup =
  | "battleActionEconomy"
  | "battleSpellSlotAndActionEconomy"
  | "battleHoleFrontier"
  | "battleTargetSelection"
  | "battleObjectTargetBoundary"
  | "battleAttackRoll"
  | "battleSpellAttackProcedure"
  | "battleSavingThrowOutcome"
  | "battleSavingThrowRollMode"
  | "battleHitPointAndZeroHpLifecycle"
  | "battleHitPoint"
  | "battleDamageRoll"
  | "battleDamageType"
  | "battleConcentration"
  | "battleActiveEffect"
  | "battleConditionLifecycle"
  | "battleDamageAdjustment"
  | "battleFeatureResource"
  | "battleMovementResource"
  | "battleTemporaryHitPoint"
  | "battleInterruptStack"
  | "battleTurnBoundary";

export type BattleReducerRouteHole =
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
  | "unitFeatureDecision";

export type BattleReducerRouteFillKind =
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
  | "unitFeatureDecision";
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

export function battleReducerStartRouteEvent(
  _state: BattleState,
): BattleReducerRouteEvent {
  return { kind: "startBattle", owner: "battleActionEconomy" };
}

export function battleReducerRouteEventsForDiscoveredAct(
  act: AvailableBattleAct,
): BattleReducerRouteEvents | undefined {
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
  const scalarBuffRoute = scalarBuffRouteForDiscoveredAct(act);
  if (scalarBuffRoute !== undefined) {
    return [scalarBuffRoute];
  }
  const sleepRepeatSaveRoute = sleepRepeatSaveRouteForDiscoveredAct(act);
  if (sleepRepeatSaveRoute !== undefined) {
    return [sleepRepeatSaveRoute];
  }
  if (isWeaponAttackSubject(act.subject)) {
    return [
      {
        kind: "discoverBattleActs",
        subject: "weaponAttack",
        holes: battleReducerRouteHoles(act.initialHoles),
        owner: "battleActionEconomy",
      },
    ];
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
  if (!isSpellAttackProcedureSubject(act.subject)) {
    return undefined;
  }
  const actionOwner =
    act.subject.invocation.tag === "spellSlot"
      ? "battleSpellSlotAndActionEconomy"
      : "battleActionEconomy";
  const actionEconomyEvent: BattleReducerRouteEvent = {
    kind: "discoverBattleActs",
    subject: "spellAttackProcedure",
    holes: battleReducerRouteHoles(act.initialHoles),
    owner: actionOwner,
  };
  const hasObjectTargetBoundary = act.initialHoles.some(
    (hole) => hole.kind === "objectTargetChoice",
  );
  if (!hasObjectTargetBoundary) {
    return [actionEconomyEvent];
  }
  return [
    actionEconomyEvent,
    {
      kind: "discoverBattleActs",
      subject: "spellAttackProcedure",
      holes: battleReducerRouteHoles(
        act.initialHoles.filter((hole) => hole.kind === "objectTargetChoice"),
      ),
      owner: "battleObjectTargetBoundary",
    },
  ];
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
  const scalarBuffRoute = scalarBuffRouteForResolution(input, result);
  if (scalarBuffRoute !== undefined) {
    return scalarBuffRoute;
  }
  const rollModifierConcentrationRoute =
    rollModifierConcentrationBreakRouteForResolution(input, result);
  if (rollModifierConcentrationRoute !== undefined) {
    return rollModifierConcentrationRoute;
  }
  const sleepRepeatSaveRoute = sleepRepeatSaveRouteForResolution(
    input,
    result,
  );
  if (sleepRepeatSaveRoute !== undefined) {
    return sleepRepeatSaveRoute;
  }
  const deathSavingThrowRoute = deathSavingThrowRouteForResolution(
    input,
    result,
  );
  if (deathSavingThrowRoute !== undefined) {
    return deathSavingThrowRoute;
  }
  const turnBoundaryEffectLifecycleRoute =
    turnBoundaryEffectLifecycleRouteForResolution(input, result);
  if (turnBoundaryEffectLifecycleRoute !== undefined) {
    return turnBoundaryEffectLifecycleRoute;
  }
  const metamagicSpellDurationProjectionRoute =
    metamagicSpellDurationProjectionRouteForResolution(input, result);
  if (metamagicSpellDurationProjectionRoute !== undefined) {
    return metamagicSpellDurationProjectionRoute;
  }
  const concentrationRoute = concentrationRouteForResolution(input, result);
  if (concentrationRoute !== undefined) {
    return concentrationRoute;
  }
  const commandRoute = commandRouteForResolution(input, result);
  if (commandRoute !== undefined) {
    return [commandRoute];
  }
  const metamagicRoute = metamagicRouteForResolution(input, result);
  if (metamagicRoute !== undefined) {
    return metamagicRoute;
  }
  const hitPointRestorationRoute = hitPointRestorationRouteForResolution(
    input,
    result,
  );
  if (hitPointRestorationRoute !== undefined) {
    return [hitPointRestorationRoute];
  }
  const slotSpellRoute = slotSpellRouteForResolution(input, result);
  if (slotSpellRoute !== undefined) {
    return [slotSpellRoute];
  }
  const saveGatedRoute = saveGatedSpellRouteForResolution(input, result);
  if (saveGatedRoute !== undefined) {
    return [saveGatedRoute];
  }
  const interruptResumeDiscoveryRoute =
    interruptStackResumeDiscoveryRouteForResolution(input, result);
  if (interruptResumeDiscoveryRoute !== undefined) {
    return [interruptResumeDiscoveryRoute];
  }
  const weaponAttackRoute = weaponAttackRouteForResolution(input, result);
  if (weaponAttackRoute !== undefined) {
    return weaponAttackRoute;
  }
  if (!isSpellAttackProcedureSubject(input.subject)) {
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
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const [firstOwner, ...remainingOwners] = spellAttackProcedureRouteOwners(
    input.subject,
    fill,
  );
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
  return [eventForOwner(firstOwner), ...remainingOwners.map(eventForOwner)];
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
      metamagicDamageTypeSubstitutionRouteForResolution(
        input,
        result,
        fill,
      ) ??
      metamagicMissedSpellAttackRerollRouteForResolution(
        input,
        result,
        fill,
      ) ??
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
  if (fill === undefined || battleReducerRouteFill(fill) !== "spellTargetList") {
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
    const turnBoundaryDiscovery =
      turnBoundaryEffectLifecycleDiscoveryRouteForResolution(input, result);
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
      ...(turnBoundaryDiscovery === undefined ? [] : [turnBoundaryDiscovery]),
    ]);
  }

  if (
    result.tag !== "needsHoles" ||
    !deathSavingThrowRouteHoles(result.holes).includes("deathSavingThrow")
  ) {
    return undefined;
  }

  const turnBoundaryDiscovery =
    turnBoundaryEffectLifecycleDiscoveryRouteForResolution(input, result);
  return nonEmptyRouteEvents([
    {
      kind: "discoverBattleActs",
      subject: "deathSavingThrow",
      holes: deathSavingThrowRouteHoles(result.holes),
      owner: "battleHitPointAndZeroHpLifecycle",
    },
    ...(turnBoundaryDiscovery === undefined ? [] : [turnBoundaryDiscovery]),
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
): BattleReducerRouteEvent | undefined {
  if (!isSaveGatedSpellResolution(input)) {
    return undefined;
  }
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = battleReducerRouteHoles(result.holes);
  if (!holes.includes("interruptDecision")) {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "savingThrowOutcome") {
    return undefined;
  }

  return {
    kind: "resolveBattleSubject",
    subject: "saveGatedSpell",
    fill: routeFill,
    holes,
    owner: "battleInterruptStack",
  };
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
    scalarBuffResolveOwners(input.state, result.state, input.subject.actorId).map(
      (owner) => scalarBuffResolveWithoutFill([], owner),
    ),
  );
}

function scalarBuffRouteFill(
  fill: BattleFill,
): Extract<
  BattleReducerRouteFill,
  "targetChoice" | "spellTargetList" | "rolledDice"
> | undefined {
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
    addedEffectKinds.has("hitPointMaximumIncrease")
      ? ["battleHitPoint"]
      : [];
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
  const fill = sleepRepeatSaveSavingThrowFill(input.fills);
  if (fill === undefined) {
    if (result.tag === "needsHoles") {
      const holes = sleepRepeatSaveRouteHoles(result.holes);
      const turnBoundaryDiscovery =
        turnBoundaryEffectLifecycleDiscoveryRouteForResolution(input, result);
      return holes.length === 0
        ? undefined
        : nonEmptyRouteEvents([
            {
              kind: "discoverBattleActs",
              subject: "repeatSaveConditionEffect",
              holes,
              owner: "battleTurnBoundary",
            },
            ...(turnBoundaryDiscovery === undefined
              ? []
              : [turnBoundaryDiscovery]),
          ]);
    }
    if (
      result.tag === "resolved" &&
      hasPendingSleepRepeatSaveEffect(input.state)
    ) {
      return [
        sleepRepeatSaveResolveWithoutFill([], "battleTurnBoundary"),
      ];
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
      ? [
          sleepRepeatSaveResolveWithoutFill([], "battleActiveEffect"),
        ]
      : [];
  const concentrationRoutes =
    input.sourceCombatantId !== undefined &&
    combatantConcentrationChanged(
      input.before,
      input.after,
      input.sourceCombatantId,
    )
      ? [
          sleepRepeatSaveResolveWithoutFill([], "battleConcentration"),
        ]
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
          turnBoundaryEffectLifecycleResolveWithoutFill(
            "battleActiveEffect",
          ),
          turnBoundaryEffectLifecycleResolveWithoutFill(
            "battleTurnBoundary",
          ),
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

function isTurnBoundaryLifecycleEffect(effect: BattleActiveEffect): boolean {
  return (
    effect.kind === "spellTurnStartDamageAndSave" ||
    effect.kind === "spellTurnEndDamage"
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
          spellTurnStartSavingThrowOutcomeHoleId(
            combatant.combatantId,
            effect,
          ),
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
    (fill): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
}

function sleepRepeatSaveRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter(
      (hole) =>
        hole.kind === "savingThrowOutcome" && "sleepRepeatSave" in hole,
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
    const beforeConditions =
      before.combatants.get(combatant.combatantId)?.conditions;
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
    return [event("weaponAttack", "battleTargetSelection")];
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

function weaponMasteryCleaveRouteStarted(fills: readonly BattleFill[]): boolean {
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

function isSpellAttackProcedureSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    (subject.invocation.procedure === "chainedSpellAttackDamage" ||
      subject.invocation.procedure === "spellAttackSequence")
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
  return procedure === "saveGatedDamage" || procedure === "saveGatedCondition";
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
): boolean {
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
  return [];
}

function battleReducerRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  const kind = battleFillKind(fill);
  if (kind === "attackRoll") return "attackRoll";
  if (kind === "concentrationSavingThrow") return "concentrationSavingThrow";
  if (kind === "damageTypeChoice") return "damageTypeChoice";
  if (kind === "deathSavingThrow") return "deathSavingThrow";
  if (kind === "hitPointHealingDistribution") {
    return "hitPointHealingDistribution";
  }
  if (kind === "interruptDecision") return "interruptDecision";
  if (kind === "objectTargetChoice") return "targetChoice";
  if (kind === "rolledDice") return "rolledDice";
  if (kind === "savingThrowOutcome") return "savingThrowOutcome";
  if (kind === "spellTargetAllocation") return "spellTargetAllocation";
  if (kind === "spellTargetList") return "spellTargetList";
  if (kind === "targetChoice") return "targetChoice";
  if (kind === "unitFeatureDecision") return "unitFeatureDecision";
  return undefined;
}

function spellAttackProcedureRouteOwners(
  subject: BattleResolutionInput["subject"],
  fill: BattleFill,
): readonly BattleReducerRouteOwnerGroup[] {
  const kind = battleFillKind(fill);
  if (kind === "attackRoll") {
    return subject.tag === "actionSpell" &&
      subject.invocation.procedure === "spellAttackSequence"
      ? ["battleAttackRoll", "battleSpellAttackProcedure"]
      : ["battleAttackRoll"];
  }
  if (kind === "damageTypeChoice") return ["battleSpellAttackProcedure"];
  if (kind === "rolledDice") {
    return ["battleHitPoint", "battleSpellAttackProcedure"];
  }
  if (kind === "targetChoice") {
    return ["battleTargetSelection", "battleSpellAttackProcedure"];
  }
  return [];
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
