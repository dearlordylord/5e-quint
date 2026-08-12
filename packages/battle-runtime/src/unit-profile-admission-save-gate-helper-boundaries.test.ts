import { movementFeet, spellSlotLevel } from "@dnd/shared/types";
import {
  unitId as parseSharedUnitId,
  type UnitId,
} from "@dnd/shared/game-facts";
import type { TargetSelection } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  areaSaveGateSpellRangeFeet,
  oneAdditionalTargetPerSpellSlotAboveBaseLevel,
  supportedPreparedSaveGateConditionProfile,
} from "./battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts";
import {
  animalFriendshipUnitId,
  blindnessDeafnessUnitId,
  charmPersonUnitId,
  holdPersonUnitId,
  rayOfEnfeeblementUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { resourceCount } from "./unit-profile-admission.test-support.ts";

type RangeBearingSpellTargeting = Parameters<
  typeof areaSaveGateSpellRangeFeet
>[1];

const preparedSlot = (level: number) => [
  {
    spellLevel: spellSlotLevel(level),
    count: resourceCount(1),
    expended: resourceCount(0),
  },
];

const blindnessDeafnessId = parseSharedUnitId(blindnessDeafnessUnitId);
const holdPersonId = parseSharedUnitId(holdPersonUnitId);
const animalFriendshipId = parseSharedUnitId(animalFriendshipUnitId);
const charmPersonId = parseSharedUnitId(charmPersonUnitId);
const rayOfEnfeeblementId = parseSharedUnitId(rayOfEnfeeblementUnitId);

function targetSelectionOf(spellId: UnitId): TargetSelection {
  const spell = spellRecord(spellId);
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected an activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    throw new Error("Expected a save-gated target-selection spell.");
  }
  return phase.attachment.value.selection;
}

function spellWithTargetSelection(spellId: UnitId, selection: TargetSelection) {
  const spell = spellRecord(spellId);
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected an activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    throw new Error("Expected a save-gated target-selection spell.");
  }
  return decodeSpellRecordForTest({
    ...spell,
    mechanics: {
      ...spell.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            value: { ...phase.attachment.value, selection },
          },
        },
      ],
    },
  });
}

describe("save-gate helper admission boundaries", () => {
  test("one-additional-target scaling accepts only the authored linear progression", () => {
    const authoredScaling = targetSelectionOf(blindnessDeafnessId);
    if (authoredScaling.mode !== "choose_up_to") {
      throw new Error("Expected authored slot-scaled targeting.");
    }
    const targetCount = oneAdditionalTargetPerSpellSlotAboveBaseLevel(
      authoredScaling,
      2,
    );
    expect(targetCount?.(spellSlotLevel(5))).toBe(4);

    const unsupportedSelections = [
      targetSelectionOf(rayOfEnfeeblementId),
      { ...authoredScaling, count: 1 },
      {
        ...authoredScaling,
        count: {
          kind: "threshold_tiers",
          axis: "character",
          base: 1,
          tiers: [{ atLevel: 5, value: 2 }],
        },
      },
      {
        ...authoredScaling,
        count: {
          kind: "linear",
          base: 2,
          baseLevel: 2,
          perSlotAboveBase: 1,
        },
      },
      {
        ...authoredScaling,
        count: {
          kind: "linear",
          base: 1,
          baseLevel: 1,
          perSlotAboveBase: 1,
        },
      },
      {
        ...authoredScaling,
        count: {
          kind: "linear",
          base: 1,
          baseLevel: 2,
          perSlotAboveBase: 2,
        },
      },
    ] as const satisfies readonly TargetSelection[];

    for (const selection of unsupportedSelections) {
      expect(oneAdditionalTargetPerSpellSlotAboveBaseLevel(selection, 2)).toBe(
        null,
      );
    }
  });

  test("range-bearing targeting projections derive range only from compatible authored origins", () => {
    const pointRange = { kind: "point", feet: 60 } as const;
    const selfRange = { kind: "self" } as const;
    const pointTargetings = [
      { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      { kind: "pointOriginSphereDiameter", diameterFeet: movementFeet(5) },
      { kind: "pointOriginCubeExcludingCaster", sideFeet: movementFeet(20) },
      { kind: "pointOriginCube", sideFeet: movementFeet(20) },
      {
        kind: "primaryTargetOriginEmanation",
        radiusFeet: movementFeet(5),
      },
      {
        kind: "pointOriginCylinder",
        radiusFeet: movementFeet(10),
        heightFeet: movementFeet(20),
      },
      { kind: "targetList", minTargets: 1, maxTargets: 2 },
    ] as const satisfies readonly RangeBearingSpellTargeting[];
    const selfTargetings = [
      { kind: "selfOriginCube", sideFeet: movementFeet(15) },
      { kind: "selfOriginCone", lengthFeet: movementFeet(15) },
      {
        kind: "selfOriginLine",
        lengthFeet: movementFeet(100),
        widthFeet: movementFeet(5),
      },
      { kind: "selfOriginEmanation", radiusFeet: movementFeet(10) },
    ] as const satisfies readonly RangeBearingSpellTargeting[];

    for (const targeting of pointTargetings) {
      expect(areaSaveGateSpellRangeFeet(pointRange, targeting)).toBe(
        movementFeet(60),
      );
      expect(areaSaveGateSpellRangeFeet(selfRange, targeting)).toBeNull();
    }
    for (const targeting of selfTargetings) {
      expect(areaSaveGateSpellRangeFeet(selfRange, targeting)).toBe(
        movementFeet(0),
      );
      expect(areaSaveGateSpellRangeFeet(pointRange, targeting)).toBeNull();
    }
  });

  test("condition profiles reject target scaling and target-kind near misses", () => {
    const staticBlindness = spellWithTargetSelection(blindnessDeafnessId, {
      mode: "choose_up_to",
      count: 1,
    });
    const objectBlindness = spellWithTargetSelection(blindnessDeafnessId, {
      mode: "choose_up_to",
      count: {
        kind: "linear",
        base: 1,
        baseLevel: 2,
        perSlotAboveBase: 1,
      },
      targetKinds: ["object"],
    });
    const staticHoldPerson = spellWithTargetSelection(holdPersonId, {
      mode: "choose_up_to",
      count: 1,
      typeFilter: ["humanoid"],
    });
    const holdPersonSelection = targetSelectionOf(holdPersonId);
    if (holdPersonSelection.mode !== "choose_up_to") {
      throw new Error("Expected Hold Person target-list selection.");
    }
    const objectHoldPerson = spellWithTargetSelection(holdPersonId, {
      ...holdPersonSelection,
      targetKinds: ["object"],
    });
    const repeatingHoldPerson = spellWithTargetSelection(holdPersonId, {
      ...holdPersonSelection,
      repeatsAllowed: true,
    });
    const staticAnimalFriendship = spellWithTargetSelection(
      animalFriendshipId,
      { mode: "choose_up_to", count: 1, typeFilter: ["beast"] },
    );
    const objectCharmPerson = spellWithTargetSelection(charmPersonId, {
      ...targetSelectionOf(charmPersonId),
      targetKinds: ["object"],
    });

    for (const spell of [
      staticBlindness,
      objectBlindness,
      staticHoldPerson,
      objectHoldPerson,
      repeatingHoldPerson,
      staticAnimalFriendship,
      objectCharmPerson,
    ]) {
      expect(
        supportedPreparedSaveGateConditionProfile(
          spellAdmissionSource(spell),
          preparedSlot(spell.mechanics.level),
        ),
      ).toEqual([]);
    }
  });
});
