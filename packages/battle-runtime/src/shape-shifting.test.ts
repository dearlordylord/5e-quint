// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.druid-wild-shape-known-form
import { expect, test } from "vitest";

import {
  revertShapeShiftedRuntimeState,
  shapeShiftedRuntimeState,
  trueFormRuntimeState,
  type BattleShapeShiftSource,
} from "./index.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime-test-support.ts";

test("source-neutral shape-shift state admits synthetic spell and stat-block sources", () => {
  const spellSource = {
    kind: "spellEffect",
    sourceCombatantId: combatantId("synthetic-shape-caster"),
    sourceSpellId: "synthetic_shape_spell",
  } as const satisfies BattleShapeShiftSource;
  const spellShift = shapeShiftedRuntimeState({
    source: spellSource,
    replacementForm: {
      kind: "runtimeCreatureForm",
      creatureSize: "large",
    },
    reversionOwner: {
      kind: "spellTransformationActiveEffect",
    },
  });

  expect(spellShift).toMatchObject({
    kind: "shapeShifted",
    trueForm: { kind: "combatantBaseState" },
    source: { kind: "spellEffect" },
    replacementForm: { kind: "runtimeCreatureForm", creatureSize: "large" },
    reversionOwner: { kind: "spellTransformationActiveEffect" },
  });
  const state = startBattleRight({
    battleId: battleId("battle-source-neutral-shape-shifting"),
    combatants: [
      characterSeed({
        combatantId: combatantId("synthetic-shape-target"),
        displayName: "Synthetic Shape Target",
        initiative: 20,
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  expect(
    revertShapeShiftedRuntimeState({ state, shapeShift: spellShift }),
  ).toMatchObject({
    tag: "unsupportedShapeShiftSource",
    source: { kind: "spellEffect" },
  });

  const shapechangerSource = {
    kind: "statBlockShapechanger",
    sourceCombatantId: combatantId("synthetic-shapechanger"),
  } as const satisfies BattleShapeShiftSource;
  const shapechangerShift = shapeShiftedRuntimeState({
    source: shapechangerSource,
    replacementForm: {
      kind: "runtimeCreatureForm",
      creatureSize: "small",
    },
    reversionOwner: {
      kind: "statBlockShapechangerRuntime",
    },
  });

  expect(shapechangerShift).toMatchObject({
    kind: "shapeShifted",
    source: { kind: "statBlockShapechanger" },
    replacementForm: { kind: "runtimeCreatureForm", creatureSize: "small" },
    reversionOwner: { kind: "statBlockShapechangerRuntime" },
  });
  expect(
    revertShapeShiftedRuntimeState({ state, shapeShift: shapechangerShift }),
  ).toMatchObject({
    tag: "unsupportedShapeShiftSource",
    source: { kind: "statBlockShapechanger" },
  });
  expect(trueFormRuntimeState()).toEqual({
    kind: "trueForm",
    trueForm: { kind: "combatantBaseState" },
  });
});
