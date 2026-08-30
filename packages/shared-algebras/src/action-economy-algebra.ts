// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-MULTIATTACK-001
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties stat-block.multiattack
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP BATTLE.STAT_BLOCK.MULTIATTACK
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
import { Either, Match, Schema } from "effect";
import type {
  ActionRestriction,
  ActionRestrictionAllowedAction,
} from "@dnd/surface/surface/types";
import {
  STANDARD_ACTION_KINDS,
  type StandardActionKind,
} from "@dnd/shared/game-facts";
import type {
  BattleProcedureExecutionRef,
  BattleActiveEffectExecutionRef,
  BattleStatBlockProcedureExecutionRef,
  CreatureId,
} from "@dnd/shared/types";

const STANDARD_ACTION_KIND_SET: ReadonlySet<string> = new Set(
  STANDARD_ACTION_KINDS,
);

export const HasteActionResourceRestrictionSchema = Schema.Struct({
  kind: Schema.Literal("allow_only"),
  actions: Schema.Tuple(
    Schema.Struct({
      action: Schema.Literal("attack"),
      attackLimit: Schema.Struct({
        kind: Schema.Literal("attack_count"),
        count: Schema.Literal(1),
      }),
    }),
    Schema.Struct({ action: Schema.Literal("dash") }),
    Schema.Struct({ action: Schema.Literal("disengage") }),
    Schema.Struct({ action: Schema.Literal("hide") }),
    Schema.Struct({ action: Schema.Literal("utilize") }),
  ),
});
export type HasteActionResourceRestriction = Schema.Schema.Type<
  typeof HasteActionResourceRestrictionSchema
>;
export const HASTE_ACTION_RESOURCE_RESTRICTION = {
  kind: "allow_only",
  actions: [
    {
      action: "attack",
      attackLimit: { kind: "attack_count", count: 1 },
    },
    { action: "dash" },
    { action: "disengage" },
    { action: "hide" },
    { action: "utilize" },
  ],
} as const satisfies HasteActionResourceRestriction;

export function isHasteActionResourceRestriction(
  restriction: ActionRestriction | undefined,
): boolean {
  if (restriction?.kind !== "allow_only") return false;
  const expectedActionKinds = HASTE_ACTION_RESOURCE_RESTRICTION.actions.map(
    (allowed) => allowed.action,
  );
  const actualActionKinds = new Set(
    restriction.actions.map((allowed) => allowed.action),
  );
  const attack = restriction.actions.find(
    (allowed) => allowed.action === "attack",
  );
  return (
    restriction.actions.length === expectedActionKinds.length &&
    actualActionKinds.size === expectedActionKinds.length &&
    expectedActionKinds.every((action) => actualActionKinds.has(action)) &&
    attack?.attackLimit.kind === "attack_count" &&
    attack.attackLimit.count === 1
  );
}

export type RuntimeActionResource =
  | { readonly kind: "action"; readonly source: "turn" }
  | {
      readonly kind: "action";
      readonly source: "unit";
      readonly sourceOwnerId: CreatureId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly restriction: ActionRestriction;
    }
  | {
      readonly kind: "action";
      readonly source: "spellEffect";
      readonly sourceEffectRef: BattleActiveEffectExecutionRef;
      readonly restriction: HasteActionResourceRestriction;
    }
  | {
      readonly kind: "action";
      readonly source: "statBlockMultiattack";
      readonly sourceOwnerId: CreatureId;
      readonly sourceProcedureRef: BattleStatBlockProcedureExecutionRef;
      readonly dispatch:
        | {
            readonly kind: "listedOccurrence";
            readonly attackProcedureRef: BattleStatBlockProcedureExecutionRef;
          }
        | {
            readonly kind: "oneListedChoice";
            readonly attackProcedureRefs: readonly [
              BattleStatBlockProcedureExecutionRef,
              ...BattleStatBlockProcedureExecutionRef[],
            ];
          };
    }
  | {
      readonly kind: "action";
      readonly source: "classFeatureExtraAttack";
      readonly sourceOwnerId: CreatureId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly restriction: ActionRestriction;
    }
  | {
      readonly kind: "action";
      readonly source: "monkFocusFlurryOfBlows";
      readonly sourceOwnerId: CreatureId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    };

export type ActionOrBonusActionExclusionChoice =
  | "notChosen"
  | "action"
  | "bonusAction";

