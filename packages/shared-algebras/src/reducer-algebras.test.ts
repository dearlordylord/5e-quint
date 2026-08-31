import { Brand, Option, Result, Schema } from "effect";
import { describe, expect, it } from "vitest";

import type { ActionRestriction } from "@dnd/surface/surface/types";
import {
  CreatureId as CreatureIdSchema,
  CONDITIONS,
  type BattleEffectExecutionRef,
  type BattleProcedureExecutionRef,
  type BattleStatBlockProcedureExecutionRef,
} from "@dnd/shared/types";
import { Index, Initiative, Round } from "@dnd/shared/types";

import {
  actionResourceAllows,
  actionResourceAllowsAdditionalAttacks,
  activationResourceCost,
  activationResourceCostFromSurfaceKind,
  canSpendAction,
  canSpendBonusAction,
  canSpendMovement,
  canSpendUnarmedStrikeActionResource,
  disableActionOrBonusActionExclusion,
  enableActionOrBonusActionExclusion,
  enableMovementActionBonusActionExclusion,
  grantSpellEffectActionResource,
  grantUnitActionResource,
  ATTACK_ONCE_OR_DASH_DISENGAGE_HIDE_UTILIZE_ACTION_RESTRICTION,
  isAttackOnceOrDashDisengageHideUtilizeActionRestriction,
  isSupportedSurfaceCastingTimeKind,
  markMovementSpentForMovementActionBonusActionExclusion,
  resetTurnActionEconomy,
  spendAction,
  spendActionResourceAtIndex,
  spendActivationResource,
  spendMatchingActionResource,
  spendUnarmedStrikeActionResource,
  unarmedStrikeActionResourceAllows,
  type ActionEconomyState,
  type RuntimeActionResource,
} from "./action-economy-algebra.ts";
import {
  EMPTY_CONDITION_STATE,
  applyCondition,
  conditionStatesEqual,
  hasCondition,
  isIncapacitated,
  removeCondition,
} from "./conditions-algebra.ts";
import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
  validDeathSaveRuntimeState,
} from "./death-saves-algebra.ts";
import {
  createInitiativeStack,
  createScoredInitiativeStack,
  currentActing,
  initiativeEntries,
  initiativeOrder,
  insertAtOrderIndex,
  insertByInitiative,
  nextInitiative,
  removeFromInitiative,
  swapInitialInitiativeScores,
  type InitiativeEntry,
  type InitiativeStack,
} from "./initiative-algebra.ts";

const sourceOwnerId = Schema.decodeUnknownSync(CreatureIdSchema)("owner-a");
const battleProcedureExecutionRef =
  Brand.nominal<BattleProcedureExecutionRef>();
const battleEffectExecutionRef = Brand.nominal<BattleEffectExecutionRef>();
const battleStatBlockProcedureExecutionRef =
  Brand.nominal<BattleStatBlockProcedureExecutionRef>();
