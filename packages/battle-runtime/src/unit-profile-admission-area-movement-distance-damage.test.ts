import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import { areaMovementDistanceDamageProfile } from "./battle-reducer/spell-procedure-profiles/area-movement-distance-damage.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import type { SpellAdmissionActor } from "./battle-reducer/spell-procedure-profiles/profile.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
  type BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";
import {
  spellCasterId,
  spikeGrowthUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";

type OngoingSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

function spikeGrowthMechanics(): OngoingSpellMechanics {
  const mechanics = spellRecord(spikeGrowthUnitId).mechanics;
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Spike Growth ongoing-effect mechanics.");
  return mechanics;
}

function syntheticSpikeGrowthRecord(
  mutate: (mechanics: OngoingSpellMechanics) => unknown,
  suffix: string,
): SpellRecord {
  return decodeSpellRecordForTest({
    id: `synthetic_movement_hazard_${suffix}`,
    kind: "spell",
    name: `Synthetic Movement Hazard ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_movement_hazard_${suffix}`,
    },
    mechanics: mutate(spikeGrowthMechanics()),
  });
}

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function staticSpellAdmissionActor(): SpellAdmissionActor {
  const actor = spellBattle({ preparedSpells: [] }).state.combatants.get(
    spellCasterId,
  );
  if (!isSpellAdmissionActor(actor))
    throw new Error("Expected a spellcasting character fixture.");
  return actor;
}

function isSpellAdmissionActor(
  actor: BattleCreatureState | undefined,
): actor is SpellAdmissionActor {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting?.canCastSpells === true
  );
}

function issueShape(result: {
  readonly tag: string;
  readonly issues?: readonly {
    readonly failedFact: string;
    readonly mechanicsPath: unknown;
  }[];
}): readonly {
  readonly failedFact: string;
  readonly mechanicsPath: unknown;
}[] {
  return result.tag === "unsupported"
    ? (result.issues ?? []).map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

function mechanicsSourceWithOperationDiscriminant(input: {
  readonly operationIndex: 0 | 1;
  readonly field: "trigger" | "effect";
  readonly value: object;
}): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(spikeGrowthUnitId));
  const mechanics = structuredClone(source.mechanics);
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Spike Growth ongoing-effect mechanics.");
  const operation = mechanics.operations[input.operationIndex];
  if (operation === undefined)
    throw new Error("Expected the selected Spike Growth operation.");
  if (!Reflect.set(operation, input.field, input.value))
    throw new Error("Expected the malformed operation fixture to be writable.");
  return { ...mechanicsSource(source), mechanics };
}

function conditionalMechanicFixture(kind: "recognition" | "phantasm"): object {
  const record = spellRecord(
    kind === "recognition" ? spikeGrowthUnitId : "phantasmal_force",
  );
  if (
    record.mechanics.family !== "ongoing_effect" ||
    record.mechanics.authoredConditionalMechanics === undefined
  )
    throw new Error("Expected an authored conditional-mechanic fixture.");
  const effect = record.mechanics.authoredConditionalMechanics[0];
  if (effect === undefined)
    throw new Error("Expected an authored conditional-mechanic fixture.");
  return structuredClone(effect);
}

function mechanicsSourceWithConditionalMechanics(
  mechanicsValue: readonly object[] | undefined,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(spikeGrowthUnitId));
  const mechanics = structuredClone(source.mechanics);
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Spike Growth ongoing-effect mechanics.");
  if (mechanicsValue === undefined) {
    if (!Reflect.deleteProperty(mechanics, "authoredConditionalMechanics"))
      throw new Error(
        "Expected the conditional-mechanic fixture to be writable.",
      );
  } else if (
    !Reflect.set(mechanics, "authoredConditionalMechanics", mechanicsValue)
  ) {
    throw new Error(
      "Expected the conditional-mechanic fixture to be writable.",
    );
  }
  return { ...mechanicsSource(source), mechanics };
}

