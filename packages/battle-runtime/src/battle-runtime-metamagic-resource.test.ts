// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.metamagic-battle-resource-bridge unit-feature.metamagic-cast-governor-quickened

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { resourceCount } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";
import {
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type CharacterBattleMetamagicOptionFact,
  characterBattleResourceIsPointPool,
  discoverBattleActs,
  spendCharacterPointPoolResource,
  spellSlotInvocationRef,
  startBattle,
} from "./index.ts";
import {
  DISTANT_METAMAGIC_EFFECT_KIND,
  DISTANT_METAMAGIC_UNSUPPORTED_MESSAGE,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  EXTENDED_METAMAGIC_UNSUPPORTED_MESSAGE,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  SUBTLE_METAMAGIC_UNSUPPORTED_MESSAGE,
} from "./battle-reducer/metamagic.ts";
import {
  characterSeed,
  battleId,
  combatantId,
  damageRollFillWithGroups,
  fighterId,
  findHole,
  partySide,
  requireResolved,
  resolveBattleSubject,
  skeletonId,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
  spellRecord,
} from "./battle-runtime-test-support.ts";

describe("battle runtime: Sorcerer Metamagic resource bridge", () => {
  test("stores Metamagic option facts beside the shared Sorcery Point point pool", () => {
    const sorcererId = combatantId("combatant:sorcerer-metamagic-resource");
    const state = startBattleRight({
      battleId: battleId("battle:sorcerer-metamagic-resource"),
      combatants: [
        characterSeed({
          combatantId: sorcererId,
          displayName: "Sorcerer",
          initiative: 12,
          side: partySide,
          classLevels: [{ className: "sorcerer", level: 5 }],
          resources: [
            {
              unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
              pointsRemaining: resourceCount(4),
            },
          ],
          metamagic: {
            sorceryPointResourceUnitId: "sorcerer_font_of_magic",
            spellUseLimit: "one_per_spell_unless_option_allows_stacking",
            knownOptions: [
              {
                effectKind: "damage_dice_reroll",
                stackingMode: "can_combine_with_different_metamagic",
                sorceryPointCost: resourceCount(1),
              },
              {
                effectKind: "saving_throw_disadvantage",
                stackingMode: "one_per_spell",
                sorceryPointCost: resourceCount(2),
              },
            ],
          },
        }),
        statBlockCreatureInit({
          combatantId: combatantId("combatant:metamagic-target"),
          initiative: 10,
        }),
      ],
    });
    const sorcerer = state.combatants.get(sorcererId);
    if (sorcerer?.origin.kind !== "character") {
      throw new Error("Expected Sorcerer character combatant.");
    }
    const sorceryPoints = sorcerer.origin.resources.find(
      characterBattleResourceIsPointPool,
    );
    expect(sorceryPoints?.pointsRemaining).toBe(resourceCount(4));
    expect(sorcerer.origin.metamagic).toEqual({
      sorceryPointResourceUnitId: "sorcerer_font_of_magic",
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [
        {
          effectKind: "damage_dice_reroll",
          stackingMode: "can_combine_with_different_metamagic",
          sorceryPointCost: resourceCount(1),
        },
        {
          effectKind: "saving_throw_disadvantage",
          stackingMode: "one_per_spell",
          sorceryPointCost: resourceCount(2),
        },
      ],
    });

    if (sorceryPoints === undefined) {
      throw new Error("Expected Sorcery Point resource.");
    }
    const spent = expectRight(
      spendCharacterPointPoolResource({
        resource: sorceryPoints,
        points: resourceCount(2),
      }),
    );
    expect(spent.pointsRemaining).toBe(resourceCount(2));
    expect(
      Either.isLeft(
        spendCharacterPointPoolResource({
          resource: spent,
          points: resourceCount(3),
        }),
      ),
    ).toBe(true);
  });

  test("rejects over-cap Sorcery Point point-pool initialization", () => {
    expect(
      startBattle({
        battleId: battleId("battle:sorcerer-metamagic-resource-over-cap"),
        combatants: [
          characterSeed({
            combatantId: combatantId(
              "combatant:sorcerer-metamagic-resource-over-cap",
            ),
            displayName: "Sorcerer",
            initiative: 12,
            side: partySide,
            classLevels: [{ className: "sorcerer", level: 5 }],
            resources: [
              {
                unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
                pointsRemaining: resourceCount(6),
              },
            ],
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Point-pool character battle resource remaining points must not exceed its maximum.",
      }),
    );
  });
});

describe("battle runtime: Sorcerer Metamagic cast governor and Quickened Spell", () => {
  test("discovers Quickened Cure Wounds as a Bonus Action and spends Sorcery Points without spending the Magic action", () => {
    const state = metamagicBattle();
    const act = quickenedCureWoundsAct(state);

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "cure_wounds",
        1,
        "directHitPointRestoration",
      ),
      mode: { tag: "cast" },
      metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
    });

    const resolved = resolveQuickenedCureWounds(state, act);
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual({ kind: "committed", combatantId: wizardId });
    expect(
      resolved.state.currentTurnResources.levelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(
      resolved.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(14);
    expect(
      discoverBattleActs(resolved.state).some(
        (candidate) =>
          "invocation" in candidate.subject &&
          candidate.subject.invocation.tag === "spellSlot",
      ),
    ).toBe(false);
  });

  test("requires known Metamagic options and enough unexpended Sorcery Points", () => {
    const unaffordable = metamagicBattle({ sorceryPoints: 1 });
    expect(hasQuickenedCureWoundsAct(unaffordable)).toBe(false);
    expect(
      resolveBattleSubject({
        state: unaffordable,
        subject: quickenedCureWoundsSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Metamagic requires enough unexpended Sorcery Points.",
    });

    const unknown = metamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    expect(
      resolveBattleSubject({
        state: unknown,
        subject: {
          ...quickenedCureWoundsSubject(),
          metamagic: [{ effectKind: "saving_throw_disadvantage" }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Metamagic selection must be one of the actor's known Metamagic options.",
    });
  });

  test("enforces one Metamagic option per spell without admitting unsupported second-option effects", () => {
    const state = metamagicBattle({
      sorceryPoints: 5,
      knownOptions: [
        quickenedMetamagicOption(),
        empoweredMetamagicOption(),
        heightenedMetamagicOption(),
      ],
    });

    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...quickenedCureWoundsSubject(),
          metamagic: [
            { effectKind: QUICKENED_METAMAGIC_EFFECT_KIND },
            { effectKind: "damage_dice_reroll" },
          ],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Selected Metamagic option effect is not supported for this spell procedure.",
    });

    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...quickenedCureWoundsSubject(),
          metamagic: [
            { effectKind: QUICKENED_METAMAGIC_EFFECT_KIND },
            { effectKind: "saving_throw_disadvantage" },
          ],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "A spell can use only one Metamagic option unless one selected option explicitly combines with a different Metamagic option.",
    });
  });

  test("explicitly closes cast-property Metamagic options before Sorcery Point spending", () => {
    const state = metamagicBattle({
      knownOptions: [
        distantMetamagicOption(),
        extendedMetamagicOption(),
        subtleMetamagicOption(),
      ],
    });

    for (const closure of [
      {
        effectKind: DISTANT_METAMAGIC_EFFECT_KIND,
        message: DISTANT_METAMAGIC_UNSUPPORTED_MESSAGE,
      },
      {
        effectKind: EXTENDED_METAMAGIC_EFFECT_KIND,
        message: EXTENDED_METAMAGIC_UNSUPPORTED_MESSAGE,
      },
      {
        effectKind: SUBTLE_METAMAGIC_EFFECT_KIND,
        message: SUBTLE_METAMAGIC_UNSUPPORTED_MESSAGE,
      },
    ] as const) {
      expect(
        resolveBattleSubject({
          state,
          subject: {
            ...cureWoundsActionSubject(),
            metamagic: [{ effectKind: closure.effectKind }],
          },
          fills: [],
        }),
      ).toMatchObject({
        tag: "invalid",
        message: closure.message,
      });
    }

    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("blocks Quickened level 1+ spells after this turn has already cast a level 1+ spell", () => {
    const state = metamagicBattle();
    const afterPriorFreeSpell: BattleState = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        levelOnePlusSpellCastsThisTurn: [wizardId],
      },
    };

    expect(hasQuickenedCureWoundsAct(afterPriorFreeSpell)).toBe(false);
    expect(
      resolveBattleSubject({
        state: afterPriorFreeSpell,
        subject: quickenedCureWoundsSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Quickened Spell cannot modify a level 1+ spell after this turn has already cast a level 1+ spell.",
    });
  });
});

describe("battle runtime: Sorcerer save-affecting Metamagic", () => {
  test("discovers Heightened Burning Hands and spends Sorcery Points after choosing one disadvantaged target", () => {
    const state = saveMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const act = heightenedBurningHandsAct(state);
    const heightenedHole = findHole(act.initialHoles, "targetChoice");

    expect(heightenedHole).toMatchObject({
      label: "Burning Hands Heightened Spell target",
      choices: expect.arrayContaining([fighterId, skeletonId]),
    });
    const heightenedTarget = targetFill(heightenedHole, skeletonId);
    const awaitingSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [heightenedTarget],
    });
    const saveHole = findHole(
      awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
      "savingThrowOutcome",
    );
    if (saveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Heightened Spell saving throw hole.");
    }
    expect(saveHole.targetRollModes).toContainEqual({
      targetId: skeletonId,
      rollMode: "disadvantage",
    });

    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        heightenedTarget,
        {
          kind: "savingThrowOutcome",
          holeId: saveHole.holeId,
          value: {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: [fighterId, skeletonId],
            },
            outcomes: [
              { targetId: fighterId, succeeded: true },
              { targetId: skeletonId, succeeded: false },
            ],
          },
        },
      ],
    });
    const damageHole = findHole(
      awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          heightenedTarget,
          {
            kind: "savingThrowOutcome",
            holeId: saveHole.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [fighterId, skeletonId],
              },
              outcomes: [
                { targetId: fighterId, succeeded: true },
                { targetId: skeletonId, succeeded: false },
              ],
            },
          },
          damageRollFillWithGroups(damageHole, [[4, 3, 2]]),
        ],
      }),
    );

    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
  });

  test("Heightened Spell Disadvantage cancels an existing save Advantage source", () => {
    const base = saveMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const skeleton = base.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton combatant.");
    }
    const state: BattleState = {
      ...base,
      combatants: new Map(base.combatants).set(skeletonId, {
        ...skeleton,
        dodging: true,
      }),
    };
    const act = heightenedBurningHandsAct(state);
    const heightenedHole = findHole(act.initialHoles, "targetChoice");
    const heightenedTarget = targetFill(heightenedHole, skeletonId);
    const awaitingSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [heightenedTarget],
    });
    const saveHole = findHole(
      awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
      "savingThrowOutcome",
    );
    if (saveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Heightened Spell saving throw hole.");
    }

    expect(
      saveHole.targetRollModes.find(
        (projection) => projection.targetId === skeletonId,
      ),
    ).toBeUndefined();
  });

  test("Careful Spell turns a protected successful half-damage save into no damage", () => {
    const state = saveMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const act = carefulBurningHandsAct(state);
    const protectedTargetsHole = findHole(act.initialHoles, "spellTargetList");

    expect(protectedTargetsHole).toMatchObject({
      label: "Burning Hands Careful Spell protected targets",
      maxTargets: 3,
    });
    const protectedTargetsFill = {
      kind: "spellTargetList" as const,
      holeId: protectedTargetsHole.holeId,
      value: { targetIds: [fighterId] },
      spatialFacts: [],
    };
    const awaitingSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [protectedTargetsFill],
    });
    const saveHole = findHole(
      awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
      "savingThrowOutcome",
    );
    if (saveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Careful Spell saving throw hole.");
    }

    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        protectedTargetsFill,
        {
          kind: "savingThrowOutcome",
          holeId: saveHole.holeId,
          value: {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: [fighterId, skeletonId],
            },
            outcomes: [
              { targetId: fighterId, succeeded: true },
              { targetId: skeletonId, succeeded: false },
            ],
          },
        },
      ],
    });
    const damageHole = findHole(
      awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          protectedTargetsFill,
          {
            kind: "savingThrowOutcome",
            holeId: saveHole.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [fighterId, skeletonId],
              },
              outcomes: [
                { targetId: fighterId, succeeded: true },
                { targetId: skeletonId, succeeded: false },
              ],
            },
          },
          damageRollFillWithGroups(damageHole, [[4, 3, 2]]),
        ],
      }),
    );

    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(12);
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBeLessThan(7);
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(3));
  });

  test("Careful Spell is admitted for target-list save spells such as Command", () => {
    const state = commandMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const act = carefulCommandAct(state);
    const targetHole = requireSpellTargetListHole(
      act.initialHoles,
      "Command targets",
    );
    const protectedTargetsHole = requireSpellTargetListHole(
      act.initialHoles,
      "Command Careful Spell protected targets",
    );
    const commandOptionHole = findHole(act.initialHoles, "commandOptionChoice");

    expect(targetHole.label).toBe("Command targets");
    expect(protectedTargetsHole).toMatchObject({
      label: "Command Careful Spell protected targets",
      maxTargets: 3,
    });

    const targetFill = spellTargetListFill(targetHole, "command", [skeletonId]);
    const protectedTargetsFill = spellTargetListFill(
      protectedTargetsHole,
      "command",
      [skeletonId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOptionHole.holeId,
      value: "halt",
    };
    const awaitingSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, protectedTargetsFill, optionFill],
    });
    const saveHole = findHole(
      awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
      "savingThrowOutcome",
    );
    if (saveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Careful Command saving throw hole.");
    }

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill,
          protectedTargetsFill,
          optionFill,
          {
            kind: "savingThrowOutcome",
            holeId: saveHole.holeId,
            value: {
              outcomes: [{ targetId: skeletonId, succeeded: true }],
            },
          },
        ],
      }),
    );

    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(3));
  });

  test("Heightened Spell is explicitly closed for repeat-save spell lifecycles", () => {
    const state = gustOfWindMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const act = gustOfWindActionAct(state);

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === "gust_of_wind" &&
          candidate.subject.metamagic?.some(
            (selection) => selection.effectKind === "saving_throw_disadvantage",
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...act.subject,
          metamagic: [{ effectKind: "saving_throw_disadvantage" }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Heightened Spell is not supported for spell procedures with repeat Saving Throws until the selected target is carried through later save holes.",
    });
  });

  test("save-affecting Metamagic is explicitly closed for Ready spell mode", () => {
    const state = saveMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const readyAct = readyBurningHandsAct(state);

    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...readyAct.subject,
          metamagic: [{ effectKind: "saving_throw_disadvantage" }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Save-affecting Metamagic is supported only for action-time spell casts.",
    });
  });

  test("save-affecting Metamagic is explicitly closed for Sleep target admission", () => {
    const state = sleepMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const sleepAct = sleepActionAct(state);

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === "sleep" &&
          candidate.subject.metamagic?.some(
            (selection) => selection.effectKind === "saving_throw_disadvantage",
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...sleepAct.subject,
          metamagic: [{ effectKind: "saving_throw_disadvantage" }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Save-affecting Metamagic is not supported for Sleep target admission because Sleep uses a two-stage admission and repeat-save lifecycle.",
    });
  });
});

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(`Expected Right, got ${JSON.stringify(result.left)}`);
  }
  return result.right;
}

