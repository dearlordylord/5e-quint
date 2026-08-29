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
import type { StatBlockMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  installSrdSurface,
  type SurfaceMechanicsAdmission,
} from "@dnd/surface/surface/catalog-install";
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

const permissiveAdmission: SurfaceMechanicsAdmission = {
  admitUnit: () => ({ tag: "admitted" }),
  admitStatBlock: () => ({ tag: "admitted" }),
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

  test.each([
    {
      name: "absent",
      surfaceStatBlock: decode({
        ...goblinWarriorInput,
        id: "stat_block_synthetic_other_root",
        name: "Synthetic Other Root",
      }),
      message:
        "The Stat Block admission root is absent from the decoded Surface.",
    },
    {
      name: "mismatched",
      surfaceStatBlock: decode({
        ...goblinWarriorInput,
        name: "Synthetic Mismatched Root",
      }),
      message:
        "The Stat Block admission root does not match the decoded Surface member with that authored identity.",
    },
  ])("rejects an $name Stat Block root", ({ surfaceStatBlock, message }) => {
    const result = admitCompleteStatBlockMechanicsGraph({
      statBlock: source,
      surface: surfaceWithStatBlock(surfaceStatBlock),
    });

    expect(result).toEqual({
      tag: "rejected",
      issues: [
        {
          reason: "incomplete_graph",
          mechanicsPath: {
            family: "statBlock",
            nodes: [{ kind: "singleton", role: "recordMechanics" }],
          },
          message,
        },
      ],
    });
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
            kind: "apply_condition",
            condition: "blinded",
            expiresAt: { kind: "target_next_turn_end" },
          },
          ...originalAction.procedure.onHit,
        ],
      },
    };
    const reaction = {
      kind: "executable",
      procedureOrdinal: 1,
      procedure: originalLegendaryAction.procedure,
      resourceRefs: { kind: "none" },
      trigger: {
        kind: "any_of",
        triggers: [
          { kind: "self_or_visible_creature_falls", rangeFeet: 60 },
          {
            kind: "targeted_by_named_spell",
            spellId: "unit_missing_synthetic_spell",
          },
        ],
      },
    };
    const bonusAction = {
      kind: "executable",
      procedureOrdinal: 1,
      procedure: {
        kind: "action_option",
        name: "Synthetic Unsupported Bonus Action",
        options: ["attack"],
      },
      resourceRefs: { kind: "none" },
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

    expect(normalizeAdmissionIssues(result.issues)).toEqual(
      [
        "ambiguous_mechanics|statBlock|singleton:generalFact",
        "ambiguous_mechanics|statBlock|occurrence:legendaryAction:1/singleton:extension",
        "incomplete_graph|statBlock|occurrence:reaction:1/singleton:extension/occurrence:extension:2/singleton:reference",
        "unsupported_mechanics|statBlock|occurrence:action:1/singleton:procedure",
        "unsupported_mechanics|statBlock|occurrence:action:1/singleton:procedure/occurrence:effect:1",
        "unsupported_mechanics|statBlock|occurrence:bonusAction:1/singleton:procedure",
        "unsupported_mechanics|statBlock|singleton:reaction",
        "unsupported_mechanics|statBlock|occurrence:reaction:1/singleton:extension",
        "unsupported_mechanics|statBlock|occurrence:reaction:1/singleton:extension/occurrence:extension:1",
        "unsupported_mechanics|statBlock|occurrence:reaction:1/singleton:extension/occurrence:extension:2",
        "unsupported_mechanics|statBlock|occurrence:reaction:1/singleton:procedure",
        "unsupported_mechanics|statBlock|occurrence:trait:1",
      ].sort(),
    );
  });

  test("rejects a text-only graph while canonical installation may retain textOnly", () => {
    const { bonusActions: _bonusActions, ...statBlockWithoutBonusAction } =
      goblinWarriorInput.statBlock;
    const textOnlyStatBlock = {
      ...statBlockWithoutBonusAction,
      actions: [
        {
          kind: "textOnly",
          procedureOrdinal: 1,
          name: "Synthetic Text Procedure",
          description: "A synthetic retained source description.",
          reason: "unsupported_action_shape",
          resourceRefs: { kind: "none" },
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
            ownership: "shared",
            limit: { kind: "daily", uses: 1 },
          },
          {
            ordinal: 2,
            ownership: "shared",
            limit: { kind: "daily", uses: 1 },
          },
        ],
        actions: [
          {
            kind: "executable",
            procedureOrdinal: 1,
            procedure: {
              kind: "spellcasting",
              name: "Synthetic Spellcasting",
              ability: "int",
              groups: [
                {
                  kind: "limited",
                  resourceRefs: {
                    kind: "some",
                    ordinals: [1],
                  },
                  spells: [
                    {
                      spellId: magicMissileInput.id,
                      restriction: {
                        authoredExpression: "synthetic restriction",
                        deltas: [
                          {
                            kind: "target_limit",
                            target: "self",
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
            resourceRefs: { kind: "none" },
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

    expect(normalizeAdmissionIssues(result.issues)).toEqual(
      [
        "incomplete_graph|statBlock|occurrence:action:1/singleton:procedure/occurrence:extension:1/occurrence:dependency:1",
        "incomplete_graph|statBlock|occurrence:action:1/singleton:procedure/occurrence:extension:1/occurrence:reference:2",
        "incomplete_graph|statBlock|occurrence:action:1/singleton:procedure/occurrence:extension:1/occurrence:reference:3",
        "unsupported_mechanics|statBlock|occurrence:action:1/singleton:procedure/occurrence:extension:1",
        "unsupported_mechanics|statBlock|occurrence:action:1/singleton:procedure/occurrence:extension:1/occurrence:reference:1",
        "unsupported_mechanics|statBlock|occurrence:action:1/singleton:procedure/occurrence:extension:1/occurrence:reference:1/occurrence:extension:1",
        "unsupported_mechanics|statBlock|occurrence:action:1/singleton:procedure/occurrence:extension:1/occurrence:reference:2",
        "unsupported_mechanics|statBlock|occurrence:action:1/singleton:procedure/occurrence:extension:1/occurrence:reference:3",
      ].sort(),
    );
  });
});

function normalizeAdmissionIssues(
  issues: readonly {
    readonly reason: string;
    readonly mechanicsPath: StatBlockMechanicsPath;
  }[],
): readonly string[] {
  return issues
    .map(({ reason, mechanicsPath }) => {
      const nodes = mechanicsPath.nodes.map((node) =>
        node.kind === "singleton"
          ? `${node.kind}:${node.role}`
          : `${node.kind}:${node.role}:${Number(node.ordinal)}`,
      );
      return `${reason}|${mechanicsPath.family}|${nodes.join("/")}`;
    })
    .sort();
}
