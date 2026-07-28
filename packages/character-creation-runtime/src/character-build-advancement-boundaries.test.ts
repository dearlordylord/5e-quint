import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  classUnitIdFromUnitId,
  eldritchInvocationId,
  fighterClassUnitId,
  fighterLevelGainWithFightingStyleReplacement,
  fightingStyleFeatUnitId,
  sorcererClassUnitId,
  sorcererLevelGain,
  warlockClassUnitId,
  warlockLevelGain,
  weaponMasteryFeatureUnitId,
  weaponMasteryLevelGain,
  weaponMasteryWeaponUnitId,
  type ClassUnitId,
  type UnitCatalog,
} from "./index.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog test fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

function parsedClassUnitId(
  classUnitId: string,
  catalog: UnitCatalog = unitLibrary,
): ClassUnitId {
  const parsed = classUnitIdFromUnitId({
    unitLibrary: catalog,
    classUnitId: authoredUnitId(classUnitId),
  });
  if (Either.isLeft(parsed)) {
    throw new Error(`Expected a class Unit fixture: ${classUnitId}.`);
  }
  return parsed.right;
}

const fighterUnitId = parsedClassUnitId("class_fighter");
const sorcererUnitId = parsedClassUnitId("class_sorcerer");
const warlockUnitId = parsedClassUnitId("class_warlock");
const wizardUnitId = parsedClassUnitId("class_wizard");
const fixedHitPoints = { tag: "fixedHigherLevelGain" } as const;

describe("Character Build advancement typed boundaries", () => {
  test("narrows only the matching class identity", () => {
    expect(
      fighterClassUnitId({ unitLibrary, classUnitId: fighterUnitId }),
    ).toHaveProperty("_tag", "Right");
    expect(
      fighterClassUnitId({ unitLibrary, classUnitId: wizardUnitId }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonFighterClassLevelGain", className: "wizard" },
    });

    expect(
      warlockClassUnitId({ unitLibrary, classUnitId: warlockUnitId }),
    ).toHaveProperty("_tag", "Right");
    expect(
      warlockClassUnitId({ unitLibrary, classUnitId: wizardUnitId }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonWarlockClassLevelGain", className: "wizard" },
    });

    expect(
      sorcererClassUnitId({ unitLibrary, classUnitId: sorcererUnitId }),
    ).toHaveProperty("_tag", "Right");
    expect(
      sorcererClassUnitId({ unitLibrary, classUnitId: wizardUnitId }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonSorcererClassLevelGain", className: "wizard" },
    });
  });

  test("narrows Fighting Style feats by Unit kind and category", () => {
    expect(
      fightingStyleFeatUnitId({
        unitLibrary,
        unitId: authoredUnitId("feat_archery"),
      }),
    ).toHaveProperty("_tag", "Right");
    expect(
      fightingStyleFeatUnitId({
        unitLibrary,
        unitId: authoredUnitId("synthetic_unknown"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
    expect(
      fightingStyleFeatUnitId({
        unitLibrary,
        unitId: authoredUnitId("weapon_longsword"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonFightingStyleFeat", unitKind: "weapon" },
    });
    expect(
      fightingStyleFeatUnitId({
        unitLibrary,
        unitId: authoredUnitId("feat_savage_attacker"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonFightingStyleFeat", featCategory: "origin" },
    });
  });

  test("narrows Weapon Mastery sources by feature shape and weapon kind", () => {
    expect(
      weaponMasteryFeatureUnitId({
        unitLibrary,
        unitId: authoredUnitId("fighter_weapon_mastery"),
      }),
    ).toHaveProperty("_tag", "Right");
    expect(
      weaponMasteryFeatureUnitId({
        unitLibrary,
        unitId: authoredUnitId("synthetic_unknown"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
    expect(
      weaponMasteryFeatureUnitId({
        unitLibrary,
        unitId: authoredUnitId("fighter_fighting_style"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonWeaponMasteryFeature" },
    });

    expect(
      weaponMasteryWeaponUnitId({
        unitLibrary,
        unitId: authoredUnitId("weapon_longsword"),
      }),
    ).toHaveProperty("_tag", "Right");
    expect(
      weaponMasteryWeaponUnitId({
        unitLibrary,
        unitId: authoredUnitId("synthetic_unknown"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
    expect(
      weaponMasteryWeaponUnitId({
        unitLibrary,
        unitId: authoredUnitId("class_fighter"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonWeaponMasteryWeapon", unitKind: "class" },
    });
  });

  test("propagates narrowed Unit failures through level-gain constructors", () => {
    expect(
      weaponMasteryLevelGain({
        unitLibrary,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
        featureUnitId: authoredUnitId("synthetic_unknown"),
        selectedWeaponUnitIds: [],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
    expect(
      weaponMasteryLevelGain({
        unitLibrary,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
        featureUnitId: authoredUnitId("fighter_weapon_mastery"),
        selectedWeaponUnitIds: [authoredUnitId("class_fighter")],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonWeaponMasteryWeapon" },
    });
    expect(
      weaponMasteryLevelGain({
        unitLibrary,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
        featureUnitId: authoredUnitId("fighter_weapon_mastery"),
        selectedWeaponUnitIds: [authoredUnitId("weapon_longsword")],
        fightingStyleReplacement: {
          selectedFeatUnitId: authoredUnitId("feat_savage_attacker"),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "nonFightingStyleFeat" },
    });
    expect(
      fighterLevelGainWithFightingStyleReplacement({
        unitLibrary,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
        selectedFeatUnitId: authoredUnitId("synthetic_unknown"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownUnitId" },
    });
  });

  test("rejects unknown invocation and Metamagic identities at construction", () => {
    expect(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockUnitId,
        hitPointRule: fixedHitPoints,
        gainedInvocations: [
          {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("synthetic_unknown"),
          },
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownEldritchInvocation" },
    });
    expect(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: sorcererUnitId,
        hitPointRule: fixedHitPoints,
        gainedOptions: ["synthetic_unknown"],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "unknownSorcererMetamagicOption" },
    });
    expect(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: sorcererUnitId,
        hitPointRule: fixedHitPoints,
        gainedOptions: [],
        replacement: {
          replaceOptionId: "sorcerer_empowered_spell",
          selectedOptionId: "sorcerer_empowered_spell",
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "sameSorcererMetamagicReplacement" },
    });
  });
});
