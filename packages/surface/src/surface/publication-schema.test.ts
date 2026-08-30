import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Schema } from "effect";
import { describe, expect, test } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";

import adamantineArmorInput from "../../content/magic_item_adamantine_armor.json";
import bagOfHoldingInput from "../../content/magic_item_bag_of_holding.json";
import cloakOfProtectionInput from "../../content/cloak_of_protection.json";
import ammunitionTemplateInput from "../../content/magic_item_ammunition_1_2_or_3.json";
import magicMouthInput from "../../content/magic_mouth.json";
import sentinelShieldInput from "../../content/magic_item_sentinel_shield.json";
import { SRD_SURFACE_PUBLICATION_FILE_NAMES } from "./publication-artifacts.ts";
import {
  AnchoredTriggerMechanicsSchema,
  PassiveMechanicsSchema,
  PublishedSrdSurfaceSchema,
  SrdSurfaceJsonSchema,
  SubclassRecordSchema,
  SrdUnitRecordSchema,
  UNIT_RECORD_MEMBER_SCHEMAS,
  UnitRecordSchema,
  type PublishedSrdSurface,
} from "./schema.ts";

const syntheticMagicItemVariantsInput = {
  id: "synthetic_magic_item_variants",
  name: "Synthetic Variant Item",
  provenance: {
    kind: "synthetic-test",
    section: "publication-schema-test",
  },
  kind: "magic_item",
  defaultAttunement: { requiresAttunement: false },
  variants: [
    {
      id: "synthetic_magic_item_variant",
      name: "Synthetic Variant",
      rarity: "common",
      mechanics: { family: "passive", grants: [] },
      destruction: { kind: "none" },
    },
  ],
};

const canonicalVariantInputs = (
  aggregate: PublishedSrdSurface,
): ReadonlyArray<unknown> => [
  ...aggregate.units,
  bagOfHoldingInput,
  cloakOfProtectionInput,
  syntheticMagicItemVariantsInput,
  adamantineArmorInput,
  sentinelShieldInput,
  ammunitionTemplateInput,
];

const readPublishedAggregate = () => {
  const aggregatePath = fileURLToPath(
    new URL(
      `../../publication/${SRD_SURFACE_PUBLICATION_FILE_NAMES.aggregate}`,
      import.meta.url,
    ),
  );
  return JSON.parse(readFileSync(aggregatePath, "utf8"));
};

