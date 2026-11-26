// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.COMBAT_TURN_START_HEROIC_INSPIRATION
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.SHARED_TURN_START
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.combat-turn-start-heroic-inspiration
// RAW: .references/srd-5.2.1/classes.md, Champion, Level 10: Heroic Warrior:
// "During combat, you can give yourself Heroic Inspiration whenever you start
// your turn without it." rules-glossary.md, Simultaneous Effects: the player
// orders effects that occur at the start of their turn.
import {
  HEROIC_INSPIRATION_AVAILABLE,
  NO_HEROIC_INSPIRATION,
  type HeroicInspiration,
} from "@dnd/shared/game-facts";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleFill,
  type BattleHole,
  type BattleState,
} from "./battle-state-execution.ts";
import { d20Roll, Round } from "@dnd/shared/types";
import {
  battleId,
  battleResolutionHolesForTest,
  characterSeed,
  deathSavingThrowFill,
  discoverBattleActs,
  endTurn,
  fighterId,
  goblinId,
  requireResolved,
  snapshotBattle,
  startBattleSessionRight,
  startTurn,
  statBlockCreatureInit,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import {
  BattleFillSchema,
  BattleHoleSchema,
} from "./battle-reducer/battle-codecs.ts";
import {
  battleContinuationFillEquals,
  isBattleContinuationComparableFill,
} from "./battle-reducer/battle-fill-equality.ts";
import { battleRuntimeSessionWithState } from "./battle-runtime-context.ts";
import { admitBattle, startBattleOpeningTurn } from "./battle-start.ts";
import { battleUnitRefWithSupportProfiles } from "./unit-feature-support.ts";

function heroicWarriorRefs() {
  const unit = unitLibrary.requireUnit("fighter_heroic_warrior");
  return [
    Result.getOrThrow(
      battleUnitRefWithSupportProfiles({ unit, unitRef: { unitId: unit.id } }),
    ),
  ];
}

type FighterAndGoblinInput = {
  readonly fighterInitiative: number;
  readonly heroicWarrior: boolean;
  readonly heroicInspiration: HeroicInspiration;
  readonly currentHp?: number;
};

function fighterAndGoblin(input: FighterAndGoblinInput) {
  return startBattleSessionRight(fighterAndGoblinStart(input));
}

function fighterAndGoblinStart(input: FighterAndGoblinInput) {
  return {
    battleId: battleId("battle:turn-start-heroic-inspiration"),
    combatants: [
      characterSeed({
        initiative: input.fighterInitiative,
        heroicInspiration: input.heroicInspiration,
        ...(input.currentHp === undefined
          ? {}
          : { currentHp: input.currentHp }),
        ...(input.heroicWarrior
          ? { characterUnitRefs: heroicWarriorRefs() }
          : {}),
      }),
      statBlockCreatureInit({ initiative: 15 }),
    ],
  };
}

/** The Goblin's opening turn, about to end into the Fighter's turn. */
function goblinTurnBeforeFighter(input: {
  readonly heroicWarrior: boolean;
  readonly heroicInspiration: HeroicInspiration;
  readonly currentHp?: number;
}) {
  return fighterAndGoblin({ ...input, fighterInitiative: 10 }).state;
}

/** The battle's opening: the Fighter acts first. */
function fighterOpening(input: {
  readonly heroicWarrior: boolean;
  readonly heroicInspiration: HeroicInspiration;
  readonly currentHp?: number;
}) {
  return fighterAndGoblin({ ...input, fighterInitiative: 20 });
}

function holesWhenFighterTurnStarts(
  state: ReturnType<typeof goblinTurnBeforeFighter>,
  fills: readonly BattleFill[] = [],
): readonly BattleHole[] {
  const result = endTurn({ state, actorId: goblinId, fills });
  return result.tag === "needsHoles"
    ? battleResolutionHolesForTest(result)
    : [];
}

function heroicInspirationOf(state: BattleState) {
  const fighter = state.combatants.get(fighterId);
  if (fighter?.origin.kind !== "character") {
    throw new Error("Expected the Fighter.");
  }
  return fighter.origin.heroicInspiration;
}

function choiceFill(
  hole: BattleHole | undefined,
  value: Extract<
    BattleFill,
    { readonly kind: "turnStartHeroicInspirationChoice" }
  >["value"],
): BattleFill {
  if (hole?.kind !== "turnStartHeroicInspirationChoice") {
    throw new Error("Expected the start-turn Heroic Inspiration choice.");
  }
  return {
    kind: "turnStartHeroicInspirationChoice",
    holeId: hole.holeId,
    value,
  };
}

function occurrenceOrderFill(
  hole: BattleHole | undefined,
  first: "turnStartHeroicInspiration" | "deathSavingThrow",
): BattleFill {
  if (hole?.kind !== "startTurnOccurrenceOrder") {
    throw new Error("Expected the simultaneous start-turn order.");
  }
  const heroic = hole.occurrences.find(
    (occurrence) => occurrence.kind === "turnStartHeroicInspiration",
  );
  const deathSave = hole.occurrences.find(
    (occurrence) => occurrence.kind === "deathSavingThrow",
  );
  if (heroic === undefined || deathSave === undefined) {
    throw new Error("Expected both start-turn occurrences.");
  }
  const [firstId, secondId] =
    first === "turnStartHeroicInspiration"
      ? [heroic.occurrenceId, deathSave.occurrenceId]
      : [deathSave.occurrenceId, heroic.occurrenceId];
  return {
    kind: "startTurnOccurrenceOrder",
    holeId: hole.holeId,
    value: { occurrenceIds: [firstId, secondId] },
  };
}

describe("Heroic Warrior at the start of a combat turn", () => {
  test("offers Heroic Inspiration to a creature that starts its turn without it", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
    });

    const [hole, ...others] = holesWhenFighterTurnStarts(state);

    expect(others).toEqual([]);
    expect(hole).toMatchObject({
      kind: "turnStartHeroicInspirationChoice",
      sourceTurn: { actorId: fighterId },
    });
  });

  test("giving it sets Heroic Inspiration, and declining leaves the creature without it", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
    });
    const [hole] = holesWhenFighterTurnStarts(state);

    const given = requireResolved(
      endTurn({
        state,
        actorId: goblinId,
        fills: [choiceFill(hole, "giveHeroicInspiration")],
      }),
    ).state;
    const declined = requireResolved(
      endTurn({
        state,
        actorId: goblinId,
        fills: [choiceFill(hole, "decline")],
      }),
    ).state;

    expect(heroicInspirationOf(given)).toEqual(HEROIC_INSPIRATION_AVAILABLE);
    expect(heroicInspirationOf(declined)).toEqual(NO_HEROIC_INSPIRATION);
  });

  test("is not offered to a creature that starts its turn with Heroic Inspiration", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });

    expect(holesWhenFighterTurnStarts(state)).toEqual([]);
    expect(
      heroicInspirationOf(
        requireResolved(endTurn({ state, actorId: goblinId })).state,
      ),
    ).toEqual(HEROIC_INSPIRATION_AVAILABLE);
  });

  test("is not offered without the feature", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: false,
      heroicInspiration: NO_HEROIC_INSPIRATION,
    });

    expect(holesWhenFighterTurnStarts(state)).toEqual([]);
  });

  test("is ordered with a Death Saving Throw at 0 Hit Points", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
      currentHp: 0,
    });
    const [orderHole] = holesWhenFighterTurnStarts(state);
    const order = occurrenceOrderFill(orderHole, "turnStartHeroicInspiration");

    const [choiceHole] = holesWhenFighterTurnStarts(state, [order]);
    const choice = choiceFill(choiceHole, "giveHeroicInspiration");
    const [deathSaveHole] = holesWhenFighterTurnStarts(state, [order, choice]);
    if (deathSaveHole === undefined) {
      throw new Error("Expected the Death Saving Throw after the choice.");
    }
    const resolved = requireResolved(
      endTurn({
        state,
        actorId: goblinId,
        fills: [
          order,
          choice,
          deathSavingThrowFill(deathSaveHole, {
            roll: 12,
            d20TestRerolls: [
              {
                kind: "decline",
                effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
              },
            ],
          }),
        ],
      }),
    ).state;

    expect(deathSaveHole.kind).toBe("deathSavingThrow");
    expect(heroicInspirationOf(resolved)).toEqual(HEROIC_INSPIRATION_AVAILABLE);
  });

  test("is offered after a Death Saving Throw ordered first, and can be declined", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
      currentHp: 0,
    });
    const [orderHole] = holesWhenFighterTurnStarts(state);
    const order = occurrenceOrderFill(orderHole, "deathSavingThrow");

    const [deathSaveHole] = holesWhenFighterTurnStarts(state, [order]);
    if (deathSaveHole?.kind !== "deathSavingThrow") {
      throw new Error("Expected the Death Saving Throw first.");
    }
    const deathSave = deathSavingThrowFill(deathSaveHole, 12);
    const [choiceHole] = holesWhenFighterTurnStarts(state, [order, deathSave]);
    const resolved = requireResolved(
      endTurn({
        state,
        actorId: goblinId,
        fills: [order, deathSave, choiceFill(choiceHole, "decline")],
      }),
    ).state;

    expect(choiceHole?.kind).toBe("turnStartHeroicInspirationChoice");
    expect(heroicInspirationOf(resolved)).toEqual(NO_HEROIC_INSPIRATION);
  });

  test("Inspiration granted before a Death Save can be spent once on that roll", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
      currentHp: 0,
    });
    const [orderHole] = holesWhenFighterTurnStarts(state);
    const order = occurrenceOrderFill(orderHole, "turnStartHeroicInspiration");
    const [choiceHole] = holesWhenFighterTurnStarts(state, [order]);
    const choice = choiceFill(choiceHole, "giveHeroicInspiration");
    const [deathHole] = holesWhenFighterTurnStarts(state, [order, choice]);
    if (deathHole?.kind !== "deathSavingThrow")
      throw new Error("Expected the Death Save.");
    const [rerollHole] = holesWhenFighterTurnStarts(state, [
      order,
      choice,
      deathSavingThrowFill(deathHole, 6),
    ]);
    expect(rerollHole).toMatchObject({
      kind: "deathSavingThrow",
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    const rolled = deathSavingThrowFill(deathHole, {
      roll: 6,
      d20TestRerolls: [
        {
          kind: "reroll",
          effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
          replacement: d20Roll(20),
        },
      ],
    });
    const resolved = requireResolved(
      endTurn({ state, actorId: goblinId, fills: [order, choice, rolled] }),
    ).state;
    expect(Number(resolved.combatants.get(fighterId)?.hp)).toBe(1);
    expect(heroicInspirationOf(resolved)).toEqual(NO_HEROIC_INSPIRATION);
    expect(resolved.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
    // The completed prior actor's procedure cannot reopen the incoming offer.
    expect(
      endTurn({
        state: resolved,
        actorId: goblinId,
        fills: [order, choice, rolled],
      }).tag,
    ).toBe("invalid");
    expect(heroicInspirationOf(resolved)).toEqual(NO_HEROIC_INSPIRATION);
  });

  test("spending Inspiration held at turn start does not create a same-turn grant", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
      currentHp: 0,
    });
    const holes = holesWhenFighterTurnStarts(state);
    expect(holes).toHaveLength(1);
    const hole = holes[0];
    if (hole?.kind !== "deathSavingThrow")
      throw new Error("Expected only the Death Save.");
    const resolved = requireResolved(
      endTurn({
        state,
        actorId: goblinId,
        fills: [
          deathSavingThrowFill(hole, {
            roll: 6,
            d20TestRerolls: [
              {
                kind: "reroll",
                effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
                replacement: d20Roll(12),
              },
            ],
          }),
        ],
      }),
    ).state;
    expect(heroicInspirationOf(resolved)).toEqual(NO_HEROIC_INSPIRATION);
    expect(resolved.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
  });

  test("a Death Save ordered before the grant has no Inspiration to spend", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
      currentHp: 0,
    });
    const [orderHole] = holesWhenFighterTurnStarts(state);
    const order = occurrenceOrderFill(orderHole, "deathSavingThrow");
    const [deathHole] = holesWhenFighterTurnStarts(state, [order]);
    if (deathHole?.kind !== "deathSavingThrow")
      throw new Error("Expected the Death Save first.");
    const death = deathSavingThrowFill(deathHole, 12);
    const [choiceHole] = holesWhenFighterTurnStarts(state, [order, death]);
    const resolved = requireResolved(
      endTurn({
        state,
        actorId: goblinId,
        fills: [order, death, choiceFill(choiceHole, "giveHeroicInspiration")],
      }),
    ).state;
    expect(heroicInspirationOf(resolved)).toEqual(HEROIC_INSPIRATION_AVAILABLE);
  });

  test("rejects two answers to one choice", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
    });
    const [hole] = holesWhenFighterTurnStarts(state);

    const result = endTurn({
      state,
      actorId: goblinId,
      fills: [
        choiceFill(hole, "giveHeroicInspiration"),
        choiceFill(hole, "decline"),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      message:
        "Heroic Inspiration choice must answer its exact occurrence once.",
    });
  });

  test("rejects a choice when nothing is offered", () => {
    const offered = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
    });
    const [hole] = holesWhenFighterTurnStarts(offered);
    const notOffered = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });

    const result = endTurn({
      state: notOffered,
      actorId: goblinId,
      fills: [choiceFill(hole, "giveHeroicInspiration")],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      message:
        "End Turn received a fill unrelated to its current turn-boundary holes.",
    });
  });

  test("its hole and fill survive the codecs, and a resubmitted choice compares equal", () => {
    const state = goblinTurnBeforeFighter({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
    });
    const [hole] = holesWhenFighterTurnStarts(state);
    if (hole === undefined) throw new Error("Expected the choice.");
    const give = choiceFill(hole, "giveHeroicInspiration");
    const decline = choiceFill(hole, "decline");

    expect(
      Schema.decodeUnknownSync(BattleHoleSchema)(
        Schema.encodeSync(BattleHoleSchema)(hole),
      ),
    ).toEqual(hole);
    expect(
      Schema.decodeUnknownSync(BattleFillSchema)(
        Schema.encodeSync(BattleFillSchema)(give),
      ),
    ).toEqual(give);
    if (
      !isBattleContinuationComparableFill(give) ||
      !isBattleContinuationComparableFill(decline)
    ) {
      throw new Error("Expected comparable start-turn fills.");
    }
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleFillSchema)({
          ...Schema.encodeSync(BattleFillSchema)(give),
          value: "takeHeroicInspiration",
        }),
      ),
    ).toBe(true);
    expect(battleContinuationFillEquals(give, give)).toBe(true);
    expect(battleContinuationFillEquals(give, decline)).toBe(false);
  });
});