const unitActionProcedureRef = battleProcedureExecutionRef(
  "unit-action-procedure-a",
);
const spellEffectRef = battleEffectExecutionRef(
  "synthetic-active-effect-ref-a",
);
const statBlockMultiattackProcedureRef = battleStatBlockProcedureExecutionRef(
  "synthetic-multiattack-procedure-a",
);
const statBlockAttackProcedureRef = battleStatBlockProcedureExecutionRef(
  "synthetic-multiattack-dispatch-a",
);
const attackOnlyRestriction: ActionRestriction = {
  kind: "exclude",
  actions: ["magic"],
};
const turnActionResource = {
  kind: "action",
  source: "turn",
} as const satisfies RuntimeActionResource;
const unitActionResource = {
  kind: "action",
  source: "unit",
  sourceOwnerId,
  sourceProcedureRef: unitActionProcedureRef,
  restriction: attackOnlyRestriction,
} as const satisfies RuntimeActionResource;
const unrestrictedUnitActionResource = {
  kind: "action",
  source: "unit",
  sourceOwnerId,
  sourceProcedureRef: unitActionProcedureRef,
  restriction: { kind: "none" },
} as const satisfies RuntimeActionResource;
const spellEffectActionResource = {
  kind: "action",
  source: "spellEffect",
  sourceEffectRef: spellEffectRef,
  restriction: ATTACK_ONCE_OR_DASH_DISENGAGE_HIDE_UTILIZE_ACTION_RESTRICTION,
} as const satisfies RuntimeActionResource;
const statBlockMultiattackActionResource = {
  kind: "action",
  source: "statBlockMultiattack",
  sourceOwnerId,
  sourceProcedureRef: statBlockMultiattackProcedureRef,
  dispatch: {
    kind: "listedOccurrence",
    attackProcedureRef: statBlockAttackProcedureRef,
  },
} as const satisfies RuntimeActionResource;
const classFeatureExtraAttackActionResource = {
  kind: "action",
  source: "classFeatureExtraAttack",
  sourceOwnerId,
  sourceProcedureRef: unitActionProcedureRef,
  restriction: attackOnlyRestriction,
} as const satisfies RuntimeActionResource;
const monkFocusFlurryOfBlowsActionResource = {
  kind: "action",
  source: "monkFocusFlurryOfBlows",
  sourceOwnerId,
  sourceProcedureRef: unitActionProcedureRef,
} as const satisfies RuntimeActionResource;
const actionResourceConsumptionCases = [
  {
    resource: turnActionResource,
    takesAction: true,
  },
  {
    resource: unitActionResource,
    takesAction: true,
  },
  {
    resource: spellEffectActionResource,
    takesAction: true,
  },
  {
    resource: statBlockMultiattackActionResource,
    takesAction: false,
  },
  {
    resource: classFeatureExtraAttackActionResource,
    takesAction: false,
  },
  {
    resource: monkFocusFlurryOfBlowsActionResource,
    takesAction: false,
  },
] as const satisfies ReadonlyArray<{
  readonly resource: RuntimeActionResource;
  readonly takesAction: boolean;
}>;
describe("action-economy-algebra", () => {
  it("parses supported Surface activation resource costs", () => {
    expect(isSupportedSurfaceCastingTimeKind("action")).toBe(true);
    expect(isSupportedSurfaceCastingTimeKind("bonus_action")).toBe(true);
    expect(isSupportedSurfaceCastingTimeKind("reaction")).toBe(false);
    expect(activationResourceCostFromSurfaceKind("action")).toEqual({
      kind: "action",
      action: "magic",
    });
    expect(activationResourceCostFromSurfaceKind("bonus_action")).toEqual({
      kind: "bonusAction",
    });
    expect(
      activationResourceCost({
        mechanics: { activationCost: { kind: "free" } },
      }),
    ).toEqual(Result.succeed({ kind: "free" }));
    expect(
      activationResourceCost({
        mechanics: { activationCost: { kind: "bonus_action" } },
      }),
    ).toEqual(Result.succeed({ kind: "bonusAction" }));
    expect(
      activationResourceCost({
        mechanics: {
          activationCost: { kind: "standard_action", action: "attack" },
        },
      }),
    ).toEqual(Result.succeed({ kind: "action", action: "attack" }));
    expect(
      activationResourceCost({
        mechanics: {
          activationCost: {
            kind: "standard_action",
            action: "synthetic:unsupported",
          },
        },
      }),
    ).toEqual(Result.fail("unsupported unit activation cost"));
    expect(
      activationResourceCost({
        mechanics: { castingTime: { kind: "action" } },
      }),
    ).toEqual(Result.succeed({ kind: "action", action: "magic" }));
    expect(
      activationResourceCost({
        mechanics: { castingTime: { kind: "reaction" } },
      }),
    ).toEqual(Result.fail("unsupported unit casting time"));
  });

  it("resets turn action and bonus-action resources", () => {
    const state = resetTurnActionEconomy(emptyActionEconomyState());

    expect(state.actionResources).toEqual([{ kind: "action", source: "turn" }]);
    expect(state.actionTakenThisTurn).toBe(false);
    expect(state.currentHasBonusAction).toBe(true);

    const spent = spendAction(state, "attack");
    expect(Result.isSuccess(spent)).toBe(true);
    if (Result.isFailure(spent)) return;
    expect(spent.success.actionTakenThisTurn).toBe(true);
    expect(resetTurnActionEconomy(spent.success).actionTakenThisTurn).toBe(
      false,
    );
  });

  it("recognizes the canonical additional-action resource restriction", () => {
    const [attack, dash, disengage, hide] =
      ATTACK_ONCE_OR_DASH_DISENGAGE_HIDE_UTILIZE_ACTION_RESTRICTION.actions;
    const missingUtilize: ActionRestriction = {
      kind: "allow_only",
      actions: [attack, dash, disengage, hide],
    };
    const duplicateHide: ActionRestriction = {
      kind: "allow_only",
      actions: [attack, dash, disengage, hide, hide],
    };
    expect(
      isAttackOnceOrDashDisengageHideUtilizeActionRestriction(undefined),
    ).toBe(false);
    expect(
      isAttackOnceOrDashDisengageHideUtilizeActionRestriction({ kind: "none" }),
    ).toBe(false);
    expect(
      isAttackOnceOrDashDisengageHideUtilizeActionRestriction(
        ATTACK_ONCE_OR_DASH_DISENGAGE_HIDE_UTILIZE_ACTION_RESTRICTION,
      ),
    ).toBe(true);
    expect(
      isAttackOnceOrDashDisengageHideUtilizeActionRestriction(missingUtilize),
    ).toBe(false);
    expect(
      isAttackOnceOrDashDisengageHideUtilizeActionRestriction(duplicateHide),
    ).toBe(false);
  });

  it("applies each restricted action-resource dispatch contract", () => {
    expect(actionResourceAllowsAdditionalAttacks(unitActionResource)).toBe(
      true,
    );
    expect(
      actionResourceAllowsAdditionalAttacks(statBlockMultiattackActionResource),
    ).toBe(false);
    expect(
      actionResourceAllowsAdditionalAttacks(
        monkFocusFlurryOfBlowsActionResource,
      ),
    ).toBe(false);
    expect(
      actionResourceAllows(statBlockMultiattackActionResource, "attack"),
    ).toBe(true);
    expect(
      actionResourceAllows(statBlockMultiattackActionResource, "dash"),
    ).toBe(false);
    expect(actionResourceAllows(unrestrictedUnitActionResource, "magic")).toBe(
      true,
    );
    expect(
      actionResourceAllows(classFeatureExtraAttackActionResource, "attack"),
    ).toBe(true);
    expect(
      actionResourceAllows(classFeatureExtraAttackActionResource, "magic"),
    ).toBe(false);
  });

  it("spends restricted unit action resources before the ordinary turn action", () => {
    const granted = grantTestUnitActionResource();

    const spent = spendAction(granted, "attack");
    expect(Result.isSuccess(spent)).toBe(true);
    if (Result.isFailure(spent)) return;

    expect(spent.success.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(spent.success.actionTakenThisTurn).toBe(true);
  });

  for (const { resource, takesAction } of actionResourceConsumptionCases) {
    it(`${resource.source} consumption records Action history as ${takesAction}`, () => {
      for (const priorActionTaken of [false, true]) {
        const spent = spendActionResourceAtIndex(
          {
            ...emptyActionEconomyState(),
            actionResources: [resource],
            actionTakenThisTurn: priorActionTaken,
          },
          0,
        );
        expect(spent.actionTakenThisTurn).toBe(priorActionTaken || takesAction);
      }
    });
  }

  it("does not record Action history without an actual resource consumption", () => {
    const state = resetTurnActionEconomy(emptyActionEconomyState());
    expect(spendActionResourceAtIndex(state, -1)).toBe(state);
  });

  it("keeps bonus action spending separate from free activation", () => {
    const state = resetTurnActionEconomy(emptyActionEconomyState());

    const free = spendActivationResource(state, { kind: "free" });
    expect(free).toEqual(Result.succeed(state));
    if (Result.isFailure(free)) return;
    expect(free.success.actionTakenThisTurn).toBe(false);

    const spentBonusAction = spendActivationResource(state, {
      kind: "bonusAction",
    });
    expect(Result.isSuccess(spentBonusAction)).toBe(true);
    if (Result.isFailure(spentBonusAction)) return;
    expect(spentBonusAction.success.currentHasBonusAction).toBe(false);
    expect(spentBonusAction.success.actionTakenThisTurn).toBe(false);
    expect(
      spendActivationResource(spentBonusAction.success, {
        kind: "bonusAction",
      }),
    ).toEqual(Result.fail("no bonus action available"));
  });

  it("restricts a turn to either an Action or a Bonus Action", () => {
    const restricted = enableActionOrBonusActionExclusion(
      resetTurnActionEconomy(emptyActionEconomyState()),
    );

    expect(canSpendAction(restricted, "attack")).toBe(true);
    expect(canSpendBonusAction(restricted)).toBe(true);

    const spentAction = spendAction(restricted, "attack");
    expect(Result.isSuccess(spentAction)).toBe(true);
    if (Result.isFailure(spentAction)) return;
    expect(spentAction.success.actionResources).toEqual([]);
    expect(spentAction.success.currentHasBonusAction).toBe(true);
    expect(spentAction.success.actionOrBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "action",
    });
    expect(canSpendAction(spentAction.success, "attack")).toBe(false);
    expect(canSpendBonusAction(spentAction.success)).toBe(false);

    const spentBonusAction = spendActivationResource(restricted, {
      kind: "bonusAction",
    });
    expect(Result.isSuccess(spentBonusAction)).toBe(true);
    if (Result.isFailure(spentBonusAction)) return;
    expect(spentBonusAction.success.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(spentBonusAction.success.currentHasBonusAction).toBe(false);
    expect(spentBonusAction.success.actionOrBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "bonusAction",
    });
    expect(canSpendAction(spentBonusAction.success, "attack")).toBe(false);
    expect(canSpendBonusAction(spentBonusAction.success)).toBe(false);
    expect(
      grantUnitActionResource(
        spentBonusAction.success,
        sourceOwnerId,
        unitActionProcedureRef,
        attackOnlyRestriction,
      ),
    ).toEqual(Result.fail("no action resource available"));

    const unrestrictedAfterAction = disableActionOrBonusActionExclusion(
      spentAction.success,
    );
    expect(canSpendAction(unrestrictedAfterAction, "attack")).toBe(false);
    expect(canSpendBonusAction(unrestrictedAfterAction)).toBe(true);

    const unrestrictedAfterBonusAction = disableActionOrBonusActionExclusion(
      spentBonusAction.success,
    );
    expect(canSpendAction(unrestrictedAfterBonusAction, "attack")).toBe(true);
    expect(canSpendBonusAction(unrestrictedAfterBonusAction)).toBe(false);
  });

  it("reconciles prior Action spending when the Action or Bonus Action restriction starts mid-turn", () => {
    const actionSpent = spendAction(
      resetTurnActionEconomy(emptyActionEconomyState()),
      "magic",
    );
    expect(Result.isSuccess(actionSpent)).toBe(true);
    if (Result.isFailure(actionSpent)) return;
    expect(actionSpent.success.currentHasBonusAction).toBe(true);

    const restricted = enableActionOrBonusActionExclusion(actionSpent.success);

    expect(restricted.actionResources).toEqual([]);
    expect(restricted.currentHasBonusAction).toBe(true);
    expect(restricted.actionOrBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "action",
    });
    expect(canSpendAction(restricted, "attack")).toBe(false);
    expect(canSpendBonusAction(restricted)).toBe(false);
  });

  it("reconciles a prior Action independently of which compatible action resource was consumed", () => {
    const granted = grantTestUnitActionResource();
    const spent = spendAction(granted, "attack");
    expect(Result.isSuccess(spent)).toBe(true);
    if (Result.isFailure(spent)) return;
    expect(spent.success.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(spent.success.actionTakenThisTurn).toBe(true);

    const restricted = enableActionOrBonusActionExclusion(spent.success);
    expect(restricted.actionOrBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "action",
    });
    expect(canSpendAction(restricted, "attack")).toBe(false);
    expect(canSpendBonusAction(restricted)).toBe(false);

    const unrestricted = disableActionOrBonusActionExclusion(restricted);
    expect(unrestricted.actionTakenThisTurn).toBe(true);
    expect(canSpendAction(unrestricted, "attack")).toBe(true);
    expect(canSpendBonusAction(unrestricted)).toBe(true);

    const movementRestricted = enableMovementActionBonusActionExclusion(
      spent.success,
      false,
    );
    expect(movementRestricted.movementActionBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "action",
    });
  });

  it("does not infer prior Action history from extra resources or missing turn resources", () => {
    const granted = grantTestUnitActionResource();
    const restricted = enableActionOrBonusActionExclusion(granted);

    expect(restricted.actionTakenThisTurn).toBe(false);
    expect(restricted.actionOrBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "notChosen",
    });
    expect(canSpendAction(restricted, "attack")).toBe(true);
    expect(canSpendBonusAction(restricted)).toBe(true);
    expect(
      enableMovementActionBonusActionExclusion(granted, false)
        .movementActionBonusActionExclusion,
    ).toEqual({ kind: "restricted", choice: "notChosen" });

    const onlyExtraResource = {
      ...granted,
      actionResources: granted.actionResources.filter(
        (resource) => resource.source !== "turn",
      ),
    };
    const onlyExtraRestricted =
      enableActionOrBonusActionExclusion(onlyExtraResource);
    expect(onlyExtraRestricted.actionTakenThisTurn).toBe(false);
    expect(onlyExtraRestricted.actionOrBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "notChosen",
    });
    expect(canSpendAction(onlyExtraRestricted, "attack")).toBe(true);
    expect(canSpendBonusAction(onlyExtraRestricted)).toBe(true);
    expect(
      enableMovementActionBonusActionExclusion(onlyExtraResource, false)
        .movementActionBonusActionExclusion,
    ).toEqual({ kind: "restricted", choice: "notChosen" });
  });

  it("reconciles prior Bonus Action spending when the Action or Bonus Action restriction starts mid-turn", () => {
    const bonusActionSpent = spendActivationResource(
      resetTurnActionEconomy(emptyActionEconomyState()),
      { kind: "bonusAction" },
    );
    expect(Result.isSuccess(bonusActionSpent)).toBe(true);
    if (Result.isFailure(bonusActionSpent)) return;
    expect(canSpendAction(bonusActionSpent.success, "attack")).toBe(true);

    const restricted = enableActionOrBonusActionExclusion(
      bonusActionSpent.success,
    );

    expect(restricted.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(restricted.currentHasBonusAction).toBe(false);
    expect(restricted.actionOrBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "bonusAction",
    });
    expect(canSpendAction(restricted, "attack")).toBe(false);
    expect(canSpendBonusAction(restricted)).toBe(false);
  });

  it("restricts a turn to one of Movement, an Action, or a Bonus Action", () => {
    const restricted = enableMovementActionBonusActionExclusion(
      resetTurnActionEconomy(emptyActionEconomyState()),
      false,
    );

    expect(canSpendMovement(restricted)).toBe(true);
    expect(canSpendAction(restricted, "attack")).toBe(true);
    expect(canSpendBonusAction(restricted)).toBe(true);

    const spentAction = spendAction(restricted, "attack");
    expect(Result.isSuccess(spentAction)).toBe(true);
    if (Result.isFailure(spentAction)) return;
    expect(spentAction.success.movementActionBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "action",
    });
    expect(canSpendMovement(spentAction.success)).toBe(false);
    expect(canSpendAction(spentAction.success, "attack")).toBe(false);
    expect(canSpendBonusAction(spentAction.success)).toBe(false);

    const spentMovement =
      markMovementSpentForMovementActionBonusActionExclusion(restricted);
    expect(spentMovement.movementActionBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "movement",
    });
    expect(canSpendMovement(spentMovement)).toBe(false);
    expect(canSpendAction(spentMovement, "attack")).toBe(false);
    expect(canSpendBonusAction(spentMovement)).toBe(false);
  });

  it("rejects duplicate unit-granted action resources by owner and unit id", () => {
    const granted = grantTestUnitActionResource();

    expect(
      grantUnitActionResource(
        granted,
        sourceOwnerId,
        unitActionProcedureRef,
        attackOnlyRestriction,
      ),
    ).toEqual(Result.fail("unit-granted action resource already granted"));
  });

  it("spends spell-effect allow-only action resources only on admitted actions", () => {
    const granted = grantSpellEffectActionResource(
      resetTurnActionEconomy(emptyActionEconomyState()),
      spellEffectRef,
      ATTACK_ONCE_OR_DASH_DISENGAGE_HIDE_UTILIZE_ACTION_RESTRICTION,
    );
    expect(Result.isSuccess(granted)).toBe(true);
    if (Result.isFailure(granted)) return;

    const ordinaryActionSpent = spendAction(granted.success, "magic");
    expect(Result.isSuccess(ordinaryActionSpent)).toBe(true);
    if (Result.isFailure(ordinaryActionSpent)) return;

    expect(canSpendAction(ordinaryActionSpent.success, "magic")).toBe(false);
    expect(canSpendAction(ordinaryActionSpent.success, "dash")).toBe(true);
    const [spellEffectResource] = ordinaryActionSpent.success.actionResources;
    expect(spellEffectResource).toBeDefined();
    if (spellEffectResource === undefined) return;
    expect(actionResourceAllowsAdditionalAttacks(spellEffectResource)).toBe(
      false,
    );
  });

  it("rejects duplicate spell-effect action resources by effect ref", () => {
    const granted = grantSpellEffectActionResource(
      resetTurnActionEconomy(emptyActionEconomyState()),
      spellEffectRef,
      ATTACK_ONCE_OR_DASH_DISENGAGE_HIDE_UTILIZE_ACTION_RESTRICTION,
    );
    expect(Result.isSuccess(granted)).toBe(true);
    if (Result.isFailure(granted)) return;

    expect(
      grantSpellEffectActionResource(
        granted.success,
        spellEffectRef,
        ATTACK_ONCE_OR_DASH_DISENGAGE_HIDE_UTILIZE_ACTION_RESTRICTION,
      ),
    ).toEqual(Result.fail("spell-effect action resource already granted"));
  });

  it("spends selected and unarmed-strike action resources", () => {
    const flurry = {
      kind: "action",
      source: "monkFocusFlurryOfBlows",
      sourceOwnerId,
      sourceProcedureRef: unitActionProcedureRef,
    } as const;
    const state = {
      ...resetTurnActionEconomy(emptyActionEconomyState()),
      actionResources: [{ kind: "action", source: "turn" }, flurry] as const,
    };

    expect(actionResourceAllows(flurry, "attack")).toBe(false);
    expect(unarmedStrikeActionResourceAllows(flurry)).toBe(true);
    expect(canSpendUnarmedStrikeActionResource(state)).toBe(true);
    const spentFlurry = spendUnarmedStrikeActionResource(state);
    expect(Result.isSuccess(spentFlurry)).toBe(true);
    if (Result.isFailure(spentFlurry)) return;
    expect(spentFlurry.success.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(spentFlurry.success.actionTakenThisTurn).toBe(false);

    const selected = spendMatchingActionResource(
      grantTestUnitActionResource(),
      "attack",
      (resource) => resource.source === "unit",
    );
    expect(Result.isSuccess(selected)).toBe(true);
    expect(
      spendMatchingActionResource(
        emptyActionEconomyState(),
        "attack",
        () => true,
      ),
    ).toEqual(Result.fail("no action resource available"));
    expect(spendUnarmedStrikeActionResource(emptyActionEconomyState())).toEqual(
      Result.fail("no action resource available"),
    );
    expect(spendAction(emptyActionEconomyState(), "attack")).toEqual(
      Result.fail("no action resource available"),
    );
    expect(
      spendActivationResource(
        resetTurnActionEconomy(emptyActionEconomyState()),
        { kind: "action", action: "attack" },
      ),
    ).toMatchObject({ _tag: "Success" });
    expect(
      spendActionResourceAtIndex(
        resetTurnActionEconomy(emptyActionEconomyState()),
        0,
      ).actionResources,
    ).toEqual([]);
  });

  it("covers unrestricted resources and idempotent exclusion activation", () => {
    const unrestricted: ActionRestriction = { kind: "none" };
    const turnResource = { kind: "action", source: "turn" } as const;
    const unrestrictedState = emptyActionEconomyState();
    expect(disableActionOrBonusActionExclusion(unrestrictedState)).toBe(
      unrestrictedState,
    );
    expect(actionResourceAllowsAdditionalAttacks(turnResource)).toBe(true);
    expect(
      actionResourceAllowsAdditionalAttacks({
        kind: "action",
        source: "unit",
        sourceOwnerId,
        sourceProcedureRef: unitActionProcedureRef,
        restriction: unrestricted,
      }),
    ).toBe(true);
    expect(
      actionResourceAllowsAdditionalAttacks({
        kind: "action",
        source: "classFeatureExtraAttack",
        sourceOwnerId,
        sourceProcedureRef: unitActionProcedureRef,
        restriction: unrestricted,
      }),
    ).toBe(false);
    expect(
      markMovementSpentForMovementActionBonusActionExclusion(
        emptyActionEconomyState(),
      ),
    ).toEqual(emptyActionEconomyState());

    const actionOrBonusRestricted = enableActionOrBonusActionExclusion(
      resetTurnActionEconomy(emptyActionEconomyState()),
    );
    expect(enableActionOrBonusActionExclusion(actionOrBonusRestricted)).toBe(
      actionOrBonusRestricted,
    );

    const movementRestricted = enableMovementActionBonusActionExclusion(
      resetTurnActionEconomy(emptyActionEconomyState()),
      false,
    );
    expect(
      enableMovementActionBonusActionExclusion(movementRestricted, true),
    ).toBe(movementRestricted);
    expect(
      enableMovementActionBonusActionExclusion(
        resetTurnActionEconomy(emptyActionEconomyState()),
        true,
      ).movementActionBonusActionExclusion,
    ).toEqual({ kind: "restricted", choice: "movement" });

    const afterAction = enableMovementActionBonusActionExclusion(
      { ...emptyActionEconomyState(), actionTakenThisTurn: true },
      false,
    );
    expect(afterAction.movementActionBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "action",
    });
    const withoutBonus = enableMovementActionBonusActionExclusion(
      {
        ...resetTurnActionEconomy(emptyActionEconomyState()),
        currentHasBonusAction: false,
      },
      false,
    );
    expect(withoutBonus.movementActionBonusActionExclusion).toEqual({
      kind: "restricted",
      choice: "bonusAction",
    });
  });
});

