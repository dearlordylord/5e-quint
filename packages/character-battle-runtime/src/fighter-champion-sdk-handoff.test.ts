// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
import { statBlockId as authoredStatBlockId } from "@dnd/shared/game-facts";
import {
  characterProcedureBinding,
  combatantId,
  requiredInitiativeRollModeForCombatant,
  resolveBattleSubject,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
} from "@dnd/battle-runtime";
import { DieRollResult, difficultyClass } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  attackRollFill,
  attackSubject,
  attackTargetFill,
  battleSessionFromSheets,
  characterSheet,
  levelFiveLegalFighterBuild,
  monsterBattleInput,
  requireCharacterCombatant,
  requireHole,
  srdStatBlock,
  unitFeatureDecisionFill,
} from "./sdk-integration.test-support.ts";

describe("Fighter Champion real-catalog SDK handoff", () => {
  test("selected Fighter and Champion features execute after creation and sheet handoff", () => {
    const actorId = combatantId("combatant:champion-sdk-handoff");
    const opponentId = combatantId("combatant:champion-sdk-opponent");
    const build = levelFiveLegalFighterBuild();
    expect(build.features).toContainEqual({
      kind: "selectedClassChoice",
      selectedFromUnitId: "class_fighter",
      unitId: "subclass_fighter_champion",
    });

    const fighterSheet = characterSheet({
      characterIdText: "character:champion-sdk-handoff",
      combatantId: actorId,
      build,
      initiative: 20,
    });
    expect(fighterSheet.sheet.build.features).toContainEqual({
      kind: "selectedClassChoice",
      selectedFromUnitId: "class_fighter",
      unitId: "subclass_fighter_champion",
    });
    const session = battleSessionFromSheets({
      battleIdText: "battle:champion-sdk-handoff",
      characters: [fighterSheet],
      monsters: [
        monsterBattleInput(
          opponentId,
          10,
          srdStatBlock(authoredStatBlockId("stat_block_skeleton")),
        ),
      ],
      hidePrerequisites: new Map([
        [actorId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
      ]),
    });
    const actor = requireCharacterCombatant(session.state, actorId);
    const ownership =
      session.context.characters.get(actorId)?.unitProcedureOwnership;
    expect(ownership).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ unitId: "fighter_tactical_mind" }),
        expect.objectContaining({ unitId: "fighter_improved_critical" }),
        expect.objectContaining({ unitId: "fighter_remarkable_athlete" }),
      ]),
    );
    const tacticalMindRef = ownership?.find(
      (entry) => entry.unitId === "fighter_tactical_mind",
    )?.procedureRef;
    if (tacticalMindRef === undefined) {
      throw new Error("Expected selected Tactical Mind procedure ownership.");
    }
    expect(
      characterProcedureBinding(actor.origin.execution, tacticalMindRef),
    ).toMatchObject({
      procedure: {
        kind: "unitFeature",
        execution: { kind: "failedAbilityCheckResourceBoost" },
      },
    });
    for (const { unitId, procedure } of [
      {
        unitId: "fighter_improved_critical",
        procedure: {
          kind: "unitSupportProfile",
          execution: "weaponOrUnarmedCriticalRange19",
        },
      },
      {
        unitId: "fighter_remarkable_athlete",
        procedure: {
          kind: "unitFeature",
          execution: {
            kind: "remarkableAthlete",
            remarkableAthlete: {
              abilityCheck: {
                kind: "rollAdvantage",
                ability: "str",
                skill: "athletics",
              },
            },
          },
        },
      },
    ]) {
      const procedureRef = ownership?.find(
        (entry) => entry.unitId === unitId,
      )?.procedureRef;
      if (procedureRef === undefined) {
        throw new Error(`Expected selected ${unitId} procedure ownership.`);
      }
      expect(
        characterProcedureBinding(actor.origin.execution, procedureRef),
      ).toMatchObject({ procedure });
    }

    // Tactical Mind on a failed Hide check: the check is asked again with
    // the boost, and the boost that turns it spends one Second Wind use.
    const hide = { tag: "action", actorId, action: "hide" } as const;
    const check = requireHole(
      resolveBattleSubject({ state: session.state, subject: hide, fills: [] }),
      "abilityCheck",
    );
    const failedCheck = {
      kind: "abilityCheck",
      holeId: check.holeId,
      value: { total: 13 },
    } as const;
    expect(
      requireHole(
        resolveBattleSubject({
          state: session.state,
          subject: hide,
          fills: [failedCheck],
        }),
        "abilityCheck",
      ),
    ).toMatchObject({
      failedAbilityCheckResourceBoosts: [{ rollerId: actorId, dieSize: 10 }],
    });
    const boosted = resolveBattleSubject({
      state: session.state,
      subject: hide,
      fills: [
        {
          ...failedCheck,
          value: {
            total: 13,
            d20TestAddedDice: [
              {
                kind: "addDie",
                effectKind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
                dieRoll: DieRollResult(3),
              },
            ],
          },
        },
      ],
    });
    if (boosted.tag !== "resolved") {
      throw new Error(`Expected the boosted Hide check, got ${boosted.tag}.`);
    }
    expect(boosted.state.combatants.get(actorId)?.hidden).toEqual({
      discoveryDc: difficultyClass(16),
    });

    expect(requiredInitiativeRollModeForCombatant(session.state, actorId)).toBe(
      "advantage",
    );
    expect(
      requiredInitiativeRollModeForCombatant(session.state, opponentId),
    ).toBeUndefined();

    const subject = attackSubject(session, actorId, "Longsword");
    const target = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const selectedTarget = attackTargetFill(
      target,
      actorId,
      opponentId,
      "Longsword",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [selectedTarget],
      }),
      "attackRoll",
    );
    const criticalMovementDecision = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [
          selectedTarget,
          attackRollFill(roll, { total: 1, naturalD20: 19 }),
        ],
      }),
      "unitFeatureDecision",
    );
    expect(criticalMovementDecision).toMatchObject({
      label: "Use Remarkable Athlete movement",
      choices: ["use", "decline"],
    });
    const damageOnNineteen = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [
          selectedTarget,
          attackRollFill(roll, { total: 1, naturalD20: 19 }),
          unitFeatureDecisionFill(criticalMovementDecision, "decline"),
        ],
      }),
      "rolledDice",
    );
    expect(damageOnNineteen).toMatchObject({ critical: true });

    const damageOnEighteen = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [
          selectedTarget,
          attackRollFill(roll, { total: 25, naturalD20: 18 }),
        ],
      }),
      "rolledDice",
    );
    expect(damageOnEighteen).toMatchObject({ critical: false });
  });

  test("a lost Champion selection cannot retain its battle support profiles", () => {
    const actorId = combatantId("combatant:champion-selection-removed");
    const selectedBuild = levelFiveLegalFighterBuild();
    const buildWithoutChampion = {
      ...selectedBuild,
      features: selectedBuild.features.filter(
        (feature) =>
          feature.kind !== "selectedClassChoice" ||
          feature.unitId !== "subclass_fighter_champion",
      ),
    };
    const session = battleSessionFromSheets({
      battleIdText: "battle:champion-selection-removed",
      characters: [
        characterSheet({
          characterIdText: "character:champion-selection-removed",
          combatantId: actorId,
          build: buildWithoutChampion,
          initiative: 20,
        }),
      ],
      monsters: [],
    });
    const unitIds =
      session.context.characters
        .get(actorId)
        ?.unitProcedureOwnership.map((entry) => entry.unitId) ?? [];
    expect(unitIds).not.toContain("fighter_improved_critical");
    expect(unitIds).not.toContain("fighter_remarkable_athlete");
    expect(
      requiredInitiativeRollModeForCombatant(session.state, actorId),
    ).toBeUndefined();
  });
});
