import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-PALADINS-SMITE paladin_paladins_smite
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-after-hit-damage spell.invocation-marked-damage-rider
import { describe, expect, test } from "vitest";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import { spellProcedureExecutionFor } from "./battle-reducer/spell-procedure-profiles/execution-registry.ts";
import { characterSpellProcedure } from "./character-execution-admission.ts";
import { unitIsSupportedClassFeatureSpellFreeCastResource } from "./character-battle-resources.ts";
import type {
  BattleRuntimeSession,
  BattleState,
  CombatantId,
} from "./battle-runtime.test-support.ts";
import {
  attackDamageDispositionFill,
  attackRollFill,
  attackTargetFill,
  battleId,
  characterBattleResourceIsUnlimited,
  characterBattleResourceIsUseCount,
  characterBattleResourceSupportedForUnit,
  characterSeed,
  characterSpellInvocationRefForProcedureRefForTest,
  spellAccessFreeCastSpellInvocationRef,
  damageRollFillWithGroups,
  discoverBattleActs,
  elapsedTimeTicks,
  fighterAttackSubject,
  fighterId,
  findAct,
  findHole,
  goblinId,
  interruptDecisionFill,
  paladinsSmiteResource,
  rangerFavoredEnemyResource,
  requiredAbilityCheckRollMode,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  resourceCount,
  snapshotBattle,
  spellFillSet,
  spellRecord,
  spellSlotInvocationRef,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";

describe("battle runtime: Favored Enemy", () => {
  test("Favored Enemy casts Hunter's Mark without expending a Spell Slot", () => {
    const favoredEnemy = rangerFavoredEnemyResource();
    const session = startBattleSessionRight({
      battleId: battleId("battle-favored-enemy-hunters-mark"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            featurePreparedSpells: [
              {
                sourceUnitId: favoredEnemy.unit.id,
                spell: spellRecord("hunters_mark"),
              },
            ],
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "ranger",
              abilityModifier: 3,
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: spellAccessFreeCastSpellInvocationRef(
        "hunters_mark",
        characterResourcePoolRefForUnit(
          session,
          fighterId,
          "ranger_favored_enemy",
        ),
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(session, subject);
    if (act.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected Favored Enemy bonus-action spell subject.");
    }
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              sourceProcedureRef: act.subject.procedureRef,
            },
          ]),
        ],
      }),
    );
    const markedSession = battleRuntimeSessionForTest({
      ...session,
      state: marked.state,
    });
    const ranger = markedSession.state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(
      characterResourceForUnit(markedSession, fighterId, "ranger_favored_enemy")
        ?.usesRemaining,
    ).toBe(resourceCount(1));
    expect(ranger.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
    expect(
      markedSession.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
    expect(
      markedSession.state.currentTurnResources.levelOnePlusSpellCastsThisTurn,
    ).toContain(fighterId);
    expect(ranger.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(ranger.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        expiresAt: {
          kind: "concentration",
          combatantId: fighterId,
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    ]);
    expect(
      requiredAbilityCheckRollMode(markedSession.state, fighterId, "wis", {
        skill: "survival",
        targetId: goblinId,
      }),
    ).toBe("advantage");
  });

  test("stale Favored Enemy Hunter's Mark free-cast resolution preserves turn resources and Concentration", () => {
    const favoredEnemy = rangerFavoredEnemyResource();
    const session = startBattleSessionRight({
      battleId: battleId("battle-favored-enemy-stale-hunters-mark"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            featurePreparedSpells: [
              {
                sourceUnitId: favoredEnemy.unit.id,
                spell: spellRecord("hunters_mark"),
              },
            ],
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "ranger",
              abilityModifier: 3,
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: spellAccessFreeCastSpellInvocationRef(
        "hunters_mark",
        characterResourcePoolRefForUnit(
          session,
          fighterId,
          "ranger_favored_enemy",
        ),
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(session, subject);
    if (act.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected Hunter's Mark Bonus Action spell.");
    }
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const ranger = state.combatants.get(fighterId);
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    if (act.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected bound Favored Enemy Bonus Action spell.");
    }
    const invocation = characterSpellProcedure(
      ranger.origin.execution,
      act.subject.procedureRef,
    );
    if (
      invocation === undefined ||
      invocation.procedure !== "markedDamageRider" ||
      invocation.resource.tag !== "spellAccessFreeCast"
    ) {
      throw new Error("Expected Favored Enemy Hunter's Mark invocation.");
    }
    const existingConcentration = {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("existing_concentration"),
      ),
      effectKind: "spellEffect",
    } as const;
    const favoredEnemyResource = characterResourceForUnit(
      session,
      fighterId,
      "ranger_favored_enemy",
    );
    if (
      favoredEnemyResource === undefined ||
      !characterBattleResourceIsUseCount(favoredEnemyResource) ||
      characterBattleResourceIsUnlimited(favoredEnemyResource)
    ) {
      throw new Error("Expected Favored Enemy to be a limited resource.");
    }
    const staleState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...ranger,
        concentration: existingConcentration,
        origin: {
          ...ranger.origin,
          resources: [
            { ...favoredEnemyResource, usesRemaining: resourceCount(0) },
            ...ranger.origin.resources.filter(
              (resource) => resource !== favoredEnemyResource,
            ),
          ],
        },
      }),
    };
    const staleSnapshot = snapshotBattle(staleState);
    const fills = [
      targetFill(markTarget, goblinId, [
        {
          kind: "spellTarget",
          casterId: fighterId,
          targetId: goblinId,
          sourceProcedureRef: act.subject.procedureRef,
        },
      ]),
    ];
    const fillSet = spellFillSet(
      fills,
      invocation,
      act.subject.procedureRef,
      fighterId,
      staleState,
    );
    if (fillSet.tag === "invalid") {
      throw new Error(fillSet.message);
    }

    const executionRegistry = spellProcedureExecutionRegistry();
    const result = spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: {
        state: staleState,
        subject: act.subject,
        fills,
      },
      actorId: fighterId,
      invocation,
      fillSet,
    });

    expect(result).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(result.snapshot).toEqual(staleSnapshot);
    expect(staleState.currentTurnResources.currentHasBonusAction).toBe(true);
    expect(staleState.combatants.get(fighterId)?.concentration).toEqual(
      existingConcentration,
    );
  });

  test("Favored Enemy initializes at its level-1 Long Rest use cap", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-favored-enemy-long-rest-cap"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 17 }],
          resources: [rangerFavoredEnemyResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const ranger = session.state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(
      characterResourceForUnit(session, fighterId, "ranger_favored_enemy")
        ?.usesRemaining,
    ).toBe(resourceCount(2));
  });

  test("Favored Enemy free-cast support requires Hunter's Mark grant identity", () => {
    const favoredEnemy = unitLibrary.requireUnit("ranger_favored_enemy");
    if (
      favoredEnemy.kind !== "class_feature" ||
      favoredEnemy.mechanics.family !== "passive"
    ) {
      throw new Error("Expected Ranger Favored Enemy passive class feature.");
    }
    const mismatchedFreeCast = {
      ...favoredEnemy,
      mechanics: {
        ...favoredEnemy.mechanics,
        grants: favoredEnemy.mechanics.grants.map((grant) =>
          grant.kind === "grant_spell_free_casts"
            ? { ...grant, spellId: parseUnitId("magic_missile") }
            : grant,
        ),
      },
    };

    expect(unitIsSupportedClassFeatureSpellFreeCastResource(favoredEnemy)).toBe(
      true,
    );
    expect(
      unitIsSupportedClassFeatureSpellFreeCastResource(mismatchedFreeCast),
    ).toBe(false);
    expect(characterBattleResourceSupportedForUnit(mismatchedFreeCast)).toBe(
      false,
    );
  });

  test("Favored Enemy falls back to normal Hunter's Mark Spell Slot casting when free casts are exhausted", () => {
    const favoredEnemy = rangerFavoredEnemyResource({ usesRemaining: 0 });
    const session = startBattleSessionRight({
      battleId: battleId("battle-favored-enemy-hunters-mark-slot-fallback"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            featurePreparedSpells: [
              {
                sourceUnitId: favoredEnemy.unit.id,
                spell: spellRecord("hunters_mark"),
              },
            ],
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "ranger",
              abilityModifier: 3,
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.tag ===
            "spellAccessFreeCast" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "hunters_mark",
      ),
    ).toBe(false);

    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "hunters_mark",
        1,
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(session, subject);
    if (act.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected Hunter's Mark Bonus Action spell.");
    }
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              sourceProcedureRef: act.subject.procedureRef,
            },
          ]),
        ],
      }),
    );
    const markedSession = battleRuntimeSessionForTest({
      ...session,
      state: marked.state,
    });
    const ranger = markedSession.state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(
      characterResourceForUnit(markedSession, fighterId, "ranger_favored_enemy")
        ?.usesRemaining,
    ).toBe(resourceCount(0));
    expect(ranger.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 1 },
    ]);
    expect(
      markedSession.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(true);
  });
});

