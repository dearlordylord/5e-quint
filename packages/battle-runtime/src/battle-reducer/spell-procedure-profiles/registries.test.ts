import {
  PositiveInteger,
  type PositiveInteger as PositiveIntegerType,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  spellActivationEffectPath,
  spellDurationEndingPath,
  spellOngoingOperationEffectPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { describe, expect, test } from "vitest";
import {
  admitRegisteredSpellProcedureMechanics,
  registeredSpellProcedureMechanicsAdmissions,
} from "./admission-registry.ts";
import { spellProcedureExecutionFor } from "./execution-registry.ts";
import { spellProcedureExecutionRegistry } from "./execution-composition.ts";
import { spellAttackSequenceProfile } from "./spell-attack-sequence.ts";
import { targetingSaveInterdictionProfile } from "./targeting-save-interdiction.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import type { BattleSpellProcedureKey } from "../../character-execution.ts";
import type { EffectAtom, SpellMechanics } from "@dnd/surface/surface/types";

type OngoingMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type OngoingOperation = OngoingMechanics["operations"][number];
type ModifyAcEffect = Extract<
  OngoingOperation["effect"],
  { readonly kind: "modify_ac" }
>;
type DimIlluminationEffect = Extract<
  OngoingOperation["effect"],
  { readonly kind: "emit_dim_illumination" }
>;
type BrightAndDimIlluminationEffect = Extract<
  EffectAtom,
  { readonly kind: "emit_bright_and_dim_illumination" }
>;
type PermanentDuration = Extract<
  SpellMechanics["duration"],
  { readonly kind: "permanent" }
>;

const WARDING_BOND_ARMOR_CLASS_OPERATION_ORDINAL = PositiveInteger(1);
const DANCING_LIGHTS_ILLUMINATION_OPERATION_ORDINAL = PositiveInteger(2);
const LIGHT_ILLUMINATION_PHASE_ORDINAL = PositiveInteger(1);
const LIGHT_ILLUMINATION_EFFECT_ORDINAL = PositiveInteger(1);
const CONTINUAL_FLAME_SECOND_DURATION_ENDING_ORDINAL = PositiveInteger(2);

type RegistryAdmissionScenario = {
  readonly label: string;
  readonly spellId: string;
  readonly expectedProcedure: BattleSpellProcedureKey;
};

const registryAdmissionScenarios = [
  {
    label: "Warding Bond",
    spellId: "warding_bond",
    expectedProcedure: "linkedDefenseResistanceDamageShare",
  },
  {
    label: "Dancing Lights",
    spellId: "dancing_lights",
    expectedProcedure: "movableLightManifestation",
  },
  {
    label: "Light",
    spellId: "light",
    expectedProcedure: "objectLight",
  },
  {
    label: "Continual Flame",
    spellId: "continual_flame",
    expectedProcedure: "objectLight",
  },
  {
    label: "Starry Wisp",
    spellId: "starry_wisp",
    expectedProcedure: "spellAttackDamage",
  },
  {
    label: "Grease",
    spellId: "grease",
    expectedProcedure: "persistentAreaSaveCondition",
  },
] as const satisfies readonly RegistryAdmissionScenario[];

function registryMechanicsSource(
  spellId: string,
  update?: (mechanics: SpellMechanics) => SpellMechanics,
) {
  const source = spellAdmissionSource(spellRecord(spellId));
  const mechanics = update?.(source.mechanics) ?? source.mechanics;
  return {
    mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
  };
}

function replaceAtOrdinal<Item>(
  values: ReadonlyNonEmptyArray<Item>,
  ordinal: PositiveIntegerType,
  update: (value: Item) => Item,
): ReadonlyNonEmptyArray<Item> {
  const index = Number(ordinal) - 1;
  const [first, ...rest] = values;
  if (index < 0 || !Number.isInteger(index)) {
    throw new Error(`Expected a positive ordinal, got ${ordinal}.`);
  }
  if (index === 0) return [update(first), ...rest];

  const selected = rest[index - 1];
  if (selected === undefined) {
    throw new Error(`Expected an item at ordinal ${ordinal}.`);
  }
  return [
    first,
    ...rest.map((value, siblingIndex) =>
      siblingIndex === index - 1 ? update(selected) : value,
    ),
  ];
}

function updateModifyAcEffect(effect: ModifyAcEffect): ModifyAcEffect {
  if (effect.delta.kind !== "fixed_dice") {
    throw new Error("Expected Warding Bond fixed-dice armor-class delta.");
  }
  return {
    ...effect,
    delta: { ...effect.delta, dice: 2 },
  };
}

function updateDimIlluminationEffect(
  effect: DimIlluminationEffect,
): DimIlluminationEffect {
  return { ...effect, radiusFeet: 15 };
}

function updateBrightAndDimIlluminationEffect(
  effect: BrightAndDimIlluminationEffect,
): BrightAndDimIlluminationEffect {
  return { ...effect, brightRadiusFeet: 25 };
}

function updateContinualFlameDuration(
  duration: PermanentDuration,
): PermanentDuration {
  if (
    duration.endsOn.length !==
      Number(CONTINUAL_FLAME_SECOND_DURATION_ENDING_ORDINAL) - 1 ||
    duration.endsOn[0] !== "dispel"
  ) {
    throw new Error("Expected Continual Flame's sole dispel ending.");
  }
  return {
    ...duration,
    endsOn: [...duration.endsOn, "damage"],
  };
}

function updateWardingBondArmorClassOperation(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Warding Bond ongoing-effect mechanics.");
  }
  return {
    ...mechanics,
    operations: replaceAtOrdinal(
      mechanics.operations,
      WARDING_BOND_ARMOR_CLASS_OPERATION_ORDINAL,
      (operation) => {
        if (operation.effect.kind !== "modify_ac") {
          throw new Error("Expected Warding Bond armor-class operation.");
        }
        return {
          ...operation,
          effect: updateModifyAcEffect(operation.effect),
        };
      },
    ),
  };
}

