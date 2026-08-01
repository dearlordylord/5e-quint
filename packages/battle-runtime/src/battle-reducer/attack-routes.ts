// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import type {
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { battleHasAfterHitAttackDamageAddition } from "./after-hit-spell-routes.ts";
import {
  attackActionOptionForSubject,
  weaponAttackUsesActiveSpellOverride,
} from "./attack-damage-apply.ts";
import {
  ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
  ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
} from "./attack-ordering-messages.ts";
import { creatureAttackHit } from "./creature-attack.ts";
import { markedDamageRiderTransferRouteForResolution } from "./marked-damage-routes.ts";
import {
  charmSourceDamageBreakRouteForResolution,
  protectionCharmAttackRollModeRouteForResolution,
} from "./protection-charm-routes.ts";
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
  BattleReducerRouteSubjectFamily,
} from "./reducer-route-protocol.ts";
import {
  battleCombatantHasActiveEffectKind,
  combatantsActiveEffectsChanged,
} from "./reducer-route-state-query.ts";
import { battleHasWeaponDamageRiderHole } from "./weapon-spell-routes.ts";
type WeaponAttackResolutionSubject = Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "action"; readonly action: "attack" }
>;
export function creatureAttackRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (input.subject.tag !== "creatureAttack") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "attackRoll" && fill.kind === "attackRoll") {
    const target = input.state.combatants.get(input.subject.targetId);
    if (target === undefined) {
      return undefined;
    }
    const holes = creatureAttackHit({
      state: input.state,
      target,
      attackRoll: fill,
    })
      ? result.tag === "needsHoles"
        ? battleReducerRouteHoles(result.holes)
        : []
      : [];
    return [
      resolveBattleSubjectRoute(
        "creatureAttack",
        routeFill,
        holes,
        "battleAttackRoll",
      ),
    ];
  }
  if (routeFill !== "rolledDice") {
    return undefined;
  }
  return [
    resolveBattleSubjectRoute(
      "creatureAttack",
      routeFill,
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
      "battleHitPoint",
    ),
  ];
}

