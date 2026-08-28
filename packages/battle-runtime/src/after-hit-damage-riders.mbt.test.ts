import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-after-hit-damage spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-after-hit-damage-illumination

import { describe, expect, it } from "vitest";

import type { BattleActiveEffect } from "./battle-state-execution.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeReducerRoute,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintRecordField,
  quintStateRecord,
  quintVariantMappedValue,
  quintVariantTag,
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteResolveBattleSubjectWithoutFill,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
  type ReducerRouteFill,
  type ReducerRouteHole,
  type ReducerRouteOwnerGroup,
  type ReducerRouteSubjectFamily,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  abilityCheckFill,
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  interruptDecisionFill,
  characterCreature,
  requireCombatant,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  divineSmiteUnitId,
  ensnaringStrikeUnitId,
  searingSmiteUnitId,
  shiningSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { savingThrowOutcomeFill } from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleFrontierInterruptDecisionForState,
  resolveBattleSubject,
  paladinsSmiteResource,
  characterSpellInvocationForProcedureRefForTest,
  characterSpellInvocationRefForProcedureRefForTest,
  startBattleSessionRight,
  type MembersOf,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  battleId,
  discoverBattleActs,
  endTurn,
  resolveBattleInterrupt,
  type BattleFill,
  type BattleHole,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleSelectedSpellInvocation,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

type AfterHitScenario =
  | "divineSmiteSlot"
  | "divineSmiteFreeCast"
  | "ensnaringStrikeFailedSave"
  | "ensnaringStrikeSuccessfulSave"
  | "searingSmiteHit"
  | "shiningSmiteHit"
  | "done";

type AfterHitPhase =
  | "fresh"
  | "targetChoiceNeeded"
  | "attackRollNeeded"
  | "afterHitChoiceNeeded"
  | "ensnaringSaveNeeded"
  | "attackDamageNeeded"
  | "afterDamage"
  | "turnStartDamageNeeded"
  | "turnStartDamageSaveNeeded"
  | "escapeCheckNeeded"
  | "cleaned";

const AFTER_HIT_HOLES = [
  "TargetChoice",
  "AttackRoll",
  "InterruptDecision",
  "SaveOutcome",
  "AttackDamageRoll",
  "TurnStartDamageRoll",
  "TurnStartSaveOutcome",
  "EscapeAbilityCheck",
] as const;
type AfterHitHole = (typeof AFTER_HIT_HOLES)[number];

type AfterHitSpellsState = {
  readonly scenario: AfterHitScenario;
  readonly phase: AfterHitPhase;
  readonly targetHp: number;
  readonly bonusActionAvailable: boolean;
  readonly slotExpended: boolean;
  readonly freeCastUsesRemaining: number;
  readonly levelOnePlusCastCommitted: boolean;
  readonly concentrationActive: boolean;
  readonly targetRestrained: boolean;
  readonly searingBurning: boolean;
  readonly shiningIlluminated: boolean;
  readonly holes: readonly AfterHitHole[];
  readonly lastResult: "init" | "needsHoles" | "resolved" | "invalid";
};

type InterruptChoiceFill = Extract<
  Extract<
    Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
    { readonly kind: "resolve" }
  >["choice"],
  { readonly kind: "castAttackHitBonusActionSpell" }
>;

type PendingAfterHitChoice = {
  readonly procedureRef: InterruptChoiceFill["procedureRef"];
  readonly invocation: BattleSelectedSpellInvocation;
  readonly initialHoles: readonly BattleHole[];
};

type PendingInvocation =
  | { readonly tag: "none" }
  | {
      readonly tag: "targetChoice";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
    }
  | {
      readonly tag: "attackRoll";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
    }
  | {
      readonly tag: "afterHitChoice";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
      readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
      readonly interruptHole: Extract<
        BattleHole,
        { readonly kind: "interruptDecision" }
      >;
    }
  | {
      readonly tag: "ensnaringSave";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
      readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
      readonly interruptHole: Extract<
        BattleHole,
        { readonly kind: "interruptDecision" }
      >;
      readonly choice: PendingAfterHitChoice;
    }
  | {
      readonly tag: "attackDamage";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
      readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
      readonly riderDice: number;
    }
  | {
      readonly tag: "turnStartDamage";
      readonly sourceBattle: BattleState;
    }
  | {
      readonly tag: "turnStartDamageAndSave";
      readonly sourceBattle: BattleState;
    }
  | {
      readonly tag: "escapeCheck";
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
      >;
    };

type AfterHitRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly scenario: AfterHitScenario;
  readonly phase: AfterHitPhase;
  readonly holes: readonly BattleHole[];
  readonly pending: PendingInvocation;
  readonly route: readonly ReducerRouteEvent[];
  readonly lastResult: "init" | "needsHoles" | "resolved";
};

const AFTER_HIT_TARGET_INITIAL_HP = 30;

type AfterHitRouteSurface =
  | "fresh"
  | "interruptDecision"
  | "saveGatedInterruptDecision"
  | "slotSpend"
  | "freeCastSpend"
  | "saveGatedSlotAndActionEconomySpend"
  | "attackDamage"
  | "saveGatedCondition"
  | "saveGatedConcentration"
  | "turnStartDamage"
  | "turnStartSaveCleanup"
  | "escapeCheck"
  | "escapeConditionCleanup"
  | "escapeConcentrationCleanup"
  | "illuminationEffect"
  | "illuminationConcentration"
  | "illuminationConcentrationBreak"
  | "illuminationEffectCleanup";

type AfterHitRouteState = {
  readonly surface: AfterHitRouteSurface;
  readonly route: readonly ReducerRouteEvent[];
};
type NonStartReducerRouteEvent = Exclude<
  ReducerRouteEvent,
  { readonly kind: "startBattle" }
>;

const AFTER_HIT_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  InterruptDecisionRouteSurface: "interruptDecision",
  SaveGatedInterruptDecisionRouteSurface: "saveGatedInterruptDecision",
  SlotSpendRouteSurface: "slotSpend",
  FreeCastSpendRouteSurface: "freeCastSpend",
  SaveGatedSlotAndActionEconomySpendRouteSurface:
    "saveGatedSlotAndActionEconomySpend",
  AttackDamageRouteSurface: "attackDamage",
  SaveGatedConditionRouteSurface: "saveGatedCondition",
  SaveGatedConcentrationRouteSurface: "saveGatedConcentration",
  TurnStartDamageRouteSurface: "turnStartDamage",
  TurnStartSaveCleanupRouteSurface: "turnStartSaveCleanup",
  EscapeCheckRouteSurface: "escapeCheck",
  EscapeConditionCleanupRouteSurface: "escapeConditionCleanup",
  EscapeConcentrationCleanupRouteSurface: "escapeConcentrationCleanup",
  IlluminationEffectRouteSurface: "illuminationEffect",
  IlluminationConcentrationRouteSurface: "illuminationConcentration",
  IlluminationConcentrationBreakRouteSurface: "illuminationConcentrationBreak",
  IlluminationEffectCleanupRouteSurface: "illuminationEffectCleanup",
} as const satisfies Readonly<Record<string, AfterHitRouteSurface>>;

const afterHitRouteDriverSchema = {
  init: {},
  doRouteInterruptDecision: {},
  doRouteSaveGatedInterruptDecision: {},
  doRouteSlotSpend: {},
  doRouteFreeCastSpend: {},
  doRouteSaveGatedSlotAndActionEconomySpend: {},
  doRouteAttackDamage: {},
  doRouteSaveGatedCondition: {},
  doRouteSaveGatedConcentration: {},
  doRouteTurnStartDamage: {},
  doRouteTurnStartSaveCleanup: {},
  doRouteEscapeCheck: {},
  doRouteEscapeConditionCleanup: {},
  doRouteEscapeConcentrationCleanup: {},
  doRouteIlluminationEffect: {},
  doRouteIlluminationConcentration: {},
  doRouteIlluminationConcentrationBreak: {},
  doRouteIlluminationEffectCleanup: {},
  step: {},
} as const;
type AfterHitRouteAction = keyof typeof afterHitRouteDriverSchema;
type AfterHitRouteStepAction = Exclude<AfterHitRouteAction, "init" | "step">;

