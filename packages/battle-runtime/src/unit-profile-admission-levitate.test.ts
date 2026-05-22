// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME levitate
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-levitated-creature
import { describe, expect, test } from "vitest";
import {
  levitateUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  movementFill,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  breakBattleConcentration,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleFill,
  BattleHole,
  BattleState,
  CombatantId,
} from "./index.ts";

describe("L12G deterministic Levitate creature admission", () => {
  test("levitate admits the creature branch as a level-2 Magic Action Spell Slot profile", () => {
    const spell = spellRecord(levitateUnitId);
    const state = levitateSpellBattle(spell);
    const act = spellAct({ state, spellId: levitateUnitId, slotLevel: 2 });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          tag: "actionSpell",
          actorId: spellCasterId,
          invocation: spellSlotInvocationRef(
            levitateUnitId,
            2,
            "levitatedCreature",
          ),
          mode: { tag: "cast" },
        },
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({ kind: "targetChoice" }),
    ]);
  });

  test("known willing creature target receives a concentration-owned suspended altitude projection", () => {
    const cast = castWillingLevitate({ initialRiseFeet: 12 });
    const target = requireCombatant(cast.state, spellTargetId);

    expect(requireLevitatedEffect(cast.state)).toEqual({
      kind: "spellLevitatedCreature",
      sourceSpellId: levitateUnitId,
      sourceCombatantId: spellCasterId,
      altitudeFeet: movementFeet(12),
      maxAltitudeChangeFeet: movementFeet(20),
      rangeFeet: movementFeet(60),
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(100),
      },
    });
    expect(target.activeEffects).toContainEqual(
      requireLevitatedEffect(cast.state),
    );
  });

  test("unwilling creature save success spends the slot without levitating or starting concentration", () => {
    const spell = spellRecord(levitateUnitId);
    const state = levitateSpellBattle(spell);
    const act = spellAct({ state, spellId: levitateUnitId, slotLevel: 2 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(needsSave).toMatchObject({ tag: "needsHoles" });
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Levitate save hole.");
    }
    const saveHole = requireHole(needsSave.holes, "savingThrowOutcome");
    const saved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(saved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { actionResources: [] },
      },
    });
    if (saved.tag !== "resolved") {
      throw new Error("Expected successful Levitate save resolution.");
    }
    expect(
      requireCombatant(saved.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(saved.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "spellLevitatedCreature",
      ),
    ).toBe(false);
  });

  test("unwilling creature save success rejects an inert initial-rise fill", () => {
    const spell = spellRecord(levitateUnitId);
    const state = levitateSpellBattle(spell);
    const act = spellAct({ state, spellId: levitateUnitId, slotLevel: 2 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(needsSave).toMatchObject({ tag: "needsHoles" });
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Levitate save hole.");
    }
    const saveHole = requireHole(needsSave.holes, "savingThrowOutcome");
    const needsInitialRise = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(needsInitialRise).toMatchObject({ tag: "needsHoles" });
    if (needsInitialRise.tag !== "needsHoles") {
      throw new Error("Expected Levitate initial-rise hole.");
    }
    const initialRiseHole = requireHole(
      needsInitialRise.holes,
      "levitateInitialRise",
    );

    const invalid = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
        levitateInitialRiseFill(initialRiseHole, 5),
      ],
    });
    expect(invalid).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Successful Levitate creature saves are unaffected and do not use an initial-rise fill.",
    });
  });

  test("levitate creature cast requires a caller-selected initial rise up to 20 feet", () => {
    const spell = spellRecord(levitateUnitId);
    const state = levitateSpellBattle(spell);
    const act = spellAct({ state, spellId: levitateUnitId, slotLevel: 2 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const needsInitialRise = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(needsInitialRise).toMatchObject({ tag: "needsHoles" });
    if (needsInitialRise.tag !== "needsHoles") {
      throw new Error("Expected Levitate initial-rise hole.");
    }
    const initialRiseHole = requireHole(
      needsInitialRise.holes,
      "levitateInitialRise",
    );

    const tooHigh = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        levitateInitialRiseFill(initialRiseHole, 25),
      ],
    });
    expect(tooHigh).toMatchObject({ tag: "invalid" });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        levitateInitialRiseFill(initialRiseHole, 5),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Levitate with selected initial rise.");
    }
    expect(requireLevitatedEffect(resolved.state).altitudeFeet).toBe(
      movementFeet(5),
    );
  });

  test("levitated target movement requires a fixed-object or surface witness and can change self altitude", () => {
    const cast = castWillingLevitate();
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn.");
    }
    const moveAct = discoverBattleActs(targetTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "move",
    );
    expect(moveAct).toBeDefined();
    if (moveAct === undefined) {
      throw new Error("Expected target move act.");
    }
    const movementHole = requireHole(moveAct.initialHoles, "movement");

    const missingWitness = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(missingWitness).toMatchObject({ tag: "invalid" });

    const underpaidClimbingCost = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [],
          levitatedMovement: {
            kind: "levitatedMovement",
            sourceCombatantId: spellCasterId,
            sourceSpellId: levitateUnitId,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "down",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    });
    expect(underpaidClimbingCost).toMatchObject({
      tag: "invalid",
      message:
        "Levitated movement must spend the altitude-change distance as climbing, plus any area movement costs.",
    });

    const moved = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          levitatedMovement: {
            kind: "levitatedMovement",
            sourceCombatantId: spellCasterId,
            sourceSpellId: levitateUnitId,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "down",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    });
    expect(moved).toMatchObject({ tag: "resolved" });
    if (moved.tag !== "resolved") {
      throw new Error("Expected witnessed Levitate movement.");
    }
    expect(requireLevitatedEffect(moved.state).altitudeFeet).toBe(
      movementFeet(15),
    );
  });

  test("caster Magic Action altitude control requires target-within-range fact", () => {
    const cast = castWillingLevitate();
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected target end turn.");
    }
    const altitudeAct = discoverBattleActs(nextCasterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "levitateAltitudeControl",
    );
    expect(altitudeAct).toBeDefined();
    if (altitudeAct === undefined) {
      throw new Error("Expected Levitate altitude control act.");
    }
    const hole = requireHole(
      altitudeAct.initialHoles,
      "levitateAltitudeChange",
    );
    const missingFact = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: altitudeAct.subject,
      fills: [levitateAltitudeChangeFill(hole, "up", 10, [])],
    });
    expect(missingFact).toMatchObject({ tag: "invalid" });

    const raised = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: altitudeAct.subject,
      fills: [
        levitateAltitudeChangeFill(hole, "up", 10, [
          {
            kind: "levitatedTargetWithinSpellRange",
            sourceCombatantId: spellCasterId,
            sourceSpellId: levitateUnitId,
            targetId: spellTargetId,
            rangeFeet: movementFeet(60),
          },
        ]),
      ],
    });
    expect(raised).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (raised.tag !== "resolved") {
      throw new Error("Expected Levitate altitude control.");
    }
    expect(requireLevitatedEffect(raised.state).altitudeFeet).toBe(
      movementFeet(30),
    );
  });

  test("self-target Levitate uses movement, not a caster Magic Action, to change altitude", () => {
    const cast = castWillingLevitate({
      targetId: spellCasterId,
      initialRiseFeet: 10,
    });
    const casterTurn = advanceToNextCasterTurn(cast.state);
    expect(
      discoverBattleActs(casterTurn).some(
        (candidate) =>
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command === "levitateAltitudeControl",
      ),
    ).toBe(false);
    const moveAct = discoverBattleActs(casterTurn).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "move",
    );
    expect(moveAct).toBeDefined();
    if (moveAct === undefined) {
      throw new Error("Expected self-target move act.");
    }
    const movementHole = requireHole(moveAct.initialHoles, "movement");
    const moved = resolveBattleSubject({
      state: casterTurn,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          levitatedMovement: {
            kind: "levitatedMovement",
            sourceCombatantId: spellCasterId,
            sourceSpellId: levitateUnitId,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "up",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    });
    expect(moved).toMatchObject({ tag: "resolved" });
    if (moved.tag !== "resolved") {
      throw new Error("Expected self-target Levitate movement.");
    }
    expect(
      requireLevitatedEffect(moved.state, spellCasterId).altitudeFeet,
    ).toBe(movementFeet(15));
  });

  test("concentration and duration cleanup remove the levitated creature projection", () => {
    const cast = castWillingLevitate();
    const concentrationBroken = breakBattleConcentration(
      cast.state,
      spellCasterId,
    );
    expect(
      requireCombatant(concentrationBroken, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(concentrationBroken, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "spellLevitatedCreature",
      ),
    ).toBe(false);

    const target = requireCombatant(cast.state, spellTargetId);
    const nearlyExpired: BattleState = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: target.activeEffects.map((effect) =>
          effect.kind === "spellLevitatedCreature" &&
          effect.expiresAt.kind === "concentration"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      }),
    };
    const expired = advanceToNextCasterTurn(nearlyExpired);
    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
    expect(
      requireCombatant(expired, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "spellLevitatedCreature",
      ),
    ).toBe(false);
  });
});

