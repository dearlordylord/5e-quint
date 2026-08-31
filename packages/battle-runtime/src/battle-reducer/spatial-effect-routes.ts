import type {
  BattleActDiscoveryCandidate,
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { BattleSpellProcedureExecution } from "../character-execution-queries.ts";
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
  BattleReducerRouteFill,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
  BattleReducerRouteSubjectFamily,
} from "./reducer-route-protocol.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";
import { Match } from "effect";

export function spatialEffectCompositionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (
    act.subject.tag !== "actionSpell" &&
    act.subject.tag !== "bonusActionSpell"
  ) {
    return undefined;
  }
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (invocation === undefined) {
    return undefined;
  }
  if (isObjectLightDiscoverySubject(invocation)) {
    return spatialCompositionDiscover(
      "objectLightRider",
      ["targetChoice"],
      "battleSpellSlotAndActionEconomy",
    );
  }
  if (!isSpatialEffectCompositionDiscoverySubject(invocation)) {
    return undefined;
  }
  return spatialCompositionDiscover(
    "spatialEffect",
    spatialEffectCompositionDiscoveryHoles(invocation),
    "battleSpellSlotAndActionEconomy",
  );
}

export function spatialEffectCompositionRuntimeRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (act.subject.tag !== "runtimeCommand") {
    return undefined;
  }
  if (
    act.subject.command === "move" &&
    battleHasActiveAreaDifficultTerrainHazard(state)
  ) {
    return spatialCompositionDiscover(
      "spatialEffect",
      ["movement"],
      "battleAreaHazard",
    );
  }
  if (act.subject.command === "persistentAreaSaveConditionSave") {
    return spatialCompositionDiscover(
      "spatialEffect",
      ["savingThrowOutcome"],
      "battleAreaHazard",
    );
  }
  if (act.subject.command === "movableZoneSave") {
    return spatialCompositionDiscover(
      "spatialEffect",
      ["savingThrowOutcome"],
      "battleAreaHazard",
    );
  }
  if (act.subject.command === "persistentAreaSaveConditionEscapeSave") {
    return spatialCompositionDiscover(
      "spatialEffect",
      ["savingThrowOutcome"],
      "battleAreaHazard",
    );
  }
  if (act.subject.command === "fixedCostMovementReplacement") {
    return spatialCompositionDiscover(
      "movementPresentation",
      ["movement"],
      "battleMovementResource",
    );
  }
  return undefined;
}

export function spatialEffectCompositionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag === "invalid") {
    return undefined;
  }
  if (input.subject.tag === "runtimeCommand") {
    return spatialEffectCompositionRuntimeRouteForResolution(input, result);
  }
  if (
    input.subject.tag !== "actionSpell" &&
    input.subject.tag !== "bonusActionSpell"
  ) {
    return undefined;
  }
  const invocation = spellInvocationForRouteSubject(input.state, input.subject);
  const procedure = invocation?.procedure;
  const movableLightRoute = movableLightCompositionRoute(invocation);
  if (movableLightRoute !== undefined) return movableLightRoute;
  if (procedure === "saveGatedAttackRollAdvantage") {
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "targetChoice",
        ["savingThrowOutcome"],
        "battleAreaShape",
      ),
      spatialCompositionResolve(
        "spatialEffect",
        "savingThrowOutcome",
        [],
        "battleSavingThrowOutcome",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConcentration",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleLightProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleSightProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleAttackRollMode",
      ),
    ];
  }
  if (invocation?.procedure === "persistentAreaTrait") {
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "targetChoice",
        [],
        "battleAreaShape",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConcentration",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleObscurementProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleSightProjection",
      ),
    ];
  }
  if (invocation?.procedure === "persistentAreaSaveCondition") {
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "targetChoice",
        [],
        "battleAreaShape",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill("spatialEffect", "battleAreaHazard"),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleCreatureSpaceMovement",
      ),
    ];
  }
  const persistentAreaRoute = persistentAreaCompositionRoute(invocation);
  if (persistentAreaRoute !== undefined) return persistentAreaRoute;
  const objectLightRoute = objectLightCompositionRoute(procedure);
  if (objectLightRoute !== undefined) return objectLightRoute;
  return forcedMovementCubeBurstCompositionRoute(input, result, invocation);
}

type SpatialRouteInvocation = NonNullable<
  ReturnType<typeof spellInvocationForRouteSubject>
>;

function movableLightCompositionRoute(
  invocation: SpatialRouteInvocation | undefined,
): BattleReducerRouteEvents | undefined {
  if (invocation?.procedure !== "movableLightManifestation") return undefined;
  return Match.value(invocation.operation).pipe(
    Match.when(
      "create",
      (): BattleReducerRouteEvents => [
        spatialCompositionResolveWithoutFill(
          "spatialEffect",
          "battleActiveEffect",
        ),
        spatialCompositionResolveWithoutFill(
          "spatialEffect",
          "battleConcentration",
        ),
        spatialCompositionResolveWithoutFill(
          "spatialEffect",
          "battleLightProjection",
        ),
      ],
    ),
    Match.when(
      "reposition",
      (): BattleReducerRouteEvents => [
        spatialCompositionResolve(
          "spatialEffect",
          "targetChoice",
          [],
          "battleAreaShape",
        ),
        spatialCompositionResolveWithoutFill(
          "spatialEffect",
          "battleLightProjection",
        ),
      ],
    ),
    Match.exhaustive,
  );
}

