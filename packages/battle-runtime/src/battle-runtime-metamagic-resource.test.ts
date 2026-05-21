// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.metamagic-battle-resource-bridge unit-feature.metamagic-cast-governor-quickened

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { resourceCount } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";
import {
  type AvailableBattleAct,
  type BattleState,
  type CharacterBattleMetamagicOptionFact,
  characterBattleResourceIsPointPool,
  discoverBattleActs,
  spendCharacterPointPoolResource,
  spellSlotInvocationRef,
  startBattle,
} from "./index.ts";
import {
  QUICKENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
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