const AFTER_HIT_ROUTE_STEP_ACTIONS = [
  "doRouteInterruptDecision",
  "doRouteSaveGatedInterruptDecision",
  "doRouteSlotSpend",
  "doRouteFreeCastSpend",
  "doRouteSaveGatedSlotAndActionEconomySpend",
  "doRouteAttackDamage",
  "doRouteSaveGatedCondition",
  "doRouteSaveGatedConcentration",
  "doRouteTurnStartDamage",
  "doRouteTurnStartSaveCleanup",
  "doRouteEscapeCheck",
  "doRouteEscapeConditionCleanup",
  "doRouteEscapeConcentrationCleanup",
  "doRouteIlluminationEffect",
  "doRouteIlluminationConcentration",
  "doRouteIlluminationConcentrationBreak",
  "doRouteIlluminationEffectCleanup",
] as const satisfies ReadonlyArray<AfterHitRouteStepAction>;

type AfterHitRouteHole = MembersOf<
  BattleHole["kind"],
  "abilityCheck" | "interruptDecision" | "rolledDice" | "savingThrowOutcome"
>;
type RouteHole = { readonly kind: AfterHitRouteHole };

function routeHoles(
  ...kinds: readonly AfterHitRouteHole[]
): readonly RouteHole[] {
  return kinds.map((kind) => ({ kind }));
}

const AFTER_HIT_ROUTE_SUBJECT =
  "afterHitSpell" satisfies ReducerRouteSubjectFamily;

function afterHitStartRoute(): ReducerRouteEvent {
  return reducerRouteStartBattle("battleActionEconomy");
}

function afterHitDiscoverRoute(
  holes: readonly RouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return reducerRouteDiscoverBattleActs({
    subject: AFTER_HIT_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function afterHitResolveRoute(
  fill: ReducerRouteFill,
  holes: readonly RouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return reducerRouteResolveBattleSubject({
    subject: AFTER_HIT_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function afterHitResolveRouteWithoutFill(
  holes: readonly RouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return reducerRouteResolveBattleSubjectWithoutFill({
    subject: AFTER_HIT_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function routeState(
  surface: AfterHitRouteSurface,
  route: readonly ReducerRouteEvent[],
): AfterHitRouteState {
  return { surface, route };
}

function afterHitRouteForAction(
  action: AfterHitRouteStepAction,
): AfterHitRouteState {
  const interruptDecision = routeHoles("interruptDecision");
  const rolledDice = routeHoles("rolledDice");
  const savingThrowOutcome = routeHoles("savingThrowOutcome");
  const abilityCheck = routeHoles("abilityCheck");
  const noHoles = routeHoles();

  const states = {
    doRouteInterruptDecision: routeState("interruptDecision", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(interruptDecision, "battleInterruptStack"),
      afterHitResolveRoute(
        "interruptDecision",
        rolledDice,
        "battleInterruptStack",
      ),
    ]),
    doRouteSaveGatedInterruptDecision: routeState(
      "saveGatedInterruptDecision",
      [
        afterHitStartRoute(),
        afterHitDiscoverRoute(interruptDecision, "battleInterruptStack"),
        afterHitResolveRoute(
          "interruptDecision",
          savingThrowOutcome,
          "battleInterruptStack",
        ),
      ],
    ),
    doRouteSlotSpend: routeState("slotSpend", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(
        interruptDecision,
        "battleSpellSlotAndActionEconomy",
      ),
      afterHitResolveRoute(
        "interruptDecision",
        rolledDice,
        "battleSpellSlotAndActionEconomy",
      ),
    ]),
    doRouteFreeCastSpend: routeState("freeCastSpend", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(interruptDecision, "battleFeatureResource"),
      afterHitResolveRoute(
        "interruptDecision",
        rolledDice,
        "battleFeatureResource",
      ),
    ]),
    doRouteSaveGatedSlotAndActionEconomySpend: routeState(
      "saveGatedSlotAndActionEconomySpend",
      [
        afterHitStartRoute(),
        afterHitDiscoverRoute(
          savingThrowOutcome,
          "battleSpellSlotAndActionEconomy",
        ),
        afterHitResolveRoute(
          "savingThrowOutcome",
          rolledDice,
          "battleSpellSlotAndActionEconomy",
        ),
      ],
    ),
    doRouteAttackDamage: routeState("attackDamage", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(rolledDice, "battleHitPoint"),
      afterHitResolveRoute("rolledDice", noHoles, "battleHitPoint"),
    ]),
    doRouteSaveGatedCondition: routeState("saveGatedCondition", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(savingThrowOutcome, "battleConditionLifecycle"),
      afterHitResolveRoute(
        "savingThrowOutcome",
        rolledDice,
        "battleConditionLifecycle",
      ),
    ]),
    doRouteSaveGatedConcentration: routeState("saveGatedConcentration", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(savingThrowOutcome, "battleConcentration"),
      afterHitResolveRoute(
        "savingThrowOutcome",
        rolledDice,
        "battleConcentration",
      ),
    ]),
    doRouteTurnStartDamage: routeState("turnStartDamage", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(rolledDice, "battleActiveEffect"),
      afterHitResolveRoute("rolledDice", abilityCheck, "battleHitPoint"),
    ]),
    doRouteTurnStartSaveCleanup: routeState("turnStartSaveCleanup", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(
        routeHoles("rolledDice", "savingThrowOutcome"),
        "battleActiveEffect",
      ),
      afterHitResolveRoute("rolledDice", savingThrowOutcome, "battleHitPoint"),
      afterHitResolveRoute("savingThrowOutcome", noHoles, "battleActiveEffect"),
    ]),
    doRouteEscapeCheck: routeState("escapeCheck", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(abilityCheck, "battleAbilityCheck"),
      afterHitResolveRoute("abilityCheck", noHoles, "battleAbilityCheck"),
    ]),
    doRouteEscapeConditionCleanup: routeState("escapeConditionCleanup", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(abilityCheck, "battleConditionLifecycle"),
      afterHitResolveRoute("abilityCheck", noHoles, "battleConditionLifecycle"),
    ]),
    doRouteEscapeConcentrationCleanup: routeState(
      "escapeConcentrationCleanup",
      [
        afterHitStartRoute(),
        afterHitDiscoverRoute(abilityCheck, "battleConcentration"),
        afterHitResolveRoute("abilityCheck", noHoles, "battleConcentration"),
      ],
    ),
    doRouteIlluminationEffect: routeState("illuminationEffect", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(interruptDecision, "battleActiveEffect"),
      afterHitResolveRoute(
        "interruptDecision",
        rolledDice,
        "battleActiveEffect",
      ),
    ]),
    doRouteIlluminationConcentration: routeState("illuminationConcentration", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(interruptDecision, "battleConcentration"),
      afterHitResolveRoute(
        "interruptDecision",
        rolledDice,
        "battleConcentration",
      ),
    ]),
    doRouteIlluminationConcentrationBreak: routeState(
      "illuminationConcentrationBreak",
      [
        afterHitStartRoute(),
        afterHitDiscoverRoute(noHoles, "battleConcentration"),
        afterHitResolveRouteWithoutFill(noHoles, "battleConcentration"),
      ],
    ),
    doRouteIlluminationEffectCleanup: routeState("illuminationEffectCleanup", [
      afterHitStartRoute(),
      afterHitDiscoverRoute(noHoles, "battleActiveEffect"),
      afterHitResolveRouteWithoutFill(noHoles, "battleActiveEffect"),
    ]),
  } as const satisfies Readonly<
    Record<AfterHitRouteStepAction, AfterHitRouteState>
  >;

  return states[action];
}

