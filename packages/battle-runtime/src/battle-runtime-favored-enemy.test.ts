// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-PALADINS-SMITE paladin_paladins_smite
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-after-hit-damage spell.invocation-marked-damage-rider
import {
  attackRollFill,
  attackTargetFill,
  attackDamageDispositionFill,
  damageRollFillWithGroups,
  startBattleRight,
  requireResolved,
  requireHole,
  findHole,
  findAct,
  targetFill,
  characterSeed,
  statBlockCreatureInit,
  paladinsSmiteResource,
  rangerFavoredEnemyResource,
  reactionDecisionFill,
  wizardSpellcasting,
  spellRecord,
  fighterId,
  goblinId,
  unitLibrary,
  battleId,
  characterBattleResourceIsUseCount,
  characterBattleResourceIsUnlimited,
  characterBattleResourceSupportedForUnit,
  classFeatureFreeCastSpellInvocationRef,
  discoverBattleActs,
  elapsedTimeTicks,
  requiredAbilityCheckRollMode,
  resolveBattleSubject,
  resolveBattleReaction,
  resourceCount,
  snapshotBattle,
  spellFillSet,
  spellSlotInvocationRef,
  supportedSpellActs,
  supportedSpellInvocationMatchesRef,
} from "./battle-runtime-test-support.ts";
import type { BattleState } from "./battle-runtime-test-support.ts";
import { markedDamageRiderProfile } from "./battle-reducer/spell-procedure-profiles/marked-damage-rider.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Favored Enemy", () => {
  test("Favored Enemy casts Hunter's Mark without expending a Spell Slot", () => {
    const favoredEnemy = rangerFavoredEnemyResource();
    const state = startBattleRight({
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
            sourceClassName: "ranger",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: classFeatureFreeCastSpellInvocationRef(
        "hunters_mark",
        "ranger_favored_enemy",
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    const ranger = marked.state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(ranger.origin.resources[0]?.usesRemaining).toBe(resourceCount(1));
    expect(ranger.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
    expect(
      marked.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
    expect(
      marked.state.currentTurnResources.levelOnePlusSpellCastsThisTurn,
    ).toContain(fighterId);
    expect(ranger.concentration).toEqual({
      sourceSpellId: "hunters_mark",
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
      requiredAbilityCheckRollMode(marked.state, fighterId, "wis", {
        skill: "survival",
        targetId: goblinId,
      }),
    ).toBe("advantage");
  });

  test("stale Favored Enemy Hunter's Mark free-cast resolution preserves turn resources and Concentration", () => {
    const favoredEnemy = rangerFavoredEnemyResource();
    const state = startBattleRight({
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
            sourceClassName: "ranger",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: classFeatureFreeCastSpellInvocationRef(
        "hunters_mark",
        "ranger_favored_enemy",
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const ranger = state.combatants.get(fighterId);
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    const invocation = supportedSpellActs(ranger).find(
      (candidate) =>
        candidate.procedure === "markedDamageRider" &&
        supportedSpellInvocationMatchesRef(candidate, subject.invocation),
    );
    if (
      invocation === undefined ||
      invocation.procedure !== "markedDamageRider" ||
      invocation.resource.tag !== "classFeatureFreeCast"
    ) {
      throw new Error("Expected Favored Enemy Hunter's Mark invocation.");
    }
    const existingConcentration = {
      sourceSpellId: "existing_concentration",
      effectKind: "spellEffect",
    } as const;
    const [favoredEnemyResource] = ranger.origin.resources;
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
            ...ranger.origin.resources.slice(1),
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
          spellId: "hunters_mark",
        },
      ]),
    ];
    const fillSet = spellFillSet(fills, invocation);
    if (fillSet.tag === "invalid") {
      throw new Error(fillSet.message);
    }

    const result = markedDamageRiderProfile.resolve({
      input: {
        state: staleState,
        subject,
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
    const state = startBattleRight({
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
    const ranger = state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(ranger.origin.resources[0]?.usesRemaining).toBe(resourceCount(2));
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
            ? { ...grant, spellId: "magic_missile" }
            : grant,
        ),
      },
    };

    expect(characterBattleResourceSupportedForUnit(mismatchedFreeCast)).toBe(
      false,
    );
  });

  test("Favored Enemy falls back to normal Hunter's Mark Spell Slot casting when free casts are exhausted", () => {
    const favoredEnemy = rangerFavoredEnemyResource({ usesRemaining: 0 });
    const state = startBattleRight({
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
            sourceClassName: "ranger",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          candidate.subject.invocation.tag === "classFeatureFreeCast" &&
          candidate.subject.invocation.spellId === "hunters_mark",
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
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    const ranger = marked.state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(ranger.origin.resources[0]?.usesRemaining).toBe(resourceCount(0));
    expect(ranger.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 1 },
    ]);
    expect(
      marked.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(true);
  });
});

describe("battle runtime: Paladin's Smite", () => {
  test("Paladin's Smite casts Divine Smite after a melee hit without expending a Spell Slot", () => {
    const paladinsSmite = paladinsSmiteResource();
    const state = paladinsSmiteBattleState(paladinsSmite);
    const subject = paladinLongswordAttackSubject();
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const targetFillValue = attackTargetFill(
      target,
      fighterId,
      goblinId,
      "Longsword",
    );
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
    const smiteChoice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (choice) =>
        choice.kind === "castAttackHitBonusActionSpell" &&
        choice.reactorId === fighterId &&
        choice.invocation.tag === "classFeatureFreeCast",
    );
    if (
      smiteChoice === undefined ||
      smiteChoice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Paladin's Smite free-cast choice.");
    }
    expect(smiteChoice.invocation).toEqual(
      classFeatureFreeCastSpellInvocationRef(
        "divine_smite",
        "paladin_paladins_smite",
        "afterHitDamage",
      ),
    );

    const afterSmite = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: smiteChoice.invocation,
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
            sourceSpellId: "divine_smite",
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
    const paladinsSmiteResourceState = paladin.origin.resources.find(
      (resource) => resource.unit.id === "paladin_paladins_smite",
    );
    expect(paladinsSmiteResourceState?.usesRemaining).toBe(resourceCount(0));
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
    const state = paladinsSmiteBattleState(
      paladinsSmiteResource({ usesRemaining: 0 }),
    );
    const subject = paladinLongswordAttackSubject();
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const targetFillValue = attackTargetFill(
      target,
      fighterId,
      goblinId,
      "Longsword",
    );
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
      awaitingReaction.snapshot.pendingReaction?.choices.some(
        (choice) =>
          choice.kind === "castAttackHitBonusActionSpell" &&
          choice.invocation.tag === "classFeatureFreeCast" &&
          choice.invocation.spellId === "divine_smite",
      ),
    ).toBe(false);
    expect(
      awaitingReaction.snapshot.pendingReaction?.choices.some(
        (choice) =>
          choice.kind === "castAttackHitBonusActionSpell" &&
          choice.invocation.tag === "spellSlot" &&
          choice.invocation.spellId === "divine_smite",
      ),
    ).toBe(true);
  });

  test("Paladin's Smite free cast remains available after a Spell Slot use without offering slot Smite", () => {
    const baseState = paladinsSmiteBattleState(paladinsSmiteResource());
    const state: BattleState = {
      ...baseState,
      currentTurnResources: {
        ...baseState.currentTurnResources,
        spellSlotUsesThisTurn: [{ kind: "committed", combatantId: fighterId }],
        levelOnePlusSpellCastsThisTurn: [fighterId],
      },
    };
    const subject = paladinLongswordAttackSubject();
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const targetFillValue = attackTargetFill(
      target,
      fighterId,
      goblinId,
      "Longsword",
    );
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
      awaitingReaction.snapshot.pendingReaction?.choices.some(
        (choice) =>
          choice.kind === "castAttackHitBonusActionSpell" &&
          choice.invocation.tag === "classFeatureFreeCast" &&
          choice.invocation.spellId === "divine_smite",
      ),
    ).toBe(true);
    expect(
      awaitingReaction.snapshot.pendingReaction?.choices.some(
        (choice) =>
          choice.kind === "castAttackHitBonusActionSpell" &&
          choice.invocation.tag === "spellSlot" &&
          choice.invocation.spellId === "divine_smite",
      ),
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
            ? { ...grant, spellId: "magic_missile" }
            : grant,
        ),
      },
    };

    expect(characterBattleResourceSupportedForUnit(mismatchedFreeCast)).toBe(
      false,
    );
  });
});

function paladinsSmiteBattleState(
  resource: ReturnType<typeof paladinsSmiteResource>,
) {
  return startBattleRight({
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
          sourceClassName: "paladin",
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function paladinLongswordAttackSubject() {
  return {
    tag: "action" as const,
    actorId: fighterId,
    action: "attack" as const,
    attackName: "Longsword",
  };
}
