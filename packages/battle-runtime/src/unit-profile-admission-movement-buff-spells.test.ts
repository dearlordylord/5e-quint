// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV49 expeditious_retreat
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV53 jump
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-expeditious-retreat-dash spell.invocation-jump-movement-replacement
import { describe, expect, test } from "vitest";
import {
  bonusActionDashSpellAct,
  bonusSpellAct,
  breakBattleConcentration,
  combatantId,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  expeditiousRetreatUnitId,
  jumpMovementReplacementAct,
  jumpSpellTargetListFill,
  jumpUnitId,
  maybeJumpMovementReplacementAct,
  movementFeet,
  movementFill,
  requireCombatant,
  requireHole,
  resolveBattleSubject,
  spellBattle,
  spellCasterId,
  spellRecord,
  spellSlotInvocationRef,
  spellTargetId,
  spellTargetListFill,
} from "./unit-profile-admission-test-support.ts";
import type { BonusActionSpellAct } from "./unit-profile-admission-test-support.ts";

describe("SRDINV49 deterministic Expeditious Retreat admission", () => {
  test("expeditious_retreat casts as a Bonus Action Dash spell", () => {
    const spell = spellRecord(expeditiousRetreatUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = bonusActionDashSpellAct({
      state,
      spellId: expeditiousRetreatUnitId,
    });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          tag: "bonusActionDashSpell",
          actorId: spellCasterId,
          invocation: spellSlotInvocationRef(
            expeditiousRetreatUnitId,
            1,
            "expeditiousRetreatDash",
          ),
          mode: { tag: "cast" },
          speedKind: "walk",
        },
        initialHoles: [],
      }),
    );
  });

  test("expeditious_retreat immediately Dashes and stores a Concentration-owned Bonus Action Dash permission", () => {
    const spell = spellRecord(expeditiousRetreatUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = bonusActionDashSpellAct({
      state,
      spellId: expeditiousRetreatUnitId,
    });
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
          dashMovementBonusFeet: 30,
        },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({
              speedFeet: 30,
              remainingFeet: 60,
            }),
          }),
        ]),
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(resolved.snapshot.turn.actionResources).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: "turn" })]),
    );
    expect(caster.concentration).toEqual({
      sourceSpellId: expeditiousRetreatUnitId,
      effectKind: "spellEffect",
    });
    expect(caster.activeEffects).toContainEqual({
      kind: "spellDashBonusAction",
      sourceSpellId: expeditiousRetreatUnitId,
      sourceCombatantId: spellCasterId,
      expiresAt: { kind: "concentration", combatantId: spellCasterId },
    });
  });

  test("expeditious_retreat grants later Bonus Action Dash until Concentration ends", () => {
    const spell = spellRecord(expeditiousRetreatUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const castAct = bonusActionDashSpellAct({
      state,
      spellId: expeditiousRetreatUnitId,
    });
    const cast = resolveBattleSubject({
      state,
      subject: castAct.subject,
      fills: [],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat caster end turn.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat target end turn.");
    }
    const laterDashAct = discoverBattleActs(nextCasterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionStandardAction" &&
        candidate.subject.sourceUnitId === expeditiousRetreatUnitId &&
        candidate.subject.action === "dash" &&
        candidate.subject.speedKind === "walk",
    );
    expect(laterDashAct).toBeDefined();
    if (laterDashAct === undefined) {
      throw new Error("Expected Expeditious Retreat Bonus Action Dash act.");
    }

    const dashed = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: laterDashAct.subject,
      fills: [],
    });
    expect(dashed).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          dashMovementBonusFeet: 30,
        },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({ remainingFeet: 60 }),
          }),
        ]),
      },
    });
    if (dashed.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat Bonus Action Dash.");
    }
    expect(dashed.snapshot.turn.actionResources).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: "turn" })]),
    );

    const broken = breakBattleConcentration(cast.state, spellCasterId);
    const afterBrokenTargetTurn = endTurn({
      state: broken,
      actorId: spellCasterId,
    });
    if (afterBrokenTargetTurn.tag !== "resolved") {
      throw new Error("Expected broken Expeditious Retreat caster end turn.");
    }
    const afterBrokenCasterTurn = endTurn({
      state: afterBrokenTargetTurn.state,
      actorId: spellTargetId,
    });
    if (afterBrokenCasterTurn.tag !== "resolved") {
      throw new Error("Expected broken Expeditious Retreat target end turn.");
    }
    expect(discoverBattleActs(afterBrokenCasterTurn.state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "bonusActionStandardAction",
            sourceUnitId: expeditiousRetreatUnitId,
            action: "dash",
          }),
        }),
      ]),
    );
  });
});

