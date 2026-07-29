import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { Option } from "effect";
import { describe, expect, test } from "vitest";

import {
  classUnitId,
  creationChoiceOptionId,
  eldritchInvocationId,
  eldritchInvocationRepeatableChoiceSatisfiesRule,
  knownWarlockCantripSatisfiesEldritchInvocationRule,
  weaponMasteryChoiceProfileForFeature,
  weaponMasteryChoiceProfileForProgression,
  type UnitCatalog,
} from "./index.ts";
import { selectedEldritchInvocationFeatures } from "./eldritch-invocations.ts";

const catalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

describe("Eldritch Invocation eligibility boundaries", () => {
  test("admits only installed Origin feats for Lessons of the First Ones", () => {
    const originFeatRule = { kind: "originFeat" } as const;

    expect(
      eldritchInvocationRepeatableChoiceSatisfiesRule({
        unitLibrary,
        choiceRule: originFeatRule,
        repeatableChoice: {
          kind: "originFeat",
          featUnitId: authoredUnitId("feat_skilled"),
        },
      }),
    ).toBe(true);
    expect(
      eldritchInvocationRepeatableChoiceSatisfiesRule({
        unitLibrary,
        choiceRule: originFeatRule,
        repeatableChoice: {
          kind: "originFeat",
          featUnitId: authoredUnitId("feat_grappler"),
        },
      }),
    ).toBe(false);
    expect(
      eldritchInvocationRepeatableChoiceSatisfiesRule({
        unitLibrary,
        choiceRule: originFeatRule,
        repeatableChoice: {
          kind: "knownWarlockCantrip",
          cantripId: authoredUnitId("eldritch_blast"),
        },
      }),
    ).toBe(false);
  });

  test("distinguishes damage, attack-roll damage, and range prerequisites", () => {
    const satisfies = (
      cantripId: string,
      cantrip: "deals_damage" | "attack_roll_damage",
      minimumRangeFeet?: number,
    ) =>
      knownWarlockCantripSatisfiesEldritchInvocationRule({
        unitLibrary,
        cantripId: authoredUnitId(cantripId),
        cantrip,
        ...(minimumRangeFeet === undefined ? {} : { minimumRangeFeet }),
      });

    expect(satisfies("missing_cantrip", "deals_damage")).toBe(false);
    expect(satisfies("weapon_longsword", "deals_damage")).toBe(false);
    expect(satisfies("guidance", "deals_damage")).toBe(false);
    expect(satisfies("acid_splash", "deals_damage")).toBe(true);
    expect(satisfies("acid_splash", "attack_roll_damage")).toBe(false);
    expect(satisfies("eldritch_blast", "attack_roll_damage")).toBe(true);
    expect(satisfies("eldritch_blast", "deals_damage", 120)).toBe(true);
    expect(satisfies("eldritch_blast", "deals_damage", 121)).toBe(false);
    expect(satisfies("true_strike", "deals_damage")).toBe(true);
    expect(satisfies("true_strike", "attack_roll_damage")).toBe(true);
    expect(satisfies("true_strike", "deals_damage", 10)).toBe(false);
    expect(
      eldritchInvocationRepeatableChoiceSatisfiesRule({
        unitLibrary,
        choiceRule: {
          kind: "knownWarlockCantrip",
          cantrip: "attack_roll_damage",
        },
        repeatableChoice: {
          kind: "knownWarlockCantrip",
          cantripId: authoredUnitId("eldritch_blast"),
        },
      }),
    ).toBe(true);
    expect(
      eldritchInvocationRepeatableChoiceSatisfiesRule({
        unitLibrary,
        choiceRule: {
          kind: "knownWarlockCantrip",
          cantrip: "deals_damage",
          minimumRangeFeet: 121,
        },
        repeatableChoice: {
          kind: "knownWarlockCantrip",
          cantripId: authoredUnitId("eldritch_blast"),
        },
      }),
    ).toBe(false);
  });

  test("reads save-success and effectless direct phases without identity dispatch", () => {
    const acidSplash = unitLibrary.requireUnit("acid_splash");
    const dispelMagic = unitLibrary.requireUnit("dispel_magic");
    const trueStrike = unitLibrary.requireUnit("true_strike");
    if (
      acidSplash.kind !== "spell" ||
      acidSplash.mechanics.family !== "activation" ||
      dispelMagic.kind !== "spell" ||
      dispelMagic.mechanics.family !== "activation" ||
      trueStrike.kind !== "spell" ||
      trueStrike.mechanics.family !== "activation"
    ) {
      throw new Error("The cantrip phase fixtures must be activation spells.");
    }
    const saveGate = acidSplash.mechanics.phases.find(
      (phase) => phase.kind === "save_gate",
    );
    const direct = trueStrike.mechanics.phases.find(
      (phase) => phase.kind === "direct",
    );
    if (saveGate === undefined || direct === undefined) {
      throw new Error(
        "The cantrip fixtures must expose their expected phases.",
      );
    }

    const successDamageCantrip = decodeUnitRecordSync({
      ...acidSplash,
      id: "synthetic_success_damage_cantrip",
      name: "Synthetic Success Damage Cantrip",
      provenance: {
        kind: "synthetic-test",
        section: "eldritch-invocation-boundaries",
      },
      mechanics: {
        ...acidSplash.mechanics,
        phases: [
          {
            ...saveGate,
            onFail: { kind: "none" },
            onSuccess: { kind: "half_damage" },
          },
        ],
      },
    });
    const noDamageSaveCantrip = decodeUnitRecordSync({
      ...acidSplash,
      id: "synthetic_no_damage_save_cantrip",
      name: "Synthetic No Damage Save Cantrip",
      provenance: {
        kind: "synthetic-test",
        section: "eldritch-invocation-boundaries",
      },
      mechanics: {
        ...acidSplash.mechanics,
        phases: [
          {
            ...saveGate,
            onFail: { kind: "none" },
            onSuccess: { kind: "none" },
          },
        ],
      },
    });
    const effectlessDirectCantrip = decodeUnitRecordSync({
      ...trueStrike,
      id: "synthetic_effectless_direct_cantrip",
      name: "Synthetic Effectless Direct Cantrip",
      provenance: {
        kind: "synthetic-test",
        section: "eldritch-invocation-boundaries",
      },
      mechanics: {
        ...trueStrike.mechanics,
        phases: [{ attachment: direct.attachment, kind: "direct" }],
      },
    });
    const abilityCheckCantrip = decodeUnitRecordSync({
      ...dispelMagic,
      id: "synthetic_ability_check_cantrip",
      name: "Synthetic Ability Check Cantrip",
      provenance: {
        kind: "synthetic-test",
        section: "eldritch-invocation-boundaries",
      },
      mechanics: { ...dispelMagic.mechanics, level: 0 },
    });
    const syntheticUnits = [
      successDamageCantrip,
      noDamageSaveCantrip,
      effectlessDirectCantrip,
      abilityCheckCantrip,
    ] as const;
    const syntheticCatalog: UnitCatalog = {
      getUnit: (unitId) => {
        const syntheticUnit = syntheticUnits.find((unit) => unit.id === unitId);
        return syntheticUnit === undefined
          ? unitLibrary.getUnit(unitId)
          : Option.some(syntheticUnit);
      },
      listUnits: () => [...unitLibrary.listUnits(), ...syntheticUnits],
      requireUnit: (unitId) =>
        syntheticUnits.find((unit) => unit.id === unitId) ??
        unitLibrary.requireUnit(unitId),
    };

    expect(
      knownWarlockCantripSatisfiesEldritchInvocationRule({
        unitLibrary: syntheticCatalog,
        cantripId: successDamageCantrip.id,
        cantrip: "deals_damage",
      }),
    ).toBe(true);
    expect(
      knownWarlockCantripSatisfiesEldritchInvocationRule({
        unitLibrary: syntheticCatalog,
        cantripId: noDamageSaveCantrip.id,
        cantrip: "deals_damage",
      }),
    ).toBe(false);
    expect(
      knownWarlockCantripSatisfiesEldritchInvocationRule({
        unitLibrary: syntheticCatalog,
        cantripId: effectlessDirectCantrip.id,
        cantrip: "deals_damage",
      }),
    ).toBe(false);
    expect(
      knownWarlockCantripSatisfiesEldritchInvocationRule({
        unitLibrary: syntheticCatalog,
        cantripId: effectlessDirectCantrip.id,
        cantrip: "attack_roll_damage",
      }),
    ).toBe(false);
    expect(
      knownWarlockCantripSatisfiesEldritchInvocationRule({
        unitLibrary: syntheticCatalog,
        cantripId: abilityCheckCantrip.id,
        cantrip: "deals_damage",
      }),
    ).toBe(false);
    expect(
      knownWarlockCantripSatisfiesEldritchInvocationRule({
        unitLibrary: syntheticCatalog,
        cantripId: abilityCheckCantrip.id,
        cantrip: "attack_roll_damage",
      }),
    ).toBe(false);
  });

  test("projects only recognized nonrepeatable invocation options", () => {
    expect(
      selectedEldritchInvocationFeatures({
        selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
        optionIds: [
          creationChoiceOptionId("armor_of_shadows"),
          creationChoiceOptionId("synthetic_unknown_invocation"),
          creationChoiceOptionId("pact_of_the_tome"),
        ],
      }),
    ).toEqual([
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: "warlock_eldritch_invocations",
        selection: {
          kind: "nonRepeatable",
          invocationId: eldritchInvocationId("armor_of_shadows"),
        },
      },
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: "warlock_eldritch_invocations",
        selection: {
          kind: "nonRepeatable",
          invocationId: eldritchInvocationId("pact_of_the_tome"),
        },
      },
    ]);
  });
});