describe("conditions-algebra", () => {
  it("applies Unconscious as Prone and Incapacitated", () => {
    const state = applyCondition(EMPTY_CONDITION_STATE, "unconscious");

    expect(state.unconscious).toBe(true);
    expect(state.prone).toBe(true);
    expect(isIncapacitated(state)).toBe(true);
    expect(hasCondition(state, "incapacitated")).toBe(true);
  });

  it("does not remove Prone while Unconscious remains active", () => {
    const unconscious = applyCondition(EMPTY_CONDITION_STATE, "unconscious");
    const stillProne = removeCondition(unconscious, "prone");
    const awake = removeCondition(stillProne, "unconscious");

    expect(stillProne.prone).toBe(true);
    expect(awake).toEqual({ ...stillProne, unconscious: false });
    expect(hasCondition(awake, "prone")).toBe(true);
    expect(hasCondition(EMPTY_CONDITION_STATE, "prone")).toBe(false);
    expect(
      removeCondition(applyCondition(EMPTY_CONDITION_STATE, "prone"), "prone")
        .prone,
    ).toBe(false);
  });

  it("derives Incapacitated from direct and implied condition facts", () => {
    expect(
      isIncapacitated(applyCondition(EMPTY_CONDITION_STATE, "incapacitated")),
    ).toBe(true);
    expect(
      isIncapacitated(applyCondition(EMPTY_CONDITION_STATE, "paralyzed")),
    ).toBe(true);
    expect(isIncapacitated(EMPTY_CONDITION_STATE)).toBe(false);
  });

  it("round-trips every directly represented condition", () => {
    for (const condition of CONDITIONS) {
      const applied = applyCondition(EMPTY_CONDITION_STATE, condition);
      expect(hasCondition(applied, condition)).toBe(true);
      expect(hasCondition(removeCondition(applied, condition), condition)).toBe(
        condition === "prone" && applied.unconscious,
      );
    }
  });

  it("compares every directly represented condition flag", () => {
    expect(
      conditionStatesEqual(EMPTY_CONDITION_STATE, EMPTY_CONDITION_STATE),
    ).toBe(true);
    for (const condition of CONDITIONS) {
      expect(
        conditionStatesEqual(
          EMPTY_CONDITION_STATE,
          applyCondition(EMPTY_CONDITION_STATE, condition),
        ),
      ).toBe(false);
    }
  });
});