function observeAfterHitPublicRouteSurface(
  action: AfterHitRouteStepAction,
): AfterHitRouteState {
  const observers = {
    doRouteInterruptDecision: observeAfterHitInterruptDecisionRoute,
    doRouteSaveGatedInterruptDecision:
      observeAfterHitSaveGatedInterruptDecisionRoute,
    doRouteSlotSpend: observeAfterHitSlotSpendRoute,
    doRouteFreeCastSpend: observeAfterHitFreeCastSpendRoute,
    doRouteSaveGatedSlotAndActionEconomySpend:
      observeAfterHitSaveGatedSlotAndActionEconomySpendRoute,
    doRouteAttackDamage: observeAfterHitAttackDamageRoute,
    doRouteSaveGatedCondition: observeAfterHitSaveGatedConditionRoute,
    doRouteSaveGatedConcentration: observeAfterHitSaveGatedConcentrationRoute,
    doRouteTurnStartDamage: observeAfterHitTurnStartDamageRoute,
    doRouteTurnStartSaveCleanup: observeAfterHitTurnStartSaveCleanupRoute,
    doRouteEscapeCheck: observeAfterHitEscapeCheckRoute,
    doRouteEscapeConditionCleanup: observeAfterHitEscapeConditionCleanupRoute,
    doRouteEscapeConcentrationCleanup:
      observeAfterHitEscapeConcentrationCleanupRoute,
    doRouteIlluminationEffect: observeAfterHitIlluminationEffectRoute,
    doRouteIlluminationConcentration:
      observeAfterHitIlluminationConcentrationRoute,
    doRouteIlluminationConcentrationBreak:
      observeAfterHitIlluminationConcentrationBreakRoute,
    doRouteIlluminationEffectCleanup:
      observeAfterHitIlluminationEffectCleanupRoute,
  } as const satisfies Readonly<
    Record<AfterHitRouteStepAction, () => AfterHitRuntimeState>
  >;
  return afterHitRouteObservedFromPublicEvents(action, observers[action]());
}

function afterHitRouteObservedFromPublicEvents(
  action: AfterHitRouteStepAction,
  observed: AfterHitRuntimeState,
): AfterHitRouteState {
  const expected = afterHitRouteForAction(action);
  const observedRoute = expected.route.map((event) =>
    event.kind === "startBattle"
      ? event
      : requireObservedAfterHitRouteEvent(observed.route, event, action),
  );
  return routeState(expected.surface, observedRoute);
}

function requireObservedAfterHitRouteEvent(
  events: readonly ReducerRouteEvent[],
  expected: NonStartReducerRouteEvent,
  action: AfterHitRouteStepAction,
): ReducerRouteEvent {
  const observed = events.find((event) =>
    reducerRouteEventMatchesAfterHitProjection(event, expected),
  );
  if (observed === undefined) {
    throw new Error(
      `Expected public after-hit route event for ${action}: ${JSON.stringify(expected)} in ${JSON.stringify(events)}`,
    );
  }
  if (observed.kind === "startBattle") {
    throw new Error("Unexpected startBattle event matched after-hit route.");
  }
  return observed;
}

function reducerRouteEventMatchesAfterHitProjection(
  observed: ReducerRouteEvent,
  expected: NonStartReducerRouteEvent,
): boolean {
  if (observed.kind === "startBattle") return false;
  if (observed.kind !== expected.kind) return false;
  if (observed.subject !== expected.subject) return false;
  if (observed.owner !== expected.owner) return false;
  if (!routeHolesEqual(observed.holes, expected.holes)) return false;
  if ("fill" in expected) {
    return "fill" in observed && routeFillsEqual(observed.fill, expected.fill);
  }
  return !("fill" in observed);
}

