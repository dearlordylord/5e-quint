import { PositiveInteger } from "@dnd/shared/types";
import { spellActivationAttachmentPath } from "@dnd/surface/surface/spell-mechanics-path";
import { describe, expect, test } from "vitest";
import aidInput from "../../../../surface/content/aid.json";
import calmEmotionsInput from "../../../../surface/content/calm_emotions.json";
import { battleSpellExecutionSourceFromAdmission } from "../../battle-state-execution.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import {
  contextFor,
  mechanicsSource,
} from "./support-spell-procedure-admission.test-support.js";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";

describe("scalar-buff procedure projection", () => {
  test.each([
    [
      "false_life",
      {
        branchKind: "instantaneous",
        targeting: { kind: "self" },
        duration: { kind: "instantaneous" },
        effect: {
          kind: "temporaryHitPoints",
          amount: {
            kind: "linear",
            baseDice: 2,
            baseDieSize: 4,
            baseFlat: 4,
            perLevelDice: 0,
            perLevelFlat: 5,
            startingAtLevel: 2,
          },
        },
      },
    ],
    [
      "longstrider",
      {
        branchKind: "nonInstant",
        targeting: {
          kind: "targetList",
          count: { kind: "linear", base: 1, baseLevel: 1, perSlotAboveBase: 1 },
          requiredTargetDisposition: "unrestricted",
        },
        duration: { kind: "timed", value: { amount: 1, unit: "hour" } },
        effect: { kind: "speedDelta", deltaFeet: 10 },
      },
    ],
    [
      "shield_of_faith",
      {
        branchKind: "nonInstant",
        targeting: {
          kind: "targetList",
          count: { kind: "fixed", count: 1 },
          requiredTargetDisposition: "unrestricted",
        },
        duration: {
          kind: "concentration",
          upTo: { amount: 10, unit: "minute" },
        },
        effect: { kind: "armorClassBonus", bonus: 2 },
      },
    ],
    [
      "spider_climb",
      {
        branchKind: "nonInstant",
        targeting: {
          kind: "targetList",
          count: { kind: "linear", base: 1, baseLevel: 2, perSlotAboveBase: 1 },
          requiredTargetDisposition: "willing",
        },
        duration: { kind: "concentration", upTo: { amount: 1, unit: "hour" } },
        effect: { kind: "specialSpeedEqualTo", speedKind: "climb" },
      },
    ],
    [
      "fly",
      {
        branchKind: "nonInstant",
        targeting: {
          kind: "targetList",
          count: { kind: "linear", base: 1, baseLevel: 3, perSlotAboveBase: 1 },
          requiredTargetDisposition: "willing",
        },
        duration: {
          kind: "concentration",
          upTo: { amount: 10, unit: "minute" },
        },
        effect: { kind: "specialSpeedFixed", speedFeet: 60 },
      },
    ],
    [
      "barkskin",
      {
        branchKind: "nonInstant",
        targeting: {
          kind: "targetList",
          count: { kind: "fixed", count: 1 },
          requiredTargetDisposition: "willing",
        },
        duration: { kind: "timed", value: { amount: 1, unit: "hour" } },
        effect: { kind: "armorClassFloor", floor: 17 },
      },
    ],
    [
      "aid",
      {
        branchKind: "nonInstant",
        targeting: {
          kind: "targetList",
          count: { kind: "fixed", count: 3 },
          requiredTargetDisposition: "unrestricted",
        },
        duration: { kind: "timed", value: { amount: 8, unit: "hour" } },
        effect: {
          kind: "hitPointMaximumIncrease",
          amount: { base: 5, perLevel: 5, startingAtLevel: 2 },
        },
      },
    ],
  ] as const)("projects %s into typed procedure facts", (spellId, expected) => {
    const source = spellAdmissionSource(spellRecord(spellId));
    const result = scalarBuffProfile.admitMechanics(mechanicsSource(source));

    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject(expected);
  });

  test("binds target scaling and source-free active-effect execution", () => {
    const source = spellAdmissionSource(spellRecord("spider_climb"));
    const result = scalarBuffProfile.admitMechanics(mechanicsSource(source));

    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      contextFor(source.castingSource),
    );

    expect(invocation).toMatchObject({
      procedure: "scalarBuff",
      targeting: {
        kind: "targetList",
        minTargets: 1,
        maxTargets: 4,
        requiredTargetDisposition: "willing",
      },
      effect: {
        kind: "activeEffect",
        activeEffect: {
          kind: "specialSpeedGrant",
          speedKind: "climb",
          speed: { kind: "equalToSpeed" },
          hover: false,
          expiresAt: {
            kind: "concentration",
            durationTicks: 600,
          },
        },
      },
    });
  });

  test("rejects an area selection instead of treating it as a target list", () => {
    const areaPhase = calmEmotionsInput.mechanics.phases[0];
    if (areaPhase?.attachment === undefined) {
      throw new Error("Expected Calm Emotions area attachment fixture.");
    }
    const spell = decodeSpellRecordForTest({
      ...aidInput,
      id: "synthetic_scalar_buff_area_selection",
      name: "synthetic scalar buff area selection",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_scalar_buff_area_selection",
      },
      mechanics: {
        ...aidInput.mechanics,
        phases: aidInput.mechanics.phases.map((phase) => ({
          ...phase,
          attachment: areaPhase.attachment,
        })),
      },
    });
    const result = scalarBuffProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(spell)),
    );

    expect(result).toMatchObject({ tag: "unsupported" });
    if (result.tag !== "unsupported") return;
    expect(result.issues).toContainEqual({
      tag: "spellProcedureAdmissionIssue",
      procedure: "scalarBuff",
      failedFact: "selection",
      mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      message: "Unsupported scalarBuff mechanics fact: selection.",
    });
  });
});
