import {
  BattleHoleSchema,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  battleStatBlockExecutionScopeRef,
  combatantId,
  type BattleHole,
  type BattleSpellAreaInputRequest,
  type BattleSpellSavingThrowOutcomeHole,
} from "@dnd/battle-runtime";
import {
  BattleInputGuidanceSchema,
  battleInputGuidance,
} from "./battle-input-guidance.ts";
import { battleAreaInputInstructions } from "./battle-area-input-instructions.ts";
import { movementFeet, NonNegativeInteger } from "@dnd/shared/types";
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
  const [guidance] = battleInputGuidance(areaHole(kind));
  if (guidance === undefined) throw new Error("Expected area guidance.");
  return guidance;
}
function validateArea(kind: BattleSpellAreaInputRequest["kind"]) {
  const validate = createDraft2020JsonSchemaValidator().getValidator(
    requireJsonSchema(guidanceFor(kind).fillSchema, "Current area fill"),
  );
  return (area: unknown) =>
    validate({
      kind: "savingThrowOutcome",
      holeId: holeBase.holeId,
      value: {
        area,
        outcomes: [
          {
            targetId: "synthetic-area-target",
            succeeded: false,
            d20TestRoll: { tag: "single", naturalD20: 6 },
          },
        ],
      },
    });
}
const areaBase = {
  originAnchorId: actorId,
  affectedTargetIds: ["synthetic-area-target"],
};

const pointAreaBase = {
  originAnchor: { kind: "tableSelectedPoint" },
  affectedTargetIds: areaBase.affectedTargetIds,
};