function openingHoles(
  state: BattleState,
  fills: readonly BattleFill[] = [],
): readonly BattleHole[] {
  const result = startTurn({ state, actorId: fighterId, fills });
  return result.tag === "needsHoles"
    ? battleResolutionHolesForTest(result)
    : [];
}

// RAW: the first turn of combat is a turn, so its start-of-turn effects apply:
// playing-the-game.md, Death Saving Throws: "Whenever you start your turn with
// 0 Hit Points, you must make a Death Saving Throw".
describe("Heroic Warrior on the battle's opening turn", () => {
  test("the battle opens on Start Turn, and giving or declining starts the turn", () => {
    const session = fighterOpening({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
    });

    expect(session.state.currentTurnStart).toBe("pending");
    expect(discoverBattleActs(session).map((act) => act.subject)).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "startTurn" },
    ]);
    const pending = startTurn({ state: session.state, actorId: fighterId });
    if (pending.tag !== "needsHoles" || pending.frontier.kind !== "holes") {
      throw new Error("Expected the opening turn start to ask.");
    }
    expect(pending.frontier.pendingProcedure).toMatchObject({
      kind: "turnStart",
      sourceTurn: { actorId: fighterId, round: Round(1) },
      request: {
        kind: "startTurnOccurrence",
        occurrence: { kind: "turnStartHeroicInspiration" },
      },
    });
    const [hole] = battleResolutionHolesForTest(pending);

    for (const [value, expected] of [
      ["giveHeroicInspiration", HEROIC_INSPIRATION_AVAILABLE],
      ["decline", NO_HEROIC_INSPIRATION],
    ] as const) {
      const started = requireResolved(
        startTurn({
          state: session.state,
          actorId: fighterId,
          fills: [choiceFill(hole, value)],
        }),
      ).state;
      expect(heroicInspirationOf(started)).toEqual(expected);
      expect(started.currentTurnStart).toBe("started");
      expect(started.initiative).toEqual(session.state.initiative);
      expect(
        discoverBattleActs(
          battleRuntimeSessionWithState(session, started),
        ).some(
          (act) =>
            act.subject.tag === "runtimeCommand" &&
            act.subject.command === "startTurn",
        ),
      ).toBe(false);
    }
  });

  test("opens straight into ordinary Acts with Inspiration or without the feature", () => {
    for (const input of [
      { heroicWarrior: true, heroicInspiration: HEROIC_INSPIRATION_AVAILABLE },
      { heroicWarrior: false, heroicInspiration: NO_HEROIC_INSPIRATION },
    ]) {
      const session = fighterOpening(input);
      expect(session.state.currentTurnStart).toBe("started");
      expect(snapshotBattle(session.state).round).toEqual(Round(1));
      expect(
        discoverBattleActs(session).some(
          (act) =>
            act.subject.tag === "runtimeCommand" &&
            act.subject.command === "endTurn",
        ),
      ).toBe(true);
    }
  });

  test("at 0 Hit Points, Inspiration granted before the Death Save is spent on it once", () => {
    const { state } = fighterOpening({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
      currentHp: 0,
    });
    const order = occurrenceOrderFill(
      openingHoles(state)[0],
      "turnStartHeroicInspiration",
    );
    const choice = choiceFill(
      openingHoles(state, [order])[0],
      "giveHeroicInspiration",
    );
    const [deathHole] = openingHoles(state, [order, choice]);
    if (deathHole?.kind !== "deathSavingThrow") {
      throw new Error("Expected the Death Save.");
    }
    const resolved = requireResolved(
      startTurn({
        state,
        actorId: fighterId,
        fills: [
          order,
          choice,
          deathSavingThrowFill(deathHole, {
            roll: 6,
            d20TestRerolls: [
              {
                kind: "reroll",
                effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
                replacement: d20Roll(20),
              },
            ],
          }),
        ],
      }),
    ).state;

    expect(Number(resolved.combatants.get(fighterId)?.hp)).toBe(1);
    expect(heroicInspirationOf(resolved)).toEqual(NO_HEROIC_INSPIRATION);
    expect(resolved.currentTurnStart).toBe("started");
  });

  test("other subjects are refused until the turn has started", () => {
    const { state } = fighterOpening({
      heroicWarrior: true,
      heroicInspiration: NO_HEROIC_INSPIRATION,
    });

    expect(endTurn({ state, actorId: fighterId })).toMatchObject({
      tag: "invalid",
      message: "The current turn must start before other battle subjects.",
    });
  });

  test("an admitted battle starts its opening turn when asked, and only once", () => {
    const admitted = Result.getOrThrow(
      admitBattle(
        fighterAndGoblinStart({
          fighterInitiative: 20,
          heroicWarrior: true,
          heroicInspiration: NO_HEROIC_INSPIRATION,
        }),
      ),
    );
    expect(admitted.state.currentTurnStart).toBe("pending");
    expect(heroicInspirationOf(admitted.state)).toEqual(NO_HEROIC_INSPIRATION);

    // A start that asks a choice stays pending, as `startBattle` leaves it.
    const asking = Result.getOrThrow(startBattleOpeningTurn(admitted));
    expect(asking.state.currentTurnStart).toBe("pending");
    expect(discoverBattleActs(asking).map((act) => act.subject)).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "startTurn" },
    ]);

    const opened = Result.getOrThrow(
      startBattleOpeningTurn(
        Result.getOrThrow(
          admitBattle(
            fighterAndGoblinStart({
              fighterInitiative: 20,
              heroicWarrior: false,
              heroicInspiration: NO_HEROIC_INSPIRATION,
            }),
          ),
        ),
      ),
    );
    expect(opened.state.currentTurnStart).toBe("started");
    expect(startBattleOpeningTurn(opened)).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "battleStateInitIssue",
        kind: "openingTurnStartInvalid",
        combatantId: fighterId,
      },
    });
  });

  test("a started turn cannot be started again", () => {
    const { state } = fighterOpening({
      heroicWarrior: false,
      heroicInspiration: NO_HEROIC_INSPIRATION,
    });

    expect(startTurn({ state, actorId: fighterId })).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });
});
