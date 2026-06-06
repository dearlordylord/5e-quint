// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.druid-wild-shape-known-form
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { resourceCount } from "@dnd/shared/types";
import { expect, test } from "vitest";

import {
  battleShapeShiftedRuntimeState,
  battleSpellEffectOccurrenceId,
  revertShapeShiftedCombatantToTrueForm,
  spellShapeShiftedRuntimeState,
  shapeShiftedRuntimeState,
  trueFormRuntimeState,
  type BattleActiveEffect,
  type SpellShapeShiftedFormActiveEffect,
} from "./index.ts";
import {
  battleId,
  combatantId,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime-test-support.ts";
import { battleCreatureWithSpellActiveEffects } from "./active-effect/lifecycle.ts";

const spellShapeCasterId = combatantId("synthetic-shape-spell-caster");
const spellShapeTargetId = combatantId("synthetic-shape-spell-target");
const syntheticDruidWildShapeEffect: Extract<
  BattleActiveEffect,
  { readonly kind: "druidWildShapeForm" }
> = {
  kind: "druidWildShapeForm",
  sourceCombatantId: combatantId("synthetic-shape-druid"),
  sourceUnitId: "synthetic_wild_shape_feature",
  formStatBlockId: "synthetic_beast_form",
  formLimbs: { kind: "cannotHandleObjects" },
  equipmentDisposition: [],
  resources: {
    legendaryActionUsesRemaining: resourceCount(0),
    dailyUses: [],
    unavailableRechargeParts: [],
    unavailableRestRechargeParts: [],
  },
  expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
};
const syntheticSpellShapeShiftEffect: SpellShapeShiftedFormActiveEffect = {
  kind: "spellShapeShiftedForm",
  sourceCombatantId: spellShapeCasterId,
  sourceSpellId: "synthetic_shape_spell",
  sourceEffectId: battleSpellEffectOccurrenceId("synthetic-shape-spell-effect"),
  replacementForm: {
    kind: "runtimeCreatureForm",
    creatureSize: "large",
  },
  expiresAt: { kind: "concentration", combatantId: spellShapeCasterId },
};
const replacementSpellShapeShiftEffect: SpellShapeShiftedFormActiveEffect = {
  ...syntheticSpellShapeShiftEffect,
  sourceEffectId: battleSpellEffectOccurrenceId(
    "replacement-synthetic-shape-spell-effect",
  ),
  replacementForm: {
    kind: "runtimeCreatureForm",
    creatureSize: "medium",
  },
};

test("shape-shift runtime state admits true form and class-feature restoration owners", () => {
  expect(trueFormRuntimeState()).toEqual({
    kind: "trueForm",
    trueForm: { kind: "combatantBaseState" },
  });

  expect(
    shapeShiftedRuntimeState({
      source: {
        kind: "classFeature",
        sourceCombatantId: syntheticDruidWildShapeEffect.sourceCombatantId,
        sourceUnitId: syntheticDruidWildShapeEffect.sourceUnitId,
      },
      replacementForm: {
        kind: "runtimeCreatureForm",
        creatureSize: "large",
      },
      reversionOwner: {
        kind: "druidWildShapeActiveEffect",
        effect: syntheticDruidWildShapeEffect,
      },
    }),
  ).toMatchObject({
    kind: "shapeShifted",
    trueForm: { kind: "combatantBaseState" },
    source: { kind: "classFeature" },
    replacementForm: { kind: "runtimeCreatureForm", creatureSize: "large" },
    reversionOwner: { kind: "druidWildShapeActiveEffect" },
  });
});

test("spell-effect shape-shift runtime state derives replacement and true-form facts from one active effect", () => {
  const state = spellShapeShiftBattle();
  const target = state.combatants.get(spellShapeTargetId);
  if (target === undefined) {
    throw new Error("Expected synthetic shape-shift target.");
  }

  expect(battleShapeShiftedRuntimeState(target)).toEqual(
    spellShapeShiftedRuntimeState({
      targetCombatantId: spellShapeTargetId,
      effect: syntheticSpellShapeShiftEffect,
    }),
  );
});

test("active-effect boundary admits only one active shape-shift owner", () => {
  const state = spellShapeShiftBattle();
  const target = state.combatants.get(spellShapeTargetId);
  if (target === undefined) {
    throw new Error("Expected synthetic shape-shift target.");
  }

  const nextTarget = battleCreatureWithSpellActiveEffects(target, [
    ...target.activeEffects,
    replacementSpellShapeShiftEffect,
  ]);

  expect(
    nextTarget.activeEffects.filter(
      (effect) =>
        effect.kind === "druidWildShapeForm" ||
        effect.kind === "spellShapeShiftedForm",
    ),
  ).toEqual([replacementSpellShapeShiftEffect]);
  expect(battleShapeShiftedRuntimeState(nextTarget)).toEqual(
    spellShapeShiftedRuntimeState({
      targetCombatantId: spellShapeTargetId,
      effect: replacementSpellShapeShiftEffect,
    }),
  );
});

test("spell-effect shape-shift reversion removes the active effect and returns true form", () => {
  const state = spellShapeShiftBattle();
  const result = revertShapeShiftedCombatantToTrueForm({
    state,
    combatantId: spellShapeTargetId,
  });

  expect(result.tag).toBe("reverted");
  const target = result.state.combatants.get(spellShapeTargetId);
  if (target === undefined) {
    throw new Error("Expected synthetic shape-shift target.");
  }
  expect(
    target.activeEffects.some(
      (effect) =>
        effect.kind === "spellShapeShiftedForm" &&
        effect.sourceEffectId === syntheticSpellShapeShiftEffect.sourceEffectId,
    ),
  ).toBe(false);
  expect(battleShapeShiftedRuntimeState(target)).toEqual(
    trueFormRuntimeState(),
  );
});

test("shape-shift reversion clears the whole owner slot from pre-boundary mixed-owner state", () => {
  const state = spellShapeShiftBattle([
    syntheticDruidWildShapeEffect,
    syntheticSpellShapeShiftEffect,
    replacementSpellShapeShiftEffect,
  ]);
  const result = revertShapeShiftedCombatantToTrueForm({
    state,
    combatantId: spellShapeTargetId,
  });

  expect(result.tag).toBe("reverted");
  const target = result.state.combatants.get(spellShapeTargetId);
  if (target === undefined) {
    throw new Error("Expected synthetic shape-shift target.");
  }
  expect(
    target.activeEffects.some(
      (effect) =>
        effect.kind === "druidWildShapeForm" ||
        effect.kind === "spellShapeShiftedForm",
    ),
  ).toBe(false);
  expect(battleShapeShiftedRuntimeState(target)).toEqual(
    trueFormRuntimeState(),
  );
});

function spellShapeShiftBattle(
  activeShapeShiftOwners: readonly BattleActiveEffect[] = [
    syntheticSpellShapeShiftEffect,
  ],
) {
  const state = startBattleRight({
    battleId: battleId("spell-shape-shift-reversion"),
    combatants: [
      statBlockCreatureInit({
        combatantId: spellShapeCasterId,
        initiative: 20,
      }),
      statBlockCreatureInit({
        combatantId: spellShapeTargetId,
        initiative: 10,
      }),
    ],
  });
  const target = state.combatants.get(spellShapeTargetId);
  if (target === undefined) {
    throw new Error("Expected synthetic shape-shift target.");
  }
  const combatants = new Map(state.combatants);
  combatants.set(spellShapeTargetId, {
    ...target,
    activeEffects: [...target.activeEffects, ...activeShapeShiftOwners],
  });
  return { ...state, combatants };
}
