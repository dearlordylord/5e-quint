// KERNEL-COVERAGE: parity-witness BATTLE.HELP.ABILITY_CHECK_ASSIST
import { classLevel } from "@dnd/shared/types";
import type { Skill } from "@dnd/surface/surface/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import {
  abilityCheckFill,
  battleId,
  characterBattleFeatureInitForTest,
  characterSeed,
  combatantId,
  difficultyClass,
  endTurn,
  fighterId,
  findAct,
  findHole,
  goblinId,
  hidePrerequisites,
  interruptDecisionFill,
  readyDeclarationFillForTest,
  removeBattleCombatantsRight,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
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
import { HELP_ABILITY_CHECK_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import { combatantSkillProficiencies } from "./battle-reducer/druid-wild-shape.ts";
import { temporaryAbilityCheckRollModeInfluenceAbilityCheckHole } from "./battle-reducer/hole-helpers.ts";
import type { CombatantId } from "./identity.ts";
import {
  battleUnitRefWithSupportProfiles,
  fighterRemarkableAthleteUnitId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";

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

type BattleContext = Parameters<
  typeof battleRuntimeSessionForTest
>[0]["context"];

/**
 * Druid (20) casts Entangle and `restrained` (5) fails its save; returns the
 * start of the Fighter's (15) turn. The Fighter is proficient in Athletics.
 */
function entangledFighterTurn(restrained: ReturnType<typeof characterSeed>): {
  readonly state: BattleState;
  readonly context: BattleContext;
} {
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
      restrained,
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
  return {
    state: endTurns(entangled, [wizardId]),
    context: session.context,
  };
}

function escapeRestraintAct(state: BattleState, context: BattleContext) {
  const escape = discoverBattleActs(
    battleRuntimeSessionForTest({ state, context }),
  ).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "escapeSpellRestraint",
  );
  if (escape === undefined) throw new Error("Expected Entangle escape action.");
  return {
    subject: escape.subject,
    check: findHole(escape.initialHoles, "abilityCheck"),
  };
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
    const { state, context } = entangledFighterTurn(
      characterSeed({
        combatantId: rogueId,
        displayName: "Rogue",
        initiative: 5,
      }),
    );
    const helped = help(state, fighterId, {
      allyId: rogueId,
      skill: "athletics",
    });
    const rogueTurn = endTurns(helped, [fighterId]);
    const escape = escapeRestraintAct(rogueTurn, context);
    expect(escape.check).toMatchObject({
      skill: "athletics",
      rollMode: "advantage",
    });
    const escaped = requireResolved(
      resolveBattleSubject({
        state: rogueTurn,
        subject: escape.subject,
        fills: [abilityCheckFill(escape.check, 14)],
      }),
    );
    expect(escaped.snapshot.helpAbilityCheckMarkers).toEqual([]);
    expect(escaped.state.combatants.get(rogueId)?.conditions).not.toMatchObject(
      {
        restrained: true,
      },
    );
  });

  // RAW: .references/srd-5.2.1/classes.md, Fighter, "Level 3: Remarkable
  // Athlete": "you have Advantage on Initiative rolls and Strength (Athletics)
  // checks." Escaping Entangle now names its skill, so this source applies.
  test("escaping Entangle also gets Remarkable Athlete's Advantage", () => {
    const unit = unitLibrary.requireUnit(fighterRemarkableAthleteUnitId);
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    if (Result.isFailure(unitRef)) throw new Error(unitRef.failure.message);
    const { state, context } = entangledFighterTurn(
      characterSeed({
        combatantId: rogueId,
        displayName: "Champion",
        initiative: 5,
        classLevels: [{ className: "fighter", level: 3 }],
        characterUnitRefs: [unitRef.success],
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "fighter", level: classLevel(3) },
          ]),
        ],
      }),
    );
    const championTurn = endTurns(state, [fighterId]);
    expect(escapeRestraintAct(championTurn, context).check).toMatchObject({
      skill: "athletics",
      rollMode: "advantage",
    });
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

  test("rejects an extra fill, or a decision for another hole", () => {
    const state = helpBattle();
    const decision = helpDecision(state, fighterId, {
      allyId: rogueId,
      skill: "stealth",
    });
    const helpAttackHole = findAct(state, {
      tag: "action",
      actorId: fighterId,
      action: "helpAttack",
    }).initialHoles[0];
    if (helpAttackHole === undefined) throw new Error("Expected a Help hole.");
    for (const fills of [
      [decision, decision],
      [{ ...decision, holeId: helpAttackHole.holeId }],
    ]) {
      expect(
        resolveBattleSubject({
          state,
          subject: helpSubject(fighterId),
          fills,
        }),
      ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    }
  });

  test("is stale for a helper with no skill proficiency", () => {
    expect(
      resolveBattleSubject({
        state: helpBattle({ helperSkills: [] }),
        subject: helpSubject(fighterId),
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("an Influence check, which the runtime doesn't resolve, neither shows nor uses the benefit", () => {
    const helped = help(
      helpBattle({ helperSkills: ["intimidation"] }),
      fighterId,
      {
        allyId: rogueId,
        skill: "intimidation",
      },
    );
    const rogueTurn = endTurns(helped, [fighterId, goblinId]);
    expect(
      temporaryAbilityCheckRollModeInfluenceAbilityCheckHole(
        rogueTurn,
        rogueId,
        difficultyClass(10),
      ),
    ).not.toHaveProperty("rollMode");
    expect(rogueTurn.helpAbilityChecks).toHaveLength(1);
  });

  test("a readied Help records the benefit when it is released", () => {
    const state = helpBattle();
    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const declarationHole = findAct(state, readySubject).initialHoles[0];
    if (declarationHole?.kind !== "readyDeclaration") {
      throw new Error("Expected Ready declaration hole.");
    }
    const helpResponse = declarationHole.responseChoices.find(
      (response) =>
        response.kind === "action" &&
        response.subject.action === "helpAbilityCheck",
    );
    if (helpResponse?.kind !== "action") {
      throw new Error("Expected an offered Help (Ability Check) response.");
    }
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(
            declarationHole,
            "the rogue starts to sneak away",
            helpResponse,
          ),
        ],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: fighterId }),
    );
    const reported = resolveBattleSubject({
      state: goblinTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "reportReadyTrigger",
        readiedActorId: fighterId,
      },
      fills: [],
    });
    if (reported.tag !== "needsHoles") {
      throw new Error("Expected a reported Ready trigger interrupt.");
    }
    const released = requireResolved(
      resolveBattleInterrupt({
        state: reported.state,
        fill: interruptDecisionFill(
          requireHole(reported, "interruptDecision"),
          {
            kind: "resolve",
            responderId: fighterId,
            choice: {
              kind: "releaseReadiedAction",
              fills: [
                {
                  kind: "helpAbilityCheckDecision",
                  holeId: HELP_ABILITY_CHECK_HOLE_ID,
                  allyId: rogueId,
                  skill: "stealth",
                  allyCanBeAssisted: true,
                },
              ],
            },
          },
        ),
      }),
    );
    expect(released.state.helpAbilityChecks).toEqual([
      {
        helperId: fighterId,
        allyId: rogueId,
        skill: "stealth",
        expiresAt: { kind: "startOfTurn", combatantId: fighterId },
      },
    ]);
    expect(released.state.currentTurnResources).toEqual(
      reported.state.currentTurnResources,
    );
  });

  test("ends when the ally or the helper leaves the battle", () => {
    const helped = help(helpBattle(), fighterId, {
      allyId: rogueId,
      skill: "stealth",
    });
    expect(
      removeBattleCombatantsRight({ state: helped, combatantIds: [rogueId] })
        .helpAbilityChecks,
    ).toEqual([]);
    const goblinTurn = endTurns(helped, [fighterId]);
    expect(
      removeBattleCombatantsRight({
        state: goblinTurn,
        combatantIds: [fighterId],
      }).helpAbilityChecks,
    ).toEqual([]);
  });

  test("a Stat Block's Skills entry gives its skill proficiencies", () => {
    const goblin = helpBattle().combatants.get(goblinId);
    expect(goblin && combatantSkillProficiencies(goblin)).toEqual(["stealth"]);
  });
});
