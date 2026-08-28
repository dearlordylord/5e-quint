// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { nextInitiative } from "@dnd/shared-algebras/initiative-algebra";

import type {
  BattleActDiscoveryCandidate,
  BattleActiveEffect,
  BattleCreatureState,
  BattleFill,
  BattleHole,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { battleHoleFamilyKind } from "./hole-helpers.ts";
import {
  battleReducerRouteFill,
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  nonEmptyRouteEvents,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteFill,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
} from "./reducer-route-protocol.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";
import {
  combatantConcentrationChanged,
  combatantsActiveEffectsChanged,
  combatantsConcentrationChanged,
  combatantsConditionsChanged,
  combatantsTemporaryHitPointsIncreased,
} from "./reducer-route-state-query.ts";
import { isEndTurnSubject } from "./reducer-route-subject-query.ts";
import {
  spellBaseArmorClassEffectExpired,
  spellBaseArmorClassEffectResolveWithoutFill,
} from "./spell-defense-routes.ts";
import {
  conditionSpellEndTurnRepeatSaveHoleIds,
  sleepRepeatSaveSavingThrowHoleIds,
  spellTurnStartSavingThrowOutcomeHoleId,
} from "./turn-boundary-lifecycle.ts";

export function rollModifierRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isRollModifierEffectDiscoverySubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "rollModifierEffect",
    rollModifierRouteHoles(act.initialHoles),
    spellInvocationForRouteSubject(state, act.subject)?.procedure ===
      "thaumaturgyBoomingVoice"
      ? "battleActiveEffect"
      : "battleSpellSlotAndActionEconomy",
  );
}

export function rollModifierRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isRollModifierEffectResolutionSubject(input.state, input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  if (
    spellInvocationForRouteSubject(input.state, input.subject)?.procedure ===
    "thaumaturgyBoomingVoice"
  ) {
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
      discoverBattleActsRoute(
        "rollModifierEffect",
        holes,
        "battleSpellSlotAndActionEconomy",
      ),
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
    resolveBattleSubjectRoute(
      "rollModifierEffect",
      routeFill,
      [],
      "battleActiveEffect",
    ),
    rollModifierResolveWithoutFill([], "battleConcentration"),
  ];
}

export function rollModifierConcentrationBreakRouteForResolution(
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
  return resolveBattleSubjectWithoutFillRoute(
    "rollModifierEffect",
    holes,
    owner,
  );
}

export function spellDamageReductionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (
    act.subject.tag !== "actionSpell" ||
    spellInvocationForRouteSubject(state, act.subject)?.procedure !==
      "damageReduction"
  ) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "spellDamageReduction",
    spellDamageReductionCastDiscoveryHoles(act.initialHoles),
    "battleSpellSlotAndActionEconomy",
  );
}

export function spellDamageReductionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "actionSpell" ||
    spellInvocationForRouteSubject(input.state, input.subject)?.procedure !==
      "damageReduction" ||
    result.tag === "invalid"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "targetChoice" && result.tag === "needsHoles") {
    return [
      spellDamageReductionResolveWithFill(
        routeFill,
        spellDamageReductionCastChoiceHoles(result.holes),
        "battleTargetSelection",
      ),
    ];
  }
  if (routeFill === "damageTypeChoice" && result.tag === "resolved") {
    return [
      spellDamageReductionResolveWithFill(routeFill, [], "battleActiveEffect"),
      spellDamageReductionResolveWithoutFill([], "battleConcentration"),
    ];
  }
  return undefined;
}

export function spellDamageReductionAdjustmentDiscoveryRouteForResolution(
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (
    result.tag !== "needsHoles" ||
    !hasSpellDamageReductionHole(result.holes)
  ) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "spellDamageReduction",
    ["rolledDice"],
    "battleDamageAdjustment",
  );
}

export function spellDamageReductionAdjustmentRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "resolved") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleReducerRouteFill(fill) !== "rolledDice") {
    return undefined;
  }
  if (!spellDamageReductionEffectUseChanged(input.state, result.state)) {
    return undefined;
  }
  return [
    spellDamageReductionResolveWithFill(
      "rolledDice",
      [],
      "battleDamageAdjustment",
    ),
    spellDamageReductionResolveWithoutFill([], "battleActiveEffect"),
  ];
}

function spellDamageReductionCastDiscoveryHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return holes.some((hole) => hole.kind === "targetChoice")
    ? ["targetChoice"]
    : battleReducerRouteHoles(holes);
}

function spellDamageReductionCastChoiceHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter((hole) => hole.kind === "damageTypeChoice"),
  );
}

function hasSpellDamageReductionHole(holes: readonly BattleHole[]): boolean {
  return holes.some(
    (hole) => hole.kind === "rolledDice" && "spellDamageReduction" in hole,
  );
}

function spellDamageReductionEffectUseChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  const beforeEffects = spellDamageReductionEffectsByProtocol(before);
  for (const [key, effect] of spellDamageReductionEffectsByProtocol(after)) {
    const previous = beforeEffects.get(key);
    if (
      previous !== undefined &&
      previous.usedThisTurn === false &&
      effect.usedThisTurn === true
    ) {
      return true;
    }
  }
  return false;
}

function spellDamageReductionEffectsByProtocol(
  state: BattleState,
): ReadonlyMap<
  string,
  Extract<BattleActiveEffect, { readonly kind: "spellDamageReduction" }>
> {
  const effects = new Map<
    string,
    Extract<BattleActiveEffect, { readonly kind: "spellDamageReduction" }>
  >();
  for (const combatant of state.combatants.values()) {
    for (const effect of combatant.activeEffects) {
      if (effect.kind === "spellDamageReduction") {
        effects.set(
          spellDamageReductionEffectRouteKey(combatant, effect),
          effect,
        );
      }
    }
  }
  return effects;
}

function spellDamageReductionEffectRouteKey(
  combatant: BattleCreatureState,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellDamageReduction" }
  >,
): string {
  return [
    combatant.combatantId,
    effect.sourceProcedureRef,
    effect.sourceCombatantId,
    effect.damageType,
  ].join("\u0000");
}

function spellDamageReductionResolveWithFill(
  fill: Extract<
    BattleReducerRouteFill,
    "targetChoice" | "damageTypeChoice" | "rolledDice"
  >,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectRoute("spellDamageReduction", fill, holes, owner);
}

function spellDamageReductionResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "spellDamageReduction",
    holes,
    owner,
  );
}

export function scalarBuffRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isScalarBuffEffectSubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "scalarBuffEffect",
    [],
    "battleSpellSlotAndActionEconomy",
  );
}

export function scalarBuffRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isScalarBuffEffectSubject(input.state, input.subject)) {
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
          resolveBattleSubjectRoute(
            "scalarBuffEffect",
            routeFill,
            [],
            "battleHoleFrontier",
          ),
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
  if (combatantsTemporaryHitPointsIncreased(before, after)) {
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

function scalarBuffResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute("scalarBuffEffect", holes, owner);
}

export function sleepRepeatSaveRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isSleepTargetAdmissionSubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "repeatSaveConditionEffect",
    sleepTargetAdmissionRouteHoles(act.initialHoles),
    "battleSpellSlotAndActionEconomy",
  );
}

export function sleepRepeatSaveRouteForResolution(
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

  if (!isSleepTargetAdmissionSubject(input.state, input.subject)) {
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
    sourceCombatantId: input.subject.actorId,
  });
}

export function repeatSaveConditionEffectRouteForResolution(
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
      discoverBattleActsRoute(
        "repeatSaveConditionEffect",
        holes,
        "battleTurnBoundary",
      ),
    ];
  }
  if (
    result.tag !== "resolved" ||
    !fillsIncludeRepeatSaveConditionEffect(input)
  ) {
    return undefined;
  }
  return nonEmptyRouteEvents([
    ...(combatantsConditionsChanged(input.state, result.state)
      ? [
          resolveBattleSubjectRoute(
            "repeatSaveConditionEffect" as const,
            "savingThrowOutcome" as const,
            [],
            "battleConditionLifecycle" as const,
          ),
        ]
      : []),
    ...(combatantsActiveEffectsChanged(input.state, result.state)
      ? [
          resolveBattleSubjectWithoutFillRoute(
            "repeatSaveConditionEffect" as const,
            [],
            "battleActiveEffect" as const,
          ),
        ]
      : []),
    ...(combatantsConcentrationChanged(input.state, result.state)
      ? [
          resolveBattleSubjectWithoutFillRoute(
            "repeatSaveConditionEffect" as const,
            [],
            "battleConcentration" as const,
          ),
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
            discoverBattleActsRoute(
              "repeatSaveConditionEffect",
              holes,
              "battleTurnBoundary",
            ),
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
  readonly sourceCombatantId: CombatantId | undefined;
}): BattleReducerRouteEvents | undefined {
  const conditionRoutes = combatantsConditionsChanged(input.before, input.after)
    ? [
        resolveBattleSubjectRoute(
          "repeatSaveConditionEffect" as const,
          input.fill,
          [],
          "battleConditionLifecycle" as const,
        ),
      ]
    : [];
  const activeEffectRoutes =
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
  return combatantsConditionsChanged(before, after)
    ? [sleepRepeatSaveResolveWithoutFill([], "battleConditionLifecycle")]
    : [];
}

function sleepRepeatSaveResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "repeatSaveConditionEffect",
    holes,
    owner,
  );
}

