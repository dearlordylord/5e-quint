// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintStateRecord,
  quintVariantMappedValue,
  run,
  stateCheck,
  type ReducerRouteEvent,
  type ReducerRouteFill,
  type ReducerRouteHole,
  type ReducerRouteOwnerGroup,
  type ReducerRouteSubjectFamily,
} from "./battle-runtime-mbt-driver-kit.ts";

type RouteState<Surface extends string> = {
  readonly surface: Surface;
  readonly route: readonly ReducerRouteEvent[];
};

const ROLL_MODIFIER_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  BaneSaveFrontierRouteSurface: "baneSaveFrontier",
  BaneFailedActiveEffectRouteSurface: "baneFailedActiveEffect",
  DirectConcentrationRollModifierRouteSurface:
    "directConcentrationRollModifier",
  SkillChoiceFrontierRouteSurface: "skillChoiceFrontier",
  GuidanceActiveEffectRouteSurface: "guidanceActiveEffect",
  PassWithoutTraceActiveEffectRouteSurface:
    "passWithoutTraceActiveEffect",
  AbilityChoiceFrontierRouteSurface: "abilityChoiceFrontier",
  EnhanceAbilityActiveEffectRouteSurface: "enhanceAbilityActiveEffect",
  TargetAbilityChoicesFrontierRouteSurface:
    "targetAbilityChoicesFrontier",
  EnhancePerTargetActiveEffectRouteSurface:
    "enhancePerTargetActiveEffect",
  EnthrallActiveEffectRouteSurface: "enthrallActiveEffect",
  ActiveOneMinuteEffectCountFrontierRouteSurface:
    "activeOneMinuteEffectCountFrontier",
  ThaumaturgyActiveEffectRouteSurface: "thaumaturgyActiveEffect",
  ThaumaturgyCancelledRouteSurface: "thaumaturgyCancelled",
  ConcentrationBreakCleanupRouteSurface: "concentrationBreakCleanup",
} as const satisfies Readonly<Record<string, string>>;
type RollModifierRouteSurface =
  (typeof ROLL_MODIFIER_ROUTE_SURFACE_BY_TAG)[keyof typeof ROLL_MODIFIER_ROUTE_SURFACE_BY_TAG];

const SCALAR_BUFF_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  ArmorClassBonusActiveEffectRouteSurface:
    "armorClassBonusActiveEffect",
  SpeedDeltaActiveEffectRouteSurface: "speedDeltaActiveEffect",
  SpecialSpeedGrantActiveEffectRouteSurface:
    "specialSpeedGrantActiveEffect",
  HitPointMaximumIncreaseActiveEffectRouteSurface:
    "hitPointMaximumIncreaseActiveEffect",
  TemporaryHitPointEffectRouteSurface: "temporaryHitPointEffect",
} as const satisfies Readonly<Record<string, string>>;
type ScalarBuffRouteSurface =
  (typeof SCALAR_BUFF_ROUTE_SURFACE_BY_TAG)[keyof typeof SCALAR_BUFF_ROUTE_SURFACE_BY_TAG];

const SLEEP_REPEAT_SAVE_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  InitialSaveConditionAppliedRouteSurface:
    "initialSaveConditionApplied",
  ConcentrationBrokenBeforeRepeatRouteSurface:
    "concentrationBrokenBeforeRepeat",
  CasterTurnEndedWithEffectRouteSurface: "casterTurnEndedWithEffect",
  CasterTurnEndedAfterConcentrationBreakRouteSurface:
    "casterTurnEndedAfterConcentrationBreak",
  TargetTurnEndedAfterConcentrationBreakRouteSurface:
    "targetTurnEndedAfterConcentrationBreak",
  RepeatSaveFrontierRouteSurface: "repeatSaveFrontier",
  RepeatSaveSuccessCleanupRouteSurface: "repeatSaveSuccessCleanup",
  RepeatSaveFailureUnconsciousRouteSurface:
    "repeatSaveFailureUnconscious",
} as const satisfies Readonly<Record<string, string>>;
type SleepRepeatSaveRouteSurface =
  (typeof SLEEP_REPEAT_SAVE_ROUTE_SURFACE_BY_TAG)[keyof typeof SLEEP_REPEAT_SAVE_ROUTE_SURFACE_BY_TAG];