export function weaponAttackRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isWeaponAttackSubject(input.subject)) {
    return undefined;
  }

  const routeSubject = attackRouteSubject(input.state, input.subject);
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    if (result.tag !== "invalid" || result.reason !== "staleSubject") {
      return undefined;
    }
    return [
      resolveBattleSubjectWithoutFillRoute(
        "weaponAttack",
        [],
        "battleHoleFrontier",
      ),
    ];
  }
  if (fill.kind === "attackDamageDisposition") {
    const transferRoute = markedDamageRiderTransferRouteForResolution({
      state: input.state,
      result,
      holes: [],
    });
    if (transferRoute !== undefined) {
      return transferRoute;
    }
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return weaponAttackInvalidFillRoute(result, routeSubject, routeFill);
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const hostedRoute = weaponHostedAttackCompositionRouteForResolution({
    state: input.state,
    subject: input.subject,
    fill: routeFill,
    holes,
    result,
  });
  if (hostedRoute !== undefined) {
    return hostedRoute;
  }
  const event = (
    subject: BattleReducerRouteSubjectFamily,
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent =>
    resolveBattleSubjectRoute(subject, routeFill, holes, owner);

  if (weaponMasteryCleaveRouteStarted(input.fills)) {
    return weaponMasteryCleaveRouteForResolution(input, result, event);
  }

  if (routeFill === "targetChoice") {
    return [
      event(routeSubject, "battleTargetSelection"),
      ...protectionCharmAttackRollModeRouteForResolution(input, result),
    ];
  }
  if (routeFill === "attackRoll") {
    return holes.includes("savingThrowOutcome")
      ? [event("weaponMasteryProperty", "battleConditionLifecycle")]
      : [event(routeSubject, "battleAttackRoll")];
  }
  if (routeFill === "savingThrowOutcome") {
    return [event("weaponMasteryProperty", "battleConditionLifecycle")];
  }
  if (routeFill !== "rolledDice") {
    return undefined;
  }

  const weaponDamageRoute = event(routeSubject, "battleHitPoint");
  const routeTail: BattleReducerRouteEvent[] = [];
  if (battleHasAfterHitAttackDamageAddition(input.state)) {
    routeTail.push(event("afterHitSpell", "battleHitPoint"));
  }
  routeTail.push(...charmSourceDamageBreakRouteForResolution(input, result));
  if (holes.includes("unitFeatureDecision")) {
    routeTail.push(
      resolveBattleSubjectWithoutFillRoute(
        "weaponMasteryProperty",
        holes,
        "battleFeatureResource",
      ),
    );
  } else if (combatantsActiveEffectsChanged(input.state, result.state)) {
    routeTail.push(
      resolveBattleSubjectWithoutFillRoute(
        "weaponMasteryProperty",
        holes,
        "battleActiveEffect",
      ),
    );
  }
  if (
    input.state.interruptStack.at(-1)?.kind === "replayContinuation" &&
    result.tag === "resolved"
  ) {
    routeTail.push(
      resolveBattleSubjectWithoutFillRoute(
        "interruptStackResume",
        [],
        "battleInterruptStack",
      ),
    );
  }
  return [weaponDamageRoute, ...routeTail];
}

function weaponHostedAttackCompositionRouteForResolution(input: {
  readonly state: BattleState;
  readonly subject: WeaponAttackResolutionSubject;
  readonly fill: BattleReducerRouteFill;
  readonly holes: readonly BattleReducerRouteHole[];
  readonly result: Exclude<BattleResolutionResult, { readonly tag: "invalid" }>;
}): BattleReducerRouteEvents | undefined {
  const selectedAttack = attackActionOptionForSubject(
    input.state,
    input.subject,
  );
  const heldWeaponSubject =
    selectedAttack !== undefined &&
    weaponAttackUsesActiveSpellOverride(
      input.state,
      input.subject.actorId,
      selectedAttack,
    )
      ? "heldWeaponActiveEffect"
      : undefined;
  const hasMarkedDamageRider = battleCombatantHasActiveEffectKind(
    input.state,
    input.subject.actorId,
    "spellMarkedDamageRider",
  );
  const hasWeaponDamageRider =
    selectedAttack?.kind === "weapon" &&
    battleCombatantHasActiveEffectKind(
      input.state,
      input.subject.actorId,
      "spellWeaponDamageRider",
    );
  if (
    heldWeaponSubject === undefined &&
    !hasMarkedDamageRider &&
    !hasWeaponDamageRider
  ) {
    return undefined;
  }

  const route: BattleReducerRouteEvent[] = [];
  if (input.fill === "targetChoice") {
    if (hasMarkedDamageRider && input.result.tag === "needsHoles") {
      route.push(
        resolveBattleSubjectRoute(
          "markedDamageRiderEffect",
          input.fill,
          input.holes,
          "battleTargetSelection",
        ),
      );
    }
    if (heldWeaponSubject !== undefined && input.result.tag === "needsHoles") {
      route.push(
        discoverBattleActsRoute(
          heldWeaponSubject,
          input.holes,
          "battleActiveEffect",
        ),
      );
    }
    return nonEmptyRouteEvents(route);
  }

  if (input.fill === "attackRoll") {
    if (hasMarkedDamageRider) {
      route.push(
        resolveBattleSubjectRoute(
          "markedDamageRiderEffect",
          input.fill,
          input.holes,
          "battleAttackRoll",
        ),
      );
    }
    if (heldWeaponSubject !== undefined) {
      route.push(
        resolveBattleSubjectRoute(
          heldWeaponSubject,
          input.fill,
          input.holes,
          "battleAttackRoll",
        ),
      );
      if (input.result.tag === "needsHoles") {
        route.push(
          discoverBattleActsRoute(
            heldWeaponSubject,
            input.holes,
            "battleActiveEffect",
          ),
        );
      }
    }
    if (battleHasWeaponDamageRiderHole(input.result)) {
      route.push(
        discoverBattleActsRoute(
          "weaponDamageRider",
          input.holes,
          "battleActiveEffect",
        ),
      );
    }
    return nonEmptyRouteEvents(route);
  }

  if (input.fill === "rolledDice") {
    if (heldWeaponSubject !== undefined) {
      route.push(
        resolveBattleSubjectRoute(
          heldWeaponSubject,
          input.fill,
          input.holes,
          "battleHitPoint",
        ),
      );
    }
    if (hasMarkedDamageRider) {
      route.push(
        resolveBattleSubjectRoute(
          "markedDamageRiderEffect",
          input.fill,
          input.holes,
          "battleHitPoint",
        ),
      );
      route.push(
        ...(markedDamageRiderTransferRouteForResolution({
          state: input.state,
          result: input.result,
          holes: input.holes,
        }) ?? []),
      );
    }
    if (hasWeaponDamageRider) {
      route.push(
        resolveBattleSubjectRoute(
          "weaponDamageRider",
          input.fill,
          input.holes,
          "battleHitPoint",
        ),
      );
    }
    return nonEmptyRouteEvents(route);
  }

  return undefined;
}

function weaponAttackInvalidFillRoute(
  result: Extract<BattleResolutionResult, { readonly tag: "invalid" }>,
  subject: BattleReducerRouteSubjectFamily,
  routeFill: BattleReducerRouteFill,
): BattleReducerRouteEvents | undefined {
  const holes = weaponAttackOrderingInvalidHoles(result, routeFill);
  if (holes !== undefined) {
    return [
      resolveBattleSubjectRoute(
        subject,
        routeFill,
        holes,
        "battleHoleFrontier",
      ),
    ];
  }
  if (routeFill !== "targetChoice") {
    return undefined;
  }
  return [
    resolveBattleSubjectRoute(
      subject,
      routeFill,
      ["targetChoice"],
      "battleTargetSelection",
    ),
  ];
}

function weaponAttackOrderingInvalidHoles(
  result: Extract<BattleResolutionResult, { readonly tag: "invalid" }>,
  routeFill: BattleReducerRouteFill,
): readonly ["targetChoice"] | readonly ["attackRoll"] | undefined {
  if (
    result.reason === "invalidFill" &&
    result.message === ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE &&
    routeFill === "attackRoll"
  ) {
    return ["targetChoice"] as const;
  }
  if (
    result.reason === "invalidFill" &&
    result.message === ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE &&
    routeFill === "rolledDice"
  ) {
    return ["attackRoll"] as const;
  }
  return undefined;
}

function weaponMasteryCleaveRouteStarted(
  fills: readonly BattleFill[],
): boolean {
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
    resolveBattleSubjectWithoutFillRoute(
      "weaponMasteryProperty",
      [],
      "battleFeatureResource",
    ),
  ];
}

