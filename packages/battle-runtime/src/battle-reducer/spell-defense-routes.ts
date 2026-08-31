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
import { zeroHitPointSpellEffectTeardownRouteForResolution } from "./combatant-lifecycle-routes.ts";
import { activeFeatureSpellAttackRollModeResolutionRouteEvents } from "./active-feature-spell-routes.ts";
import { battleHoleFamilyKind } from "./hole-helpers.ts";
import { markedDamageRiderTransferRouteForResolution } from "./marked-damage-routes.ts";
import { passiveDamageAdjustmentRouteForSpellDamageResolution } from "./passive-projection-routes.ts";
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
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
  BattleReducerRouteSubjectFamily,
} from "./reducer-route-protocol.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";
import { battleActiveEffects } from "./reducer-route-state-query.ts";
import {
  spellAttackProcedureBaseRouteForResolution,
  spellAttackProcedureRouteHoles,
} from "./spell-invocation-routes.ts";

function isSpellBaseArmorClassEffectSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(state, subject)?.procedure ===
      "persistentArmorEffect"
  );
}

export function spellBaseArmorClassEffectRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isSpellBaseArmorClassEffectSubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "spellBaseArmorClassEffect",
    battleReducerRouteHoles(act.initialHoles),
    "battleSpellSlotAndActionEconomy",
  );
}

export function wardedTargetInterdictionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  if (isTargetingSaveInterdictionSubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "wardedTargetInterdiction",
        ["targetChoice"],
        "battleSpellSlotAndActionEconomy",
      ),
    ];
  }
  if (areaEffectBypassesWardedTargetInterdiction(state, act)) {
    return [
      discoverBattleActsRoute(
        "wardedTargetInterdiction",
        [],
        "battleAreaShape",
      ),
    ];
  }
  return undefined;
}

export function wardedTargetInterdictionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  if (isTargetingSaveInterdictionSubject(input.state, input.subject)) {
    const routeFill = battleReducerRouteFill(fill);
    if (routeFill !== "spellTargetList") {
      return undefined;
    }
    const targetSelectionRoute: BattleReducerRouteEvent =
      resolveBattleSubjectRoute(
        "wardedTargetInterdiction",
        "targetChoice",
        result.tag === "needsHoles"
          ? battleReducerRouteHoles(result.holes)
          : result.tag === "invalid"
            ? ["targetChoice"]
            : [],
        "battleTargetSelection",
      );
    if (
      result.tag !== "resolved" ||
      !activeEffectKindsAdded(input.state, result.state).includes(
        "targetingSaveInterdiction",
      )
    ) {
      return [targetSelectionRoute];
    }
    return [
      targetSelectionRoute,
      wardedTargetInterdictionResolveWithoutFill("battleActiveEffect"),
    ];
  }
  if (fill.kind === "targetingSaveInterdictionOutcome") {
    const replacementTarget =
      !fill.value.saveSucceeded && fill.value.outcome.kind === "newTarget";
    const route: BattleReducerRouteEvent[] = [
      discoverBattleActsRoute(
        "wardedTargetInterdiction",
        replacementTarget
          ? ["targetingSaveInterdictionOutcome", "targetChoice"]
          : ["targetingSaveInterdictionOutcome"],
        "battleActiveEffect",
      ),
      resolveBattleSubjectRoute(
        "wardedTargetInterdiction",
        "targetingSaveInterdictionOutcome",
        replacementTarget ? ["targetChoice"] : [],
        "battleSavingThrowOutcome",
      ),
    ];
    if (replacementTarget) {
      route.push(
        resolveBattleSubjectRoute(
          "wardedTargetInterdiction",
          "targetChoice",
          result.tag === "invalid" ? ["targetChoice"] : [],
          "battleTargetSelection",
        ),
      );
    } else {
      route.push(
        wardedTargetInterdictionResolveWithoutFill(
          fill.value.saveSucceeded
            ? "battleHoleFrontier"
            : "battleActionEconomy",
        ),
      );
    }
    return nonEmptyRouteEvents(route);
  }
  if (areaEffectBypassesWardedTargetInterdiction(input.state, input)) {
    const routeFill = battleReducerRouteFill(fill);
    if (routeFill !== "savingThrowOutcome") {
      return undefined;
    }
    return [wardedTargetInterdictionResolveWithoutFill("battleAreaShape")];
  }
  const actorId = subjectActorId(input.subject);
  if (
    actorId === undefined ||
    !targetingSaveInterdictionRemoved(input.state, result, actorId)
  ) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "attackRoll") {
    return wardedTargetInterdictionEarlyEndRoute("battleAttackRoll");
  }
  if (routeFill === "rolledDice") {
    return wardedTargetInterdictionEarlyEndRoute("battleHitPoint");
  }
  if (
    (routeFill === "targetChoice" || routeFill === "spellTargetList") &&
    input.subject.tag === "actionSpell"
  ) {
    return wardedTargetInterdictionEarlyEndRoute(
      "battleSpellSlotAndActionEconomy",
    );
  }
  return undefined;
}

