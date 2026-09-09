import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import { admitBattleSpellMechanicsFrom } from "./spell-mechanics-admission.ts";
import { damageReductionProfile } from "./damage-reduction.ts";
import { heldLightProfile } from "./held-light.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import {
  spellActivationEffectPath,
  spellMechanicsRootPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import {
  mechanicsSource,
  sourceWith,
  authoredConditionalMechanic,
  initialDirectPhase,
  expectedIssue,
  removeOngoingCharacteristicEffect,
  replaceOngoingCharacteristicEffect,
  removeActivationCharacteristicEffect,
} from "./support-spell-procedure-admission.test-support.js";

describe("Support profile ownership boundaries", () => {
  test.each([
    ["damage reduction", ["barkskin"], damageReductionProfile],
    ["roll modifier", ["levitate", "enlarge_reduce"], rollModifierProfile],
    ["scalar buff", ["bless"], scalarBuffProfile],
    ["see invisible", ["shield_of_faith"], seeInvisibleObserverSightProfile],
    ["held light", ["fire_bolt"], heldLightProfile],
  ] as const)(
    "does not represent canonical or renamed unrelated %s mechanics",
    (_label, spellIds, profile) => {
      for (const spellId of spellIds) {
        const source = spellAdmissionSource(spellRecord(spellId));
        const renamed = {
          ...source,
          id: unitId(`synthetic_support_${spellId}_ownership_collision`),
          name: "Synthetic Unrelated Spell",
        };
        expect(profile.admitMechanics(mechanicsSource(source))).toEqual({
          tag: "notRepresented",
        });
        expect(profile.admitMechanics(mechanicsSource(renamed))).toEqual({
          tag: "notRepresented",
        });
      }
    },
  );

  test("damage-reduction ownership excludes canonical and renamed Guidance", () => {
    const source = spellAdmissionSource(spellRecord("guidance"));
    const renamed = {
      ...source,
      id: unitId("synthetic_support_guidance_damage_reduction_collision"),
      name: "Synthetic Roll Modifier",
    };

    for (const candidate of [source, renamed]) {
      expect(
        damageReductionProfile.admitMechanics(mechanicsSource(candidate)),
      ).toEqual({ tag: "notRepresented" });
    }
  });

  test.each([
    ["deleted", removeOngoingCharacteristicEffect],
    ["replaced", replaceOngoingCharacteristicEffect],
  ] as const)(
    "damage-reduction ownership excludes renamed Guidance with %s operation",
    (_label, update) => {
      const source = spellAdmissionSource(spellRecord("guidance"));
      const mechanics = update(source.mechanics);
      const renamed = {
        ...source,
        id: unitId("synthetic_support_guidance_damage_reduction_fallback"),
        name: "Synthetic Guidance Fallback",
        mechanics,
        spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
      };

      expect(
        damageReductionProfile.admitMechanics(mechanicsSource(renamed)),
      ).toEqual({ tag: "notRepresented" });
    },
  );

  test.each([
    [
      "damage reduction operation deletion",
      "resistance",
      damageReductionProfile,
      removeOngoingCharacteristicEffect,
      "damageReduction",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ],
    [
      "roll modifier ongoing effect deletion",
      "bless",
      rollModifierProfile,
      removeOngoingCharacteristicEffect,
      "rollModifier",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ],
    [
      "roll modifier Enhance Ability effect deletion",
      "enhance_ability",
      rollModifierProfile,
      removeOngoingCharacteristicEffect,
      "rollModifier",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ],
    [
      "roll modifier activation effect deletion",
      "bane",
      rollModifierProfile,
      removeActivationCharacteristicEffect,
      "rollModifier",
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
    ],
    [
      "scalar buff activation effect deletion",
      "longstrider",
      scalarBuffProfile,
      removeActivationCharacteristicEffect,
      "scalarBuff",
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
    ],
    [
      "scalar buff ongoing effect deletion",
      "barkskin",
      scalarBuffProfile,
      removeOngoingCharacteristicEffect,
      "scalarBuff",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ],
    [
      "see invisible effect deletion",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      removeActivationCharacteristicEffect,
      "seeInvisibleObserverSight",
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
    ],
  ] as const)(
    "keeps a deleted characteristic effect represented at its exact path",
    (_label, spellId, profile, update, procedure, mechanicsPath) => {
      const result = profile.admitMechanics(sourceWith(spellId, update));
      expect(result.tag, _label).toBe("unsupported");
      if (result.tag !== "unsupported") return;
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expectedIssue(
            procedure,
            procedure === "damageReduction" ? "damage" : "effect",
            mechanicsPath,
          ),
        ]),
      );
    },
  );

  test("does not represent canonical or malformed Warding Bond as generic roll/scalar owners", () => {
    const canonical = spellAdmissionSource(spellRecord("warding_bond"));
    const malformed = sourceWith("warding_bond", (mechanics) => {
      if (mechanics.family !== "ongoing_effect") {
        throw new Error("Expected Warding Bond ongoing-effect mechanics.");
      }
      const updated = structuredClone(mechanics);
      const operation = updated.operations[0];
      if (operation?.effect.kind !== "modify_ac") {
        throw new Error("Expected Warding Bond armor-class operation.");
      }
      Reflect.set(operation.effect.delta, "dice", 2);
      return updated;
    });

    for (const source of [mechanicsSource(canonical), malformed]) {
      expect(rollModifierProfile.admitMechanics(source)).toEqual({
        tag: "notRepresented",
      });
      expect(scalarBuffProfile.admitMechanics(source)).toEqual({
        tag: "notRepresented",
      });
    }
  });

  test.each([
    [
      "initialPhase",
      (mechanics: SpellMechanics): SpellMechanics => {
        if (mechanics.family !== "ongoing_effect") {
          throw new Error("Expected ongoing-effect mechanics.");
        }
        return { ...mechanics, initialPhase: initialDirectPhase };
      },
      spellOngoingInitialPhasePath(),
    ],
    [
      "authoredConditionalMechanics",
      (mechanics: SpellMechanics): SpellMechanics => {
        if (mechanics.family !== "ongoing_effect") {
          throw new Error("Expected ongoing-effect mechanics.");
        }
        return {
          ...mechanics,
          authoredConditionalMechanics: [authoredConditionalMechanic],
        };
      },
      spellMechanicsRootPath(),
    ],
  ] as const)(
    "rejects unsupported ongoing root %s while retaining profile ownership",
    (failedFact, update, mechanicsPath) => {
      for (const [spellId, profile, procedure] of [
        ["resistance", damageReductionProfile, "damageReduction"],
        ["bless", rollModifierProfile, "rollModifier"],
        ["barkskin", scalarBuffProfile, "scalarBuff"],
        ["produce_flame", heldLightProfile, "heldLight"],
      ] as const) {
        const result = profile.admitMechanics(sourceWith(spellId, update));
        expect(result).toEqual({
          tag: "unsupported",
          issues: [expectedIssue(procedure, failedFact, mechanicsPath)],
        });
      }
    },
  );

  test("does not retain scalar ownership without a projectable effect or complete owner envelope", () => {
    const result = scalarBuffProfile.admitMechanics(
      sourceWith("longstrider", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const phase = mechanics.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected Longstrider direct phase.");
        }
        return {
          ...mechanics,
          phases: [
            { ...phase, effects: [{ kind: "none" }] },
            {
              ...phase,
              attachment: { kind: "object", count: 1 },
              effects: [
                {
                  kind: "modify_ac",
                  delta: {
                    kind: "fixed_dice",
                    dice: 1,
                    dieSize: 2,
                    sign: "+",
                  },
                },
              ],
            },
          ],
        };
      }),
    );
    expect(result).toEqual({ tag: "notRepresented" });
  });

  test.each([
    ["damage reduction", "resistance", damageReductionProfile],
    ["roll modifier", "bane", rollModifierProfile],
    ["roll modifier partial", "pass_without_trace", rollModifierProfile],
    ["scalar buff", "longstrider", scalarBuffProfile],
    ["scalar buff flight", "fly", scalarBuffProfile],
    ["see invisible", "see_invisibility", seeInvisibleObserverSightProfile],
    ["held light", "produce_flame", heldLightProfile],
  ] as const)(
    "preserves %s admission under authored renaming",
    (_label, spellId, profile) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const renamed = {
        ...source,
        id: unitId(`synthetic_support_${spellId}`),
        name: "Synthetic Renamed Spell",
      };
      const original = profile.admitMechanics(mechanicsSource(source));
      const renamedResult = profile.admitMechanics(mechanicsSource(renamed));
      expect(original).toMatchObject({ tag: "supported" });
      expect(renamedResult).toMatchObject({ tag: "supported" });
      if (original.tag !== "supported" || renamedResult.tag !== "supported")
        return;
      expect(renamedResult.admitted.facts).toEqual(original.admitted.facts);
      expect(renamedResult.admitted.evidence).toEqual(
        original.admitted.evidence,
      );
    },
  );

  test.each([
    ["resistance", "damageReduction"],
    ["guidance", "rollModifier"],
    ["bless", "rollModifier"],
    ["longstrider", "scalarBuff"],
    ["see_invisibility", "seeInvisibleObserverSight"],
    ["produce_flame", "heldLight"],
  ] as const)(
    "does not collide on the %s representative",
    (spellId, procedure) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = admitBattleSpellMechanicsFrom(mechanicsSource(source), [
        damageReductionProfile,
        rollModifierProfile,
        scalarBuffProfile,
        seeInvisibleObserverSightProfile,
        heldLightProfile,
      ]);
      expect(result.tag).toBe("admitted");
      if (result.tag !== "admitted") return;
      expect(
        result.procedures.map(
          ({ procedure: admittedProcedure }) => admittedProcedure,
        ),
      ).toEqual([procedure]);
    },
  );

  test.each([
    [
      "guidance operation deletion",
      "guidance",
      removeOngoingCharacteristicEffect,
      "rollModifier",
    ],
    [
      "resistance operation deletion",
      "resistance",
      removeOngoingCharacteristicEffect,
      "damageReduction",
    ],
    [
      "bless operation deletion",
      "bless",
      removeOngoingCharacteristicEffect,
      "rollModifier",
    ],
    [
      "bane effect deletion",
      "bane",
      removeActivationCharacteristicEffect,
      "rollModifier",
    ],
    [
      "longstrider effect deletion",
      "longstrider",
      removeActivationCharacteristicEffect,
      "scalarBuff",
    ],
    [
      "barkskin operation deletion",
      "barkskin",
      removeOngoingCharacteristicEffect,
      "scalarBuff",
    ],
    [
      "see invisibility effect deletion",
      "see_invisibility",
      removeActivationCharacteristicEffect,
      "seeInvisibleObserverSight",
    ],
  ] as const)(
    "does not collide after %s",
    (_label, spellId, update, procedure) => {
      const source = sourceWith(spellId, update);
      const profiles = [
        ["damageReduction", damageReductionProfile],
        ["rollModifier", rollModifierProfile],
        ["scalarBuff", scalarBuffProfile],
        ["seeInvisibleObserverSight", seeInvisibleObserverSightProfile],
        ["heldLight", heldLightProfile],
      ] as const;
      const representedProcedures = profiles.flatMap(
        ([candidateProcedure, profile]) =>
          profile.admitMechanics(source).tag === "notRepresented"
            ? []
            : [candidateProcedure],
      );
      expect(representedProcedures).toEqual([procedure]);
    },
  );
});
