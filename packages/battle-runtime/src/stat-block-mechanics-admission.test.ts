import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import armorChainMailInput from "../../surface/content/armor_chain_mail.json";
import magicMissileInput from "../../surface/content/magic_missile.json";
import goblinWarriorInput from "../../surface/content/stat_block_goblin_warrior.json";
import { statBlockId } from "@dnd/shared/game-facts";
import {
  SrdStatBlockRecordSchema,
  decodeSrdSurfaceSync,
} from "@dnd/surface/surface/schema";
import { installSrdSurface } from "@dnd/surface/surface/catalog-install";
import type {
  SrdStatBlockRecord,
  SrdSurface,
} from "@dnd/surface/surface/types";

import {
  admitCompleteStatBlockMechanics,
  admitCompleteStatBlockMechanicsGraph,
} from "./stat-block-mechanics-admission.ts";

const decode = (input: unknown): SrdStatBlockRecord =>
  Schema.decodeUnknownSync(SrdStatBlockRecordSchema, {
    onExcessProperty: "error",
  })(input);

const surface = decodeSrdSurfaceSync({
  kind: "srd-5.2.1-surface-catalog",
  units: [armorChainMailInput, magicMissileInput],
  statBlocks: [goblinWarriorInput],
});

const source = surface.statBlocks[0];
if (source === undefined) {
  throw new Error("Expected a decoded Stat Block fixture.");
}

const permissiveAdmission = {
  admitUnit: () => ({ tag: "admitted" as const }),
  admitStatBlock: () => ({ tag: "admitted" as const }),
};

function surfaceWithStatBlock(statBlock: SrdStatBlockRecord): SrdSurface {
  return { ...surface, statBlocks: [statBlock] };
}

