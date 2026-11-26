// KERNEL-COVERAGE: parity-witness BATTLE.HELP.ABILITY_CHECK_ASSIST
// RAW: .references/srd-5.2.1/rules-glossary.md, Grappling, "Ending a
// Grapple.": "A Grappled creature can use its action to make a Strength
// (Athletics) or Dexterity (Acrobatics) check against the grapple's escape DC,
// ending the condition on itself on a success."
// Help [Action], "Assist an Ability Check.": "That ally has Advantage on the
// next ability check they make with the chosen skill or tool. This benefit
// expires if the ally doesn't use it before the start of your next turn."
// D20 Test, "Advantage/Disadvantage": a roll with both has neither.
import { classLevel } from "@dnd/shared/types";
import type { Skill } from "@dnd/surface/surface/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import {
  battleId,
  characterBattleFeatureInitForTest,
  characterSeed,
  combatantId,
  discoverBattleActCandidates,
  discoverBattleActs,
  endTurn,
  fighterId,
  findAct,
  findHole,
  grappleOutcomeFill,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  startBattleSessionRight,
  targetFill,
  testCharacterD20Statistics,
  wizardId,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type { EscapeGrappleSkill } from "./battle-subjects.ts";
import type { CombatantId } from "./identity.ts";
import {
  battleUnitRefWithSupportProfiles,
  fighterRemarkableAthleteUnitId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";

const rogueId = combatantId("rogue");
const clericId = combatantId("cleric");

function proficientIn(...skills: readonly Skill[]) {
  return { ...testCharacterD20Statistics(), skillProficiencies: skills };
}

/**
 * Fighter (20) grapples the Rogue, the Wizard (15) and Cleric (12) can Help,
 * then the Rogue (5) can escape. Returns the start of the Wizard's turn.
 */
function rogueGrappledBattle(input?: {
  readonly rogueConditions?: readonly "poisoned"[];
  readonly rogue?: Partial<Parameters<typeof characterSeed>[0]>;
}) {
  const session = startBattleSessionRight({
    battleId: battleId("battle-escape-grapple-help"),
    combatants: [
      characterSeed({ initiative: 20 }),
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 15,
        attack: null,
        d20Statistics: proficientIn("athletics", "acrobatics"),
      }),
      characterSeed({
        combatantId: clericId,
        displayName: "Cleric",
        initiative: 12,
        attack: null,
        d20Statistics: proficientIn("athletics"),
      }),
      characterSeed({
        combatantId: rogueId,
        displayName: "Rogue",
        initiative: 5,
        attack: null,
        ...(input?.rogueConditions === undefined
          ? {}
          : { conditions: input.rogueConditions }),
        ...input?.rogue,
      }),
    ],
  });
  const grapple: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "grapple",
  };
  const target = requireHole(
    resolveBattleSubject({ state: session.state, subject: grapple, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state: session.state,
      subject: grapple,
      fills: [targetFill(target, rogueId)],
    }),
    "grappleOutcome",
  );
  const grappled = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: grapple,
      fills: [targetFill(target, rogueId), grappleOutcomeFill(outcome, false)],
    }),
  ).state;
  return {
    state: endTurns(grappled, [fighterId]),
    context: session.context,
  };
}

function endTurns(
  state: BattleState,
  actorIds: readonly CombatantId[],
): BattleState {
  return actorIds.reduce(
    (current, actorId) =>
      requireResolved(endTurn({ state: current, actorId })).state,
    state,
  );
}

function help(
  state: BattleState,
  helperId: CombatantId,
  skill: EscapeGrappleSkill,
): BattleState {
  const subject: BattleSubject = {
    tag: "action",
    actorId: helperId,
    action: "helpAbilityCheck",
  };
  const hole = findHole(
    findAct(state, subject).initialHoles,
    "helpAbilityCheckDecision",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        {
          kind: "helpAbilityCheckDecision",
          holeId: hole.holeId,
          allyId: rogueId,
          skill,
          allyCanBeAssisted: true,
        },
      ],
    }),
  ).state;
}

function escapeSubject(skill: EscapeGrappleSkill): BattleSubject {
  return { tag: "action", actorId: rogueId, action: "escapeGrapple", skill };
}

function escapeHole(state: BattleState, skill: EscapeGrappleSkill) {
  return findHole(
    findAct(state, escapeSubject(skill)).initialHoles,
    "grappleOutcome",
  );
}

function escape(
  state: BattleState,
  skill: EscapeGrappleSkill,
  succeeded: boolean,
) {
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: escapeSubject(skill),
      fills: [grappleOutcomeFill(escapeHole(state, skill), succeeded)],
    }),
  );
}

