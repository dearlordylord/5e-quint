// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-585 ranger_defensive_tactics
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-568 ranger_hunters_lore
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.ATTACK_ROLL_DEFENSE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-roll-defense
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.MARKED_CREATURE_DISCLOSURE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.marked-creature-defenses
// RAW: .references/srd-5.2.1/classes.md:6813-6816,6825-6832.
import { describe, expect, test } from "vitest";
import { unitId, statBlockId } from "@dnd/shared/game-facts";
import { Result } from "effect";
import {
  completeSupportedProgressionDraft,
  testProgression,
  testUnitChoiceSourceKey,
} from "@dnd/character-creation-runtime/test-support";
import {
  creationChoiceOptionId,
  finalizeCharacterDraft,
  characterBuildUnitRefs,
  classUnitIdFromUnitId,
  advanceCharacterBuildClassLevel,
} from "@dnd/character-creation-runtime";
import {
  discloseMarkedCreatureDefenses,
  combatantId,
  discoverBattleActs,
  battleActSpellSlotPresentation,
  resolveBattleRuntimeSubject,
  resolveBattleSubject,
  endTurn,
} from "@dnd/battle-runtime";
import {
  parseCharacterSheet,
  startShortRest,
  finishShortRest,
  completeShortRest,
  startLongRest,
  finishLongRest,
  completeLongRest,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
} from "@dnd/character-sheet-runtime";
import {
  unitLibrary,
  battleProcedureExecutionRefForHole,
  characterSheet,
  battleSessionFromSheets,
  monsterBattleInput,
  srdStatBlock,
  levelFiveLegalFighterBuild,
  attackSubject,
  attackTargetFill,
  attackRollFill,
  requireHole,
  ordinaryAttackDamageFills,
} from "./sdk-integration.test-support.ts";

const rangerId = combatantId("ranger:hunter-sdk");
const preyId = combatantId("prey:hunter-sdk");
function ranger(selection = "escape_the_horde", level = 7) {
  const draft = completeSupportedProgressionDraft({
    draftId: "draft:hunter-sdk",
    unitLibrary,
    progression: testProgression(unitLibrary, unitId("class_ranger"), level),
    fixtureOptionIds: (source) =>
      source.choiceKey === "equipment_purchase"
        ? [creationChoiceOptionId("weapon_longsword")]
        : undefined,
    preferredOptionIdsBySource: {
      [testUnitChoiceSourceKey(
        unitId("ranger_weapon_mastery"),
        "weapon_mastery_options",
      )]: [
        creationChoiceOptionId("weapon_longsword"),
        creationChoiceOptionId("weapon_spear"),
      ],
      [testUnitChoiceSourceKey(
        unitId("class_ranger"),
        "class_subclass_choice",
      )]: [creationChoiceOptionId("subclass_ranger_hunter")],
      [testUnitChoiceSourceKey(unitId("ranger_hunters_prey"), "hunters_prey")]:
        [creationChoiceOptionId("colossus_slayer")],
      [testUnitChoiceSourceKey(
        unitId("ranger_defensive_tactics"),
        "attack_roll_defense_choice",
      )]: [creationChoiceOptionId(selection)],
    },
  });
  const finalized = finalizeCharacterDraft({ draft, unitLibrary });
  if (finalized.tag !== "ready")
    throw new Error(
      `Expected legal Ranger7 build: ${JSON.stringify(finalized)}`,
    );
  return characterSheet({
    characterIdText: "character:hunter-sdk",
    combatantId: rangerId,
    build: finalized.build,
    initiative: 20,
  });
}

