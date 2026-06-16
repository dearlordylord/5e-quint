// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.metamagic-battle-resource-bridge unit-feature.metamagic-cast-governor-quickened unit-feature.metamagic-careful-save-protection unit-feature.metamagic-heightened-save-disadvantage unit-feature.metamagic-damage-type-substitution unit-feature.metamagic-effective-level-extra-target unit-feature.metamagic-cast-component-suppression unit-feature.metamagic-missed-spell-attack-reroll unit-feature.metamagic-damage-dice-reroll
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L14G-D03-SORCERER-METAMAGIC-PARTIAL-PROFILE sorcerer_metamagic
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL

import {
  canSpendAction,
  spendActivationResource,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  abilityModifier,
  DieRollResult,
  resourceCount,
} from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";
import type {
  BattleActiveEffect,
  BattleSpellTargetListHole,
  SupportedSpellInvocation,
} from "./battle-reducer.ts";
import {
  EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE,
  SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE,
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
  admitSpellMetamagicApplications,
  CAREFUL_METAMAGIC_EFFECT_KIND,
  DISTANT_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_UNSUPPORTED_MESSAGE,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
  SEEKING_METAMAGIC_EFFECT_KIND,
  SEEKING_METAMAGIC_UNSUPPORTED_MESSAGE,
  subtleSpellComponentProjectionForApplications,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TWINNED_METAMAGIC_EFFECT_KIND,
  twinnedSpellTargetCountInvocation,
} from "./battle-reducer/metamagic.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { spellId } from "./identity.ts";
import {
  characterSeed,
  battleId,
  combatantId,
  attackRollFill,
  damageRollFillWithGroups,
  fighterVsGoblinBattle,
  fighterId,
  findHole,
  goblinId,
  partySide,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  skeletonId,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
  spellRecord,
  testDaggerAttack,
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

  test("resolves Quickened Eldritch Blast attack sequences after the Magic action is already spent", () => {
    const state = magicActionSpent(
      saveMetamagicBattle({
        knownOptions: [quickenedMetamagicOption()],
        cantrips: ["eldritch_blast"],
      }),
    );
    const act = quickenedEldritchBlastAct(state);

    expect(canSpendAction(state.currentTurnResources, "magic")).toBe(false);
    expect(act.subject).toEqual(quickenedEldritchBlastSubject());

    const resolved = resolveQuickenedEldritchBlast(state);

    expect(resolved.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(canSpendAction(resolved.currentTurnResources, "magic")).toBe(false);
    expect(
      resolved.currentTurnResources.quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(2));
    expect(resolved.combatants.get(skeletonId)?.hp).toBe(6);
  });

  test("blocks later level 1+ spells after Quickened Eldritch Blast attack sequences", () => {
    const state = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
      cantrips: ["eldritch_blast"],
    });

    const resolved = resolveQuickenedEldritchBlast(state);

    expect(
      resolved.currentTurnResources.quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(
      discoverBattleActs(resolved).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === "burning_hands",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: resolved,
        subject: burningHandsActionSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "This turn has already expended a Spell Slot.",
    });
    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(2));
  });

  test("spends spell slots for Quickened Scorching Ray attack sequences", () => {
    const state = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
      preparedSpells: ["scorching_ray"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = quickenedScorchingRayAct(state);
    const resolved = resolveQuickenedScorchingRay(state, act);
    const caster = resolved.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected Sorcerer character combatant.");
    }

    expect(act.subject).toEqual(quickenedScorchingRaySubject());
    expect(resolved.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(canSpendAction(resolved.currentTurnResources, "magic")).toBe(true);
    expect(
      resolved.currentTurnResources.levelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(
      resolved.currentTurnResources.quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(2));
    expect(resolved.combatants.get(skeletonId)?.hp).toBe(4);
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

  test("preserves Quickened spell attack sequence resources through Sanctuary retarget", () => {
    const state = withSanctuaryWard(
      saveMetamagicBattle({
        knownOptions: [quickenedMetamagicOption()],
        cantrips: ["eldritch_blast"],
      }),
      skeletonId,
    );
    const act = quickenedEldritchBlastAct(state);
    const targetHoles = targetChoiceHoles(act.initialHoles);
    const originalTarget = spellAttackSequenceTargetFill(
      targetHoles[0]!,
      skeletonId,
      "eldritch_blast",
    );
    const secondTarget = spellAttackSequenceTargetFill(
      targetHoles[1]!,
      fighterId,
      "eldritch_blast",
    );
    const needsSanctuary = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [originalTarget, secondTarget],
    });
    const sanctuaryHole = findHole(
      needsSanctuary.tag === "needsHoles" ? needsSanctuary.holes : [],
      "sanctuaryInterdictionOutcome",
    );
    const sanctuaryRetarget = sanctuaryRetargetFill(
      sanctuaryHole,
      fighterId,
      "eldritch_blast",
    );
    const fills: BattleFill[] = [
      originalTarget,
      secondTarget,
      sanctuaryRetarget,
    ];

    const firstAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
    fills.push(attackRollFill(firstAttack, { total: 15, naturalD20: 10 }));
    const firstDamage = nextSpellHole(state, act.subject, fills, "rolledDice");
    fills.push(damageRollFillWithGroups(firstDamage, [[4]]));
    const secondAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
    fills.push(attackRollFill(secondAttack, { total: 1, naturalD20: 1 }));
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills,
      }),
    ).state;

    expect(resolved.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(canSpendAction(resolved.currentTurnResources, "magic")).toBe(true);
    expect(
      resolved.currentTurnResources.quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(2));
    expect(resolved.combatants.get(skeletonId)?.hp).toBe(10);
    expect(resolved.combatants.get(fighterId)?.hp).toBe(8);
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

  test("explicitly closes unpromoted cast-property Metamagic options before Sorcery Point spending", () => {
    const state = metamagicBattle({
      knownOptions: [distantMetamagicOption(), extendedMetamagicOption()],
    });

    for (const closure of [
      {
        effectKind: DISTANT_METAMAGIC_EFFECT_KIND,
        message:
          "Distant Spell is supported only for spell target procedures that consume a cast-local range fact.",
      },
      {
        effectKind: EXTENDED_METAMAGIC_EFFECT_KIND,
        message:
          "Extended Spell is supported only for spells with a timed or Concentration duration of at least 1 minute.",
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

  test("projects selected Subtle Spell components at the Spell Invocation boundary", () => {
    const state = metamagicBattle({
      knownOptions: [subtleMetamagicOption()],
      preparedSpells: [
        "cure_wounds",
        "false_life",
        "chromatic_orb",
        "protection_from_evil_and_good",
      ],
    });

    const cureWounds = supportedInvocationFor(
      state,
      "cure_wounds",
      "directHitPointRestoration",
    );
    expect(
      admittedSubtleProjection(state, cureWounds, "directHitPointRestoration"),
    ).toEqual({
      suppressedComponents: [{ kind: "verbal" }, { kind: "somatic" }],
      preservedComponents: [],
    });

    const falseLife = supportedInvocationFor(state, "false_life", "scalarBuff");
    const falseLifeComponents = falseLife.spell.mechanics.components;
    expect(admittedSubtleProjection(state, falseLife, "scalarBuff")).toEqual({
      suppressedComponents: [
        { kind: "verbal" },
        { kind: "somatic" },
        { kind: "material" },
      ],
      preservedComponents: [],
    });
    expect(falseLife.spell.mechanics.components).toEqual(falseLifeComponents);

    const chromaticOrb = supportedInvocationFor(
      state,
      "chromatic_orb",
      "chainedSpellAttackDamage",
    );
    expect(
      admittedSubtleProjection(state, chromaticOrb, "chainedSpellAttackDamage"),
    ).toEqual({
      suppressedComponents: [{ kind: "verbal" }, { kind: "somatic" }],
      preservedComponents: [
        {
          kind: "material",
          material: {
            kind: "genericMaterial",
            material: "a diamond worth 50+ GP",
            preservation: { kind: "priced", costGp: 50 },
          },
        },
      ],
    });

    const protectionFromEvilAndGood = supportedInvocationFor(
      state,
      "protection_from_evil_and_good",
      "creatureTypeProtection",
    );
    expect(
      admittedSubtleProjection(
        state,
        protectionFromEvilAndGood,
        "creatureTypeProtection",
      ),
    ).toEqual({
      suppressedComponents: [{ kind: "verbal" }, { kind: "somatic" }],
      preservedComponents: [
        {
          kind: "material",
          material: {
            kind: "genericMaterial",
            material: "a flask of Holy Water",
            preservation: { kind: "consumed", costGp: 25 },
          },
        },
      ],
    });
  });

  test("keeps selected Subtle Spell out of payloadless Metamagic applications", () => {
    const state = metamagicBattle({
      knownOptions: [subtleMetamagicOption()],
      preparedSpells: ["cure_wounds"],
    });
    const actor = requireBattleCreature(state, wizardId);
    const cureWounds = supportedInvocationFor(
      state,
      "cure_wounds",
      "directHitPointRestoration",
    );

    expect(
      spellMetamagicApplications(actor, [
        { effectKind: SUBTLE_METAMAGIC_EFFECT_KIND },
      ]),
    ).toEqual([]);
    expect(
      admittedSubtleProjection(state, cureWounds, "directHitPointRestoration"),
    ).toEqual({
      suppressedComponents: [{ kind: "verbal" }, { kind: "somatic" }],
      preservedComponents: [],
    });
  });

  test("rejects Subtle Spell outside action-time spell casts before Sorcery Point spending", () => {
    const state = metamagicBattle({
      knownOptions: [subtleMetamagicOption()],
      preparedSpells: ["healing_word"],
    });
    const healingWord = supportedInvocationFor(
      state,
      "healing_word",
      "directHitPointRestoration",
    );
    const actor = requireBattleCreature(state, wizardId);

    expect(
      admitSpellMetamagicApplications({
        state,
        actor,
        actorId: wizardId,
        invocation: healingWord,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "healing_word",
            1,
            "directHitPointRestoration",
          ),
          mode: { tag: "cast" },
          metamagic: [{ effectKind: SUBTLE_METAMAGIC_EFFECT_KIND }],
        },
      }),
    ).toEqual({
      tag: "spellMetamagicAdmissionIssue",
      message: "Subtle Spell is supported only for action-time spell casts.",
    });
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

  test("Empowered Spell opens on Ray of Frost spell damage and spends only when replacement dice are used", () => {
    const state = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption()],
    });
    const act = actionRayOfFrostAct(state);
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      skeletonId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
    const attackRoll = attackRollFill(attack, { total: 15, naturalD20: 10 });
    const damage = nextSpellHole(
      state,
      act.subject,
      [target, attackRoll],
      "rolledDice",
    );
    expect(damage).toMatchObject({
      spellDamageRerolls: [
        {
          effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
          label: "Empowered Spell",
          sorceryPointCost: resourceCount(1),
          maximumSelectedDice: 3,
        },
      ],
    });

    const declined = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [target, attackRoll, damageRollFillWithGroups(damage, [[4, 3]])],
      }),
    ).state;
    expect(sorceryPointsRemaining(declined)).toBe(resourceCount(4));

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          attackRoll,
          empoweredDamageRollFill(damage, [[8, 8]], {
            kind: "reroll",
            effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
            dice: [
              {
                groupIndex: 0,
                resultIndex: 0,
                original: DieRollResult(8),
                replacement: DieRollResult(1),
              },
            ],
          }),
        ],
      }),
    ).state;

    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(3));
    expect(resolved.combatants.get(skeletonId)?.hp).toBe(1);
  });

  test("Empowered Spell stays closed for spell attack damage carrying marked riders", () => {
    const state = withActiveEffect(
      saveMetamagicBattle({
        knownOptions: [empoweredMetamagicOption()],
      }),
      wizardId,
      {
        kind: "spellMarkedDamageRider",
        sourceSpellId: spellRecord("hunters_mark").id,
        sourceCombatantId: wizardId,
        targetCombatantId: skeletonId,
        transfer: {
          kind: "awaitingTargetDrop",
          retargetTiming: "sameTurn",
        },
        abilityCheckBehavior: { kind: "none" },
        damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
        },
      },
    );
    const act = actionRayOfFrostAct(state);
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      skeletonId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
    const attackRoll = attackRollFill(attack, { total: 15, naturalD20: 10 });
    const damage = nextSpellHole(
      state,
      act.subject,
      [target, attackRoll],
      "rolledDice",
    );

    expect(damage).toMatchObject({
      spellMarkedDamageRiders: [
        expect.objectContaining({
          kind: "spellMarkedDamageRider",
          targetCombatantId: skeletonId,
        }),
      ],
    });
    expect(damage).not.toHaveProperty("spellDamageRerolls");
  });

  test("Empowered Spell damage reroll limit uses Charisma rather than the spellcasting modifier", () => {
    const state = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption()],
      d20Statistics: testCharacterD20Statistics({ cha: 12 }),
      spellcastingAbilityModifier: 3,
    });
    const act = actionRayOfFrostAct(state);
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      skeletonId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
    const attackRoll = attackRollFill(attack, { total: 15, naturalD20: 10 });
    const damage = nextSpellHole(
      state,
      act.subject,
      [target, attackRoll],
      "rolledDice",
    );
    expect(damage).toMatchObject({
      spellDamageRerolls: [
        {
          effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
          maximumSelectedDice: 1,
        },
      ],
    });

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          attackRoll,
          empoweredDamageRollFill(damage, [[4, 3]], {
            kind: "reroll",
            effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
            dice: [
              {
                groupIndex: 0,
                resultIndex: 0,
                original: DieRollResult(4),
                replacement: DieRollResult(8),
              },
              {
                groupIndex: 0,
                resultIndex: 1,
                original: DieRollResult(3),
                replacement: DieRollResult(8),
              },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Empowered Spell selected damage dice exceed the caster's Charisma modifier minimum-one limit.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("Empowered Spell can reroll damage after a different Metamagic option modified the spell", () => {
    const state = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption(), empoweredMetamagicOption()],
    });
    const act = quickenedRayOfFrostAct(state);
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      skeletonId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
    const attackRoll = attackRollFill(attack, { total: 15, naturalD20: 10 });
    const damage = nextSpellHole(
      state,
      act.subject,
      [target, attackRoll],
      "rolledDice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          attackRoll,
          empoweredDamageRollFill(damage, [[8, 8]], {
            kind: "reroll",
            effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
            dice: [
              {
                groupIndex: 0,
                resultIndex: 1,
                original: DieRollResult(8),
                replacement: DieRollResult(1),
              },
            ],
          }),
        ],
      }),
    ).state;

    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(1));
  });

  test("Empowered Spell damage reroll fill rejects unknown, unaffordable, mismatched, and over-limit selections before spending", () => {
    const cases = [
      {
        state: saveMetamagicBattle({
          knownOptions: [quickenedMetamagicOption()],
        }),
        attack: { total: 15, naturalD20: 10 },
        roll: [[4, 3]],
        rerolledDice: [
          {
            groupIndex: 0,
            resultIndex: 0,
            original: DieRollResult(4),
            replacement: DieRollResult(8),
          },
        ],
        expectedSorceryPoints: resourceCount(4),
        message:
          "Empowered Spell requires a character that knows Empowered Spell and has enough Sorcery Points.",
      },
      {
        state: saveMetamagicBattle({
          knownOptions: [empoweredMetamagicOption()],
          sorceryPoints: 0,
        }),
        attack: { total: 15, naturalD20: 10 },
        roll: [[4, 3]],
        rerolledDice: [
          {
            groupIndex: 0,
            resultIndex: 0,
            original: DieRollResult(4),
            replacement: DieRollResult(8),
          },
        ],
        expectedSorceryPoints: resourceCount(0),
        message:
          "Empowered Spell requires a character that knows Empowered Spell and has enough Sorcery Points.",
      },
      {
        state: saveMetamagicBattle({
          knownOptions: [empoweredMetamagicOption()],
        }),
        attack: { total: 15, naturalD20: 10 },
        roll: [[4, 3]],
        rerolledDice: [
          {
            groupIndex: 0,
            resultIndex: 0,
            original: DieRollResult(3),
            replacement: DieRollResult(8),
          },
        ],
        expectedSorceryPoints: resourceCount(4),
        message:
          "Empowered Spell selected original dice must match the pending spell damage roll.",
      },
      {
        state: saveMetamagicBattle({
          knownOptions: [empoweredMetamagicOption()],
        }),
        attack: { total: 20, naturalD20: 20 },
        roll: [[1, 2, 3, 4]],
        rerolledDice: [
          {
            groupIndex: 0,
            resultIndex: 0,
            original: DieRollResult(1),
            replacement: DieRollResult(8),
          },
          {
            groupIndex: 0,
            resultIndex: 1,
            original: DieRollResult(2),
            replacement: DieRollResult(8),
          },
          {
            groupIndex: 0,
            resultIndex: 2,
            original: DieRollResult(3),
            replacement: DieRollResult(8),
          },
          {
            groupIndex: 0,
            resultIndex: 3,
            original: DieRollResult(4),
            replacement: DieRollResult(8),
          },
        ],
        expectedSorceryPoints: resourceCount(4),
        message:
          "Empowered Spell selected damage dice exceed the caster's Charisma modifier minimum-one limit.",
      },
    ] as const;

    for (const entry of cases) {
      const act = actionRayOfFrostAct(entry.state);
      const target = targetFill(
        findHole(act.initialHoles, "targetChoice"),
        skeletonId,
      );
      const attack = nextSpellHole(
        entry.state,
        act.subject,
        [target],
        "attackRoll",
      );
      const attackRoll = attackRollFill(attack, entry.attack);
      const damage = nextSpellHole(
        entry.state,
        act.subject,
        [target, attackRoll],
        "rolledDice",
      );

      expect(
        resolveBattleSubject({
          state: entry.state,
          subject: act.subject,
          fills: [
            target,
            attackRoll,
            empoweredDamageRollFill(damage, entry.roll, {
              kind: "reroll",
              effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
              dice: entry.rerolledDice,
            }),
          ],
        }),
      ).toMatchObject({ tag: "invalid", message: entry.message });
      expect(sorceryPointsRemaining(entry.state)).toBe(
        entry.expectedSorceryPoints,
      );
    }
  });

  test("Empowered Spell stays closed for Scorching Ray attack sequences until invocation-local one-use accounting exists", () => {
    const state = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption()],
      preparedSpells: ["scorching_ray"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = actionScorchingRayAct(state);
    const fills: BattleFill[] = [];
    for (const target of targetChoiceHoles(act.initialHoles)) {
      fills.push(
        spellAttackSequenceTargetFill(target, skeletonId, "scorching_ray"),
      );
    }
    const attack = nextSpellHole(state, act.subject, fills, "attackRoll");
    const attackRoll = attackRollFill(attack, { total: 15, naturalD20: 10 });
    const damage = nextSpellHole(
      state,
      act.subject,
      [...fills, attackRoll],
      "rolledDice",
    );

    expect(damage).not.toHaveProperty("spellDamageRerolls");
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          ...fills,
          attackRoll,
          empoweredDamageRollFill(damage, [[4, 3]], {
            kind: "reroll",
            effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
            dice: [
              {
                groupIndex: 0,
                resultIndex: 0,
                original: DieRollResult(4),
                replacement: DieRollResult(8),
              },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE,
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("Seeking Spell opens after a missed Ray of Frost spell attack and spends only when the forced replacement roll is used", () => {
    const state = saveMetamagicBattle({
      knownOptions: [seekingMetamagicOption()],
    });
    const act = actionRayOfFrostAct(state);
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      skeletonId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
    const missedAttack = attackRollFill(attack, { total: 5, naturalD20: 2 });

    const awaitingSeeking = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target, missedAttack],
    });
    expect(awaitingSeeking.tag).toBe("needsHoles");
    const seekingHole = findHole(
      awaitingSeeking.tag === "needsHoles" ? awaitingSeeking.holes : [],
      "attackRoll",
    );
    expect(seekingHole).toMatchObject({
      spellAttackRerolls: [
        {
          effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
          label: "Seeking Spell",
          sorceryPointCost: resourceCount(1),
        },
      ],
    });
    const declined = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          attackRollFill(seekingHole, {
            total: 5,
            naturalD20: 2,
            spellAttackReroll: {
              kind: "decline",
              effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
            },
          }),
        ],
      }),
    ).state;
    expect(sorceryPointsRemaining(declined)).toBe(resourceCount(4));

    const rerolledAttack = attackRollFill(seekingHole, {
      total: 5,
      naturalD20: 2,
      spellAttackReroll: {
        kind: "reroll",
        effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
        replacement: { total: 15, naturalD20: DieRollResult(10) },
      },
    });
    const damage = nextSpellHole(
      state,
      act.subject,
      [target, rerolledAttack],
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          rerolledAttack,
          damageRollFillWithGroups(damage, [[4, 3]]),
        ],
      }),
    ).state;

    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(3));
  });

  test("Seeking Spell can reroll a miss after a different Metamagic option modified the spell", () => {
    const state = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption(), seekingMetamagicOption()],
    });
    const act = quickenedRayOfFrostAct(state);
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      skeletonId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
    const missedAttack = attackRollFill(attack, { total: 5, naturalD20: 2 });
    const seeking = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target, missedAttack],
    });
    const seekingHole = findHole(
      seeking.tag === "needsHoles" ? seeking.holes : [],
      "attackRoll",
    );
    const rerolledAttack = attackRollFill(seekingHole, {
      total: 5,
      naturalD20: 2,
      spellAttackReroll: {
        kind: "reroll",
        effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
        replacement: { total: 15, naturalD20: DieRollResult(10) },
      },
    });
    const damage = nextSpellHole(
      state,
      act.subject,
      [target, rerolledAttack],
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          rerolledAttack,
          damageRollFillWithGroups(damage, [[4, 3]]),
        ],
      }),
    ).state;

    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(1));
  });

  test("Seeking Spell does not open when a different Metamagic makes the combined Sorcery Point cost unaffordable", () => {
    const state = saveMetamagicBattle({
      sorceryPoints: 2,
      knownOptions: [quickenedMetamagicOption(), seekingMetamagicOption()],
    });
    const act = quickenedRayOfFrostAct(state);
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      skeletonId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
    const missedAttack = attackRollFill(attack, { total: 5, naturalD20: 2 });

    const resolvedMiss = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [target, missedAttack],
      }),
    ).state;
    expect(sorceryPointsRemaining(resolvedMiss)).toBe(resourceCount(0));

    const maliciousSeekingFill = attackRollFill(attack, {
      total: 5,
      naturalD20: 2,
      spellAttackReroll: {
        kind: "reroll",
        effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
        replacement: { total: 15, naturalD20: DieRollResult(10) },
      },
    });
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [target, maliciousSeekingFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Seeking Spell requires enough unexpended Sorcery Points for all Metamagic options used on this spell.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(2));
  });

  test("Seeking Spell replacement miss and natural 1 replacement miss are final after spending", () => {
    for (const replacement of [
      { total: 5, naturalD20: DieRollResult(2) },
      { total: 30, naturalD20: DieRollResult(1) },
    ] as const) {
      const state = saveMetamagicBattle({
        knownOptions: [seekingMetamagicOption()],
      });
      const act = actionRayOfFrostAct(state);
      const target = targetFill(
        findHole(act.initialHoles, "targetChoice"),
        skeletonId,
      );
      const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
      const missedAttack = attackRollFill(attack, {
        total: 5,
        naturalD20: 2,
      });
      const seeking = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [target, missedAttack],
      });
      const seekingHole = findHole(
        seeking.tag === "needsHoles" ? seeking.holes : [],
        "attackRoll",
      );
      const rerolledAttack = attackRollFill(seekingHole, {
        total: 5,
        naturalD20: 2,
        spellAttackReroll: {
          kind: "reroll",
          effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
          replacement,
        },
      });
      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [target, rerolledAttack],
        }),
      ).state;

      expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(3));
    }
  });

  test("Seeking Spell replacement critical opens a critical spell damage hole", () => {
    const state = saveMetamagicBattle({
      knownOptions: [seekingMetamagicOption()],
    });
    const act = actionRayOfFrostAct(state);
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      skeletonId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
    const missedAttack = attackRollFill(attack, { total: 5, naturalD20: 2 });
    const seeking = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target, missedAttack],
    });
    const seekingHole = findHole(
      seeking.tag === "needsHoles" ? seeking.holes : [],
      "attackRoll",
    );
    const rerolledAttack = attackRollFill(seekingHole, {
      total: 5,
      naturalD20: 2,
      spellAttackReroll: {
        kind: "reroll",
        effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
        replacement: { total: 20, naturalD20: DieRollResult(20) },
      },
    });
    const damage = nextSpellHole(
      state,
      act.subject,
      [target, rerolledAttack],
      "rolledDice",
    );

    expect(damage).toMatchObject({ kind: "rolledDice", critical: true });
  });

  test("Seeking Spell reroll fill rejects unknown, unaffordable, and non-missed spell attacks before spending", () => {
    const cases = [
      {
        state: saveMetamagicBattle({
          knownOptions: [quickenedMetamagicOption()],
        }),
        attack: { total: 5, naturalD20: 2 },
        expectedSorceryPoints: resourceCount(4),
        message:
          "Seeking Spell requires a character that knows Seeking Spell and has enough Sorcery Points.",
      },
      {
        state: saveMetamagicBattle({
          knownOptions: [seekingMetamagicOption()],
          sorceryPoints: 0,
        }),
        attack: { total: 5, naturalD20: 2 },
        expectedSorceryPoints: resourceCount(0),
        message:
          "Seeking Spell requires a character that knows Seeking Spell and has enough Sorcery Points.",
      },
      {
        state: saveMetamagicBattle({
          knownOptions: [seekingMetamagicOption()],
        }),
        attack: { total: 15, naturalD20: 10 },
        expectedSorceryPoints: resourceCount(4),
        message: "Seeking Spell can reroll only a missed spell attack roll.",
      },
    ] as const;

    for (const entry of cases) {
      const act = actionRayOfFrostAct(entry.state);
      const target = targetFill(
        findHole(act.initialHoles, "targetChoice"),
        skeletonId,
      );
      const attack = nextSpellHole(
        entry.state,
        act.subject,
        [target],
        "attackRoll",
      );
      const rerolledAttack = attackRollFill(attack, {
        total: entry.attack.total,
        naturalD20: entry.attack.naturalD20,
        spellAttackReroll: {
          kind: "reroll",
          effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
          replacement: { total: 15, naturalD20: DieRollResult(10) },
        },
      });

      expect(
        resolveBattleSubject({
          state: entry.state,
          subject: act.subject,
          fills: [target, rerolledAttack],
        }),
      ).toMatchObject({ tag: "invalid", message: entry.message });
      expect(sorceryPointsRemaining(entry.state)).toBe(
        entry.expectedSorceryPoints,
      );
    }
  });

  test("Seeking Spell does not open for Scorching Ray attack sequences until invocation-local one-use accounting exists", () => {
    const state = saveMetamagicBattle({
      knownOptions: [seekingMetamagicOption()],
      preparedSpells: ["scorching_ray"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = actionScorchingRayAct(state);
    const fills: BattleFill[] = [];
    for (const target of targetChoiceHoles(act.initialHoles)) {
      fills.push(
        spellAttackSequenceTargetFill(target, skeletonId, "scorching_ray"),
      );
    }
    const attack = nextSpellHole(state, act.subject, fills, "attackRoll");

    expect(attack).not.toHaveProperty("spellAttackRerolls");
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          ...fills,
          attackRollFill(attack, {
            total: 5,
            naturalD20: 2,
            spellAttackReroll: {
              kind: "decline",
              effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE,
    });
  });

  test("weapon attack rolls reject inert Seeking Spell reroll fills", () => {
    const state = fighterVsGoblinBattle({ attack: testDaggerAttack() });
    const act = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack",
    );
    if (act === undefined) {
      throw new Error("Expected Attack action act.");
    }
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      goblinId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          attackRollFill(attack, {
            total: 5,
            naturalD20: 2,
            spellAttackReroll: {
              kind: "decline",
              effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE,
    });
  });

  test("weapon attack damage rejects inert Empowered Spell reroll fills", () => {
    const state = fighterVsGoblinBattle({ attack: testDaggerAttack() });
    const act = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack",
    );
    if (act === undefined) {
      throw new Error("Expected Attack action act.");
    }
    const target = targetFill(
      findHole(act.initialHoles, "targetChoice"),
      goblinId,
    );
    const attack = nextSpellHole(state, act.subject, [target], "attackRoll");
    const attackRoll = attackRollFill(attack, {
      total: 15,
      naturalD20: 10,
    });
    const damage = nextSpellHole(
      state,
      act.subject,
      [target, attackRoll],
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[3]]);
    if (damageFill.kind !== "rolledDice") {
      throw new Error("Expected weapon damage roll fill.");
    }

    expect(damage).not.toHaveProperty("spellDamageRerolls");
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          target,
          attackRoll,
          {
            ...damageFill,
            spellDamageReroll: {
              kind: "reroll",
              effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
              dice: [
                {
                  groupIndex: 0,
                  resultIndex: 0,
                  original: DieRollResult(3),
                  replacement: DieRollResult(1),
                },
              ],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE,
    });
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

    const attackSequenceState = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
      cantrips: ["eldritch_blast"],
    });
    const attackSequenceAfterPriorFreeSpell: BattleState = {
      ...attackSequenceState,
      currentTurnResources: {
        ...attackSequenceState.currentTurnResources,
        levelOnePlusSpellCastsThisTurn: [wizardId],
      },
    };
    expect(
      hasQuickenedEldritchBlastAct(attackSequenceAfterPriorFreeSpell),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: attackSequenceAfterPriorFreeSpell,
        subject: quickenedEldritchBlastSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Quickened Spell cannot modify a spell after this turn has already cast a level 1+ spell.",
    });
    expect(sorceryPointsRemaining(attackSequenceAfterPriorFreeSpell)).toBe(
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

  test("Heightened Spell discovers promoted repeat-save spell lifecycles", () => {
    const gustOfWindState = gustOfWindMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const saveGatedConditionState = repeatSaveMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
      preparedSpell: "blindness_deafness",
      spellSlotLevel: 3,
    });

    expect(
      hasHeightenedActionSpellAct(
        gustOfWindState,
        spellId("gust_of_wind"),
      ),
    ).toBe(true);
    expect(
      hasHeightenedActionSpellAct(
        saveGatedConditionState,
        spellId("blindness_deafness"),
      ),
    ).toBe(true);
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

function requireBattleCreature(
  state: BattleState,
  id: Parameters<BattleState["combatants"]["get"]>[0],
) {
  const actor = state.combatants.get(id);
  if (actor === undefined) {
    throw new Error(`Expected combatant ${id}.`);
  }
  return actor;
}

type SpellSlotInvocationRefProcedure = Parameters<
  typeof spellSlotInvocationRef
>[2];

function supportedInvocationFor(
  state: BattleState,
  targetSpellId: Parameters<typeof spellRecord>[0],
  procedure: SpellSlotInvocationRefProcedure,
): SupportedSpellInvocation {
  const actor = requireBattleCreature(state, wizardId);
  const invocation = supportedSpellActs(actor, state).find(
    (candidate) =>
      candidate.spell.id === targetSpellId && candidate.procedure === procedure,
  );
  if (invocation === undefined) {
    throw new Error(`Expected ${targetSpellId} ${procedure} invocation.`);
  }
  return invocation;
}

function admittedSubtleProjection(
  state: BattleState,
  invocation: SupportedSpellInvocation,
  procedure: SpellSlotInvocationRefProcedure,
) {
  if (invocation.resource.tag !== "spellSlot") {
    throw new Error("Expected Spell Slot invocation.");
  }
  const admission = admitSpellMetamagicApplications({
    state,
    actor: requireBattleCreature(state, wizardId),
    actorId: wizardId,
    invocation,
    subject: {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        invocation.spell.id,
        Number(invocation.resource.slotLevel),
        procedure,
      ),
      mode: { tag: "cast" },
      metamagic: [{ effectKind: SUBTLE_METAMAGIC_EFFECT_KIND }],
    },
  });
  if (admission.tag !== "ok") {
    throw new Error(`Expected admitted Subtle Spell: ${admission.message}`);
  }
  const projection = subtleSpellComponentProjectionForApplications(
    admission.applications,
  );
  if (projection === null) {
    throw new Error("Expected Subtle Spell component projection.");
  }
  return projection;
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
  spellId: "eldritch_blast" | "ray_of_frost",
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
  readonly preparedSpells?: readonly Parameters<typeof spellRecord>[0][];
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
  readonly cantrips?: readonly ("eldritch_blast" | "ray_of_frost")[];
  readonly preparedSpells?: readonly ("burning_hands" | "scorching_ray")[];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2;
    readonly count: number;
  }[];
  readonly d20Statistics?: ReturnType<typeof testCharacterD20Statistics>;
  readonly spellcastingAbilityModifier?: number;
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
        d20Statistics:
          input.d20Statistics ?? testCharacterD20Statistics({ cha: 16 }),
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
            cantrips: (input.cantrips ?? ["ray_of_frost"]).map(spellRecord),
            preparedSpells: (input.preparedSpells ?? ["burning_hands"]).map(
              spellRecord,
            ),
            spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
          }),
          ...(input.spellcastingAbilityModifier === undefined
            ? {}
            : {
                spellcastingAbilityModifier: abilityModifier(
                  input.spellcastingAbilityModifier,
                ),
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
  return repeatSaveMetamagicBattle({
    knownOptions: input.knownOptions,
    preparedSpell: "gust_of_wind",
    spellSlotLevel: 2,
  });
}

function repeatSaveMetamagicBattle(input: {
  readonly knownOptions: readonly MetamagicOptionFixture[];
  readonly preparedSpell: "blindness_deafness" | "gust_of_wind";
  readonly spellSlotLevel: 2 | 3;
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-repeat-save"),
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
            preparedSpells: [spellRecord(input.preparedSpell)],
            spellSlots: [{ spellLevel: input.spellSlotLevel, count: 1 }],
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

function actionRayOfFrostAct(state: BattleState): AvailableBattleAct & {
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
      candidate.subject.invocation.spellId === "ray_of_frost" &&
      candidate.subject.invocation.procedure === "spellAttackDamage",
  );
  if (act === undefined) {
    throw new Error("Expected Ray of Frost action spell act.");
  }
  return act;
}

function actionScorchingRayAct(state: BattleState): AvailableBattleAct & {
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
      candidate.subject.invocation.spellId === "scorching_ray" &&
      candidate.subject.invocation.procedure === "spellAttackSequence",
  );
  if (act === undefined) {
    throw new Error("Expected Scorching Ray action spell act.");
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

function empoweredDamageRollFill(
  hole: BattleHole,
  groups: readonly (readonly number[])[],
  spellDamageReroll: NonNullable<
    Extract<BattleFill, { readonly kind: "rolledDice" }>["spellDamageReroll"]
  >,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const damageRoll = damageRollFillWithGroups(hole, groups);
  if (damageRoll.kind !== "rolledDice") {
    throw new Error("Expected rolledDice fill.");
  }
  return {
    ...damageRoll,
    spellDamageReroll,
  };
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

function quickenedEldritchBlastSubject(): QuickenedBonusActionSpellAct["subject"] {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    invocation: cantripSpellInvocationRef(
      "eldritch_blast",
      "spellAttackSequence",
    ),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

function quickenedScorchingRaySubject(): QuickenedBonusActionSpellAct["subject"] {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    invocation: spellSlotInvocationRef(
      "scorching_ray",
      2,
      "spellAttackSequence",
    ),
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

function hasQuickenedEldritchBlastAct(state: BattleState): boolean {
  return discoverBattleActs(state).some(
    (candidate) =>
      isQuickenedSpellAttackSequenceAct(candidate) &&
      candidate.subject.invocation.spellId === "eldritch_blast",
  );
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
    candidate.subject.metamagic?.length === 1 &&
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

function isQuickenedSpellAttackSequenceAct(
  candidate: AvailableBattleAct,
): candidate is QuickenedBonusActionSpellAct {
  return (
    candidate.subject.tag === "bonusActionSpell" &&
    candidate.subject.invocation.procedure === "spellAttackSequence" &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedEldritchBlastAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      isQuickenedSpellAttackSequenceAct(candidate) &&
      candidate.subject.invocation.spellId === "eldritch_blast",
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Eldritch Blast act.");
  }
  return act;
}

function quickenedScorchingRayAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      isQuickenedSpellAttackSequenceAct(candidate) &&
      candidate.subject.invocation.spellId === "scorching_ray",
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Scorching Ray act.");
  }
  return act;
}

function resolveQuickenedEldritchBlast(state: BattleState): BattleState {
  const act = quickenedEldritchBlastAct(state);
  const targets = targetChoiceHoles(act.initialHoles);
  const firstTarget = spellAttackSequenceTargetFill(
    targets[0]!,
    skeletonId,
    "eldritch_blast",
  );
  const secondTarget = spellAttackSequenceTargetFill(
    targets[1]!,
    skeletonId,
    "eldritch_blast",
  );
  const fills: BattleFill[] = [firstTarget, secondTarget];

  const firstAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
  fills.push(attackRollFill(firstAttack, { total: 15, naturalD20: 10 }));
  const firstDamage = nextSpellHole(state, act.subject, fills, "rolledDice");
  fills.push(damageRollFillWithGroups(firstDamage, [[4]]));
  const secondAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
  fills.push(attackRollFill(secondAttack, { total: 1, naturalD20: 1 }));

  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills,
    }),
  ).state;
}

function resolveQuickenedScorchingRay(
  state: BattleState,
  act: QuickenedBonusActionSpellAct = quickenedScorchingRayAct(state),
): BattleState {
  const fills: BattleFill[] = targetChoiceHoles(act.initialHoles).map((hole) =>
    spellAttackSequenceTargetFill(hole, skeletonId, "scorching_ray"),
  );

  for (let rayIndex = 0; rayIndex < 3; rayIndex += 1) {
    const attack = nextSpellHole(state, act.subject, fills, "attackRoll");
    fills.push(attackRollFill(attack, { total: 15, naturalD20: 10 }));
    const damage = nextSpellHole(state, act.subject, fills, "rolledDice");
    fills.push(damageRollFillWithGroups(damage, [[1, 1]]));
  }

  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills,
    }),
  ).state;
}

function spellAttackSequenceTargetFill(
  hole: BattleHole,
  targetId: ReturnType<typeof combatantId>,
  spellId: "eldritch_blast" | "scorching_ray",
): BattleFill {
  return targetFill(hole, targetId, [
    {
      kind: "spellTarget",
      casterId: wizardId,
      targetId,
      spellId,
    },
  ]);
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

function hasHeightenedActionSpellAct(
  state: BattleState,
  spellId: ActionSpellAct["subject"]["invocation"]["spellId"],
): boolean {
  return discoverBattleActs(state).some(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === spellId &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
}

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
