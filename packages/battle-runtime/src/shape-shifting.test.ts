// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.druid-wild-shape-known-form
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { resourceCount } from "@dnd/shared/types";
import { expect, test } from "vitest";

import {
  shapeShiftedRuntimeState,
  trueFormRuntimeState,
  type BattleActiveEffect,
} from "./index.ts";
import { combatantId } from "./battle-runtime-test-support.ts";

test("shape-shift runtime state admits true form and class-feature restoration owners", () => {
  const effect: Extract<
    BattleActiveEffect,
    { readonly kind: "druidWildShapeForm" }
  > = {
    kind: "druidWildShapeForm",
    sourceCombatantId: combatantId("synthetic-shape-druid"),
    sourceUnitId: "synthetic_wild_shape_feature",
    formStatBlockId: "synthetic_beast_form",
    equipmentDisposition: "merged",
    resources: {
      legendaryActionUsesRemaining: resourceCount(0),
      dailyUses: [],
      unavailableRechargeParts: [],
      unavailableRestRechargeParts: [],
    },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
  };

  expect(trueFormRuntimeState()).toEqual({
    kind: "trueForm",
    trueForm: { kind: "combatantBaseState" },
  });

  expect(
    shapeShiftedRuntimeState({
      source: {
        kind: "classFeature",
        sourceCombatantId: effect.sourceCombatantId,
        sourceUnitId: effect.sourceUnitId,
      },
      replacementForm: {
        kind: "runtimeCreatureForm",
        creatureSize: "large",
      },
      reversionOwner: {
        kind: "druidWildShapeActiveEffect",
        effect,
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