export function turnBoundaryEffectLifecycleRouteForResolution(
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
    const hitPointRoute: BattleReducerRouteEvent = resolveBattleSubjectRoute(
      "turnBoundaryEffectLifecycle",
      routeFill,
      holes,
      "battleHitPoint",
    );
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
      resolveBattleSubjectRoute(
        "turnBoundaryEffectLifecycle",
        routeFill,
        holes,
        "battleActiveEffect",
      ),
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
  return resolveBattleSubjectRoute(
    "concentrationTeardown",
    fill,
    holes,
    "battleConcentration",
  );
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
  return discoverBattleActsRoute(
    "turnBoundaryEffectLifecycle",
    holes,
    "battleTurnBoundary",
  );
}

function turnBoundaryEffectLifecycleResolveWithoutFill(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "turnBoundaryEffectLifecycle",
    [],
    owner,
  );
}

export function spellBaseArmorClassEffectTurnBoundaryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isEndTurnSubject(input.subject) ||
    input.fills.length !== 0 ||
    result.tag !== "resolved" ||
    !spellBaseArmorClassEffectExpired(input.state, result.state)
  ) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "spellBaseArmorClassEffect",
      [],
      "battleActiveEffect",
    ),
    spellBaseArmorClassEffectResolveWithoutFill("battleTurnBoundary"),
    spellBaseArmorClassEffectResolveWithoutFill("battleActiveEffect"),
    spellBaseArmorClassEffectResolveWithoutFill("battleArmorClass"),
  ];
}

function battleHasTurnBoundaryLifecycleEffects(state: BattleState): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(isTurnBoundaryLifecycleEffect),
  );
}

function isTurnBoundaryLifecycleEffect(effect: BattleActiveEffect): boolean {
  return (
    effect.kind === "spellTurnStartDamageAndSave" ||
    effect.kind === "spellTurnEndDamage" ||
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
          spellTurnStartSavingThrowOutcomeHoleId(
            {
              actorId: combatant.combatantId,
              round: nextInitiative(state.initiative).round,
            },
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
  const savingThrowHoles = holes.filter(
    (hole) => hole.kind === "savingThrowOutcome",
  );
  if (savingThrowHoles.length !== 1) {
    throw new Error(
      "Admitted Sleep target selection must own exactly one Saving Throw outcome hole.",
    );
  }
  return battleReducerRouteHoles(savingThrowHoles);
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

function isRollModifierEffectDiscoverySubject(
  state: BattleState,
  subject: BattleActDiscoveryCandidate["subject"],
): subject is Extract<
  BattleActDiscoveryCandidate["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    (spellInvocationForRouteSubject(state, subject)?.procedure ===
      "rollModifier" ||
      spellInvocationForRouteSubject(state, subject)?.procedure ===
        "thaumaturgyBoomingVoice")
  );
}

function isRollModifierEffectResolutionSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    (spellInvocationForRouteSubject(state, subject)?.procedure ===
      "rollModifier" ||
      spellInvocationForRouteSubject(state, subject)?.procedure ===
        "thaumaturgyBoomingVoice")
  );
}

function isScalarBuffEffectSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" | "bonusActionSpell" }
> {
  return (
    (subject.tag === "actionSpell" || subject.tag === "bonusActionSpell") &&
    spellInvocationForRouteSubject(state, subject)?.procedure === "scalarBuff"
  );
}

function isSleepTargetAdmissionSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(state, subject)?.procedure ===
      "sleepTargetAdmission"
  );
}