export type ActionOrBonusActionExclusion =
  | { readonly kind: "notRestricted" }
  | {
      readonly kind: "restricted";
      // Records only the exclusion branch chosen while the gate is active.
      // Generic Action and Bonus Action resources retain their own spend state.
      readonly choice: ActionOrBonusActionExclusionChoice;
    };
export type MovementActionBonusActionExclusionChoice =
  | "notChosen"
  | "movement"
  | "action"
  | "bonusAction";
export type MovementActionBonusActionExclusion =
  | { readonly kind: "notRestricted" }
  | {
      readonly kind: "restricted";
      readonly choice: MovementActionBonusActionExclusionChoice;
    };

export type ActionEconomyState = {
  readonly actionResources: ReadonlyArray<RuntimeActionResource>;
  readonly actionTakenThisTurn: boolean;
  readonly currentHasBonusAction: boolean;
  readonly actionOrBonusActionExclusion: ActionOrBonusActionExclusion;
  readonly movementActionBonusActionExclusion: MovementActionBonusActionExclusion;
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

  if (isSupportedSurfaceCastingTimeKind(mechanics.castingTime.kind)) {
    return Either.right(
      activationResourceCostFromSurfaceKind(mechanics.castingTime.kind),
    );
  }

  return Either.left("unsupported unit casting time");
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
    Match.when(
      { kind: "exclude" },
      (exclude) => !exclude.actions.includes("attack"),
    ),
    Match.when({ kind: "allow_only" }, (allowOnly) => {
      const attack = allowOnly.actions.find(
        (
          allowed,
        ): allowed is Extract<
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
  return Match.value(resource).pipe(
    Match.discriminatorsExhaustive("source")({
      turn: () => true,
      unit: ({ restriction }) =>
        actionRestrictionAllowsAdditionalAttacks(restriction),
      spellEffect: ({ restriction }) =>
        actionRestrictionAllowsAdditionalAttacks(restriction),
      statBlockMultiattack: () => false,
      classFeatureExtraAttack: () => false,
      monkFocusFlurryOfBlows: () => false,
    }),
  );
}

export function actionResourceAllows(
  resource: RuntimeActionResource,
  action: StandardActionKind,
): boolean {
  return Match.value(resource).pipe(
    Match.discriminatorsExhaustive("source")({
      turn: () => true,
      unit: ({ restriction }) => actionRestrictionAllows(restriction, action),
      spellEffect: ({ restriction }) =>
        actionRestrictionAllows(restriction, action),
      statBlockMultiattack: () => action === "attack",
      classFeatureExtraAttack: ({ restriction }) =>
        actionRestrictionAllows(restriction, action),
      monkFocusFlurryOfBlows: () => false,
    }),
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

function actionOrBonusActionExclusionAllowsAction(
  state: ActionEconomyState,
): boolean {
  return (
    state.actionOrBonusActionExclusion.kind === "notRestricted" ||
    state.actionOrBonusActionExclusion.choice === "notChosen"
  );
}

function actionOrBonusActionExclusionAllowsBonusAction(
  state: ActionEconomyState,
): boolean {
  return (
    state.actionOrBonusActionExclusion.kind === "notRestricted" ||
    state.actionOrBonusActionExclusion.choice === "notChosen"
  );
}

function movementActionBonusActionExclusionAllowsMovement(
  state: ActionEconomyState,
): boolean {
  return (
    state.movementActionBonusActionExclusion.kind === "notRestricted" ||
    state.movementActionBonusActionExclusion.choice === "notChosen"
  );
}

function movementActionBonusActionExclusionAllowsAction(
  state: ActionEconomyState,
): boolean {
  return (
    state.movementActionBonusActionExclusion.kind === "notRestricted" ||
    state.movementActionBonusActionExclusion.choice === "notChosen"
  );
}

function movementActionBonusActionExclusionAllowsBonusAction(
  state: ActionEconomyState,
): boolean {
  return (
    state.movementActionBonusActionExclusion.kind === "notRestricted" ||
    state.movementActionBonusActionExclusion.choice === "notChosen"
  );
}

function markActionSpentForActionOrBonusActionExclusion<
  T extends ActionEconomyState,
>(state: T): T {
  return state.actionOrBonusActionExclusion.kind === "notRestricted"
    ? state
    : {
        ...state,
        actionOrBonusActionExclusion: {
          kind: "restricted",
          choice: "action",
        },
      };
}

function markBonusActionSpentForActionOrBonusActionExclusion<
  T extends ActionEconomyState,
>(state: T): T {
  return state.actionOrBonusActionExclusion.kind === "notRestricted"
    ? state
    : {
        ...state,
        actionOrBonusActionExclusion: {
          kind: "restricted",
          choice: "bonusAction",
        },
      };
}

function markActionSpentForMovementActionBonusActionExclusion<
  T extends ActionEconomyState,
>(state: T): T {
  return state.movementActionBonusActionExclusion.kind === "notRestricted"
    ? state
    : {
        ...state,
        actionResources: [],
        currentHasBonusAction: false,
        movementActionBonusActionExclusion: {
          kind: "restricted",
          choice: "action",
        },
      };
}

function markBonusActionSpentForMovementActionBonusActionExclusion<
  T extends ActionEconomyState,
>(state: T): T {
  return state.movementActionBonusActionExclusion.kind === "notRestricted"
    ? state
    : {
        ...state,
        actionResources: [],
        currentHasBonusAction: false,
        movementActionBonusActionExclusion: {
          kind: "restricted",
          choice: "bonusAction",
        },
      };
}

export function markMovementSpentForMovementActionBonusActionExclusion<
  T extends ActionEconomyState,
>(state: T): T {
  return state.movementActionBonusActionExclusion.kind === "notRestricted"
    ? state
    : {
        ...state,
        actionResources: [],
        currentHasBonusAction: false,
        movementActionBonusActionExclusion: {
          kind: "restricted",
          choice: "movement",
        },
      };
}

export function enableActionOrBonusActionExclusion<
  T extends ActionEconomyState,
>(state: T): T {
  if (state.actionOrBonusActionExclusion.kind === "restricted") {
    return state;
  }

  if (state.actionTakenThisTurn) {
    return markActionSpentForActionOrBonusActionExclusion({
      ...state,
      actionOrBonusActionExclusion: {
        kind: "restricted",
        choice: "notChosen",
      },
    });
  }
  if (!state.currentHasBonusAction) {
    return markBonusActionSpentForActionOrBonusActionExclusion({
      ...state,
      actionOrBonusActionExclusion: {
        kind: "restricted",
        choice: "notChosen",
      },
    });
  }

  return {
    ...state,
    actionOrBonusActionExclusion: {
      kind: "restricted",
      choice: "notChosen",
    },
  };
}

export function disableActionOrBonusActionExclusion<
  T extends ActionEconomyState,
>(state: T): T {
  return state.actionOrBonusActionExclusion.kind === "notRestricted"
    ? state
    : {
        ...state,
        actionOrBonusActionExclusion: { kind: "notRestricted" },
      };
}

export function enableMovementActionBonusActionExclusion<
  T extends ActionEconomyState,
>(state: T, movementSpent: boolean): T {
  if (state.movementActionBonusActionExclusion.kind === "restricted") {
    return state;
  }

  const restricted: T = {
    ...state,
    movementActionBonusActionExclusion: {
      kind: "restricted",
      choice: "notChosen",
    },
  };
  if (movementSpent) {
    return markMovementSpentForMovementActionBonusActionExclusion(restricted);
  }
  if (restricted.actionTakenThisTurn) {
    return markActionSpentForMovementActionBonusActionExclusion(restricted);
  }
  if (!restricted.currentHasBonusAction) {
    return markBonusActionSpentForMovementActionBonusActionExclusion(
      restricted,
    );
  }
  return restricted;
}

export function spendActionResourceAtIndex<T extends ActionEconomyState>(
  state: T,
  actionResourceIndex: number,
): T {
  const spentResource = state.actionResources[actionResourceIndex];
  if (spentResource === undefined) return state;
  return markActionSpentForMovementActionBonusActionExclusion(
    markActionSpentForActionOrBonusActionExclusion({
      ...state,
      actionTakenThisTurn:
        state.actionTakenThisTurn ||
        actionResourceConsumptionTakesAction(spentResource),
      actionResources: state.actionResources.filter(
        (_, index) => index !== actionResourceIndex,
      ),
    }),
  );
}

export function canSpendMovement(state: ActionEconomyState): boolean {
  return movementActionBonusActionExclusionAllowsMovement(state);
}

function actionEconomyStateAfterSpendingBonusAction<
  T extends ActionEconomyState,
>(state: T): T {
  return markBonusActionSpentForMovementActionBonusActionExclusion(
    markBonusActionSpentForActionOrBonusActionExclusion({
      ...state,
      currentHasBonusAction: false,
    }),
  );
}

export function actionResourceConsumptionTakesAction(
  resource: RuntimeActionResource,
): boolean {
  return Match.value(resource).pipe(
    Match.discriminatorsExhaustive("source")({
      turn: () => true,
      unit: () => true,
      spellEffect: () => true,
      statBlockMultiattack: () => false,
      classFeatureExtraAttack: () => false,
      monkFocusFlurryOfBlows: () => false,
    }),
  );
}

export function canSpendAction(
  state: ActionEconomyState,
  action: StandardActionKind,
): boolean {
  return (
    actionOrBonusActionExclusionAllowsAction(state) &&
    movementActionBonusActionExclusionAllowsAction(state) &&
    compatibleActionResourceIndex(state.actionResources, action) !== null
  );
}

export function canSpendUnarmedStrikeActionResource(
  state: ActionEconomyState,
): boolean {
  return (
    actionOrBonusActionExclusionAllowsAction(state) &&
    movementActionBonusActionExclusionAllowsAction(state) &&
    compatibleUnarmedStrikeActionResourceIndex(state.actionResources) !== null
  );
}

export function canSpendBonusAction(state: ActionEconomyState): boolean {
  return (
    state.currentHasBonusAction &&
    actionOrBonusActionExclusionAllowsBonusAction(state) &&
    movementActionBonusActionExclusionAllowsBonusAction(state)
  );
}

export function resetTurnActionEconomy<T extends ActionEconomyState>(
  state: T,
): T {
  return {
    ...state,
    actionResources: [{ kind: "action", source: "turn" }],
    actionTakenThisTurn: false,
    currentHasBonusAction: true,
    actionOrBonusActionExclusion: { kind: "notRestricted" },
    movementActionBonusActionExclusion: { kind: "notRestricted" },
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
  return Either.right(spendActionResourceAtIndex(state, actionResourceIndex));
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

  return Either.right(spendActionResourceAtIndex(state, actionResourceIndex));
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

  return Either.right(spendActionResourceAtIndex(state, actionResourceIndex));
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

  if (!canSpendBonusAction(state)) {
    return Either.left("no bonus action available");
  }

  return Either.right(actionEconomyStateAfterSpendingBonusAction(state));
}

export function hasUnitActionResource(
  state: ActionEconomyState,
  sourceOwnerId: CreatureId,
  sourceProcedureRef: BattleProcedureExecutionRef,
): boolean {
  return state.actionResources.some(
    (resource) =>
      resource.source === "unit" &&
      resource.sourceOwnerId === sourceOwnerId &&
      resource.sourceProcedureRef === sourceProcedureRef,
  );
}

export function hasSpellEffectActionResource(
  state: ActionEconomyState,
  sourceEffectRef: BattleActiveEffectExecutionRef,
): boolean {
  return state.actionResources.some(
    (resource) =>
      resource.source === "spellEffect" &&
      resource.sourceEffectRef === sourceEffectRef,
  );
}

export function grantUnitActionResource<T extends ActionEconomyState>(
  state: T,
  sourceOwnerId: CreatureId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  restriction: ActionRestriction,
): Either.Either<T, ActionEconomySpendError> {
  if (
    !actionOrBonusActionExclusionAllowsAction(state) ||
    !movementActionBonusActionExclusionAllowsAction(state)
  ) {
    return Either.left("no action resource available");
  }
  if (hasUnitActionResource(state, sourceOwnerId, sourceProcedureRef)) {
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
        sourceProcedureRef,
        restriction,
      },
    ],
  });
}

export function grantSpellEffectActionResource<T extends ActionEconomyState>(
  state: T,
  sourceEffectRef: BattleActiveEffectExecutionRef,
  restriction: HasteActionResourceRestriction,
): Either.Either<T, ActionEconomySpendError> {
  if (hasSpellEffectActionResource(state, sourceEffectRef)) {
    return Either.left("spell-effect action resource already granted");
  }

  return Either.right({
    ...state,
    actionResources: [
      ...state.actionResources,
      {
        kind: "action",
        source: "spellEffect",
        sourceEffectRef,
        restriction,
      },
    ],
  });
}
