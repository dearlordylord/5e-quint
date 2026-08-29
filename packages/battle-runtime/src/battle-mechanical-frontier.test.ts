import { Either, JSONSchema, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { damageAmount, NonNegativeInteger } from "@dnd/shared/types";

import {
  BattleMechanicalFrontierSchema,
  battleMechanicalFrontier,
  BattleMechanicalHoleSchema,
  BattleMechanicalInterruptChoiceSchema,
  BattleMechanicalInterruptDecisionHoleSchema,
  BattleMechanicalOrdinaryHoleSchema,
} from "./battle-mechanical-frontier.ts";
import { BattleHoleSchema } from "./battle-reducer/battle-codecs.ts";
import {
  combatantId,
  attackTargetFill,
  battleActiveEffectExecutionRefForTest,
  battleId,
  fighterAttackSubject,
  fighterVsGoblinBattle,
  holeId,
  holeInstanceKey,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  battleExecutionScopeOrdinal,
  battleProcedureExecutionRef,
  battleStatBlockExecutionScopeRef,
} from "./identity.ts";
import { battleReplayStackDepth } from "./identity.ts";
import type {
  BattleHole,
  BattleInterruptDecisionHole,
  BattleInterruptProcedureChoice,
} from "./battle-state-execution.ts";

const mechanicalHole = {
  holeInstanceKey: "mechanical-frontier-instance",
  holeId: "mechanical-frontier-hole",
  kind: "abilityCheck" as const,
  ability: "dex" as const,
  skill: "stealth" as const,
  dc: 12,
};

const mechanicalInterruptHole = {
  holeInstanceKey: "mechanical-frontier-interrupt-instance",
  holeId: "mechanical-frontier-interrupt-hole",
  kind: "interruptDecision" as const,
  trigger: "afterDamage" as const,
  eligibleResponders: ["reactor-id"],
};

const mechanicalNestedHole = {
  ...mechanicalHole,
  d20TestNaturalOneRerolls: [
    { effectKind: "d20_test_natural_one_reroll" as const },
  ],
};

const mechanicalInterruptChoice = {
  kind: "nestedProcedure" as const,
  subject: {
    tag: "runtimeCommand" as const,
    actorId: "reactor-id",
    command: "releaseReadiedAction" as const,
    reactorId: "reactor-id",
  },
  initialHoles: [mechanicalNestedHole],
};

const runtimeInterruptResponderId = combatantId("mechanical-frontier-reactor");

const runtimeInterruptDecisionHole = {
  holeInstanceKey: holeInstanceKey("mechanical-frontier-decision-instance"),
  holeId: holeId("mechanical-frontier-decision-hole"),
  kind: "interruptDecision" as const,
  label: "After damage interrupt decision",
  trigger: "afterDamage" as const,
  eligibleResponders: [runtimeInterruptResponderId],
} satisfies BattleInterruptDecisionHole;

const runtimeInterruptChoice = {
  kind: "nestedProcedure" as const,
  subject: {
    tag: "runtimeCommand" as const,
    actorId: runtimeInterruptResponderId,
    command: "releaseReadiedAction" as const,
    reactorId: runtimeInterruptResponderId,
  },
  initialHoles: [],
} satisfies Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "nestedProcedure" }
>;

const decodeBattleHole = Schema.decodeUnknownSync(BattleHoleSchema);
const projectionResponderId = combatantId("projection-responder");
const projectionProcedureRef = battleProcedureExecutionRef(
  battleStatBlockExecutionScopeRef(
    battleId("mechanical-frontier-battle"),
    projectionResponderId,
    battleExecutionScopeOrdinal(0),
  ),
  NonNegativeInteger(0),
);
const projectionEffectRef = battleActiveEffectExecutionRefForTest(
  "mechanical-frontier-effect",
);
const projectionFormExecutionRef = battleStatBlockExecutionScopeRef(
  battleId("mechanical-frontier-battle"),
  combatantId("mechanical-frontier-actor"),
  battleExecutionScopeOrdinal(0),
);
const projectionReactionModifierChoice = {
  kind: "reactionModifier" as const,
  responderId: projectionResponderId,
  modifier: {
    kind: "fallDamageReduction" as const,
    procedureRef: projectionProcedureRef,
    reduction: { kind: "flat" as const, amount: damageAmount(2) },
  },
  initialHoles: [],
} satisfies Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "reactionModifier" }
>;
const projectionBase = {
  holeInstanceKey: "mechanical-frontier-projection-instance",
  holeId: "mechanical-frontier-projection-hole",
  label: "presentation-only label",
} as const;

