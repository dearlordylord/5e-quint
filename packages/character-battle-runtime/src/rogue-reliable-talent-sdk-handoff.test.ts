// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.d20-test-die-minimum
// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.DIE_MINIMUM
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection GH695-D20-TEST-DIE-MINIMUM rogue_reliable_talent
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay GH695-D20-TEST-DIE-MINIMUM rogue_reliable_talent
// UNIT-IDENTITY-REPLAY: GH695-D20-TEST-DIE-MINIMUM rogue_reliable_talent doOfferAbilityCheckDieMinimum
import { defineSelectedIdentityReplayWitness } from "../../battle-runtime/src/selected-identity-witness.test-support.ts";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import {
  combatantId,
  D20_TEST_DIE_MINIMUM_EFFECT_KIND,
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleSubject,
} from "@dnd/battle-runtime";
import {
  classUnitId,
  creationChoiceOptionId,
  finalizeCharacterDraft,
} from "@dnd/character-creation-runtime";
import { completeSupportedProgressionDraft } from "@dnd/character-creation-runtime/test-support";
import { DieRollResult, difficultyClass } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  battleSessionFromSheets,
  characterSheet,
  monsterBattleInput,
  requireHole,
  requireResolved,
  srdStatBlock,
  unitLibrary,
} from "./sdk-integration.test-support.ts";

const rogueId = combatantId("rogue-7");

const hide = {
  tag: "action",
  actorId: rogueId,
  action: "hide",
} satisfies BattleSubject;

/** A real-catalog Rogue built to `level`, proficient in Stealth. */
function rogueSession(level: number) {
  const draft = completeSupportedProgressionDraft({
    draftId: `draft:rogue-${level}`,
    unitLibrary,
    progression: {
      startingClass: classUnitId(unitId("class_rogue")),
      advancements: Array.from({ length: level - 1 }, () => ({
        classUnitId: classUnitId(unitId("class_rogue")),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    fixtureOptionIds: (source) => {
      if (source.choiceKey === "class_skill_proficiency_choice")
        return ["stealth", "perception", "acrobatics", "insight"].map(
          creationChoiceOptionId,
        );
      if (source.choiceKey === "equipment_purchase")
        return [creationChoiceOptionId("weapon_dagger")];
      if (
        source.choiceKey === "class_equipment_choice" ||
        source.choiceKey === "background_equipment_choice"
      )
        return [creationChoiceOptionId("option_b")];
      return undefined;
    },
    standardArrayAssignment: {
      str: 8,
      dex: 15,
      con: 13,
      int: 12,
      wis: 14,
      cha: 10,
    },
  });
  const result = finalizeCharacterDraft({ draft, unitLibrary });
  if (result.tag !== "ready") throw new Error(`Rogue creation: ${result.tag}`);
  return battleSessionFromSheets({
    battleIdText: `battle:rogue-${level}`,
    characters: [
      characterSheet({
        characterIdText: `character:rogue-${level}`,
        combatantId: rogueId,
        build: result.build,
        initiative: 20,
      }),
    ],
    monsters: [
      monsterBattleInput(
        combatantId("opponent"),
        10,
        srdStatBlock(statBlockId("stat_block_skeleton")),
      ),
    ],
    hidePrerequisites: new Map([
      [rogueId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
    ]),
  });
}

function hideCheck(session: ReturnType<typeof rogueSession>) {
  return requireHole(
    resolveBattleSubject({ state: session.state, subject: hide, fills: [] }),
    "abilityCheck",
  );
}

function hideFill(
  hole: Extract<BattleHole, { readonly kind: "abilityCheck" }>,
  input: {
    readonly total: number;
    readonly naturalD20: number;
    readonly decision?: "use" | "decline";
  },
): Extract<BattleFill, { readonly kind: "abilityCheck" }> {
  return {
    kind: "abilityCheck",
    holeId: hole.holeId,
    value: {
      total: input.total,
      d20TestRoll: {
        tag: "single",
        naturalD20: DieRollResult(input.naturalD20),
      },
      ...(input.decision === undefined
        ? {}
        : {
            d20TestDieMinimum: {
              kind: input.decision,
              effectKind: D20_TEST_DIE_MINIMUM_EFFECT_KIND,
            },
          }),
    },
  };
}

describe("Rogue Reliable Talent real-catalog SDK handoff", () => {
  test("a Rogue 7 proficient in Stealth is offered the d20 minimum on Hide, and the table's total counts it", () => {
    const session = rogueSession(7);
    const check = hideCheck(session);
    expect(check).toMatchObject({
      skill: "stealth",
      d20TestDieMinimum: {
        effectKind: D20_TEST_DIE_MINIMUM_EFFECT_KIND,
        minimumDieFace: 10,
      },
    });
    // Natural 2 counted as 10; the table's total with the minimum is 17.
    const hidden = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: hide,
        fills: [hideFill(check, { total: 17, naturalD20: 2, decision: "use" })],
      }),
    ).state;
    expect(hidden.combatants.get(rogueId)?.hidden).toEqual({
      discoveryDc: difficultyClass(17),
    });
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: hide,
        fills: [hideFill(check, { total: 17, naturalD20: 2 })],
      }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("a Rogue 6 has no d20 minimum on the same check", () => {
    const session = rogueSession(6);
    const check = hideCheck(session);
    expect(check.skill).toBe("stealth");
    expect(check.d20TestDieMinimum).toBeUndefined();
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: hide,
        fills: [hideFill(check, { total: 17, naturalD20: 2, decision: "use" })],
      }),
    ).toMatchObject({ tag: "invalid" });
  });
});

defineSelectedIdentityReplayWitness({
  describeLabel: "Reliable Talent selected identity replay",
  taskId: "GH695-D20-TEST-DIE-MINIMUM",
  initialProjection: { selectedOffered: false, unselectedNotOffered: false },
  units: [
    {
      unitId: "rogue_reliable_talent",
      procedures: [
        {
          actionName: "doOfferAbilityCheckDieMinimum",
          discover: () => ({
            selectedOffered:
              hideCheck(rogueSession(7)).d20TestDieMinimum?.minimumDieFace ===
              10,
            unselectedNotOffered:
              hideCheck(rogueSession(6)).d20TestDieMinimum === undefined,
          }),
          projectionAfter: {
            selectedOffered: true,
            unselectedNotOffered: true,
          },
        },
      ],
    },
  ],
});