const TURN_BOUNDARY_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  TargetStartTurnResolvedRouteSurface: "targetStartTurnResolved",
  SourceNextTurnResolvedRouteSurface: "sourceNextTurnResolved",
} as const satisfies Readonly<Record<string, string>>;
type TurnBoundaryRouteSurface =
  (typeof TURN_BOUNDARY_ROUTE_SURFACE_BY_TAG)[keyof typeof TURN_BOUNDARY_ROUTE_SURFACE_BY_TAG];

const ZERO_HIT_POINT_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  SpellAttackSequenceResolvedRouteSurface:
    "spellAttackSequenceResolved",
} as const satisfies Readonly<Record<string, string>>;
type ZeroHitPointRouteSurface =
  (typeof ZERO_HIT_POINT_ROUTE_SURFACE_BY_TAG)[keyof typeof ZERO_HIT_POINT_ROUTE_SURFACE_BY_TAG];

const rollModifierRouteDriverSchema = {
  init: {},
  doDiscoverBaneSave: {},
  doCastBaneFailed: {},
  doCastBless: {},
  doDiscoverGuidanceSkillChoice: {},
  doCastGuidanceStealth: {},
  doCastPassWithoutTrace: {},
  doDiscoverEnhanceAbilityChoice: {},
  doCastEnhanceDex: {},
  doDiscoverEnhanceTargetAbilityChoices: {},
  doCastEnhancePerTarget: {},
  doCastEnthrall: {},
  doDiscoverThaumaturgyCount: {},
  doCastThaumaturgyBoomingVoice: {},
  doCastThaumaturgyCancelled: {},
  doBreakConcentration: {},
  doStutter: {},
  step: {},
} as const;

const scalarBuffRouteDriverSchema = {
  init: {},
  doCastShieldOfFaith: {},
  doCastLongstrider: {},
  doCastSpiderClimb: {},
  doCastAid: {},
  doCastFalseLife: {},
  doStutter: {},
  step: {},
} as const;

const sleepRepeatSaveRouteDriverSchema = {
  init: {},
  doFillInitialSaveFailure: {},
  doBreakConcentrationBeforeRepeat: {},
  doEndCasterTurn: {},
  doEndCasterTurnAfterConcentrationBreak: {},
  doEndTargetTurnAfterConcentrationBreak: {},
  doDiscoverRepeatSave: {},
  doFillRepeatSaveSuccess: {},
  doFillRepeatSaveFailure: {},
  step: {},
} as const;

const turnBoundaryRouteDriverSchema = {
  init: {},
  doResolveTargetStartTurn: {},
  doResolveSourceNextTurn: {},
  step: {},
} as const;

const zeroHitPointRouteDriverSchema = {
  init: {},
  doResolveEldritchBlast: {},
  step: {},
} as const;

const ROUTE_START_OWNER =
  "battleActionEconomy" satisfies ReducerRouteOwnerGroup;
const SPELL_INVOCATION_OWNER =
  "battleSpellSlotAndActionEconomy" satisfies ReducerRouteOwnerGroup;
const ROLL_MODIFIER_ROUTE_SUBJECT =
  "rollModifierEffect" satisfies ReducerRouteSubjectFamily;
const SCALAR_BUFF_ROUTE_SUBJECT =
  "scalarBuffEffect" satisfies ReducerRouteSubjectFamily;
const SLEEP_REPEAT_SAVE_ROUTE_SUBJECT =
  "repeatSaveConditionEffect" satisfies ReducerRouteSubjectFamily;
const TURN_BOUNDARY_ROUTE_SUBJECT =
  "turnBoundaryEffectLifecycle" satisfies ReducerRouteSubjectFamily;
const SPELL_ATTACK_PROCEDURE_ROUTE_SUBJECT =
  "spellAttackProcedure" satisfies ReducerRouteSubjectFamily;
