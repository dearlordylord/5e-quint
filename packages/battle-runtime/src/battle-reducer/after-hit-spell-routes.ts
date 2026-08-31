import { spellActiveEffectExecutionRef } from "../effect-execution-ref.ts";
import type {
  AdmittedBattleResolutionInput,
  AttackSpellDamageAddition,
  BattleActDiscoveryCandidate,
  BattleActiveEffect,
  BattleFill,
  BattleInterruptCheckpoint,
  BattleInterruptProcedureSelection,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { interruptChoiceResponderId } from "../battle-state-execution.ts";
import type { BattleInterruptSubject } from "../battle-subjects.ts";
import { currentInterruptCheckpoint } from "./battle-snapshot.ts";
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
import { spellInvocationForInterruptChoice } from "./reducer-route-spell-query.ts";
import {
  combatantsActiveEffectsChanged,
  combatantsConcentrationChanged,
  combatantsConditionsChanged,
} from "./reducer-route-state-query.ts";
import { isEndTurnSubject } from "./reducer-route-subject-query.ts";

type AfterHitSpellChoice = Extract<
  BattleInterruptCheckpoint["choices"][number],
  { readonly kind: "nestedProcedure" }
> & {
  readonly subject: Extract<
    BattleInterruptSubject,
    { readonly command: "castAttackHitBonusActionSpell" }
  >;
};
type AfterHitSpellSelection = Extract<
  BattleInterruptProcedureSelection,
  { readonly kind: "castAttackHitBonusActionSpell" }
>;

export function afterHitSpellDiscoveryRoutesForResolution(
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
    !frame.choices.some(isAfterHitSpellChoice)
  ) {
    return undefined;
  }

  const owners = new Set<BattleReducerRouteOwnerGroup>([
    "battleInterruptStack",
  ]);
  for (const choice of frame.choices) {
    if (!isAfterHitSpellChoice(choice)) {
      continue;
    }
    const invocation = spellInvocationForInterruptChoice(
      result.state,
      interruptChoiceResponderId(choice),
      choice.subject.procedureRef,
    );
    /* v8 ignore next -- @preserve -- Every admitted after-hit choice retains its executable procedure binding. */
    if (invocation === undefined) continue;
    for (const owner of afterHitSpellInvocationOwners(invocation)) {
      owners.add(owner);
    }
  }

  return nonEmptyRouteEvents(
    [...owners].map((owner) =>
      afterHitSpellDiscoverRoute(["interruptDecision"], owner),
    ),
  );
}

export function afterHitSpellDiscoveryRoutesForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  if (isAfterHitSpellConcentrationTeardownSubject(state, act.subject)) {
    return [
      afterHitSpellDiscoverRoute(
        battleReducerRouteHoles(act.initialHoles),
        "battleConcentration",
      ),
      afterHitSpellDiscoverRoute(
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
    afterHitSpellDiscoverRoute(holes, "battleAbilityCheck"),
    afterHitSpellDiscoverRoute(holes, "battleConditionLifecycle"),
    afterHitSpellDiscoverRoute(holes, "battleConcentration"),
  ]);
}

