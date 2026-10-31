import {
  BattleHoleSchema,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  battleStatBlockExecutionScopeRef,
  combatantId,
  type BattleSpellAreaInputRequest,
  type BattleSpellSavingThrowOutcomeHole,
} from "@dnd/battle-runtime";
import { NonNegativeInteger } from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";
import {
  BattleAreaInputGuidanceSchema,
  battleAreaInputGuidance,
} from "./battle-area-input-guidance.ts";

const actorId = combatantId("synthetic-area-caster");
const sourceProcedureRef = battleProcedureExecutionRef(
  battleStatBlockExecutionScopeRef(
    battleId("synthetic-area-guidance"),
    actorId,
    battleExecutionScopeOrdinal(0),
  ),
  NonNegativeInteger(0),
);
const holeBase = {
  kind: "savingThrowOutcome",
  holeId: holeId("synthetic-area-save"),
  holeInstanceKey: holeInstanceKey("synthetic-area-save-instance"),
  label: "Synthetic area save",
  sourceProcedureRef,
  ability: "dex",
  dc: { kind: "fixed", dc: 13 },
  areaChoices: [],
  targetRollModes: [],
  targetFlatBonuses: [],
} as const;
function areaHole(
  kind: BattleSpellAreaInputRequest["kind"],
): BattleSpellSavingThrowOutcomeHole {
  return { ...holeBase, outcomeTargeting: "area", areaInput: { kind } };
}
function guidanceFor(kind: BattleSpellAreaInputRequest["kind"]) {
  const [guidance] = battleAreaInputGuidance(areaHole(kind));
  if (guidance === undefined) throw new Error("Expected area guidance.");
  return guidance;
}
function validateArea(kind: BattleSpellAreaInputRequest["kind"]) {
  return createDraft2020JsonSchemaValidator().getValidator(
    requireJsonSchema(guidanceFor(kind).areaSchema, "Area guidance"),
  );
}
const areaBase = {
  originAnchorId: actorId,
  affectedTargetIds: ["synthetic-area-target"],
};

describe("Battle area input guidance", () => {
  it("returns the canonical required ignition shape and explicit empty-object answer", () => {
    const guidance = guidanceFor("pointOriginSphereSaveDamageArea");
    const validate = validateArea("pointOriginSphereSaveDamageArea");
    expect(guidance).toMatchObject({
      holeId: holeBase.holeId,
      valuePath: "fill.value.area",
      areaSchema: {
        required: expect.arrayContaining([
          "originAnchorId",
          "affectedTargetIds",
          "kind",
          "objectIgnitionFacts",
        ]),
      },
    });
    expect(guidance.instructions.join(" ")).toContain(
      "objectIgnitionFacts: []",
    );
    expect(guidance.instructions.join(" ")).toContain("table confirms");
    expect(validate(areaBase).valid).toBe(false);
    expect(
      validate({ ...areaBase, kind: "pointOriginSphereSaveDamageArea" }).valid,
    ).toBe(false);
    expect(
      validate({
        ...areaBase,
        kind: "pointOriginSphereSaveDamageArea",
        objectIgnitionFacts: [],
      }).valid,
    ).toBe(true);
    for (const kind of [
      "flammableUnattended",
      "notFlammable",
      "wornOrCarried",
    ]) {
      expect(
        validate({
          ...areaBase,
          kind: "pointOriginSphereSaveDamageArea",
          objectIgnitionFacts: [
            { objectId: "synthetic-area-object", disposition: { kind } },
          ],
        }).valid,
      ).toBe(true);
    }
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleAreaInputGuidanceSchema)(guidance),
      ),
    ).toBe(true);
  });

  it("keeps object damage and forced-movement input branches distinct", () => {
    const objectDamage = validateArea("pointOriginSphereObjectDamageArea");
    expect(
      objectDamage({
        ...areaBase,
        kind: "pointOriginSphereObjectDamageArea",
        nonmagicalUnattendedObjectDamageFacts: [],
      }).valid,
    ).toBe(true);
    expect(
      objectDamage({
        ...areaBase,
        kind: "pointOriginSphereSaveDamageArea",
        objectIgnitionFacts: [],
      }).valid,
    ).toBe(false);
    const push = guidanceFor("selfOriginCubePushArea");
    expect(push.areaSchema.required).toEqual(
      expect.arrayContaining([
        "creaturePushes",
        "unsecuredObjectPushes",
        "audibleBoom",
      ]),
    );
  });

  it("keeps basic area membership separate from staged-condition evidence", () => {
    expect(validateArea("areaMembership")(areaBase).valid).toBe(true);
    const stagedArea = {
      ...areaBase,
      stagedConditionAutomaticSuccessFacts: [
        { kind: "doesNotSleep", targetId: "synthetic-area-target" },
      ],
    };
    expect(validateArea("areaMembership")(stagedArea).valid).toBe(false);
    expect(
      validateArea("stagedConditionAreaMembership")(stagedArea).valid,
    ).toBe(true);
  });

  it("rejects single-target requests with area requirements and areas without requirements", () => {
    const decode = Schema.decodeUnknownResult(BattleHoleSchema, {
      onExcessProperty: "error",
    });
    expect(
      Result.isFailure(decode({ ...holeBase, outcomeTargeting: "area" })),
    ).toBe(true);
    expect(
      Result.isFailure(
        decode({
          ...holeBase,
          outcomeTargeting: "singleTarget",
          areaInput: { kind: "pointOriginSphereSaveDamageArea" },
        }),
      ),
    ).toBe(true);
    const singleTarget = {
      ...holeBase,
      outcomeTargeting: "singleTarget",
    } as const satisfies BattleSpellSavingThrowOutcomeHole;
    expect(battleAreaInputGuidance(singleTarget)).toEqual([]);
  });
});
