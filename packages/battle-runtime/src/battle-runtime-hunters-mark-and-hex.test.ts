import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleProcedureExecutionRefForSpellHoleForTest,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-marked-damage-rider
import { describe, expect, test } from "vitest";
import type {
  ActiveOngoingFeatureOccurrence,
  BattleFill,
  BattleState,
  OngoingFeatureSourceKey,
} from "./battle-runtime.test-support.ts";
import {
  applyBattleHitPointDamage,
  attackDamageDispositionFill,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  BattleHoleSchema,
  battleId,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  characterSeed,
  damageRollFillWithGroups,
  difficultyClass,
  discoverBattleActs,
  Either,
  elapsedTimeTicks,
  endTurn,
  fighterAttackSubject,
  fighterId,
  findAct,
  findHole,
  goblinId,
  holeId,
  holeInstanceKey,
  Hp,
  movementFeet,
  rageResource,
  requiredAbilityCheckRollMode,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  Schema,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  spellSlotInvocationRef,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  tickDurationEffects,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";

describe("battle runtime: Hunter's Mark and Hex", () => {
  test("Hunter's Mark adds Force damage to attack-roll hits against the mark and transfers after the mark drops", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-hunters-mark"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "fighter", level: 1 },
          ],
          resources: [rageResource()],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [
                spellRecord("hunters_mark"),
                spellRecord("magic_missile"),
              ],
            }),
            sourceClassName: "fighter",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
        skeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const state = session.state;
    const markAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const markTarget = findHole(markAct.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: markAct.subject,
        fills: [targetFill(markTarget, goblinId)],
      }),
    );

    expect(marked.state.combatants.get(fighterId)?.concentration).toEqual({
      sourceProcedureRef: battleActSpellPresentation(markAct)?.procedureRef,
      effectKind: "spellEffect",
    });
    expect(marked.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        transfer: {
          kind: "awaitingTargetDrop",
          retargetTiming: "sameTurn",
        },
      }),
    ]);

    const magicMissileReady = requireResolved(
      endTurn({ state: marked.state, actorId: fighterId }),
    ).state;
    const magicMissileAfterGoblin = requireResolved(
      endTurn({ state: magicMissileReady, actorId: goblinId }),
    ).state;
    const magicMissileTurn = requireResolved(
      endTurn({ state: magicMissileAfterGoblin, actorId: skeletonId }),
    ).state;
    const magicMissileSelection = {
      tag: "actionSpell" as const,
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        1,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" as const },
    };
    const magicMissileSubject = findAct(
      battleRuntimeSessionForTest({
        state: magicMissileTurn,
        context: session.context,
      }),
      magicMissileSelection,
    ).subject;
    const magicMissileTargetAllocation = requireHole(
      resolveBattleSubject({
        state: magicMissileTurn,
        subject: magicMissileSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const magicMissileAllocationFill: BattleFill = {
      kind: "spellTargetAllocation",
      holeId: magicMissileTargetAllocation.holeId,
      value: { allocations: [{ targetId: goblinId, count: 3 }] },
      spatialFacts: [
        {
          kind: "spellTarget",
          casterId: fighterId,
          targetId: goblinId,
          sourceProcedureRef: battleProcedureExecutionRefForSpellHoleForTest(
            magicMissileTargetAllocation,
          ),
        },
      ],
    };
    const magicMissileDamage = requireHole(
      resolveBattleSubject({
        state: magicMissileTurn,
        subject: magicMissileSubject,
        fills: [magicMissileAllocationFill],
      }),
      "rolledDice",
    );
    const magicMissileDropped = requireResolved(
      resolveBattleSubject({
        state: magicMissileTurn,
        subject: magicMissileSubject,
        fills: [
          magicMissileAllocationFill,
          damageRollFillWithGroups(magicMissileDamage, [[3, 3, 3]]),
        ],
      }),
    );
    expect(magicMissileDropped.state.combatants.get(goblinId)?.hp).toBe(0);
    expect(
      magicMissileDropped.state.combatants.get(fighterId)?.activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        transfer: { kind: "available", retargetTiming: "sameTurn" },
      }),
    ]);

    const spellSelection = {
      tag: "actionSpell" as const,
      actorId: fighterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" as const },
    };
    const spellAct = findAct(
      battleRuntimeSessionForTest({
        state: marked.state,
        context: session.context,
      }),
      spellSelection,
    );
    const spellSubject = spellAct.subject;
    const spellTarget = findHole(spellAct.initialHoles, "targetChoice");
    const spellAttack = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject: spellSubject,
        fills: [targetFill(spellTarget, goblinId)],
      }),
      "attackRoll",
    );
    const spellDamage = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject: spellSubject,
        fills: [
          targetFill(spellTarget, goblinId),
          attackRollFill(spellAttack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(spellDamage).toMatchObject({
      label: "Spell damage (1d8-cold+1d6-force)",
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: goblinId }),
      ],
    });
    const spellDropped = requireResolved(
      resolveBattleSubject({
        state: marked.state,
        subject: spellSubject,
        fills: [
          targetFill(spellTarget, goblinId),
          attackRollFill(spellAttack, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(spellDamage, [[8], [6]]),
        ],
      }),
    );
    expect(spellDropped.state.combatants.get(goblinId)?.hp).toBe(0);
    expect(spellDropped.state.combatants.get(fighterId)?.activeEffects).toEqual(
      [
        expect.objectContaining({
          kind: "spellMarkedDamageRider",
          targetCombatantId: goblinId,
          transfer: { kind: "available", retargetTiming: "sameTurn" },
        }),
      ],
    );
    expect(spellDropped.routeEvents).toEqual(
      expect.arrayContaining([
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "markedDamageRiderEffect",
          holes: [],
          owner: "battleHitPointAndZeroHpLifecycle",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "markedDamageRiderEffect",
          holes: [],
          owner: "battleActiveEffect",
        },
      ]),
    );

    const target = attackInitialTargetHole(marked.state);
    const roll = attackRollHoleAfterTarget(
      marked.state,
      target,
      undefined,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      marked.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      undefined,
      goblinId,
    );

    expect(damage).toMatchObject({
      label: "weapon_longsword damage (1d8+1d6+3-slashing)",
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: goblinId }),
      ],
    });

    const nicked = requireResolved(
      resolveBattleSubject({
        state: marked.state,
        subject: fighterAttackSubject(state),
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(damage, [[1], [1]]),
        ],
      }),
    );
    expect(nicked.state.combatants.get(goblinId)?.hp).toBe(Hp(5));

    const attackFills = [
      targetFill(target, goblinId),
      attackRollFill(roll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(damage, [[4], [6]]),
    ];
    const disposition = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject: fighterAttackSubject(state),
        fills: attackFills,
      }),
      "attackDamageDisposition",
    );
    const dropped = requireResolved(
      resolveBattleSubject({
        state: marked.state,
        subject: fighterAttackSubject(state),
        fills: [
          ...attackFills,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
    );
    expect(dropped.state.combatants.get(goblinId)?.hp).toBe(0);
    expect(dropped.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        transfer: { kind: "available", retargetTiming: "sameTurn" },
      }),
    ]);

    const afterFighterTurn = requireResolved(
      endTurn({ state: dropped.state, actorId: fighterId }),
    ).state;
    const afterGoblinTurn = requireResolved(
      endTurn({ state: afterFighterTurn, actorId: goblinId }),
    ).state;
    const nextFighterTurn = requireResolved(
      endTurn({ state: afterGoblinTurn, actorId: skeletonId }),
    ).state;
    const transferAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: nextFighterTurn,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.tag ===
          "spellEffect" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "hunters_mark",
    );
    if (transferAct === undefined) {
      throw new Error("Expected Hunter's Mark transfer act.");
    }
    const transferTarget = findHole(transferAct.initialHoles, "targetChoice");
    if (transferTarget.kind !== "targetChoice") {
      throw new Error("Expected Hunter's Mark target choice.");
    }
    expect(transferTarget.choices).not.toContain(goblinId);
    expect(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: transferAct.subject,
        fills: [targetFill(transferTarget, goblinId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const restrictedActor = nextFighterTurn.combatants.get(fighterId);
    if (restrictedActor === undefined) {
      throw new Error("Expected Hunter's Mark caster.");
    }
    const spellcastingRestrictedOccurrence: ActiveOngoingFeatureOccurrence = {
      kind: "fixedDuration",
      expiresAt: {
        kind: "endOfTurn",
        combatantId: fighterId,
        round: nextFighterTurn.initiative.round,
      },
    };
    const restrictedHiddenTransferState: BattleState = {
      ...nextFighterTurn,
      combatants: new Map(nextFighterTurn.combatants).set(fighterId, {
        ...restrictedActor,
        hidden: { discoveryDc: difficultyClass(17) },
        activeOngoingFeatureOccurrences: new Map([
          ...restrictedActor.activeOngoingFeatureOccurrences,
          [
            "barbarian_rage" as OngoingFeatureSourceKey,
            spellcastingRestrictedOccurrence,
          ],
        ]),
      }),
    };
    const restrictedTransferAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: restrictedHiddenTransferState,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.tag ===
          "spellEffect" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "hunters_mark",
    );
    if (restrictedTransferAct === undefined) {
      throw new Error(
        "Expected Hunter's Mark transfer act through spellcasting restriction.",
      );
    }
    const restrictedTransferTarget = findHole(
      restrictedTransferAct.initialHoles,
      "targetChoice",
    );
    const restrictedTransferred = requireResolved(
      resolveBattleSubject({
        state: restrictedHiddenTransferState,
        subject: restrictedTransferAct.subject,
        fills: [targetFill(restrictedTransferTarget, skeletonId)],
      }),
    );
    expect(
      restrictedTransferred.state.combatants.get(fighterId)?.hidden,
    ).toEqual({ discoveryDc: difficultyClass(17) });

    const transferred = requireResolved(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: transferAct.subject,
        fills: [targetFill(transferTarget, skeletonId)],
      }),
    );

    expect(transferred.state.combatants.get(fighterId)?.concentration).toEqual({
      sourceProcedureRef: battleActSpellPresentation(markAct)?.procedureRef,
      effectKind: "spellEffect",
    });
    expect(transferred.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: skeletonId,
        transfer: {
          kind: "awaitingTargetDrop",
          retargetTiming: "sameTurn",
        },
      }),
    ]);
  });

  test("Hunter's Mark projects Advantage on owner checks to find the marked target", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-hunters-mark-finding-advantage"),
      combatants: [
        characterSeed({
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hunters_mark")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        skeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const state = session.state;
    const markAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: markAct.subject,
        fills: [
          targetFill(findHole(markAct.initialHoles, "targetChoice"), goblinId),
        ],
      }),
    ).state;

    expect(
      requiredAbilityCheckRollMode(marked, fighterId, "wis", {
        skill: "perception",
        targetId: goblinId,
      }),
    ).toBe("advantage");
    expect(
      requiredAbilityCheckRollMode(marked, fighterId, "wis", {
        skill: "survival",
        targetId: goblinId,
      }),
    ).toBe("advantage");
    expect(
      requiredAbilityCheckRollMode(marked, fighterId, "wis", {
        skill: "athletics",
        targetId: goblinId,
      }),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(marked, goblinId, "wis", {
        skill: "perception",
        targetId: fighterId,
      }),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(marked, fighterId, "wis", {
        skill: "perception",
        targetId: skeletonId,
      }),
    ).toBeUndefined();

    const hiddenGoblinState: BattleState = {
      ...marked,
      combatants: new Map(marked.combatants).set(goblinId, {
        ...marked.combatants.get(goblinId)!,
        hidden: { discoveryDc: difficultyClass(15) },
      }),
    };
    const searchSubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "search" as const,
    };
    const searchAct = findAct(hiddenGoblinState, searchSubject);
    const searchCheck = requireHole(
      resolveBattleSubject({
        state: hiddenGoblinState,
        subject: searchSubject,
        fills: [
          targetFill(
            findHole(searchAct.initialHoles, "targetChoice"),
            goblinId,
          ),
        ],
      }),
      "abilityCheck",
    );
    expect(searchCheck).toMatchObject({
      ability: "wis",
      skill: "perception",
      rollMode: "advantage",
    });

    const dropped = applyBattleHitPointDamage({
      state: marked,
      target: marked.combatants.get(goblinId)!,
      damageAmount: 99,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });
    const nextFighterTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({
            state: requireResolved(
              endTurn({ state: dropped, actorId: fighterId }),
            ).state,
            actorId: goblinId,
          }),
        ).state,
        actorId: skeletonId,
      }),
    ).state;
    const transferAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: nextFighterTurn,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "hunters_mark",
    );
    if (transferAct === undefined) {
      throw new Error("Expected Hunter's Mark transfer act.");
    }
    const transferred = requireResolved(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: transferAct.subject,
        fills: [
          targetFill(
            findHole(transferAct.initialHoles, "targetChoice"),
            skeletonId,
          ),
        ],
      }),
    ).state;
    expect(
      requiredAbilityCheckRollMode(transferred, fighterId, "wis", {
        skill: "perception",
        targetId: goblinId,
      }),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(transferred, fighterId, "wis", {
        skill: "perception",
        targetId: skeletonId,
      }),
    ).toBe("advantage");

    const broken = breakBattleConcentration(transferred, fighterId);
    expect(
      requiredAbilityCheckRollMode(broken, fighterId, "wis", {
        skill: "perception",
        targetId: skeletonId,
      }),
    ).toBeUndefined();
  });

  test("breaking Hunter's Mark concentration clears the marked target rider", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-hunters-mark-concentration"),
      combatants: [
        characterSeed({
          displayName: "Wizard",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hunters_mark")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const markAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const markTarget = findHole(markAct.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: markAct.subject,
        fills: [targetFill(markTarget, goblinId)],
      }),
    );

    const broken = requireResolved(
      resolveBattleSubject({
        state: marked.state,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endConcentration",
        },
        fills: [],
      }),
    );

    expect(broken.state.combatants.get(fighterId)?.concentration).toBeNull();
    expect(broken.state.combatants.get(fighterId)?.activeEffects).toEqual([]);
    expect(broken.routeEvents).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "concentrationTeardown",
        holes: [],
        owner: "battleConcentration",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "concentrationTeardown",
        holes: [],
        owner: "battleActiveEffect",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "markedDamageRiderEffect",
        holes: [],
        owner: "battleConcentration",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "markedDamageRiderEffect",
        holes: [],
        owner: "battleActiveEffect",
      },
    ]);
  });

  test("Hunter's Mark projects slot-scaled Concentration maximum duration", () => {
    const expectedTicksBySlot = [
      [1, 600],
      [2, 600],
      [3, 4_800],
      [4, 4_800],
      [5, 14_400],
    ] as const;

    for (const [slotLevel, expectedTicks] of expectedTicksBySlot) {
      const session = startBattleSessionRight({
        battleId: battleId(`battle-hunters-mark-slot-${slotLevel}`),
        combatants: [
          characterSeed({
            initiative: 20,
            spellcasting: wizardSpellcasting({
              preparedSpells: [spellRecord("hunters_mark")],
              spellSlots: [{ spellLevel: slotLevel, count: 1 }],
            }),
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      });
      const state = session.state;
      const subject = {
        tag: "bonusActionSpell" as const,
        actorId: fighterId,
        invocation: spellSlotInvocationRef(
          "hunters_mark",
          slotLevel,
          "markedDamageRider",
        ),
        mode: { tag: "cast" as const },
      };
      const act = findAct(session, subject);
      const markTarget = findHole(act.initialHoles, "targetChoice");
      const marked = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [targetFill(markTarget, goblinId)],
        }),
      );

      expect(marked.state.combatants.get(fighterId)?.activeEffects).toEqual([
        expect.objectContaining({
          kind: "spellMarkedDamageRider",
          targetCombatantId: goblinId,
          expiresAt: {
            kind: "concentration",
            combatantId: fighterId,
            durationTicks: expectedTicks,
          },
        }),
      ]);
    }
  });

  test("Hex routes target and ability choices independently before applying Necrotic attack-hit damage and chosen-ability check Disadvantage", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-hex"),
      combatants: [hexWarlockSeed(), statBlockCreatureInit({ initiative: 10 })],
    });
    const state = session.state;
    const hexAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId === "hex",
    );
    if (hexAct === undefined) {
      throw new Error("Expected Hex Bonus Action spell act.");
    }
    const hexTarget = findHole(hexAct.initialHoles, "targetChoice");
    const hexAbility = findHole(hexAct.initialHoles, "abilityChoice");
    if (hexAbility.kind !== "abilityChoice") {
      throw new Error("Expected Hex ability choice.");
    }
    expect(hexAbility.choices).toEqual([
      "str",
      "dex",
      "con",
      "int",
      "wis",
      "cha",
    ]);
    const targetSelection = targetFill(hexTarget, goblinId);
    const abilitySelection = {
      kind: "abilityChoice" as const,
      holeId: hexAbility.holeId,
      value: "wis" as const,
    };
    expect(
      resolveBattleSubject({
        state,
        subject: hexAct.subject,
        fills: [targetSelection],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      routeEvents: [
        {
          kind: "resolveBattleSubject",
          subject: "markedDamageRiderEffect",
          fill: "targetChoice",
          holes: ["abilityChoice"],
          owner: "battleTargetSelection",
        },
      ],
    });
    expect(
      resolveBattleSubject({
        state,
        subject: hexAct.subject,
        fills: [abilitySelection],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      routeEvents: [
        {
          kind: "resolveBattleSubject",
          subject: "markedDamageRiderEffect",
          fill: { kind: "abilityChoice", ability: "wis" },
          holes: ["targetChoice"],
          owner: "battleActiveEffect",
        },
        {
          kind: "discoverBattleActs",
          subject: "markedDamageRiderEffect",
          holes: ["targetChoice"],
          owner: "battleTargetSelection",
        },
      ],
    });
    const hexed = requireResolved(
      resolveBattleSubject({
        state,
        subject: hexAct.subject,
        fills: [targetSelection, abilitySelection],
      }),
    );

    expect(hexed.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        abilityCheckBehavior: { kind: "abilityDisadvantage", ability: "wis" },
        damage: expect.objectContaining({ damageType: "necrotic" }),
      }),
    ]);

    const target = attackInitialTargetHole(hexed.state);
    const roll = attackRollHoleAfterTarget(
      hexed.state,
      target,
      undefined,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      hexed.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      undefined,
      goblinId,
    );
    expect(damage).toMatchObject({
      label: "weapon_longsword damage (1d8+1d6+3-slashing)",
      spellMarkedDamageRiders: [
        expect.objectContaining({
          targetCombatantId: goblinId,
          damage: expect.objectContaining({ damageType: "necrotic" }),
        }),
      ],
    });

    const goblinTurn = requireResolved(
      endTurn({ state: hexed.state, actorId: fighterId }),
    ).state;
    const hiddenFighterState: BattleState = {
      ...goblinTurn,
      combatants: new Map(goblinTurn.combatants).set(fighterId, {
        ...goblinTurn.combatants.get(fighterId)!,
        hidden: { discoveryDc: difficultyClass(15) },
      }),
    };
    const searchSubject = {
      tag: "action" as const,
      actorId: goblinId,
      action: "search" as const,
    };
    const searchAct = findAct(hiddenFighterState, searchSubject);
    const searchTarget = findHole(searchAct.initialHoles, "targetChoice");
    const searchCheck = requireHole(
      resolveBattleSubject({
        state: hiddenFighterState,
        subject: searchSubject,
        fills: [targetFill(searchTarget, fighterId)],
      }),
      "abilityCheck",
    );
    expect(searchCheck).toMatchObject({
      ability: "wis",
      skill: "perception",
      rollMode: "disadvantage",
    });
  });

  test("Hex retarget waits until a later turn after the cursed target drops", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-hex-later-turn-retarget"),
      combatants: [
        hexWarlockSeed(),
        statBlockCreatureInit({
          combatantId: goblinId,
          initiative: 10,
          currentHp: Hp(1),
        }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Skeleton",
          initiative: 5,
        }),
      ],
    });
    const state = session.state;
    const hexAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId === "hex",
    );
    if (hexAct === undefined) {
      throw new Error("Expected Hex cast act.");
    }
    const hexed = requireResolved(
      resolveBattleSubject({
        state,
        subject: hexAct.subject,
        fills: [
          targetFill(findHole(hexAct.initialHoles, "targetChoice"), goblinId),
          {
            kind: "abilityChoice",
            holeId: findHole(hexAct.initialHoles, "abilityChoice").holeId,
            value: "wis",
          },
        ],
      }),
    ).state;
    const nextFighterTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({
            state: requireResolved(
              endTurn({ state: hexed, actorId: fighterId }),
            ).state,
            actorId: goblinId,
          }),
        ).state,
        actorId: skeletonId,
      }),
    ).state;
    const dropped = applyBattleHitPointDamage({
      state: nextFighterTurn,
      target: nextFighterTurn.combatants.get(goblinId)!,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });

    expect(dropped.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        transfer: {
          kind: "availableAfterTurn",
          retargetTiming: "laterTurn",
          droppedOnTurn: {
            actorId: fighterId,
            round: dropped.initiative.round,
          },
        },
      }),
    ]);
    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({
          state: dropped,
          context: session.context,
        }),
      ).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId === "hex",
      ),
    ).toBe(false);

    const laterTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({
            state: requireResolved(
              endTurn({ state: dropped, actorId: fighterId }),
            ).state,
            actorId: goblinId,
          }),
        ).state,
        actorId: skeletonId,
      }),
    ).state;
    const transferAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: laterTurn,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId === "hex",
    );
    if (transferAct === undefined) {
      throw new Error("Expected later-turn Hex transfer act.");
    }
    const transferred = requireResolved(
      resolveBattleSubject({
        state: laterTurn,
        subject: transferAct.subject,
        fills: [
          targetFill(
            findHole(transferAct.initialHoles, "targetChoice"),
            skeletonId,
          ),
        ],
      }),
    ).state;

    expect(transferred.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: skeletonId,
        abilityCheckBehavior: { kind: "abilityDisadvantage", ability: "wis" },
        transfer: {
          kind: "awaitingTargetDrop",
          retargetTiming: "laterTurn",
        },
      }),
    ]);
  });

  test("Hunter's Mark maximum duration expiry clears Concentration and preserves damage behavior before expiry", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-hunters-mark-duration-expiry"),
      combatants: [
        characterSeed({
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hunters_mark")],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "hunters_mark",
        3,
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(session, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill(markTarget, goblinId)],
      }),
    );
    const caster = marked.state.combatants.get(fighterId);
    const rider = caster?.activeEffects.find(
      (effect) => effect.kind === "spellMarkedDamageRider",
    );
    if (caster === undefined || rider === undefined) {
      throw new Error("Expected active Hunter's Mark rider.");
    }
    if (rider.expiresAt.kind !== "concentration") {
      throw new Error("Expected Hunter's Mark to be Concentration-owned.");
    }
    const nearlyExpired: BattleState = {
      ...marked.state,
      combatants: new Map(marked.state.combatants).set(fighterId, {
        ...caster,
        activeEffects: [
          {
            ...rider,
            expiresAt: {
              kind: "concentration",
              combatantId: rider.expiresAt.combatantId,
              durationTicks: elapsedTimeTicks(1),
            },
          },
        ],
      }),
    };

    const target = attackInitialTargetHole(nearlyExpired);
    const roll = attackRollHoleAfterTarget(
      nearlyExpired,
      target,
      undefined,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      nearlyExpired,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      undefined,
      goblinId,
    );
    expect(damage).toMatchObject({
      label: "weapon_longsword damage (1d8+1d6+3-slashing)",
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: goblinId }),
      ],
    });

    const expiredCombatants = tickDurationEffects(
      nearlyExpired.combatants,
    ).value;
    expect(expiredCombatants.get(fighterId)?.concentration).toBeNull();
    expect(expiredCombatants.get(fighterId)?.activeEffects).toEqual([]);
  });

  test("Hunter's Mark invocation holes reject contradictory cast and transfer shapes", () => {
    const spell = spellRecord("hunters_mark");
    const baseSpell = {
      access: { tag: "prepared" },
      procedure: "markedDamageRider",
      spell,
      actionCost: "bonusAction",
      targeting: { kind: "singleCombatant" },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
      rangeFeet: movementFeet(90),
    };
    const baseHole = {
      kind: "rolledDice",
      holeId: holeId("battle:test:invalid-hunters-mark-invocation"),
      holeInstanceKey: holeInstanceKey(
        "battle:test:invalid-hunters-mark-invocation",
      ),
      label: "Invalid Hunter's Mark invocation",
      critical: false,
      spellMarkedDamageRiders: [],
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseSpell,
            action: "cast",
            resource: { tag: "none" },
            expiresAt: { kind: "concentration" },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseSpell,
            action: "transfer",
            resource: { tag: "spellSlot", slotLevel: 1 },
            activeEffect: {
              kind: "spellMarkedDamageRider",
              sourceCombatantId: fighterId,
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String("hunters_mark"),
              ),
              targetCombatantId: goblinId,
              transfer: { kind: "available", retargetTiming: "sameTurn" },
              damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
              expiresAt: { kind: "concentration" },
            },
          },
        }),
      ),
    ).toBe(true);
  });
});

function hexWarlockSeed() {
  return characterSeed({
    displayName: "Warlock",
    initiative: 20,
    d20Statistics: testCharacterD20Statistics({ str: 16, cha: 16 }),
    spellcasting: {
      ...wizardSpellcasting({
        cantrips: [],
        preparedSpells: [spellRecord("hex")],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      sourceClassName: "warlock",
    },
  });
}
