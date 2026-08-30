// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { battleFillKind } from "../battle-protocol-kinds.ts";
import type {
  AdmittedBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleActiveEffect,
  BattleFill,
  BattleHole,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  afterHitSpellConcentrationTeardownRoutes,
  afterHitSpellSavingThrowCompletionRoutes,
} from "./after-hit-spell-routes.ts";
import {
  battleReducerRouteFill,
  battleReducerRouteHole,
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
import { battleCombatantHasActiveEffectKind } from "./reducer-route-state-query.ts";
import { isEndTurnSubject } from "./reducer-route-subject-query.ts";

function isZeroHitPointStabilizationSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(state, subject)?.procedure === "makeStable"
  );
}

export function zeroHitPointStabilizationRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  return isZeroHitPointStabilizationSubject(state, act.subject)
    ? [
        discoverBattleActsRoute(
          "zeroHitPointStabilization",
          battleReducerRouteHoles(act.initialHoles),
          "battleActionEconomy",
        ),
      ]
    : undefined;
}

export function zeroHitPointStabilizationRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (
    !isZeroHitPointStabilizationSubject(input.state, input.subject) ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleFillKind(fill) !== "targetChoice") {
    return undefined;
  }
  return resolveBattleSubjectRoute(
    "zeroHitPointStabilization",
    "targetChoice",
    [],
    "battleHitPointAndZeroHpLifecycle",
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
        effect.sourceProcedureRef === concentration.sourceProcedureRef &&
        effect.sourceCombatantId === subject.actorId,
    ),
  );
}

export function deathSavingThrowRouteForResolution(
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
      resolveBattleSubjectRoute(
        "deathSavingThrow",
        "deathSavingThrow",
        result.tag === "needsHoles"
          ? deathSavingThrowRouteHoles(result.holes)
          : [],
        "battleHitPointAndZeroHpLifecycle",
      ),
    ]);
  }

  if (
    result.tag !== "needsHoles" ||
    !deathSavingThrowRouteHoles(result.holes).includes("deathSavingThrow")
  ) {
    return undefined;
  }

  return nonEmptyRouteEvents([
    discoverBattleActsRoute(
      "deathSavingThrow",
      deathSavingThrowRouteHoles(result.holes),
      "battleHitPointAndZeroHpLifecycle",
    ),
  ]);
}

function deathSavingThrowRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter((hole) => hole.kind === "deathSavingThrow"),
  );
}

