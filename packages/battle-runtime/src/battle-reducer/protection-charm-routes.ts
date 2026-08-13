import type { BattleSpellProcedureExecution } from "../character-execution-queries.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import { conditionApplicationPreventedByCreatureTypeProtection } from "./spell-condition-effects-helpers.ts";
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
} from "./reducer-route-protocol.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";
import { failedSavingThrowTargetIds } from "./saving-throw-outcomes.ts";
import {
  combatantConcentrationChanged,
  combatantsActiveEffectsChanged,
  combatantsConditionsChanged,
  targetDamagedByCasterOrAllySpellConditionRemoved,
} from "./reducer-route-state-query.ts";

export function protectionCharmRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (isSourceDamageBreakCharmedSaveGatedConditionInvocation(invocation)) {
    return [
      discoverBattleActsRoute(
        "creatureTypeTargetAdmission",
        ["targetChoice"],
        "battleSpellSlotAndActionEconomy",
      ),
      discoverBattleActsRoute(
        "protectionCharmActiveEffect",
        ["savingThrowOutcome", "targetChoice"],
        "battleSpellSlotAndActionEconomy",
      ),
    ];
  }
  if (!isCreatureTypeProtectionInvocation(invocation)) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "protectionCharmActiveEffect",
      ["targetChoice"],
      "battleSpellSlotAndActionEconomy",
    ),
  ];
}

export function protectionCharmRouteForResolution(
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
    resolveBattleSubjectRoute(
      "protectionCharmActiveEffect",
      "targetChoice",
      holes,
      "battleTargetSelection",
    ),
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
      resolveBattleSubjectRoute(
        "protectionCharmActiveEffect",
        "targetChoice",
        battleReducerRouteHoles(result.holes),
        "battleTargetSelection",
      ),
    ];
  }
  if (routeFill !== "savingThrowOutcome" || result.tag === "invalid") {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [
    resolveBattleSubjectRoute(
      "protectionCharmActiveEffect",
      "savingThrowOutcome",
      holes,
      "battleSavingThrowOutcome",
    ),
  ];
  if (result.tag === "resolved") {
    if (
      combatantsConditionsChanged(input.state, result.state) ||
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
  invocation: BattleSpellProcedureExecution | undefined,
): invocation is Extract<
  BattleSpellProcedureExecution,
  { readonly procedure: "creatureTypeProtection" }
> {
  return invocation?.procedure === "creatureTypeProtection";
}

function isCharmedSaveGatedConditionInvocation(
  invocation: BattleSpellProcedureExecution | undefined,
): invocation is Extract<
  BattleSpellProcedureExecution,
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
  invocation: BattleSpellProcedureExecution | undefined,
): invocation is Extract<
  BattleSpellProcedureExecution,
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
  return saveFill === undefined
    ? []
    : failedSavingThrowTargetIds(saveFill.value.outcomes);
}

function protectionCharmDiscover(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return discoverBattleActsRoute("protectionCharmActiveEffect", holes, owner);
}

function protectionCharmResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "protectionCharmActiveEffect",
    holes,
    owner,
  );
}

export function protectionCharmAttackRollModeRouteForResolution(
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

export function charmSourceDamageBreakRouteForResolution(
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
    resolveBattleSubjectWithoutFillRoute(
      "charmSourceDamageBreak",
      [],
      "battleHitPoint",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "charmSourceDamageBreak",
      [],
      "battleConditionLifecycle",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "charmSourceDamageBreak",
      [],
      "battleActiveEffect",
    ),
  ];
}
