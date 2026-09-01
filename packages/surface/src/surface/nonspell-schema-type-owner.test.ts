import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import grapplerInput from "../../content/feat_grappler.json";
import barbarianBrutalStrikeInput from "../../content/barbarian_brutal_strike.json";
import barbarianWeaponMasteryInput from "../../content/barbarian_weapon_mastery.json";
import {
  PublishedSrdUnitRecordSchema,
  decodeUnitRecordSync,
} from "./schema.ts";

describe("canonical non-Spell Surface type owner", () => {
  test("parses the canonical Feat and its published SRD projection", () => {
    const record = decodeUnitRecordSync(grapplerInput);
    const publicationInput = {
      ...grapplerInput,
      rulesExcerpt: "Synthetic publication-boundary evidence.",
    };
    const published = Schema.decodeUnknownSync(PublishedSrdUnitRecordSchema)(
      publicationInput,
    );

    expect(record.kind).toBe("feat");
    expect(published).toMatchObject(record);
    expect(Schema.encodeSync(PublishedSrdUnitRecordSchema)(published)).toEqual(
      publicationInput,
    );
  });

  test("parses general and specialized Barbarian features through one named record domain", () => {
    const weaponMastery = decodeUnitRecordSync(barbarianWeaponMasteryInput);
    const brutalStrike = decodeUnitRecordSync(barbarianBrutalStrikeInput);

    expect(weaponMastery).toMatchObject({
      kind: "class_feature",
      className: "barbarian",
      mechanics: { family: "weapon_mastery_choice" },
    });
    expect(brutalStrike).toMatchObject({
      kind: "class_feature",
      className: "barbarian",
      mechanics: { family: "brutal_strike" },
    });
  });
});