function routeHolesEqual(
  left: readonly ReducerRouteHole[],
  right: readonly ReducerRouteHole[],
): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function routeFillsEqual(
  left: ReducerRouteFill,
  right: ReducerRouteFill,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function appendObservedRouteEvents(
  route: readonly ReducerRouteEvent[],
  events: readonly BattleReducerRouteEvent[] | undefined,
): readonly ReducerRouteEvent[] {
  return events === undefined ? route : [...route, ...events];
}

function afterHitChoiceReady(
  scenario: Exclude<AfterHitScenario, "done">,
): AfterHitRuntimeState {
  return fillHitAttackRoll(
    fillTargetChoice(discoverWeaponHit(initialRuntimeState(scenario))),
  );
}

function afterHitDivineSlotDamageReady(): AfterHitRuntimeState {
  return chooseAfterHitDamageSpell(
    afterHitChoiceReady("divineSmiteSlot"),
    divineSmiteUnitId,
    2,
  );
}

function afterHitDivineFreeCastDamageReady(): AfterHitRuntimeState {
  return chooseAfterHitDamageSpell(
    afterHitChoiceReady("divineSmiteFreeCast"),
    divineSmiteUnitId,
    2,
    { invocationTag: "spellAccessFreeCast" },
  );
}

function afterHitEnsnaringSaveReady(): AfterHitRuntimeState {
  return chooseEnsnaringStrike(
    afterHitChoiceReady("ensnaringStrikeFailedSave"),
  );
}

function afterHitEnsnaringDamageReady(): AfterHitRuntimeState {
  return fillEnsnaringSave(afterHitEnsnaringSaveReady(), false);
}

function afterHitEnsnaringAfterDamage(): AfterHitRuntimeState {
  return fillAttackDamage(afterHitEnsnaringDamageReady(), 4);
}

function afterHitEnsnaringEscapeReady(): AfterHitRuntimeState {
  return fillEnsnaringStartTurnDamage(
    discoverTurnStartDamage(afterHitEnsnaringAfterDamage()),
    1,
  );
}

function afterHitSearingAfterDamage(): AfterHitRuntimeState {
  return fillAttackDamage(
    chooseAfterHitDamageSpell(
      afterHitChoiceReady("searingSmiteHit"),
      searingSmiteUnitId,
      3,
    ),
    4,
    1,
  );
}

function afterHitShiningAfterDamage(): AfterHitRuntimeState {
  return fillAttackDamage(
    chooseAfterHitDamageSpell(
      afterHitChoiceReady("shiningSmiteHit"),
      shiningSmiteUnitId,
      3,
    ),
    4,
    1,
  );
}

function expectObservedHoleKinds(
  state: AfterHitRuntimeState,
  expected: readonly BattleHole["kind"][],
): void {
  expect(state.holes.map((hole) => hole.kind).sort()).toEqual(
    [...expected].sort(),
  );
}

function observeAfterHitInterruptDecisionRoute(): AfterHitRuntimeState {
  const state = afterHitDivineSlotDamageReady();
  expectObservedHoleKinds(state, ["rolledDice"]);
  expect(state.pending.tag).toBe("attackDamage");
  return state;
}

function observeAfterHitSaveGatedInterruptDecisionRoute(): AfterHitRuntimeState {
  const ready = afterHitEnsnaringSaveReady();
  expectObservedHoleKinds(ready, ["savingThrowOutcome"]);
  expect(ready.pending.tag).toBe("ensnaringSave");
  return fillEnsnaringSave(ready, false);
}

function observeAfterHitSlotSpendRoute(): AfterHitRuntimeState {
  const state = afterHitDivineSlotDamageReady();
  expect(casterSlotExpended(state.battle.state)).toBe(true);
  expect(state.battle.state.currentTurnResources.currentHasBonusAction).toBe(
    false,
  );
  expectObservedHoleKinds(state, ["rolledDice"]);
  return state;
}

function observeAfterHitFreeCastSpendRoute(): AfterHitRuntimeState {
  const state = afterHitDivineFreeCastDamageReady();
  expect(casterSlotExpended(state.battle.state)).toBe(false);
  expect(paladinsSmiteUsesRemaining(state.battle)).toBe(0);
  expect(state.battle.state.currentTurnResources.currentHasBonusAction).toBe(
    false,
  );
  expectObservedHoleKinds(state, ["rolledDice"]);
  return state;
}

function observeAfterHitSaveGatedSlotAndActionEconomySpendRoute(): AfterHitRuntimeState {
  const state = afterHitEnsnaringDamageReady();
  expect(casterSlotExpended(state.battle.state)).toBe(true);
  expect(state.battle.state.currentTurnResources.currentHasBonusAction).toBe(
    false,
  );
  expectObservedHoleKinds(state, ["rolledDice"]);
  return state;
}

function observeAfterHitAttackDamageRoute(): AfterHitRuntimeState {
  const state = fillAttackDamage(afterHitDivineSlotDamageReady(), 4, 1);
  expect(afterHitProjection(state).targetHp).toBeLessThan(
    AFTER_HIT_TARGET_INITIAL_HP,
  );
  expectObservedHoleKinds(state, []);
  return state;
}

function observeAfterHitSaveGatedConditionRoute(): AfterHitRuntimeState {
  const state = afterHitEnsnaringDamageReady();
  expect(afterHitProjection(state).targetRestrained).toBe(true);
  expectObservedHoleKinds(state, ["rolledDice"]);
  return state;
}

function observeAfterHitSaveGatedConcentrationRoute(): AfterHitRuntimeState {
  const state = afterHitEnsnaringDamageReady();
  expect(afterHitProjection(state).concentrationActive).toBe(true);
  expectObservedHoleKinds(state, ["rolledDice"]);
  return state;
}

function observeAfterHitTurnStartDamageRoute(): AfterHitRuntimeState {
  const state = discoverTurnStartDamage(afterHitEnsnaringAfterDamage());
  expectObservedHoleKinds(state, ["rolledDice"]);
  const next = fillEnsnaringStartTurnDamage(state, 1);
  expect(afterHitProjection(next).targetHp).toBeLessThan(
    AFTER_HIT_TARGET_INITIAL_HP,
  );
  expectObservedHoleKinds(next, ["abilityCheck"]);
  return next;
}

function observeAfterHitTurnStartSaveCleanupRoute(): AfterHitRuntimeState {
  const state = discoverTurnStartDamageAndSave(afterHitSearingAfterDamage());
  expectObservedHoleKinds(state, ["rolledDice", "savingThrowOutcome"]);
  const cleaned = fillSearingStartTurnDamageAndSave(state, 1);
  expect(afterHitProjection(cleaned).searingBurning).toBe(false);
  expect(afterHitProjection(cleaned).concentrationActive).toBe(false);
  expectObservedHoleKinds(cleaned, []);
  return cleaned;
}

function observeAfterHitEscapeCheckRoute(): AfterHitRuntimeState {
  const state = afterHitEnsnaringEscapeReady();
  expect(state.pending.tag).toBe("escapeCheck");
  expectObservedHoleKinds(state, ["abilityCheck"]);
  return fillEnsnaringEscapeCheck(state);
}

function observeAfterHitEscapeConditionCleanupRoute(): AfterHitRuntimeState {
  const state = fillEnsnaringEscapeCheck(afterHitEnsnaringEscapeReady());
  expect(afterHitProjection(state).targetRestrained).toBe(false);
  expectObservedHoleKinds(state, []);
  return state;
}

function observeAfterHitEscapeConcentrationCleanupRoute(): AfterHitRuntimeState {
  const state = fillEnsnaringEscapeCheck(afterHitEnsnaringEscapeReady());
  expect(afterHitProjection(state).concentrationActive).toBe(false);
  expectObservedHoleKinds(state, []);
  return state;
}

function observeAfterHitIlluminationEffectRoute(): AfterHitRuntimeState {
  const state = afterHitShiningAfterDamage();
  expect(afterHitProjection(state).shiningIlluminated).toBe(true);
  expectObservedHoleKinds(state, []);
  return state;
}

function observeAfterHitIlluminationConcentrationRoute(): AfterHitRuntimeState {
  const state = afterHitShiningAfterDamage();
  expect(afterHitProjection(state).concentrationActive).toBe(true);
  expectObservedHoleKinds(state, []);
  return state;
}

function observeAfterHitIlluminationConcentrationBreakRoute(): AfterHitRuntimeState {
  const state = breakConcentration(afterHitShiningAfterDamage());
  expect(afterHitProjection(state).concentrationActive).toBe(false);
  expectObservedHoleKinds(state, []);
  return state;
}

function observeAfterHitIlluminationEffectCleanupRoute(): AfterHitRuntimeState {
  const state = breakConcentration(afterHitShiningAfterDamage());
  expect(afterHitProjection(state).shiningIlluminated).toBe(false);
  expectObservedHoleKinds(state, []);
  return state;
}

function createAfterHitSpellsRouteDriver() {
  return defineDriver(afterHitRouteDriverSchema, () => {
    let state = routeState("fresh", [afterHitStartRoute()]);
    const transition = (action: AfterHitRouteStepAction): void => {
      state = observeAfterHitPublicRouteSurface(action);
    };

    return {
      init: () => {
        state = routeState("fresh", [afterHitStartRoute()]);
      },
      doRouteInterruptDecision: () => transition("doRouteInterruptDecision"),
      doRouteSaveGatedInterruptDecision: () =>
        transition("doRouteSaveGatedInterruptDecision"),
      doRouteSlotSpend: () => transition("doRouteSlotSpend"),
      doRouteFreeCastSpend: () => transition("doRouteFreeCastSpend"),
      doRouteSaveGatedSlotAndActionEconomySpend: () =>
        transition("doRouteSaveGatedSlotAndActionEconomySpend"),
      doRouteAttackDamage: () => transition("doRouteAttackDamage"),
      doRouteSaveGatedCondition: () => transition("doRouteSaveGatedCondition"),
      doRouteSaveGatedConcentration: () =>
        transition("doRouteSaveGatedConcentration"),
      doRouteTurnStartDamage: () => transition("doRouteTurnStartDamage"),
      doRouteTurnStartSaveCleanup: () =>
        transition("doRouteTurnStartSaveCleanup"),
      doRouteEscapeCheck: () => transition("doRouteEscapeCheck"),
      doRouteEscapeConditionCleanup: () =>
        transition("doRouteEscapeConditionCleanup"),
      doRouteEscapeConcentrationCleanup: () =>
        transition("doRouteEscapeConcentrationCleanup"),
      doRouteIlluminationEffect: () => transition("doRouteIlluminationEffect"),
      doRouteIlluminationConcentration: () =>
        transition("doRouteIlluminationConcentration"),
      doRouteIlluminationConcentrationBreak: () =>
        transition("doRouteIlluminationConcentrationBreak"),
      doRouteIlluminationEffectCleanup: () =>
        transition("doRouteIlluminationEffectCleanup"),
      step: () => {},
      getState: () => state,
    };
  });
}

const afterHitRouteStateCheck = stateCheck(
  normalizeAfterHitRouteQuintState,
  compareAfterHitRouteStates,
);

const AFTER_HIT_SCENARIO_BY_TAG = {
  DivineSmiteSlot: "divineSmiteSlot",
  DivineSmiteFreeCast: "divineSmiteFreeCast",
  EnsnaringStrikeFailedSave: "ensnaringStrikeFailedSave",
  EnsnaringStrikeSuccessfulSave: "ensnaringStrikeSuccessfulSave",
  SearingSmiteHit: "searingSmiteHit",
  ShiningSmiteHit: "shiningSmiteHit",
  Done: "done",
} as const satisfies Readonly<Record<string, AfterHitScenario>>;

const AFTER_HIT_PHASE_BY_TAG = {
  Fresh: "fresh",
  TargetChoiceNeeded: "targetChoiceNeeded",
  AttackRollNeeded: "attackRollNeeded",
  AfterHitChoiceNeeded: "afterHitChoiceNeeded",
  EnsnaringSaveNeeded: "ensnaringSaveNeeded",
  AttackDamageNeeded: "attackDamageNeeded",
  AfterDamage: "afterDamage",
  TurnStartDamageNeeded: "turnStartDamageNeeded",
  TurnStartDamageSaveNeeded: "turnStartDamageSaveNeeded",
  EscapeCheckNeeded: "escapeCheckNeeded",
  Cleaned: "cleaned",
} as const satisfies Readonly<Record<string, AfterHitPhase>>;

const SPELL_FOR_SCENARIO = {
  divineSmiteSlot: divineSmiteUnitId,
  divineSmiteFreeCast: divineSmiteUnitId,
  ensnaringStrikeFailedSave: ensnaringStrikeUnitId,
  ensnaringStrikeSuccessfulSave: ensnaringStrikeUnitId,
  searingSmiteHit: searingSmiteUnitId,
  shiningSmiteHit: shiningSmiteUnitId,
} as const satisfies Readonly<
  Record<Exclude<AfterHitScenario, "done">, string>
>;

const SLOT_LEVEL_FOR_SCENARIO = {
  divineSmiteSlot: 1,
  divineSmiteFreeCast: 1,
  ensnaringStrikeFailedSave: 1,
  ensnaringStrikeSuccessfulSave: 1,
  searingSmiteHit: 3,
  shiningSmiteHit: 3,
} as const satisfies Readonly<
  Record<Exclude<AfterHitScenario, "done">, 1 | 2 | 3>
>;

const afterHitDriverSchema = {
  init: {},
  doDiscoverWeaponHit: {},
  doFillTargetChoice: {},
  doFillHitAttackRoll: {},
  doChooseDivineSmiteSlot: {},
  doChooseDivineSmiteFreeCast: {},
  doChooseEnsnaringStrike: {},
  doFillEnsnaringFailedSave: {},
  doFillEnsnaringSuccessfulSave: {},
  doChooseSearingSmite: {},
  doChooseShiningSmite: {},
  doFillDivineSmiteDamage: {
    weaponDiePip: mbtPickSchemas.int,
    smiteDiePip: mbtPickSchemas.int,
  },
  doFillEnsnaringWeaponDamage: {
    weaponDiePip: mbtPickSchemas.int,
  },
  doFillSearingSmiteDamage: {
    weaponDiePip: mbtPickSchemas.int,
    smiteDiePip: mbtPickSchemas.int,
  },
  doFillShiningSmiteDamage: {
    weaponDiePip: mbtPickSchemas.int,
    smiteDiePip: mbtPickSchemas.int,
  },
  doDiscoverEnsnaringStartTurnDamage: {},
  doFillEnsnaringStartTurnDamage: {
    damageDiePip: mbtPickSchemas.int,
  },
  doFillEnsnaringEscapeCheck: {},
  doDiscoverSearingStartTurnDamageAndSave: {},
  doFillSearingStartTurnDamageAndSave: {
    damageDiePip: mbtPickSchemas.int,
  },
  doBreakShiningConcentration: {},
  doStartDivineSmiteFreeCast: {},
  doStartEnsnaringFailedSave: {},
  doStartEnsnaringSuccessfulSave: {},
  doStartSearingSmite: {},
  doStartShiningSmite: {},
  doFinish: {},
  step: {},
} as const;
type AfterHitDriverAction = keyof typeof afterHitDriverSchema;

const REQUIRED_AFTER_HIT_ACTIONS = [
  "doFillDivineSmiteDamage",
  "doFillEnsnaringWeaponDamage",
  "doDiscoverEnsnaringStartTurnDamage",
  "doFillEnsnaringStartTurnDamage",
  "doFillEnsnaringEscapeCheck",
  "doFillSearingSmiteDamage",
  "doDiscoverSearingStartTurnDamageAndSave",
  "doFillSearingStartTurnDamageAndSave",
  "doChooseShiningSmite",
  "doFillShiningSmiteDamage",
  "doBreakShiningConcentration",
  "doFinish",
] as const satisfies ReadonlyArray<AfterHitDriverAction>;

function createAfterHitSpellsDriver(
  options: { readonly actionLog?: string[] } = {},
) {
  return defineDriver(afterHitDriverSchema, () => {
    let state = initialRuntimeState("divineSmiteSlot", "init");
    const transition = (
      action: AfterHitDriverAction,
      nextState: () => AfterHitRuntimeState,
    ): void => {
      state = nextState();
      if (action !== "step") {
        options.actionLog?.push(action);
      }
    };
    return {
      init: () => {
        state = initialRuntimeState("divineSmiteSlot", "init");
      },
      doDiscoverWeaponHit: () => {
        transition("doDiscoverWeaponHit", () => discoverWeaponHit(state));
      },
      doFillTargetChoice: () => {
        transition("doFillTargetChoice", () => fillTargetChoice(state));
      },
      doFillHitAttackRoll: () => {
        transition("doFillHitAttackRoll", () => fillHitAttackRoll(state));
      },
      doChooseDivineSmiteSlot: () => {
        transition("doChooseDivineSmiteSlot", () =>
          chooseAfterHitDamageSpell(state, divineSmiteUnitId, 2),
        );
      },
      doChooseDivineSmiteFreeCast: () => {
        transition("doChooseDivineSmiteFreeCast", () =>
          chooseAfterHitDamageSpell(state, divineSmiteUnitId, 2, {
            invocationTag: "spellAccessFreeCast",
          }),
        );
      },
      doChooseEnsnaringStrike: () => {
        transition("doChooseEnsnaringStrike", () =>
          chooseEnsnaringStrike(state),
        );
      },
      doFillEnsnaringFailedSave: () => {
        transition("doFillEnsnaringFailedSave", () =>
          fillEnsnaringSave(state, false),
        );
      },
      doFillEnsnaringSuccessfulSave: () => {
        transition("doFillEnsnaringSuccessfulSave", () =>
          fillEnsnaringSave(state, true),
        );
      },
      doChooseSearingSmite: () => {
        transition("doChooseSearingSmite", () =>
          chooseAfterHitDamageSpell(state, searingSmiteUnitId, 3),
        );
      },
      doChooseShiningSmite: () => {
        transition("doChooseShiningSmite", () =>
          chooseAfterHitDamageSpell(state, shiningSmiteUnitId, 3),
        );
      },
      doFillDivineSmiteDamage: (input: {
        readonly weaponDiePip: number;
        readonly smiteDiePip: number;
      }) => {
        transition("doFillDivineSmiteDamage", () =>
          fillAttackDamage(state, input.weaponDiePip, input.smiteDiePip),
        );
      },
      doFillEnsnaringWeaponDamage: (input: {
        readonly weaponDiePip: number;
      }) => {
        transition("doFillEnsnaringWeaponDamage", () =>
          fillAttackDamage(state, input.weaponDiePip),
        );
      },
      doFillSearingSmiteDamage: (input: {
        readonly weaponDiePip: number;
        readonly smiteDiePip: number;
      }) => {
        transition("doFillSearingSmiteDamage", () =>
          fillAttackDamage(state, input.weaponDiePip, input.smiteDiePip),
        );
      },
      doFillShiningSmiteDamage: (input: {
        readonly weaponDiePip: number;
        readonly smiteDiePip: number;
      }) => {
        transition("doFillShiningSmiteDamage", () =>
          fillAttackDamage(state, input.weaponDiePip, input.smiteDiePip),
        );
      },
      doDiscoverEnsnaringStartTurnDamage: () => {
        transition("doDiscoverEnsnaringStartTurnDamage", () =>
          discoverTurnStartDamage(state),
        );
      },
      doFillEnsnaringStartTurnDamage: (input: {
        readonly damageDiePip: number;
      }) => {
        transition("doFillEnsnaringStartTurnDamage", () =>
          fillEnsnaringStartTurnDamage(state, input.damageDiePip),
        );
      },
      doFillEnsnaringEscapeCheck: () => {
        transition("doFillEnsnaringEscapeCheck", () =>
          fillEnsnaringEscapeCheck(state),
        );
      },
      doDiscoverSearingStartTurnDamageAndSave: () => {
        transition("doDiscoverSearingStartTurnDamageAndSave", () =>
          discoverTurnStartDamageAndSave(state),
        );
      },
      doFillSearingStartTurnDamageAndSave: (input: {
        readonly damageDiePip: number;
      }) => {
        transition("doFillSearingStartTurnDamageAndSave", () =>
          fillSearingStartTurnDamageAndSave(state, input.damageDiePip),
        );
      },
      doBreakShiningConcentration: () => {
        transition("doBreakShiningConcentration", () =>
          breakConcentration(state),
        );
      },
      doStartDivineSmiteFreeCast: () => {
        transition("doStartDivineSmiteFreeCast", () =>
          initialRuntimeState("divineSmiteFreeCast"),
        );
      },
      doStartEnsnaringFailedSave: () => {
        transition("doStartEnsnaringFailedSave", () =>
          initialRuntimeState("ensnaringStrikeFailedSave"),
        );
      },
      doStartEnsnaringSuccessfulSave: () => {
        transition("doStartEnsnaringSuccessfulSave", () =>
          initialRuntimeState("ensnaringStrikeSuccessfulSave"),
        );
      },
      doStartSearingSmite: () => {
        transition("doStartSearingSmite", () =>
          initialRuntimeState("searingSmiteHit"),
        );
      },
      doStartShiningSmite: () => {
        transition("doStartShiningSmite", () =>
          initialRuntimeState("shiningSmiteHit"),
        );
      },
      doFinish: () => {
        transition("doFinish", () => ({
          ...state,
          scenario: "done",
          phase: "cleaned",
          lastResult: "resolved",
        }));
      },
      step: () => {},
      getState: () => afterHitProjection(state),
    };
  });
}

const afterHitStateCheck = stateCheck(
  normalizeAfterHitQuintState,
  compareAfterHitStates,
);

describe("After-hit damage riders MBT parity", () => {
  it(
    "matches after-hit activation, spend, timed payloads, escape checks, and cleanup",
    async () => {
      const actionLog: string[] = [];
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-after-hit-damage-riders.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createAfterHitSpellsDriver({ actionLog }),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(60),
        stateCheck: afterHitStateCheck,
      });
      for (const action of REQUIRED_AFTER_HIT_ACTIONS) {
        expect(actionLog).toContain(action);
      }
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes after-hit rider owner surfaces without a whole-battle accumulator",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-after-hit-damage-riders.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createAfterHitSpellsRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(AFTER_HIT_ROUTE_STEP_ACTIONS.length),
        stateCheck: afterHitRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(
  scenario: Exclude<AfterHitScenario, "done">,
  lastResult: "init" | "resolved" = "resolved",
): AfterHitRuntimeState {
  return {
    battle:
      scenario === "divineSmiteFreeCast"
        ? paladinFreeCastBattle()
        : spellBattle({
            preparedSpells: [spellRecord(SPELL_FOR_SCENARIO[scenario])],
            spellSlots: [
              {
                spellLevel: SLOT_LEVEL_FOR_SCENARIO[scenario],
                count: 1,
              },
            ],
            attack: zeroAbilityWeaponAttack("weapon_longsword"),
            targetHp: 30,
            targetMaxHp: 30,
          }),
    scenario,
    phase: "fresh",
    holes: [],
    pending: { tag: "none" },
    route: [afterHitStartRoute()],
    lastResult,
  };
}

function paladinFreeCastBattle(): BattleRuntimeSession {
  const resource = paladinsSmiteResource();
  return startBattleSessionRight({
    battleId: battleId("after-hit-damage-riders-paladin-free-cast"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Paladin",
        initiative: 20,
        classLevels: [{ className: "paladin", level: 2 }],
        resources: [resource],
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
        spellcasting: {
          ...wizardSpellcasting({
            cantrips: [],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "paladin",
            abilityModifier: 3,
          },
          featurePreparedSpells: [
            {
              sourceUnitId: resource.unit.id,
              spell: spellRecord(divineSmiteUnitId),
            },
          ],
        },
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        currentHp: 30,
        maxHp: 30,
      }),
    ],
  });
}

function discoverWeaponHit(state: AfterHitRuntimeState): AfterHitRuntimeState {
  const subject = weaponAttackSubject(state.battle, "Longsword");
  const result = resolveBattleSubject({
    state: state.battle.state,
    subject,
    fills: [],
  });
  const targetHole = requireResultHole(result, "targetChoice");
  return {
    ...state,
    phase: "targetChoiceNeeded",
    holes: [targetHole],
    pending: { tag: "targetChoice", subject },
    route: appendObservedRouteEvents(state.route, result.routeEvents),
    lastResult: "needsHoles",
  };
}

function fillTargetChoice(state: AfterHitRuntimeState): AfterHitRuntimeState {
  if (state.pending.tag !== "targetChoice") {
    throw new Error("Expected pending after-hit target choice.");
  }
  const targetFill = attackTargetFill(
    requireHole(state.holes, "targetChoice"),
    spellCasterId,
    spellTargetId,
  );
  const result = resolveBattleSubject({
    state: state.battle.state,
    subject: state.pending.subject,
    fills: [targetFill],
  });
  const attackRoll = requireResultHole(result, "attackRoll");
  return {
    ...state,
    phase: "attackRollNeeded",
    holes: [attackRoll],
    pending: {
      tag: "attackRoll",
      subject: state.pending.subject,
      targetFill,
    },
    route: appendObservedRouteEvents(state.route, result.routeEvents),
    lastResult: "needsHoles",
  };
}

function fillHitAttackRoll(state: AfterHitRuntimeState): AfterHitRuntimeState {
  if (state.pending.tag !== "attackRoll") {
    throw new Error("Expected pending after-hit attack roll.");
  }
  const attackFill = attackRollFill(requireHole(state.holes, "attackRoll"), {
    total: 15,
    naturalD20: 10,
  });
  const awaitingInterrupt = requireNeedsHoles(
    resolveBattleSubject({
      state: state.battle.state,
      subject: state.pending.subject,
      fills: [state.pending.targetFill, attackFill],
    }),
    "Expected after-hit attack roll to open an interrupt window.",
  );
  const interruptHole = requireHole(
    awaitingInterrupt.holes,
    "interruptDecision",
  );
  return {
    ...state,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: awaitingInterrupt.state,
    }),
    phase: "afterHitChoiceNeeded",
    holes: [interruptHole],
    pending: {
      tag: "afterHitChoice",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill,
      interruptHole,
    },
    lastResult: "needsHoles",
    route: appendObservedRouteEvents(
      state.route,
      awaitingInterrupt.routeEvents,
    ),
  };
}

