import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import goblinWarriorInput from "../../surface/content/stat_block_goblin_warrior.json";
import rangerRovingInput from "../../surface/content/ranger_roving.json";
import dragonbornDamageResistanceInput from "../../surface/content/species_dragonborn_damage_resistance.json";
import gnomishLineageInput from "../../surface/content/species_gnome_gnomish_lineage.json";
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

const baseSurface = decodeSrdSurfaceSync({
  kind: "srd-5.2.1-surface-catalog",
  units: [rangerRovingInput],
  statBlocks: [goblinWarriorInput],
});
const roving = baseSurface.units[0];
if (roving === undefined) throw new Error("Expected the decoded Unit fixture.");

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
            family: "passive",
            grants: [
              {
                kind: "modify_max_hp",
                direction: "increase",
                delta: {
                  kind: "linear_per_level",
                  axis: "class",
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

  test("rejects an ignored passive sibling beside a supported resistance", () => {
    const partial = decodeUnit({
      ...dragonbornDamageResistanceInput,
      id: unitId("synthetic_spore_resistance_with_ignored_vitality"),
      name: "Synthetic Spore Resistance With Ignored Vitality",
      mechanics: {
        family: "passive",
        grants: [
          { kind: "grant_resistance", damageType: "poison" },
          {
            kind: "modify_max_hp",
            direction: "increase",
            delta: {
              kind: "linear_per_level",
              axis: "character",
              base: { dice: 0, dieSize: 1, flat: 1 },
              perLevel: { flat: 1 },
              startingAtLevel: 1,
            },
          },
        ],
      },
    });

    const result = admitCompleteUnitMechanicsGraph({
      unit: partial,
      surface: surfaceWithUnit(partial),
    });

    expect(result).toEqual({
      tag: "rejected",
      issues: [
        {
          reason: "unsupported_mechanics",
          mechanicsPath: {
            family: "unit",
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "occurrence", role: "effect", ordinal: 2 },
            ],
          },
          message:
            "The passive effect is represented in the authored graph but is not consumed by an admitted execution profile.",
        },
      ],
    });
  });

  test("rejects a missing schema-declared authored dependency", () => {
    const missingSpellId = unitId("synthetic_missing_spore_spell");
    const partial = decodeUnit({
      ...dragonbornDamageResistanceInput,
      id: unitId("synthetic_spore_resistance_with_missing_spell"),
      name: "Synthetic Spore Resistance With Missing Spell",
      mechanics: {
        family: "passive",
        grants: [
          { kind: "grant_resistance", damageType: "poison" },
          {
            kind: "grant_spell_access",
            mode: "prepared",
            spellId: missingSpellId,
          },
        ],
      },
    });

    const result = admitCompleteUnitMechanicsGraph({
      unit: partial,
      surface: surfaceWithUnit(partial),
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues).toEqual([
      expect.objectContaining({
        reason: "incomplete_graph",
        mechanicsPath: {
          family: "unit",
          nodes: [
            { kind: "singleton", role: "recordMechanics" },
            { kind: "occurrence", role: "dependency", ordinal: 1 },
          ],
        },
        message:
          "The Unit spell-reference authored dependency does not resolve to an installed unit.",
      }),
      expect.objectContaining({
        reason: "unsupported_mechanics",
        mechanicsPath: {
          family: "unit",
          nodes: [
            { kind: "singleton", role: "recordMechanics" },
            { kind: "occurrence", role: "effect", ordinal: 2 },
          ],
        },
      }),
    ]);
  });

  test("traverses and rejects a missing schema-declared authored reference", () => {
    const missingSpellId = unitId("synthetic_missing_clockwork_trigger_spell");
    const unit = decodeUnit({
      ...gnomishLineageInput,
      id: unitId("synthetic_spore_lineage"),
      name: "Synthetic Spore Lineage",
      mechanics: {
        ...gnomishLineageInput.mechanics,
        options: gnomishLineageInput.mechanics.options.map((option) =>
          "clockworkDevice" in option
            ? {
                ...option,
                clockworkDevice: {
                  ...option.clockworkDevice,
                  creation: {
                    ...option.clockworkDevice.creation,
                    trigger: {
                      ...option.clockworkDevice.creation.trigger,
                      spellId: missingSpellId,
                    },
                  },
                },
              }
            : option,
        ),
      },
    });

    const result = admitCompleteUnitMechanicsGraph({
      unit,
      surface: surfaceWithUnit(unit),
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        reason: "incomplete_graph",
        mechanicsPath: expect.objectContaining({
          family: "unit",
          nodes: expect.arrayContaining([
            expect.objectContaining({ role: "reference" }),
          ]),
        }),
        message:
          "The Unit spell-reference authored reference does not resolve to an installed unit.",
      }),
    );
  });

  test.each([
    {
      name: "absent",
      surfaceUnit: decodeUnit({
        ...rangerRovingInput,
        id: unitId("synthetic_spore_stride_other_root"),
        name: "Synthetic Spore Stride Other Root",
      }),
      message: "The Unit admission root is absent from the decoded Surface.",
    },
    {
      name: "mismatched",
      surfaceUnit: decodeUnit({
        ...rangerRovingInput,
        name: "Synthetic Spore Stride Mismatched Root",
      }),
      message:
        "The Unit admission root does not match the decoded Surface member with that authored identity.",
    },
  ])("rejects an $name Unit root", ({ surfaceUnit, message }) => {
    const result = admitCompleteUnitMechanicsGraph({
      unit: roving,
      surface: surfaceWithUnit(surfaceUnit),
    });

    expect(result).toEqual({
      tag: "rejected",
      issues: [
        {
          reason: "incomplete_graph",
          mechanicsPath: {
            family: "unit",
            nodes: [{ kind: "singleton", role: "recordMechanics" }],
          },
          message,
        },
      ],
    });
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
