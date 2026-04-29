import { Either, Match } from "effect";
import type {
  ActionRestriction,
  StandardActionKind,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { STANDARD_ACTION_KINDS } from "@dnd/surface/surface/schema";
import type { CreatureId } from "@dnd/shared/types";

const STANDARD_ACTION_KIND_SET: ReadonlySet<string> = new Set(
  STANDARD_ACTION_KINDS,
);

export type RuntimeActionResource =
  | { readonly kind: "action"; readonly source: "turn" }
  | {
      readonly kind: "action";
      readonly source: "unit";
      readonly sourceOwnerId: CreatureId;
      readonly sourceUnitId: UnitRecord["id"];
      readonly restriction: ActionRestriction;
    };

export type ActionEconomyState = {
  readonly actionResources: ReadonlyArray<RuntimeActionResource>;
  readonly currentHasBonusAction: boolean;
};

export type ActivationResourceCost =
  | { readonly kind: "free" }
  | { readonly kind: "action"; readonly action: StandardActionKind }
  | { readonly kind: "bonusAction" };

export type SupportedSurfaceCastingTimeKind = "action" | "bonus_action";

export type ActionEconomySpendError =
  | "no action available for unit"
  | "no bonus action available for unit"
  | "unit action resource already granted"
  | "unsupported unit activation cost"
  | "unsupported unit casting time"
  | "unsupported unit activation resource cost";

export type SurfaceActivationResourceCarrier = {
  readonly mechanics:
    | {
        readonly activationCost: {
          readonly kind: string;
          readonly action?: string;
        };
      }
    | {
        readonly castingTime: {
          readonly kind: string;
        };
      };
};

function isStandardActionKind(kind: string): kind is StandardActionKind {
  return STANDARD_ACTION_KIND_SET.has(kind);
}

export function isSupportedSurfaceCastingTimeKind(
  kind: string,
): kind is SupportedSurfaceCastingTimeKind {
  return kind === "action" || kind === "bonus_action";
}

export function activationResourceCostFromSurfaceKind(
  kind: SupportedSurfaceCastingTimeKind,
): ActivationResourceCost {
  return Match.value(kind).pipe(
    Match.when(
      "action",
      (): ActivationResourceCost => ({ kind: "action", action: "magic" }),
    ),
    Match.when(
      "bonus_action",
      (): ActivationResourceCost => ({ kind: "bonusAction" }),
    ),
    Match.exhaustive,
  );
}

export function activationResourceCost(
  unit: SurfaceActivationResourceCarrier,
): Either.Either<ActivationResourceCost, ActionEconomySpendError> {
  const mechanics = unit.mechanics;

  if ("activationCost" in mechanics) {
    if (mechanics.activationCost.kind === "free") {
      return Either.right({ kind: "free" });
    }

    if (mechanics.activationCost.kind === "bonus_action") {
      return Either.right({ kind: "bonusAction" });
    }

    if (mechanics.activationCost.kind === "standard_action") {
      const action = mechanics.activationCost.action;
      if (action !== undefined && isStandardActionKind(action)) {
        return Either.right({ kind: "action", action });
      }
    }

    return Either.left("unsupported unit activation cost");
  }

  if ("castingTime" in mechanics) {
    if (isSupportedSurfaceCastingTimeKind(mechanics.castingTime.kind)) {
      return Either.right(
        activationResourceCostFromSurfaceKind(mechanics.castingTime.kind),
      );
    }

    return Either.left("unsupported unit casting time");
  }

  return Either.left("unsupported unit activation cost");
}

export function actionRestrictionAllows(
  restriction: ActionRestriction,
  action: StandardActionKind,
): boolean {
  return Match.value(restriction).pipe(
    Match.when({ kind: "none" }, () => true),
    Match.when(
      { kind: "exclude" },
      (exclude) => !exclude.actions.includes(action),
    ),
    Match.exhaustive,
  );
}

function actionResourceAllows(
  resource: RuntimeActionResource,
  action: StandardActionKind,
): boolean {
  return (
    resource.source === "turn" ||
    actionRestrictionAllows(resource.restriction, action)
  );
}

function compatibleActionResourceIndex(
  resources: ReadonlyArray<RuntimeActionResource>,
  action: StandardActionKind,
): number | null {
  const compatible = resources
    .map((resource, index) => ({ resource, index }))
    .filter(({ resource }) => actionResourceAllows(resource, action));
  const restricted = compatible.find(
    ({ resource }) => resource.source === "unit",
  );
  return (restricted ?? compatible[0])?.index ?? null;
}

export function canSpendAction(
  state: ActionEconomyState,
  action: StandardActionKind,
): boolean {
  return compatibleActionResourceIndex(state.actionResources, action) !== null;
}

export function canSpendBonusAction(state: ActionEconomyState): boolean {
  return state.currentHasBonusAction;
}

export function resetTurnActionEconomy<T extends ActionEconomyState>(
  state: T,
): T {
  return {
    ...state,
    actionResources: [{ kind: "action", source: "turn" }],
    currentHasBonusAction: true,
  };
}

export function spendAction<T extends ActionEconomyState>(
  state: T,
  action: StandardActionKind,
): Either.Either<T, ActionEconomySpendError> {
  const actionResourceIndex = compatibleActionResourceIndex(
    state.actionResources,
    action,
  );
  if (actionResourceIndex === null) {
    return Either.left("no action available for unit");
  }

  // TODO: If multiple compatible action resources are available and spending
  // one versus another can change later legality, expose resource choice as a
  // runtime hole instead of choosing deterministically here.
  return Either.right({
    ...state,
    actionResources: state.actionResources.filter(
      (_, index) => index !== actionResourceIndex,
    ),
  });
}

export function spendActivationResource<T extends ActionEconomyState>(
  state: T,
  cost: ActivationResourceCost,
): Either.Either<T, ActionEconomySpendError> {
  if (cost.kind === "free") {
    return Either.right(state);
  }

  if (cost.kind === "action") {
    return spendAction(state, cost.action);
  }

  if (!state.currentHasBonusAction) {
    return Either.left("no bonus action available for unit");
  }

  return Either.right({
    ...state,
    currentHasBonusAction: false,
  });
}

export function hasUnitActionResource(
  state: ActionEconomyState,
  sourceOwnerId: CreatureId,
  sourceUnitId: UnitRecord["id"],
): boolean {
  return state.actionResources.some(
    (resource) =>
      resource.source === "unit" &&
      resource.sourceOwnerId === sourceOwnerId &&
      resource.sourceUnitId === sourceUnitId,
  );
}

export function grantUnitActionResource<T extends ActionEconomyState>(
  state: T,
  sourceOwnerId: CreatureId,
  sourceUnitId: UnitRecord["id"],
  restriction: ActionRestriction,
): Either.Either<T, ActionEconomySpendError> {
  if (hasUnitActionResource(state, sourceOwnerId, sourceUnitId)) {
    return Either.left("unit action resource already granted");
  }

  return Either.right({
    ...state,
    actionResources: [
      ...state.actionResources,
      {
        kind: "action",
        source: "unit",
        sourceOwnerId,
        sourceUnitId,
        restriction,
      },
    ],
  });
}