describe("battle runtime: Paladin's Smite", () => {
  test("Paladin's Smite casts Divine Smite after a melee hit without expending a Spell Slot", () => {
    const paladinsSmite = paladinsSmiteResource();
    const session = paladinsSmiteBattleSession(paladinsSmite);
    const state = session.state;
    const subject = paladinLongswordAttackSubject(state);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const targetFillValue = attackTargetFill(target, fighterId, goblinId);
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillValue],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFillValue, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Paladin's Smite attack-hit window.");
    }
    const smiteChoice =
      awaitingReaction.snapshot.pendingInterrupt?.choices.find((choice) => {
        if (
          choice.kind !== "nestedProcedure" ||
          choice.subject.tag !== "runtimeCommand" ||
          choice.subject.command !== "castAttackHitBonusActionSpell" ||
          choice.subject.casterId !== fighterId
        )
          return false;
        return (
          characterSpellInvocationRefForProcedureRefForTest(
            battleRuntimeSessionForTest({
              state: awaitingReaction.state,
              context: session.context,
            }),
            choice.subject.casterId,
            choice.subject.procedureRef,
          ).tag === "spellAccessFreeCast"
        );
      });
    if (
      smiteChoice === undefined ||
      smiteChoice.kind !== "nestedProcedure" ||
      smiteChoice.subject.tag !== "runtimeCommand" ||
      smiteChoice.subject.command !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Paladin's Smite free-cast choice.");
    }
    expect(
      characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({
          state: awaitingReaction.state,
          context: session.context,
        }),
        smiteChoice.subject.casterId,
        smiteChoice.subject.procedureRef,
      ),
    ).toEqual(
      spellAccessFreeCastSpellInvocationRef(
        "divine_smite",
        characterResourcePoolRefForUnit(
          session,
          fighterId,
          "paladin_paladins_smite",
        ),
        "afterHitDamage",
      ),
    );

    const afterSmite = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: smiteChoice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });
    if (afterSmite.tag !== "needsHoles") {
      throw new Error("Expected Paladin's Smite replay to need attack damage.");
    }
    const damage = findHole(afterSmite.holes, "rolledDice");
    expect(damage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceProcedureRef: expect.any(String),
            damage: {
              expr: { dice: 2, dieSize: 8 },
              damageType: "radiant",
            },
          }),
        ],
      }),
    );

    const damageApplied = resolveBattleSubject({
      state: afterSmite.state,
      subject,
      fills: [
        targetFillValue,
        rollFill,
        damageRollFillWithGroups(damage, [[4], [3, 4]]),
      ],
    });
    const disposition = requireHole(damageApplied, "attackDamageDisposition");
    const resolved = requireResolved(
      resolveBattleSubject({
        state: afterSmite.state,
        subject,
        fills: [
          targetFillValue,
          rollFill,
          damageRollFillWithGroups(damage, [[4], [3, 4]]),
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
    );
    const paladin = resolved.state.combatants.get(fighterId);
    expect(paladin?.origin.kind).toBe("character");
    if (paladin?.origin.kind !== "character") {
      throw new Error("Expected Paladin caster.");
    }
    const resourcePoolRef = session.context.characters
      .get(fighterId)
      ?.resourceOwnership.find(
        (resource) => resource.unit.id === "paladin_paladins_smite",
      )?.resourcePoolRef;
    const paladinsSmiteResourceState = paladin.origin.resources.find(
      (resource) => resource.resourcePoolRef === resourcePoolRef,
    );
    if (
      paladinsSmiteResourceState === undefined ||
      !characterBattleResourceIsUseCount(paladinsSmiteResourceState) ||
      characterBattleResourceIsUnlimited(paladinsSmiteResourceState)
    ) {
      throw new Error("Expected Paladin's Smite limited resource state.");
    }
    expect(paladinsSmiteResourceState.usesRemaining).toBe(resourceCount(0));
    expect(paladin.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
    expect(
      resolved.state.currentTurnResources.levelOnePlusSpellCastsThisTurn,
    ).toContain(fighterId);
  });

  test("Paladin's Smite falls back to ordinary Divine Smite Spell Slot casting when the free cast is exhausted", () => {
    const session = paladinsSmiteBattleSession(
      paladinsSmiteResource({ usesRemaining: 0 }),
    );
    const state = session.state;
    const subject = paladinLongswordAttackSubject(state);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const targetFillValue = attackTargetFill(target, fighterId, goblinId);
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillValue],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillValue,
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Divine Smite attack-hit window.");
    }

    expect(
      awaitingReaction.snapshot.pendingInterrupt?.choices.some((choice) => {
        if (
          choice.kind !== "nestedProcedure" ||
          choice.subject.tag !== "runtimeCommand" ||
          choice.subject.command !== "castAttackHitBonusActionSpell"
        )
          return false;
        const invocation = characterSpellInvocationRefForProcedureRefForTest(
          battleRuntimeSessionForTest({
            state: awaitingReaction.state,
            context: session.context,
          }),
          choice.subject.casterId,
          choice.subject.procedureRef,
        );
        return (
          invocation.tag === "spellAccessFreeCast" &&
          invocation.spellId === "divine_smite"
        );
      }),
    ).toBe(false);
    expect(
      awaitingReaction.snapshot.pendingInterrupt?.choices.some((choice) => {
        if (
          choice.kind !== "nestedProcedure" ||
          choice.subject.tag !== "runtimeCommand" ||
          choice.subject.command !== "castAttackHitBonusActionSpell"
        )
          return false;
        const invocation = characterSpellInvocationRefForProcedureRefForTest(
          battleRuntimeSessionForTest({
            state: awaitingReaction.state,
            context: session.context,
          }),
          choice.subject.casterId,
          choice.subject.procedureRef,
        );
        return (
          invocation.tag === "spellSlot" &&
          invocation.spellId === "divine_smite"
        );
      }),
    ).toBe(true);
  });

  test("Paladin's Smite free cast remains available after a Spell Slot use without offering slot Smite", () => {
    const session = paladinsSmiteBattleSession(paladinsSmiteResource());
    const baseState = session.state;
    const state: BattleState = {
      ...baseState,
      currentTurnResources: {
        ...baseState.currentTurnResources,
        spellSlotUsesThisTurn: [{ kind: "committed", combatantId: fighterId }],
        levelOnePlusSpellCastsThisTurn: [fighterId],
      },
    };
    const subject = paladinLongswordAttackSubject(state);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const targetFillValue = attackTargetFill(target, fighterId, goblinId);
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillValue],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillValue,
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Paladin's Smite attack-hit window.");
    }

    expect(
      awaitingReaction.snapshot.pendingInterrupt?.choices.some((choice) => {
        if (
          choice.kind !== "nestedProcedure" ||
          choice.subject.tag !== "runtimeCommand" ||
          choice.subject.command !== "castAttackHitBonusActionSpell"
        )
          return false;
        const invocation = characterSpellInvocationRefForProcedureRefForTest(
          battleRuntimeSessionForTest({
            state: awaitingReaction.state,
            context: session.context,
          }),
          choice.subject.casterId,
          choice.subject.procedureRef,
        );
        return (
          invocation.tag === "spellAccessFreeCast" &&
          invocation.spellId === "divine_smite"
        );
      }),
    ).toBe(true);
    expect(
      awaitingReaction.snapshot.pendingInterrupt?.choices.some((choice) => {
        if (
          choice.kind !== "nestedProcedure" ||
          choice.subject.tag !== "runtimeCommand" ||
          choice.subject.command !== "castAttackHitBonusActionSpell"
        )
          return false;
        const invocation = characterSpellInvocationRefForProcedureRefForTest(
          battleRuntimeSessionForTest({
            state: awaitingReaction.state,
            context: session.context,
          }),
          choice.subject.casterId,
          choice.subject.procedureRef,
        );
        return (
          invocation.tag === "spellSlot" &&
          invocation.spellId === "divine_smite"
        );
      }),
    ).toBe(false);
  });

  test("Paladin's Smite free-cast support requires Divine Smite grant identity", () => {
    const paladinsSmite = unitLibrary.requireUnit("paladin_paladins_smite");
    if (
      paladinsSmite.kind !== "class_feature" ||
      paladinsSmite.mechanics.family !== "passive"
    ) {
      throw new Error("Expected Paladin's Smite passive class feature.");
    }
    const mismatchedFreeCast = {
      ...paladinsSmite,
      mechanics: {
        ...paladinsSmite.mechanics,
        grants: paladinsSmite.mechanics.grants.map((grant) =>
          grant.kind === "grant_spell_free_casts"
            ? { ...grant, spellId: parseUnitId("magic_missile") }
            : grant,
        ),
      },
    };

    expect(characterBattleResourceSupportedForUnit(mismatchedFreeCast)).toBe(
      false,
    );
  });
});