export function afterHitSpellRouteForInterrupt(input: {
  readonly before: BattleState;
  readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
  readonly holes: readonly BattleReducerRouteHole[];
  readonly result: BattleResolutionResult;
}): BattleReducerRouteEvents | undefined {
  if (input.fill.value.kind !== "resolve") {
    return undefined;
  }
  const choice = input.fill.value.choice;
  if (!isAfterHitSpellSelection(choice)) {
    return undefined;
  }
  const selectedChoice =
    /* v8 ignore next -- @preserve -- Reducer route projection runs only while the admitted interrupt frame remains on the stack. */
    input.before.interruptStack.length === 0
      ? undefined
      : currentInterruptCheckpoint(input.before)?.choices.find(
          (candidate): candidate is AfterHitSpellChoice =>
            isAfterHitSpellChoice(candidate) &&
            candidate.subject.procedureRef === choice.procedureRef,
        );
  const invocation =
    /* v8 ignore next -- @preserve -- The selected after-hit choice is admitted from the same procedure binding retained by the frame. */
    selectedChoice === undefined
      ? undefined
      : spellInvocationForInterruptChoice(
          input.before,
          interruptChoiceResponderId(selectedChoice),
          selectedChoice.subject.procedureRef,
        );
  /* v8 ignore next -- @preserve -- The selected after-hit choice is admitted from the same procedure binding retained by the frame. */
  if (invocation === undefined) return undefined;

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
    afterHitSpellResolveRoute(
      "interruptDecision",
      choiceHoles,
      "battleInterruptStack",
    ),
  ];

  if ("resource" in invocation && invocation.resource.tag === "spellSlot") {
    route.push(
      afterHitSpellDiscoverRoute(
        hasSaveFill ? ["savingThrowOutcome"] : ["interruptDecision"],
        "battleSpellSlotAndActionEconomy",
      ),
      afterHitSpellResolveRoute(
        choiceFill,
        input.holes,
        "battleSpellSlotAndActionEconomy",
      ),
    );
  }
  if (
    "resource" in invocation &&
    invocation.resource.tag === "spellAccessFreeCast"
  ) {
    route.push(
      afterHitSpellDiscoverRoute(
        hasSaveFill ? ["savingThrowOutcome"] : ["interruptDecision"],
        "battleFeatureResource",
      ),
      afterHitSpellResolveRoute(
        choiceFill,
        input.holes,
        "battleFeatureResource",
      ),
    );
  }
  if (invocation.procedure === "afterHitSaveGatedCondition") {
    if (
      input.result.tag !== "invalid" &&
      combatantsConditionsChanged(input.before, input.result.state)
    ) {
      route.push(
        afterHitSpellDiscoverRoute(
          ["savingThrowOutcome"],
          "battleConditionLifecycle",
        ),
        afterHitSpellResolveRoute(
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
        afterHitSpellDiscoverRoute(
          ["savingThrowOutcome"],
          "battleConcentration",
        ),
        afterHitSpellResolveRoute(
          "savingThrowOutcome",
          input.holes,
          "battleConcentration",
        ),
      );
    }
  }
  route.push(...afterHitDamageAndIlluminationRoutes(input, invocation));
  if (input.holes.includes("rolledDice")) {
    route.push(afterHitSpellDiscoverRoute(input.holes, "battleHitPoint"));
  }

  return nonEmptyRouteEvents(route);
}

function afterHitSpellInvocationOwners(
  invocation: ReturnType<typeof spellInvocationForInterruptChoice>,
): readonly BattleReducerRouteOwnerGroup[] {
  if (invocation === undefined) return [];
  const hasResource = "resource" in invocation;
  return [
    ...(hasResource && invocation.resource.tag === "spellSlot"
      ? (["battleSpellSlotAndActionEconomy"] as const)
      : []),
    ...(hasResource && invocation.resource.tag === "spellAccessFreeCast"
      ? (["battleFeatureResource"] as const)
      : []),
    ...(invocation.procedure === "afterHitDamageAndIllumination"
      ? (["battleActiveEffect", "battleConcentration"] as const)
      : []),
  ];
}

function afterHitDamageAndIlluminationRoutes(
  input: Parameters<typeof afterHitSpellRouteForInterrupt>[0],
  invocation: NonNullable<ReturnType<typeof spellInvocationForInterruptChoice>>,
): readonly BattleReducerRouteEvent[] {
  if (
    invocation.procedure !== "afterHitDamageAndIllumination" ||
    input.result.tag === "invalid"
  ) {
    return [];
  }
  return [
    ...(combatantsActiveEffectsChanged(input.before, input.result.state)
      ? [
          afterHitSpellResolveRoute(
            "interruptDecision",
            input.holes,
            "battleActiveEffect",
          ),
        ]
      : []),
    ...(combatantsConcentrationChanged(input.before, input.result.state)
      ? [
          afterHitSpellResolveRoute(
            "interruptDecision",
            input.holes,
            "battleConcentration",
          ),
        ]
      : []),
  ];
}

export function afterHitSpellEscapeRouteForResolution(
  input: AdmittedBattleResolutionInput,
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
    afterHitSpellResolveRoute(routeFill, holes, "battleAbilityCheck"),
  ];
  if (combatantsConditionsChanged(input.state, result.state)) {
    route.push(
      afterHitSpellResolveRoute(routeFill, holes, "battleConditionLifecycle"),
    );
  }
  if (combatantsConcentrationChanged(input.state, result.state)) {
    route.push(
      afterHitSpellResolveRoute(routeFill, holes, "battleConcentration"),
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
        spellActiveEffectExecutionRef(effect) === subject.effectRef &&
        effect.condition === "restrained" &&
        effect.turnStartDamage !== null &&
        effect.escape?.kind === "abilityCheck",
    ) ?? false
  );
}

