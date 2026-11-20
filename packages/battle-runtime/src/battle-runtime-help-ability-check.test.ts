// KERNEL-COVERAGE: parity-witness BATTLE.HELP.ABILITY_CHECK_ASSIST
import type { Skill } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  abilityCheckFill,
  battleId,
  characterSeed,
  combatantId,
  difficultyClass,
  endTurn,
  fighterId,
  findAct,
  findHole,
  goblinId,
  hidePrerequisites,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  wizardId,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  discoverBattleActCandidates,
  discoverBattleActs,
  magicSubject,
  savingThrowOutcomeFill,
  spellRecord,
  startBattleSessionRight,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type { BattleFill } from "./battle-state-execution.ts";
import { combatantSkillProficiencies } from "./battle-reducer/druid-wild-shape.ts";
import type { CombatantId } from "./identity.ts";

// RAW: .references/srd-5.2.1/rules-glossary.md, Help [Action], "Assist an
// Ability Check.": "Choose one of your skill or tool proficiencies and one
// ally who is near enough for you to assist verbally or physically when they
// make an ability check. That ally has Advantage on the next ability check
// they make with the chosen skill or tool. This benefit expires if the ally
// doesn't use it before the start of your next turn. The GM has final say on
// whether your assistance is possible."

const rogueId = combatantId("rogue");

function proficientIn(...skills: readonly Skill[]) {
  return { ...testCharacterD20Statistics(), skillProficiencies: skills };
}

/** Fighter (20) helps, Goblin (10), then Rogue (5) can Hide or Search. */
function helpBattle(input?: {
  readonly helperSkills?: readonly Skill[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle-help-ability-check"),
    combatants: [
      characterSeed({
        initiative: 20,
        d20Statistics: proficientIn(
          ...(input?.helperSkills ?? ["perception", "stealth"]),
        ),
      }),
      statBlockCreatureInit({ initiative: 10 }),
      characterSeed({
        combatantId: rogueId,
        displayName: "Rogue",
        initiative: 5,
      }),
    ],
    hidePrerequisites: hidePrerequisites([
      [rogueId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
    ]),
  });
}

function helpSubject(actorId: CombatantId): BattleSubject {
  return { tag: "action", actorId, action: "helpAbilityCheck" };
}

function helpDecision(
  state: BattleState,
  helperId: CombatantId,
  decision: {
    readonly allyId: CombatantId;
    readonly skill: Skill;
    readonly allyCanBeAssisted?: boolean;
  },
): BattleFill {
  const hole = findHole(
    findAct(state, helpSubject(helperId)).initialHoles,
    "helpAbilityCheckDecision",
  );
  return {
    kind: "helpAbilityCheckDecision",
    holeId: hole.holeId,
    allyId: decision.allyId,
    skill: decision.skill,
    allyCanBeAssisted: decision.allyCanBeAssisted ?? true,
  };
}

function help(
  state: BattleState,
  helperId: CombatantId,
  decision: { readonly allyId: CombatantId; readonly skill: Skill },
): BattleState {
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: helpSubject(helperId),
      fills: [helpDecision(state, helperId, decision)],
    }),
  ).state;
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

const hideSubject: BattleSubject = {
  tag: "action",
  actorId: rogueId,
  action: "hide",
};

function hideCheckHole(state: BattleState) {
  return findHole(findAct(state, hideSubject).initialHoles, "abilityCheck");
}

