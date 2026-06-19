// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
import { Either, Match } from "effect";
import type {
  ActionRestriction,
  ActionRestrictionAllowedAction,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  STANDARD_ACTION_KINDS,
  type StandardActionKind,
} from "@dnd/shared/game-facts";
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
    }
  | {
      readonly kind: "action";
      readonly source: "spellEffect";
      readonly sourceOwnerId: CreatureId;
      readonly sourceSpellId: SpellRecord["id"];
      readonly restriction: ActionRestriction;
    }
  | {
      readonly kind: "action";
      readonly source: "statBlockMultiattack";
      readonly sourceOwnerId: CreatureId;
      readonly attackPart: {
        readonly section: "actions";
        readonly name: string;
      };
      readonly restriction: ActionRestriction;
    }
  | {
      readonly kind: "action";
      readonly source: "classFeatureExtraAttack";
      readonly sourceOwnerId: CreatureId;
      readonly sourceUnitId: UnitRecord["id"];
      readonly restriction: ActionRestriction;
    }
  | {
      readonly kind: "action";
      readonly source: "monkFocusFlurryOfBlows";
      readonly sourceOwnerId: CreatureId;
      readonly sourceUnitId: UnitRecord["id"];
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
  | "no action resource available"
  | "no bonus action available"
  | "unit-granted action resource already granted"
  | "spell-effect action resource already granted"
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
    Match.when({ kind: "allow_only" }, (allowOnly) =>
      allowOnly.actions.some((allowed) => allowed.action === action),
    ),
    Match.exhaustive,
  );
}

export function actionRestrictionAllowsAdditionalAttacks(
  restriction: ActionRestriction,
): boolean {
  return Match.value(restriction).pipe(
    Match.when({ kind: "none" }, () => true),
    Match.when({ kind: "exclude" }, (exclude) =>
      !exclude.actions.includes("attack"),
    ),
    Match.when({ kind: "allow_only" }, (allowOnly) => {
      const attack = allowOnly.actions.find(
        (allowed): allowed is Extract<
          ActionRestrictionAllowedAction,
          { readonly action: "attack" }
        > => allowed.action === "attack",
      );
      return attack !== undefined && attack.attackLimit.count !== 1;
    }),
    Match.exhaustive,
  );
}

export function actionResourceAllowsAdditionalAttacks(
  resource: RuntimeActionResource,
): boolean {
  if (
    resource.source === "classFeatureExtraAttack" ||
    resource.source === "monkFocusFlurryOfBlows"
  ) {
    return false;
  }
  return (
    resource.source === "turn" ||
    actionRestrictionAllowsAdditionalAttacks(resource.restriction)
  );
}

export function actionResourceAllows(
  resource: RuntimeActionResource,
  action: StandardActionKind,
): boolean {
  if (resource.source === "monkFocusFlurryOfBlows") {
    return false;
  }
  return (
    resource.source === "turn" ||
    actionRestrictionAllows(resource.restriction, action)
  );
}

export function unarmedStrikeActionResourceAllows(
  resource: RuntimeActionResource,
): boolean {
  return (
    resource.source === "monkFocusFlurryOfBlows" ||
    actionResourceAllows(resource, "attack")
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
    ({ resource }) => resource.source !== "turn",
  );
  return (restricted ?? compatible[0])?.index ?? null;
}

function compatibleUnarmedStrikeActionResourceIndex(
  resources: ReadonlyArray<RuntimeActionResource>,
): number | null {
  const compatible = resources
    .map((resource, index) => ({ resource, index }))
    .filter(({ resource }) => unarmedStrikeActionResourceAllows(resource));
  const restricted = compatible.find(
    ({ resource }) => resource.source !== "turn",
  );
  return (restricted ?? compatible[0])?.index ?? null;
}

function matchingActionResourceIndex(
  resources: ReadonlyArray<RuntimeActionResource>,
  action: StandardActionKind,
  resourceMatches: (resource: RuntimeActionResource) => boolean,
): number | null {
  const index = resources.findIndex(
    (resource) =>
      actionResourceAllows(resource, action) && resourceMatches(resource),
  );
  return index === -1 ? null : index;
}

export function canSpendAction(
  state: ActionEconomyState,
  action: StandardActionKind,
): boolean {
  return compatibleActionResourceIndex(state.actionResources, action) !== null;
}

export function canSpendUnarmedStrikeActionResource(
  state: ActionEconomyState,
): boolean {
  return (
    compatibleUnarmedStrikeActionResourceIndex(state.actionResources) !== null
  );
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
    return Either.left("no action resource available");
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

export function spendUnarmedStrikeActionResource<T extends ActionEconomyState>(
  state: T,
): Either.Either<T, ActionEconomySpendError> {
  const actionResourceIndex = compatibleUnarmedStrikeActionResourceIndex(
    state.actionResources,
  );
  if (actionResourceIndex === null) {
    return Either.left("no action resource available");
  }

  return Either.right({
    ...state,
    actionResources: state.actionResources.filter(
      (_, index) => index !== actionResourceIndex,
    ),
  });
}

export function spendMatchingActionResource<T extends ActionEconomyState>(
  state: T,
  action: StandardActionKind,
  resourceMatches: (resource: RuntimeActionResource) => boolean,
): Either.Either<T, ActionEconomySpendError> {
  const actionResourceIndex = matchingActionResourceIndex(
    state.actionResources,
    action,
    resourceMatches,
  );
  if (actionResourceIndex === null) {
    return Either.left("no action resource available");
  }

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
    return Either.left("no bonus action available");
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

export function hasSpellEffectActionResource(
  state: ActionEconomyState,
  sourceOwnerId: CreatureId,
  sourceSpellId: SpellRecord["id"],
): boolean {
  return state.actionResources.some(
    (resource) =>
      resource.source === "spellEffect" &&
      resource.sourceOwnerId === sourceOwnerId &&
      resource.sourceSpellId === sourceSpellId,
  );
}

export function grantUnitActionResource<T extends ActionEconomyState>(
  state: T,
  sourceOwnerId: CreatureId,
  sourceUnitId: UnitRecord["id"],
  restriction: ActionRestriction,
): Either.Either<T, ActionEconomySpendError> {
  if (hasUnitActionResource(state, sourceOwnerId, sourceUnitId)) {
    return Either.left("unit-granted action resource already granted");
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

export function grantSpellEffectActionResource<T extends ActionEconomyState>(
  state: T,
  sourceOwnerId: CreatureId,
  sourceSpellId: SpellRecord["id"],
  restriction: ActionRestriction,
): Either.Either<T, ActionEconomySpendError> {
  if (hasSpellEffectActionResource(state, sourceOwnerId, sourceSpellId)) {
    return Either.left("spell-effect action resource already granted");
  }

  return Either.right({
    ...state,
    actionResources: [
      ...state.actionResources,
      {
        kind: "action",
        source: "spellEffect",
        sourceOwnerId,
        sourceSpellId,
        restriction,
      },
    ],
  });
}
