import { ClassLevel } from "@dnd/shared/types";
import { statBlockId } from "@dnd/shared/game-facts";
import {
  StatBlockProcedureEntrySchema,
  StatBlockProcedureResourceOrdinalSchema,
  StatBlockReactionSectionSchema,
} from "@dnd/surface/surface/schema";
import type {
  StatBlockProcedureEntry,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  authoredStatBlockBattleInitIssueMessage,
  battleAvailableDruidWildShapeKnownForms,
  battleCreatureInitFromStatBlock,
  combatantId,
  initiativeScore,
  parseSupportedUnitFeatureProfile,
  wildShapeKnownFormsIssueMessage,
} from "./index.ts";
import {
  monsterMultiattackStatBlock,
  monsterResourceStatBlock,
  statBlockCatalog,
  statBlockRecord,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";

const decodeProcedure = (input: unknown): StatBlockProcedureEntry =>
  Schema.decodeUnknownSync(StatBlockProcedureEntrySchema)(input);

const decodeReaction = (
  input: unknown,
): NonNullable<StatBlockRecord["statBlock"]["reactions"]>[number] => {
  const entries = Schema.decodeUnknownSync(StatBlockReactionSectionSchema)([
    input,
  ]);
  const entry = entries[0];
  if (entry === undefined) {
    throw new Error("Expected a decoded synthetic reaction procedure.");
  }
  return entry;
};

function requiredProjectionFailure(record: StatBlockRecord) {
  const result = projectAuthoredStatBlock(record);
  expect(Either.isLeft(result)).toBe(true);
  if (Either.isRight(result)) {
    throw new Error("Expected the synthetic Stat Block projection to fail.");
  }
  return result.left;
}

function druidWildShapeKnownFormProfile() {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected the Druid Wild Shape support profile.");
  }
  return profile;
}

