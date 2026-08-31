import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { NonNegativeInteger } from "@dnd/shared/types";

import {
  battleExecutionScopeOrdinal,
  battleId,
  battleStatBlockExecutionScopeRef,
  battleStatBlockProcedureExecutionRef,
  combatantId,
} from "./identity.ts";
import {
  MechanicalSupportedAttackActionOptionSchema,
  SupportedAttackActionOptionSchema,
} from "./battle-reducer/codec-building-blocks.ts";
import { projectMechanicalAttackActionOption } from "./battle-mechanical-attack-options.ts";
import type { SupportedAttackActionOption } from "./battle-action-options.ts";

const syntheticStatBlockProcedureRef = battleStatBlockProcedureExecutionRef(
  battleStatBlockExecutionScopeRef(
    battleId("synthetic-battle"),
    combatantId("synthetic-attacker"),
    battleExecutionScopeOrdinal(NonNegativeInteger(0)),
  ),
  NonNegativeInteger(0),
);

const weaponAttack = {
  kind: "weapon" as const,
  weapon: {
    weaponUnitId: "synthetic-weapon",
    category: "simple" as const,
    usage: "melee" as const,
    damage: {
      kind: "dice" as const,
      dice: 1,
      dieSize: 6,
      damageType: "slashing" as const,
    },
    properties: [],
    masteryProperty: "graze" as const,
    costGp: 1,
  },
  weaponObjectId: "synthetic-weapon-object",
  ability: "str" as const,
  abilityModifier: 2,
  attackBonus: 4,
  damageAbilityModifier: 2,
  damageBonus: 1,
  damageTypeChoices: ["slashing", "piercing"] as const,
  alternateAbilityChoices: [
    {
      ability: "dex" as const,
      abilityModifier: 3,
      attackBonus: 5,
      damageAbilityModifier: 3,
    },
  ],
};

const unarmedStrikeAttack = {
  kind: "unarmedStrike" as const,
  effect: {
    kind: "damage" as const,
    damage: {
      kind: "mechanicalReplacement" as const,
      dice: 1 as const,
      dieSize: 6 as const,
      damageType: "bludgeoning" as const,
    },
  },
  attackAbility: "str" as const,
  attackAbilityModifier: 2,
  attackBonus: 3,
  damageAbilityModifier: 2,
  damageBonus: 1,
};

const weaponAttackWithDamageModifierChoice = {
  ...weaponAttack,
  attackDamageAbilityModifierChoice: {
    procedureRefs: [syntheticStatBlockProcedureRef],
    appliedDamageAbilityModifier: 2,
    declinedDamageAbilityModifier: 0,
  },
};

const weaponAttackWithAlternateDamageModifierChoice = {
  ...weaponAttack,
  alternateAbilityChoices: [
    {
      ability: "dex" as const,
      abilityModifier: 3,
      attackBonus: 5,
      damageAbilityModifier: 3,
      attackDamageAbilityModifierChoice: {
        procedureRefs: [syntheticStatBlockProcedureRef],
        appliedDamageAbilityModifier: 3,
        declinedDamageAbilityModifier: 0,
      },
    },
  ],
};

const baseUnarmedStrikeAttack = {
  ...unarmedStrikeAttack,
  effect: {
    kind: "damage" as const,
    damage: {
      kind: "base" as const,
      damageType: "bludgeoning" as const,
      flat: 1 as const,
    },
  },
};

const procedureReplacementUnarmedStrikeAttack = {
  ...unarmedStrikeAttack,
  effect: {
    kind: "damage" as const,
    damage: {
      kind: "procedureReplacement" as const,
      sourceProcedureRef: syntheticStatBlockProcedureRef,
      dice: 1 as const,
      dieSize: 6 as const,
      damageType: "bludgeoning" as const,
    },
  },
};

const staticStatBlockAttack = {
  kind: "statBlockAttack" as const,
  procedureRef: syntheticStatBlockProcedureRef,
  attack: {
    attackAbility: "str" as const,
    attackBonus: { kind: "literal" as const, value: 4 },
    attackType: "melee" as const,
    reachFeet: 5,
    onHit: [
      {
        kind: "damage" as const,
        damageType: "piercing" as const,
        amount: {
          kind: "fixed" as const,
          expr: { dice: 1, dieSize: 6 },
          static: 4,
        },
      },
      {
        kind: "apply_condition_if_target_size_at_most" as const,
        condition: "prone" as const,
        maxCreatureSize: "large" as const,
      },
    ],
  },
  damageNotation: "static" as const,
};