function updateDancingLightsIlluminationOperation(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Dancing Lights ongoing-effect mechanics.");
  }
  return {
    ...mechanics,
    operations: replaceAtOrdinal(
      mechanics.operations,
      DANCING_LIGHTS_ILLUMINATION_OPERATION_ORDINAL,
      (operation) => {
        if (operation.effect.kind !== "emit_dim_illumination") {
          throw new Error("Expected Dancing Lights illumination operation.");
        }
        return {
          ...operation,
          effect: updateDimIlluminationEffect(operation.effect),
        };
      },
    ),
  };
}

function updateLightIlluminationEffect(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "activation") {
    throw new Error("Expected Light activation mechanics.");
  }
  return {
    ...mechanics,
    phases: replaceAtOrdinal(
      mechanics.phases,
      LIGHT_ILLUMINATION_PHASE_ORDINAL,
      (phase) => {
        if (phase.kind !== "direct" || phase.effects === undefined) {
          throw new Error("Expected Light direct activation phase effects.");
        }
        return {
          ...phase,
          effects: replaceAtOrdinal(
            phase.effects,
            LIGHT_ILLUMINATION_EFFECT_ORDINAL,
            (effect) => {
              if (effect.kind !== "emit_bright_and_dim_illumination") {
                throw new Error("Expected Light illumination effect.");
              }
              return updateBrightAndDimIlluminationEffect(effect);
            },
          ),
        };
      },
    ),
  };
}

function updateContinualFlameDurationEnding(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "activation") {
    throw new Error("Expected Continual Flame activation mechanics.");
  }
  if (mechanics.duration.kind !== "permanent") {
    throw new Error("Expected Continual Flame permanent duration.");
  }
  return {
    ...mechanics,
    duration: updateContinualFlameDuration(mechanics.duration),
  };
}