const ZERO_HIT_POINT_TEARDOWN_ROUTE_SUBJECT =
  "zeroHitPointSpellEffectTeardown" satisfies ReducerRouteSubjectFamily;

function routeState<const Surface extends string>(
  surface: Surface,
  route: readonly ReducerRouteEvent[],
): RouteState<Surface> {
  return { surface, route };
}

function routeHoles(
  ...values: ReducerRouteHole[]
): readonly ReducerRouteHole[] {
  return [...values].sort();
}

function startRoute(): ReducerRouteEvent {
  return { kind: "startBattle", owner: ROUTE_START_OWNER };
}

function discoverRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: input.subject,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function resolveRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly fill: ReducerRouteFill;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: input.subject,
    fill: input.fill,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function resolveRouteWithoutFill(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: input.subject,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function rollModifierDiscover(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return discoverRoute({
    subject: ROLL_MODIFIER_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function rollModifierResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: ROLL_MODIFIER_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function rollModifierResolveWithoutFill(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRouteWithoutFill({
    subject: ROLL_MODIFIER_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function rollModifierRouteWithDiscovery(
  state: RouteState<RollModifierRouteSurface>,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): readonly ReducerRouteEvent[] {
  return state.surface === "fresh"
    ? [startRoute(), rollModifierDiscover(holes, owner)]
    : state.route;
}

function createRollModifierRouteDriver() {
  return defineDriver(rollModifierRouteDriverSchema, () => {
    let state = routeState<RollModifierRouteSurface>("fresh", [startRoute()]);
    const reset = (): void => {
      state = routeState("fresh", [startRoute()]);
    };

    return {
      init: reset,
      doDiscoverBaneSave: () => {
        state = routeState("baneSaveFrontier", [
          ...state.route,
          rollModifierDiscover(
            routeHoles("savingThrowOutcome"),
            SPELL_INVOCATION_OWNER,
          ),
        ]);
      },
      doCastBaneFailed: () => {
        state = routeState("baneFailedActiveEffect", [
          ...state.route,
          rollModifierResolve(
            "savingThrowOutcome",
            routeHoles(),
            "battleActiveEffect",
          ),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleConcentration",
          ),
        ]);
      },
      doCastBless: () => {
        state = routeState("directConcentrationRollModifier", [
          startRoute(),
          rollModifierDiscover(routeHoles(), SPELL_INVOCATION_OWNER),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleActiveEffect",
          ),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleConcentration",
          ),
        ]);
      },
      doDiscoverGuidanceSkillChoice: () => {
        state = routeState("skillChoiceFrontier", [
          ...state.route,
          rollModifierDiscover(routeHoles("skillChoice"), SPELL_INVOCATION_OWNER),
        ]);
      },
      doCastGuidanceStealth: () => {
        const discovered = rollModifierRouteWithDiscovery(
          state,
          routeHoles("skillChoice"),
          SPELL_INVOCATION_OWNER,
        );
        state = routeState("guidanceActiveEffect", [
          ...discovered,
          rollModifierResolve(
            { kind: "skillChoice", skill: "stealth" },
            routeHoles(),
            "battleActiveEffect",
          ),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleConcentration",
          ),
        ]);
      },
      doCastPassWithoutTrace: () => {
        state = routeState("passWithoutTraceActiveEffect", [
          startRoute(),
          rollModifierDiscover(routeHoles(), SPELL_INVOCATION_OWNER),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleActiveEffect",
          ),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleConcentration",
          ),
        ]);
      },
      doDiscoverEnhanceAbilityChoice: () => {
        state = routeState("abilityChoiceFrontier", [
          ...state.route,
          rollModifierDiscover(
            routeHoles("abilityChoice"),
            SPELL_INVOCATION_OWNER,
          ),
        ]);
      },
      doCastEnhanceDex: () => {
        const discovered = rollModifierRouteWithDiscovery(
          state,
          routeHoles("abilityChoice"),
          SPELL_INVOCATION_OWNER,
        );
        state = routeState("enhanceAbilityActiveEffect", [
          ...discovered,
          rollModifierResolve(
            { kind: "abilityChoice", ability: "dex" },
            routeHoles(),
            "battleActiveEffect",
          ),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleConcentration",
          ),
        ]);
      },
      doDiscoverEnhanceTargetAbilityChoices: () => {
        state = routeState("targetAbilityChoicesFrontier", [
          ...state.route,
          rollModifierDiscover(
            routeHoles("targetAbilityChoices"),
            SPELL_INVOCATION_OWNER,
          ),
        ]);
      },
      doCastEnhancePerTarget: () => {
        const discovered = rollModifierRouteWithDiscovery(
          state,
          routeHoles("targetAbilityChoices"),
          SPELL_INVOCATION_OWNER,
        );
        state = routeState("enhancePerTargetActiveEffect", [
          ...discovered,
          rollModifierResolve(
            {
              kind: "targetAbilityChoices",
              choices: {
                primary: "dex",
                secondary: "wis",
              },
            },
            routeHoles(),
            "battleActiveEffect",
          ),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleConcentration",
          ),
        ]);
      },
      doCastEnthrall: () => {
        state = routeState("enthrallActiveEffect", [
          startRoute(),
          rollModifierDiscover(
            routeHoles("savingThrowOutcome"),
            SPELL_INVOCATION_OWNER,
          ),
          rollModifierResolve(
            "savingThrowOutcome",
            routeHoles(),
            "battleActiveEffect",
          ),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleConcentration",
          ),
        ]);
      },
      doDiscoverThaumaturgyCount: () => {
        state = routeState("activeOneMinuteEffectCountFrontier", [
          ...state.route,
          rollModifierDiscover(routeHoles(), "battleActiveEffect"),
        ]);
      },
      doCastThaumaturgyBoomingVoice: () => {
        const discovered = rollModifierRouteWithDiscovery(
          state,
          routeHoles(),
          "battleActiveEffect",
        );
        state = routeState("thaumaturgyActiveEffect", [
          ...discovered,
          rollModifierResolveWithoutFill(routeHoles(), "battleActiveEffect"),
        ]);
      },
      doCastThaumaturgyCancelled: () => {
        const discovered = rollModifierRouteWithDiscovery(
          state,
          routeHoles(),
          "battleActiveEffect",
        );
        state = routeState("thaumaturgyCancelled", [
          ...discovered,
          rollModifierResolveWithoutFill(routeHoles(), "battleActiveEffect"),
        ]);
      },
      doBreakConcentration: () => {
        state = routeState("concentrationBreakCleanup", [
          ...state.route,
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleConcentration",
          ),
          rollModifierResolveWithoutFill(
            routeHoles(),
            "battleActiveEffect",
          ),
        ]);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => state,
    };
  });
}