describe("complete Stat Block mechanics admission", () => {
  test("admits an executable graph and is independent of authored identity", () => {
    const renamed = {
      ...source,
      id: statBlockId("stat_block_synthetic_renamed_goblin"),
      name: "Synthetic Renamed Creature",
    };

    expect(
      admitCompleteStatBlockMechanicsGraph({
        statBlock: source,
        surface,
      }),
    ).toEqual({ tag: "admitted" });
    expect(
      admitCompleteStatBlockMechanicsGraph({
        statBlock: renamed,
        surface: surfaceWithStatBlock(renamed),
      }),
    ).toEqual({ tag: "admitted" });
  });

  test("walks general facts, traits, every action section, effects, triggers, and references", () => {
    const originalAction = source.statBlock.actions?.[0];
    const originalLegendaryAction = source.statBlock.actions?.[1];
    if (
      originalAction?.kind !== "executable" ||
      originalLegendaryAction?.kind !== "executable" ||
      originalAction.procedure.kind !== "attack_roll" ||
      originalLegendaryAction.procedure.kind !== "attack_roll"
    ) {
      throw new Error("Expected the fixture to contain two actions.");
    }
    const malformedAction = {
      ...originalAction,
      procedure: {
        ...originalAction.procedure,
        onHit: [
          {
            kind: "apply_condition" as const,
            condition: "blinded" as const,
            expiresAt: { kind: "target_next_turn_end" as const },
          },
          ...originalAction.procedure.onHit,
        ],
      },
    };
    const reaction = {
      kind: "executable" as const,
      procedureOrdinal: 1,
      procedure: originalLegendaryAction.procedure,
      resourceRefs: { kind: "none" as const },
      trigger: {
        kind: "any_of" as const,
        triggers: [
          { kind: "self_or_visible_creature_falls" as const, rangeFeet: 60 },
          {
            kind: "targeted_by_named_spell" as const,
            spellId: "unit_missing_synthetic_spell",
          },
        ],
      },
    };
    const bonusAction = {
      kind: "executable" as const,
      procedureOrdinal: 1,
      procedure: {
        kind: "action_option" as const,
        name: "Synthetic Unsupported Bonus Action",
        options: ["attack" as const],
      },
      resourceRefs: { kind: "none" as const },
    };
    const record = decode({
      ...source,
      statBlock: {
        ...source.statBlock,
        size: { kind: "alternatives", options: ["small", "medium"] },
        traits: [
          {
            name: "Synthetic Unsupported Trait",
            description: "A synthetic trait description.",
            effect: {
              kind: "caster_shared_resistance",
              chosenFrom: "resistances_list",
            },
          },
        ],
        actions: [malformedAction, originalLegendaryAction],
        bonusActions: [bonusAction],
        reactions: [reaction],
        legendaryActions: {
          uses: {
            kind: "lair_bonus",
            usesOutsideLair: 2,
            additionalUsesInLair: 1,
          },
          entries: [originalLegendaryAction],
        },
      },
    });

    const result = admitCompleteStatBlockMechanicsGraph({
      statBlock: record,
      surface: surfaceWithStatBlock(record),
    });
    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;

    expect(result.issues.length).toBeGreaterThan(6);
    expect(result.issues.map(({ reason }) => reason)).toEqual(
      expect.arrayContaining([
        "ambiguous_mechanics",
        "unsupported_mechanics",
        "incomplete_graph",
      ]),
    );
    const paths = result.issues.map(({ mechanicsPath }) =>
      mechanicsPath.nodes.map((node) => node.role),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        ["generalFact"],
        ["trait"],
        ["action", "procedure"],
        ["action", "procedure", "effect"],
        ["bonusAction", "procedure"],
        ["reaction"],
        ["reaction", "extension"],
        ["reaction", "extension", "extension"],
        ["reaction", "extension", "extension", "reference"],
        ["legendaryAction", "extension"],
      ]),
    );
  });

  test("rejects a text-only graph while canonical installation may retain textOnly", () => {
    const { bonusActions: _bonusActions, ...statBlockWithoutBonusAction } =
      goblinWarriorInput.statBlock;
    const textOnlyStatBlock = {
      ...statBlockWithoutBonusAction,
      actions: [
        {
          kind: "textOnly" as const,
          procedureOrdinal: 1,
          name: "Synthetic Text Procedure",
          description: "A synthetic retained source description.",
          reason: "unsupported_action_shape" as const,
          resourceRefs: { kind: "none" as const },
        },
      ],
    };
    const record = decode({
      ...goblinWarriorInput,
      statBlock: textOnlyStatBlock,
    });
    const strictResult = admitCompleteStatBlockMechanicsGraph({
      statBlock: record,
      surface: surfaceWithStatBlock(record),
    });

    expect(strictResult.tag).toBe("rejected");
    if (strictResult.tag === "rejected") {
      expect(strictResult.issues.map(({ reason }) => reason)).toEqual([
        "unsupported_mechanics",
        "no_admitted_procedure",
      ]);
      expect(strictResult.issues).not.toHaveProperty("catalog");
    }

    const rejectedInstall = installSrdSurface({
      raw: {
        kind: "srd-5.2.1-surface-catalog",
        units: [
          {
            ...armorChainMailInput,
            rulesExcerpt: "Synthetic test Unit excerpt.",
          },
        ],
        statBlocks: [
          {
            ...goblinWarriorInput,
            statBlock: textOnlyStatBlock,
            rulesExcerpt: "Synthetic test Stat Block excerpt.",
          },
        ],
      },
      mechanicsAdmission: {
        ...permissiveAdmission,
        admitStatBlock: admitCompleteStatBlockMechanics,
      },
    });
    expect(rejectedInstall.tag).toBe("rejected");
    if (rejectedInstall.tag === "rejected") {
      expect(rejectedInstall).not.toHaveProperty("catalog");
    }

    const retainedByCanonicalPolicy = installSrdSurface({
      raw: {
        kind: "srd-5.2.1-surface-catalog",
        units: [
          {
            ...armorChainMailInput,
            rulesExcerpt: "Synthetic test Unit excerpt.",
          },
        ],
        statBlocks: [
          {
            ...goblinWarriorInput,
            statBlock: textOnlyStatBlock,
            rulesExcerpt: "Synthetic test Stat Block excerpt.",
          },
        ],
      },
      mechanicsAdmission: permissiveAdmission,
    });
    expect(retainedByCanonicalPolicy.tag).toBe("accepted");
  });

  test("reports spellcasting groups, references, and restriction extensions separately", () => {
    const decodedRecord = decode({
      ...goblinWarriorInput,
      statBlock: {
        ...source.statBlock,
        resources: [
          {
            ordinal: 1,
            ownership: "shared" as const,
            limit: { kind: "daily" as const, uses: 1 },
          },
          {
            ordinal: 2,
            ownership: "shared" as const,
            limit: { kind: "daily" as const, uses: 1 },
          },
        ],
        actions: [
          {
            kind: "executable" as const,
            procedureOrdinal: 1,
            procedure: {
              kind: "spellcasting" as const,
              name: "Synthetic Spellcasting",
              ability: "int" as const,
              groups: [
                {
                  kind: "limited" as const,
                  resourceRefs: {
                    kind: "some" as const,
                    ordinals: [1],
                  },
                  spells: [
                    {
                      spellId: magicMissileInput.id,
                      restriction: {
                        authoredExpression: "synthetic restriction",
                        deltas: [
                          {
                            kind: "target_limit" as const,
                            target: "self" as const,
                          },
                        ],
                      },
                    },
                    { spellId: armorChainMailInput.id },
                    { spellId: "unit_missing_synthetic_spell" },
                  ],
                },
              ],
            },
            resourceRefs: { kind: "none" as const },
          },
        ],
      },
    });
    // Deliberately remove the declaration after schema decoding so the
    // profile's nested dependency path is exercised at its typed boundary.
    const decodedResources = decodedRecord.statBlock.resources;
    const declaredSecondResource = decodedResources?.[1];
    if (declaredSecondResource === undefined) {
      throw new Error("Expected the synthetic resource fixture.");
    }
    const record: SrdStatBlockRecord = {
      ...decodedRecord,
      statBlock: {
        ...decodedRecord.statBlock,
        resources: [declaredSecondResource],
      },
    };

    const result = admitCompleteStatBlockMechanicsGraph({
      statBlock: record,
      surface: surfaceWithStatBlock(record),
    });
    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;

    const paths = result.issues.map(({ mechanicsPath }) =>
      mechanicsPath.nodes.map((node) => node.role),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        ["action", "procedure", "extension"],
        ["action", "procedure", "extension", "dependency"],
        ["action", "procedure", "extension", "reference"],
        ["action", "procedure", "extension", "reference", "extension"],
      ]),
    );
    const incompletePaths = result.issues
      .filter(({ reason }) => reason === "incomplete_graph")
      .map(({ mechanicsPath }) => mechanicsPath.nodes.at(-1));
    expect(incompletePaths).toEqual(
      expect.arrayContaining([
        { kind: "occurrence", role: "dependency", ordinal: 1 },
        { kind: "occurrence", role: "reference", ordinal: 2 },
        { kind: "occurrence", role: "reference", ordinal: 3 },
      ]),
    );
  });
});