describe("Stat Block projection boundary coverage", () => {
  test("formats a battle-init issue and every projection failure reason", () => {
    const source = statBlockRecord();
    const firstAction = source.statBlock.actions?.[0];
    if (firstAction === undefined) {
      throw new Error("Expected the Stat Block fixture to have an action.");
    }

    const projectionCases = [
      {
        reason: "nonLiteralSize" as const,
        record: {
          ...source,
          statBlock: {
            ...source.statBlock,
            size: { kind: "alternatives", options: ["small", "medium"] },
          },
        },
        message:
          "Stat Block authored projection failed: battle initialization requires a concrete Size.",
      },
      {
        reason: "invalidLegendaryActionUses" as const,
        record: {
          ...source,
          statBlock: {
            ...source.statBlock,
            legendaryActions: {
              uses: 0,
              entries: [firstAction],
            },
          },
        },
        message:
          "Stat Block authored projection failed: battle initialization requires positive integer Legendary Action uses.",
      },
    ] as const;

    for (const [index, projectionCase] of projectionCases.entries()) {
      const failure = requiredProjectionFailure(projectionCase.record);
      expect(failure).toEqual({
        tag: "battleStatBlockProjectionFailure",
        reason: projectionCase.reason,
      });

      const initialized = battleCreatureInitFromStatBlock({
        combatantId: combatantId(`synthetic-projection-failure-${index}`),
        statBlock: projectionCase.record,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        conditions: [],
      });
      expect(Either.isLeft(initialized)).toBe(true);
      if (Either.isRight(initialized)) continue;
      expect(authoredStatBlockBattleInitIssueMessage(initialized.left)).toBe(
        projectionCase.message,
      );
    }

    const battleInit = battleCreatureInitFromStatBlock({
      combatantId: combatantId("synthetic-battle-init-issue"),
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          immunities: { conditions: ["prone"] },
        },
      },
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      conditions: ["prone"],
    });
    expect(Either.isLeft(battleInit)).toBe(true);
    if (Either.isRight(battleInit)) return;
    expect(authoredStatBlockBattleInitIssueMessage(battleInit.left)).toBe(
      "Stat Block combatant is immune to initial prone condition.",
    );
  });

  test("rejects invalid authored resource limits before runtime allocation", () => {
    const source = monsterResourceStatBlock();
    const resources = source.statBlock.resources;
    if (resources === undefined) {
      throw new Error("Expected the resource-backed Stat Block fixture.");
    }
    const daily = resources.find((resource) => resource.limit.kind === "daily");
    const recharge = resources.find(
      (resource) => resource.limit.kind === "recharge",
    );
    if (daily === undefined || recharge === undefined) {
      throw new Error("Expected daily and recharge resource fixtures.");
    }
    const [firstResource, secondResource, ...remainingResources] = resources;
    if (firstResource === undefined || secondResource === undefined) {
      throw new Error("Expected both resource declarations.");
    }

    const malformedDaily: StatBlockRecord = {
      ...source,
      statBlock: {
        ...source.statBlock,
        resources: [
          firstResource.ordinal === daily.ordinal
            ? { ...firstResource, limit: { kind: "daily", uses: 0 } }
            : firstResource,
          secondResource.ordinal === daily.ordinal
            ? { ...secondResource, limit: { kind: "daily", uses: 0 } }
            : secondResource,
          ...remainingResources,
        ],
      },
    };
    const malformedRecharge: StatBlockRecord = {
      ...source,
      statBlock: {
        ...source.statBlock,
        resources: [
          firstResource.ordinal === recharge.ordinal
            ? {
                ...firstResource,
                limit: { kind: "recharge", minimumRoll: 7 },
              }
            : firstResource,
          secondResource.ordinal === recharge.ordinal
            ? {
                ...secondResource,
                limit: { kind: "recharge", minimumRoll: 7 },
              }
            : secondResource,
          ...remainingResources,
        ],
      },
    };

    const invalidResourceCases = [
      {
        record: malformedDaily,
        issues: [{ ordinal: daily.ordinal, reason: "invalidDailyUses" }],
      },
      {
        record: malformedRecharge,
        issues: [
          {
            ordinal: recharge.ordinal,
            reason: "invalidRechargeMinimumRoll",
          },
        ],
      },
    ] as const;

    for (const { record, issues } of invalidResourceCases) {
      expect(projectAuthoredStatBlock(record)).toEqual(
        Either.left({
          tag: "battleStatBlockProjectionFailure",
          reason: "invalidResourceLimit",
          issues,
        }),
      );
    }

    const malformedBoth: StatBlockRecord = {
      ...source,
      statBlock: {
        ...source.statBlock,
        resources: [
          {
            ...firstResource,
            limit: { kind: "daily", uses: 0 },
          },
          {
            ...secondResource,
            limit: { kind: "recharge", minimumRoll: 7 },
          },
          ...remainingResources,
        ],
      },
    };
    expect(projectAuthoredStatBlock(malformedBoth)).toEqual(
      Either.left({
        tag: "battleStatBlockProjectionFailure",
        reason: "invalidResourceLimit",
        issues: [
          { ordinal: firstResource.ordinal, reason: "invalidDailyUses" },
          {
            ordinal: secondResource.ordinal,
            reason: "invalidRechargeMinimumRoll",
          },
        ],
      }),
    );
  });

  test("rejects a non-positive authored Multiattack count before execution", () => {
    const source = monsterMultiattackStatBlock();
    const multiattack = source.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" && entry.procedure.kind === "multiattack",
    );
    if (
      multiattack === undefined ||
      multiattack.kind !== "executable" ||
      multiattack.procedure.kind !== "multiattack"
    ) {
      throw new Error("Expected the synthetic Multiattack procedure.");
    }
    const firstDispatch = multiattack.procedure.dispatches[0];
    if (firstDispatch === undefined) {
      throw new Error("Expected the synthetic Multiattack dispatch.");
    }
    const actions = source.statBlock.actions;
    if (actions === undefined) {
      throw new Error("Expected the synthetic Multiattack actions.");
    }
    const [firstAction, ...remainingActions] = actions;
    if (firstAction === undefined) {
      throw new Error("Expected the first synthetic action.");
    }
    const replaceCount = (entry: (typeof actions)[number]) => {
      if (entry.procedureOrdinal !== multiattack.procedureOrdinal) {
        return entry;
      }
      if (
        entry.kind !== "executable" ||
        entry.procedure.kind !== "multiattack"
      ) {
        return entry;
      }
      const malformedDispatches: typeof entry.procedure.dispatches = [
        {
          ...firstDispatch,
          count: { kind: "literal", value: 0 },
        },
        ...entry.procedure.dispatches.slice(1),
      ];
      return {
        ...entry,
        procedure: {
          ...entry.procedure,
          dispatches: malformedDispatches,
        },
      };
    };
    const malformedActions: NonNullable<
      StatBlockRecord["statBlock"]["actions"]
    > = [replaceCount(firstAction), ...remainingActions.map(replaceCount)];
    const record: StatBlockRecord = {
      ...source,
      statBlock: {
        ...source.statBlock,
        actions: malformedActions,
      },
    };

    expect(projectAuthoredStatBlock(record)).toEqual(
      Either.left({
        tag: "battleStatBlockProjectionFailure",
        reason: "unsupportedProcedureBinding",
        issues: [
          {
            section: "actions",
            procedureOrdinal: multiattack.procedureOrdinal,
          },
        ],
      }),
    );
  });

  test("accumulates unsupported executable procedure locations", () => {
    const source = statBlockRecord();
    const unsupportedProcedures: StatBlockRecord["statBlock"] = {
      ...source.statBlock,
      actions: [
        decodeProcedure({
          kind: "executable",
          procedureOrdinal: 1,
          procedure: {
            kind: "save",
            name: "Synthetic Save Procedure",
            ability: "dex",
            dc: { kind: "fixed", dc: 12 },
            target: { kind: "one_creature_in_range", rangeFeet: 5 },
            onFail: {
              kind: "damage",
              damageType: "bludgeoning",
              amount: { kind: "fixed", static: 1 },
            },
            onSuccess: { kind: "half_damage" },
          },
          resourceRefs: { kind: "none" },
        }),
      ],
      bonusActions: [
        decodeProcedure({
          kind: "executable",
          procedureOrdinal: 2,
          procedure: {
            kind: "support",
            name: "Synthetic Support Procedure",
            target: "self",
            effect: {
              kind: "damage",
              damageType: "bludgeoning",
              amount: { kind: "fixed", static: 1 },
            },
          },
          resourceRefs: { kind: "none" },
        }),
      ],
      reactions: [
        decodeReaction({
          kind: "executable",
          procedureOrdinal: 3,
          trigger: { kind: "hit_by_attack_roll" },
          procedure: {
            kind: "spellcasting",
            name: "Synthetic Spellcasting Procedure",
            ability: "int",
            groups: [
              {
                kind: "at_will",
                resourceRefs: { kind: "none" },
                spells: [{ spellId: "unit_spell_synthetic_mending" }],
              },
            ],
          },
          resourceRefs: { kind: "none" },
        }),
      ],
    };
    const record: StatBlockRecord = {
      ...source,
      statBlock: unsupportedProcedures,
    };

    const failure = requiredProjectionFailure(record);
    expect(failure).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "unsupportedProcedureBinding",
      issues: [
        { section: "actions", procedureOrdinal: 1 },
        { section: "bonusActions", procedureOrdinal: 2 },
        { section: "reactions", procedureOrdinal: 3 },
      ],
    });

    const initialized = battleCreatureInitFromStatBlock({
      combatantId: combatantId("synthetic-unsupported-procedures"),
      statBlock: record,
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      conditions: [],
    });
    expect(Either.isLeft(initialized)).toBe(true);
    if (Either.isRight(initialized)) return;
    expect(authoredStatBlockBattleInitIssueMessage(initialized.left)).toBe(
      "Stat Block authored projection failed in actions procedure 1, bonusActions procedure 2, reactions procedure 3: the procedure binding is not supported by battle execution.",
    );
  });

  test("formats scalar Wild Shape projection failures through the public admission boundary", () => {
    const source = statBlockCatalog.requireStatBlock("stat_block_rat");
    const firstAction = source.statBlock.actions?.[0];
    if (firstAction === undefined) {
      throw new Error("Expected the Wild Shape fixture to have an action.");
    }

    const cases = [
      {
        record: {
          ...source,
          statBlock: {
            ...source.statBlock,
            legendaryActions: { uses: 0, entries: [firstAction] },
          },
        },
        message:
          "Druid Wild Shape battle forms require positive integer Legendary Action uses.",
      },
    ] as const;
    const profile = druidWildShapeKnownFormProfile();

    for (const projectionCase of cases) {
      const result = battleAvailableDruidWildShapeKnownForms({
        profile,
        forms: [projectionCase.record],
      });
      expect(result).toEqual(
        Either.left({
          tag: "battleDruidWildShapeKnownFormsIssue",
          issues: [
            {
              tag: "battleDruidWildShapeKnownFormIssue",
              statBlockId: projectionCase.record.id,
              reason: "invalidLegendaryActionUses",
            },
          ],
        }),
      );
      if (Either.isLeft(result)) {
        expect(wildShapeKnownFormsIssueMessage(result.left.issues)).toBe(
          projectionCase.message,
        );
      }
    }
  });

  test("accumulates independent Wild Shape resource failures across forms", () => {
    const source = monsterResourceStatBlock();
    const resources = source.statBlock.resources;
    const firstAction = source.statBlock.actions?.[0];
    if (resources === undefined || firstAction === undefined) {
      throw new Error("Expected synthetic resource-backed form fixture.");
    }
    const daily = resources.find((resource) => resource.limit.kind === "daily");
    if (daily === undefined) throw new Error("Expected a daily resource.");
    const invalidLimitForm: StatBlockRecord = {
      ...source,
      id: statBlockId("synthetic_wild_shape_invalid_limit_form"),
      statBlock: {
        ...source.statBlock,
        creatureType: "beast",
        resources: (() => {
          const mapped = resources.map((resource) =>
            resource.ordinal === daily.ordinal
              ? { ...resource, limit: { kind: "daily" as const, uses: 0 } }
              : resource,
          );
          return [mapped[0]!, ...mapped.slice(1)] as const;
        })(),
      },
    };
    const missingOrdinal = Schema.decodeUnknownSync(
      StatBlockProcedureResourceOrdinalSchema,
    )(99);
    const graphFailureForm: StatBlockRecord = {
      ...source,
      id: statBlockId("synthetic_wild_shape_graph_failure_form"),
      statBlock: {
        ...source.statBlock,
        creatureType: "beast",
        resources: [resources[0]!, resources[0]!, resources[1]!] as const,
        actions: [
          {
            ...firstAction,
            resourceRefs: { kind: "some", ordinals: [missingOrdinal] },
          },
          ...(source.statBlock.actions?.slice(1) ?? []),
        ],
      },
    };
    const result = battleAvailableDruidWildShapeKnownForms({
      profile: druidWildShapeKnownFormProfile(),
      forms: [invalidLimitForm, graphFailureForm],
    });
    expect(result).toEqual(
      Either.left({
        tag: "battleDruidWildShapeKnownFormsIssue",
        issues: [
          {
            tag: "battleDruidWildShapeKnownFormIssue",
            statBlockId: invalidLimitForm.id,
            reason: "invalidResourceLimit",
            issues: [{ ordinal: daily.ordinal, reason: "invalidDailyUses" }],
          },
          {
            tag: "battleDruidWildShapeKnownFormIssue",
            statBlockId: graphFailureForm.id,
            reason: "resourceGraph",
            issues: [
              {
                kind: "duplicateResourceOrdinal",
                ordinal: resources[0]!.ordinal,
              },
              { kind: "missingResourceDeclaration", ordinal: missingOrdinal },
            ],
          },
        ],
      }),
    );
  });
});