function chooseAfterHitDamageSpell(
  state: AfterHitRuntimeState,
  spellId: string,
  riderDice: number,
  options: { readonly invocationTag?: string } = {},
): AfterHitRuntimeState {
  if (state.pending.tag !== "afterHitChoice") {
    throw new Error("Expected pending after-hit choice.");
  }
  const choice = requireAfterHitChoice(state.battle, spellId, options);
  const afterChoice = requireNeedsHoles(
    resolveBattleInterrupt({
      state: state.battle.state,
      fill: interruptDecisionFill(state.pending.interruptHole, {
        kind: "resolve",
        responderId: spellCasterId,
        choice: {
          kind: "castAttackHitBonusActionSpell",
          procedureRef: choice.procedureRef,
          fills: [],
        },
      }),
    }),
    `Expected ${spellId} after-hit choice to request attack damage.`,
  );
  const damageHole = requireHole(afterChoice.holes, "rolledDice");
  return {
    ...state,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: afterChoice.state,
    }),
    phase: "attackDamageNeeded",
    holes: [damageHole],
    pending: {
      tag: "attackDamage",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill: state.pending.attackFill,
      riderDice,
    },
    lastResult: "needsHoles",
    route: appendObservedRouteEvents(state.route, afterChoice.routeEvents),
  };
}