describe("death-saves-algebra", () => {
  it("marks the creature Stable and resets counters after three successes", () => {
    const first = resolveDeathSavingThrow(resetDeathSaveRuntimeState(), 10);
    const second = resolveDeathSavingThrow(first, 10);
    const third = resolveDeathSavingThrow(second, 10);

    expect(third).toEqual({
      deathSaves: { successes: 0, failures: 0 },
      stable: true,
      dead: false,
      hpRegained: false,
    });
  });

  it("records natural 1 as two failures and three failures as dead", () => {
    const nat1 = resolveDeathSavingThrow(resetDeathSaveRuntimeState(), 1);
    const dead = addDeathFailures(nat1, 1);

    expect(nat1.deathSaves).toEqual({ successes: 0, failures: 2 });
    expect(dead.dead).toBe(true);
    expect(dead.deathSaves.failures).toBe(3);
  });

  it("records natural 20 as HP regained and ignores later death-save changes", () => {
    const hpRegained = resolveDeathSavingThrow(
      resetDeathSaveRuntimeState(),
      20,
    );

    expect(hpRegained).toEqual({
      deathSaves: { successes: 0, failures: 0 },
      stable: false,
      dead: false,
      hpRegained: true,
    });
    expect(addDeathFailures(hpRegained, 2)).toBe(hpRegained);
    expect(resolveDeathSavingThrow(hpRegained, 1)).toBe(hpRegained);
  });

  it("validates lifecycle states and ordinary failed rolls", () => {
    const failed = resolveDeathSavingThrow(resetDeathSaveRuntimeState(), 5);
    expect(failed.deathSaves.failures).toBe(1);
    expect(validDeathSaveRuntimeState(failed)).toBe(true);
    expect(
      validDeathSaveRuntimeState({
        ...failed,
        stable: true,
        dead: true,
      }),
    ).toBe(false);
    expect(resolveDeathSavingThrow(failed, 0)).toBe(failed);
    expect(
      validDeathSaveRuntimeState({
        ...failed,
        stable: true,
        hpRegained: true,
      }),
    ).toBe(false);
    expect(
      validDeathSaveRuntimeState({
        ...failed,
        hpRegained: true,
        deathSaves: { successes: 0, failures: 0 },
      }),
    ).toBe(true);
    expect(
      validDeathSaveRuntimeState({
        ...failed,
        stable: true,
      }),
    ).toBe(false);
    expect(
      validDeathSaveRuntimeState({
        ...failed,
        dead: true,
      }),
    ).toBe(false);
  });
});

