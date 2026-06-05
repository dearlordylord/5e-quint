// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.metamagic-battle-resource-bridge unit-feature.metamagic-cast-governor-quickened unit-feature.metamagic-careful-save-protection unit-feature.metamagic-heightened-save-disadvantage unit-feature.metamagic-damage-type-substitution unit-feature.metamagic-effective-level-extra-target
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE

import {
  canSpendAction,
  spendActivationResource,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { resourceCount } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";
import type {
  BattleActiveEffect,
  BattleSpellTargetListHole,
} from "./battle-reducer.ts";
import {
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type CharacterBattleMetamagicOptionFact,
  characterBattleResourceIsPointPool,
  cantripSpellInvocationRef,
  discoverBattleActs,
  spendCharacterPointPoolResource,
  spellSlotInvocationRef,
  startBattle,
} from "./index.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  DISTANT_METAMAGIC_EFFECT_KIND,
  DISTANT_METAMAGIC_UNSUPPORTED_MESSAGE,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_UNSUPPORTED_MESSAGE,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  EXTENDED_METAMAGIC_UNSUPPORTED_MESSAGE,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
  SEEKING_METAMAGIC_EFFECT_KIND,
  SEEKING_METAMAGIC_UNSUPPORTED_MESSAGE,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  SUBTLE_METAMAGIC_UNSUPPORTED_MESSAGE,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TWINNED_METAMAGIC_EFFECT_KIND,
  twinnedSpellTargetCountInvocation,
} from "./battle-reducer/metamagic.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import {
  characterSeed,
  battleId,
  combatantId,
  attackRollFill,
  damageRollFillWithGroups,
  fighterId,
  findHole,
  partySide,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
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
                effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND,
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
          effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND,
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

  test("discovers Quickened action-casting scalar buff spells through the same Bonus Action rewrite", () => {
    const state = metamagicBattle({ preparedSpells: ["false_life"] });
    const act = quickenedFalseLifeAct(state);

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef("false_life", 1, "scalarBuff"),
      mode: { tag: "cast" },
      metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
    });

    const tempHpHole = findHole(act.initialHoles, "rolledDice");
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageRollFillWithGroups(tempHpHole, [[4, 3]])],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      resolved.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(resolved.state.combatants.get(wizardId)?.tempHp).toBe(11);
  });

  test("discovers Quickened save-gated damage spells as Bonus Action casts and preserves save damage", () => {
    const state = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const act = quickenedBurningHandsAct(state);

    expect(act.subject).toEqual(quickenedBurningHandsSubject());

    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [burningHandsSaveFill(act.initialHoles)],
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
          burningHandsSaveFill(act.initialHoles),
          damageRollFillWithGroups(damageHole, [[4, 3, 2]]),
        ],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      resolved.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(1);
  });

  test("discovers Quickened spell attacks as Bonus Action casts and preserves hit damage", () => {
    const state = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const act = quickenedRayOfFrostAct(state);

    expect(act.subject).toEqual(quickenedRayOfFrostSubject());

    const targetHole = findHole(act.initialHoles, "targetChoice");
    const target = targetFill(targetHole, skeletonId);
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target],
    });
    const attackRollHole = findHole(
      awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 15,
      naturalD20: 10,
    });
    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target, attackRoll],
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
          target,
          attackRoll,
          damageRollFillWithGroups(damageHole, [[4, 3]]),
        ],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      resolved.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(3);
  });

  test("discovers Quickened save-gated condition spells as Bonus Action casts", () => {
    const state = quickenedProfileBattle({
      preparedSpells: ["color_spray"],
      spellSlots: [{ spellLevel: 1, count: 2 }],
    });
    const act = quickenedSpellAct(state, "color_spray", "saveGatedCondition");
    const saveHole = findHole(act.initialHoles, "savingThrowOutcome");
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(saveHole, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      resolved.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    const target = resolved.state.combatants.get(skeletonId);
    if (target === undefined) {
      throw new Error("Expected Skeleton combatant.");
    }
    expect(hasCondition(target.conditions, "blinded")).toBe(true);
  });

  test("discovers Quickened save-gated condition-immunity spells as Bonus Action casts", () => {
    const state = quickenedProfileBattle({
      preparedSpells: ["calm_emotions"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = quickenedSpellAct(
      state,
      "calm_emotions",
      "saveGatedConditionImmunity",
    );
    const saveHole = findHole(act.initialHoles, "savingThrowOutcome");
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(saveHole, [
            { targetId: fighterId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(
      resolved.state.combatants
        .get(fighterId)
        ?.activeEffects.some((effect) => effect.kind === "conditionImmunity"),
    ).toBe(true);
  });

  test("discovers Quickened direct condition spells as Bonus Action casts", () => {
    const state = quickenedProfileBattle({
      preparedSpells: ["invisibility"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = quickenedSpellAct(state, "invisibility", "directCondition");
    const targetHole = findSpellTargetListHole(act.initialHoles);
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [spellTargetListFill(targetHole, "invisibility", [fighterId])],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(
      resolved.state.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "targetActionEndedSpellCondition",
        ),
    ).toBe(true);
  });

  test("discovers Quickened roll modifier spells as Bonus Action casts", () => {
    const state = quickenedProfileBattle({
      preparedSpells: ["bless"],
      spellSlots: [{ spellLevel: 1, count: 2 }],
    });
    const act = quickenedSpellAct(state, "bless", "rollModifier");
    const targetHole = findSpellTargetListHole(act.initialHoles);
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [spellTargetListFill(targetHole, "bless", [fighterId])],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(
      resolved.state.combatants
        .get(fighterId)
        ?.activeEffects.some((effect) => effect.kind === "d20RollModifier"),
    ).toBe(true);
  });

  test("blocks later level 1+ spells after Quickened cantrip spell attacks", () => {
    const state = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const act = quickenedRayOfFrostAct(state);
    const targetHole = findHole(act.initialHoles, "targetChoice");
    const target = targetFill(targetHole, skeletonId);
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target],
    });
    const attackRollHole = findHole(
      awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 15,
      naturalD20: 10,
    });
    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target, attackRoll],
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
          target,
          attackRoll,
          damageRollFillWithGroups(damageHole, [[4, 3]]),
        ],
      }),
    );

    expect(
      resolved.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(
      discoverBattleActs(resolved.state).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === "burning_hands",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: resolved.state,
        subject: burningHandsActionSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "This turn has already expended a Spell Slot.",
    });
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
  });

  test("spends Sorcery Points for Quickened spell attacks on a miss without opening damage", () => {
    const state = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const act = quickenedRayOfFrostAct(state);
    const targetHole = findHole(act.initialHoles, "targetChoice");
    const target = targetFill(targetHole, skeletonId);
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target],
    });
    const attackRollHole = findHole(
      awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
      "attackRoll",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          attackRollFill(attackRollHole, {
            total: 1,
            naturalD20: 1,
          }),
        ],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(10);
  });

  test("resolves Quickened spell attacks after the Magic action is already spent", () => {
    const state = magicActionSpent(
      saveMetamagicBattle({
        knownOptions: [quickenedMetamagicOption()],
      }),
    );
    const act = quickenedRayOfFrostAct(state);

    expect(canSpendAction(state.currentTurnResources, "magic")).toBe(false);
    expect(act.subject).toEqual(quickenedRayOfFrostSubject());

    const targetHole = findHole(act.initialHoles, "targetChoice");
    const target = targetFill(targetHole, skeletonId);
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target],
    });
    const attackRollHole = findHole(
      awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 15,
      naturalD20: 10,
    });
    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target, attackRoll],
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
          target,
          attackRoll,
          damageRollFillWithGroups(damageHole, [[4, 3]]),
        ],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(3);
  });

  test("preserves Quickened spell attack resources through Sanctuary retarget", () => {
    const state = withSanctuaryWard(
      saveMetamagicBattle({
        knownOptions: [quickenedMetamagicOption()],
      }),
      skeletonId,
    );
    const act = quickenedRayOfFrostAct(state);
    const targetHole = findHole(act.initialHoles, "targetChoice");
    const originalTarget = targetFill(targetHole, skeletonId);
    const needsSanctuary = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [originalTarget],
    });
    const sanctuaryHole = findHole(
      needsSanctuary.tag === "needsHoles" ? needsSanctuary.holes : [],
      "sanctuaryInterdictionOutcome",
    );
    const sanctuaryRetarget = sanctuaryRetargetFill(
      sanctuaryHole,
      fighterId,
      "ray_of_frost",
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [originalTarget, sanctuaryRetarget],
    });
    const attackRollHole = findHole(
      awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 15,
      naturalD20: 10,
    });
    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [originalTarget, sanctuaryRetarget, attackRoll],
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
          originalTarget,
          sanctuaryRetarget,
          attackRoll,
          damageRollFillWithGroups(damageHole, [[4, 3]]),
        ],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(10);
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(5);
  });

  test("preserves Quickened spell attack resources when Mirror Image duplicate is hit", () => {
    const state = withMirrorImageDuplicates(
      saveMetamagicBattle({
        knownOptions: [quickenedMetamagicOption()],
      }),
      skeletonId,
    );
    const act = quickenedRayOfFrostAct(state);
    const targetHole = findHole(act.initialHoles, "targetChoice");
    const target = targetFill(targetHole, skeletonId);
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target],
    });
    const attackRollHole = findHole(
      awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 15,
      naturalD20: 10,
    });
    const awaitingMirrorImage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target, attackRoll],
    });
    const mirrorImageHole = findHole(
      awaitingMirrorImage.tag === "needsHoles" ? awaitingMirrorImage.holes : [],
      "rolledDice",
    );
    if (!("mirrorImageDuplicateRoll" in mirrorImageHole)) {
      throw new Error("Expected Mirror Image duplicate roll hole.");
    }
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          attackRoll,
          damageRollFillWithGroups(mirrorImageHole, [[6, 6, 6]]),
        ],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(10);
    expect(mirrorImageDuplicatesRemaining(resolved.state, skeletonId)).toBe(2);
  });

  test("discovers and resolves Quickened action spells after the Magic action is already spent", () => {
    const state = metamagicBattle({
      preparedSpells: ["cure_wounds", "false_life"],
    });
    const afterMagicAction = magicActionSpent(state);

    expect(canSpendAction(afterMagicAction.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(
      afterMagicAction.currentTurnResources.levelOnePlusSpellCastsThisTurn,
    ).not.toContain(wizardId);

    const cureWounds = quickenedCureWoundsAct(afterMagicAction);
    const healed = resolveQuickenedCureWounds(afterMagicAction, cureWounds);
    expect(healed.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(canSpendAction(healed.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(sorceryPointsRemaining(healed.state)).toBe(resourceCount(2));

    const falseLife = quickenedFalseLifeAct(afterMagicAction);
    const tempHpHole = findHole(falseLife.initialHoles, "rolledDice");
    const buffed = requireResolved(
      resolveBattleSubject({
        state: afterMagicAction,
        subject: falseLife.subject,
        fills: [damageRollFillWithGroups(tempHpHole, [[4, 3]])],
      }),
    );
    expect(buffed.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(canSpendAction(buffed.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(sorceryPointsRemaining(buffed.state)).toBe(resourceCount(2));
    expect(buffed.state.combatants.get(wizardId)?.tempHp).toBe(11);
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
          metamagic: [{ effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Metamagic selection must be one of the actor's known Metamagic options.",
    });
  });

  test("requires known Metamagic and enough Sorcery Points for Quickened save-gated damage", () => {
    const unaffordable = saveMetamagicBattle({
      sorceryPoints: 1,
      knownOptions: [quickenedMetamagicOption()],
    });
    expect(hasQuickenedBurningHandsAct(unaffordable)).toBe(false);
    expect(
      resolveBattleSubject({
        state: unaffordable,
        subject: quickenedBurningHandsSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Metamagic requires enough unexpended Sorcery Points.",
    });

    const unknown = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    expect(
      resolveBattleSubject({
        state: unknown,
        subject: {
          ...quickenedBurningHandsSubject(),
          metamagic: [{ effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND }],
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
            { effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND },
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

  test("discovers Twinned target-count spells with the next effective target maximum", () => {
    const extraTargetId = combatantId("combatant:twinned-bless-extra-target");
    const state = twinnedTargetCountBattle(extraTargetId);
    const act = twinnedBlessAct(state);
    const targetHole = requireSpellTargetListHole(
      act.initialHoles,
      "Bless targets",
    );

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef("bless", 1, "rollModifier"),
      mode: { tag: "cast" },
      metamagic: [{ effectKind: TWINNED_METAMAGIC_EFFECT_KIND }],
    });
    expect(targetHole).toMatchObject({
      minTargets: 1,
      maxTargets: 4,
      choices: expect.arrayContaining([
        wizardId,
        fighterId,
        skeletonId,
        extraTargetId,
      ]),
    });

    const resolved = requireResolvedWithDetail(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(targetHole, "bless", [
            wizardId,
            fighterId,
            skeletonId,
            extraTargetId,
          ]),
        ],
      }),
    );

    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(3));
    expect(sorcererSpellSlots(resolved.state)).toEqual([
      { spellLevel: 1, count: 1, expended: 1 },
    ]);
    for (const targetId of [wizardId, fighterId, skeletonId, extraTargetId]) {
      expect(
        resolved.state.combatants
          .get(targetId)
          ?.activeEffects.some((effect) => effect.kind === "d20RollModifier"),
      ).toBe(true);
    }
  });

  test("rejects Twinned Spell for spells without one-additional-creature target scaling before Sorcery Point spending", () => {
    const state = metamagicBattle({
      knownOptions: [twinnedMetamagicOption()],
    });

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === "cure_wounds" &&
          candidate.subject.metamagic?.some(
            (selection) =>
              selection.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...cureWoundsActionSubject(),
          metamagic: [{ effectKind: TWINNED_METAMAGIC_EFFECT_KIND }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Twinned Spell is supported only for Spell Slot casts whose target-count profile adds exactly one creature at the next effective spell level.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("explicitly closes unsupported damage-shape Metamagic options before Sorcery Point spending", () => {
    const state = saveMetamagicBattle({
      knownOptions: [transmutedMetamagicOption(), twinnedMetamagicOption()],
    });

    for (const closure of [
      {
        effectKind: TWINNED_METAMAGIC_EFFECT_KIND,
        message:
          "Twinned Spell is supported only for Spell Slot casts whose target-count profile adds exactly one creature at the next effective spell level.",
      },
    ] as const) {
      expect(
        resolveBattleSubject({
          state,
          subject: {
            ...burningHandsActionSubject(),
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

  test("rejects Twinned Spell for repeated-effect target scaling before Sorcery Point spending", () => {
    const state = metamagicBattle({
      knownOptions: [twinnedMetamagicOption()],
      preparedSpells: ["magic_missile"],
    });

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === "magic_missile" &&
          candidate.subject.metamagic?.some(
            (selection) =>
              selection.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
          metamagic: [{ effectKind: TWINNED_METAMAGIC_EFFECT_KIND }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Twinned Spell is supported only for Spell Slot casts whose target-count profile adds exactly one creature at the next effective spell level.",
    });

    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("rejects Twinned Spell for non-creature-only target scaling before Sorcery Point spending", () => {
    const chainLightning = spellRecord("chain_lightning");
    if (
      chainLightning.mechanics.family !== "activation" ||
      chainLightning.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected Chain Lightning save-gate spell record.");
    }
    const chainTarget =
      chainLightning.mechanics.phases[0].attachment.kind === "hole"
        ? chainLightning.mechanics.phases[0].attachment.value
        : chainLightning.mechanics.phases[0].attachment;
    if (chainTarget.kind !== "target") {
      throw new Error("Expected Chain Lightning target selection.");
    }
    expect(chainTarget.selection).toMatchObject({
      mode: "choose_up_to",
      targetKinds: ["creature", "object"],
    });

    const state = twinnedTargetCountBattle(
      combatantId("combatant:twinned-non-creature-extra-target"),
    );
    const actor = state.combatants.get(wizardId);
    if (actor === undefined) {
      throw new Error("Expected Twinned Spell actor.");
    }
    const baseBlessInvocation = supportedSpellActs(actor, state).find(
      (invocation) =>
        invocation.spell.id === "bless" &&
        invocation.procedure === "rollModifier" &&
        invocation.resource.tag === "spellSlot" &&
        Number(invocation.resource.slotLevel) === 1,
    );
    if (baseBlessInvocation === undefined) {
      throw new Error("Expected base Bless invocation.");
    }
    const blessSpell = baseBlessInvocation.spell;
    if (blessSpell.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Bless ongoing-effect spell record.");
    }
    const blessAttachment = blessSpell.mechanics.attachment;
    if (
      blessAttachment.kind !== "hole" ||
      blessAttachment.value.kind !== "target"
    ) {
      throw new Error("Expected Bless target selection.");
    }
    const creatureOrObjectTargetScalingInvocation = {
      ...baseBlessInvocation,
      spell: {
        ...blessSpell,
        mechanics: {
          ...blessSpell.mechanics,
          attachment: {
            ...blessAttachment,
            value: {
              ...blessAttachment.value,
              selection: {
                ...blessAttachment.value.selection,
                targetKinds: ["creature", "object"] as const,
              },
            },
          },
        },
      },
    };

    expect(
      twinnedSpellTargetCountInvocation(
        creatureOrObjectTargetScalingInvocation,
        [twinnedMetamagicOption()],
      ),
    ).toBe(creatureOrObjectTargetScalingInvocation);

    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("rejects invalid Transmuted Spell damage substitutions before Sorcery Point spending", () => {
    const damageState = saveMetamagicBattle({
      knownOptions: [transmutedMetamagicOption()],
    });
    const restorationState = metamagicBattle({
      knownOptions: [transmutedMetamagicOption()],
    });

    for (const closure of [
      {
        state: damageState,
        subject: {
          ...burningHandsActionSubject(),
          metamagic: [
            {
              effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND,
              targetDamageType: "fire",
            },
          ],
        },
        message:
          "Transmuted Spell must change the source damage type to one of the other listed damage types.",
      },
      {
        state: damageState,
        subject: {
          ...burningHandsActionSubject(),
          metamagic: [{ effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND }],
        } as unknown as Extract<
          AvailableBattleAct["subject"],
          { readonly tag: "actionSpell" }
        >,
        message:
          "Transmuted Spell requires one selected replacement damage type.",
      },
      {
        state: damageState,
        subject: {
          ...burningHandsActionSubject(),
          metamagic: [
            {
              effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND,
              targetDamageType: "force",
            },
          ],
        } as unknown as Extract<
          AvailableBattleAct["subject"],
          { readonly tag: "actionSpell" }
        >,
        message:
          "Transmuted Spell requires one selected replacement damage type.",
      },
      {
        state: restorationState,
        subject: {
          ...cureWoundsActionSubject(),
          metamagic: [
            {
              effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND,
              targetDamageType: "fire",
            },
          ],
        },
        message:
          "Transmuted Spell is supported only for spell damage procedures with Acid, Cold, Fire, Lightning, Poison, or Thunder damage.",
      },
    ] as const) {
      expect(
        resolveBattleSubject({
          state: closure.state,
          subject: closure.subject,
          fills: [],
        }),
      ).toMatchObject({
        tag: "invalid",
        message: closure.message,
      });
    }

    expect(sorceryPointsRemaining(damageState)).toBe(resourceCount(4));
    expect(sorceryPointsRemaining(restorationState)).toBe(resourceCount(4));
  });

  test("threads Transmuted Spell through spell attack sequence resolution", () => {
    const state = saveMetamagicBattle({
      knownOptions: [transmutedMetamagicOption()],
      preparedSpells: ["scorching_ray"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = transmutedScorchingRayToPoisonAct(state);
    const targetFills = targetChoiceHoles(act.initialHoles).map((hole) =>
      targetFill(hole, fighterId, [
        {
          kind: "spellTarget",
          casterId: wizardId,
          targetId: fighterId,
          spellId: "scorching_ray",
        },
      ]),
    );
    const fills: BattleFill[] = [...targetFills];

    const firstAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
    fills.push(attackRollFill(firstAttack, { total: 15, naturalD20: 10 }));
    const firstDamage = nextSpellHole(state, act.subject, fills, "rolledDice");
    assertTransmutedDamageHole(firstDamage);
    fills.push(damageRollFillWithGroups(firstDamage, [[1, 1]]));

    const secondAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
    fills.push(attackRollFill(secondAttack, { total: 15, naturalD20: 10 }));
    const secondDamage = nextSpellHole(state, act.subject, fills, "rolledDice");
    assertTransmutedDamageHole(secondDamage);
    fills.push(damageRollFillWithGroups(secondDamage, [[1, 1]]));

    const thirdAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
    fills.push(attackRollFill(thirdAttack, { total: 15, naturalD20: 10 }));
    const thirdDamage = nextSpellHole(state, act.subject, fills, "rolledDice");
    assertTransmutedDamageHole(thirdDamage);
    fills.push(damageRollFillWithGroups(thirdDamage, [[1, 1]]));

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills,
      }),
    ).state;

    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(3));
  });

  test("explicitly closes reroll Metamagic options before Sorcery Point spending", () => {
    const state = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption(), seekingMetamagicOption()],
    });

    for (const closure of [
      {
        subject: burningHandsActionSubject(),
        effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
        message: EMPOWERED_METAMAGIC_UNSUPPORTED_MESSAGE,
      },
      {
        subject: rayOfFrostActionSubject(),
        effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
        message: SEEKING_METAMAGIC_UNSUPPORTED_MESSAGE,
      },
    ] as const) {
      expect(
        resolveBattleSubject({
          state,
          subject: {
            ...closure.subject,
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

  test("blocks Quickened spells after this turn has already cast a level 1+ spell", () => {
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
        "Quickened Spell cannot modify a spell after this turn has already cast a level 1+ spell.",
    });

    const spellAttackState = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const spellAttackAfterPriorFreeSpell: BattleState = {
      ...spellAttackState,
      currentTurnResources: {
        ...spellAttackState.currentTurnResources,
        levelOnePlusSpellCastsThisTurn: [wizardId],
      },
    };
    expect(hasQuickenedRayOfFrostAct(spellAttackAfterPriorFreeSpell)).toBe(
      false,
    );
    expect(
      resolveBattleSubject({
        state: spellAttackAfterPriorFreeSpell,
        subject: quickenedRayOfFrostSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Quickened Spell cannot modify a spell after this turn has already cast a level 1+ spell.",
    });
    expect(sorceryPointsRemaining(spellAttackAfterPriorFreeSpell)).toBe(
      resourceCount(4),
    );
  });

  test("rejects Quickened non-action spells before Sorcery Point spending", () => {
    const state = metamagicBattle({
      preparedSpells: ["healing_word"],
      knownOptions: [quickenedMetamagicOption()],
    });

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "healing_word",
            1,
            "directHitPointRestoration",
          ),
          mode: { tag: "cast" },
          metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Quickened Spell can modify only spells with a casting time of an action.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("rejects Quickened reaction save-gated damage before Sorcery Point spending", () => {
    const state = metamagicBattle({
      preparedSpells: ["hellish_rebuke"],
      knownOptions: [quickenedMetamagicOption()],
    });

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          candidate.subject.invocation.spellId === "hellish_rebuke" &&
          candidate.subject.metamagic?.some(
            (selection) =>
              selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "hellish_rebuke",
            1,
            "saveGatedDamage",
          ),
          mode: { tag: "cast" },
          metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Quickened Spell can modify only spells with a casting time of an action.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("rejects Quickened save-gated damage after the Bonus Action is spent", () => {
    const state = bonusActionSpent(
      saveMetamagicBattle({
        knownOptions: [quickenedMetamagicOption()],
      }),
    );

    expect(hasQuickenedBurningHandsAct(state)).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: quickenedBurningHandsSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Bonus Action spell is no longer available for the current actor.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("rejects Quickened spell attacks after the Bonus Action is spent", () => {
    const state = bonusActionSpent(
      saveMetamagicBattle({
        knownOptions: [quickenedMetamagicOption()],
      }),
    );

    expect(hasQuickenedRayOfFrostAct(state)).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: quickenedRayOfFrostSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Bonus Action spell is no longer available for the current actor.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
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
    expect(
      saveHole.targetRollModes.some(
        (projection) => projection.targetId === fighterId,
      ),
    ).toBe(false);

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

  test("Heightened Spell rejects a disadvantaged target outside the affected spell targets", () => {
    const state = saveMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const act = heightenedBurningHandsAct(state);
    const heightenedHole = findHole(act.initialHoles, "targetChoice");
    const heightenedTarget = targetFill(heightenedHole, fighterId);
    const awaitingSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [heightenedTarget],
    });
    const saveHole = findHole(
      awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
      "savingThrowOutcome",
    );

    expect(
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
                affectedTargetIds: [skeletonId],
              },
              outcomes: [{ targetId: skeletonId, succeeded: true }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Heightened Spell disadvantaged target must be one affected target from the selected spell.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
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

  test("Careful Spell rejects protected-target over-selection", () => {
    const state = saveMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const act = carefulBurningHandsAct(state);
    const protectedTargetsHole = findHole(act.initialHoles, "spellTargetList");
    const protectedTargetsFill = {
      kind: "spellTargetList" as const,
      holeId: protectedTargetsHole.holeId,
      value: {
        targetIds: [
          fighterId,
          skeletonId,
          combatantId("combatant:careful-extra-target-a"),
          combatantId("combatant:careful-extra-target-b"),
        ],
      },
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

    expect(
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
                { targetId: skeletonId, succeeded: true },
              ],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Careful Spell protected target count must be between one and the caster's spellcasting ability modifier.",
    });
  });

  test("Careful Spell rejects explicitly empty protected-target selections before spending resources", () => {
    const state = saveMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const act = carefulBurningHandsAct(state);
    const protectedTargetsHole = findHole(act.initialHoles, "spellTargetList");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "spellTargetList",
          holeId: protectedTargetsHole.holeId,
          value: { targetIds: [] },
          spatialFacts: [],
        },
      ],
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      message:
        "Careful Spell protected target count must be between one and the caster's spellcasting ability modifier.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("Careful Spell requires enough unexpended Sorcery Points", () => {
    const state = saveMetamagicBattle({
      sorceryPoints: 0,
      knownOptions: [carefulMetamagicOption()],
    });

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === "burning_hands" &&
          candidate.subject.metamagic?.some(
            (selection) =>
              selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...burningHandsActionSubject(),
          metamagic: [{ effectKind: CAREFUL_METAMAGIC_EFFECT_KIND }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Metamagic requires enough unexpended Sorcery Points.",
    });
  });

  test("Careful Spell rejects non-save spell procedures", () => {
    const state = metamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === "cure_wounds" &&
          candidate.subject.metamagic?.some(
            (selection) =>
              selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...cureWoundsActionSubject(),
          metamagic: [{ effectKind: CAREFUL_METAMAGIC_EFFECT_KIND }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Selected Metamagic option effect is not supported for this spell procedure.",
    });
  });

  test("Careful Spell is explicitly closed for unsupported save-affecting spell lifecycles", () => {
    const state = sleepMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const sleepAct = sleepActionAct(state);

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === "sleep" &&
          candidate.subject.metamagic?.some(
            (selection) =>
              selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...sleepAct.subject,
          metamagic: [{ effectKind: CAREFUL_METAMAGIC_EFFECT_KIND }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Save-affecting Metamagic is not supported for Sleep target admission because Sleep uses a two-stage admission and repeat-save lifecycle.",
    });
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
            (selection) =>
              selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...act.subject,
          metamagic: [{ effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND }],
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
          metamagic: [{ effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND }],
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
            (selection) =>
              selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
          ) === true,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...sleepAct.subject,
          metamagic: [{ effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND }],
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

function magicActionSpent(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: expectRight(
      spendAction(state.currentTurnResources, "magic"),
    ),
  };
}

function bonusActionSpent(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: expectRight(
      spendActivationResource(state.currentTurnResources, {
        kind: "bonusAction",
      }),
    ),
  };
}

function withSanctuaryWard(
  state: BattleState,
  wardedId: ReturnType<typeof combatantId>,
): BattleState {
  return withActiveEffect(state, wardedId, {
    kind: "sanctuaryWard",
    sourceSpellId: spellRecord("sanctuary").id,
    sourceCombatantId: wizardId,
    save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
  });
}

function withMirrorImageDuplicates(
  state: BattleState,
  targetId: ReturnType<typeof combatantId>,
): BattleState {
  return withActiveEffect(state, targetId, {
    kind: "mirrorImageDuplicates",
    sourceSpellId: spellRecord("mirror_image").id,
    sourceCombatantId: targetId,
    remainingDuplicates: 3,
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
  });
}

function withActiveEffect(
  state: BattleState,
  targetId: ReturnType<typeof combatantId>,
  effect: BattleActiveEffect,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    throw new Error("Expected active-effect target combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [...target.activeEffects, effect],
    }),
  };
}

function sanctuaryRetargetFill(
  hole: BattleHole,
  targetId: ReturnType<typeof combatantId>,
  spellId: "ray_of_frost",
): Extract<BattleFill, { readonly kind: "sanctuaryInterdictionOutcome" }> {
  if (hole.kind !== "sanctuaryInterdictionOutcome") {
    throw new Error("Expected Sanctuary interdiction outcome hole.");
  }
  return {
    kind: "sanctuaryInterdictionOutcome",
    holeId: hole.holeId,
    value: {
      saveSucceeded: false,
      outcome: {
        kind: "newTarget",
        targetId,
        spatialFacts: [
          { kind: "spellTarget", casterId: wizardId, targetId, spellId },
        ],
      },
    },
  };
}

function mirrorImageDuplicatesRemaining(
  state: BattleState,
  targetId: ReturnType<typeof combatantId>,
): number | null {
  const target = state.combatants.get(targetId);
  const effect = target?.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "mirrorImageDuplicates" }
    > => candidate.kind === "mirrorImageDuplicates",
  );
  return effect?.remainingDuplicates ?? null;
}

function metamagicBattle(input?: {
  readonly sorceryPoints?: number;
  readonly knownOptions?: readonly MetamagicOptionFixture[];
  readonly preparedSpells?: readonly (
    | "cure_wounds"
    | "false_life"
    | "healing_word"
    | "hellish_rebuke"
    | "magic_missile"
  )[];
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
            preparedSpells: (input?.preparedSpells ?? ["cure_wounds"]).map(
              spellRecord,
            ),
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
  readonly sorceryPoints?: number;
  readonly knownOptions: readonly MetamagicOptionFixture[];
  readonly preparedSpells?: readonly ("burning_hands" | "scorching_ray")[];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2;
    readonly count: number;
  }[];
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
            pointsRemaining: resourceCount(input.sorceryPoints ?? 4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input.knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: (input.preparedSpells ?? ["burning_hands"]).map(
              spellRecord,
            ),
            spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
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

function quickenedProfileBattle(input: {
  readonly preparedSpells: readonly (
    | "bless"
    | "calm_emotions"
    | "color_spray"
    | "invisibility"
  )[];
  readonly spellSlots: readonly {
    readonly spellLevel: 1 | 2;
    readonly count: number;
  }[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-quickened-profiles"),
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
          knownOptions: [quickenedMetamagicOption()],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: input.preparedSpells.map(spellRecord),
            spellSlots: input.spellSlots,
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

function twinnedTargetCountBattle(
  extraTargetId: ReturnType<typeof combatantId>,
): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-twinned-target-count"),
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
          knownOptions: [twinnedMetamagicOption()],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("bless")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
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
      statBlockCreatureInit({
        combatantId: extraTargetId,
        displayName: "Extra Target",
        initiative: 9,
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
    effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
    stackingMode: "can_combine_with_different_metamagic",
    sorceryPointCost: resourceCount(1),
  };
}

function seekingMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
    stackingMode: "can_combine_with_different_metamagic",
    sorceryPointCost: resourceCount(1),
  };
}

function heightenedMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

function carefulMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: CAREFUL_METAMAGIC_EFFECT_KIND,
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

function transmutedMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function twinnedMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: TWINNED_METAMAGIC_EFFECT_KIND,
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

function burningHandsActionSubject(): Extract<
  AvailableBattleAct["subject"],
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: wizardId,
    invocation: spellSlotInvocationRef("burning_hands", 1, "saveGatedDamage"),
    mode: { tag: "cast" },
  };
}

function rayOfFrostActionSubject(): Extract<
  AvailableBattleAct["subject"],
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: wizardId,
    invocation: cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    mode: { tag: "cast" },
  };
}

function transmutedScorchingRayToPoisonAct(
  state: BattleState,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        { readonly tag: "actionSpell" }
      >;
    } =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "spellAttackSequence" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND &&
          selection.targetDamageType === "poison",
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Transmuted Scorching Ray to Poison act.");
  }
  return act;
}

function targetChoiceHoles(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "targetChoice" }>[] {
  return holes.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );
}

function nextSpellHole(
  state: BattleState,
  subject: AvailableBattleAct["subject"],
  fills: readonly BattleFill[],
  kind: BattleHole["kind"],
): BattleHole {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    const detail = "message" in result ? `: ${result.message}` : "";
    throw new Error(`Expected ${kind} spell hole, got ${result.tag}${detail}.`);
  }
  return findHole(result.holes, kind);
}

function assertTransmutedDamageHole(damageHole: BattleHole): void {
  if (
    damageHole.kind !== "rolledDice" ||
    !("spell" in damageHole) ||
    !("damage" in damageHole.spell) ||
    !("damageType" in damageHole.spell.damage) ||
    damageHole.spell.damage.damageType !== "poison"
  ) {
    throw new Error("Expected Transmuted Spell damage hole to use Poison.");
  }
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

function quickenedBurningHandsSubject(): QuickenedBonusActionSpellAct["subject"] {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    invocation: spellSlotInvocationRef("burning_hands", 1, "saveGatedDamage"),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

function quickenedRayOfFrostSubject(): QuickenedBonusActionSpellAct["subject"] {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    invocation: cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

function hasQuickenedCureWoundsAct(state: BattleState): boolean {
  return discoverBattleActs(state).some(isQuickenedCureWoundsAct);
}

function hasQuickenedBurningHandsAct(state: BattleState): boolean {
  return discoverBattleActs(state).some(isQuickenedBurningHandsAct);
}

function hasQuickenedRayOfFrostAct(state: BattleState): boolean {
  return discoverBattleActs(state).some(isQuickenedRayOfFrostAct);
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

function quickenedFalseLifeAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === "false_life" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Quickened False Life act.");
  }
  return act;
}

function isQuickenedBurningHandsAct(
  candidate: AvailableBattleAct,
): candidate is QuickenedBonusActionSpellAct {
  return (
    candidate.subject.tag === "bonusActionSpell" &&
    candidate.subject.invocation.spellId === "burning_hands" &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedBurningHandsAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(isQuickenedBurningHandsAct);
  if (act === undefined) {
    throw new Error("Expected Quickened Burning Hands act.");
  }
  return act;
}

function isQuickenedRayOfFrostAct(
  candidate: AvailableBattleAct,
): candidate is QuickenedBonusActionSpellAct {
  return (
    candidate.subject.tag === "bonusActionSpell" &&
    candidate.subject.invocation.spellId === "ray_of_frost" &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedRayOfFrostAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(isQuickenedRayOfFrostAct);
  if (act === undefined) {
    throw new Error("Expected Quickened Ray of Frost act.");
  }
  return act;
}

function quickenedSpellAct(
  state: BattleState,
  spellId: "bless" | "calm_emotions" | "color_spray" | "invisibility",
  procedure: QuickenedBonusActionSpellAct["subject"]["invocation"]["procedure"],
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === spellId &&
      candidate.subject.invocation.procedure === procedure &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error(`Expected Quickened ${spellId} act.`);
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
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
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
        (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
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
        (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Careful Command act.");
  }
  return act;
}

function twinnedBlessAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === "bless" &&
      candidate.subject.invocation.procedure === "rollModifier" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Twinned Bless act.");
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

function findSpellTargetListHole(
  holes: readonly BattleHole[],
): BattleSpellTargetListHole {
  const hole = findHole(holes, "spellTargetList");
  if (hole.kind !== "spellTargetList") {
    throw new Error("Expected spellTargetList hole.");
  }
  return hole;
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  spellId: "bless" | "burning_hands" | "command" | "invisibility",
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

function burningHandsSaveFill(
  holes: readonly BattleHole[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const savingThrow = findHole(holes, "savingThrowOutcome");
  return {
    kind: "savingThrowOutcome",
    holeId: savingThrow.holeId,
    value: {
      area: {
        originAnchorId: wizardId,
        affectedTargetIds: [skeletonId],
      },
      outcomes: [{ targetId: skeletonId, succeeded: false }],
    },
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

function requireResolvedWithDetail(
  result: ReturnType<typeof resolveBattleSubject>,
) {
  if (result.tag !== "resolved") {
    const detail = "message" in result ? `: ${result.message}` : "";
    throw new Error(
      `Expected resolved battle result, got ${result.tag}${detail}.`,
    );
  }
  return result;
}

function sorcererSpellSlots(state: BattleState) {
  const actor = state.combatants.get(wizardId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sorcerer combatant.");
  }
  return actor.origin.spellcasting?.spellSlots;
}