function isAfterHitSpellConcentrationTeardownSubject(
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
        effect.kind === "afterHitDamageAndIllumination" &&
        effect.sourceProcedureRef === concentration.sourceProcedureRef &&
        effect.sourceCombatantId === subject.actorId,
    ),
  );
}

function isAfterHitSpellChoice(
  choice: BattleInterruptCheckpoint["choices"][number],
): choice is AfterHitSpellChoice {
  return (
    choice.kind === "nestedProcedure" &&
    choice.subject.tag === "runtimeCommand" &&
    choice.subject.command === "castAttackHitBonusActionSpell"
  );
}

function isAfterHitSpellSelection(
  choice: BattleInterruptProcedureSelection,
): choice is AfterHitSpellSelection {
  return choice.kind === "castAttackHitBonusActionSpell";
}

function afterHitSpellDiscoverRoute(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return discoverBattleActsRoute("afterHitSpell", holes, owner);
}

function afterHitSpellResolveRoute(
  fill: BattleReducerRouteFill,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectRoute("afterHitSpell", fill, holes, owner);
}

function afterHitSpellResolveWithoutFillRoute(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute("afterHitSpell", holes, owner);
}

export function afterHitSpellSavingThrowCompletionRoutes(input: {
  readonly state: BattleState;
  readonly fills: readonly BattleReducerRouteFill[];
}): BattleReducerRouteEvents | undefined {
  if (!battleHasAfterHitAttackDamageAddition(input.state)) {
    return undefined;
  }
  const fills = input.fills;
  if (!fills.includes("rolledDice") || !fills.includes("savingThrowOutcome")) {
    return undefined;
  }
  return [
    afterHitSpellResolveRoute(
      "rolledDice",
      ["savingThrowOutcome"],
      "battleHitPoint",
    ),
    afterHitSpellResolveRoute("savingThrowOutcome", [], "battleActiveEffect"),
  ];
}

export function afterHitSpellConcentrationTeardownRoutes(input: {
  readonly state: BattleState;
  readonly subject: BattleResolutionInput["subject"];
  readonly holes: readonly BattleReducerRouteHole[];
}): BattleReducerRouteEvents | undefined {
  if (
    !isAfterHitSpellConcentrationTeardownSubject(input.state, input.subject)
  ) {
    return undefined;
  }
  return [
    afterHitSpellResolveWithoutFillRoute(input.holes, "battleConcentration"),
    afterHitSpellResolveWithoutFillRoute(input.holes, "battleActiveEffect"),
  ];
}

export function afterHitSpellTurnBoundaryRouteForResolution(
  input: AdmittedBattleResolutionInput,
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
      : [afterHitSpellDiscoverRoute(holes, "battleActiveEffect")];
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "rolledDice") {
    const nextHoles =
      result.tag === "resolved" &&
      battleHasAfterHitEscapeAbilityCheck(result.state)
        ? (["abilityCheck"] as const)
        : holes;
    return [afterHitSpellResolveRoute(routeFill, nextHoles, "battleHitPoint")];
  }
  if (routeFill === "savingThrowOutcome") {
    return [
      afterHitSpellResolveRoute(
        "rolledDice",
        ["savingThrowOutcome"],
        "battleHitPoint",
      ),
      afterHitSpellResolveRoute(routeFill, holes, "battleActiveEffect"),
    ];
  }
  return undefined;
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
        isAfterHitTurnBoundaryEffect(effect) &&
        effect.kind === "spellCondition" &&
        effect.escape?.kind === "abilityCheck",
    ),
  );
}

function isAfterHitTurnBoundaryEffect(effect: BattleActiveEffect): boolean {
  return (
    (effect.kind === "spellTurnStartDamageAndSave" &&
      effect.source === "afterHitTimedDamageAndSave") ||
    (effect.kind === "spellCondition" && effect.turnStartDamage !== null)
  );
}

export function battleHasAfterHitAttackDamageAddition(
  state: BattleState,
): boolean {
  const topFrame = state.interruptStack.at(-1);
  const additions =
    topFrame?.kind === "replayContinuation"
      ? topFrame.continuation.attackDamageAdditions
      : topFrame?.kind === "interruptCheckpoint"
        ? topFrame.frame.activeInterrupt?.pendingAttackDamageAdditions
        : undefined;
  return additions?.some(isAfterHitAttackDamageAddition) ?? false;
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
