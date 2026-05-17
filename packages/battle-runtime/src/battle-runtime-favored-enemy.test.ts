import {
  startBattleRight,
  requireResolved,
  findHole,
  findAct,
  targetFill,
  characterSeed,
  statBlockCreatureInit,
  rangerFavoredEnemyResource,
  wizardSpellcasting,
  spellRecord,
  fighterId,
  goblinId,
  unitLibrary,
  battleId,
  characterBattleResourceIsUnlimited,
  characterBattleResourceSupportedForUnit,
  classFeatureFreeCastSpellInvocationRef,
  discoverBattleActs,
  elapsedTimeTicks,
  requiredAbilityCheckRollMode,
  resolveBattleSubject,
  resolveMarkedDamageRiderSpellAct,
  resourceCount,
  snapshotBattle,
  spellFillSet,
  spellSlotInvocationRef,
  supportedSpellActs,
  supportedSpellInvocationMatchesRef,
} from "./battle-runtime-test-support.ts";
import type { BattleState } from "./battle-runtime-test-support.ts";
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
    expect(marked.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      false,
    );
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

    const result = resolveMarkedDamageRiderSpellAct({
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
    expect(marked.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      true,
    );
  });
});