export function isWeaponAttackSubject(
  subject: BattleResolutionInput["subject"],
): subject is WeaponAttackResolutionSubject {
  return subject.tag === "action" && subject.action === "attack";
}

export function isStatBlockActionRouteSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag !== "action") {
    return false;
  }
  if (subject.action !== "attack" && subject.action !== "multiattack") {
    return false;
  }
  return state.combatants.get(subject.actorId)?.origin.kind === "statBlock";
}

function attackRouteSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): "statBlockAction" | "weaponAttack" {
  return isStatBlockActionRouteSubject(state, subject)
    ? "statBlockAction"
    : "weaponAttack";
}

export function battleActionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (input.subject.tag === "runtimeCommand") {
    if (input.subject.command !== "endTurn") {
      return undefined;
    }
    if (input.fills.length !== 0) {
      return undefined;
    }
    return resolveBattleSubjectWithoutFillRoute(
      "battleAction",
      [],
      "battleActionEconomy",
    );
  }
  if (
    input.subject.tag !== "action" ||
    input.subject.action !== "multiattack" ||
    !isStatBlockActionRouteSubject(input.state, input.subject) ||
    input.fills.length !== 0
  ) {
    return undefined;
  }
  if (
    result.tag !== "resolved" &&
    (result.tag !== "invalid" || result.reason !== "staleSubject")
  ) {
    return undefined;
  }
  return resolveBattleSubjectWithoutFillRoute(
    "statBlockAction",
    [],
    "battleStatBlockAction",
  );
}