function wardedTargetInterdictionEarlyEndRoute(
  owner: Extract<
    BattleReducerRouteOwnerGroup,
    "battleAttackRoll" | "battleHitPoint" | "battleSpellSlotAndActionEconomy"
  >,
): BattleReducerRouteEvents {
  return [
    discoverBattleActsRoute(
      "wardedTargetInterdiction",
      [],
      "battleActiveEffect",
    ),
    wardedTargetInterdictionResolveWithoutFill(owner),
    wardedTargetInterdictionResolveWithoutFill("battleActiveEffect"),
  ];
}

function wardedTargetInterdictionResolveWithoutFill(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "wardedTargetInterdiction",
    [],
    owner,
  );
}

function targetingSaveInterdictionRemoved(
  state: BattleState,
  result: BattleResolutionResult,
  actorId: CombatantId,
): boolean {
  if (result.tag !== "needsHoles" && result.tag !== "resolved") {
    return false;
  }
  return (
    combatantHasTargetingSaveInterdiction(state, actorId) &&
    !combatantHasTargetingSaveInterdiction(result.state, actorId)
  );
}

function areaEffectBypassesWardedTargetInterdiction(
  state: BattleState,
  source:
    | Pick<BattleActDiscoveryCandidate, "subject" | "initialHoles">
    | Pick<BattleResolutionInput, "subject" | "fills">,
): boolean {
  if (
    source.subject.tag !== "actionSpell" ||
    spellInvocationForRouteSubject(state, source.subject)?.procedure !==
      "saveGatedDamage"
  ) {
    return false;
  }
  if (!battleHasTargetingSaveInterdiction(state)) {
    return false;
  }
  if ("initialHoles" in source) {
    const hasDirectTargetHole = source.initialHoles.some((hole) => {
      const family = battleHoleFamilyKind(hole);
      return (
        family === "targetChoice" ||
        family === "spellTargetList" ||
        family === "objectTargetChoice"
      );
    });
    const savingThrowHole = source.initialHoles.find(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> =>
        hole.kind === "savingThrowOutcome",
    );
    return (
      !hasDirectTargetHole &&
      savingThrowHole !== undefined &&
      (!("areaChoices" in savingThrowHole) ||
        savingThrowHole.areaChoices.some((areaChoice) =>
          areaChoice.affectedTargetIds.some((targetId) =>
            combatantHasTargetingSaveInterdiction(state, targetId),
          ),
        ))
    );
  }
  if (
    source.fills.some((fill) => {
      const kind = battleFillKind(fill);
      return (
        kind === "targetChoice" ||
        kind === "spellTargetList" ||
        kind === "objectTargetChoice"
      );
    })
  ) {
    return false;
  }
  const savingThrowFill = source.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  if (savingThrowFill === undefined) {
    return false;
  }
  const affectedTargetIds =
    "area" in savingThrowFill.value
      ? savingThrowFill.value.area.affectedTargetIds
      : savingThrowFill.value.outcomes.map((outcome) => outcome.targetId);
  return affectedTargetIds.some((targetId) =>
    combatantHasTargetingSaveInterdiction(state, targetId),
  );
}

