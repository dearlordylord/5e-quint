import { Either, Match } from "effect";

export type ActionCount = 0 | 1 | 2;

export type ActionEconomyState = {
  readonly currentActionsAvailable: ActionCount;
  readonly currentHasBonusAction: boolean;
  readonly currentHasFreeAction: boolean;
};

export type ActivationResourceCost =
  | { readonly kind: "free" }
  | { readonly kind: "action" }
  | { readonly kind: "bonusAction" };

export type SupportedSurfaceActivationResourceKind =
  | "free"
  | "action"
  | "bonus_action";

export type ActionEconomySpendError =
  | "no action available for unit"
  | "no bonus action available for unit"
  | "no free action available for unit"
  | "unsupported unit activation cost"
  | "unsupported unit casting time"
  | "unsupported unit activation resource cost";

export type SurfaceActivationResourceCarrier = {
  readonly mechanics:
    | {
        readonly activationCost: {
          readonly kind: string;
        };
      }
    | {
        readonly castingTime: {
          readonly kind: string;
        };
      };
};

export function isSupportedSurfaceActivationResourceKind(
  kind: string,
): kind is SupportedSurfaceActivationResourceKind {
  return kind === "free" || kind === "action" || kind === "bonus_action";
}

export function activationResourceCostFromSurfaceKind(
  kind: SupportedSurfaceActivationResourceKind,
): ActivationResourceCost {
  return Match.value(kind).pipe(
    Match.when("free", (): ActivationResourceCost => ({ kind: "free" })),
    Match.when("action", (): ActivationResourceCost => ({ kind: "action" })),
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
    if (
      isSupportedSurfaceActivationResourceKind(mechanics.activationCost.kind)
    ) {
      return Either.right(
        activationResourceCostFromSurfaceKind(mechanics.activationCost.kind),
      );
    }

    return Either.left("unsupported unit activation cost");
  }

  if ("castingTime" in mechanics) {
    if (isSupportedSurfaceActivationResourceKind(mechanics.castingTime.kind)) {
      return Either.right(
        activationResourceCostFromSurfaceKind(mechanics.castingTime.kind),
      );
    }

    return Either.left("unsupported unit casting time");
  }

  return Either.left("unsupported unit activation cost");
}

export function canSpendAction(state: ActionEconomyState): boolean {
  return state.currentActionsAvailable > 0;
}

export function canSpendBonusAction(state: ActionEconomyState): boolean {
  return state.currentHasBonusAction;
}

export function canSpendFreeAction(state: ActionEconomyState): boolean {
  return state.currentHasFreeAction;
}

export function resetTurnActionEconomy<T extends ActionEconomyState>(
  state: T,
): T {
  return {
    ...state,
    currentActionsAvailable: 1,
    currentHasBonusAction: true,
    currentHasFreeAction: true,
  };
}

function spendOneActionCount(
  currentActionsAvailable: ActionCount,
): Either.Either<ActionCount, ActionEconomySpendError> {
  if (currentActionsAvailable === 0) {
    return Either.left("no action available for unit");
  }

  if (currentActionsAvailable === 1) {
    return Either.right(0);
  }

  return Either.right(1);
}

export function spendActivationResource<T extends ActionEconomyState>(
  state: T,
  cost: ActivationResourceCost,
): Either.Either<T, ActionEconomySpendError> {
  if (cost.kind === "free") {
    if (!state.currentHasFreeAction) {
      return Either.left("no free action available for unit");
    }

    return Either.right({
      ...state,
      currentHasFreeAction: false,
    });
  }

  if (cost.kind === "action") {
    return spendOneActionCount(state.currentActionsAvailable).pipe(
      Either.map((currentActionsAvailable) => ({
        ...state,
        currentActionsAvailable,
      })),
    );
  }

  if (!state.currentHasBonusAction) {
    return Either.left("no bonus action available for unit");
  }

  return Either.right({
    ...state,
    currentHasBonusAction: false,
  });
}