function castWillingLevitate(
  input: {
    readonly initialRiseFeet?: number;
    readonly targetId?: CombatantId;
  } = {},
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const spell = spellRecord(levitateUnitId);
  const state = levitateSpellBattle(spell);
  const act = spellAct({ state, spellId: levitateUnitId, slotLevel: 2 });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const targetId = input.targetId ?? spellTargetId;
  const needsInitialRise = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        levitateUnitId,
        spellCasterId,
        targetId,
      ),
    ],
  });
  if (needsInitialRise.tag !== "needsHoles") {
    throw new Error("Expected Levitate initial-rise hole.");
  }
  const initialRiseHole = requireHole(
    needsInitialRise.holes,
    "levitateInitialRise",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        levitateUnitId,
        spellCasterId,
        targetId,
      ),
      levitateInitialRiseFill(initialRiseHole, input.initialRiseFeet ?? 20),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Levitate to resolve.");
  }
  return resolved;
}

function levitateSpellBattle(spell: ReturnType<typeof spellRecord>) {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
}

function requireLevitatedEffect(
  state: BattleState,
  targetId: CombatantId = spellTargetId,
) {
  const target = requireCombatant(state, targetId);
  const effect = target.activeEffects.find(
    (candidate) => candidate.kind === "spellLevitatedCreature",
  );
  if (effect === undefined) {
    throw new Error("Expected Levitate active effect.");
  }
  return effect;
}

