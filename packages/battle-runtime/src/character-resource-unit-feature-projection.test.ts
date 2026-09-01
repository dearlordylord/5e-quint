import { describe, expect, test } from "vitest";
import { statBlockId } from "@dnd/shared/game-facts";
import { classLevel } from "@dnd/shared/types";
import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";

import {
  actionSurgeResource,
  battleAbilityModifier,
  characterSeed,
  fighterId,
  innateSorceryResource,
  monksFocusResource,
  rageResource,
  resource,
  startBattleSessionRight,
  statBlockCatalog,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { battleId, battleExecutionScopeOrdinal } from "./identity.ts";
import { battleCreatureStateAdmissionFromInit } from "./battle-reducer/creature-state.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { parseSupportedUnitFeatureProfile } from "./unit-feature-support.ts";
import { unitMechanicsVariant } from "./unit-profile-admission-catalog.test-support.ts";

describe("character resource Unit feature projection", () => {
  test("projects ordinary resource-backed Unit features into character execution", () => {
    const bardicInspiration = unitLibrary.requireUnit(
      "bard_bardic_inspiration",
    );
    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const session = startBattleSessionRight({
      battleId: battleId("character-resource-unit-feature-projection"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: null,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "fighter", level: 2 },
            { className: "sorcerer", level: 1 },
            { className: "bard", level: 1 },
          ],
          resources: [
            rageResource(),
            resource(),
            actionSurgeResource(),
            innateSorceryResource(),
            {
              unit: bardicInspiration,
              capAbilityModifier: battleAbilityModifier(3),
            },
            { unit: relentlessEndurance },
          ],
        }),
      ],
    });
    const projectedUnitIds = new Set(
      session.context.characters
        .get(fighterId)
        ?.unitProcedureOwnership.map(({ unitId }) => unitId),
    );

    expect([...projectedUnitIds]).toEqual(
      expect.arrayContaining([
        "barbarian_rage",
        "fighter_second_wind",
        "fighter_action_surge",
        "sorcerer_innate_sorcery",
        "bard_bardic_inspiration",
        "orc_relentless_endurance",
      ]),
    );
  });

  test("projects each specialized resource Unit through one exclusive strategy", () => {
    const indomitable = unitLibrary.requireUnit("fighter_indomitable");
    const wildShape = unitLibrary.requireUnit("druid_wild_shape");
    const classLevels = [
      { className: "fighter" as const, level: classLevel(9) },
      { className: "druid" as const, level: classLevel(2) },
      { className: "monk" as const, level: classLevel(2) },
    ] as const;
    for (const unit of [indomitable, wildShape]) {
      expect(
        parseSupportedUnitFeatureProfile(unit, classLevels),
        unit.id,
      ).not.toBeNull();
    }
    expect(
      parseSupportedUnitFeatureProfile(monksFocusResource().unit, classLevels),
      "monk_monks_focus",
    ).toBeNull();
    const session = startBattleSessionRight({
      battleId: battleId("specialized-resource-procedure-correlation"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: null,
          classLevels,
          resources: [
            { unit: indomitable },
            { unit: wildShape },
            monksFocusResource(),
          ],
          druidWildShapeAvailableForms: [
            assertStatBlockForTest(
              statBlockCatalog,
              statBlockId("stat_block_rat"),
            ),
          ],
        }),
      ],
    });
    const actor = session.state.combatants.get(fighterId);
    const context = session.context.characters.get(fighterId);
    if (actor?.origin.kind !== "character" || context === undefined) {
      throw new Error("Expected the projected character runtime context.");
    }

    for (const unitId of [
      "fighter_indomitable",
      "druid_wild_shape",
      "monk_monks_focus",
    ] as const) {
      const resourcePoolRef = context.resourceOwnership.find(
        ({ unit }) => unit.id === unitId,
      )?.resourcePoolRef;
      if (resourcePoolRef === undefined) {
        throw new Error(`Expected the ${unitId} resource pool.`);
      }
      const ownership = context.unitProcedureOwnership.filter(
        (candidate) => candidate.unitId === unitId,
      );
      const binding = actor.origin.execution.procedureBindings.find(
        (candidate) => candidate.procedureRef === ownership[0]?.procedureRef,
      );

      expect(ownership, unitId).toHaveLength(1);
      expect(binding?.procedure, unitId).toMatchObject({
        kind: "unitFeature",
        source: { kind: "resourcePool", resourcePoolRef },
      });
    }
  });

  test("rejects a resource Unit supplied again as an explicit feature", () => {
    const rage = rageResource();
    const profile = parseSupportedUnitFeatureProfile(rage.unit, [
      { className: "barbarian", level: classLevel(1) },
    ]);
    if (profile === null) throw new Error("Expected the Rage support profile.");
    const init = characterSeed({
      initiative: 20,
      attack: null,
      classLevels: [{ className: "barbarian", level: 1 }],
      resources: [rage],
      unitFeatures: [profile],
    });
    const admission = battleCreatureStateAdmissionFromInit(
      battleId("resource-and-explicit-unit-feature-overlap"),
      init,
      battleExecutionScopeOrdinal(0),
    );

    expect(admission.tag).toBe("invalid");
    if (admission.tag !== "invalid") return;
    expect(
      admission.issues.map((issue) =>
        issue.tag === "battleUnitSupportProfileIssue"
          ? issue.message
          : battleStateInitIssueMessage(issue),
      ),
    ).toEqual([
      "Character battle feature unit must not also initialize a battle resource: barbarian_rage",
    ]);
  });

  test("aggregates typed admission failures for independent resource Units", () => {
    const indomitable = unitLibrary.requireUnit("fighter_indomitable");
    if (
      indomitable.kind !== "class_feature" ||
      indomitable.mechanics.family !== "failed_saving_throw_reroll"
    ) {
      throw new Error("Expected failed Saving Throw reroll mechanics.");
    }
    const mechanics = indomitable.mechanics;
    const malformedResources = ["first", "second"].map((suffix) => ({
      unit: unitMechanicsVariant(indomitable, {
        id: `synthetic_malformed_indomitable_${suffix}`,
        mechanics: {
          ...mechanics,
          reroll: { ...mechanics.reroll, mustUseNewRoll: false },
        },
      }),
    }));
    const admission = battleCreatureStateAdmissionFromInit(
      battleId("independent-resource-admission-failures"),
      characterSeed({
        initiative: 20,
        attack: null,
        classLevels: [{ className: "fighter", level: 9 }],
        resources: malformedResources,
      }),
      battleExecutionScopeOrdinal(0),
    );

    expect(admission.tag).toBe("invalid");
    if (admission.tag !== "invalid") return;
    expect(admission.issues).toHaveLength(2);
    expect(admission.issues.map(({ tag }) => tag)).toEqual([
      "battleUnitSupportProfileIssue",
      "battleUnitSupportProfileIssue",
    ]);
    expect(admission.issues.map(({ message }) => message)).toEqual([
      "The represented atomic failed Saving Throw reroll root is not completely supported by Battle.",
      "The represented atomic failed Saving Throw reroll root is not completely supported by Battle.",
    ]);
  });
});
