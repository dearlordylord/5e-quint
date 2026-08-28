// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.druid-wild-shape-known-form
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
} from "./battle-runtime.test-support.ts";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { Result } from "effect";
import { expect, test } from "vitest";

import {
  battleShapeShiftedRuntimeState,
  battleSpellEffectOccurrenceId,
  revertShapeShiftedCombatantToTrueForm,
  revertShapeShiftedRuntimeState,
  removeBattleRuntimeCombatants,
  spellShapeShiftedRuntimeState,
  shapeShiftedRuntimeState,
  trueFormRuntimeState,
  type BattleActiveEffect,
} from "./index.ts";
import type { BattleActiveEffectOccurrenceTemplate } from "./effect-execution-ref.ts";
import { projectShapeShiftRuntimeReversion } from "./battle-reducer/shape-shifting.ts";
import {
  battleId,
  combatantId,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import {
  battleExecutionScopeOrdinal,
  battleStatBlockExecutionScopeRef,
} from "./identity.ts";
import { battleCreatureWithSpellActiveEffects } from "./active-effect/lifecycle.ts";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "./battle-runtime-session.test-support.ts";

const spellShapeCasterId = combatantId("synthetic-shape-spell-caster");
const spellShapeTargetId = combatantId("synthetic-shape-spell-target");
const syntheticDruidWildShapeEffect: Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "druidWildShapeForm" }
> = {
  kind: "druidWildShapeForm",
  sourceCombatantId: combatantId("synthetic-shape-druid"),
  sourceProcedureRef: battleProcedureExecutionRefForTest(
    "synthetic_wild_shape_feature",
  ),
  formScopeRef: battleStatBlockExecutionScopeRef(
    battleId("synthetic-shape-battle"),
    combatantId("synthetic-shape-druid"),
    battleExecutionScopeOrdinal(1),
  ),
  formLimbs: { kind: "cannotHandleObjects" },
  equipmentDisposition: [],
  expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
};
const syntheticSpellShapeShiftEffect = {
  kind: "spellShapeShiftedForm",
  sourceCombatantId: spellShapeCasterId,
  sourceProcedureRef: battleProcedureExecutionRefForTest(
    String("synthetic_shape_spell"),
  ),
  sourceEffectId: battleSpellEffectOccurrenceId("synthetic-shape-spell-effect"),
  replacementForm: {
    kind: "runtimeCreatureForm",
    creatureSize: "large",
  },
  expiresAt: { kind: "concentration", combatantId: spellShapeCasterId },
} as const satisfies BattleActiveEffectOccurrenceTemplate;
const replacementSpellShapeShiftEffect = {
  ...syntheticSpellShapeShiftEffect,
  sourceEffectId: battleSpellEffectOccurrenceId(
    "replacement-synthetic-shape-spell-effect",
  ),
  replacementForm: {
    kind: "runtimeCreatureForm",
    creatureSize: "medium",
  },
} as const satisfies BattleActiveEffectOccurrenceTemplate;

test("shape-shift runtime state admits true form and class-feature restoration owners", () => {
  const trueForm = trueFormRuntimeState();
  expect(trueForm).toEqual({
    kind: "trueForm",
    trueForm: { kind: "combatantBaseState" },
  });
  expect(projectShapeShiftRuntimeReversion(trueForm)).toEqual({
    tag: "alreadyTrueForm",
    shapeShift: trueForm,
  });

  const allocatedDruidEffect = allocatedSyntheticDruidWildShapeEffect();
  const shifted = shapeShiftedRuntimeState({
    source: {
      kind: "classFeature",
      sourceCombatantId: allocatedDruidEffect.sourceCombatantId,
      sourceProcedureRef: allocatedDruidEffect.sourceProcedureRef,
    },
    replacementForm: {
      kind: "runtimeCreatureForm",
      creatureSize: "large",
    },
    reversionOwner: {
      kind: "druidWildShapeActiveEffect",
      effect: allocatedDruidEffect,
    },
  });
  expect(shifted).toMatchObject({
    kind: "shapeShifted",
    trueForm: { kind: "combatantBaseState" },
    source: { kind: "classFeature" },
    replacementForm: { kind: "runtimeCreatureForm", creatureSize: "large" },
    reversionOwner: { kind: "druidWildShapeActiveEffect" },
  });
  expect(projectShapeShiftRuntimeReversion(shifted)).toEqual({
    tag: "revertedToTrueForm",
    shapeShift: trueForm,
  });
});

