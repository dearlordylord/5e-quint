import { describe, expect, test } from "vitest";

import {
  findFamiliarFormEligibilityForSpell,
  isFindFamiliarCreatureTypeOverride,
  pactOfTheChainFindFamiliarFormEligibilityForSpell,
  resolveFindFamiliarForm,
  resolveFindFamiliarSelectedForm,
  resolvePactOfTheChainFindFamiliarForm,
} from "./find-familiar-forms.ts";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "./installed-srd-stat-block-catalog.ts";
import type { SpellRecord } from "./types.ts";
import { srdUnitCollection } from "./unit-catalog.ts";

function findFamiliarSpell(): SpellRecord {
  for (const unit of srdUnitCollection.units) {
    if (
      unit.kind === "spell" &&
      unit.mechanics.family === "spawned_creature" &&
      unit.mechanics.creature.kind === "familiar_form_catalog"
    ) {
      return unit;
    }
  }
  throw new Error("The SRD catalog must contain Find Familiar.");
}

function statBlockCatalog() {
  const result = buildStatBlockCatalog({
    collections: [srdStatBlockCollection],
  });
  if (result.tag === "invalid") {
    throw new Error("The checked-in SRD Stat Block catalog must be valid.");
  }
  return result.catalog;
}

describe("Find Familiar form selection", () => {
  test("admits the SRD form catalog and resolves each selection family", () => {
    const spell = findFamiliarSpell();
    const catalog = statBlockCatalog();
    const eligibility = findFamiliarFormEligibilityForSpell(spell);
    const pactEligibility =
      pactOfTheChainFindFamiliarFormEligibilityForSpell(spell);
    expect(eligibility).not.toBeNull();
    expect(pactEligibility).not.toBeNull();
    if (eligibility === null || pactEligibility === null) return;

    const normalForm = eligibility.normalForms[0];
    const creatureTypeChoice = eligibility.creatureTypeOverrideChoices[0];
    const specialForm = pactEligibility.specialForms[0];
    expect(normalForm).toBeDefined();
    expect(creatureTypeChoice).toBeDefined();
    expect(specialForm).toBeDefined();
    if (
      normalForm === undefined ||
      creatureTypeChoice === undefined ||
      specialForm === undefined
    ) {
      return;
    }

    expect(
      resolveFindFamiliarForm({
        catalog,
        eligibility,
        selection: {
          tag: "normalNamedForm",
          formId: normalForm.formId,
        },
        creatureTypeOverrideChoiceId: creatureTypeChoice.optionId,
      }),
    ).toMatchObject({ tag: "resolved" });

    expect(
      resolveFindFamiliarSelectedForm({
        catalog,
        eligibility,
        selection: {
          tag: "challengeRatingZeroBeast",
          statBlockId: normalForm.statBlockId,
        },
        creatureTypeOverride: creatureTypeChoice.creatureType,
      }),
    ).toMatchObject({ tag: "resolved" });

    expect(
      resolvePactOfTheChainFindFamiliarForm({
        catalog,
        eligibility: pactEligibility,
        selection: {
          tag: "pactOfTheChainSpecialForm",
          formId: specialForm.formId,
        },
        creatureTypeOverrideChoiceId: creatureTypeChoice.optionId,
      }),
    ).toMatchObject({ tag: "resolved" });

    expect(
      resolvePactOfTheChainFindFamiliarForm({
        catalog,
        eligibility: pactEligibility,
        selection: {
          tag: "normalNamedForm",
          formId: normalForm.formId,
        },
        creatureTypeOverrideChoiceId: creatureTypeChoice.optionId,
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("rejects spells outside the familiar-form catalog family", () => {
    const unrelatedSpell = srdUnitCollection.units.find(
      (unit) => unit.kind === "spell" && unit.mechanics.family === "activation",
    );
    const otherSpawnedCreature = srdUnitCollection.units.find(
      (unit) =>
        unit.kind === "spell" &&
        unit.mechanics.family === "spawned_creature" &&
        unit.mechanics.creature.kind !== "familiar_form_catalog",
    );
    expect(unrelatedSpell).toBeDefined();
    expect(otherSpawnedCreature).toBeDefined();
    if (
      unrelatedSpell === undefined ||
      unrelatedSpell.kind !== "spell" ||
      otherSpawnedCreature === undefined ||
      otherSpawnedCreature.kind !== "spell"
    ) {
      return;
    }

    expect(findFamiliarFormEligibilityForSpell(unrelatedSpell)).toBeNull();
    expect(
      findFamiliarFormEligibilityForSpell(otherSpawnedCreature),
    ).toBeNull();
    expect(
      pactOfTheChainFindFamiliarFormEligibilityForSpell(unrelatedSpell),
    ).toBeNull();
  });

  test("reports ineligible choices and missing or non-CR-0-Beast records", () => {
    const spell = findFamiliarSpell();
    const catalog = statBlockCatalog();
    const emptyCatalogResult = buildStatBlockCatalog({ collections: [] });
    const eligibility = findFamiliarFormEligibilityForSpell(spell);
    const pactEligibility =
      pactOfTheChainFindFamiliarFormEligibilityForSpell(spell);
    expect(emptyCatalogResult.tag).toBe("ok");
    expect(eligibility).not.toBeNull();
    expect(pactEligibility).not.toBeNull();
    if (
      emptyCatalogResult.tag === "invalid" ||
      eligibility === null ||
      pactEligibility === null
    ) {
      return;
    }

    const normalForm = eligibility.normalForms[0];
    const creatureTypeChoice = eligibility.creatureTypeOverrideChoices[0];
    const specialForm = pactEligibility.specialForms[0];
    const ineligibleStatBlock = catalog
      .listStatBlocks()
      .find(
        (record) =>
          record.statBlock.creatureType !== "beast" ||
          record.challengeRating !== 0,
      );
    expect(normalForm).toBeDefined();
    expect(creatureTypeChoice).toBeDefined();
    expect(specialForm).toBeDefined();
    expect(ineligibleStatBlock).toBeDefined();
    if (
      normalForm === undefined ||
      creatureTypeChoice === undefined ||
      specialForm === undefined ||
      ineligibleStatBlock === undefined
    ) {
      return;
    }

    expect(
      resolveFindFamiliarForm({
        catalog,
        eligibility: {
          ...eligibility,
          creatureTypeOverrideChoices: [],
        },
        selection: {
          tag: "normalNamedForm",
          formId: normalForm.formId,
        },
        creatureTypeOverrideChoiceId: creatureTypeChoice.optionId,
      }),
    ).toMatchObject({ tag: "issue" });

    expect(
      resolveFindFamiliarSelectedForm({
        catalog,
        eligibility,
        selection: {
          tag: "normalNamedForm",
          formId: "synthetic-ineligible-form",
        },
        creatureTypeOverride: creatureTypeChoice.creatureType,
      }),
    ).toMatchObject({ tag: "issue" });

    expect(
      resolveFindFamiliarSelectedForm({
        catalog: emptyCatalogResult.catalog,
        eligibility,
        selection: {
          tag: "challengeRatingZeroBeast",
          statBlockId: normalForm.statBlockId,
        },
        creatureTypeOverride: creatureTypeChoice.creatureType,
      }),
    ).toMatchObject({ tag: "issue" });

    expect(
      resolveFindFamiliarSelectedForm({
        catalog,
        eligibility,
        selection: {
          tag: "challengeRatingZeroBeast",
          statBlockId: ineligibleStatBlock.id,
        },
        creatureTypeOverride: creatureTypeChoice.creatureType,
      }),
    ).toMatchObject({ tag: "issue" });

    expect(
      resolvePactOfTheChainFindFamiliarForm({
        catalog: emptyCatalogResult.catalog,
        eligibility: pactEligibility,
        selection: {
          tag: "pactOfTheChainSpecialForm",
          formId: specialForm.formId,
        },
        creatureTypeOverrideChoiceId: creatureTypeChoice.optionId,
      }),
    ).toMatchObject({ tag: "issue" });
  });

  test("recognizes only admitted creature-type overrides", () => {
    expect(isFindFamiliarCreatureTypeOverride("celestial")).toBe(true);
    expect(isFindFamiliarCreatureTypeOverride("beast")).toBe(false);
    expect(isFindFamiliarCreatureTypeOverride(null)).toBe(false);
  });
});