describe("Weapon Mastery progression boundary", () => {
  test("derives the choice count from the owning class level", () => {
    const profile = weaponMasteryChoiceProfileForFeature({
      featureUnitId: authoredUnitId("fighter_weapon_mastery"),
      unitLibrary,
    });
    if (profile === undefined) {
      throw new Error("The Fighter Weapon Mastery profile must be supported.");
    }

    const fighterProfile = weaponMasteryChoiceProfileForProgression(profile, {
      startingClass: classUnitId(authoredUnitId("class_fighter")),
      advancements: [],
    });
    const absentFighterProfile = weaponMasteryChoiceProfileForProgression(
      profile,
      {
        startingClass: classUnitId(authoredUnitId("class_wizard")),
        advancements: [],
      },
    );

    expect(Option.isSome(fighterProfile)).toBe(true);
    expect(Option.getOrUndefined(fighterProfile)).toMatchObject({
      classLevel: 1,
      choiceCount: 3,
    });
    expect(Option.isNone(absentFighterProfile)).toBe(true);
  });

  test("rejects absent, wrong-kind, and ownerless feature records", () => {
    expect(
      weaponMasteryChoiceProfileForFeature({
        featureUnitId: authoredUnitId("synthetic_missing_feature"),
        unitLibrary,
      }),
    ).toBeUndefined();
    expect(
      weaponMasteryChoiceProfileForFeature({
        featureUnitId: authoredUnitId("weapon_longsword"),
        unitLibrary,
      }),
    ).toBeUndefined();

    const ownerlessCatalog: UnitCatalog = {
      getUnit: (unitId) =>
        unitId === authoredUnitId("class_fighter")
          ? Option.none()
          : unitLibrary.getUnit(unitId),
      listUnits: () =>
        unitLibrary
          .listUnits()
          .filter((unit) => unit.id !== authoredUnitId("class_fighter")),
      requireUnit: (unitId) => {
        if (unitId === authoredUnitId("class_fighter")) {
          throw new Error(
            "The ownerless feature fixture deliberately omits its owning class.",
          );
        }
        return unitLibrary.requireUnit(unitId);
      },
    };
    expect(
      weaponMasteryChoiceProfileForFeature({
        featureUnitId: authoredUnitId("fighter_weapon_mastery"),
        unitLibrary: ownerlessCatalog,
      }),
    ).toBeUndefined();
  });
});
