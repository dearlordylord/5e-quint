import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type { Ability, Condition } from "@dnd/shared/types";
import type {
  AdmittedBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleCreatureState,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { isCharacterBattleCreatureState } from "./creature-state-execution.ts";
import {
  battleReducerRouteFill,
  discoverBattleActsRoute,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
  startBattleRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteHole,
} from "./reducer-route-protocol.ts";

type PassiveProjectionSubject = Extract<
  BattleReducerRouteEvent,
  { readonly kind: "discoverBattleActs" }
>["subject"];

type PassiveProjectionResolutionEvent<
  TSubject extends PassiveProjectionSubject,
> =
  | (Extract<
      BattleReducerRouteEvent,
      { readonly kind: "resolveBattleSubject" }
    > & { readonly subject: TSubject })
  | (Extract<
      BattleReducerRouteEvent,
      { readonly kind: "resolveBattleSubjectWithoutFill" }
    > & { readonly subject: TSubject });

interface PassiveProjectionPhases<TSubject extends PassiveProjectionSubject> {
  readonly discovery: Extract<
    BattleReducerRouteEvent,
    { readonly kind: "discoverBattleActs" }
  > & { readonly subject: TSubject };
  readonly resolution: readonly [
    PassiveProjectionResolutionEvent<TSubject>,
    ...PassiveProjectionResolutionEvent<TSubject>[],
  ];
}

function creatureStatProjectionPhases(
  state: BattleState,
): PassiveProjectionPhases<"creatureStatProjection"> | undefined {
  if (![...state.combatants.values()].some(isCharacterBattleCreatureState)) {
    return undefined;
  }
  return {
    discovery: discoverBattleActsRoute(
      "creatureStatProjection",
      [],
      "battleCreatureState",
    ),
    resolution: [
      resolveBattleSubjectWithoutFillRoute(
        "creatureStatProjection",
        [],
        "battleCreatureState",
      ),
      resolveBattleSubjectWithoutFillRoute(
        "creatureStatProjection",
        [],
        "battleMovementResource",
      ),
    ],
  };
}

function passiveDamageAdjustmentPhases(
  state: BattleState,
): PassiveProjectionPhases<"passiveDamageAdjustment"> | undefined {
  const hasPassiveAdjustment = [...state.combatants.values()].some(
    (target) =>
      target.origin.kind === "character" &&
      target.origin.execution.procedureBindings.some((binding) => {
        const procedure = binding.procedure;
        return (
          procedure.kind === "unitSupportProfile" &&
          typeof procedure.execution === "object" &&
          procedure.execution.kind === "passiveDamageResistance"
        );
      }),
  );
  if (!hasPassiveAdjustment) return undefined;

  return {
    discovery: discoverBattleActsRoute(
      "passiveDamageAdjustment",
      [],
      "battleDamageAdjustment",
    ),
    resolution: [
      resolveBattleSubjectWithoutFillRoute(
        "passiveDamageAdjustment",
        [],
        "battleDamageAdjustment",
      ),
    ],
  };
}

function passiveAbilityCheckRollModePhases(
  state: BattleState,
  condition?: Condition,
): PassiveProjectionPhases<"passiveAbilityCheckRollMode"> | undefined {
  const hasPassiveAbilityCheckRollMode = [...state.combatants.values()].some(
    (target) =>
      target.origin.kind === "character" &&
      characterUnitProcedureBindings(target.origin.execution).some(
        ({ procedure }) => {
          if (procedure.kind !== "unitFeature") return false;
          const execution = procedure.execution;
          return (
            execution.kind === "passiveAbilityCheckRollMode" &&
            (condition === undefined ||
              (execution.abilityCheck.scope.kind === "endingCondition" &&
                execution.abilityCheck.scope.condition === condition))
          );
        },
      ),
  );
  if (!hasPassiveAbilityCheckRollMode) return undefined;

  return {
    discovery: discoverBattleActsRoute(
      "passiveAbilityCheckRollMode",
      ["grappleOutcome"],
      "battleAbilityCheckRollMode",
    ),
    resolution: [
      resolveBattleSubjectRoute(
        "passiveAbilityCheckRollMode",
        "grappleOutcome",
        [],
        "battleAbilityCheckRollMode",
      ),
    ],
  };
}

export function passiveProjectionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  if (
    act.subject.tag === "runtimeCommand" &&
    act.subject.command === "standFromProne"
  ) {
    const phases = creatureStatProjectionPhases(state);
    if (phases !== undefined) {
      return [startBattleRoute("battleCreatureState"), phases.discovery];
    }
  }
  if (act.subject.tag === "action" && act.subject.action === "escapeGrapple") {
    const phases = passiveAbilityCheckRollModePhases(state, "grappled");
    if (phases !== undefined) return [phases.discovery];
  }
  if (
    act.subject.tag === "runtimeCommand" &&
    act.subject.command === "endTurn" &&
    passiveSavingThrowEndTurnRouteContext(state) !== undefined
  ) {
    return [
      discoverBattleActsRoute(
        "passiveSavingThrowRollMode",
        ["savingThrowOutcome"],
        "battleSavingThrowRollMode",
      ),
    ];
  }
  return undefined;
}