describe("Battle area input guidance", () => {
  it("pins independent Sphere membership to the discovered mechanics", () => {
    const sphereFactRequest = {
      kind: "magicActionAreaSaveDamageHealingTargetsInSphere",
      actorId,
      sourceProcedureRef,
      originWithinRangeFeet: movementFeet(60),
      radiusFeet: movementFeet(10),
    } as const;
    const hole = {
      kind: "targetSpatialFacts",
      holeId: holeBase.holeId,
      holeInstanceKey: holeBase.holeInstanceKey,
      label: "Synthetic Sphere membership",
      requiresTableSpatialFact: true,
      sphereFactRequest,
    } satisfies BattleHole;
    expect(
      Result.isSuccess(Schema.decodeUnknownResult(BattleHoleSchema)(hole)),
    ).toBe(true);
    const [guidance] = battleInputGuidance(hole);
    if (guidance === undefined)
      throw new Error("Expected membership guidance.");
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(guidance.fillSchema, "Sphere membership fill"),
    );
    const fact = { ...sphereFactRequest, targetIds: [actorId] };
    const fill = {
      kind: "targetSpatialFacts",
      holeId: hole.holeId,
      spatialFacts: [fact],
    };
    expect(validate(fill).valid).toBe(true);
    expect(validate({ ...fill, spatialFacts: [] }).valid).toBe(false);
    expect(
      validate({ ...fill, spatialFacts: [{ ...fact, targetIds: [] }] }).valid,
    ).toBe(false);
    expect(validate({ ...fill, spatialFacts: [fact, fact] }).valid).toBe(false);
    expect(
      validate({ ...fill, spatialFacts: [{ ...fact, radiusFeet: 20 }] }).valid,
    ).toBe(false);
    expect(
      validate({
        ...fill,
        spatialFacts: [{ ...fact, actorId: "another-actor" }],
      }).valid,
    ).toBe(false);
    expect(JSON.stringify(guidance.fillSchema)).not.toContain(
      "unitFeatureVisibleTargetWithinRange",
    );
    expect(guidance.instructions.join(" ")).toContain(
      "Keep accepted Saving Throw outcomes and dice",
    );
  });

  it("requires the requested visibility witness and excludes unrelated spatial families", () => {
    const targetSpatialFactRequest = {
      kind: "unitFeatureVisibleTargetWithinRange",
      actorId,
      sourceProcedureRef,
      rangeFeet: movementFeet(60),
    } as const;
    const hole = {
      ...holeBase,
      targetIds: [actorId],
      targetSpatialFactRequest,
    } satisfies BattleHole;
    const [guidance] = battleInputGuidance(hole);
    if (guidance === undefined)
      throw new Error("Expected visibility guidance.");
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(guidance.fillSchema, "Visible target fill"),
    );
    const fill = {
      kind: "savingThrowOutcome",
      holeId: hole.holeId,
      value: {
        outcomes: [{ targetId: actorId, succeeded: false, withoutRoll: true }],
      },
      spatialFacts: [{ ...targetSpatialFactRequest, targetId: actorId }],
    };
    expect(validate(fill).valid).toBe(true);
    const { spatialFacts: _omitted, ...missing } = fill;
    expect(validate(missing).valid).toBe(false);
    expect(
      validate({
        ...fill,
        spatialFacts: [{ ...fill.spatialFacts[0], rangeFeet: 30 }],
      }).valid,
    ).toBe(false);
    expect(JSON.stringify(guidance.fillSchema)).not.toContain(
      "magicActionAreaSaveDamageHealingTargetsInSphere",
    );
  });

  it("returns the canonical required ignition shape and explicit empty-object answer", () => {
    const guidance = guidanceFor("pointOriginSphereSaveDamageArea");
    const validate = validateArea("pointOriginSphereSaveDamageArea");
    expect(guidance).toMatchObject({
      holeId: holeBase.holeId,
      valuePath: "fill",
    });
    expect(guidance.instructions.join(" ")).toContain(
      "objectIgnitionFacts: []",
    );
    expect(guidance.instructions.join(" ")).toContain("table confirms");
    expect(validate(pointAreaBase).valid).toBe(false);
    expect(
      validate({ ...pointAreaBase, kind: "pointOriginSphereSaveDamageArea" })
        .valid,
    ).toBe(false);
    expect(
      validate({
        ...pointAreaBase,
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
          ...pointAreaBase,
          kind: "pointOriginSphereSaveDamageArea",
          objectIgnitionFacts: [
            { objectId: "synthetic-area-object", disposition: { kind } },
          ],
        }).valid,
      ).toBe(true);
    }
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleInputGuidanceSchema)(guidance),
      ),
    ).toBe(true);
  });

  it("keeps object damage and forced-movement input branches distinct", () => {
    const objectDamage = validateArea("pointOriginSphereObjectDamageArea");
    expect(
      objectDamage({
        ...pointAreaBase,
        kind: "pointOriginSphereObjectDamageArea",
        nonmagicalUnattendedObjectDamageFacts: [],
      }).valid,
    ).toBe(true);
    expect(
      objectDamage({
        ...pointAreaBase,
        kind: "pointOriginSphereSaveDamageArea",
        objectIgnitionFacts: [],
      }).valid,
    ).toBe(false);
    const push = validateArea("selfOriginCubePushArea");
    expect(push({ ...areaBase, kind: "selfOriginCubePushArea" }).valid).toBe(
      false,
    );
    expect(
      push({
        ...pointAreaBase,
        kind: "pointOriginSphereObjectDamageArea",
        nonmagicalUnattendedObjectDamageFacts: [],
      }).valid,
    ).toBe(false);
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

  it("keeps the complete fill contract specific to the requested area membership", () => {
    const fill = {
      kind: "savingThrowOutcome",
      holeId: holeBase.holeId,
      value: {
        area: {
          ...areaBase,
          stagedConditionAutomaticSuccessFacts: [
            { kind: "doesNotSleep", targetId: areaBase.affectedTargetIds[0] },
          ],
        },
        outcomes: [
          {
            targetId: areaBase.affectedTargetIds[0],
            succeeded: true,
            d20TestRoll: { tag: "single", naturalD20: 18 },
          },
        ],
      },
    };
    for (const [kind, accepted] of [
      ["areaMembership", false],
      ["stagedConditionAreaMembership", true],
    ] as const) {
      const input = battleInputGuidance(areaHole(kind))[0];
      if (input === undefined)
        throw new Error("Expected current fill guidance.");
      const validate = createDraft2020JsonSchemaValidator().getValidator(
        requireJsonSchema(input.fillSchema, "area fill"),
      );
      expect(validate(fill).valid).toBe(accepted);
    }
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
    expect(battleAreaInputInstructions(singleTarget)).toEqual([]);
  });
});
