import { Either } from "effect";
import { describe, expect, test } from "vitest";

import cloakOfProtectionInput from "../../content/cloak_of_protection.json";
import adamantineArmorInput from "../../content/magic_item_adamantine_armor.json";
import ammunitionTemplateInput from "../../content/magic_item_ammunition_1_2_or_3.json";
import sentinelShieldInput from "../../content/magic_item_sentinel_shield.json";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readMagicInitiateSpellAccessSourceFacts,
  readOrcSpeciesCreationFacts,
  readSpeciesCreationFacts,
} from "./character-creation-readers.ts";
import { srdSurface } from "./surface-catalog.ts";
import {
  SRD_SURFACE_SCHEMA_BOUNDS,
  SRD_SURFACE_SCHEMA_SIZE,
  surfacePublicationSchemaDefinitionCount,
} from "./publication-artifacts.ts";
import {
  decodeArmorRecordSync,
  decodeArmorTemplateRecordSync,
  decodeBackgroundRecordSync,
  decodeClassFeatureRecordSync,
  decodeClassRecordSync,
  decodeFeatRecordSync,
  decodeMagicItemRecordSync,
  decodeMasteryRecordSync,
  decodeMonsterStatBlockSync,
  decodeShieldRecordSync,
  decodeShieldTemplateRecordSync,
  decodeSpeciesRecordSync,
  decodeSpeciesTraitRecordSync,
  decodeSpellRecordSync,
  decodeSrdSurfaceEither,
  decodeSubclassRecordSync,
  decodeUnitRecordEither,
  decodeWeaponRecordSync,
  decodeWeaponTemplateRecordSync,
  formatSurfaceDecodeError,
  readSurfaceSchemaRole,
  SrdProvenanceSchema,
  SrdSurfaceJsonSchema,
  surfaceSchemaRolesEqual,
} from "./schema.ts";
import {
  favoredEnemyHuntersMarkFreeCastProjectionForUnit,
  isSupportedClassFeatureSpellFreeCastResourceTag,
  spellHasTopLevelCastingTime,
  spellHasTopLevelRitualTag,
  supportedClassFeatureSpellFreeCastProjectionForUnit,
  topLevelSpellCastingTime,
  type SpellRecord,
  type UnitRecord,
} from "./types.ts";

function requireSrdUnit(
  predicate: (unit: UnitRecord) => boolean,
  description: string,
): UnitRecord {
  const unit = srdSurface.units.find(predicate);
  expect(unit, `Missing canonical ${description} fixture`).toBeDefined();
  if (unit === undefined) {
    throw new Error(`Missing canonical ${description} fixture`);
  }
  return unit;
}

function requireSrdSpell(id: string): SpellRecord {
  const unit = requireSrdUnit(
    (candidate) => candidate.kind === "spell" && candidate.id === id,
    `Spell ${id}`,
  );
  expect(unit.kind).toBe("spell");
  if (unit.kind !== "spell") {
    throw new Error(`Canonical Unit ${id} is not a Spell`);
  }
  return unit;
}