function chooseEnsnaringStrike(
  state: AfterHitRuntimeState,
): AfterHitRuntimeState {
  if (state.pending.tag !== "afterHitChoice") {
    throw new Error("Expected pending Ensnaring Strike choice.");
  }
  const choice = requireAfterHitChoice(state.battle, ensnaringStrikeUnitId);
  const saveHole = requireHole(choice.initialHoles, "savingThrowOutcome");
  return {
    ...state,
    phase: "ensnaringSaveNeeded",
    holes: [saveHole],
    pending: {
      tag: "ensnaringSave",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill: state.pending.attackFill,
      interruptHole: state.pending.interruptHole,
      choice,
    },
    lastResult: "needsHoles",
  };
}

function fillEnsnaringSave(
  state: AfterHitRuntimeState,
  succeeded: boolean,
): AfterHitRuntimeState {
  if (state.pending.tag !== "ensnaringSave") {
    throw new Error("Expected pending Ensnaring Strike saving throw.");
  }
  const saveFill = savingThrowOutcomeFill(
    requireHole(state.holes, "savingThrowOutcome"),
    [{ targetId: spellTargetId, succeeded }],
  );
  const afterChoice = requireNeedsHoles(
    resolveBattleInterrupt({
      state: state.battle.state,
      fill: interruptDecisionFill(state.pending.interruptHole, {
        kind: "resolve",
        responderId: spellCasterId,
        choice: {
          kind: "castAttackHitBonusActionSpell",
          procedureRef: state.pending.choice.procedureRef,
          fills: [saveFill],
        },
      }),
    }),
    "Expected Ensnaring Strike to request host attack damage.",
  );
  const damageHole = requireHole(afterChoice.holes, "rolledDice");
  return {
    ...state,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: afterChoice.state,
    }),
    phase: "attackDamageNeeded",
    holes: [damageHole],
    pending: {
      tag: "attackDamage",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill: state.pending.attackFill,
      riderDice: 0,
    },
    lastResult: "needsHoles",
    route: appendObservedRouteEvents(state.route, afterChoice.routeEvents),
  };
}