describe("Escape Grapple: the escaper's choice of skill", () => {
  test("offers a Strength (Athletics) and a Dexterity (Acrobatics) escape against the escape DC", () => {
    const { state, context } = rogueGrappledBattle();
    const rogueTurn = endTurns(state, [wizardId, clericId]);
    const escapes = discoverBattleActCandidates(rogueTurn).filter(
      (act) =>
        act.subject.tag === "action" && act.subject.action === "escapeGrapple",
    );

    expect(escapes.map((act) => act.subject)).toEqual([
      escapeSubject("athletics"),
      escapeSubject("acrobatics"),
    ]);
    const dc = rogueTurn.grapples[0]?.escapeDc;
    expect(escapeHole(rogueTurn, "athletics")).toMatchObject({
      mode: "escapeCheck",
      targetId: fighterId,
      dc,
      label: `Escape Grapple Strength (Athletics) check (DC ${dc})`,
    });
    expect(escapeHole(rogueTurn, "acrobatics")).toMatchObject({
      label: `Escape Grapple Dexterity (Acrobatics) check (DC ${dc})`,
    });
    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({ state: rogueTurn, context }),
      )
        .filter(
          (act) =>
            act.subject.tag === "action" &&
            act.subject.action === "escapeGrapple",
        )
        .map((act) => act.label),
    ).toEqual(["Escape Grapple (Athletics)", "Escape Grapple (Acrobatics)"]);
  });

  test.each(["athletics", "acrobatics"] as const)(
    "a %s escape ends the grapple on a success and keeps it on a failure",
    (skill) => {
      const { state } = rogueGrappledBattle();
      const rogueTurn = endTurns(state, [wizardId, clericId]);

      expect(escape(rogueTurn, skill, true).state.grapples).toEqual([]);
      const failed = escape(rogueTurn, skill, false);
      expect(failed.state.grapples).toHaveLength(1);
      expect(failed.snapshot.turn.actionResources).toEqual([]);
    },
  );
});

describe("Escape Grapple: Help with the chosen skill", () => {
  test.each(["athletics", "acrobatics"] as const)(
    "Help with %s gives that escape Advantage and is used up by it",
    (skill) => {
      const { state } = rogueGrappledBattle();
      const helped = help(state, wizardId, skill);
      const rogueTurn = endTurns(helped, [wizardId, clericId]);
      const otherSkill = skill === "athletics" ? "acrobatics" : "athletics";

      expect(escapeHole(rogueTurn, skill)).toMatchObject({
        rollMode: "advantage",
      });
      expect(escapeHole(rogueTurn, otherSkill)).not.toHaveProperty("rollMode");
      for (const succeeded of [true, false]) {
        const escaped = escape(rogueTurn, skill, succeeded);
        expect(escaped.state.helpAbilityChecks).toEqual([]);
        expect(escaped.snapshot.helpAbilityCheckMarkers).toEqual([]);
      }
    },
  );

  test("Help with the other skill gives no Advantage and stays until that skill's check", () => {
    const { state } = rogueGrappledBattle();
    const helped = help(state, wizardId, "athletics");
    const rogueTurn = endTurns(helped, [wizardId, clericId]);

    const escaped = escape(rogueTurn, "acrobatics", false);
    expect(escaped.snapshot.helpAbilityCheckMarkers).toEqual([
      expect.objectContaining({ allyId: rogueId, skill: "athletics" }),
    ]);
  });

  test("two helpers' benefits for the skill are both used up by the escape", () => {
    const { state } = rogueGrappledBattle();
    const wizardHelped = help(state, wizardId, "athletics");
    const clericTurn = endTurns(wizardHelped, [wizardId]);
    const bothHelped = help(clericTurn, clericId, "athletics");
    const rogueTurn = endTurns(bothHelped, [clericId]);

    expect(rogueTurn.helpAbilityChecks).toHaveLength(2);
    expect(escapeHole(rogueTurn, "athletics")).toMatchObject({
      rollMode: "advantage",
    });
    expect(
      escape(rogueTurn, "athletics", true).state.helpAbilityChecks,
    ).toEqual([]);
  });

  test.each(["athletics", "acrobatics"] as const)(
    "Poisoned's Disadvantage on a %s escape cancels Help's Advantage, and the check still uses it up",
    (skill) => {
      const { state } = rogueGrappledBattle({ rogueConditions: ["poisoned"] });
      const rogueTurn = endTurns(state, [wizardId, clericId]);
      expect(escapeHole(rogueTurn, skill)).toMatchObject({
        rollMode: "disadvantage",
      });

      const helped = endTurns(help(state, wizardId, skill), [
        wizardId,
        clericId,
      ]);
      expect(escapeHole(helped, skill)).toMatchObject({ rollMode: "normal" });
      expect(escape(helped, skill, false).state.helpAbilityChecks).toEqual([]);
    },
  );

  // RAW: .references/srd-5.2.1/classes.md, Fighter, "Level 3: Remarkable
  // Athlete": "you have Advantage on Initiative rolls and Strength (Athletics)
  // checks." An Athletics escape is one; an Acrobatics escape is not.
  test("Remarkable Athlete gives an Athletics escape Advantage, and not an Acrobatics one", () => {
    const unit = unitLibrary.requireUnit(fighterRemarkableAthleteUnitId);
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    if (Result.isFailure(unitRef)) throw new Error(unitRef.failure.message);
    const { state } = rogueGrappledBattle({
      rogue: {
        displayName: "Champion",
        classLevels: [{ className: "fighter", level: 3 }],
        characterUnitRefs: [unitRef.success],
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "fighter", level: classLevel(3) },
          ]),
        ],
      },
    });
    const championTurn = endTurns(state, [wizardId, clericId]);

    expect(escapeHole(championTurn, "athletics")).toMatchObject({
      rollMode: "advantage",
    });
    expect(escapeHole(championTurn, "acrobatics")).not.toHaveProperty(
      "rollMode",
    );
  });

  test("expires at the start of the helper's next turn if the escaper doesn't use it", () => {
    const { state } = rogueGrappledBattle();
    const helped = help(state, wizardId, "athletics");
    const rogueTurn = endTurns(helped, [wizardId, clericId]);
    const wizardNextTurn = endTurns(rogueTurn, [rogueId, fighterId]);
    expect(wizardNextTurn.helpAbilityChecks).toEqual([]);

    const rogueNextTurn = endTurns(wizardNextTurn, [wizardId, clericId]);
    expect(escapeHole(rogueNextTurn, "athletics")).not.toHaveProperty(
      "rollMode",
    );
  });
});