export function passiveProjectionRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag === "resolved" &&
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "standFromProne"
  ) {
    return creatureStatProjectionPhases(input.state)?.resolution;
  }

  const fill = input.fills.at(-1);
  if (
    input.subject.tag === "action" &&
    input.subject.action === "escapeGrapple" &&
    result.tag !== "invalid" &&
    fill !== undefined &&
    battleReducerRouteFill(fill) === "grappleOutcome"
  ) {
    return passiveAbilityCheckRollModePhases(input.state)?.resolution;
  }

  if (
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "endTurn" &&
    result.tag !== "invalid" &&
    fill !== undefined &&
    battleReducerRouteFill(fill) === "savingThrowOutcome" &&
    passiveSavingThrowEndTurnRouteContext(input.state) !== undefined
  ) {
    return [
      resolveBattleSubjectRoute(
        "passiveSavingThrowRollMode",
        "savingThrowOutcome",
        [],
        "battleSavingThrowRollMode",
      ),
    ];
  }
  return undefined;
}

export function passiveDamageAdjustmentRouteForSpellDiscovery(
  state: BattleState,
): readonly BattleReducerRouteEvent[] {
  const phases = passiveDamageAdjustmentPhases(state);
  return phases === undefined ? [] : [phases.discovery];
}

export function passiveDamageAdjustmentRouteForSpellDamageResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  const fill = input.fills.at(-1);
  const routeFill =
    fill === undefined ? undefined : battleReducerRouteFill(fill);
  if (routeFill !== "rolledDice" || result.tag !== "resolved") return [];
  return passiveDamageAdjustmentPhases(input.state)?.resolution ?? [];
}

export function passiveSavingThrowRollModeRouteEvents(input: {
  readonly state: BattleState;
  readonly ability: Ability;
  readonly condition?: Condition;
}): BattleReducerRouteEvents | undefined {
  const disposition = passiveSavingThrowRollModeRouteDisposition(input);
  if (disposition === null) return undefined;

  const holes: readonly BattleReducerRouteHole[] =
    disposition === "projected" ? ["savingThrowOutcome"] : [];
  return [
    startBattleRoute("battleSavingThrowRollMode"),
    discoverBattleActsRoute(
      "passiveSavingThrowRollMode",
      holes,
      "battleSavingThrowRollMode",
    ),
    disposition === "projected"
      ? resolveBattleSubjectRoute(
          "passiveSavingThrowRollMode",
          "savingThrowOutcome",
          [],
          "battleSavingThrowRollMode",
        )
      : resolveBattleSubjectWithoutFillRoute(
          "passiveSavingThrowRollMode",
          [],
          "battleConditionLifecycle",
        ),
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
    if (disposition === "projected") return "projected";
    suppressed ||= disposition === "suppressed";
  }
  return suppressed ? "suppressed" : null;
}

function passiveSavingThrowRollModeDispositionForTarget(
  target: BattleCreatureState,
  ability: Ability,
  condition: Condition | undefined,
): PassiveSavingThrowRollModeRouteDisposition | null {
  if (target.origin.kind !== "character") return null;

  const targetIncapacitated = isIncapacitated(target.conditions);
  for (const { procedure } of characterUnitProcedureBindings(
    target.origin.execution,
  )) {
    if (procedure.kind !== "unitFeature") continue;
    if (procedure.execution.kind !== "passiveSavingThrowRollMode") continue;
    const savingThrow = procedure.execution.savingThrow;
    if (savingThrow.scope.kind === "condition") {
      if (savingThrow.scope.condition === condition) return "projected";
      continue;
    }
    if (savingThrow.scope.ability !== ability) continue;
    if (savingThrow.scope.suppressedByCondition !== "incapacitated") continue;
    return targetIncapacitated ? "suppressed" : "projected";
  }
  return null;
}

function passiveSavingThrowEndTurnRouteContext(
  state: BattleState,
): { readonly ability: Ability; readonly condition: Condition } | undefined {
  const actorId = currentActorId(state);
  const actor = actorId === null ? undefined : state.combatants.get(actorId);
  if (actor === undefined) return undefined;

  for (const effect of actor.activeEffects) {
    if (effect.kind !== "spellConditionEndTurnSave") continue;
    if (
      passiveSavingThrowRollModeDispositionForTarget(
        actor,
        effect.save.ability,
        effect.condition,
      ) === "projected"
    ) {
      return { ability: effect.save.ability, condition: effect.condition };
    }
  }
  return undefined;
}