describe("SRDINV53 deterministic Jump movement replacement admission", () => {
  test("jump casts as a touched willing target-list Bonus Action spell with slot-scaled targets", () => {
    const spell = spellRecord(jumpUnitId);
    const extraTargetId = combatantId("unit-profile-jump-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
      extraTargetIds: [extraTargetId],
    });
    const jumpActs = discoverBattleActs(state).filter(
      (candidate): candidate is BonusActionSpellAct =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === jumpUnitId,
    );

    expect(jumpActs.map((act) => act.subject.invocation)).toEqual(
      expect.arrayContaining([
        spellSlotInvocationRef(jumpUnitId, 1, "jumpMovementReplacement"),
        spellSlotInvocationRef(jumpUnitId, 2, "jumpMovementReplacement"),
      ]),
    );
    const levelTwo = jumpActs.find(
      (act) =>
        act.subject.invocation.tag === "spellSlot" &&
        Number(act.subject.invocation.slotLevel) === 2,
    );
    expect(levelTwo).toBeDefined();
    if (levelTwo === undefined) {
      throw new Error("Expected level 2 Jump act.");
    }
    const targets = requireHole(levelTwo.initialHoles, "spellTargetList");
    expect(targets).toMatchObject({
      minTargets: 1,
      maxTargets: 2,
      choices: expect.arrayContaining([spellCasterId, spellTargetId]),
    });
  });

  test("jump installs a one-minute per-target movement replacement and spends 10 Movement for up to 30 feet", () => {
    const spell = spellRecord(jumpUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const castAct = bonusSpellAct({ state, spellId: jumpUnitId });
    const targetHole = requireHole(castAct.initialHoles, "spellTargetList");
    const cast = resolveBattleSubject({
      state,
      subject: castAct.subject,
      fills: [
        jumpSpellTargetListFill(targetHole, spellCasterId, jumpUnitId, [
          spellCasterId,
        ]),
      ],
    });
    expect(cast).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
      },
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Jump to resolve.");
    }
    expect(cast.state.combatants.get(spellCasterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "jumpMovementReplacement",
        sourceSpellId: jumpUnitId,
        sourceCombatantId: spellCasterId,
        movementCostFeet: movementFeet(10),
        maxJumpDistanceFeet: movementFeet(30),
        usedThisTurn: false,
        expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
      }),
    ]);

    const jumpAct = jumpMovementReplacementAct(cast.state);
    const movement = requireHole(jumpAct.initialHoles, "movement");
    const jumped = resolveBattleSubject({
      state: cast.state,
      subject: jumpAct.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          jumpMovementReplacement: {
            kind: "jumpMovementReplacement",
            distanceFeet: movementFeet(30),
            landing: {
              kind: "legalLanding",
              difficultTerrainAcrobatics: "notRequired",
            },
          },
        }),
      ],
    });

    expect(jumped).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({
              spentFeet: 10,
              remainingFeet: 20,
            }),
          }),
        ]),
      },
    });
    if (jumped.tag !== "resolved") {
      throw new Error("Expected Jump movement replacement to resolve.");
    }
    expect(
      jumped.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "jumpMovementReplacement",
        usedThisTurn: true,
      }),
    );
    expect(maybeJumpMovementReplacementAct(jumped.state)).toBeUndefined();

    const targetTurn = endTurn({ state: jumped.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn after Jump.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected next caster turn after Jump.");
    }
    expect(maybeJumpMovementReplacementAct(nextCasterTurn.state)).toBeDefined();
  });

  test("jump rejects non-willing target facts and malformed movement replacement fills", () => {
    const spell = spellRecord(jumpUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const castAct = bonusSpellAct({ state, spellId: jumpUnitId });
    const targetHole = requireHole(castAct.initialHoles, "spellTargetList");

    expect(
      resolveBattleSubject({
        state,
        subject: castAct.subject,
        fills: [
          spellTargetListFill(targetHole, spellCasterId, jumpUnitId, [
            spellTargetId,
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const cast = resolveBattleSubject({
      state,
      subject: castAct.subject,
      fills: [
        jumpSpellTargetListFill(targetHole, spellCasterId, jumpUnitId, [
          spellCasterId,
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Jump to resolve.");
    }
    const jumpAct = jumpMovementReplacementAct(cast.state);
    const movement = requireHole(jumpAct.initialHoles, "movement");

    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: jumpAct.subject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: jumpAct.subject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
            jumpMovementReplacement: {
              kind: "jumpMovementReplacement",
              distanceFeet: movementFeet(30),
              landing: {
                kind: "legalLanding",
                difficultTerrainAcrobatics: "passed",
              },
            },
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: jumpAct.subject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            jumpMovementReplacement: {
              kind: "jumpMovementReplacement",
              distanceFeet: movementFeet(35),
              landing: {
                kind: "legalLanding",
                difficultTerrainAcrobatics: "passed",
              },
            },
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const failedLanding = resolveBattleSubject({
      state: cast.state,
      subject: jumpAct.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          jumpMovementReplacement: {
            kind: "jumpMovementReplacement",
            distanceFeet: movementFeet(30),
            landing: {
              kind: "legalLanding",
              difficultTerrainAcrobatics: "failed",
            },
          },
        }),
      ],
    });
    expect(failedLanding).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ]),
      },
    });
  });
});