function metamagicBattle(input?: {
  readonly sorceryPoints?: number;
  readonly knownOptions?: readonly MetamagicOptionFixture[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-quickened"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        side: partySide,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(input?.sorceryPoints ?? 4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input?.knownOptions ?? [
            quickenedMetamagicOption(),
            empoweredMetamagicOption(),
          ],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("cure_wounds")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Wounded Ally",
        initiative: 10,
        side: partySide,
        currentHp: 4,
        maxHp: 20,
      }),
    ],
  });
}

function saveMetamagicBattle(input: {
  readonly knownOptions: readonly MetamagicOptionFixture[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-save"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        side: partySide,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        currentHp: 18,
        maxHp: 18,
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input.knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Nearby Ally",
        initiative: 12,
        side: partySide,
        currentHp: 12,
        maxHp: 20,
      }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 10,
      }),
    ],
  });
}

function commandMetamagicBattle(input: {
  readonly knownOptions: readonly MetamagicOptionFixture[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-command"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        side: partySide,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        currentHp: 18,
        maxHp: 18,
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input.knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("command")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Nearby Ally",
        initiative: 12,
        side: partySide,
        currentHp: 12,
        maxHp: 20,
      }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 10,
      }),
    ],
  });
}

function gustOfWindMetamagicBattle(input: {
  readonly knownOptions: readonly MetamagicOptionFixture[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-gust-of-wind"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        side: partySide,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        currentHp: 18,
        maxHp: 18,
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input.knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("gust_of_wind")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 10,
      }),
    ],
  });
}

