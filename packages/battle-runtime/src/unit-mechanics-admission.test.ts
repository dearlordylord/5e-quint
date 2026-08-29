import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import goblinWarriorInput from "../../surface/content/stat_block_goblin_warrior.json";
import rangerRovingInput from "../../surface/content/ranger_roving.json";
import sorcerousRestorationInput from "../../surface/content/sorcerer_sorcerous_restoration.json";
import { unitId } from "@dnd/shared/game-facts";
import { installSrdSurface } from "@dnd/surface/surface/catalog-install";
import {
  SrdUnitRecordSchema,
  decodeSrdSurfaceSync,
} from "@dnd/surface/surface/schema";
import type { SrdSurface, SrdUnitRecord } from "@dnd/surface/surface/types";

import {
  admitCompleteUnitMechanics,
  admitCompleteUnitMechanicsGraph,
} from "./unit-mechanics-admission.ts";

const decodeUnit = (input: unknown): SrdUnitRecord =>
  Schema.decodeUnknownSync(SrdUnitRecordSchema, {
    onExcessProperty: "error",
  })(input);

const roving = decodeUnit(rangerRovingInput);
const baseSurface = decodeSrdSurfaceSync({
  kind: "srd-5.2.1-surface-catalog",
  units: [rangerRovingInput],
  statBlocks: [goblinWarriorInput],
});

function surfaceWithUnit(unit: SrdUnitRecord): SrdSurface {
  return { ...baseSurface, units: [unit] };
}

describe("complete Unit mechanics admission", () => {
  test("admits a complete composite graph independently of authored identity", () => {
    const renamed = decodeUnit({
      ...rangerRovingInput,
      id: unitId("synthetic_spore_stride"),
      name: "Synthetic Spore Stride",
      provenance: {
        ...rangerRovingInput.provenance,
        section: "Synthetic/Spore Stride",
      },
    });

    expect(
      admitCompleteUnitMechanicsGraph({ unit: roving, surface: baseSurface }),
    ).toEqual({ tag: "admitted" });
    expect(
      admitCompleteUnitMechanicsGraph({
        unit: renamed,
        surface: surfaceWithUnit(renamed),
      }),
    ).toEqual({ tag: "admitted" });
  });

  test("rejects the whole composite when an extension branch is unsupported", () => {
    const unsupported = decodeUnit({
      ...rangerRovingInput,
      id: unitId("synthetic_spore_stride_with_unowned_extension"),
      name: "Synthetic Spore Stride With Unowned Extension",
      mechanics: {
        ...rangerRovingInput.mechanics,
        parts: [
          ...rangerRovingInput.mechanics.parts,
          {
            family: "passive" as const,
            grants: [
              {
                kind: "modify_max_hp" as const,
                direction: "increase" as const,
                delta: {
                  kind: "linear_per_level" as const,
                  axis: "class" as const,
                  base: { dice: 0, dieSize: 1, flat: 1 },
                  perLevel: { flat: 1 },
                  startingAtLevel: 3,
                },
              },
            ],
          },
        ],
      },
    });

    const result = admitCompleteUnitMechanicsGraph({
      unit: unsupported,
      surface: surfaceWithUnit(unsupported),
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues).toEqual([
      expect.objectContaining({
        reason: "no_admitted_procedure",
        mechanicsPath: {
          family: "unit",
          nodes: [
            { kind: "singleton", role: "recordMechanics" },
            { kind: "occurrence", role: "extension", ordinal: 3 },
          ],
        },
      }),
    ]);

    const installation = installSrdSurface({
      raw: {
        kind: "srd-5.2.1-surface-catalog",
        units: [
          {
            ...unsupported,
            rulesExcerpt: "Synthetic unsupported Unit publication excerpt.",
          },
        ],
        statBlocks: [
          {
            ...goblinWarriorInput,
            rulesExcerpt: "Synthetic Stat Block publication excerpt.",
          },
        ],
      },
      mechanicsAdmission: {
        admitUnit: admitCompleteUnitMechanics,
        admitStatBlock: () => ({ tag: "admitted" }),
      },
    });
    expect(installation.tag).toBe("rejected");
    expect(installation).not.toHaveProperty("catalog");
  });

  test("accumulates graph dependency and procedure issues without a Runtime Hole", () => {
    const unit = decodeUnit({
      ...sorcerousRestorationInput,
      id: unitId("synthetic_spore_reserve_restoration"),
      name: "Synthetic Spore Reserve Restoration",
    });
    const result = admitCompleteUnitMechanicsGraph({
      unit,
      surface: surfaceWithUnit(unit),
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues.map(({ reason }) => reason)).toEqual([
      "incomplete_graph",
      "no_admitted_procedure",
    ]);
    expect(result.issues[0]?.mechanicsPath.nodes).toEqual([
      { kind: "singleton", role: "recordMechanics" },
      { kind: "occurrence", role: "dependency", ordinal: 1 },
    ]);
    expect(result).not.toHaveProperty("holes");
    expect(result).not.toHaveProperty("catalog");
    expect(result).not.toHaveProperty("status");
  });

  test("participates in the existing atomic catalog installation boundary", () => {
    const renamed = {
      ...rangerRovingInput,
      id: "synthetic_spore_stride_install",
      name: "Synthetic Spore Stride Install",
      provenance: {
        ...rangerRovingInput.provenance,
        section: "Synthetic/Spore Stride Install",
      },
      rulesExcerpt: "Synthetic Unit publication excerpt.",
    };
    const result = installSrdSurface({
      raw: {
        kind: "srd-5.2.1-surface-catalog",
        units: [renamed],
        statBlocks: [
          {
            ...goblinWarriorInput,
            rulesExcerpt: "Synthetic Stat Block publication excerpt.",
          },
        ],
      },
      mechanicsAdmission: {
        admitUnit: admitCompleteUnitMechanics,
        admitStatBlock: () => ({ tag: "admitted" }),
      },
    });

    expect(result.tag).toBe("accepted");
    if (result.tag !== "accepted") return;
    expect(result.catalog.unitCatalog.listUnits()).toHaveLength(1);
    expect(Object.keys(result.catalog)).toEqual([
      "unitCatalog",
      "statBlockCatalog",
    ]);
  });
});