function projectionHole(kind: string, fields: object = {}): BattleHole {
  return decodeBattleHole({
    ...projectionBase,
    holeInstanceKey: `${projectionBase.holeInstanceKey}-${kind}`,
    holeId: `${projectionBase.holeId}-${kind}`,
    kind,
    ...fields,
  });
}

const projectionNestedReroll = {
  effectKind: "d20_test_natural_one_reroll",
  label: "reroll presentation label",
} as const;

const projectionAttackRollWithD20 = {
  ...projectionHole("attackRoll", {
    holeInstanceKey: `${projectionBase.holeInstanceKey}-attackRoll-with-d20`,
    holeId: `${projectionBase.holeId}-attackRoll-with-d20`,
    sourceProcedureRef: projectionProcedureRef,
    attackBonus: 4,
    spellAttackRerolls: [
      {
        effectKind: "missed_spell_attack_reroll",
        sorceryPointCost: 1,
        label: "spell reroll presentation label",
      },
    ],
  }),
  d20TestNaturalOneRerolls: [projectionNestedReroll],
};

const projectionSpellDamageRerolls = [
  {
    effectKind: "damage_dice_reroll" as const,
    sorceryPointCost: 1,
    maximumSelectedDice: 1,
    label: "damage reroll presentation label",
  },
] as const;

const projectionRolledDiceWithSpellDamageRerolls = {
  ...projectionHole("rolledDice", {
    holeInstanceKey: `${projectionBase.holeInstanceKey}-rolledDice-with-rerolls`,
    holeId: `${projectionBase.holeId}-rolledDice-with-rerolls`,
    critical: false,
    sourceProcedureRef: projectionProcedureRef,
  }),
  spellDamageRerolls: projectionSpellDamageRerolls,
};