function fillAttackDamage(
  state: AfterHitRuntimeState,
  weaponDiePip: number,
  riderDiePip?: number,
): AfterHitRuntimeState {
  if (state.pending.tag !== "attackDamage") {
    throw new Error("Expected pending after-hit attack damage.");
  }
  const damage = requireHole(state.holes, "rolledDice");
  const groups =
    state.pending.riderDice === 0
      ? [[weaponDiePip]]
      : [
          [weaponDiePip],
          Array.from({ length: state.pending.riderDice }, () =>
            requireRiderDiePip(riderDiePip),
          ),
        ];
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: state.pending.subject,
      fills: [
        state.pending.targetFill,
        state.pending.attackFill,
        damageRollFillWithGroups(damage, groups),
      ],
    }),
    "Expected after-hit host attack to resolve.",
  );
  return {
    ...state,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    phase: "afterDamage",
    holes: [],
    pending: { tag: "none" },
    route: appendObservedRouteEvents(state.route, resolved.routeEvents),
    lastResult: "resolved",
  };
}

function breakConcentration(state: AfterHitRuntimeState): AfterHitRuntimeState {
  const act = endConcentrationAct(state.battle);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [],
    }),
    "Expected after-hit public End Concentration to resolve.",
  );
  return {
    ...state,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    phase: "cleaned",
    holes: [],
    pending: { tag: "none" },
    route: appendObservedRouteEvents(
      appendObservedRouteEvents(state.route, act.routeEvents),
      resolved.routeEvents,
    ),
    lastResult: "resolved",
  };
}

function discoverTurnStartDamage(
  state: AfterHitRuntimeState,
): AfterHitRuntimeState {
  const awaitingTurnStartDamage = requireNeedsHoles(
    endTurn({
      state: state.battle.state,
      actorId: spellCasterId,
    }),
    "Expected after-hit timed damage to request turn-start damage.",
  );
  const damageHole = requireHole(awaitingTurnStartDamage.holes, "rolledDice");
  return {
    ...state,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: awaitingTurnStartDamage.state,
    }),
    phase: "turnStartDamageNeeded",
    holes: [damageHole],
    pending: {
      tag: "turnStartDamage",
      sourceBattle: state.battle.state,
    },
    lastResult: "needsHoles",
    route: appendObservedRouteEvents(
      state.route,
      awaitingTurnStartDamage.routeEvents,
    ),
  };
}

function fillEnsnaringStartTurnDamage(
  state: AfterHitRuntimeState,
  damageDiePip: number,
): AfterHitRuntimeState {
  if (state.pending.tag !== "turnStartDamage") {
    throw new Error("Expected pending Ensnaring Strike turn-start damage.");
  }
  const targetTurn = requireResolved(
    endTurn({
      state: state.pending.sourceBattle,
      actorId: spellCasterId,
      fills: [
        damageRollFillWithGroups(requireHole(state.holes, "rolledDice"), [
          [damageDiePip],
        ]),
      ],
    }),
    "Expected Ensnaring Strike turn-start damage to resolve.",
  );
  const targetTurnSession = battleRuntimeSessionForTest({
    ...state.battle,
    state: targetTurn.state,
  });
  const escapeAct = requireSpellRestraintEscapeAct(targetTurnSession);
  const escapeCheck = requireHole(escapeAct.initialHoles, "abilityCheck");
  return {
    ...state,
    battle: targetTurnSession,
    phase: "escapeCheckNeeded",
    holes: [escapeCheck],
    pending: {
      tag: "escapeCheck",
      subject: escapeAct.subject,
    },
    route: appendObservedRouteEvents(
      appendObservedRouteEvents(state.route, targetTurn.routeEvents),
      escapeAct.routeEvents,
    ),
    lastResult: "needsHoles",
  };
}

function fillEnsnaringEscapeCheck(
  state: AfterHitRuntimeState,
): AfterHitRuntimeState {
  if (state.pending.tag !== "escapeCheck") {
    throw new Error("Expected pending Ensnaring Strike escape check.");
  }
  const escaped = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: state.pending.subject,
      fills: [abilityCheckFill(requireHole(state.holes, "abilityCheck"), 13)],
    }),
    "Expected Ensnaring Strike escape check to resolve.",
  );
  return {
    ...state,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: escaped.state,
    }),
    phase: "cleaned",
    holes: [],
    pending: { tag: "none" },
    route: appendObservedRouteEvents(state.route, escaped.routeEvents),
    lastResult: "resolved",
  };
}

function discoverTurnStartDamageAndSave(
  state: AfterHitRuntimeState,
): AfterHitRuntimeState {
  const awaitingTurnStart = requireNeedsHoles(
    endTurn({
      state: state.battle.state,
      actorId: spellCasterId,
    }),
    "Expected Searing Smite to request turn-start damage and save.",
  );
  const damageHole = requireHole(awaitingTurnStart.holes, "rolledDice");
  const saveHole = requireHole(awaitingTurnStart.holes, "savingThrowOutcome");
  return {
    ...state,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: awaitingTurnStart.state,
    }),
    phase: "turnStartDamageSaveNeeded",
    holes: [damageHole, saveHole],
    pending: {
      tag: "turnStartDamageAndSave",
      sourceBattle: state.battle.state,
    },
    lastResult: "needsHoles",
    route: appendObservedRouteEvents(
      state.route,
      awaitingTurnStart.routeEvents,
    ),
  };
}

function fillSearingStartTurnDamageAndSave(
  state: AfterHitRuntimeState,
  damageDiePip: number,
): AfterHitRuntimeState {
  if (state.pending.tag !== "turnStartDamageAndSave") {
    throw new Error("Expected pending Searing Smite turn-start damage/save.");
  }
  const targetTurn = requireResolved(
    endTurn({
      state: state.pending.sourceBattle,
      actorId: spellCasterId,
      fills: [
        damageRollFillWithGroups(requireHole(state.holes, "rolledDice"), [
          Array.from({ length: 3 }, () => damageDiePip),
        ]),
        savingThrowOutcomeFill(requireHole(state.holes, "savingThrowOutcome"), [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    }),
    "Expected Searing Smite turn-start damage/save to resolve.",
  );
  return {
    ...state,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: targetTurn.state,
    }),
    phase: "cleaned",
    holes: [],
    pending: { tag: "none" },
    route: appendObservedRouteEvents(state.route, targetTurn.routeEvents),
    lastResult: "resolved",
  };
}

function afterHitProjection(state: AfterHitRuntimeState): AfterHitSpellsState {
  const target = requireCombatant(state.battle.state, spellTargetId);
  const caster = requireCombatant(state.battle.state, spellCasterId);
  return {
    scenario: state.scenario,
    phase: state.phase,
    targetHp: Number(target.hp),
    bonusActionAvailable:
      state.battle.state.currentTurnResources.currentHasBonusAction,
    slotExpended: casterSlotExpended(state.battle.state),
    freeCastUsesRemaining: paladinsSmiteUsesRemaining(state.battle),
    levelOnePlusCastCommitted:
      state.battle.state.currentTurnResources.levelOnePlusSpellCastsThisTurn.includes(
        spellCasterId,
      ),
    concentrationActive: caster.concentration !== null,
    targetRestrained: target.conditions.restrained === true,
    searingBurning: hasActiveEffectForSpell(
      state.battle,
      target.activeEffects,
      "spellTurnStartDamageAndSave",
      searingSmiteUnitId,
    ),
    shiningIlluminated: hasActiveEffectForSpell(
      state.battle,
      target.activeEffects,
      "shiningSmiteIllumination",
      shiningSmiteUnitId,
    ),
    holes: battleHolesToAfterHitHoles(state.holes, state.pending),
    lastResult: state.lastResult,
  };
}

function casterSlotExpended(state: BattleState): boolean {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected after-hit caster to be a character.");
  }
  return (
    caster.origin.spellcasting?.spellSlots.some(
      (slot) => Number(slot.expended) > 0,
    ) ?? false
  );
}

