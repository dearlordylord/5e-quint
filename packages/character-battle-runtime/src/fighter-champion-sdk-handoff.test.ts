import { statBlockId as authoredStatBlockId } from "@dnd/shared/game-facts";
import {
  characterProcedureBinding,
  combatantId,
  requiredInitiativeRollModeForCombatant,
  resolveBattleSubject,
  resolveFailedAbilityCheckResourceBoost,
} from "@dnd/battle-runtime";
import { difficultyClass } from "@dnd/shared/types";
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
              initiative: { kind: "rollAdvantage", roll: "initiative" },
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

    const boosted = resolveFailedAbilityCheckResourceBoost({
      state: session.state,
      procedureRef: tacticalMindRef,
      abilityCheck: {
        actorId,
        ability: "int",
        skillOrToolLabel: "Investigation",
        originalTotal: 13,
        dc: difficultyClass(15),
      },
      boostRoll: 3,
    });
    expect(boosted).toMatchObject({
      tag: "resolved",
      abilityCheckBoost: { boostedTotal: 16, boostedSucceeded: true },
    });
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: session.state,
        procedureRef: tacticalMindRef,
        abilityCheck: {
          actorId,
          ability: "int",
          originalTotal: 15,
          dc: difficultyClass(15),
        },
        boostRoll: 3,
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

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