describe("committed SRD Surface publication", () => {
  test("publishes generated rules excerpts without canonical descriptions", () => {
    const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
      readPublishedAggregate(),
    );

    for (const record of [...aggregate.units, ...aggregate.statBlocks]) {
      expect(record).not.toHaveProperty("description");
      expect(record.rulesExcerpt.trim().length).toBeGreaterThan(0);
    }
  });

  test("specializes and decodes every canonical concrete UnitRecord member", () => {
    const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
      readPublishedAggregate(),
    );
    const inputs = canonicalVariantInputs(aggregate);

    expect(UNIT_RECORD_MEMBER_SCHEMAS).toHaveLength(43);
    for (const [index, memberSchema] of UNIT_RECORD_MEMBER_SCHEMAS.entries()) {
      const input = inputs.find((candidate) =>
        Schema.is(memberSchema)(candidate),
      );
      expect(
        input,
        `Missing canonical UnitRecord member ${index}`,
      ).toBeDefined();
      if (input === undefined) continue;

      expect(() =>
        Schema.decodeUnknownSync(UnitRecordSchema)(input),
      ).not.toThrow();
      if (index !== 34) {
        expect(() =>
          Schema.decodeUnknownSync(SrdUnitRecordSchema)(input),
        ).not.toThrow();
      }
    }
  });

  test("retains list-prepared and Pact Magic class progression checks", () => {
    const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
      readPublishedAggregate(),
    );
    const listPreparedClass = aggregate.units.find(
      (record) =>
        record.kind === "class" &&
        record.className === "bard" &&
        record.spellcasting?.kind ===
          "list_prepared_spellcasting_progression_creation",
    );
    expect(listPreparedClass).toBeDefined();
    if (
      listPreparedClass === undefined ||
      listPreparedClass.kind !== "class" ||
      listPreparedClass.spellcasting?.kind !==
        "list_prepared_spellcasting_progression_creation"
    ) {
      return;
    }

    const invalidListPreparedClass = {
      ...listPreparedClass,
      spellcasting: {
        ...listPreparedClass.spellcasting,
        spellcastingAbility: "wis",
      },
    };
    expect(() =>
      Schema.decodeUnknownSync(SrdUnitRecordSchema)(invalidListPreparedClass),
    ).toThrow();

    const pactMagicClass = aggregate.units.find(
      (record) =>
        record.kind === "class" &&
        record.className === "warlock" &&
        record.spellcasting?.kind === "pact_magic_spellcasting_creation",
    );
    expect(pactMagicClass).toBeDefined();
    if (
      pactMagicClass === undefined ||
      pactMagicClass.kind !== "class" ||
      pactMagicClass.spellcasting?.kind !== "pact_magic_spellcasting_creation"
    ) {
      return;
    }

    const invalidPactMagicClass = {
      ...pactMagicClass,
      spellcasting: {
        ...pactMagicClass.spellcasting,
        pactSlotProjection: {
          ...pactMagicClass.spellcasting.pactSlotProjection,
          count: 2,
        },
      },
    };
    expect(() =>
      Schema.decodeUnknownSync(SrdUnitRecordSchema)(invalidPactMagicClass),
    ).toThrow();
  });

  test("allocates fresh arrays for decoding defaults", () => {
    const firstPassive = Schema.decodeUnknownSync(PassiveMechanicsSchema)({
      family: "passive",
    });
    const secondPassive = Schema.decodeUnknownSync(PassiveMechanicsSchema)({
      family: "passive",
    });
    expect(firstPassive.grants).toEqual([]);
    expect(firstPassive.grants).not.toBe(secondPassive.grants);

    const firstSubclass = Schema.decodeUnknownSync(SubclassRecordSchema)({
      id: "synthetic_subclass",
      name: "Synthetic Subclass",
      provenance: {
        kind: "synthetic-test",
        section: "publication-schema-test",
      },
      kind: "subclass",
      className: "barbarian",
    });
    const secondSubclass = Schema.decodeUnknownSync(SubclassRecordSchema)({
      id: "synthetic_subclass",
      name: "Synthetic Subclass",
      provenance: {
        kind: "synthetic-test",
        section: "publication-schema-test",
      },
      kind: "subclass",
      className: "barbarian",
    });
    expect(firstSubclass.featureGrants).toEqual([]);
    expect(firstSubclass.featureGrants).not.toBe(secondSubclass.featureGrants);

    const firstAnchored = Schema.decodeUnknownSync(
      AnchoredTriggerMechanicsSchema,
    )(magicMouthInput.mechanics);
    const secondAnchored = Schema.decodeUnknownSync(
      AnchoredTriggerMechanicsSchema,
    )(magicMouthInput.mechanics);
    expect(firstAnchored.filters).toEqual([]);
    expect(firstAnchored.filters).not.toBe(secondAnchored.filters);
  });

  test("round-trips the encoded publication wire shape", () => {
    const encoded = readPublishedAggregate();
    const decoded = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
      encoded,
    );
    expect(Schema.encodeSync(PublishedSrdSurfaceSchema)(decoded)).toEqual(
      encoded,
    );
  });

  test("validates the encoded aggregate with the generated JSON schema", () => {
    const decoded = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
      readPublishedAggregate(),
    );
    const encoded = Schema.encodeSync(PublishedSrdSurfaceSchema)(decoded);
    const validate = new Ajv2020({
      strict: false,
      inlineRefs: false,
      code: { optimize: 0 },
    }).compile(SrdSurfaceJsonSchema);

    expect(validate(encoded), JSON.stringify(validate.errors)).toBe(true);
  }, 180_000);

  test("compiles and validates with an independent Draft 2020-12 validator", () => {
    const schemaPath = fileURLToPath(
      new URL(
        `../../publication/${SRD_SURFACE_PUBLICATION_FILE_NAMES.schema}`,
        import.meta.url,
      ),
    );
    const aggregatePath = fileURLToPath(
      new URL(
        `../../publication/${SRD_SURFACE_PUBLICATION_FILE_NAMES.aggregate}`,
        import.meta.url,
      ),
    );
    const result = execFileSync(
      process.execPath,
      [
        "--max-old-space-size=512",
        "--input-type=module",
        "--eval",
        `
          import { readFileSync } from "node:fs";
          import Ajv2020 from "ajv/dist/2020.js";
          const schema = JSON.parse(readFileSync(${JSON.stringify(schemaPath)}, "utf8"));
          const aggregate = JSON.parse(readFileSync(${JSON.stringify(aggregatePath)}, "utf8"));
          // Effect's NonEmptyArray is emitted as a legal Draft 2020-12 tuple
          // (prefixItems plus items) without Ajv's optional strict-tuple
          // warning metadata. The published root collections use minItems(1)
          // directly in the canonical graph; validate the document under the
          // independent Draft 2020-12 implementation without that warning mode.
          const validate = new Ajv2020({ strict: false, inlineRefs: false, code: { optimize: 0 } }).compile(schema);
          if (!validate(aggregate)) {
            console.error(JSON.stringify(validate.errors));
            process.exit(1);
          }
          const withFirstUnit = (change) => ({
            ...aggregate,
            units: [change(aggregate.units[0]), ...aggregate.units.slice(1)],
          });
          const withFirstStatBlock = (change) => ({
            ...aggregate,
            statBlocks: [change(aggregate.statBlocks[0]), ...aggregate.statBlocks.slice(1)],
          });
          const invalidCases = {
            unknownProperty: withFirstUnit((unit) => ({ ...unit, unknownProperty: true })),
            nonSrdProvenance: withFirstUnit((unit) => ({
              ...unit,
              provenance: { ...unit.provenance, kind: "synthetic-test" },
            })),
            emptyCollections: { ...aggregate, units: [], statBlocks: [] },
            statBlockInUnits: { ...aggregate, units: [aggregate.statBlocks[0]] },
            unitInStatBlocks: { ...aggregate, statBlocks: [aggregate.units[0]] },
            emptyImmunities: withFirstStatBlock((statBlock) => ({
              ...statBlock,
              statBlock: { ...statBlock.statBlock, immunities: {} },
            })),
            contradictoryImmunities: withFirstStatBlock((statBlock) => ({
              ...statBlock,
              statBlock: {
                ...statBlock.statBlock,
                immunities: {
                  conditions: ["charmed"],
                  qualifiedConditions: [{ condition: "charmed", qualifier: "from a synthetic source" }],
                },
              },
            })),
          };
          const validMixedImmunities = withFirstStatBlock((statBlock) => ({
            ...statBlock,
            statBlock: {
              ...statBlock.statBlock,
              immunities: {
                damageTypes: ["fire"],
                conditions: ["poisoned"],
                qualifiedConditions: [{ condition: "charmed", qualifier: "from a synthetic source" }],
              },
            },
          }));
          if (!validate(validMixedImmunities)) {
            console.error("distinct mixed immunities were rejected: " + JSON.stringify(validate.errors));
            process.exit(1);
          }
          for (const [name, invalid] of Object.entries(invalidCases)) {
            if (validate(invalid)) {
              console.error(name + " was accepted");
              process.exit(1);
            }
          }
          console.log("valid; rejected " + Object.keys(invalidCases).join(","));
        `,
      ],
      { encoding: "utf8", timeout: 120_000 },
    );

    expect(result.trim()).toBe(
      "valid; rejected unknownProperty,nonSrdProvenance,emptyCollections,statBlockInUnits,unitInStatBlocks,emptyImmunities,contradictoryImmunities",
    );
  }, 180_000);
});