function sleepMetamagicBattle(input: {
  readonly knownOptions: readonly MetamagicOptionFixture[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-sleep"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        side: partySide,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        currentHp: 18,
        maxHp: 18,
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input.knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 10,
      }),
    ],
  });
}

type MetamagicOptionFixture = CharacterBattleMetamagicOptionFact;

function quickenedMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: QUICKENED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

function empoweredMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: "damage_dice_reroll",
    stackingMode: "can_combine_with_different_metamagic",
    sorceryPointCost: resourceCount(1),
  };
}

function heightenedMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: "saving_throw_disadvantage",
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

function carefulMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: "saving_throw_protection",
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function distantMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: DISTANT_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function extendedMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: EXTENDED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function subtleMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: SUBTLE_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function cureWoundsActionSubject(): Extract<
  AvailableBattleAct["subject"],
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: wizardId,
    invocation: spellSlotInvocationRef(
      "cure_wounds",
      1,
      "directHitPointRestoration",
    ),
    mode: { tag: "cast" },
  };
}

function quickenedCureWoundsSubject(): QuickenedBonusActionSpellAct["subject"] {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    invocation: spellSlotInvocationRef(
      "cure_wounds",
      1,
      "directHitPointRestoration",
    ),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

function hasQuickenedCureWoundsAct(state: BattleState): boolean {
  return discoverBattleActs(state).some(isQuickenedCureWoundsAct);
}

type QuickenedBonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { tag: "bonusActionSpell" }
  >;
};

