import { ClassLevel } from "@dnd/shared/types";
import { statBlockId } from "@dnd/shared/game-facts";
import {
  StatBlockProcedureEntrySchema,
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
  battleCreatureInitFromAuthoredStatBlock,
  battleCreatureInitFromStatBlock,
  combatantId,
  initiativeScore,
  parseSupportedUnitFeatureProfile,
} from "./index.ts";
import {
  projectedStatBlockRuntimeSource,
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

function syntheticProjectionRecord(
  source: StatBlockRecord,
  section: string,
  statBlock: unknown,
): StatBlockRecord {
  // Standalone authored values are currently decoded as literal-only. These
  // typed boundary fixtures exercise the public projection's defensive checks
  // for broader wire-shaped values that the projection still validates.
  return {
    ...source,
    id: statBlockId(`synthetic-${section}`),
    name: `Synthetic ${section}`,
    provenance: { kind: "synthetic-test", section },
    statBlock,
  } as unknown as StatBlockRecord;
}

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
    const firstSpeed = source.statBlock.speeds[0];
    if (firstSpeed === undefined) {
      throw new Error("Expected the Stat Block fixture to have a Speed.");
    }

    const projectionCases = [
      {
        reason: "nonLiteralSize" as const,
        record: syntheticProjectionRecord(source, "non-literal-size", {
          ...source.statBlock,
          size: { kind: "alternatives", options: ["small", "medium"] },
        }),
        message:
          "Stat Block authored projection failed: battle initialization requires a concrete Size.",
      },
      {
        reason: "nonLiteralArmorClass" as const,
        record: syntheticProjectionRecord(source, "non-literal-armor-class", {
          ...source.statBlock,
          ac: {
            ...source.statBlock.ac,
            value: { kind: "caster_derived", source: "spell_save_dc" },
          },
        }),
        message:
          "Stat Block authored projection failed: battle initialization requires literal Armor Class.",
      },
      {
        reason: "nonLiteralHitPoints" as const,
        record: syntheticProjectionRecord(source, "non-literal-hit-points", {
          ...source.statBlock,
          hp: { kind: "caster_derived", source: "spell_save_dc" },
        }),
        message:
          "Stat Block authored projection failed: battle initialization requires literal maximum Hit Points.",
      },
      {
        reason: "nonLiteralSpeed" as const,
        record: syntheticProjectionRecord(source, "non-literal-speed", {
          ...source.statBlock,
          speeds: [
            {
              ...firstSpeed,
              feet: { kind: "caster_derived", source: "spell_save_dc" },
            },
            ...source.statBlock.speeds.slice(1),
          ],
        }),
        message:
          "Stat Block authored projection failed: battle initialization requires unconditional literal Speeds.",
      },
      {
        reason: "invalidLegendaryActionUses" as const,
        record: syntheticProjectionRecord(
          source,
          "invalid-legendary-action-uses",
          {
            ...source.statBlock,
            legendaryActions: {
              uses: 0,
              entries: [...(source.statBlock.actions?.slice(0, 1) ?? [])],
            },
          },
        ),
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

      const initialized = battleCreatureInitFromAuthoredStatBlock({
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

    const runtime = projectedStatBlockRuntimeSource(source);
    const battleInit = battleCreatureInitFromStatBlock({
      combatantId: combatantId("synthetic-battle-init-issue"),
      statBlock: {
        ...runtime,
        statBlock: {
          ...runtime.statBlock,
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
    const record = syntheticProjectionRecord(
      source,
      "unsupported-procedure-locations",
      unsupportedProcedures,
    );

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

    const initialized = battleCreatureInitFromAuthoredStatBlock({
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
    const firstSpeed = source.statBlock.speeds[0];
    if (firstSpeed === undefined) {
      throw new Error("Expected the Wild Shape fixture to have a Speed.");
    }
    const firstAction = source.statBlock.actions?.[0];
    if (firstAction === undefined) {
      throw new Error("Expected the Wild Shape fixture to have an action.");
    }

    const cases = [
      {
        record: syntheticProjectionRecord(source, "wild-shape-armor-class", {
          ...source.statBlock,
          ac: {
            ...source.statBlock.ac,
            value: { kind: "caster_derived", source: "spell_save_dc" },
          },
        }),
        message: "Druid Wild Shape battle forms require literal Armor Class.",
      },
      {
        record: syntheticProjectionRecord(source, "wild-shape-hit-points", {
          ...source.statBlock,
          hp: { kind: "caster_derived", source: "spell_save_dc" },
        }),
        message:
          "Druid Wild Shape battle forms require literal maximum Hit Points.",
      },
      {
        record: syntheticProjectionRecord(source, "wild-shape-speed", {
          ...source.statBlock,
          speeds: [
            {
              ...firstSpeed,
              feet: { kind: "caster_derived", source: "spell_save_dc" },
            },
            ...source.statBlock.speeds.slice(1),
          ],
        }),
        message:
          "Druid Wild Shape battle forms require unconditional literal Speeds.",
      },
      {
        record: syntheticProjectionRecord(
          source,
          "wild-shape-legendary-action-uses",
          {
            ...source.statBlock,
            legendaryActions: { uses: 0, entries: [firstAction] },
          },
        ),
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
          tag: "battleDruidWildShapeKnownFormIssue",
          message: projectionCase.message,
        }),
      );
    }
  });
});
