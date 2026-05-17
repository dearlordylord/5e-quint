// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV87A produce_flame
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-held-light-emitter
import { describe, expect, test } from "vitest";
import {
  Hp,
  attackRollFill,
  battleObjectId,
  bonusSpellAct,
  canSpendAction,
  cantripSpellInvocationRef,
  classLevel,
  combatantId,
  damageAmount,
  damageRollFillWithGroups,
  elapsedTimeTicks,
  maybeSpellAct,
  movementFeet,
  produceFlameUnitId,
  reactionDecisionFill,
  requireHole,
  requireResultHole,
  resolveBattleReaction,
  resolveBattleSubject,
  shieldUnitId,
  spellAct,
  spellBattle,
  spellCasterId,
  spellHoleInvocation,
  spellObjectTargetFill,
  spellRecord,
  spellTargetFill,
  spellTargetId,
} from "./unit-profile-admission-test-support.ts";
import type { BattleState } from "./unit-profile-admission-test-support.ts";

describe("SRDINV32A deterministic Produce Flame held-light admission", () => {
  test("produce_flame is admitted as a Bonus Action cantrip held light", () => {
    const spell = spellRecord(produceFlameUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = bonusSpellAct({ state, spellId: produceFlameUnitId });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          tag: "bonusActionSpell",
          actorId: spellCasterId,
          invocation: cantripSpellInvocationRef(
            produceFlameUnitId,
            "heldLight",
          ),
          mode: { tag: "cast" },
        },
        initialHoles: [],
      }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Produce Flame to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "heldLight",
        sourceSpellId: produceFlameUnitId,
        brightRadiusFeet: 20,
        dimAdditionalFeet: 20,
      }),
    );
    expect(resolved.snapshot.lightEmitters).toEqual([
      {
        kind: "spellLightEmitter",
        sourceSpellId: produceFlameUnitId,
        sourceCombatantId: spellCasterId,
        attachment: { kind: "combatant", combatantId: spellCasterId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: movementFeet(20),
          dimAdditionalFeet: movementFeet(20),
        },
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(100),
        },
      },
    ]);
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
  });
  test("produce_flame held light admission does not depend on operation order", () => {
    const spell = spellRecord(produceFlameUnitId);
    if (spell.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Produce Flame ongoing effect mechanics.");
    }
    const [firstOperation, secondOperation] = spell.mechanics.operations;
    if (secondOperation === undefined) {
      throw new Error("Expected Produce Flame light and hurl operations.");
    }
    const state = spellBattle({
      cantrips: [
        {
          ...spell,
          mechanics: {
            ...spell.mechanics,
            operations: [secondOperation, firstOperation],
          },
        },
      ],
    });
    const act = bonusSpellAct({ state, spellId: produceFlameUnitId });

    expect(act.subject).toEqual(
      expect.objectContaining({
        tag: "bonusActionSpell",
        invocation: cantripSpellInvocationRef(produceFlameUnitId, "heldLight"),
      }),
    );
  });
  test("produce_flame recast replaces the caster's prior held flame", () => {
    const spell = spellRecord(produceFlameUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const caster = state.combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected Produce Flame caster.");
    }
    const stateWithPriorCasting: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: [
          ...caster.activeEffects,
          {
            kind: "heldLight",
            sourceSpellId: produceFlameUnitId,
            sourceCombatantId: spellCasterId,
            brightRadiusFeet: movementFeet(20),
            dimAdditionalFeet: movementFeet(20),
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(1),
            },
          },
        ],
      }),
    };
    const act = bonusSpellAct({
      state: stateWithPriorCasting,
      spellId: produceFlameUnitId,
    });

    const resolved = resolveBattleSubject({
      state: stateWithPriorCasting,
      subject: act.subject,
      fills: [],
    });

    if (resolved.tag !== "resolved") {
      throw new Error("Expected Produce Flame recast to resolve.");
    }
    const heldLightEffects =
      resolved.state.combatants
        .get(spellCasterId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "heldLight" &&
            effect.sourceSpellId === produceFlameUnitId,
        ) ?? [];
    expect(heldLightEffects).toHaveLength(1);
    expect(heldLightEffects[0]).toEqual(
      expect.objectContaining({
        sourceCombatantId: spellCasterId,
        expiresAt: expect.objectContaining({
          kind: "duration",
          durationTicks: elapsedTimeTicks(100),
        }),
      }),
    );
    expect(resolved.snapshot.lightEmitters).toHaveLength(1);
    expect(resolved.snapshot.lightEmitters[0]).toEqual(
      expect.objectContaining({
        kind: "spellLightEmitter",
        sourceSpellId: produceFlameUnitId,
        sourceCombatantId: spellCasterId,
        attachment: { kind: "combatant", combatantId: spellCasterId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: movementFeet(20),
          dimAdditionalFeet: movementFeet(20),
        },
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(100),
        },
      }),
    );
  });
  test("produce_flame held light expires on its timed duration", () => {
    const spell = spellRecord(produceFlameUnitId);
    const state = spellBattle({
      cantrips: [spell],
      extraTargetIds: [combatantId("unit-profile-produce-flame-round-end")],
    });
    const act = bonusSpellAct({ state, spellId: produceFlameUnitId });
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Produce Flame to resolve.");
    }
    const caster = resolved.state.combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected Produce Flame caster.");
    }
    const expiringCaster = {
      ...caster,
      activeEffects: caster.activeEffects.map((effect) =>
        effect.kind === "heldLight" &&
        effect.sourceSpellId === produceFlameUnitId
          ? {
              ...effect,
              expiresAt: {
                kind: "duration" as const,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    };
    const oneRoundRemaining = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(
        spellCasterId,
        expiringCaster,
      ),
    };

    const targetTurn = resolveBattleSubject({
      state: oneRoundRemaining,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Produce Flame caster end turn to resolve.");
    }
    const secondTargetId = combatantId("unit-profile-produce-flame-round-end");
    const nextRound = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    if (nextRound.tag !== "resolved") {
      throw new Error("Expected Produce Flame target end turn to resolve.");
    }
    const expired = resolveBattleSubject({
      state: nextRound.state,
      subject: {
        tag: "runtimeCommand",
        actorId: secondTargetId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(expired).toMatchObject({ tag: "resolved" });
    if (expired.tag !== "resolved") {
      throw new Error("Expected Produce Flame duration tick to resolve.");
    }
    expect(
      expired.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "heldLight" &&
            effect.sourceSpellId === produceFlameUnitId,
        ),
    ).toBe(false);
    expect(expired.snapshot.lightEmitters).toEqual([]);
  });
  test("produce_flame hurl is admitted only while the caster holds the flame", () => {
    const spell = spellRecord(produceFlameUnitId);
    const unlitState = spellBattle({ cantrips: [spell] });

    expect(
      maybeSpellAct({ state: unlitState, spellId: produceFlameUnitId }),
    ).toBeUndefined();

    const lit = resolveBattleSubject({
      state: unlitState,
      subject: bonusSpellAct({
        state: unlitState,
        spellId: produceFlameUnitId,
      }).subject,
      fills: [],
    });
    expect(lit).toMatchObject({ tag: "resolved" });
    if (lit.tag !== "resolved") {
      throw new Error("Expected Produce Flame held light to resolve.");
    }

    const hurl = spellAct({ state: lit.state, spellId: produceFlameUnitId });

    expect(hurl.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        produceFlameUnitId,
        "heldLightHurl",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [
          spellTargetFill(
            requireHole(hurl.initialHoles, "targetChoice"),
            produceFlameUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "heldLightHurl",
        spell,
        targeting: { kind: "singleCreatureOrObject" },
        damage: {
          expr: { dice: 1, dieSize: 8 },
          damageType: "fire",
        },
        rangeFeet: 60,
        attackKind: "ranged_spell_attack",
      }),
    );
    expect(hurl.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
      expect.objectContaining({
        kind: "objectTargetChoice",
        label: "Produce Flame object target",
      }),
    ]);
  });
  test("produce_flame hurl resolves ranged spell attack Fire damage and ends the held flame", () => {
    const spell = spellRecord(produceFlameUnitId);
    const state = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "druid", level: classLevel(5) }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const lit = resolveBattleSubject({
      state,
      subject: bonusSpellAct({ state, spellId: produceFlameUnitId }).subject,
      fills: [],
    });
    if (lit.tag !== "resolved") {
      throw new Error("Expected Produce Flame held light to resolve.");
    }
    const hurl = spellAct({ state: lit.state, spellId: produceFlameUnitId });
    const target = requireHole(hurl.initialHoles, "targetChoice");
    const attack = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [
          spellTargetFill(
            target,
            produceFlameUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [
          spellTargetFill(
            target,
            produceFlameUnitId,
            spellCasterId,
            spellTargetId,
          ),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Produce Flame damage (2d8-fire)",
    });

    const resolved = resolveBattleSubject({
      state: lit.state,
      subject: hurl.subject,
      fills: [
        spellTargetFill(
          target,
          produceFlameUnitId,
          spellCasterId,
          spellTargetId,
        ),
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4, 5]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Produce Flame hurl to resolve.");
    }
    expect(resolved.state.combatants.get(spellTargetId)?.hp).toStrictEqual(
      Hp(11),
    );
    expect(
      resolved.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "heldLight" &&
            effect.sourceSpellId === produceFlameUnitId,
        ),
    ).toBe(false);
    expect(resolved.snapshot.lightEmitters).toEqual([]);
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
  });
  test("produce_flame hurl hit reaction window does not expose stale held light", () => {
    const spell = spellRecord(produceFlameUnitId);
    const state = spellBattle({
      cantrips: [spell],
      targetPreparedSpells: [spellRecord(shieldUnitId)],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const lit = resolveBattleSubject({
      state,
      subject: bonusSpellAct({ state, spellId: produceFlameUnitId }).subject,
      fills: [],
    });
    if (lit.tag !== "resolved") {
      throw new Error("Expected Produce Flame held light to resolve.");
    }
    const hurl = spellAct({ state: lit.state, spellId: produceFlameUnitId });
    const target = requireHole(hurl.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      produceFlameUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attack = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );

    const awaitingReaction = resolveBattleSubject({
      state: lit.state,
      subject: hurl.subject,
      fills: [
        targetFill,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Produce Flame hurl to open attack-hit window.");
    }
    expect(awaitingReaction.snapshot.lightEmitters).toEqual([]);
    expect(
      awaitingReaction.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "heldLight" &&
            effect.sourceSpellId === produceFlameUnitId,
        ),
    ).toBe(false);

    const afterDecline = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        awaitingReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: spellTargetId },
      ),
    });

    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingReaction: null, lightEmitters: [] },
    });
  });
  test("produce_flame hurl object miss spends the Magic action without object damage", () => {
    const spell = spellRecord(produceFlameUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const lit = resolveBattleSubject({
      state,
      subject: bonusSpellAct({ state, spellId: produceFlameUnitId }).subject,
      fills: [],
    });
    if (lit.tag !== "resolved") {
      throw new Error("Expected Produce Flame held light to resolve.");
    }
    const hurl = spellAct({ state: lit.state, spellId: produceFlameUnitId });
    const objectTarget = requireHole(hurl.initialHoles, "objectTargetChoice");
    const objectFill = spellObjectTargetFill({
      hole: objectTarget,
      spellId: produceFlameUnitId,
      casterId: spellCasterId,
    });
    const attack = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [objectFill],
      }),
      "attackRoll",
    );

    const resolved = resolveBattleSubject({
      state: lit.state,
      subject: hurl.subject,
      fills: [objectFill, attackRollFill(attack, { total: 12, naturalD20: 7 })],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId },
          { combatantId: spellTargetId },
        ],
        turn: { actionResources: [] },
        lightEmitters: [],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Produce Flame object miss to resolve.");
    }
    expect(resolved.objectDamages).toBeUndefined();
  });
  test("produce_flame hurl applies object hit point disposition on a hit", () => {
    const spell = spellRecord(produceFlameUnitId);
    const state = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "druid", level: classLevel(5) }],
    });
    const lit = resolveBattleSubject({
      state,
      subject: bonusSpellAct({ state, spellId: produceFlameUnitId }).subject,
      fills: [],
    });
    if (lit.tag !== "resolved") {
      throw new Error("Expected Produce Flame held light to resolve.");
    }
    const hurl = spellAct({ state: lit.state, spellId: produceFlameUnitId });
    const objectTarget = requireHole(hurl.initialHoles, "objectTargetChoice");
    const objectId = battleObjectId("produce-flame-target");
    const objectFill = spellObjectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: produceFlameUnitId,
      casterId: spellCasterId,
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(5) },
    });
    const attack = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [objectFill],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [
          objectFill,
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Produce Flame damage (2d8-fire)",
    });

    const resolved = resolveBattleSubject({
      state: lit.state,
      subject: hurl.subject,
      fills: [
        objectFill,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4, 5]]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "fire",
          rolledDamage: damageAmount(9),
          effectiveDamage: damageAmount(9),
          priorHitPoints: Hp(5),
          nextHitPoints: Hp(0),
          destroyed: true,
        },
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Produce Flame object hit to resolve.");
    }
    expect(
      resolved.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "heldLight" &&
            effect.sourceSpellId === produceFlameUnitId,
        ),
    ).toBe(false);
    expect(resolved.snapshot.lightEmitters).toEqual([]);
  });
});