describe("areaMovementDistanceDamage static admission", () => {
  test("projects Spike Growth mechanics once and binds mechanics-free execution", () => {
    const source = spellAdmissionSource(spellRecord(spikeGrowthUnitId));
    const result = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 2,
      rangeFeet: 150,
      radiusFeet: 20,
      durationTicks: 100,
      damage: {
        expr: { dice: 2, dieSize: 4 },
        damageType: "piercing",
      },
      damagePerFeet: 5,
    });
    expect(result.admitted.evidence).toEqual({
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("school"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
      unowned: [
        spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(1)),
      ],
    });

    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: staticSpellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
        ],
      },
    );

    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({
      resource: { tag: "spellSlot", slotLevel: 2 },
      targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
      durationTicks: 100,
      rangeFeet: 150,
      damage: {
        expr: { dice: 2, dieSize: 4 },
        damageType: "piercing",
      },
      damagePerFeet: 5,
    });
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });

  test("recognizes identical mechanics independently of authored identity", () => {
    const original = spellAdmissionSource(spellRecord(spikeGrowthUnitId));
    const renamed = spellAdmissionSource(
      syntheticSpikeGrowthRecord((mechanics) => mechanics, "renamed"),
    );
    const originalResult = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(original),
    );
    const renamedResult = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(renamed),
    );

    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (originalResult.tag !== "supported" || renamedResult.tag !== "supported")
      return;
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test("recognizes the duplicate-free skill set independently of authored order", () => {
    const canonicalSource = spellAdmissionSource(
      spellRecord(spikeGrowthUnitId),
    );
    const reversedRecognition = conditionalMechanicFixture("recognition");
    if (
      !(
        "attempt" in reversedRecognition &&
        typeof reversedRecognition.attempt === "object" &&
        reversedRecognition.attempt !== null &&
        "check" in reversedRecognition.attempt &&
        typeof reversedRecognition.attempt.check === "object" &&
        reversedRecognition.attempt.check !== null
      ) ||
      !Reflect.set(reversedRecognition.attempt.check, "skillOptions", [
        "survival",
        "perception",
      ])
    )
      throw new Error("Expected the recognition check fixture to be writable.");
    const canonical = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(canonicalSource),
    );
    const reversed = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSourceWithConditionalMechanics([reversedRecognition]),
    );

    expect(canonical.tag).toBe("supported");
    expect(reversed.tag).toBe("supported");
    if (canonical.tag !== "supported" || reversed.tag !== "supported") return;
    expect(reversed.admitted.facts).toEqual(canonical.admitted.facts);
    expect(reversed.admitted.evidence).toEqual(canonical.admitted.evidence);
  });

  test.each([
    {
      caseName: "missing recognition branch",
      mechanicsValue: undefined,
      paths: [spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(1))],
    },
    {
      caseName: "malformed recognition branch",
      mechanicsValue: [
        {
          ...conditionalMechanicFixture("recognition"),
          attempt: {
            action: "search",
            check: {
              ability: "wis",
              skillOptions: ["perception", "survival"],
              dc: { kind: "caster_spell_save_dc" },
              onSuccess: {
                kind: "recognize_hazardous_terrain",
                timing: "synthetic_after_entering_area",
              },
            },
          },
        },
      ],
      paths: [spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(1))],
    },
    {
      caseName: "unsupported conditional branch",
      mechanicsValue: [conditionalMechanicFixture("phantasm")],
      paths: [spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(1))],
    },
    {
      caseName: "extra conditional branch",
      mechanicsValue: [
        conditionalMechanicFixture("recognition"),
        conditionalMechanicFixture("phantasm"),
      ],
      paths: [spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(2))],
    },
    {
      caseName: "reordered conditional branches",
      mechanicsValue: [
        conditionalMechanicFixture("phantasm"),
        conditionalMechanicFixture("recognition"),
      ],
      paths: [
        spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(1)),
        spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(2)),
      ],
    },
  ] as const)(
    "rejects $caseName at exact authored paths",
    ({ mechanicsValue, paths }) => {
      const result = areaMovementDistanceDamageProfile.admitMechanics(
        mechanicsSourceWithConditionalMechanics(mechanicsValue),
      );

      expect(issueShape(result)).toEqual(
        paths.map((mechanicsPath) => ({
          failedFact: "authoredConditionalMechanics",
          mechanicsPath,
        })),
      );
    },
  );

  test.each([
    [
      "level",
      (mechanics: OngoingSpellMechanics) => ({ ...mechanics, level: 3 }),
      "level",
      spellMechanicsHeaderPath("level"),
    ],
    [
      "radius",
      (mechanics: OngoingSpellMechanics) => {
        if (
          mechanics.attachment.kind !== "hole" ||
          mechanics.attachment.value.kind !== "area" ||
          mechanics.attachment.value.shape.kind !== "sphere"
        )
          throw new Error("Expected Spike Growth Sphere mechanics.");
        return {
          ...mechanics,
          attachment: {
            ...mechanics.attachment,
            value: {
              ...mechanics.attachment.value,
              shape: { ...mechanics.attachment.value.shape, radiusFeet: 25 },
            },
          },
        };
      },
      "attachment",
      spellOngoingAttachmentPath(),
    ],
    [
      "movement interval",
      (mechanics: OngoingSpellMechanics) => ({
        ...mechanics,
        operations: mechanics.operations.map((operation) =>
          operation.trigger.kind === "on_creature_moves"
            ? {
                ...operation,
                trigger: { ...operation.trigger, perFeet: 10 },
              }
            : operation,
        ),
      }),
      "movementDamageOperation",
      spellOngoingOperationPath(PositiveInteger(2)),
    ],
  ] as const)(
    "keeps a one-field %s mutation represented with one exact issue",
    (_label, mutate, failedFact, mechanicsPath) => {
      const result = areaMovementDistanceDamageProfile.admitMechanics(
        mechanicsSource(
          spellAdmissionSource(
            syntheticSpikeGrowthRecord(mutate, `mutation_${failedFact}`),
          ),
        ),
      );

      expect(result.tag).toBe("unsupported");
      expect(issueShape(result)).toEqual([{ failedFact, mechanicsPath }]);
    },
  );

  test("accumulates exact material and duration child coordinates without parent issues", () => {
    const record = syntheticSpikeGrowthRecord((mechanics) => {
      if (mechanics.duration.kind !== "concentration")
        throw new Error("Expected Spike Growth Concentration mechanics.");
      return {
        ...mechanics,
        components: {
          ...mechanics.components,
          materialCostGp: 5,
          materialConsumed: true,
        },
        duration: {
          ...mechanics.duration,
          upTo: {
            ...mechanics.duration.upTo,
            upcastTiers: [{ atSlot: 3, amount: 20 }],
          },
          earlyEnd: [{ kind: "caster_recasts_spell" as const }],
        },
      };
    }, "nested_children");
    const result = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(issueShape(result)).toEqual([
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("cost"),
      },
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("consumption"),
      },
      {
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
    ]);
  });

  test("preserves operation ordinals when the authored operation order changes", () => {
    const record = syntheticSpikeGrowthRecord(
      (mechanics) => ({
        ...mechanics,
        operations: [mechanics.operations[1], mechanics.operations[0]],
      }),
      "reordered_operations",
    );
    const result = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence.consumed.slice(-4)).toEqual([
      spellOngoingOperationPath(PositiveInteger(2)),
      spellOngoingOperationEffectPath(PositiveInteger(2)),
      spellOngoingOperationPath(PositiveInteger(1)),
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ]);
  });

  test.each([
    {
      caseName: "difficult-terrain trigger",
      operationIndex: 0,
      field: "trigger",
      value: { kind: "synthetic_passive_trigger" },
      failedFact: "difficultTerrainOperation",
      mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
    },
    {
      caseName: "difficult-terrain effect",
      operationIndex: 0,
      field: "effect",
      value: { kind: "synthetic_difficult_terrain" },
      failedFact: "difficultTerrainEffect",
      mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
    },
    {
      caseName: "movement trigger",
      operationIndex: 1,
      field: "trigger",
      value: { kind: "synthetic_creature_movement", perFeet: 5 },
      failedFact: "movementDamageOperation",
      mechanicsPath: spellOngoingOperationPath(PositiveInteger(2)),
    },
    {
      caseName: "movement damage effect",
      operationIndex: 1,
      field: "effect",
      value: { kind: "synthetic_movement_damage" },
      failedFact: "movementDamageEffect",
      mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(2)),
    },
  ] as const)(
    "keeps the actual authored ordinal for a malformed $caseName discriminant",
    ({ operationIndex, field, value, failedFact, mechanicsPath }) => {
      const result = areaMovementDistanceDamageProfile.admitMechanics(
        mechanicsSourceWithOperationDiscriminant({
          operationIndex,
          field,
          value,
        }),
      );

      expect(issueShape(result)).toEqual([{ failedFact, mechanicsPath }]);
    },
  );

  test("does not claim a different point-origin difficult-terrain spell", () => {
    const source = spellAdmissionSource(spellRecord("fog_cloud"));

    expect(
      areaMovementDistanceDamageProfile.admitMechanics(mechanicsSource(source)),
    ).toEqual({ tag: "notRepresented" });
  });
});