function scalarBuffDiscover(owner: ReducerRouteOwnerGroup): ReducerRouteEvent {
  return discoverRoute({
    subject: SCALAR_BUFF_ROUTE_SUBJECT,
    holes: routeHoles(),
    owner,
  });
}

function scalarBuffResolve(owner: ReducerRouteOwnerGroup): ReducerRouteEvent {
  return resolveRouteWithoutFill({
    subject: SCALAR_BUFF_ROUTE_SUBJECT,
    holes: routeHoles(),
    owner,
  });
}

function createScalarBuffRouteDriver() {
  return defineDriver(scalarBuffRouteDriverSchema, () => {
    let state = routeState<ScalarBuffRouteSurface>("fresh", [startRoute()]);
    const reset = (): void => {
      state = routeState("fresh", [startRoute()]);
    };

    return {
      init: reset,
      doCastShieldOfFaith: () => {
        state = routeState("armorClassBonusActiveEffect", [
          ...state.route,
          scalarBuffDiscover(SPELL_INVOCATION_OWNER),
          scalarBuffResolve("battleActiveEffect"),
          scalarBuffResolve("battleConcentration"),
        ]);
      },
      doCastLongstrider: () => {
        state = routeState("speedDeltaActiveEffect", [
          ...state.route,
          scalarBuffDiscover(SPELL_INVOCATION_OWNER),
          scalarBuffResolve("battleActiveEffect"),
          scalarBuffResolve("battleMovementResource"),
        ]);
      },
      doCastSpiderClimb: () => {
        state = routeState("specialSpeedGrantActiveEffect", [
          ...state.route,
          scalarBuffDiscover(SPELL_INVOCATION_OWNER),
          scalarBuffResolve("battleActiveEffect"),
          scalarBuffResolve("battleMovementResource"),
          scalarBuffResolve("battleConcentration"),
        ]);
      },
      doCastAid: () => {
        state = routeState("hitPointMaximumIncreaseActiveEffect", [
          ...state.route,
          scalarBuffDiscover(SPELL_INVOCATION_OWNER),
          scalarBuffResolve("battleActiveEffect"),
          scalarBuffResolve("battleHitPoint"),
        ]);
      },
      doCastFalseLife: () => {
        state = routeState("temporaryHitPointEffect", [
          ...state.route,
          scalarBuffDiscover(SPELL_INVOCATION_OWNER),
          scalarBuffResolve("battleTemporaryHitPoint"),
        ]);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => state,
    };
  });
}

function sleepRepeatSaveDiscover(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return discoverRoute({
    subject: SLEEP_REPEAT_SAVE_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function sleepRepeatSaveResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: SLEEP_REPEAT_SAVE_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function sleepRepeatSaveResolveWithoutFill(
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRouteWithoutFill({
    subject: SLEEP_REPEAT_SAVE_ROUTE_SUBJECT,
    holes: routeHoles(),
    owner,
  });
}

function createSleepRepeatSaveRouteDriver() {
  return defineDriver(sleepRepeatSaveRouteDriverSchema, () => {
    let state = routeState<SleepRepeatSaveRouteSurface>("fresh", [
      startRoute(),
    ]);
    const reset = (): void => {
      state = routeState("fresh", [startRoute()]);
    };

    return {
      init: reset,
      doFillInitialSaveFailure: () => {
        state = routeState("initialSaveConditionApplied", [
          ...state.route,
          sleepRepeatSaveDiscover(
            routeHoles("savingThrowOutcome"),
            SPELL_INVOCATION_OWNER,
          ),
          sleepRepeatSaveResolve(
            "savingThrowOutcome",
            routeHoles(),
            "battleConditionLifecycle",
          ),
          sleepRepeatSaveResolveWithoutFill("battleActiveEffect"),
          sleepRepeatSaveResolveWithoutFill("battleConcentration"),
        ]);
      },
      doBreakConcentrationBeforeRepeat: () => {
        state = routeState("concentrationBrokenBeforeRepeat", [
          ...state.route,
          sleepRepeatSaveResolveWithoutFill("battleConcentration"),
          sleepRepeatSaveResolveWithoutFill("battleActiveEffect"),
          sleepRepeatSaveResolveWithoutFill("battleConditionLifecycle"),
        ]);
      },
      doEndCasterTurn: () => {
        state = routeState("casterTurnEndedWithEffect", [
          ...state.route,
          sleepRepeatSaveResolveWithoutFill("battleTurnBoundary"),
        ]);
      },
      doEndCasterTurnAfterConcentrationBreak: () => {
        state = routeState("casterTurnEndedAfterConcentrationBreak", [
          ...state.route,
          sleepRepeatSaveResolveWithoutFill("battleTurnBoundary"),
        ]);
      },
      doEndTargetTurnAfterConcentrationBreak: () => {
        state = routeState("targetTurnEndedAfterConcentrationBreak", [
          ...state.route,
          sleepRepeatSaveResolveWithoutFill("battleTurnBoundary"),
        ]);
      },
      doDiscoverRepeatSave: () => {
        state = routeState("repeatSaveFrontier", [
          ...state.route,
          sleepRepeatSaveDiscover(
            routeHoles("savingThrowOutcome"),
            "battleTurnBoundary",
          ),
        ]);
      },
      doFillRepeatSaveSuccess: () => {
        state = routeState("repeatSaveSuccessCleanup", [
          ...state.route,
          sleepRepeatSaveResolve(
            "savingThrowOutcome",
            routeHoles(),
            "battleConditionLifecycle",
          ),
          sleepRepeatSaveResolveWithoutFill("battleActiveEffect"),
        ]);
      },
      doFillRepeatSaveFailure: () => {
        state = routeState("repeatSaveFailureUnconscious", [
          ...state.route,
          sleepRepeatSaveResolve(
            "savingThrowOutcome",
            routeHoles(),
            "battleConditionLifecycle",
          ),
        ]);
      },
      step: () => {},
      getState: () => state,
    };
  });
}

function turnBoundaryDiscover(
  holes: readonly ReducerRouteHole[],
): ReducerRouteEvent {
  return discoverRoute({
    subject: TURN_BOUNDARY_ROUTE_SUBJECT,
    holes,
    owner: "battleTurnBoundary",
  });
}

function turnBoundaryResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: TURN_BOUNDARY_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function turnBoundaryResolveWithoutFill(
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRouteWithoutFill({
    subject: TURN_BOUNDARY_ROUTE_SUBJECT,
    holes: routeHoles(),
    owner,
  });
}

function createTurnBoundaryRouteDriver() {
  return defineDriver(turnBoundaryRouteDriverSchema, () => {
    let state = routeState<TurnBoundaryRouteSurface>("fresh", [startRoute()]);
    const reset = (): void => {
      state = routeState("fresh", [startRoute()]);
    };

    return {
      init: reset,
      doResolveTargetStartTurn: () => {
        state = routeState("targetStartTurnResolved", [
          ...state.route,
          turnBoundaryDiscover(
            routeHoles("rolledDice", "savingThrowOutcome"),
          ),
          turnBoundaryResolve(
            "rolledDice",
            routeHoles("savingThrowOutcome"),
            "battleHitPoint",
          ),
          turnBoundaryResolve(
            "savingThrowOutcome",
            routeHoles(),
            "battleActiveEffect",
          ),
        ]);
      },
      doResolveSourceNextTurn: () => {
        state = routeState("sourceNextTurnResolved", [
          ...state.route,
          turnBoundaryDiscover(routeHoles("rolledDice")),
          turnBoundaryResolve(
            "rolledDice",
            routeHoles(),
            "battleHitPoint",
          ),
          turnBoundaryResolveWithoutFill("battleActiveEffect"),
          turnBoundaryResolveWithoutFill("battleTurnBoundary"),
        ]);
      },
      step: () => {},
      getState: () => state,
    };
  });
}

function spellAttackProcedureDiscover(
  holes: readonly ReducerRouteHole[],
): ReducerRouteEvent {
  return discoverRoute({
    subject: SPELL_ATTACK_PROCEDURE_ROUTE_SUBJECT,
    holes,
    owner: "battleSpellAttackProcedure",
  });
}

function spellAttackProcedureResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: SPELL_ATTACK_PROCEDURE_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function zeroHitPointTeardownResolve(
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRouteWithoutFill({
    subject: ZERO_HIT_POINT_TEARDOWN_ROUTE_SUBJECT,
    holes: routeHoles(),
    owner,
  });
}

function createZeroHitPointRouteDriver() {
  return defineDriver(zeroHitPointRouteDriverSchema, () => {
    let state = routeState<ZeroHitPointRouteSurface>("fresh", [startRoute()]);
    const reset = (): void => {
      state = routeState("fresh", [startRoute()]);
    };

    return {
      init: reset,
      doResolveEldritchBlast: () => {
        state = routeState("spellAttackSequenceResolved", [
          ...state.route,
          spellAttackProcedureDiscover(
            routeHoles("attackRoll", "rolledDice", "targetChoice"),
          ),
          spellAttackProcedureResolve(
            "targetChoice",
            routeHoles("attackRoll", "rolledDice", "targetChoice"),
            "battleTargetSelection",
          ),
          spellAttackProcedureResolve(
            "targetChoice",
            routeHoles("attackRoll", "rolledDice"),
            "battleTargetSelection",
          ),
          spellAttackProcedureResolve(
            "attackRoll",
            routeHoles("rolledDice"),
            "battleAttackRoll",
          ),
          spellAttackProcedureResolve(
            "rolledDice",
            routeHoles("concentrationSavingThrow"),
            "battleHitPointAndZeroHpLifecycle",
          ),
          spellAttackProcedureResolve(
            "concentrationSavingThrow",
            routeHoles("attackRoll", "rolledDice"),
            "battleConcentration",
          ),
          zeroHitPointTeardownResolve("battleConditionLifecycle"),
          zeroHitPointTeardownResolve("battleConcentration"),
          zeroHitPointTeardownResolve("battleActiveEffect"),
          spellAttackProcedureResolve(
            "attackRoll",
            routeHoles("rolledDice"),
            "battleAttackRoll",
          ),
          spellAttackProcedureResolve(
            "rolledDice",
            routeHoles(),
            "battleHitPoint",
          ),
        ]);
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const rollModifierRouteStateCheck = stateCheck(
  (raw: unknown) =>
    normalizeRouteQuintState(
      raw,
      ROLL_MODIFIER_ROUTE_SURFACE_BY_TAG,
      "roll-modifier route surface",
    ),
  compareRouteStates,
);

const scalarBuffRouteStateCheck = stateCheck(
  (raw: unknown) =>
    normalizeRouteQuintState(
      raw,
      SCALAR_BUFF_ROUTE_SURFACE_BY_TAG,
      "scalar-buff route surface",
    ),
  compareRouteStates,
);

const sleepRepeatSaveRouteStateCheck = stateCheck(
  (raw: unknown) =>
    normalizeRouteQuintState(
      raw,
      SLEEP_REPEAT_SAVE_ROUTE_SURFACE_BY_TAG,
      "sleep repeat-save route surface",
    ),
  compareRouteStates,
);

const turnBoundaryRouteStateCheck = stateCheck(
  (raw: unknown) =>
    normalizeRouteQuintState(
      raw,
      TURN_BOUNDARY_ROUTE_SURFACE_BY_TAG,
      "turn-boundary route surface",
    ),
  compareRouteStates,
);

const zeroHitPointRouteStateCheck = stateCheck(
  (raw: unknown) =>
    normalizeRouteQuintState(
      raw,
      ZERO_HIT_POINT_ROUTE_SURFACE_BY_TAG,
      "zero-Hit-Point route surface",
    ),
  compareRouteStates,
);

describe("active-effect lifecycle reducer route connectors", () => {
  it(
    "routes roll-modifier active effects through explicit owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-roll-modifier-active-effects.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRollModifierRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(16),
        stateCheck: rollModifierRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes scalar-buff active effects through explicit owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-scalar-buff-active-effects.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createScalarBuffRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: scalarBuffRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Sleep repeat-save lifecycle through explicit owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-sleep-repeat-save.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSleepRepeatSaveRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(8),
        stateCheck: sleepRepeatSaveRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes turn-boundary effect lifecycle through explicit owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-turn-boundary-effect-lifecycle.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createTurnBoundaryRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: turnBoundaryRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes zero-Hit-Point mid-resolution teardown through explicit owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-zero-hit-point-mid-resolution.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createZeroHitPointRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: zeroHitPointRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeRouteQuintState<
  const SurfaceByTag extends Readonly<Record<string, string>>,
>(
  raw: unknown,
  surfaceByTag: SurfaceByTag,
  label: string,
): RouteState<SurfaceByTag[keyof SurfaceByTag]> {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      quintField(state, "qSurface"),
      "qSurface",
      surfaceByTag,
      label,
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareRouteStates<Surface extends string>(
  spec: RouteState<Surface>,
  impl: RouteState<Surface>,
): boolean {
  try {
    expect(impl).toEqual(spec);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\nspec=${JSON.stringify(spec)}\nimpl=${JSON.stringify(impl)}`,
      );
    }
    throw error;
  }
  return true;
}