const projectionHoles = [
  projectionHole("abilityCheck", {
    ability: "dex",
    skill: "stealth",
    dc: 12,
    d20TestNaturalOneRerolls: [projectionNestedReroll],
  }),
  projectionHole("abilityChoice", {
    sourceProcedureRef: projectionProcedureRef,
    choices: ["dex"],
  }),
  projectionHole("readyDeclaration", {
    actorId: "projection-actor",
    responseChoices: [],
  }),
  projectionHole("attackDamageDisposition", {
    attackerId: "projection-attacker",
    targetId: "projection-target",
    choices: [],
  }),
  projectionHole("attackRoll", {
    sourceProcedureRef: projectionProcedureRef,
    attackBonus: 4,
    spellAttackRerolls: [
      {
        effectKind: "missed_spell_attack_reroll",
        sorceryPointCost: 1,
        label: "spell reroll presentation label",
      },
    ],
  }),
  projectionAttackRollWithD20,
  projectionHole("commandOptionChoice", {
    sourceProcedureRef: projectionProcedureRef,
    choices: ["approach"],
  }),
  projectionHole("companionReappearanceInitiative", {
    ownerId: "projection-owner",
  }),
  projectionHole("companionReappearancePlacement", {
    ownerId: "projection-owner",
  }),
  projectionHole("concentrationSavingThrow", {
    combatantId: "projection-actor",
    dc: 10,
    damageAmount: 5,
    targetFlatBonuses: [],
  }),
  projectionHole("conditionChoice", {
    sourceProcedureRef: projectionProcedureRef,
    choices: ["blinded"],
  }),
  projectionHole("cunningStrikeEndTurnCoverFacts", {
    actorId: "projection-actor",
    coverDegrees: ["none"],
  }),
  projectionHole("damageRelationshipDecisions", {
    damageEventHoleId: "projection-damage-event",
    damageSourceId: "projection-source",
    questions: [
      {
        kind: "targetDamagedByCasterOrAlly",
        questionId: "projection-question",
        targetId: "projection-target",
        effectSourceId: "projection-source",
      },
    ],
  }),
  projectionHole("damageTypeChoice", {
    sourceProcedureRef: projectionProcedureRef,
    choices: ["fire"],
  }),
  projectionHole("dancingLightsPlacement", {
    sourceProcedureRef: projectionProcedureRef,
    mode: "cast",
    form: "separateLights",
    activeLightIds: [],
    rangeFeet: 120,
    maxMoveFeet: 60,
    spacingFeet: 20,
    requiresTableSpatialFact: true,
  }),
  projectionHole("deathSavingThrow", {
    combatantId: "projection-actor",
  }),
  projectionHole("findFamiliarConnection", {
    ownerId: "projection-owner",
    companionId: "projection-companion",
    rangeFeet: 100,
    requiresTableSpatialFact: true,
  }),
  projectionHole("grappleOutcome", {
    actorId: "projection-actor",
    targetId: "projection-target",
    dc: 12,
    mode: "grappleSave",
  }),
  projectionHole("gustOfWindLineDirectionChoice", {
    sourceCombatantId: "projection-actor",
    sourceProcedureRef: projectionProcedureRef,
    areaId: "projection-area",
    directionId: "projection-direction",
    requiresTableSpatialFact: true,
  }),
  projectionHole("heldObjectFacts", {
    actorId: "projection-actor",
  }),
  projectionHole("helpAttackAllyDecision", {
    helperId: "projection-helper",
    choices: [],
  }),
  projectionHole("helpAttackEnemyDecision", {
    helperId: "projection-helper",
    allyId: "projection-ally",
    choices: [],
  }),
  projectionHole("hitPointHealingDistribution", {
    requiresTableSpatialFact: true,
    healingPool: {
      sourceCombatantId: "projection-source",
      sourceProcedureRef: projectionProcedureRef,
      rangeFeet: 60,
      poolHitPoints: 5,
      perTargetCap: "halfHitPointMaximum",
    },
    choices: [],
  }),
  projectionHole("levitateAltitudeChange", {
    actorId: "projection-actor",
    targetId: "projection-target",
    maxDistanceFeet: 20,
    directions: ["up"],
    requiresTargetWithinRangeFact: true,
  }),
  projectionHole("levitateInitialRise", {
    actorId: "projection-actor",
    targetId: "projection-target",
    maxDistanceFeet: 20,
  }),
  projectionHole("magicWeaponTargetItem", {
    sourceProcedureRef: projectionProcedureRef,
    requiresTableItemFact: true,
  }),
  projectionHole("movableZoneRamMovement", {
    movableZone: {
      sourceCombatantId: "projection-source",
      sourceProcedureRef: projectionProcedureRef,
      targetId: "projection-target",
      areaId: "projection-area",
      maxMoveFeet: 20,
    },
    requiresTableSpatialFact: true,
  }),
  projectionHole("movableZoneRepositionMovement", {
    movableZone: {
      sourceProcedureRef: projectionProcedureRef,
      sourceCombatantId: "projection-source",
      areaId: "projection-area",
      maxMoveFeet: 20,
    },
    requiresTableSpatialFact: true,
  }),
  projectionHole("movement", {
    actorId: "projection-actor",
    movementBudgetFeet: 30,
    speedKinds: [],
  }),
  projectionHole("objectContactTargets", {
    objectContact: {
      sourceCombatantId: "projection-source",
      sourceProcedureRef: projectionProcedureRef,
      objectId: "projection-object",
      rangeFeet: 30,
      requiresObjectWithinRange: true,
    },
    choices: [],
    requiresTableSpatialFact: true,
  }),
  projectionHole("objectDropResolution", {
    objectDrop: {
      sourceCombatantId: "projection-source",
      sourceProcedureRef: projectionProcedureRef,
      objectId: "projection-object",
      targetIds: [],
    },
  }),
  projectionHole("objectTargetChoice", {
    sourceProcedureRef: projectionProcedureRef,
    requiresTableSpatialFact: true,
  }),
  projectionHole("ongoingSpellTargetChoice", {
    requiresTableSpatialFact: true,
    casterId: "projection-caster",
    procedureRef: projectionProcedureRef,
    rangeFeet: 60,
    choices: [],
  }),
  projectionRolledDiceWithSpellDamageRerolls,
  projectionHole("rolledDice", {
    sourceProcedureRef: projectionProcedureRef,
  }),
  projectionHole("sanctuaryInterdictionOutcome", {
    sourceProcedureRef: projectionProcedureRef,
    triggeringProcedureRef: projectionProcedureRef,
    sourceCombatantId: "projection-source",
    wardedCombatantId: "projection-warded",
    triggeringCombatantId: "projection-trigger",
    triggeringTargetEventId: "projection-event",
    ability: "wis",
    dc: { kind: "fixed", dc: 12 },
    choices: [],
    replacementTargetKind: "attackRoll",
  }),
  projectionHole("savingThrowOutcome", {
    outcomeTargeting: "singleTarget",
    sourceProcedureRef: projectionProcedureRef,
    ability: "dex",
    dc: { kind: "fixed", dc: 12 },
    areaChoices: [],
    targetRollModes: [],
    targetFlatBonuses: [],
    targetIds: ["projection-target"],
    d20TestNaturalOneRerolls: [projectionNestedReroll],
  }),
  projectionHole("savingThrowOutcome", {
    outcomeTargeting: "singleTarget",
    sourceProcedureRef: projectionProcedureRef,
    ability: "dex",
    dc: { kind: "fixed", dc: 12 },
    areaChoices: [],
    targetRollModes: [],
    targetFlatBonuses: [],
    targetIds: ["projection-target"],
  }),
  projectionHole("selfTransformationModeChoice", {
    sourceProcedureRef: projectionProcedureRef,
    choices: ["naturalWeapons"],
  }),
  projectionHole("shoveOutcome", {
    actorId: "projection-actor",
    targetId: "projection-target",
    dc: 12,
  }),
  projectionHole("slowSomaticSpellFailureOutcome", {
    actorId: "projection-actor",
    sourceProcedureRef: projectionProcedureRef,
    failurePercent: 25,
    activeEffectSources: [],
  }),
  projectionHole("skillChoice", {
    sourceProcedureRef: projectionProcedureRef,
    choices: ["stealth"],
  }),
  projectionHole("spellAreaChoice", {
    sourceProcedureRef: projectionProcedureRef,
    area: { kind: "pointOriginSphere", radiusFeet: 20 },
  }),
  projectionHole("spellTargetAllocation", {
    sourceProcedureRef: projectionProcedureRef,
    allocationCount: 1,
    choices: [],
    requiresTableSpatialFact: true,
    spellTargetSpatialFactRequest: {
      casterId: "projection-caster",
      sourceProcedureRef: projectionProcedureRef,
      rangeFeet: 60,
      visibility: "requiresSight",
    },
  }),
  projectionHole("spellTargetList", {
    sourceProcedureRef: projectionProcedureRef,
    minTargets: 1,
    maxTargets: 1,
    spatialTargeting: { kind: "individualTargets" },
    choices: [],
    requiresTableSpatialFact: true,
  }),
  projectionHole("spellcastingAbilityCheck", {
    dc: 12,
    spellcastingAbilityCheck: {
      casterId: "projection-caster",
      sourceProcedureRef: projectionProcedureRef,
      target: { kind: "combatant", combatantId: "projection-target" },
      effect: {
        kind: "spellActiveEffect",
        activeEffectKind: "spiritualWeapon",
        effectRef: projectionEffectRef,
      },
      contestedSpellLevel: 1,
    },
  }),
  projectionHole("spiritualWeaponForcePosition", {
    sourceProcedureRef: projectionProcedureRef,
    mode: "cast",
    maxDistanceFeet: 60,
    requiresTableSpatialFact: true,
  }),
  projectionHole("statBlockRechargeRoll", {
    combatantId: "projection-actor",
    rechargeTargets: [],
  }),
  projectionHole("targetAbilityChoices", {
    sourceProcedureRef: projectionProcedureRef,
    choices: ["dex"],
  }),
  projectionHole("targetChoice", {
    choices: [],
  }),
  projectionHole("targetSpatialFacts", {
    spellBeingCast: {
      casterId: "projection-caster",
      sourceProcedureRef: projectionProcedureRef,
      castLevel: 1,
      components: [],
    },
    requiresTableSpatialFact: true,
  }),
  projectionHole("teleportDestination", {
    sourceProcedureRef: projectionProcedureRef,
    actorId: "projection-actor",
    maxDistanceFeet: 30,
    requiresTableSpatialFact: true,
  }),
  projectionHole("thaumaturgyActiveOneMinuteEffectCount", {
    sourceProcedureRef: projectionProcedureRef,
    maximumActiveOneMinuteEffects: 3,
    requiresTableSpellEffectCount: true,
  }),
  projectionHole("toolPossessionFacts", {
    actorId: "projection-actor",
    toolIds: ["poisoners_kit"],
  }),
  projectionHole("unitFeatureDecision", {
    choices: ["use", "decline"],
  }),
  projectionHole("wildShapeEquipmentDisposition", {
    actorId: "projection-actor",
    formExecutionRef: projectionFormExecutionRef,
    candidates: [],
  }),
] as const;