const rolledRangedStatBlockAttack = {
  kind: "statBlockAttack" as const,
  procedureRef: syntheticStatBlockProcedureRef,
  attack: {
    attackAbility: "dex" as const,
    attackBonus: { kind: "literal" as const, value: 4 },
    attackType: "ranged" as const,
    rangeFeet: { normal: 30, long: 120 },
    onHit: [
      {
        kind: "damage" as const,
        damageType: "piercing" as const,
        amount: {
          kind: "fixed" as const,
          expr: { dice: 1, dieSize: 8 },
        },
      },
      {
        kind: "conditional_bonus_damage" as const,
        when: { kind: "attack_roll_had_advantage" as const },
        damageType: "piercing" as const,
        amount: {
          kind: "fixed" as const,
          expr: { dice: 1, dieSize: 6 },
        },
      },
    ],
  },
  damageNotation: "rolled" as const,
};

function decodeSupportedAttack(input: unknown): SupportedAttackActionOption {
  const decoded = Schema.decodeUnknownResult(SupportedAttackActionOptionSchema)(
    input,
  );
  if (Result.isFailure(decoded)) {
    throw new Error(`Expected an admitted attack option: ${decoded.failure}`);
  }
  return decoded.success;
}

type JsonObject = { readonly [key: string]: unknown };

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recursivelyCollectedPropertyNames(value: unknown): readonly string[] {
  const names: string[] = [];
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!isJsonObject(current)) return;
    const properties = current.properties;
    if (isJsonObject(properties)) {
      Object.entries(properties).forEach(([name, schema]) => {
        names.push(name);
        visit(schema);
      });
    }
    Object.entries(current).forEach(([key, child]) => {
      if (key !== "properties") visit(child);
    });
  };
  visit(value);
  return names;
}

function recursivelyFindPropertySchemas(
  value: unknown,
  propertyName: string,
): readonly JsonObject[] {
  const found: JsonObject[] = [];
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!isJsonObject(current)) return;
    const properties = current.properties;
    if (isJsonObject(properties) && propertyName in properties) {
      const property = properties[propertyName];
      if (isJsonObject(property)) found.push(property);
    }
    Object.entries(current).forEach(([key, child]) => {
      if (key !== "properties") visit(child);
    });
  };
  visit(value);
  return found;
}