describe("Hunter Ranger public SDK route", () => {
  test("Ranger6 earns exactly one Defensive Tactics choice at7 through public advancement", () => {
    const before = ranger("escape_the_horde", 6);
    const targetBuild = ranger().sheet.build;
    const classUnit = Result.getOrThrow(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: unitId("class_ranger"),
      }),
    );
    const oldPrepared =
      before.sheet.build.spellcasting?.sources.find(
        (source) => source.sourceUnitId === classUnit,
      )?.preparedSpells ?? [];
    const nextPrepared =
      targetBuild.spellcasting?.sources.find(
        (source) => source.sourceUnitId === classUnit,
      )?.preparedSpells ?? [];
    const levelGain = {
      tag: "classLevelGainWithListPreparedSpellcasting",
      classUnitId: classUnit,
      hitPointRule: { tag: "fixedHigherLevelGain" },
      preparedSpellcasting: {
        gainedPreparedSpells: nextPrepared.filter(
          (id) => !oldPrepared.includes(id),
        ),
      },
    } as const;
    const choice = {
      kind: "unitChoice",
      featureUnitId: unitId("ranger_defensive_tactics"),
      choiceKey: "attack_roll_defense_choice",
      optionIds: [creationChoiceOptionId("escape_the_horde")],
    } as const;
    expect(
      Result.isFailure(
        advanceCharacterBuildClassLevel({
          build: before.sheet.build,
          unitLibrary,
          levelGain,
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        advanceCharacterBuildClassLevel({
          build: before.sheet.build,
          unitLibrary,
          levelGain: { ...levelGain, gainedChoices: [choice, choice] },
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        advanceCharacterBuildClassLevel({
          build: before.sheet.build,
          unitLibrary,
          levelGain: {
            ...levelGain,
            gainedChoices: [
              { ...choice, featureUnitId: unitId("ranger_hunters_lore") },
            ],
          },
        }),
      ),
    ).toBe(true);
    const build = Result.getOrThrow(
      advanceCharacterBuildClassLevel({
        build: before.sheet.build,
        unitLibrary,
        levelGain: { ...levelGain, gainedChoices: [choice] },
      }),
    );
    const fixture = characterSheet({
      characterIdText: "character:hunter-gain-sdk",
      combatantId: rangerId,
      build,
      initiative: 20,
    });
    expect(
      characterBuildUnitRefs(fixture.sheet.build, unitLibrary),
    ).toContainEqual({
      unitId: unitId("ranger_defensive_tactics"),
      selectedOption: {
        kind: "attackRollDefense",
        selection: "opportunityAttackDisadvantage",
      },
    });
    const session = battleSessionFromSheets({
      battleIdText: "battle:hunter-gain-sdk",
      characters: [fixture],
      monsters: [],
    });
    expect(session.context.characters.has(rangerId)).toBe(true);
  });
  test("legal catalog creation retains one defense and grants marked creature knowledge", () => {
    const fixture = ranger();
    const storedSheet = Result.getOrThrow(
      parseCharacterSheet(
        JSON.parse(JSON.stringify(fixture.sheet)),
        unitLibrary,
      ),
    );
    expect(storedSheet.build).toEqual(fixture.sheet.build);
    const refs = characterBuildUnitRefs(fixture.sheet.build, unitLibrary);
    expect(refs).toContainEqual({
      unitId: unitId("ranger_defensive_tactics"),
      selectedOption: {
        kind: "attackRollDefense",
        selection: "opportunityAttackDisadvantage",
      },
    });
    const session = battleSessionFromSheets({
      battleIdText: "battle:hunter-sdk",
      characters: [fixture],
      monsters: [
        monsterBattleInput(
          preyId,
          10,
          srdStatBlock(statBlockId("stat_block_skeleton")),
        ),
      ],
    });
    expect(
      discloseMarkedCreatureDefenses({
        session,
        actorId: rangerId,
        targetId: preyId,
      }),
    ).toEqual({ kind: "ineligible", reason: "targetNotMarked" });
    const act = discoverBattleActs(session).find(
      (act) =>
        battleActSpellSlotPresentation(act)?.invocation.spellId ===
        "hunters_mark",
    );
    if (act === undefined)
      throw new Error("Expected Hunter's Mark SDK spell route.");
    const target = act.initialHoles.find(
      (hole) => hole.kind === "targetChoice",
    );
    if (target === undefined) throw new Error("Expected mark target.");
    const result = resolveBattleRuntimeSubject({
      session,
      subject: act.subject,
      fills: [
        {
          kind: "targetChoice",
          holeId: target.holeId,
          value: preyId,
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: rangerId,
              targetId: preyId,
              sourceProcedureRef: battleProcedureExecutionRefForHole(target),
            },
          ],
        },
      ],
    });
    if (result.tag !== "resolved")
      throw new Error(`Expected marked state: ${JSON.stringify(result)}`);
    expect(
      discloseMarkedCreatureDefenses({
        session: result.session,
        actorId: rangerId,
        targetId: preyId,
      }),
    ).toMatchObject({
      kind: "disclosed",
      defenses: {
        vulnerabilities: ["bludgeoning"],
        immunities: {
          damageTypes: ["poison"],
          conditions: ["exhaustion", "poisoned"],
        },
      },
    });
  });
  test("a legal Fighter attack triggers disadvantage on its next attack against the same Ranger this turn", () => {
    const fighterId = combatantId("fighter:hunter-sdk");
    const session = battleSessionFromSheets({
      battleIdText: "battle:hunter-repeat-attacker-sdk",
      characters: [
        characterSheet({
          characterIdText: "character:hunter-sdk-attacker",
          combatantId: fighterId,
          build: levelFiveLegalFighterBuild(),
          initiative: 30,
        }),
        ranger("multiattack_defense"),
      ],
      monsters: [],
    });
    const subject = attackSubject(session, fighterId, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const target = attackTargetFill(
      targetHole,
      fighterId,
      rangerId,
      "Longsword",
    );
    const rollHole = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [target] }),
      "attackRoll",
    );
    expect(rollHole.rollMode).not.toBe("disadvantage");
    const roll = attackRollFill(rollHole, { total: 25, naturalD20: 15 });
    const damageHole = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [target, roll],
      }),
      "rolledDice",
    );
    const fills = ordinaryAttackDamageFills({
      state: session.state,
      subject,
      prefixFills: [target, roll],
      damage: damageHole,
      damageDice: [[1]],
    });
    const first = resolveBattleRuntimeSubject({ session, subject, fills });
    if (first.tag !== "resolved")
      throw new Error(
        `Expected completed first attack: ${JSON.stringify(first)}`,
      );
    const nextSubject = attackSubject(first.session, fighterId, "Longsword");
    const nextTargetHole = requireHole(
      resolveBattleSubject({
        state: first.session.state,
        subject: nextSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const nextTarget = attackTargetFill(
      nextTargetHole,
      fighterId,
      rangerId,
      "Longsword",
    );
    const nextRollHole = requireHole(
      resolveBattleSubject({
        state: first.session.state,
        subject: nextSubject,
        fills: [nextTarget],
      }),
      "attackRoll",
    );
    expect(nextRollHole.rollMode).toBe("disadvantage");
    expect(
      resolveBattleSubject({
        state: first.session.state,
        subject: nextSubject,
        fills: [
          nextTarget,
          attackRollFill(nextRollHole, {
            total: 25,
            naturalD20: 15,
            rollMode: "normal",
          }),
        ],
      }).tag,
    ).toBe("invalid");
    const ended = endTurn({ state: first.session.state, actorId: fighterId });
    if (ended.tag !== "resolved") throw new Error("Expected turn end.");
    expect(
      ended.state.currentTurnResources.attackRollDefensesTriggeredThisTurn,
    ).toEqual([]);
  });
  test("completed Short and Long Rests replace one retained option and reject an unowned source", () => {
    const fixture = ranger();
    const shortStart = Result.getOrThrow(
      startShortRest({ sheet: fixture.sheet }),
    );
    const shortCompletion = Result.getOrThrow(
      finishShortRest({
        rest: shortStart,
        restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
      }),
    );
    const changed = Result.getOrThrow(
      completeShortRest({
        completion: shortCompletion,
        unitLibrary,
        attackRollDefenseReplacement: {
          featureUnitId: unitId("ranger_defensive_tactics"),
          selectedOption: {
            kind: "attackRollDefense",
            selection: "repeatAttackerAfterHitDisadvantage",
          },
        },
      }),
    );
    expect(characterBuildUnitRefs(changed.build, unitLibrary)).toContainEqual({
      unitId: unitId("ranger_defensive_tactics"),
      selectedOption: {
        kind: "attackRollDefense",
        selection: "repeatAttackerAfterHitDisadvantage",
      },
    });
    expect(
      Result.isFailure(
        completeShortRest({
          completion: shortCompletion,
          unitLibrary,
          attackRollDefenseReplacement: {
            featureUnitId: unitId("ranger_hunters_lore"),
            selectedOption: {
              kind: "attackRollDefense",
              selection: "repeatAttackerAfterHitDisadvantage",
            },
          },
        }),
      ),
    ).toBe(true);
    const longStart = Result.getOrThrow(
      startLongRest({ sheet: changed, timing: { tag: "noPriorLongRest" } }),
    );
    const longCompletion = Result.getOrThrow(
      finishLongRest({
        rest: longStart,
        restedTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS,
      }),
    );
    const restored = Result.getOrThrow(
      completeLongRest({
        completion: longCompletion,
        unitLibrary,
        attackRollDefenseReplacement: {
          featureUnitId: unitId("ranger_defensive_tactics"),
          selectedOption: {
            kind: "attackRollDefense",
            selection: "opportunityAttackDisadvantage",
          },
        },
      }),
    );
    expect(characterBuildUnitRefs(restored.build, unitLibrary)).toContainEqual({
      unitId: unitId("ranger_defensive_tactics"),
      selectedOption: {
        kind: "attackRollDefense",
        selection: "opportunityAttackDisadvantage",
      },
    });
  });
});