type NeedsHolesResult = Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "needsHoles" }
>;

type JsonObject = { readonly [key: string]: unknown };

type JsonSchemaProperty = {
  readonly path: string;
  readonly schema: JsonObject;
};

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recursivelyFindPropertySchemas(
  value: unknown,
  propertyName: string,
): readonly JsonSchemaProperty[] {
  const found: JsonSchemaProperty[] = [];
  const visit = (current: unknown, path: string): void => {
    if (Array.isArray(current)) {
      current.forEach((child, index) => visit(child, `${path}/${index}`));
      return;
    }
    if (!isJsonObject(current)) return;
    const properties = current.properties;
    if (isJsonObject(properties)) {
      Object.entries(properties).forEach(([name, schema]) => {
        const propertyPath = `${path}/properties/${name}`;
        if (name === propertyName && isJsonObject(schema)) {
          found.push({ path: propertyPath, schema });
        }
        visit(schema, propertyPath);
      });
    }
    Object.entries(current).forEach(([key, child]) => {
      if (key !== "properties") visit(child, `${path}/${key}`);
    });
  };
  visit(value, "#");
  return found;
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

function ordinaryNeedsHolesResult(): NeedsHolesResult {
  const state = fighterVsGoblinBattle();
  const result = resolveBattleSubject({
    state,
    subject: fighterAttackSubject(state),
    fills: [],
  });
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ordinary needsHoles result, got ${result.tag}.`);
  }
  return result;
}

function frontierInput(
  result: NeedsHolesResult,
  holes: readonly BattleHole[] = result.holes,
) {
  return {
    result: {
      kind: "holes" as const,
      subject: result.subject,
      holes,
    },
    acceptedFills: [],
  };
}

describe("battle mechanical frontier", () => {
  test("round-trips a presentation-free mechanical hole", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)(
      mechanicalHole,
    );

    expect(Either.isRight(decoded)).toBe(true);
    expect(decoded).toMatchObject({ right: mechanicalHole });
    expect(JSON.stringify(decoded)).not.toContain("label");
  });

  test("rejects presentation fields at the mechanical boundary", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)({
      ...mechanicalHole,
      label: "must not cross the boundary",
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("accepts recursively mechanical nested options without presentation labels", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)(
      mechanicalNestedHole,
    );

    expect(Either.isRight(decoded)).toBe(true);
    expect(decoded).toMatchObject({ right: mechanicalNestedHole });
    expect(JSON.stringify(decoded)).not.toContain("label");
  });

  test("rejects presentation labels inside recursively mechanical nested options", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)({
      ...mechanicalNestedHole,
      d20TestNaturalOneRerolls: [
        {
          ...mechanicalNestedHole.d20TestNaturalOneRerolls[0],
          label: "must not cross the boundary",
        },
      ],
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("accepts interrupt choices with recursively mechanical initial holes", () => {
    const decoded = Schema.decodeUnknownEither(
      BattleMechanicalInterruptChoiceSchema,
    )(mechanicalInterruptChoice);

    expect(Either.isRight(decoded)).toBe(true);
    expect(decoded).toMatchObject({ right: mechanicalInterruptChoice });
    expect(JSON.stringify(decoded)).not.toContain("label");
  });

  test("rejects presentation labels in interrupt choice initial holes", () => {
    const decoded = Schema.decodeUnknownEither(
      BattleMechanicalInterruptChoiceSchema,
    )({
      ...mechanicalInterruptChoice,
      initialHoles: [
        {
          ...mechanicalNestedHole,
          d20TestNaturalOneRerolls: [
            {
              ...mechanicalNestedHole.d20TestNaturalOneRerolls[0],
              label: "must not cross the boundary",
            },
          ],
        },
      ],
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("keeps ordinary and interrupt hole schemas structurally exclusive", () => {
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleMechanicalOrdinaryHoleSchema)(
          mechanicalHole,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalOrdinaryHoleSchema)(
          mechanicalInterruptHole,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleMechanicalInterruptDecisionHoleSchema)(
          mechanicalInterruptHole,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalInterruptDecisionHoleSchema)(
          mechanicalHole,
        ),
      ),
    ).toBe(true);
  });

  test("keeps ordinary and interrupt frontier branches structurally exclusive", () => {
    const ordinaryFrontier = {
      kind: "ordinaryHoles" as const,
      subject: {
        tag: "runtimeCommand" as const,
        actorId: "actor-id",
        command: "endTurn" as const,
      },
      holes: [mechanicalHole],
      acceptedFills: [],
    };
    const interruptFrontier = {
      kind: "interruptDecision" as const,
      decisionHole: mechanicalInterruptHole,
      choices: [mechanicalInterruptChoice],
    };

    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)(
          ordinaryFrontier,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)(
          interruptFrontier,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)({
          ...ordinaryFrontier,
          holes: [mechanicalInterruptHole],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)({
          ...interruptFrontier,
          decisionHole: mechanicalHole,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)({
          ...ordinaryFrontier,
          label: "presentation must not cross the boundary",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)({
          ...interruptFrontier,
          unknown: true,
        }),
      ),
    ).toBe(true);
  });

  test("keeps removed presentation sentinels out of the mechanical frontier schema", () => {
    const schema = JSONSchema.make(BattleMechanicalFrontierSchema, {
      target: "jsonSchema2020-12",
    });
    const propertyNames = new Set(recursivelyCollectedPropertyNames(schema));
    expect(propertyNames.has("label")).toBe(false);

    const holePaths = (propertyName: string) =>
      recursivelyFindPropertySchemas(schema, propertyName).filter(({ path }) =>
        path.includes("/properties/holes/items/"),
      );
    for (const propertyName of [
      "ongoingFeatureActivations",
      "missToHitReplacements",
    ]) {
      const nestedSchemas = holePaths(propertyName);
      expect(nestedSchemas.length, propertyName).toBeGreaterThan(0);
      for (const { schema: propertySchema } of nestedSchemas) {
        expect(
          recursivelyCollectedPropertyNames(propertySchema.items),
        ).not.toEqual(expect.arrayContaining(["label", "unitId"]));
      }
    }

    const attackDamageChoiceSchemas = holePaths(
      "attackDamageAbilityModifierChoice",
    );
    expect(attackDamageChoiceSchemas.length).toBeGreaterThan(0);
    for (const { schema: propertySchema } of attackDamageChoiceSchemas) {
      expect(recursivelyCollectedPropertyNames(propertySchema)).not.toContain(
        "unitIds",
      );
    }

    const reactionModifierSchemas = recursivelyFindPropertySchemas(
      schema,
      "modifier",
    ).filter(({ path }) =>
      path.includes("/properties/choices/items/anyOf/1/properties/modifier"),
    );
    expect(reactionModifierSchemas.length).toBeGreaterThan(0);
    for (const { schema: propertySchema } of reactionModifierSchemas) {
      expect(recursivelyCollectedPropertyNames(propertySchema)).not.toEqual(
        expect.arrayContaining(["label", "resourceUnitId"]),
      );
    }

    // Cunning Strike optionId is a fixed mechanical selection id, not presentation.
    expect(propertyNames.has("optionId")).toBe(true);
  });

  test("projects an ordinary frontier without a pending interrupt", () => {
    const result = ordinaryNeedsHolesResult();

    const frontier = battleMechanicalFrontier(frontierInput(result));

    expect(Either.isRight(frontier)).toBe(true);
    if (Either.isLeft(frontier)) {
      throw new Error("Expected an ordinary mechanical frontier.");
    }
    if (frontier.right.kind !== "ordinaryHoles") {
      throw new Error("Expected an ordinary mechanical frontier.");
    }
    expect(frontier.right.holes).toHaveLength(result.holes.length);
    expect(frontier.right.acceptedFills).toEqual([]);
  });

  test("accepts the narrow continuation facts exposed by Runtime resolution", () => {
    const result = ordinaryNeedsHolesResult();
    const frontier = battleMechanicalFrontier({
      result: {
        kind: "holes",
        subject: result.subject,
        holes: result.holes,
      },
      acceptedFills: [],
    });

    expect(Either.isRight(frontier)).toBe(true);
  });

  test("projects attack frontiers without presentation or authored weapon identity", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state);
    const targetResult = resolveBattleSubject({
      state,
      subject,
      fills: [],
    });
    if (targetResult.tag !== "needsHoles") {
      throw new Error("Expected the fighter attack to request a target.");
    }
    const targetHole = targetResult.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    if (targetHole === undefined || targetHole.kind !== "targetChoice") {
      throw new Error("Expected the fighter attack target-choice hole.");
    }

    const attackResult = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(targetHole, subject.actorId, combatantId("goblin")),
      ],
    });
    if (attackResult.tag !== "needsHoles") {
      throw new Error("Expected the fighter attack to request an attack roll.");
    }
    const frontier = battleMechanicalFrontier({
      result: {
        kind: "holes",
        subject: attackResult.subject,
        holes: attackResult.holes,
      },
      acceptedFills: [],
    });
    if (Either.isLeft(frontier)) {
      throw new Error("Expected an ordinary attack mechanical frontier.");
    }
    if (frontier.right.kind !== "ordinaryHoles") {
      throw new Error("Expected an ordinary attack mechanical frontier.");
    }
    const attackHole = frontier.right.holes.find(
      (hole) => hole.kind === "attackRoll" && "attack" in hole,
    );
    if (
      attackHole === undefined ||
      attackHole.kind !== "attackRoll" ||
      !("attack" in attackHole)
    ) {
      throw new Error("Expected a projected attack-roll hole.");
    }
    const serialized = JSON.stringify(frontier.right);
    expect(serialized).not.toContain("label");
    expect(serialized).not.toContain("weaponUnitId");
    expect(attackHole.attack).toHaveProperty("weaponObjectId");
    expect(attackHole.attack).not.toHaveProperty("weaponUnitId");
  });

  test("projects an interrupt frontier when its decision hole matches the checkpoint", () => {
    const frontier = battleMechanicalFrontier({
      result: {
        kind: "interruptDecision",
        trigger: runtimeInterruptDecisionHole.trigger,
        decisionHole: runtimeInterruptDecisionHole,
        choices: [runtimeInterruptChoice],
        stackDepth: battleReplayStackDepth(1),
      },
      acceptedFills: [],
    });

    expect(Either.isRight(frontier)).toBe(true);
    if (Either.isRight(frontier)) {
      expect(frontier.right).toEqual({
        kind: "interruptDecision",
        decisionHole: {
          holeInstanceKey: runtimeInterruptDecisionHole.holeInstanceKey,
          holeId: runtimeInterruptDecisionHole.holeId,
          kind: "interruptDecision",
          trigger: runtimeInterruptDecisionHole.trigger,
          eligibleResponders: runtimeInterruptDecisionHole.eligibleResponders,
        },
        choices: [runtimeInterruptChoice],
      });
    }
  });

  test("rejects an interrupt frontier whose decision hole has another trigger", () => {
    const frontier = battleMechanicalFrontier({
      result: {
        kind: "interruptDecision",
        trigger: "attackHit",
        decisionHole: runtimeInterruptDecisionHole,
        choices: [runtimeInterruptChoice],
        stackDepth: battleReplayStackDepth(1),
      },
      acceptedFills: [],
    });

    expect(frontier).toEqual(
      Either.left({ tag: "interruptFrontierDecisionHoleMismatch" }),
    );
  });

  test("reports an empty ordinary hole frontier", () => {
    const result = ordinaryNeedsHolesResult();
    const frontier = battleMechanicalFrontier({
      result: { kind: "holes", subject: result.subject, holes: [] },
      acceptedFills: [],
    });
    expect(frontier).toEqual(Either.left({ tag: "emptyHoleFrontier" }));
  });

  test("projects every ordinary hole kind through the mechanical boundary", () => {
    const result = ordinaryNeedsHolesResult();
    const frontier = battleMechanicalFrontier({
      result: {
        kind: "holes",
        subject: result.subject,
        holes: projectionHoles,
      },
      acceptedFills: [],
    });

    expect(Either.isRight(frontier)).toBe(true);
    if (Either.isLeft(frontier)) return;
    expect(frontier.right.kind).toBe("ordinaryHoles");
    if (frontier.right.kind !== "ordinaryHoles") return;
    const projectedHoles = frontier.right.holes;
    expect(
      projectedHoles.map(({ kind, holeInstanceKey, holeId }) => ({
        kind,
        holeInstanceKey,
        holeId,
      })),
    ).toEqual(
      projectionHoles.map(({ kind, holeInstanceKey, holeId }) => ({
        kind,
        holeInstanceKey,
        holeId,
      })),
    );
    expect(projectedHoles.every((hole) => !("label" in hole))).toBe(true);

    const abilityCheck = projectedHoles.find(
      (hole) => hole.kind === "abilityCheck",
    );
    expect(abilityCheck).toMatchObject({
      kind: "abilityCheck",
      ability: "dex",
      skill: "stealth",
      dc: 12,
      d20TestNaturalOneRerolls: [{ effectKind: "d20_test_natural_one_reroll" }],
    });
    const attackRoll = projectedHoles.find(
      (hole) =>
        hole.kind === "attackRoll" &&
        hole.holeInstanceKey.endsWith("-attackRoll"),
    );
    expect(attackRoll).toMatchObject({
      kind: "attackRoll",
      sourceProcedureRef: projectionProcedureRef,
      attackBonus: 4,
      spellAttackRerolls: [
        { effectKind: "missed_spell_attack_reroll", sorceryPointCost: 1 },
      ],
    });
    const attackRollWithD20 = projectedHoles.find(
      (hole) =>
        hole.kind === "attackRoll" &&
        hole.holeInstanceKey.endsWith("-attackRoll-with-d20"),
    );
    expect(attackRollWithD20).toMatchObject({
      kind: "attackRoll",
      d20TestNaturalOneRerolls: [{ effectKind: "d20_test_natural_one_reroll" }],
    });
    const rolledDice = projectedHoles.find(
      (hole) =>
        hole.kind === "rolledDice" &&
        hole.holeInstanceKey.endsWith("-rolledDice-with-rerolls"),
    );
    expect(rolledDice).toMatchObject({
      kind: "rolledDice",
      critical: false,
      sourceProcedureRef: projectionProcedureRef,
      spellDamageRerolls: [
        {
          effectKind: "damage_dice_reroll",
          sorceryPointCost: 1,
          maximumSelectedDice: 1,
        },
      ],
    });
    const savingThrows = projectedHoles.filter(
      (hole) => hole.kind === "savingThrowOutcome",
    );
    expect(savingThrows).toHaveLength(2);
    expect(savingThrows[0]).toHaveProperty("d20TestNaturalOneRerolls");
    expect(savingThrows[1]).not.toHaveProperty("d20TestNaturalOneRerolls");
  });

  test("projects nested interrupt choices without presentation fields", () => {
    const interruptHole = projectionHole("interruptDecision", {
      trigger: "afterDamage",
      eligibleResponders: [projectionResponderId],
    });
    if (interruptHole.kind !== "interruptDecision") {
      throw new Error("Expected an interrupt-decision projection hole.");
    }
    const choice = {
      kind: "nestedProcedure" as const,
      subject: {
        tag: "runtimeCommand" as const,
        actorId: projectionResponderId,
        command: "releaseReadiedAction" as const,
        reactorId: projectionResponderId,
      },
      initialHoles: [projectionHoles[0]],
    } satisfies Extract<
      BattleInterruptProcedureChoice,
      { readonly kind: "nestedProcedure" }
    >;
    const frontier = battleMechanicalFrontier({
      result: {
        kind: "interruptDecision",
        trigger: "afterDamage",
        decisionHole: interruptHole,
        choices: [choice, projectionReactionModifierChoice],
        stackDepth: battleReplayStackDepth(1),
      },
      acceptedFills: [],
    });

    expect(Either.isRight(frontier)).toBe(true);
    if (Either.isLeft(frontier)) return;
    expect(frontier.right.kind).toBe("interruptDecision");
    if (frontier.right.kind !== "interruptDecision") return;
    expect(frontier.right.decisionHole).toMatchObject({
      holeInstanceKey: interruptHole.holeInstanceKey,
      holeId: interruptHole.holeId,
      kind: "interruptDecision",
      trigger: "afterDamage",
      eligibleResponders: ["projection-responder"],
    });
    expect(frontier.right.decisionHole).not.toHaveProperty("label");
    expect(frontier.right.choices[0]).toMatchObject({
      kind: "nestedProcedure",
      subject: choice.subject,
      initialHoles: [
        {
          kind: "abilityCheck",
          holeInstanceKey: projectionHoles[0].holeInstanceKey,
          holeId: projectionHoles[0].holeId,
          ability: "dex",
          skill: "stealth",
          dc: 12,
        },
      ],
    });
    expect(frontier.right.choices[0]?.initialHoles[0]).not.toHaveProperty(
      "label",
    );
    expect(frontier.right.choices[1]).toMatchObject({
      kind: "reactionModifier",
      responderId: projectionReactionModifierChoice.responderId,
      modifier: {
        kind: "fallDamageReduction",
        procedureRef: projectionProcedureRef,
        reduction: { kind: "flat", amount: 2 },
      },
      initialHoles: [],
    });
  });
});