function paladinsSmiteBattleSession(
  resource: ReturnType<typeof paladinsSmiteResource>,
) {
  return startBattleSessionRight({
    battleId: battleId("battle-paladins-smite-divine-smite"),
    combatants: [
      characterSeed({
        initiative: 20,
        classLevels: [{ className: "paladin", level: 2 }],
        resources: [resource],
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
          featurePreparedSpells: [
            {
              sourceUnitId: resource.unit.id,
              spell: spellRecord("divine_smite"),
            },
          ],
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "paladin",
            abilityModifier: 3,
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function paladinLongswordAttackSubject(state: BattleState) {
  return fighterAttackSubject(state, "Longsword");
}

function characterResourceForUnit(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  unitId: string,
) {
  const resourcePoolRef = session.context.characters
    .get(actorId)
    ?.resourceOwnership.find(
      (ownership) => ownership.unit.id === unitId,
    )?.resourcePoolRef;
  const actor = session.state.combatants.get(actorId);
  const resource =
    actor?.origin.kind === "character"
      ? actor.origin.resources.find(
          (candidate) => candidate.resourcePoolRef === resourcePoolRef,
        )
      : undefined;
  return resource !== undefined && characterBattleResourceIsUseCount(resource)
    ? resource
    : undefined;
}

function characterResourcePoolRefForUnit(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  unitId: string,
) {
  const resource = characterResourceForUnit(session, actorId, unitId);
  if (resource === undefined) {
    throw new Error(`Expected character resource for ${unitId}.`);
  }
  return resource.resourcePoolRef;
}
import { unitId as parseUnitId } from "@dnd/shared/game-facts";
