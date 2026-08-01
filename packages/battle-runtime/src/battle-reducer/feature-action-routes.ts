import type {
  BattleActDiscoveryCandidate,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterUnitProcedure,
  unitSupportProfileKind,
} from "../character-execution-queries.ts";
import { isCharacterBattleCreatureState } from "./creature-state-execution.ts";
import {
  battleReducerRouteFill,
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteFillKind,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
} from "./reducer-route-protocol.ts";

export function isUnitFeatureBonusActionRouteSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): boolean {
  if (subject.tag !== "unitFeature") {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return false;
  }
  const procedure = characterUnitProcedure(
    actor.origin.execution,
    subject.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  return (
    procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "ongoingFeature" &&
    procedure.execution.activationTrigger === "bonusAction"
  );
}

export function activeFeatureBonusActionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    input.fills.length !== 0 ||
    !isUnitFeatureBonusActionRouteSubject(input.state, input.subject)
  ) {
    return undefined;
  }
  return [
    resolveBattleSubjectWithoutFillRoute(
      "unitFeatureBonusAction",
      [],
      "battleActionEconomy",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "unitFeatureBonusAction",
      [],
      "battleFeatureResource",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "unitFeatureBonusAction",
      [],
      "battleActiveEffect",
    ),
  ];
}

export function attackActionAreaSaveDamageReplacementRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isAttackActionAreaSaveDamageReplacementSubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "attackActionAreaSaveDamageReplacement",
    battleReducerRouteHoles(act.initialHoles),
    "battleFeatureResource",
  );
}

export function attackActionAreaSaveDamageReplacementRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isAttackActionAreaSaveDamageReplacementSubject(input.state, input.subject)
  ) {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    if (result.tag !== "invalid") {
      return undefined;
    }
    return [
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        [],
        "battleFeatureResource",
      ),
    ];
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "savingThrowOutcome") {
    if (result.tag === "invalid") {
      return [
        attackActionAreaSaveDamageReplacementResolveRoute(
          "savingThrowOutcome",
          ["savingThrowOutcome"],
          "battleAreaShape",
        ),
      ];
    }

    const holes =
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
    return [
      attackActionAreaSaveDamageReplacementResolveRoute(
        "savingThrowOutcome",
        holes,
        "battleAreaShape",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        holes,
        "battleSavingThrowOutcome",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        holes,
        "battleDamageType",
      ),
    ];
  }

  if (routeFill !== "rolledDice") {
    return undefined;
  }
  if (result.tag === "invalid") {
    return [
      attackActionAreaSaveDamageReplacementResolveRoute(
        "rolledDice",
        ["rolledDice"],
        "battleDamageRoll",
      ),
    ];
  }
  if (result.tag !== "resolved") {
    return undefined;
  }

  const tail = result.state.currentTurnResources.actionResources.some(
    (resource) =>
      resource.source === "classFeatureExtraAttack" &&
      resource.sourceOwnerId === input.subject.actorId,
  )
    ? [
        discoverBattleActsRoute(
          "weaponAttack" as const,
          ["targetChoice"] as const,
          "battleAttackActionProcedure" as const,
        ),
      ]
    : [
        attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
          [],
          "battleAttackActionProcedure",
        ),
      ];
  return [
    attackActionAreaSaveDamageReplacementResolveRoute(
      "rolledDice",
      [],
      "battleDamageRoll",
    ),
    attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
      [],
      "battleHitPoint",
    ),
    attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
      [],
      "battleFeatureResource",
    ),
    ...tail,
  ];
}

function attackActionAreaSaveDamageReplacementResolveRoute(
  fill: BattleReducerRouteFillKind,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectRoute(
    "attackActionAreaSaveDamageReplacement",
    fill,
    holes,
    owner,
  );
}

function attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "attackActionAreaSaveDamageReplacement",
    holes,
    owner,
  );
}

function isAttackActionAreaSaveDamageReplacementSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): boolean {
  if (subject.tag !== "unitFeature") {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") {
    return false;
  }
  const procedure = characterUnitProcedure(
    actor.origin.execution,
    subject.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  return procedure?.kind === "unitFeature"
    ? procedure.execution.kind === "attackActionAreaSaveDamageReplacement"
    : procedure?.kind === "unitSupportProfile" &&
        unitSupportProfileKind(procedure.execution) ===
          "attackActionAreaSaveDamageReplacement";
}
