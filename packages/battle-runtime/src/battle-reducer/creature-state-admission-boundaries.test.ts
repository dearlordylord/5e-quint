import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { describe, expect, test } from "vitest";

import fighterIndomitableInput from "../../../surface/content/fighter_indomitable.json";
import fighterTacticalMindInput from "../../../surface/content/fighter_tactical_mind.json";
import { unitId } from "@dnd/shared/game-facts";
import { classLevel } from "@dnd/shared/types";
import {
  battleId,
  battleObjectId,
  characterBattleFeatureInitForTest,
  characterSeed,
  defaultArmorClassState,
  Result,
  KNOCKED_OUT_UNCONSCIOUS,
  resource,
  spellRecord,
  startBattle,
  statBlockCreatureInit,
  statBlockRecord,
  recklessAttackFeature,
  wizardSpellcasting,
} from "../battle-runtime.test-support.ts";
import { battleStateInitIssueMessage } from "./domain-helpers.ts";
import { battleCreatureStateAdmissionFromInit } from "./creature-state.ts";
import { battleExecutionScopeOrdinal } from "../identity.ts";

describe("creature-state admission boundaries", () => {
  test("returns all independent character initialization invariant issues", () => {
    const loadout = {
      weapon: {
        itemId: battleObjectId("main:weapon_longsword"),
        unitId: unitId("weapon_longsword"),
        grip: "two_handed" as const,
      },
      shield: {
        itemId: battleObjectId("off:shield_test"),
        unitId: unitId("shield_test"),
      },
      offHandWeapon: {
        itemId: battleObjectId("off:weapon_dagger"),
        unitId: unitId("weapon_dagger"),
      },
    };
    const armorClass = {
      ...defaultArmorClassState(),
      leftHandUse: "shield" as const,
      rightHandUse: "free" as const,
    };
    const init = characterSeed({
      initiative: 10,
      classLevels: [
        { className: "fighter", level: 1 },
        { className: "barbarian", level: 2 },
      ],
      resources: [resource(), resource()],
      unitFeatures: [recklessAttackFeature(), recklessAttackFeature()],
      weaponMasteries: [
        { weaponUnitId: unitId("weapon_longsword") },
        { weaponUnitId: unitId("weapon_longsword") },
      ],
      selectedLoadout: loadout,
      armorClass,
    });

    const result = battleCreatureStateAdmissionFromInit(
      battleId("creature-state-invariant-issues"),
      init,
      battleExecutionScopeOrdinal(0),
    );

    expect(result.tag).toBe("invalid");
    if (result.tag !== "invalid") return;
    expect(
      result.issues.map((issue) =>
        issue.tag === "battleUnitSupportProfileIssue"
          ? issue.message
          : battleStateInitIssueMessage(issue),
      ),
    ).toEqual([
      "Duplicate character battle resource unit: fighter_second_wind",
      "Duplicate character battle feature unit: barbarian_reckless_attack",
      "Duplicate character battle weapon mastery selection: weapon_longsword",
      "Character battle loadout cannot wield shield and off-hand weapon.",
      "Two-handed weapon grip requires both hands free.",
      "Character battle loadout must match armor-class hand state.",
    ]);
  });

  test("returns execution projection issues from public character admission", () => {
    const tacticalMind = characterBattleFeatureInitForTest(
      decodeUnitRecordSync(fighterTacticalMindInput),
      [{ className: "fighter", level: classLevel(9) }],
    );
    const indomitable = characterBattleFeatureInitForTest(
      decodeUnitRecordSync(fighterIndomitableInput),
      [{ className: "fighter", level: classLevel(9) }],
    );
    const result = battleCreatureStateAdmissionFromInit(
      battleId("creature-state-execution-issues"),
      characterSeed({
        initiative: 10,
        classLevels: [{ className: "fighter", level: 9 }],
        unitFeatures: [tacticalMind, indomitable],
      }),
      battleExecutionScopeOrdinal(0),
    );

    expect(result.tag).toBe("invalid");
    if (result.tag !== "invalid") return;
    expect(
      result.issues.map((issue) =>
        issue.tag === "battleUnitSupportProfileIssue"
          ? issue.message
          : battleStateInitIssueMessage(issue),
      ),
    ).toEqual([
      "Unit feature profile failedAbilityCheckResourceBoost references an unavailable mechanical execution resource.",
      "Unit feature profile failedSavingThrowReroll references an unavailable mechanical execution resource.",
    ]);
  });

  test("returns unresolved Stat Block resistance choices from public admission", () => {
    const source = statBlockRecord();
    const init = statBlockCreatureInit({
      initiative: 10,
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          resistances: { kind: "choose_one_from", options: ["fire"] },
        },
      },
    });

    const result = startBattle({
      battleId: battleId("creature-state-stat-block-issue"),
      combatants: [init],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(battleStateInitIssueMessage(result.failure)).toBe(
      "Battle runtime requires Stat Block resistance choices to be resolved before admission.",
    );
  });

  test("returns positive-HP lifecycle contradictions from public admission", () => {
    const result = startBattle({
      battleId: battleId("creature-state-positive-hp-lifecycle"),
      combatants: [
        characterSeed({
          initiative: 10,
          currentHp: 1,
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: {
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
              hpRegained: false,
            },
          },
        }),
      ],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(battleStateInitIssueMessage(result.failure)).toBe(
      "Positive-HP character battle initialization cannot carry zero-HP lifecycle state.",
    );
  });

  test("returns semantically invalid zero-HP death-save state from public admission", () => {
    const result = startBattle({
      battleId: battleId("creature-state-invalid-death-save-state"),
      combatants: [
        characterSeed({
          initiative: 10,
          currentHp: 0,
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: {
              deathSaves: { successes: 0, failures: 2 },
              stable: false,
              dead: true,
              hpRegained: false,
            },
          },
        }),
      ],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(battleStateInitIssueMessage(result.failure)).toBe(
      "Character battle initialization zero-HP lifecycle is invalid.",
    );
  });

  test("returns malformed metamagic ownership from public admission", () => {
    const result = startBattle({
      battleId: battleId("creature-state-metamagic-issue"),
      combatants: [
        characterSeed({
          initiative: 10,
          metamagic: {
            sorceryPointResourceUnitId: unitId("sorcerer_font_of_magic"),
            spellUseLimit: "one_per_spell_unless_option_allows_stacking",
            knownOptions: [],
          },
        }),
      ],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(battleStateInitIssueMessage(result.failure)).toBe(
      "Metamagic battle state requires at least one known option fact.",
    );
  });

  test("returns malformed ritual spell access from public admission", () => {
    const result = startBattle({
      battleId: battleId("creature-state-ritual-issue"),
      combatants: [
        characterSeed({
          initiative: 10,
          spellcasting: {
            ...wizardSpellcasting(),
            spellbookRitualSpellAccesses: [
              {
                tag: "spellbookRitual",
                spell: spellRecord("fire_bolt"),
                featureUnitId: unitId("synthetic_ritual_owner"),
              },
            ],
          },
        }),
      ],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(battleStateInitIssueMessage(result.failure)).toBe(
      "Spellbook Ritual Spell Access must reference ritual-tagged leveled Spell Definitions.",
    );
  });

  test("admits mechanics-only Unit references beside spellcasting facts", () => {
    const result = startBattle({
      battleId: battleId("creature-state-mechanics-only-spellcasting"),
      combatants: [
        characterSeed({
          initiative: 10,
          classLevels: [{ className: "wizard", level: 1 }],
          spellcasting: wizardSpellcasting(),
          characterUnitRefs: [
            {
              unit: {
                id: unitId("synthetic_mechanics_only_dash"),
                syntheticLabel: "Synthetic Mechanics-Only Dash",
                provenance: {
                  kind: "classic-2024-mechanics-source-lane",
                },
                kind: "class_feature",
                mechanics: {
                  family: "alternate_action_cost",
                  from: { kind: "standard_action", actions: ["dash"] },
                  to: { kind: "bonus_action" },
                },
              },
              supportProfiles: [
                {
                  kind: "alternateActionCost",
                  from: { kind: "standardAction", actions: ["dash"] },
                  to: { kind: "bonusAction" },
                },
              ],
            },
          ],
        }),
      ],
    });

    expect(Result.isSuccess(result)).toBe(true);
  });

  test("returns missing Unconscious condition for positive-HP Knocked Out admission", () => {
    const result = startBattle({
      battleId: battleId("creature-state-positive-hp-unconscious"),
      combatants: [
        characterSeed({
          initiative: 10,
          currentHp: 1,
          positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
        }),
      ],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(battleStateInitIssueMessage(result.failure)).toBe(
      "Knocked Out Unconscious initialization requires the Unconscious condition.",
    );
  });
});