function persistentAreaCompositionRoute(
  invocation: SpatialRouteInvocation | undefined,
): BattleReducerRouteEvents | undefined {
  const procedure = invocation?.procedure;
  if (
    procedure !== "persistentAreaSaveDamage" &&
    procedure !== "areaMovementDistanceDamage" &&
    procedure !== "persistentAreaSaveConditionEscape"
  ) {
    return undefined;
  }
  return [
    spatialCompositionResolve(
      "spatialEffect",
      "targetChoice",
      [],
      "battleAreaShape",
    ),
    spatialCompositionResolveWithoutFill("spatialEffect", "battleActiveEffect"),
    spatialCompositionResolveWithoutFill(
      "spatialEffect",
      "battleConcentration",
    ),
    ...(procedure === "persistentAreaSaveDamage"
      ? [
          spatialCompositionResolveWithoutFill(
            "spatialEffect",
            "battleLightProjection",
          ),
        ]
      : []),
    spatialCompositionResolveWithoutFill("spatialEffect", "battleAreaHazard"),
    spatialCompositionResolveWithoutFill(
      "spatialEffect",
      "battleCreatureSpaceMovement",
    ),
    ...(procedure === "persistentAreaSaveConditionEscape"
      ? [
          spatialCompositionResolveWithoutFill(
            "spatialEffect",
            "battleObscurementProjection",
          ),
          spatialCompositionResolveWithoutFill(
            "spatialEffect",
            "battleSightProjection",
          ),
        ]
      : []),
  ];
}

function objectLightCompositionRoute(
  procedure: SpatialRouteInvocation["procedure"] | undefined,
): BattleReducerRouteEvents | undefined {
  if (procedure === "objectLight") {
    return [
      spatialCompositionResolve(
        "objectLightRider",
        "targetChoice",
        [],
        "battleObjectTargetBoundary",
      ),
      spatialCompositionResolveWithoutFill(
        "objectLightRider",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "objectLightRider",
        "battleLightProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "objectLightRider",
        "battleActiveEffect",
      ),
    ];
  }
  return procedure === "heldLight"
    ? [
        spatialCompositionResolveWithoutFill(
          "objectLightRider",
          "battleActiveEffect",
        ),
        spatialCompositionResolveWithoutFill(
          "objectLightRider",
          "battleLightProjection",
        ),
        spatialCompositionResolveWithoutFill(
          "objectLightRider",
          "battleActiveEffect",
        ),
      ]
    : undefined;
}

function forcedMovementCubeBurstCompositionRoute(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  invocation: SpatialRouteInvocation | undefined,
): BattleReducerRouteEvents | undefined {
  if (
    invocation === undefined ||
    invocation.procedure !== "saveGatedDamage" ||
    !isForcedMovementCubeBurstPostSaveAreaEffect(invocation)
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "savingThrowOutcome") {
    return [
      spatialCompositionResolve(
        "movementPresentation",
        "savingThrowOutcome",
        ["movement"],
        "battleSavingThrowOutcome",
      ),
    ];
  }
  if (routeFill !== "rolledDice" || result.tag !== "resolved") {
    return undefined;
  }
  return [
    spatialCompositionResolve(
      "movementPresentation",
      "movement",
      [],
      "battleMovementResource",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleTablePresentation",
    ),
    spatialCompositionDiscover(
      "movementPresentation",
      [],
      "battleObjectTargetBoundary",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleObjectTargetBoundary",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleTablePresentation",
    ),
  ];
}

function spatialEffectCompositionRuntimeRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (input.subject.tag !== "runtimeCommand") {
    return undefined;
  }
  if (
    input.subject.command === "endPersistentAreaTraitForEnvironment" &&
    result.tag === "resolved"
  ) {
    return [
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleObscurementProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConcentration",
      ),
    ];
  }
  if (input.subject.command === "move") {
    const fill = input.fills.at(-1);
    if (
      fill?.kind === "rolledDice" &&
      input.fills.some(isAreaMovementDistanceDamageHazardMovementFill) &&
      result.tag === "resolved"
    ) {
      return [
        spatialCompositionResolve(
          "spatialEffect",
          "rolledDice",
          [],
          "battleHitPoint",
        ),
      ];
    }
    if (fill === undefined || fill.kind !== "movement") {
      return undefined;
    }
    const areaDifficultTerrain = fill.value.areaDifficultTerrain;
    if (areaDifficultTerrain === undefined || areaDifficultTerrain === null) {
      return undefined;
    }
    if (
      areaDifficultTerrain.sources.some(
        (source) => source.kind === "areaMovementDistanceDamage",
      )
    ) {
      return [
        spatialCompositionResolve(
          "spatialEffect",
          "movement",
          result.tag === "needsHoles"
            ? battleReducerRouteHoles(result.holes)
            : [],
          "battleMovementResource",
        ),
      ];
    }
    if (
      !areaDifficultTerrain.sources.some(
        (source) => source.kind === "persistentAreaSaveCondition",
      )
    ) {
      return undefined;
    }
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "movement",
        [],
        "battleMovementResource",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleTurnBoundary",
      ),
      spatialCompositionResolveWithoutFill("spatialEffect", "battleAreaHazard"),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
    ];
  }
  if (
    input.subject.command === "persistentAreaSaveConditionSave" ||
    input.subject.command === "persistentAreaSaveConditionEscapeSave"
  ) {
    const fill = input.fills.at(-1);
    if (
      fill === undefined ||
      battleReducerRouteFill(fill) !== "savingThrowOutcome"
    ) {
      return undefined;
    }
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "savingThrowOutcome",
        [],
        "battleSavingThrowOutcome",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConditionLifecycle",
      ),
    ];
  }
  if (input.subject.command === "movableZoneSave") {
    const fill = input.fills.at(-1);
    if (fill === undefined) {
      return undefined;
    }
    const routeFill = battleReducerRouteFill(fill);
    if (routeFill === "savingThrowOutcome") {
      return [
        spatialCompositionResolve(
          "spatialEffect",
          "savingThrowOutcome",
          battleReducerRouteHoles(
            result.tag === "needsHoles" ? result.holes : [],
          ),
          "battleSavingThrowOutcome",
        ),
      ];
    }
    if (routeFill !== "rolledDice" || result.tag !== "resolved") {
      return undefined;
    }
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "rolledDice",
        [],
        "battleHitPoint",
      ),
    ];
  }
  if (input.subject.command !== "fixedCostMovementReplacement") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleReducerRouteFill(fill) !== "movement") {
    return undefined;
  }
  return [
    spatialCompositionResolve(
      "movementPresentation",
      "movement",
      [],
      "battleMovementResource",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleTablePresentation",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleConditionLifecycle",
    ),
  ];
}

export function forcedMovementCubeBurstPresentationRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (
    act.subject.tag !== "actionSpell" &&
    act.subject.tag !== "bonusActionSpell"
  ) {
    return undefined;
  }
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (
    invocation === undefined ||
    !isForcedMovementCubeBurstPostSaveAreaEffect(invocation)
  ) {
    return undefined;
  }
  return spatialCompositionDiscover(
    "movementPresentation",
    ["movement", "savingThrowOutcome"],
    "battleSavingThrowOutcome",
  );
}

function spatialEffectCompositionDiscoveryHoles(
  invocation: BattleSpellProcedureExecution,
): readonly BattleReducerRouteHole[] {
  if (
    invocation.procedure === "movableLightManifestation" &&
    invocation.operation === "create"
  ) {
    return [];
  }
  if (invocation.procedure === "saveGatedAttackRollAdvantage") {
    return ["savingThrowOutcome", "targetChoice"];
  }
  return ["targetChoice"];
}

function isSpatialEffectCompositionDiscoverySubject(
  invocation: BattleSpellProcedureExecution,
): boolean {
  const procedure = invocation.procedure;
  return (
    procedure === "movableLightManifestation" ||
    procedure === "saveGatedAttackRollAdvantage" ||
    procedure === "persistentAreaTrait" ||
    procedure === "persistentAreaSaveCondition" ||
    procedure === "persistentAreaSaveDamage" ||
    procedure === "areaMovementDistanceDamage" ||
    procedure === "persistentAreaSaveConditionEscape"
  );
}

function isObjectLightDiscoverySubject(
  invocation: BattleSpellProcedureExecution,
): boolean {
  return invocation.procedure === "objectLight";
}

function isForcedMovementCubeBurstPostSaveAreaEffect(
  invocation: BattleSpellProcedureExecution,
): boolean {
  return (
    invocation.procedure === "saveGatedDamage" &&
    invocation.postSaveAreaEffect?.kind === "selfOriginCubePush"
  );
}

function battleHasActiveAreaDifficultTerrainHazard(
  state: BattleState,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "persistentAreaSaveCondition" ||
        effect.kind === "areaMovementDistanceDamage" ||
        effect.kind === "persistentAreaSaveConditionEscape",
    ),
  );
}

function isAreaMovementDistanceDamageHazardMovementFill(
  fill: BattleFill,
): fill is Extract<BattleFill, { readonly kind: "movement" }> {
  return (
    fill.kind === "movement" &&
    fill.value.areaDifficultTerrain?.sources.some(
      (source) => source.kind === "areaMovementDistanceDamage",
    ) === true
  );
}

function spatialCompositionDiscover(
  subject: BattleReducerRouteSubjectFamily,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return discoverBattleActsRoute(subject, holes, owner);
}

function spatialCompositionResolve(
  subject: BattleReducerRouteSubjectFamily,
  fill: BattleReducerRouteFill,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectRoute(subject, fill, holes, owner);
}

function spatialCompositionResolveWithoutFill(
  subject: BattleReducerRouteSubjectFamily,
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(subject, [], owner);
}