describe("mechanical attack option projection", () => {
  test("projects each admitted attack option into its strict execution shape", () => {
    const projectedWeapon = projectMechanicalAttackActionOption(
      decodeSupportedAttack(weaponAttack),
    );
    expect(projectedWeapon).toEqual({
      kind: "weapon",
      weapon: {
        category: "simple",
        usage: "melee",
        damage: {
          kind: "dice",
          dice: 1,
          dieSize: 6,
          damageType: "slashing",
        },
        properties: [],
        masteryProperty: "graze",
        costGp: 1,
      },
      weaponObjectId: "synthetic-weapon-object",
      ability: "str",
      abilityModifier: 2,
      attackBonus: 4,
      damageAbilityModifier: 2,
      damageBonus: 1,
      damageTypeChoices: ["slashing", "piercing"],
      alternateAbilityChoices: [
        {
          ability: "dex",
          abilityModifier: 3,
          attackBonus: 5,
          damageAbilityModifier: 3,
        },
      ],
    });

    expect(
      projectMechanicalAttackActionOption(
        decodeSupportedAttack(weaponAttackWithDamageModifierChoice),
      ),
    ).toEqual({
      ...projectedWeapon,
      attackDamageAbilityModifierChoice: {
        procedureRefs: [syntheticStatBlockProcedureRef],
        appliedDamageAbilityModifier: 2,
        declinedDamageAbilityModifier: 0,
      },
    });

    expect(
      projectMechanicalAttackActionOption(
        decodeSupportedAttack(weaponAttackWithAlternateDamageModifierChoice),
      ),
    ).toEqual({
      ...projectedWeapon,
      alternateAbilityChoices: [
        {
          ability: "dex",
          abilityModifier: 3,
          attackBonus: 5,
          damageAbilityModifier: 3,
          attackDamageAbilityModifierChoice: {
            procedureRefs: [syntheticStatBlockProcedureRef],
            appliedDamageAbilityModifier: 3,
            declinedDamageAbilityModifier: 0,
          },
        },
      ],
    });

    expect(
      projectMechanicalAttackActionOption(
        decodeSupportedAttack(unarmedStrikeAttack),
      ),
    ).toEqual({
      kind: "unarmedStrike",
      effect: {
        kind: "damage",
        damage: {
          kind: "mechanicalReplacement",
          dice: 1,
          dieSize: 6,
          damageType: "bludgeoning",
        },
      },
      attackAbility: "str",
      attackAbilityModifier: 2,
      attackBonus: 3,
      damageAbilityModifier: 2,
      damageBonus: 1,
    });

    expect(
      projectMechanicalAttackActionOption(
        decodeSupportedAttack(baseUnarmedStrikeAttack),
      ),
    ).toEqual({
      kind: "unarmedStrike",
      effect: {
        kind: "damage",
        damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
      },
      attackAbility: "str",
      attackAbilityModifier: 2,
      attackBonus: 3,
      damageAbilityModifier: 2,
      damageBonus: 1,
    });

    expect(
      projectMechanicalAttackActionOption(
        decodeSupportedAttack(procedureReplacementUnarmedStrikeAttack),
      ),
    ).toEqual({
      kind: "unarmedStrike",
      effect: {
        kind: "damage",
        damage: {
          kind: "procedureReplacement",
          sourceProcedureRef: syntheticStatBlockProcedureRef,
          dice: 1,
          dieSize: 6,
          damageType: "bludgeoning",
        },
      },
      attackAbility: "str",
      attackAbilityModifier: 2,
      attackBonus: 3,
      damageAbilityModifier: 2,
      damageBonus: 1,
    });

    expect(
      projectMechanicalAttackActionOption(
        decodeSupportedAttack(staticStatBlockAttack),
      ),
    ).toEqual({
      kind: "statBlockAttack",
      procedureRef: syntheticStatBlockProcedureRef,
      attack: {
        attackAbility: "str",
        attackBonus: { kind: "literal", value: 4 },
        attackType: "melee",
        reachFeet: 5,
        onHit: [
          {
            kind: "damage",
            damageType: "piercing",
            amount: {
              kind: "fixed",
              expr: { dice: 1, dieSize: 6 },
              static: 4,
            },
          },
          {
            kind: "apply_condition_if_target_size_at_most",
            condition: "prone",
            maxCreatureSize: "large",
          },
        ],
      },
      damageNotation: "static",
    });

    expect(
      projectMechanicalAttackActionOption(
        decodeSupportedAttack(rolledRangedStatBlockAttack),
      ),
    ).toEqual({
      kind: "statBlockAttack",
      procedureRef: syntheticStatBlockProcedureRef,
      attack: {
        attackAbility: "dex",
        attackBonus: { kind: "literal", value: 4 },
        attackType: "ranged",
        rangeFeet: { normal: 30, long: 120 },
        onHit: [
          {
            kind: "damage",
            damageType: "piercing",
            amount: { kind: "fixed", expr: { dice: 1, dieSize: 8 } },
          },
          {
            kind: "conditional_bonus_damage",
            when: { kind: "attack_roll_had_advantage" },
            damageType: "piercing",
            amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
          },
        ],
      },
      damageNotation: "rolled",
    });
  });

  test("does not publish authored identity or presentation properties", () => {
    const document = Schema.toJsonSchemaDocument(
      MechanicalSupportedAttackActionOptionSchema,
    );
    const schema = { ...document.schema, $defs: document.definitions };
    const propertyNames = new Set(recursivelyCollectedPropertyNames(schema));

    for (const forbidden of [
      "label",
      "displayName",
      "id",
      "optionId",
      "weaponUnitId",
    ]) {
      expect(propertyNames.has(forbidden), forbidden).toBe(false);
    }
    expect(propertyNames.has("procedureRef")).toBe(true);
    expect(propertyNames.has("weaponObjectId")).toBe(true);
    expect(propertyNames.has("damageType")).toBe(true);
  });

  test("publishes two-or-more damage type choices structurally", () => {
    const document = Schema.toJsonSchemaDocument(
      MechanicalSupportedAttackActionOptionSchema,
    );
    const schema = { ...document.schema, $defs: document.definitions };
    const choicesSchemas = recursivelyFindPropertySchemas(
      schema,
      "damageTypeChoices",
    );

    expect(choicesSchemas.length).toBeGreaterThan(0);
    for (const choicesSchema of choicesSchemas) {
      expect(choicesSchema.minItems).toBe(2);
    }
  });

  test("rejects authored and presentation properties with strict decoding", () => {
    const invalidInputs = [
      { ...unarmedStrikeAttack, label: "synthetic presentation" },
      {
        ...unarmedStrikeAttack,
        effect: {
          ...unarmedStrikeAttack.effect,
          damage: {
            ...unarmedStrikeAttack.effect.damage,
            displayName: "synthetic presentation",
          },
        },
      },
      {
        ...weaponAttack,
        weapon: { ...weaponAttack.weapon, weaponUnitId: "authored identity" },
      },
      { ...unarmedStrikeAttack, id: "authored identity" },
      {
        ...weaponAttack,
        damageTypeChoices: ["slashing"],
      },
    ];

    for (const invalidInput of invalidInputs) {
      expect(
        Result.isFailure(
          Schema.decodeUnknownResult(
            MechanicalSupportedAttackActionOptionSchema,
          )(invalidInput),
        ),
      ).toBe(true);
    }
  });
});