function levitateAltitudeChangeFill(
  hole: Extract<BattleHole, { readonly kind: "levitateAltitudeChange" }>,
  direction: "up" | "down",
  distanceFeet: number,
  spatialFacts: Extract<
    BattleFill,
    { readonly kind: "levitateAltitudeChange" }
  >["spatialFacts"],
): Extract<BattleFill, { readonly kind: "levitateAltitudeChange" }> {
  return {
    kind: "levitateAltitudeChange",
    holeId: hole.holeId,
    value: { direction, distanceFeet: movementFeet(distanceFeet) },
    spatialFacts,
  };
}

function levitateInitialRiseFill(
  hole: Extract<BattleHole, { readonly kind: "levitateInitialRise" }>,
  distanceFeet: number,
): Extract<BattleFill, { readonly kind: "levitateInitialRise" }> {
  return {
    kind: "levitateInitialRise",
    holeId: hole.holeId,
    value: { distanceFeet: movementFeet(distanceFeet) },
  };
}

function advanceToNextCasterTurn(state: BattleState): BattleState {
  const targetTurn = endTurn({
    state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster end turn.");
  }
  const casterTurn = endTurn({
    state: targetTurn.state,
    actorId: spellTargetId,
  });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected target end turn.");
  }
  return casterTurn.state;
}