function isQuickenedCureWoundsAct(
  candidate: AvailableBattleAct,
): candidate is QuickenedBonusActionSpellAct {
  return (
    candidate.subject.tag === "bonusActionSpell" &&
    candidate.subject.invocation.spellId === "cure_wounds" &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedCureWoundsAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(isQuickenedCureWoundsAct);
  if (act === undefined) {
    throw new Error("Expected Quickened Cure Wounds act.");
  }
  return act;
}

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { tag: "actionSpell" }
  >;
};

function heightenedBurningHandsAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === "burning_hands" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === "saving_throw_disadvantage",
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Burning Hands act.");
  }
  return act;
}

function carefulBurningHandsAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === "burning_hands" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === "saving_throw_protection",
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Careful Burning Hands act.");
  }
  return act;
}

function carefulCommandAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === "command" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === "saving_throw_protection",
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Careful Command act.");
  }
  return act;
}

function gustOfWindActionAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === "gust_of_wind" &&
      candidate.subject.metamagic === undefined,
  );
  if (act === undefined) {
    throw new Error("Expected Gust of Wind action spell act.");
  }
  return act;
}

function readyBurningHandsAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === "burning_hands" &&
      candidate.subject.mode.tag === "ready",
  );
  if (act === undefined) {
    throw new Error("Expected Ready Burning Hands act.");
  }
  return act;
}

function sleepActionAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === "sleep" &&
      candidate.subject.metamagic === undefined,
  );
  if (act === undefined) {
    throw new Error("Expected Sleep action spell act.");
  }
  return act;
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  spellId: "burning_hands" | "command",
  targetIds: readonly ReturnType<typeof combatantId>[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget" as const,
      casterId: wizardId,
      targetId,
      spellId,
    })),
  };
}

function requireSpellTargetListHole(
  holes: readonly BattleHole[],
  label: string,
): Extract<BattleHole, { readonly kind: "spellTargetList" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<BattleHole, { readonly kind: "spellTargetList" }> =>
      candidate.kind === "spellTargetList" && candidate.label === label,
  );
  if (hole === undefined) {
    throw new Error(`Expected spellTargetList hole ${label}.`);
  }
  return hole;
}

function resolveQuickenedCureWounds(
  state: BattleState,
  act: QuickenedBonusActionSpellAct,
) {
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, fighterId, [
    {
      kind: "spellTarget",
      casterId: wizardId,
      targetId: fighterId,
      spellId: "cure_wounds",
    },
  ]);
  const awaitingHealingRoll = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target],
  });
  const healingRoll = findHole(
    awaitingHealingRoll.tag === "needsHoles" ? awaitingHealingRoll.holes : [],
    "rolledDice",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target, damageRollFillWithGroups(healingRoll, [[4, 3]])],
    }),
  );
}

function sorceryPointsRemaining(state: BattleState) {
  const actor = state.combatants.get(wizardId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sorcerer combatant.");
  }
  const resource = actor.origin.resources.find(
    characterBattleResourceIsPointPool,
  );
  if (resource === undefined) {
    throw new Error("Expected Sorcery Point resource.");
  }
  return resource.pointsRemaining;
}