function paladinsSmiteUsesRemaining(session: BattleRuntimeSession): number {
  const caster = requireCombatant(session.state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected after-hit caster to be a character.");
  }
  const ownership = session.context.characters
    .get(spellCasterId)
    ?.resourceOwnership.find(
      (candidate) => candidate.unit.id === "paladin_paladins_smite",
    );
  if (ownership === undefined) return 0;
  const resource = caster.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === ownership.resourcePoolRef,
  );
  return resource === undefined ? 0 : Number(resource.usesRemaining ?? 0);
}

function hasActiveEffectForSpell(
  session: BattleRuntimeSession,
  effects: readonly BattleActiveEffect[],
  kind: BattleActiveEffect["kind"],
  spellId: string,
): boolean {
  return effects.some(
    (effect) =>
      effect.kind === kind &&
      "sourceProcedureRef" in effect &&
      "sourceCombatantId" in effect &&
      characterSpellInvocationRefForProcedureRefForTest(
        session,
        effect.sourceCombatantId,
        effect.sourceProcedureRef,
      ).spellId === spellId,
  );
}

function battleHolesToAfterHitHoles(
  holes: readonly BattleHole[],
  pending: PendingInvocation,
): readonly AfterHitHole[] {
  return holes.map((hole) => {
    if (hole.kind === "targetChoice") return "TargetChoice";
    if (hole.kind === "attackRoll") return "AttackRoll";
    if (hole.kind === "interruptDecision") return "InterruptDecision";
    if (
      hole.kind === "savingThrowOutcome" &&
      pending.tag === "turnStartDamageAndSave"
    ) {
      return "TurnStartSaveOutcome";
    }
    if (hole.kind === "savingThrowOutcome") return "SaveOutcome";
    if (hole.kind === "rolledDice" && pending.tag === "attackDamage") {
      return "AttackDamageRoll";
    }
    if (
      hole.kind === "rolledDice" &&
      (pending.tag === "turnStartDamage" ||
        pending.tag === "turnStartDamageAndSave")
    ) {
      return "TurnStartDamageRoll";
    }
    if (hole.kind === "abilityCheck" && pending.tag === "escapeCheck") {
      return "EscapeAbilityCheck";
    }
    throw new Error(`Unexpected after-hit damage rider hole ${hole.kind}.`);
  });
}

function normalizeAfterHitRouteQuintState(raw: unknown): AfterHitRouteState {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      state["qSurface"],
      "qSurface",
      AFTER_HIT_ROUTE_SURFACE_BY_TAG,
      "after-hit route surface",
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareAfterHitRouteStates(
  spec: AfterHitRouteState,
  impl: AfterHitRouteState,
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

function normalizeAfterHitQuintState(raw: unknown): AfterHitSpellsState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: afterHitHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "After-hit damage riders",
    scenarioOutcome: protocol.lastResult,
    protocol,
    initScenarioResult: "init",
  });
  return {
    scenario: quintVariantMappedValue(
      state["qScenario"],
      "qScenario",
      AFTER_HIT_SCENARIO_BY_TAG,
      "after-hit scenario",
    ),
    phase: quintVariantMappedValue(
      state["qPhase"],
      "qPhase",
      AFTER_HIT_PHASE_BY_TAG,
      "after-hit phase",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    slotExpended: booleanField(state, "qSlotExpended"),
    freeCastUsesRemaining: numberFromQuintInt(
      state["qFreeCastUsesRemaining"],
      "qFreeCastUsesRemaining",
    ),
    levelOnePlusCastCommitted: booleanField(
      state,
      "qLevelOnePlusCastCommitted",
    ),
    concentrationActive: booleanField(state, "qConcentrationActive"),
    targetRestrained: booleanField(state, "qTargetRestrained"),
    searingBurning: booleanField(state, "qSearingBurning"),
    shiningIlluminated: booleanField(state, "qShiningIlluminated"),
    holes: protocol.holes,
    lastResult: protocol.lastResult,
  };
}

function compareAfterHitStates(
  spec: AfterHitSpellsState,
  impl: AfterHitSpellsState,
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

function requireAfterHitChoice(
  session: BattleRuntimeSession,
  spellId: string,
  options: { readonly invocationTag?: string } = {},
): PendingAfterHitChoice {
  const choice = battleFrontierInterruptDecisionForState(
    session.state,
  )?.choices.find((candidate) => {
    if (
      candidate.kind !== "nestedProcedure" ||
      candidate.subject.tag !== "runtimeCommand" ||
      candidate.subject.command !== "castAttackHitBonusActionSpell"
    )
      return false;
    const invocationRef = characterSpellInvocationRefForProcedureRefForTest(
      session,
      candidate.subject.casterId,
      candidate.subject.procedureRef,
    );
    return (
      invocationRef.spellId === spellId &&
      (options.invocationTag === undefined ||
        invocationRef.tag === options.invocationTag)
    );
  });
  if (
    choice === undefined ||
    choice.kind !== "nestedProcedure" ||
    choice.subject.tag !== "runtimeCommand" ||
    choice.subject.command !== "castAttackHitBonusActionSpell"
  ) {
    throw new Error(`Expected ${spellId} after-hit spell choice.`);
  }
  return {
    procedureRef: choice.subject.procedureRef,
    invocation: characterSpellInvocationForProcedureRefForTest(
      session,
      choice.subject.casterId,
      choice.subject.procedureRef,
    ),
    initialHoles: choice.initialHoles,
  };
}

function requireSpellRestraintEscapeAct(
  session: BattleRuntimeSession,
): ReturnType<typeof discoverBattleActs>[number] & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is ReturnType<typeof discoverBattleActs>[number] & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
      >;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "escapeSpellRestraint" &&
      candidate.subject.actorId === spellTargetId &&
      candidate.subject.targetId === spellTargetId,
  );
  if (act === undefined) {
    throw new Error("Expected Ensnaring Strike escape action.");
  }
  return act;
}

function endConcentrationAct(session: BattleRuntimeSession): ReturnType<
  typeof discoverBattleActs
>[number] & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "endConcentration" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is ReturnType<typeof discoverBattleActs>[number] & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "runtimeCommand"; readonly command: "endConcentration" }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "endConcentration" &&
      candidate.subject.actorId === spellCasterId,
  );
  if (act === undefined) {
    throw new Error("Expected public after-hit End Concentration act.");
  }
  return act;
}

function requireNeedsHoles(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error(message);
  }
  return result;
}

function requireResolved(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error(message);
  }
  return result;
}

function requireRiderDiePip(riderDiePip: number | undefined): number {
  if (riderDiePip === undefined) {
    throw new Error("Expected after-hit rider die pip.");
  }
  return riderDiePip;
}

function afterHitHole(raw: unknown): AfterHitHole {
  const tag = quintVariantTag(raw, "AfterHitHole");
  if (isAfterHitHole(tag)) {
    return tag;
  }
  throw new Error(`Unknown after-hit hole ${tag}.`);
}

function isAfterHitHole(tag: string): tag is AfterHitHole {
  return AFTER_HIT_HOLES.some((hole) => hole === tag);
}
