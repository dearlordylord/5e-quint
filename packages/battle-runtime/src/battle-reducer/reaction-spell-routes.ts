import type {
  BattleFill,
  BattleInterruptCheckpoint,
  BattleInterruptProcedureSelection,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { interruptChoiceResponderId } from "../battle-state-execution.ts";
import type { BattleInterruptSubject } from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import { currentInterruptCheckpoint } from "./battle-snapshot.ts";
import {
  battleReducerRouteFill,
  battleReducerRouteHoles,
  resolveBattleInterruptRoute,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteFill,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
  BattleReducerRouteSubjectFamily,
} from "./reducer-route-protocol.ts";
import { spellInvocationForInterruptChoice } from "./reducer-route-spell-query.ts";

type TriggeredReactionSpellChoice = Extract<
  BattleInterruptCheckpoint["choices"][number],
  { readonly kind: "nestedProcedure" }
> & {
  readonly subject: Extract<
    BattleInterruptSubject,
    { readonly command: "castTriggeredReactionSpell" }
  >;
};
type TriggeredReactionSpellSelection = Extract<
  BattleInterruptProcedureSelection,
  { readonly kind: "castTriggeredReactionSpell" }
>;
type ReactionInterruptPayloadRouteSubject = Extract<
  BattleReducerRouteSubjectFamily,
  | "reactionArmorClassEffect"
  | "reactionAfterDamageEffect"
  | "reactionSpellInterruption"
>;

export function reactionSpellRouteForInterrupt(input: {
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
  if (frame === null || !isReactionSpellCastingTimeFrame(frame)) {
    return undefined;
  }
  const selectedChoice = selectedTriggeredReactionSpellChoice({
    frame,
    responderId: input.fill.value.responderId,
    selection: input.fill.value.choice,
  });
  if (selectedChoice !== undefined) {
    const payloadSubject = reactionInterruptPayloadRouteSubjectForChoice(
      input.before,
      frame,
      selectedChoice,
    );
    if (payloadSubject !== undefined) {
      const payloadRoute = reactionInterruptPayloadRouteForInterrupt({
        subject: payloadSubject,
        choice: selectedChoice,
        selection: input.fill.value.choice,
        holes: input.holes,
        result: input.result,
      });
      if (payloadRoute !== undefined) {
        return payloadRoute;
      }
    }
  }

  const eventForOwner = (
    subject: BattleReducerRouteSubjectFamily,
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent =>
    resolveBattleInterruptRoute(
      subject,
      "interruptDecision",
      input.holes,
      owner,
    );
  if (frame.trigger === "creatureFalls" && input.result.tag === "resolved") {
    return [
      eventForOwner("reactionSpell", "battleInterruptStack"),
      eventForOwner("reactionSpell", "battleSpellSlotAndActionEconomy"),
      eventForOwner(
        "reactionFallMitigation",
        "battleSpellSlotAndActionEconomy",
      ),
    ];
  }
  /* v8 ignore start -- @preserve -- Every currently admitted afterDamage triggered-reaction invocation narrows to saveGatedDamage and returns through reactionAfterDamageEffect above. Only a malformed cross-wired checkpoint reaches this fallback; a new admitted procedure must add an explicit payload route and test. */
  if (frame.trigger === "afterDamage" && input.result.tag === "resolved") {
    const route: BattleReducerRouteEvents = [
      eventForOwner("reactionSpell", "battleInterruptStack"),
      eventForOwner("reactionSpell", "battleSpellSlotAndActionEconomy"),
    ];
    return combatantHitPointsChanged(input.before, input.result.state)
      ? [...route, eventForOwner("reactionSpell", "battleHitPoint")]
      : route;
  }
  /* v8 ignore stop -- @preserve */
  if (frame.trigger === "spellCast") {
    return [
      eventForOwner("reactionSpell", "battleInterruptStack"),
      eventForOwner("reactionSpell", "battleSpellSlotAndActionEconomy"),
    ];
  }
  return undefined;
}

function selectedTriggeredReactionSpellChoice(input: {
  readonly frame: BattleInterruptCheckpoint;
  readonly responderId: CombatantId;
  readonly selection: TriggeredReactionSpellSelection;
}): TriggeredReactionSpellChoice | undefined {
  return input.frame.choices.find(
    (choice): choice is TriggeredReactionSpellChoice =>
      isTriggeredReactionSpellChoice(choice) &&
      interruptChoiceResponderId(choice) === input.responderId &&
      choice.subject.procedureRef === input.selection.procedureRef,
  );
}

function isTriggeredReactionSpellChoice(
  choice: BattleInterruptCheckpoint["choices"][number],
): choice is TriggeredReactionSpellChoice {
  return (
    choice.kind === "nestedProcedure" &&
    choice.subject.tag === "runtimeCommand" &&
    choice.subject.command === "castTriggeredReactionSpell"
  );
}

function reactionInterruptPayloadRouteSubjectForChoice(
  state: BattleState,
  frame: BattleInterruptCheckpoint,
  choice: TriggeredReactionSpellChoice,
): ReactionInterruptPayloadRouteSubject | undefined {
  const invocation = spellInvocationForInterruptChoice(
    state,
    interruptChoiceResponderId(choice),
    choice.subject.procedureRef,
  );
  if (invocation?.procedure === "triggeredArmorDefense") {
    return "reactionArmorClassEffect";
  }
  if (
    frame.trigger === "afterDamage" &&
    invocation?.procedure === "saveGatedDamage"
  ) {
    return "reactionAfterDamageEffect";
  }
  if (
    frame.trigger === "spellCast" &&
    invocation?.procedure === "spellCastInterruptionReaction"
  ) {
    return "reactionSpellInterruption";
  }
  return undefined;
}

function reactionInterruptPayloadRouteForInterrupt(input: {
  readonly subject: ReactionInterruptPayloadRouteSubject;
  readonly choice: TriggeredReactionSpellChoice;
  readonly selection: TriggeredReactionSpellSelection;
  readonly holes: readonly BattleReducerRouteHole[];
  readonly result: BattleResolutionResult;
}): BattleReducerRouteEvents | undefined {
  const initialHoles = battleReducerRouteHoles(input.choice.initialHoles);
  const interruptEvent = (
    holes: readonly BattleReducerRouteHole[],
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent =>
    resolveBattleInterruptRoute(
      input.subject,
      "interruptDecision",
      holes,
      owner,
    );
  const subjectEvent = (
    fill: BattleReducerRouteFill,
    holes: readonly BattleReducerRouteHole[],
    owner: BattleReducerRouteOwnerGroup,
    subject: BattleReducerRouteSubjectFamily = input.subject,
  ): BattleReducerRouteEvent =>
    resolveBattleSubjectRoute(subject, fill, holes, owner);
  const subjectWithoutFillEvent = (
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent =>
    resolveBattleSubjectWithoutFillRoute(input.subject, input.holes, owner);

  if (
    input.subject === "reactionArmorClassEffect" &&
    input.result.tag === "resolved"
  ) {
    return [
      interruptEvent(input.holes, "battleSpellSlotAndActionEconomy"),
      interruptEvent(input.holes, "battleActiveEffect"),
      subjectWithoutFillEvent("battleArmorClass"),
      subjectWithoutFillEvent("battleInterruptStack"),
    ];
  }

  if (
    input.subject === "reactionAfterDamageEffect" &&
    input.result.tag === "resolved"
  ) {
    return [
      interruptEvent(initialHoles, "battleInterruptStack"),
      ...reactionPayloadNestedFillRoute({
        subjectEvent,
        fills: input.selection.fills,
        initialHoles,
      }),
      subjectWithoutFillEvent("battleSpellSlotAndActionEconomy"),
    ];
  }

  if (input.subject === "reactionSpellInterruption") {
    const nestedFillRoute = reactionPayloadNestedFillRoute({
      subjectEvent,
      fills: input.selection.fills,
      initialHoles,
      savingThrowOwner: "battleSpellSlotAndActionEconomy",
      savingThrowRemainingHoles:
        input.result.tag === "needsHoles"
          ? battleReducerRouteHoles(input.result.holes)
          : undefined,
      rolledDiceSubject: "slotSpell",
    });
    return [
      interruptEvent(initialHoles, "battleInterruptStack"),
      ...(nestedFillRoute.length === 0
        ? [interruptEvent(input.holes, "battleSpellSlotAndActionEconomy")]
        : nestedFillRoute),
      ...(input.result.tag === "resolved"
        ? [subjectWithoutFillEvent("battleInterruptStack")]
        : []),
    ];
  }

  return undefined;
}

function reactionPayloadNestedFillRoute(input: {
  readonly subjectEvent: (
    fill: BattleReducerRouteFill,
    holes: readonly BattleReducerRouteHole[],
    owner: BattleReducerRouteOwnerGroup,
    subject?: BattleReducerRouteSubjectFamily,
  ) => BattleReducerRouteEvent;
  readonly fills: readonly BattleFill[];
  readonly initialHoles: readonly BattleReducerRouteHole[];
  readonly savingThrowOwner?: BattleReducerRouteOwnerGroup | undefined;
  readonly savingThrowRemainingHoles?:
    | readonly BattleReducerRouteHole[]
    | undefined;
  readonly rolledDiceSubject?: BattleReducerRouteSubjectFamily | undefined;
}): readonly BattleReducerRouteEvent[] {
  const events: BattleReducerRouteEvent[] = [];
  let remainingHoles = input.initialHoles;
  for (const fill of input.fills) {
    const routeFill = battleReducerRouteFill(fill);
    if (routeFill === undefined) {
      continue;
    }
    remainingHoles = remainingHoles.filter((hole) => hole !== routeFill);
    if (routeFill === "savingThrowOutcome") {
      events.push(
        input.subjectEvent(
          routeFill,
          input.savingThrowRemainingHoles ?? remainingHoles,
          input.savingThrowOwner ?? "battleSavingThrowOutcome",
        ),
      );
    } else if (routeFill === "rolledDice") {
      events.push(
        input.subjectEvent(
          routeFill,
          remainingHoles,
          "battleHitPoint",
          input.rolledDiceSubject,
        ),
      );
    }
  }
  return events;
}

export function reactionSpellRouteSubjectForInterruptFrame(
  state: BattleState,
  frame: BattleInterruptCheckpoint,
): ReactionInterruptPayloadRouteSubject | "reactionSpell" | undefined {
  if (!isReactionSpellCastingTimeFrame(frame)) {
    return undefined;
  }
  const subjects = new Set(
    frame.choices.flatMap(
      (choice): readonly ReactionInterruptPayloadRouteSubject[] => {
        if (!isTriggeredReactionSpellChoice(choice)) {
          return [];
        }
        const subject = reactionInterruptPayloadRouteSubjectForChoice(
          state,
          frame,
          choice,
        );
        return subject === undefined ? [] : [subject];
      },
    ),
  );
  return subjects.size === 1 ? [...subjects][0] : "reactionSpell";
}

function isReactionSpellCastingTimeFrame(
  frame: BattleInterruptCheckpoint,
): frame is Extract<
  BattleInterruptCheckpoint,
  {
    readonly trigger:
      | "attackHit"
      | "afterDamage"
      | "creatureFalls"
      | "spellCast";
  }
> {
  return (
    frame.trigger === "attackHit" ||
    frame.trigger === "afterDamage" ||
    frame.trigger === "creatureFalls" ||
    frame.trigger === "spellCast"
  );
}

/* v8 ignore start -- @preserve -- This HP comparison serves only the malformed-checkpoint fallback above; every admitted afterDamage triggered-reaction invocation uses the typed reactionAfterDamageEffect route. */
function combatantHitPointsChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      combatant.hp !== before.combatants.get(combatant.combatantId)?.hp,
  );
}
/* v8 ignore stop -- @preserve */