describe("initiative-algebra", () => {
  it("advances through the caller-supplied order and increments the round", () => {
    const first = nextInitiative(initialInitiativeStack());
    const second = nextInitiative(first);

    expect(currentActing(first)).toBe("c2");
    expect(second.round).toBe(2);
    expect(initiativeOrder(second)).toEqual(["c1", "c2"]);
  });

  it("normalizes removal when no still-to-act entries remain", () => {
    const stack = nextInitiative(initialInitiativeStack());
    const result = removeFromInitiative(stack, (creature) => creature === "c2");

    expect(Option.isSome(result)).toBe(true);
    if (Option.isNone(result)) return;
    expect(result.value.round).toBe(2);
    expect(initiativeOrder(result.value)).toEqual(["c1"]);
  });

  it("requires caller tie decisions for equal initiative insertion", () => {
    const stack = createInitiativeStack(
      [initiativeEntry("c1", 10), initiativeEntry("c2", 10)],
      Round(1),
    );

    const undecided = insertByInitiative(stack, "cx", Initiative(10));
    expect(undecided).toEqual({ status: "decide", tie: ["c1", "c2"] });

    const inserted = insertByInitiative(stack, "cx", Initiative(10), [
      ["c1", "c2"],
      Index(1),
    ]);
    expect(inserted.status).toBe("ok");
    if (inserted.status !== "ok") return;
    expect(initiativeOrder(inserted.stack)).toEqual(["c1", "cx", "c2"]);
  });

  it("rejects initial Initiative score swaps when either actor is absent", () => {
    const stack = initialInitiativeStack();

    expect(
      Option.isNone(swapInitialInitiativeScores(stack, "missing", "c1")),
    ).toBe(true);
    expect(
      Option.isNone(swapInitialInitiativeScores(stack, "c1", "missing")),
    ).toBe(true);
  });

  it("supports scored construction, indexed insertion, swapping, and empty removal", () => {
    expect(
      Result.isSuccess(
        createScoredInitiativeStack(
          [initiativeEntry("c1", 2), initiativeEntry("c2", 1)],
          Round(1),
        ),
      ),
    ).toBe(true);
    expect(
      createScoredInitiativeStack(
        [initiativeEntry("c1", 1), initiativeEntry("c2", 2)],
        Round(1),
      ),
    ).toEqual(Result.fail("Initiative order must be monotone nonincreasing."));

    const stack = initialInitiativeStack();
    expect(
      initiativeOrder(
        insertAtOrderIndex(stack, 0, initiativeEntry("first", 3)),
      ),
    ).toEqual(["first", "c1", "c2"]);
    expect(
      initiativeOrder(
        insertAtOrderIndex(stack, 99, initiativeEntry("last", 0)),
      ),
    ).toEqual(["c1", "c2", "last"]);

    const swapped = swapInitialInitiativeScores(stack, "c1", "c2");
    expect(Option.isSome(swapped)).toBe(true);
    if (Option.isSome(swapped)) {
      expect(
        initiativeEntries(swapped.value).map((entry) => entry.creature),
      ).toEqual(["c2", "c1"]);
    }
    expect(Option.isNone(swapInitialInitiativeScores(stack, "c1", "c1"))).toBe(
      true,
    );
    expect(Option.isNone(removeFromInitiative(stack, () => true))).toBe(true);
    expect(Option.isSome(removeFromInitiative(stack, () => false))).toBe(true);

    const three = createInitiativeStack(
      [
        initiativeEntry("c1", 2),
        initiativeEntry("c2", 2),
        initiativeEntry("c3", 1),
      ],
      Round(1),
    );
    expect(Option.isSome(swapInitialInitiativeScores(three, "c1", "c2"))).toBe(
      true,
    );
  });

  it("validates insertion decisions against the actual tie", () => {
    const stack = initialInitiativeStack();
    expect(
      insertByInitiative(stack, "cx", Initiative(3), [["c1"], Index(0)]),
    ).toEqual({
      status: "error",
      reason: "decision_supplied_without_tie",
    });
    expect(insertByInitiative(stack, "cx", Initiative(3)).status).toBe("ok");

    const tied = createInitiativeStack(
      [initiativeEntry("c1", 2), initiativeEntry("c2", 2)],
      Round(1),
    );
    expect(
      insertByInitiative(tied, "cx", Initiative(2), [["wrong"], Index(0)]),
    ).toEqual({ status: "decide", tie: ["c1", "c2"] });
  });
});

function emptyActionEconomyState(): ActionEconomyState {
  return {
    actionResources: [],
    actionTakenThisTurn: false,
    currentHasBonusAction: false,
    actionOrBonusActionExclusion: { kind: "notRestricted" },
    movementActionBonusActionExclusion: { kind: "notRestricted" },
  };
}

function grantTestUnitActionResource(): ActionEconomyState {
  const granted = grantUnitActionResource(
    resetTurnActionEconomy(emptyActionEconomyState()),
    sourceOwnerId,
    unitActionProcedureRef,
    attackOnlyRestriction,
  );
  expect(Result.isSuccess(granted)).toBe(true);
  if (Result.isFailure(granted)) {
    throw new Error("Expected test setup to grant a unit action resource.");
  }
  return granted.success;
}

function initialInitiativeStack(): InitiativeStack<string> {
  return createInitiativeStack(
    [initiativeEntry("c1", 2), initiativeEntry("c2", 1)],
    Round(1),
  );
}

function initiativeEntry(
  creature: string,
  initiative: number,
): InitiativeEntry<string> {
  return { creature, initiative: Initiative(initiative) };
}