describe("SRD Surface publication schema", () => {
  test("counts schemas with and without reusable definitions", () => {
    expect(surfacePublicationSchemaDefinitionCount({})).toBe(0);
    expect(
      surfacePublicationSchemaDefinitionCount({
        $defs: { first: {}, second: {} },
      }),
    ).toBe(2);
  });

  test("decodes every public Unit and monster record family from canonical records", () => {
    const unitDecoders = [
      ["spell", decodeSpellRecordSync],
      ["class_feature", decodeClassFeatureRecordSync],
      ["class", decodeClassRecordSync],
      ["subclass", decodeSubclassRecordSync],
      ["background", decodeBackgroundRecordSync],
      ["species", decodeSpeciesRecordSync],
      ["mastery", decodeMasteryRecordSync],
      ["feat", decodeFeatRecordSync],
      ["species_trait", decodeSpeciesTraitRecordSync],
      ["armor", decodeArmorRecordSync],
      ["shield", decodeShieldRecordSync],
      ["weapon", decodeWeaponRecordSync],
    ] as const;

    for (const [kind, decode] of unitDecoders) {
      const unit = requireSrdUnit(
        (candidate) => candidate.kind === kind,
        `${kind} Unit`,
      );
      expect(decode(unit)).toEqual(unit);
    }

    expect(decodeMagicItemRecordSync(cloakOfProtectionInput)).toMatchObject({
      kind: "magic_item",
    });
    expect(decodeArmorTemplateRecordSync(adamantineArmorInput)).toMatchObject({
      kind: "armor_template",
    });
    expect(decodeShieldTemplateRecordSync(sentinelShieldInput)).toMatchObject({
      kind: "shield_template",
    });
    expect(
      decodeWeaponTemplateRecordSync(ammunitionTemplateInput),
    ).toMatchObject({
      kind: "weapon_template",
    });

    const monster = srdSurface.statBlocks[0];
    expect(decodeMonsterStatBlockSync(monster.statBlock)).toEqual(
      monster.statBlock,
    );
  });

  test("reads top-level casting-time and ritual facts without assuming every Spell family has them", () => {
    const animalMessenger = requireSrdSpell("animal_messenger");
    const acidArrow = requireSrdSpell("acid_arrow");
    const plantGrowth = requireSrdSpell("plant_growth");

    expect(topLevelSpellCastingTime(animalMessenger.mechanics)).toMatchObject({
      ritual: true,
    });
    expect(spellHasTopLevelCastingTime(animalMessenger)).toBe(true);
    expect(spellHasTopLevelRitualTag(animalMessenger)).toBe(true);
    expect(spellHasTopLevelRitualTag(acidArrow)).toBe(false);
    expect(topLevelSpellCastingTime(plantGrowth.mechanics)).toBeNull();
    expect(spellHasTopLevelCastingTime(plantGrowth)).toBe(false);
    expect(spellHasTopLevelRitualTag(plantGrowth)).toBe(false);
  });

  test("reads supported class-feature free-cast grants from their retained facts", () => {
    const favoredEnemy = requireSrdUnit(
      (unit) => unit.id === "ranger_favored_enemy",
      "Ranger Favored Enemy feature",
    );
    const paladinsSmite = requireSrdUnit(
      (unit) => unit.id === "paladin_paladins_smite",
      "Paladin's Smite feature",
    );
    const fighterClass = requireSrdUnit(
      (unit) => unit.id === "class_fighter",
      "Fighter class",
    );
    const dangerSense = requireSrdUnit(
      (unit) => unit.id === "barbarian_danger_sense",
      "Barbarian Danger Sense feature",
    );
    expect(
      isSupportedClassFeatureSpellFreeCastResourceTag(
        "favoredEnemyHuntersMarkFreeCasts",
      ),
    ).toBe(true);
    expect(isSupportedClassFeatureSpellFreeCastResourceTag("unknown")).toBe(
      false,
    );
    expect(isSupportedClassFeatureSpellFreeCastResourceTag(1)).toBe(false);
    expect(
      favoredEnemyHuntersMarkFreeCastProjectionForUnit(favoredEnemy),
    ).toMatchObject({
      preparedSpellGrant: {
        kind: "grant_spell_access",
        spellId: "hunters_mark",
      },
      freeCastGrant: {
        kind: "grant_spell_free_casts",
        spellId: "hunters_mark",
      },
    });
    expect(
      favoredEnemyHuntersMarkFreeCastProjectionForUnit(paladinsSmite),
    ).toBeNull();
    expect(
      supportedClassFeatureSpellFreeCastProjectionForUnit(fighterClass),
    ).toBeNull();
    expect(
      supportedClassFeatureSpellFreeCastProjectionForUnit(dangerSense),
    ).toBeNull();
    expect(
      supportedClassFeatureSpellFreeCastProjectionForUnit({
        ...dangerSense,
        provenance: {
          kind: "synthetic-test",
          section: "Synthetic Tests/Unsupported Free Cast Profile",
        },
      }),
    ).toBeNull();
    if (
      favoredEnemy.kind !== "class_feature" ||
      favoredEnemy.mechanics.family !== "passive"
    ) {
      throw new Error("Favored Enemy support-profile fixture changed shape");
    }
    expect(
      supportedClassFeatureSpellFreeCastProjectionForUnit({
        ...favoredEnemy,
        mechanics: {
          ...favoredEnemy.mechanics,
          grants: favoredEnemy.mechanics.grants.filter(
            (grant) => grant.kind !== "grant_spell_free_casts",
          ),
        },
      }),
    ).toBeNull();
  });

  test("reads Magic Initiate spell-access facts and rejects unrelated canonical Units", () => {
    const magicInitiate = requireSrdUnit(
      (unit) => unit.id === "feat_magic_initiate_wizard",
      "Magic Initiate (Wizard) feat",
    );
    const fighterClass = requireSrdUnit(
      (unit) => unit.id === "class_fighter",
      "Fighter class",
    );
    const alert = requireSrdUnit((unit) => unit.id === "alert", "Alert feat");

    expect(readMagicInitiateSpellAccessSourceFacts(magicInitiate)).toEqual({
      tag: "readable",
      value: {
        recordId: "feat_magic_initiate_wizard",
        spellList: "wizard",
        selectedCantrips: { count: 2, spellLevel: 0 },
        selectedLevelOneSpell: {
          access: [
            "always_prepared",
            "one_free_cast_per_long_rest",
            "spell_slot_cast",
          ],
          count: 1,
          spellLevel: 1,
        },
        spellcastingAbilityOptions: ["int", "wis", "cha"],
      },
    });
    expect(readMagicInitiateSpellAccessSourceFacts(fighterClass)).toEqual({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedUnitKind",
          message: "Expected magic_initiate feat record, received class.",
          unitId: "class_fighter",
        },
      ],
    });
    expect(readMagicInitiateSpellAccessSourceFacts(alert)).toMatchObject({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedUnitKind",
          message: "Expected magic_initiate feat record, received feat.",
        },
      ],
    });
  });

  test("returns typed unreadable results when creation readers receive another canonical Unit family", () => {
    const spell = requireSrdSpell("acid_arrow");
    const cases = [
      {
        read: readClassCreationFacts,
        expectedKind: "class",
      },
      {
        read: readBackgroundCreationFacts,
        expectedKind: "background",
      },
      {
        read: readSpeciesCreationFacts,
        expectedKind: "species",
      },
      {
        read: readOrcSpeciesCreationFacts,
        expectedKind: "species",
      },
    ] as const;

    for (const { read, expectedKind } of cases) {
      expect(read(spell)).toEqual({
        tag: "unreadable",
        issues: [
          {
            code: "unsupportedUnitKind",
            message: `Expected ${expectedKind} record, received spell.`,
            unitId: "acid_arrow",
          },
        ],
      });
    }
  });

  test("formats public decoder errors for boundary diagnostics", () => {
    const result = decodeUnitRecordEither({ kind: "synthetic-test" });
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(formatSurfaceDecodeError(result.left)).toContain("UnitRecord");
    }
  });

  test("publishes distinct Unit and Stat Block collections", () => {
    expect(srdSurface.kind).toBe("srd-5.2.1-surface-catalog");
    expect(srdSurface.units.length).toBeGreaterThan(0);
    expect(srdSurface.statBlocks.length).toBeGreaterThan(0);
    expect(
      srdSurface.statBlocks.every((record) => record.kind === "statBlock"),
    ).toBe(true);
    expect(
      srdSurface.units.every(
        (record) => record.provenance.kind === "srd-5.2.1",
      ),
    ).toBe(true);
    expect(
      srdSurface.statBlocks.every(
        (record) => record.provenance.kind === "srd-5.2.1",
      ),
    ).toBe(true);
  });

  test("rejects non-SRD member provenance at the aggregate boundary", () => {
    const firstUnit = srdSurface.units[0];
    const result = decodeSrdSurfaceEither({
      ...srdSurface,
      units: [
        {
          ...firstUnit,
          provenance: { kind: "synthetic-test", section: "synthetic-test" },
        },
      ],
    });

    expect(Either.isLeft(result)).toBe(true);
  });

  test("preserves the canonical provenance role while narrowing to SRD", () => {
    expect(
      readSurfaceSchemaRole(SrdProvenanceSchema.fields.section.ast),
    ).toEqual({ category: "provenance" });
  });

  test("compares schema roles by their canonical semantic key", () => {
    expect(
      surfaceSchemaRolesEqual(
        { category: "identity", kind: "id" },
        { category: "identity", kind: "id" },
      ),
    ).toBe(true);
    expect(
      surfaceSchemaRolesEqual(
        { category: "identity", kind: "id" },
        { category: "identity", kind: "name" },
      ),
    ).toBe(false);
    expect(
      surfaceSchemaRolesEqual(
        { category: "identity", kind: "id" },
        { category: "unknown" },
      ),
    ).toBe(false);
  });

  test("rejects unknown properties instead of stripping them", () => {
    const firstUnit = srdSurface.units[0];
    const aggregateResult = decodeSrdSurfaceEither({
      ...srdSurface,
      units: [{ ...firstUnit, unknownProperty: true }],
    });
    const recordResult = decodeUnitRecordEither({
      ...firstUnit,
      unknownProperty: true,
    });

    expect(Either.isLeft(aggregateResult)).toBe(true);
    expect(Either.isLeft(recordResult)).toBe(true);
  });

  test("keeps top-level presentation prose out of canonical Unit records", () => {
    const firstUnit = srdSurface.units[0];

    expect("description" in firstUnit).toBe(false);
    expect(
      Either.isLeft(
        decodeUnitRecordEither({
          ...firstUnit,
          description: "Handwritten presentation prose.",
        }),
      ),
    ).toBe(true);
  });

  test("rejects empty or whitespace-only Unit ids", () => {
    const firstUnit = srdSurface.units[0];
    expect(
      Either.isLeft(decodeUnitRecordEither({ ...firstUnit, id: "" })),
    ).toBe(true);
    expect(
      Either.isLeft(decodeUnitRecordEither({ ...firstUnit, id: "   " })),
    ).toBe(true);
  });

  test("rejects empty catalog collections", () => {
    const result = decodeSrdSurfaceEither({
      ...srdSurface,
      units: [],
      statBlocks: [],
    });

    expect(Either.isLeft(result)).toBe(true);
  });

  test("is Draft 2020-12 and closes generated object schemas", () => {
    expect(SrdSurfaceJsonSchema.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );

    const visit = (value: unknown, skipCurrentObjectClosure = false): void => {
      if (Array.isArray(value)) {
        value.forEach((entry) => visit(entry));
        return;
      }
      if (typeof value !== "object" || value === null) return;

      const record = value as Record<string, unknown>;
      if (record.type === "object" && !skipCurrentObjectClosure) {
        expect(record.additionalProperties).toBe(false);
      }
      Object.entries(record).forEach(([key, entry]) => {
        if (key === "allOf" && Array.isArray(entry)) {
          entry.forEach((member) => visit(member, true));
          return;
        }
        visit(entry);
      });
    };

    visit(SrdSurfaceJsonSchema);

    const generated = requireRecord(SrdSurfaceJsonSchema, "root schema");
    const properties = requireRecord(
      generated.properties,
      "root schema properties",
    );
    const units = requireRecord(properties.units, "units property");
    const statBlocks = requireRecord(
      properties.statBlocks,
      "stat blocks property",
    );
    expect(requireRecord(units.items, "units items").$ref).toBe(
      "#/$defs/PublishedSrdUnitPublicationEncoded",
    );
    expect(requireRecord(statBlocks.items, "stat blocks items").$ref).toBe(
      "#/$defs/PublishedSrdStatBlockPublicationEncoded",
    );
    expect(
      JSON.stringify(SrdSurfaceJsonSchema.$defs).includes('"srd-5.2.1"'),
    ).toBe(true);
  });

  test("keeps the published graph within its bounded named-reference shape", () => {
    const schema = requireRecord(SrdSurfaceJsonSchema, "root schema");
    const definitions = requireRecord(schema.$defs, "root schema definitions");

    expect(Object.keys(definitions).length).toBe(
      SRD_SURFACE_SCHEMA_SIZE.definitions,
    );
    expect(SRD_SURFACE_SCHEMA_SIZE.definitions).toBeLessThan(
      SRD_SURFACE_SCHEMA_BOUNDS.definitions,
    );
    expect(SRD_SURFACE_SCHEMA_SIZE.bytes).toBeLessThan(
      SRD_SURFACE_SCHEMA_BOUNDS.bytes,
    );
  });
});

function requireRecord(
  value: unknown,
  label: string,
): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) {
    throw new Error(`Expected ${label} to be an object.`);
  }
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