describe("Help: Assist an Ability Check", () => {
  test("is offered with every other live creature and the helper's skill proficiencies", () => {
    const state = helpBattle({ helperSkills: ["stealth", "athletics"] });
    const act = findAct(state, helpSubject(fighterId));
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "helpAbilityCheckDecision",
        helperId: fighterId,
        allyChoices: [goblinId, rogueId],
        skillChoices: ["athletics", "stealth"],
      }),
    ]);
  });

  test("is not offered to a creature without a skill proficiency", () => {
    const state = helpBattle({ helperSkills: [] });
    expect(
      discoverBattleActCandidates(state).some(
        (candidate) =>
          candidate.subject.tag === "action" &&
          candidate.subject.action === "helpAbilityCheck",
      ),
    ).toBe(false);
  });

  test("takes the Help action and gives the ally Advantage on its next check with that skill", () => {
    const state = helpBattle();
    const helped = help(state, fighterId, {
      allyId: rogueId,
      skill: "stealth",
    });
    expect(helped.currentTurnResources.actionResources).toEqual([]);
    expect(helped.helpAbilityChecks).toEqual([
      {
        helperId: fighterId,
        allyId: rogueId,
        skill: "stealth",
        expiresAt: { kind: "startOfTurn", combatantId: fighterId },
      },
    ]);

    const rogueTurn = endTurns(helped, [fighterId, goblinId]);
    const checkHole = hideCheckHole(rogueTurn);
    expect(checkHole).toMatchObject({
      skill: "stealth",
      rollMode: "advantage",
    });

    const hidden = requireResolved(
      resolveBattleSubject({
        state: rogueTurn,
        subject: hideSubject,
        fills: [
          abilityCheckFill(checkHole, { total: 18, rollMode: "advantage" }),
        ],
      }),
    );
    expect(hidden.snapshot.helpAbilityCheckMarkers).toEqual([]);
    expect(hidden.state.combatants.get(rogueId)?.hidden).not.toBeNull();
  });

  test("does not help a check with another skill, and stays until that skill's check", () => {
    const state = helpBattle();
    const helped = help(state, fighterId, {
      allyId: rogueId,
      skill: "perception",
    });
    const rogueTurn = endTurns(helped, [fighterId, goblinId]);
    const checkHole = hideCheckHole(rogueTurn);
    expect(checkHole).not.toHaveProperty("rollMode");

    const afterHide = requireResolved(
      resolveBattleSubject({
        state: rogueTurn,
        subject: hideSubject,
        fills: [abilityCheckFill(checkHole, 18)],
      }),
    );
    expect(afterHide.snapshot.helpAbilityCheckMarkers).toEqual([
      expect.objectContaining({ allyId: rogueId, skill: "perception" }),
    ]);
  });

  test("helps the ally's Search, a Wisdom (Perception) check", () => {
    const helped = help(helpBattle(), fighterId, {
      allyId: rogueId,
      skill: "perception",
    });
    const rogueTurn = endTurns(helped, [fighterId, goblinId]);
    const goblin = rogueTurn.combatants.get(goblinId);
    if (goblin === undefined) throw new Error("Goblin is in the battle.");
    const goblinHidden: BattleState = {
      ...rogueTurn,
      combatants: new Map(rogueTurn.combatants).set(goblinId, {
        ...goblin,
        hidden: { discoveryDc: difficultyClass(15) },
      }),
    };
    const searchSubject: BattleSubject = {
      tag: "action",
      actorId: rogueId,
      action: "search",
    };
    const target = requireHole(
      resolveBattleSubject({
        state: goblinHidden,
        subject: searchSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, goblinId);
    const check = requireHole(
      resolveBattleSubject({
        state: goblinHidden,
        subject: searchSubject,
        fills: [targetChoice],
      }),
      "abilityCheck",
    );
    expect(check).toMatchObject({ skill: "perception", rollMode: "advantage" });
    const searched = requireResolved(
      resolveBattleSubject({
        state: goblinHidden,
        subject: searchSubject,
        fills: [targetChoice, abilityCheckFill(check, 16)],
      }),
    );
    expect(searched.snapshot.helpAbilityCheckMarkers).toEqual([]);
    expect(searched.state.combatants.get(goblinId)?.hidden).toBeNull();
  });

  test("helps the ally escape Entangle with a Strength (Athletics) check", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-help-ability-check-entangle"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          initiative: 15,
          d20Statistics: proficientIn("athletics"),
        }),
        characterSeed({
          combatantId: rogueId,
          displayName: "Rogue",
          initiative: 5,
        }),
      ],
    });
    const entangle = findAct(session, magicSubject("entangle")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: entangle,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const entangled = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: entangle,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: rogueId, succeeded: false, withoutRoll: true as const },
          ]),
        ],
      }),
    ).state;
    const fighterTurn = endTurns(entangled, [wizardId]);
    const helped = help(fighterTurn, fighterId, {
      allyId: rogueId,
      skill: "athletics",
    });
    const rogueTurn = endTurns(helped, [fighterId]);
    const escape = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: rogueTurn,
        context: session.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint",
    );
    if (escape === undefined)
      throw new Error("Expected Entangle escape action.");
    const check = findHole(escape.initialHoles, "abilityCheck");
    expect(check).toMatchObject({ skill: "athletics", rollMode: "advantage" });
    const escaped = requireResolved(
      resolveBattleSubject({
        state: rogueTurn,
        subject: escape.subject,
        fills: [abilityCheckFill(check, 14)],
      }),
    );
    expect(escaped.snapshot.helpAbilityCheckMarkers).toEqual([]);
    expect(escaped.state.combatants.get(rogueId)?.conditions).not.toMatchObject(
      {
        restrained: true,
      },
    );
  });

  test("expires at the start of the helper's next turn if the ally doesn't use it", () => {
    const helped = help(helpBattle(), fighterId, {
      allyId: rogueId,
      skill: "stealth",
    });
    const rogueTurn = endTurns(helped, [fighterId, goblinId]);
    expect(rogueTurn.helpAbilityChecks).toHaveLength(1);
    const fighterNextTurn = endTurns(rogueTurn, [rogueId]);
    expect(fighterNextTurn.helpAbilityChecks).toEqual([]);
  });

  test("two helpers' benefits are both spent by the ally's next check with that skill", () => {
    const state = startBattleRight({
      battleId: battleId("battle-help-ability-check-two-helpers"),
      combatants: [
        characterSeed({
          initiative: 20,
          d20Statistics: proficientIn("stealth"),
        }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 15,
          d20Statistics: proficientIn("stealth"),
        }),
        characterSeed({
          combatantId: rogueId,
          displayName: "Rogue",
          initiative: 5,
        }),
      ],
      hidePrerequisites: hidePrerequisites([
        [rogueId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
      ]),
    });
    const fighterHelped = help(state, fighterId, {
      allyId: rogueId,
      skill: "stealth",
    });
    const wizardTurn = endTurns(fighterHelped, [fighterId]);
    const bothHelped = help(wizardTurn, wizardId, {
      allyId: rogueId,
      skill: "stealth",
    });
    const rogueTurn = endTurns(bothHelped, [wizardId]);
    const afterHide = requireResolved(
      resolveBattleSubject({
        state: rogueTurn,
        subject: hideSubject,
        fills: [abilityCheckFill(hideCheckHole(rogueTurn), 18)],
      }),
    );
    expect(afterHide.snapshot.helpAbilityCheckMarkers).toEqual([]);
  });

  test.each([
    {
      name: "an ally the helper can't assist",
      decision: { allyId: rogueId, skill: "stealth", allyCanBeAssisted: false },
    },
    {
      name: "a skill the helper isn't proficient in",
      decision: { allyId: rogueId, skill: "arcana", allyCanBeAssisted: true },
    },
    {
      name: "the helper itself",
      decision: {
        allyId: fighterId,
        skill: "stealth",
        allyCanBeAssisted: true,
      },
    },
  ] as const)("rejects $name", ({ decision }) => {
    const state = helpBattle();
    const result = resolveBattleSubject({
      state,
      subject: helpSubject(fighterId),
      fills: [helpDecision(state, fighterId, decision)],
    });
    expect(result).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("asks for the decision before resolving", () => {
    const state = helpBattle();
    expect(
      requireHole(
        resolveBattleSubject({
          state,
          subject: helpSubject(fighterId),
          fills: [],
        }),
        "helpAbilityCheckDecision",
      ),
    ).toMatchObject({ helperId: fighterId });
  });

  test("a Stat Block's Skills entry gives its skill proficiencies", () => {
    const goblin = helpBattle().combatants.get(goblinId);
    expect(goblin && combatantSkillProficiencies(goblin)).toEqual(["stealth"]);
  });
});