describe("spell procedure registry views", () => {
  test("mechanics admission projection exposes only static owner operations", () => {
    const admissions = registeredSpellProcedureMechanicsAdmissions();

    expect(admissions.length).toBeGreaterThan(0);
    expect(
      admissions.every(
        (admission) =>
          Object.keys(admission).sort().join(",") === "admitMechanics",
      ),
    ).toBe(true);
  });

  test("execution lookup excludes authored admission operations", () => {
    const execution = spellProcedureExecutionFor(
      spellProcedureExecutionRegistry(),
      "damageReduction",
    );

    expect(execution.procedure).toBe("damageReduction");
    expect("admit" in execution).toBe(false);
    expect(execution.executionSchema).toBeDefined();
    expect(execution.discoverCastAct).toBeTypeOf("function");
    expect(execution.resolve).toBeTypeOf("function");
  });

  test.each(registryAdmissionScenarios)(
    "complete registry admits canonical $label exactly once",
    ({ spellId, expectedProcedure }) => {
      const result = admitRegisteredSpellProcedureMechanics(
        registryMechanicsSource(spellId),
      );
      expect(result.tag).toBe("admitted");
      if (result.tag !== "admitted") return;
      expect(result.procedures.map(({ procedure }) => procedure)).toEqual([
        expectedProcedure,
      ]);
    },
  );

  test.each([
    "starry_wisp",
    "fire_bolt",
    "ray_of_frost",
    "guiding_bolt",
    "chromatic_orb",
  ] as const)(
    "spell-attack sequence does not represent single-attack spell %s",
    (spellId) => {
      expect(
        spellAttackSequenceProfile.admitMechanics(
          registryMechanicsSource(spellId),
        ),
      ).toEqual({ tag: "notRepresented" });
    },
  );

  test("targeting-save interdiction does not represent Grease", () => {
    expect(
      targetingSaveInterdictionProfile.admitMechanics(
        registryMechanicsSource("grease"),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  const registryIssueScenarios = [
    {
      label: "Warding Bond armor class operation",
      spellId: "warding_bond",
      update: updateWardingBondArmorClassOperation,
      expectedProcedure: "linkedDefenseResistanceDamageShare",
      expectedFailedFact: "armorClassOperation",
      expectedMechanicsPath: spellOngoingOperationEffectPath(
        WARDING_BOND_ARMOR_CLASS_OPERATION_ORDINAL,
      ),
    },
    {
      label: "Dancing Lights illumination operation",
      spellId: "dancing_lights",
      update: updateDancingLightsIlluminationOperation,
      expectedProcedure: "movableLightManifestation",
      expectedFailedFact: "illuminationOperation",
      expectedMechanicsPath: spellOngoingOperationEffectPath(
        DANCING_LIGHTS_ILLUMINATION_OPERATION_ORDINAL,
      ),
    },
    {
      label: "Light illumination effect",
      spellId: "light",
      update: updateLightIlluminationEffect,
      expectedProcedure: "objectLight",
      expectedFailedFact: "lightEffect",
      expectedMechanicsPath: spellActivationEffectPath(
        LIGHT_ILLUMINATION_PHASE_ORDINAL,
        LIGHT_ILLUMINATION_EFFECT_ORDINAL,
      ),
    },
    {
      label: "Continual Flame second duration ending",
      spellId: "continual_flame",
      update: updateContinualFlameDurationEnding,
      expectedProcedure: "objectLight",
      expectedFailedFact: "durationEnding",
      expectedMechanicsPath: spellDurationEndingPath(
        CONTINUAL_FLAME_SECOND_DURATION_ENDING_ORDINAL,
      ),
    },
  ] as const;

  test.each(registryIssueScenarios)(
    "complete registry retains the singleton $label issue",
    ({
      spellId,
      update,
      expectedProcedure,
      expectedFailedFact,
      expectedMechanicsPath,
    }) => {
      const result = admitRegisteredSpellProcedureMechanics(
        registryMechanicsSource(spellId, update),
      );
      expect(result.tag).toBe("rejected");
      if (result.tag !== "rejected") return;
      expect(result.issues).toHaveLength(1);
      expect(
        result.issues.map(({ procedure, failedFact, mechanicsPath }) => ({
          procedure,
          failedFact,
          mechanicsPath,
        })),
      ).toEqual([
        {
          procedure: expectedProcedure,
          failedFact: expectedFailedFact,
          mechanicsPath: expectedMechanicsPath,
        },
      ]);
    },
  );
});