test("spell-effect shape-shift runtime state derives replacement and true-form facts from one active effect", () => {
  const state = spellShapeShiftBattle();
  const target = state.combatants.get(spellShapeTargetId);
  if (target === undefined) {
    throw new Error("Expected synthetic shape-shift target.");
  }
  const spellShapeEffect = target.activeEffects.find(
    (effect) =>
      effect.kind === "spellShapeShiftedForm" &&
      effect.sourceEffectId === syntheticSpellShapeShiftEffect.sourceEffectId,
  );
  if (
    spellShapeEffect === undefined ||
    spellShapeEffect.kind !== "spellShapeShiftedForm"
  ) {
    throw new Error("Expected allocated spell shape-shift effect.");
  }

  expect(battleShapeShiftedRuntimeState(target)).toEqual(
    spellShapeShiftedRuntimeState({
      targetCombatantId: spellShapeTargetId,
      effect: spellShapeEffect,
    }),
  );
});

test("active-effect boundary admits only one active shape-shift owner", () => {
  const state = spellShapeShiftBattle();
  const target = state.combatants.get(spellShapeTargetId);
  if (target === undefined) {
    throw new Error("Expected synthetic shape-shift target.");
  }
  const replacementAllocation =
    battleStateWithAllocatedEffectOccurrencesForTest({
      state,
      occurrences: [
        {
          kind: "activeEffect",
          ownerId: spellShapeTargetId,
          effect: replacementSpellShapeShiftEffect,
        },
      ],
    });
  const replacementOccurrence = replacementAllocation.occurrences[0];
  if (
    replacementOccurrence?.kind !== "activeEffect" ||
    replacementOccurrence.effect.kind !== "spellShapeShiftedForm"
  ) {
    throw new Error("Expected allocated replacement shape-shift effect.");
  }
  const replacementEffect = replacementOccurrence.effect;

  const nextTarget = battleCreatureWithSpellActiveEffects(target, [
    ...target.activeEffects,
    replacementEffect,
  ]);

  expect(
    nextTarget.activeEffects.filter(
      (effect) =>
        effect.kind === "druidWildShapeForm" ||
        effect.kind === "spellShapeShiftedForm",
    ),
  ).toEqual([replacementEffect]);
  expect(battleShapeShiftedRuntimeState(nextTarget)).toEqual(
    spellShapeShiftedRuntimeState({
      targetCombatantId: spellShapeTargetId,
      effect: replacementEffect,
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

test("spell-effect shape-shift reversion reports a target removed through the public roster lifecycle", () => {
  const state = spellShapeShiftBattle();
  const target = state.combatants.get(spellShapeTargetId);
  if (target === undefined) {
    throw new Error("Expected synthetic shape-shift target.");
  }
  const shapeShift = battleShapeShiftedRuntimeState(target);
  if (shapeShift.kind !== "shapeShifted") {
    throw new Error("Expected spell-effect shape-shift runtime state.");
  }
  const removed = removeBattleRuntimeCombatants({
    session: battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForTest(new Map()),
    }),
    combatantIds: [spellShapeTargetId],
  });
  if (Result.isFailure(removed)) {
    throw new Error(JSON.stringify(removed.failure));
  }

  expect(
    revertShapeShiftedRuntimeState({
      state: removed.success.state,
      shapeShift,
    }),
  ).toMatchObject({
    tag: "missingCombatant",
    combatantId: spellShapeTargetId,
  });
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

function allocatedSyntheticDruidWildShapeEffect(): Extract<
  BattleActiveEffect,
  { readonly kind: "druidWildShapeForm" }
> {
  const ownerId = syntheticDruidWildShapeEffect.sourceCombatantId;
  const state = startBattleRight({
    battleId: battleId("synthetic-shape-battle"),
    combatants: [
      statBlockCreatureInit({ combatantId: ownerId, initiative: 10 }),
    ],
  });
  const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
    state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId,
        effect: syntheticDruidWildShapeEffect,
      },
    ],
  });
  const occurrence = allocated.occurrences[0];
  if (
    occurrence?.kind !== "activeEffect" ||
    occurrence.effect.kind !== "druidWildShapeForm"
  ) {
    throw new Error("Expected allocated Druid Wild Shape occurrence.");
  }
  return occurrence.effect;
}

function spellShapeShiftBattle(
  activeShapeShiftOwners: readonly BattleActiveEffectOccurrenceTemplate[] = [
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
  return battleStateWithAllocatedEffectOccurrencesForTest({
    state,
    occurrences: activeShapeShiftOwners.map((effect) => ({
      kind: "activeEffect" as const,
      ownerId: spellShapeTargetId,
      effect,
    })),
  }).state;
}