export function concentrationRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isConcentrationTeardownSubject(input.state, input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }

  const afterHitSavingThrowCompletionRoute =
    afterHitSpellSavingThrowCompletionRoutes({
      state: input.state,
      fills: input.fills
        .map(battleReducerRouteFill)
        .filter((fill): fill is BattleReducerRouteFill => fill !== undefined),
    });
  if (afterHitSavingThrowCompletionRoute !== undefined) {
    return afterHitSavingThrowCompletionRoute;
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
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleActiveEffect",
        ),
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleConcentration",
        ),
      ];
      if (priorConcentration === null) {
        return castRoute;
      }
      return [
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleConcentration",
        ),
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleActiveEffect",
        ),
        ...castRoute,
      ];
    }
    if (
      input.subject.tag === "runtimeCommand" &&
      input.subject.command === "endConcentration"
    ) {
      const afterHitRoutes =
        afterHitSpellConcentrationTeardownRoutes({
          state: input.state,
          subject: input.subject,
          holes,
        }) ?? [];
      const conditionImmunityRoutes =
        isConditionImmunityTemporaryHitPointConcentrationTeardownSubject(
          input.state,
          input.subject,
        )
          ? [
              resolveBattleSubjectWithoutFillRoute(
                "conditionImmunityTemporaryHitPointEffect",
                holes,
                "battleConcentration",
              ),
              resolveBattleSubjectWithoutFillRoute(
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
            resolveBattleSubjectWithoutFillRoute(
              "markedDamageRiderEffect",
              holes,
              "battleConcentration",
            ),
            resolveBattleSubjectWithoutFillRoute(
              "markedDamageRiderEffect",
              holes,
              "battleActiveEffect",
            ),
          ]
        : [];
      const spatialHazardCleanupRoutes =
        battleCombatantHasActiveEffectKind(
          input.state,
          input.subject.actorId,
          "areaMovementDistanceDamage",
        ) ||
        battleCombatantHasActiveEffectKind(
          input.state,
          input.subject.actorId,
          "persistentAreaSaveConditionEscape",
        )
          ? [
              resolveBattleSubjectWithoutFillRoute(
                "spatialEffect",
                [],
                "battleConcentration",
              ),
              resolveBattleSubjectWithoutFillRoute(
                "spatialEffect",
                [],
                "battleAreaHazard",
              ),
              resolveBattleSubjectWithoutFillRoute(
                "spatialEffect",
                [],
                "battleActiveEffect",
              ),
            ]
          : [];
      return [
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleConcentration",
        ),
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleActiveEffect",
        ),
        ...afterHitRoutes,
        ...conditionImmunityRoutes,
        ...markedDamageRiderRoutes,
        ...spatialHazardCleanupRoutes,
      ];
    }
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  if (routeFill === "concentrationSavingThrow") {
    const concentrationEvent: BattleReducerRouteEvent =
      resolveBattleSubjectRoute(
        "concentrationTeardown",
        routeFill,
        holes,
        "battleConcentration",
      );
    return result.tag === "resolved"
      ? [
          concentrationEvent,
          resolveBattleSubjectWithoutFillRoute(
            "concentrationTeardown",
            [],
            "battleActiveEffect",
          ),
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
      resolveBattleSubjectRoute(
        "concentrationTeardown",
        routeFill,
        holes,
        "battleConcentration",
      ),
    ];
  }
  return undefined;
}

export function concentrationRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  if (!isConcentrationTeardownDiscoverySubject(state, act.subject)) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "concentrationTeardown",
      battleReducerRouteHoles(act.initialHoles),
      act.subject.tag === "actionSpell"
        ? "battleSpellSlotAndActionEconomy"
        : "battleConcentration",
    ),
  ];
}

export function hitPointRestorationRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  if (!isHitPointRestorationResolution(input.state, input.subject, fill)) {
    return undefined;
  }
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }

  return resolveBattleSubjectRoute(
    "hitPointRestoration",
    routeFill,
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    hitPointRestorationRouteOwner(routeFill, result),
  );
}

export function hitPointRestorationRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  return isHitPointRestorationDiscoverySubject(state, act)
    ? [
        discoverBattleActsRoute(
          "hitPointRestoration",
          battleReducerRouteHoles(act.initialHoles),
          hitPointRestorationDiscoveryOwner(act.subject),
        ),
      ]
    : undefined;
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

function isConcentrationTeardownSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure ===
      "perceptionGatedAttackRollDefense"
    );
  }
  if (subject.tag === "action" && subject.action === "attack") {
    return true;
  }
  return (
    subject.tag === "runtimeCommand" && subject.command === "endConcentration"
  );
}

function isConcentrationTeardownDiscoverySubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure ===
      "perceptionGatedAttackRollDefense"
    );
  }
  return (
    subject.tag === "runtimeCommand" && subject.command === "endConcentration"
  );
}

function isHitPointRestorationSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell" || subject.tag === "bonusActionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure ===
      "directHitPointRestoration"
    );
  }
  return false;
}

function isHitPointRestorationResolution(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
  fill: BattleFill,
): boolean {
  if (isHitPointRestorationSubject(state, subject)) {
    return true;
  }
  return (
    subject.tag === "unitFeature" && fill.kind === "hitPointHealingDistribution"
  );
}

function isHitPointRestorationDiscoverySubject(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): boolean {
  if (isHitPointRestorationSubject(state, act.subject)) {
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

export function zeroHitPointSpellEffectTeardownRouteForResolution(
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
  return resolveBattleSubjectWithoutFillRoute(
    "zeroHitPointSpellEffectTeardown",
    [],
    owner,
  );
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