function battleHasTargetingSaveInterdiction(state: BattleState): boolean {
  for (const combatant of state.combatants.values()) {
    if (combatantHasTargetingSaveInterdiction(state, combatant.combatantId)) {
      return true;
    }
  }
  return false;
}

function combatantHasTargetingSaveInterdiction(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return (
    state.combatants
      .get(combatantId)
      ?.activeEffects.some(
        (effect) => effect.kind === "targetingSaveInterdiction",
      ) ?? false
  );
}

function subjectActorId(
  subject: BattleResolutionInput["subject"],
): CombatantId | undefined {
  return "actorId" in subject ? subject.actorId : undefined;
}

export function spellBaseArmorClassEffectRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isSpellBaseArmorClassEffectSubject(input.state, input.subject)) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleReducerRouteFill(fill) !== "targetChoice") {
    return undefined;
  }
  const holes: readonly BattleReducerRouteHole[] =
    result.tag === "invalid" && result.reason === "invalidFill"
      ? ["targetChoice"]
      : result.tag === "needsHoles"
        ? battleReducerRouteHoles(result.holes)
        : [];
  const targetSelectionRoute: BattleReducerRouteEvent =
    resolveBattleSubjectRoute(
      "spellBaseArmorClassEffect",
      "targetChoice",
      holes,
      "battleTargetSelection",
    );
  if (
    result.tag !== "resolved" ||
    !spellBaseArmorClassEffectWasAdded(input.state, result.state)
  ) {
    return [targetSelectionRoute];
  }
  return [
    targetSelectionRoute,
    spellBaseArmorClassEffectResolveWithoutFill("battleActiveEffect"),
    spellBaseArmorClassEffectResolveWithoutFill("battleArmorClass"),
  ];
}

export function spellBaseArmorClassEffectResolveWithoutFill(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "spellBaseArmorClassEffect",
    [],
    owner,
  );
}

function spellBaseArmorClassEffectWasAdded(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      spellBaseArmorClassEffectCount(combatant.activeEffects) >
      spellBaseArmorClassEffectCount(
        before.combatants.get(combatant.combatantId)?.activeEffects ?? [],
      ),
  );
}

export function spellBaseArmorClassEffectExpired(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...before.combatants.values()].some(
    (combatant) =>
      spellBaseArmorClassEffectCount(combatant.activeEffects) >
      spellBaseArmorClassEffectCount(
        after.combatants.get(combatant.combatantId)?.activeEffects ?? [],
      ),
  );
}

function spellBaseArmorClassEffectCount(
  activeEffects: readonly BattleActiveEffect[],
): number {
  return activeEffects.filter((effect) => effect.kind === "spellBaseArmorClass")
    .length;
}

export function spellAttackProcedureRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const base = spellAttackProcedureBaseRouteForResolution(input, result);
  if (base === undefined) return undefined;
  if (base.tag === "terminal") return base.route;
  const fill = base.fill;
  const holes = spellAttackProcedureRouteHoles(input, result);
  return [
    ...base.route,
    ...passiveDamageAdjustmentRouteForSpellDamageResolution(input, result),
    ...activeFeatureSpellAttackRollModeResolutionRouteEvents(input, result),
    ...spellAttackHitActiveEffectAdmissionRouteForResolution(input, result),
    ...zeroHitPointSpellEffectTeardownRouteForResolution(input, fill, result),
    ...(markedDamageRiderTransferRouteForResolution({
      state: input.state,
      result,
      holes,
    }) ?? []),
  ];
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
          resolveBattleSubjectWithoutFillRoute(
            subject,
            [],
            "battleActiveEffect" as const,
          ),
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
  for (const effect of battleActiveEffects(after)) {
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
  for (const effect of battleActiveEffects(state)) {
    counts.set(effect.kind, (counts.get(effect.kind) ?? 0) + 1);
  }
  return counts;
}

function isTargetingSaveInterdictionSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "bonusActionSpell" }
> {
  return (
    subject.tag === "bonusActionSpell" &&
    spellInvocationForRouteSubject(state, subject)?.procedure ===
      "targetingSaveInterdiction"
  );
}
