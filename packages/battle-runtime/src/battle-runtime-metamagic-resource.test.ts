import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForSpellHoleForTest,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import { admitBattleResolutionInput } from "./battle-reducer/resolution-admission.ts";
import { resolveBonusActionSpellAct } from "./battle-reducer/spells-resolve.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.metamagic-battle-resource-bridge unit-feature.metamagic-cast-governor-quickened unit-feature.metamagic-careful-save-protection unit-feature.metamagic-heightened-save-disadvantage unit-feature.metamagic-damage-type-substitution unit-feature.metamagic-effective-level-extra-target unit-feature.metamagic-cast-component-suppression unit-feature.metamagic-missed-spell-attack-reroll unit-feature.metamagic-damage-dice-reroll
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L14G-D03-SORCERER-METAMAGIC-PARTIAL-PROFILE sorcerer_metamagic
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL

import {
  canSpendAction,
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  abilityModifier,
  DieRollResult,
  proficiencyBonus,
  type ProficiencyBonus,
  resourceCount,
} from "@dnd/shared/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import type {
  BattleActiveEffect,
  BattleSpellTargetListHole,
} from "./battle-state-execution.ts";
import {
  EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE,
  SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE,
} from "./battle-reducer/spell-reroll-issues.ts";
import {
  admitSpellMetamagicApplications,
  actorCanOfferQuickenedSpellMetamagic,
  CAREFUL_METAMAGIC_EFFECT_KIND,
  DISTANT_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_UNSUPPORTED_MESSAGE,
  empoweredSpellDamageRerollOption,
  empoweredSpellMetamagicApplication,
  empoweredSpellStackingIssue,
  effectiveEmpoweredSpellDamageRoll,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_ACTION_SPELL_PROCEDURE_UNSUPPORTED_MESSAGE,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
  SEEKING_METAMAGIC_EFFECT_KIND,
  SEEKING_METAMAGIC_UNSUPPORTED_MESSAGE,
  seekingSpellAttackRerollOption,
  seekingSpellCombinedUseIssue,
  seekingSpellMetamagicApplication,
  seekingSpellStackingIssue,
  spellMetamagicApplications,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  subtleSpellComponentProjectionForApplications,
  spendSpellMetamagicSorceryPoints,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TWINNED_METAMAGIC_EFFECT_KIND,
  twinnedSpellTargetCountInvocation,
} from "./battle-reducer/metamagic.ts";
import {
  discoverDistantSpellMetamagicSelections,
  discoverExtendedSpellMetamagicSelections,
  discoverSubtleSpellMetamagicSelections,
  discoverTransmutedSpellMetamagicSelections,
  discoverTwinnedSpellMetamagicSelections,
  saveMetamagicSupportIssue,
  subtleSpellComponentProjectionIssue,
} from "./battle-reducer/metamagic-support.ts";
import {
  resolveAreaSaveMetamagicFills,
  saveMetamagicSelectionState,
} from "./battle-reducer/spells-resolve-save-gates.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { battleContinuationFillEquals } from "./battle-reducer/battle-fill-equality.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  combatantId,
  damageRollFillWithGroups,
  fighterId,
  fighterVsGoblinBattle,
  findHole,
  goblinId,
  innateSorceryResource,
  requireCharacterSpellProcedureRefForTest,
  requireResolved,
  resolveBattleSubject,
  resolveBattleSubjectUncheckedForTest,
  savingThrowOutcomeFill,
  snapshotBattle,
  skeletonId,
  spellRecord,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  testDaggerAttack,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { spellId } from "./identity.ts";
import { spellHoleInvocation } from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type SpellInvocationRef,
  type BattleSubject,
  cantripSpellInvocationRef,
  type CharacterBattleMetamagicOptionFact,
  characterBattleResourceIsPointPool,
  discoverBattleActCandidates,
  discoverBattleActs,
  spellSlotInvocationRef,
  spendCharacterPointPoolResource,
  startBattle,
} from "./index.ts";

describe("battle runtime: Sorcerer Metamagic resource bridge", () => {
  test("returns typed spend failures for non-owners and exhausted Sorcery Points", () => {
    const session = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption()],
      sorceryPoints: 0,
    });
    const actor = requireBattleCreature(session.state, wizardId);
    const [application] = spellMetamagicApplications(actor, [
      { effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND },
    ]);
    if (application === undefined) {
      throw new Error("Expected the known Empowered Spell application.");
    }

    expect(
      spendSpellMetamagicSorceryPoints({
        state: session.state,
        actorId: skeletonId,
        applications: [application],
      }),
    ).toEqual(
      Result.fail(
        "Metamagic selection requires a character with known Metamagic options.",
      ),
    );
    expect(
      spendSpellMetamagicSorceryPoints({
        state: session.state,
        actorId: wizardId,
        applications: [application],
      }),
    ).toEqual(
      Result.fail("Metamagic requires enough unexpended Sorcery Points."),
    );

    const characterSession = metamagicBattle();
    expect(
      spendSpellMetamagicSorceryPoints({
        state: characterSession.state,
        actorId: fighterId,
        applications: [application],
      }),
    ).toEqual(
      Result.fail(
        "Metamagic selection requires a character with known Metamagic options.",
      ),
    );
  });

  test("stores Metamagic option facts beside the shared Sorcery Point point pool", () => {
    const sorcererId = combatantId("combatant:sorcerer-metamagic-resource");
    const state = startBattleRight({
      battleId: battleId("battle:sorcerer-metamagic-resource"),
      combatants: [
        characterSeed({
          combatantId: sorcererId,
          displayName: "Sorcerer",
          initiative: 12,
          classLevels: [{ className: "sorcerer", level: 5 }],
          resources: [
            {
              unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
              pointsRemaining: resourceCount(4),
            },
          ],
          metamagic: {
            sorceryPointResourceUnitId: parseSharedUnitId(
              "sorcerer_font_of_magic",
            ),
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
      sorceryPointResourcePoolRef: sorceryPoints?.resourcePoolRef,
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
      Result.isFailure(
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
      Result.fail({
        tag: "battleStateInitIssue",
        message:
          "Point-pool character battle resource remaining points must not exceed its maximum.",
      }),
    );
  });
});

describe("battle runtime: Sorcerer Metamagic cast governor and Quickened Spell", () => {
  test("discovers Quickened Cure Wounds as a Bonus Action and spends Sorcery Points without spending the Magic action", () => {
    const session = clericSorcererQuickenedCureWoundsBattle();
    const state = session.state;
    assertBattleSnapshotCodecRoundTripForTest(snapshotBattle(state));
    const act = quickenedCureWoundsAct(session);
    const actorBefore = requireBattleCreature(state, wizardId);
    if (actorBefore.origin.kind !== "character") {
      throw new Error("Expected Quickened Spell character.");
    }
    const sorceryPointResourcePoolRef =
      actorBefore.origin.metamagic?.sorceryPointResourcePoolRef;
    const unrelatedResource = actorBefore.origin.resources.find(
      (resource) => resource.resourcePoolRef !== sorceryPointResourcePoolRef,
    );
    if (unrelatedResource === undefined) {
      throw new Error("Expected Innate Sorcery resource.");
    }

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        spellSlotInvocationRef("cure_wounds", 1, "directHitPointRestoration"),
      ),
      mode: { tag: "cast" },
      metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
    });
    expect(
      resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    ).toMatchObject({ tag: "needsHoles", holes: [{ kind: "targetChoice" }] });

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
    const actorAfter = requireBattleCreature(resolved.state, wizardId);
    if (actorAfter.origin.kind !== "character") {
      throw new Error("Expected resolved Quickened Spell character.");
    }
    expect(actorAfter.origin.resources).toContainEqual(unrelatedResource);
    expect(
      discoverBattleActs(battleSessionAtState(session, resolved.state)).some(
        (candidate) =>
          "invocation" in candidate.subject &&
          battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot",
      ),
    ).toBe(false);
  });

  test("discovers Quickened action-casting scalar buff spells through the same Bonus Action rewrite", () => {
    const session = metamagicBattle({ preparedSpells: ["false_life"] });
    const state = session.state;
    const act = quickenedFalseLifeAct(session);

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        spellSlotInvocationRef("false_life", 1, "scalarBuff"),
      ),
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
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = session.state;
    const act = quickenedBurningHandsAct(session);

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject(quickenedBurningHandsSubject(session));

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

  test("resolves Quickened save-gated damage at the save boundary when its area has no affected targets", () => {
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = session.state;
    const initialTargetHp = requireBattleCreature(state, skeletonId).hp;
    const act = quickenedBurningHandsAct(session);
    const saveHole = findHole(act.initialHoles, "savingThrowOutcome");
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [savingThrowOutcomeFill(saveHole, [])],
      }),
    );

    expect(requireBattleCreature(resolved.state, skeletonId).hp).toBe(
      initialTargetHp,
    );
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(sorcererSpellSlots(resolved.state)).toEqual([
      { spellLevel: 1, count: 2, expended: 1 },
    ]);
    expect(resolved.routeEvents).toEqual(
      expect.arrayContaining([
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "metamagicBonusActionCastingTime",
          holes: [],
          owner: "battleConditionLifecycle",
        },
      ]),
    );
  });

  test("discovers Quickened spell attacks as Bonus Action casts and preserves hit damage", () => {
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = session.state;
    const act = quickenedRayOfFrostAct(session);

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject(quickenedRayOfFrostSubject(session));

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
    const session = quickenedProfileBattle({
      preparedSpells: ["color_spray"],
      spellSlots: [{ spellLevel: 1, count: 2 }],
    });
    const state = session.state;
    const act = quickenedSpellAct(session, "color_spray", "saveGatedCondition");
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
    const session = quickenedProfileBattle({
      preparedSpells: ["calm_emotions"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = quickenedSpellAct(
      session,
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
    const session = quickenedProfileBattle({
      preparedSpells: ["invisibility"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = quickenedSpellAct(session, "invisibility", "directCondition");
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
    const session = quickenedProfileBattle({
      preparedSpells: ["bless"],
      spellSlots: [{ spellLevel: 1, count: 2 }],
    });
    const state = session.state;
    const act = quickenedSpellAct(session, "bless", "rollModifier");
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
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = session.state;
    const act = quickenedRayOfFrostAct(session);
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
      discoverBattleActs(battleSessionAtState(session, resolved.state)).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "burning_hands",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: resolved.state,
        subject: burningHandsActionSubject(session),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "This turn has already expended a Spell Slot.",
    });
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
  });

  test("spends Sorcery Points for Quickened spell attacks on a miss without opening damage", () => {
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = session.state;
    const act = quickenedRayOfFrostAct(session);
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
    const baseSession = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = magicActionSpent(baseSession.state);
    const session = battleSessionAtState(baseSession, state);
    const act = quickenedRayOfFrostAct(session);

    expect(canSpendAction(state.currentTurnResources, "magic")).toBe(false);
    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject(quickenedRayOfFrostSubject(session));

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
    const baseSession = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
      cantrips: ["eldritch_blast"],
    });
    const state = magicActionSpent(baseSession.state);
    const session = battleSessionAtState(baseSession, state);
    const act = quickenedEldritchBlastAct(session);

    expect(canSpendAction(state.currentTurnResources, "magic")).toBe(false);
    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject(quickenedEldritchBlastSubject(session));

    const resolved = resolveQuickenedEldritchBlast(session);

    expect(resolved.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(canSpendAction(resolved.currentTurnResources, "magic")).toBe(false);
    expect(
      resolved.currentTurnResources.quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(2));
    expect(resolved.combatants.get(skeletonId)?.hp).toBe(6);
  });

  test("blocks later level 1+ spells after Quickened Eldritch Blast attack sequences", () => {
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
      cantrips: ["eldritch_blast"],
    });
    const resolved = resolveQuickenedEldritchBlast(session);

    expect(
      resolved.currentTurnResources.quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(wizardId);
    expect(
      discoverBattleActs(battleSessionAtState(session, resolved)).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "burning_hands",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: resolved,
        subject: burningHandsActionSubject(session),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "This turn has already expended a Spell Slot.",
    });
    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(2));
  });

  test("spends spell slots for Quickened Scorching Ray attack sequences", () => {
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
      preparedSpells: ["scorching_ray"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = quickenedScorchingRayAct(session);
    const resolved = resolveQuickenedScorchingRay(session, act);
    const caster = resolved.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected Sorcerer character combatant.");
    }

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject(quickenedScorchingRaySubject(session));
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
    const baseSession = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = withSanctuaryWard(baseSession.state, skeletonId);
    const session = battleSessionAtState(baseSession, state);
    const act = quickenedRayOfFrostAct(session);
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
    const sanctuaryRetarget = sanctuaryRetargetFill(sanctuaryHole, fighterId);
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
    const baseSession = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
      cantrips: ["eldritch_blast"],
    });
    const state = withSanctuaryWard(baseSession.state, skeletonId);
    const session = battleSessionAtState(baseSession, state);
    const act = quickenedEldritchBlastAct(session);
    const targetHoles = targetChoiceHoles(act.initialHoles);
    const originalTarget = spellAttackSequenceTargetFill(
      targetHoles[0]!,
      skeletonId,
    );
    const secondTarget = spellAttackSequenceTargetFill(
      targetHoles[1]!,
      fighterId,
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
    const sanctuaryRetarget = sanctuaryRetargetFill(sanctuaryHole, fighterId);
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
    const baseSession = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = withMirrorImageDuplicates(baseSession.state, skeletonId);
    const session = battleSessionAtState(baseSession, state);
    const act = quickenedRayOfFrostAct(session);
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
    const session = metamagicBattle({
      preparedSpells: ["cure_wounds", "false_life"],
    });
    const state = session.state;
    const afterMagicAction = magicActionSpent(state);

    expect(canSpendAction(afterMagicAction.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(
      afterMagicAction.currentTurnResources.levelOnePlusSpellCastsThisTurn,
    ).not.toContain(wizardId);

    const afterMagicActionSession = battleSessionAtState(
      session,
      afterMagicAction,
    );
    const cureWounds = quickenedCureWoundsAct(afterMagicActionSession);
    const healed = resolveQuickenedCureWounds(afterMagicAction, cureWounds);
    expect(healed.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(canSpendAction(healed.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(sorceryPointsRemaining(healed.state)).toBe(resourceCount(2));

    const falseLife = quickenedFalseLifeAct(afterMagicActionSession);
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

  test("excludes absent and non-character actors from character-owned Metamagic offers", () => {
    const { session, invocation } = burningHandsMetamagicContext({
      knownOptions: [subtleMetamagicOption()],
    });
    const skeleton = requireBattleCreature(session.state, skeletonId);

    expect(
      actorCanOfferQuickenedSpellMetamagic({
        state: session.state,
        actor: skeleton,
        actorId: skeletonId,
        invocation,
      }),
    ).toBe(false);
    expect(seekingSpellAttackRerollOption({ actor: skeleton })).toBeNull();
    expect(
      empoweredSpellDamageRerollOption({
        actor: skeleton,
        castApplications: [],
      }),
    ).toBeNull();
    expect(empoweredSpellMetamagicApplication(skeleton)).toBeNull();
    expect(seekingSpellMetamagicApplication(skeleton)).toBeNull();
    expect(
      spellMetamagicApplications(skeleton, [
        { effectKind: SUBTLE_METAMAGIC_EFFECT_KIND },
      ]),
    ).toEqual([]);
    expect(
      discoverDistantSpellMetamagicSelections({
        actor: undefined,
        invocation,
      }),
    ).toEqual([]);
    expect(
      discoverExtendedSpellMetamagicSelections({
        actor: undefined,
        invocation,
      }),
    ).toEqual([]);
  });

  test("discovers only options present in the character's known Metamagic facts", () => {
    const { actor, invocation } = burningHandsMetamagicContext({
      knownOptions: [empoweredMetamagicOption()],
    });

    expect({
      distant: discoverDistantSpellMetamagicSelections({ actor, invocation }),
      extended: discoverExtendedSpellMetamagicSelections({
        actor,
        invocation,
      }),
      transmuted: discoverTransmutedSpellMetamagicSelections({
        actor,
        invocation,
      }),
      twinned: discoverTwinnedSpellMetamagicSelections({ actor, invocation }),
    }).toEqual({
      distant: [],
      extended: [],
      transmuted: [],
      twinned: [],
    });
    expect(
      discoverSubtleSpellMetamagicSelections({
        actor,
        invocation,
        subject: { tag: "actionSpell", mode: { tag: "cast" } },
      }),
    ).toEqual([]);
  });

  test("requires known Metamagic options and enough unexpended Sorcery Points", () => {
    const unaffordableSession = metamagicBattle({ sorceryPoints: 1 });
    const unaffordable = unaffordableSession.state;
    expect(hasQuickenedCureWoundsAct(unaffordableSession)).toBe(false);
    expect(
      resolveBattleSubject({
        state: unaffordable,
        subject: quickenedCureWoundsSubject(unaffordableSession),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Metamagic requires enough unexpended Sorcery Points.",
    });

    const unknownSession = metamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const unknown = unknownSession.state;
    expect(
      resolveBattleSubject({
        state: unknown,
        subject: {
          ...quickenedCureWoundsSubject(unknownSession),
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
    const unaffordableSession = saveMetamagicBattle({
      sorceryPoints: 1,
      knownOptions: [quickenedMetamagicOption()],
    });
    const unaffordable = unaffordableSession.state;
    expect(hasQuickenedBurningHandsAct(unaffordableSession)).toBe(false);
    expect(
      resolveBattleSubject({
        state: unaffordable,
        subject: quickenedBurningHandsSubject(unaffordableSession),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Metamagic requires enough unexpended Sorcery Points.",
    });

    const unknownSession = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const unknown = unknownSession.state;
    expect(
      resolveBattleSubject({
        state: unknown,
        subject: {
          ...quickenedBurningHandsSubject(unknownSession),
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

  test("requires character-owned Metamagic before admitting a selection", () => {
    const { session, invocation } = burningHandsMetamagicContext({
      knownOptions: [subtleMetamagicOption()],
    });
    const subject = {
      tag: "actionSpell",
      mode: { tag: "cast" },
      metamagic: [{ effectKind: SUBTLE_METAMAGIC_EFFECT_KIND }],
    } as const;
    const issue = {
      tag: "spellMetamagicAdmissionIssue",
      message:
        "Metamagic selection requires a character with known Metamagic options.",
    } as const;

    const characterSession = metamagicBattle();
    expect([
      admitSpellMetamagicApplications({
        state: session.state,
        actor: requireBattleCreature(session.state, skeletonId),
        actorId: skeletonId,
        invocation,
        subject,
      }),
      admitSpellMetamagicApplications({
        state: characterSession.state,
        actor: requireBattleCreature(characterSession.state, fighterId),
        actorId: fighterId,
        invocation,
        subject,
      }),
    ]).toEqual([issue, issue]);
  });

  test("rejects duplicate Metamagic selections before option support", () => {
    const { session, invocation } = burningHandsMetamagicContext({
      knownOptions: [subtleMetamagicOption()],
    });

    expect(
      admitSpellMetamagicApplications({
        state: session.state,
        actor: requireBattleCreature(session.state, wizardId),
        actorId: wizardId,
        invocation,
        subject: {
          tag: "actionSpell",
          mode: { tag: "cast" },
          metamagic: [
            { effectKind: SUBTLE_METAMAGIC_EFFECT_KIND },
            { effectKind: SUBTLE_METAMAGIC_EFFECT_KIND },
          ],
        },
      }),
    ).toEqual({
      tag: "spellMetamagicAdmissionIssue",
      message: "Metamagic selections must not repeat an option effect.",
    });
  });

  test("enforces one Metamagic option per spell without admitting unsupported second-option effects", () => {
    const session = metamagicBattle({
      sorceryPoints: 5,
      knownOptions: [
        quickenedMetamagicOption(),
        empoweredMetamagicOption(),
        heightenedMetamagicOption(),
      ],
    });
    const state = session.state;

    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...quickenedCureWoundsSubject(session),
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
          ...quickenedCureWoundsSubject(session),
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

  test("keeps Distant and Extended undiscoverable for unsupported spell procedures", () => {
    const { actor, invocation } = burningHandsMetamagicContext({
      knownOptions: [distantMetamagicOption(), extendedMetamagicOption()],
    });

    expect({
      distant: discoverDistantSpellMetamagicSelections({ actor, invocation }),
      extended: discoverExtendedSpellMetamagicSelections({
        actor,
        invocation,
      }),
    }).toEqual({ distant: [], extended: [] });
  });

  test("offers Light for Distant range projection but not Quickened action rewrite", () => {
    const session = metamagicBattle({
      knownOptions: [distantMetamagicOption(), quickenedMetamagicOption()],
      preparedSpells: ["light"],
    });
    const actor = requireBattleCreature(session.state, wizardId);
    const invocation = supportedInvocationFor(session, "light", "objectLight");

    expect(
      discoverDistantSpellMetamagicSelections({ actor, invocation }),
    ).toEqual([[{ effectKind: DISTANT_METAMAGIC_EFFECT_KIND }]]);
    expect(
      actorCanOfferQuickenedSpellMetamagic({
        state: session.state,
        actor,
        actorId: wizardId,
        invocation,
      }),
    ).toBe(false);
  });

  test("does not offer Distant Light without its Sorcery Point cost", () => {
    const session = metamagicBattle({
      knownOptions: [distantMetamagicOption()],
      preparedSpells: ["light"],
      sorceryPoints: 0,
    });

    expect(
      discoverDistantSpellMetamagicSelections({
        actor: requireBattleCreature(session.state, wizardId),
        invocation: supportedInvocationFor(session, "light", "objectLight"),
      }),
    ).toEqual([]);
  });

  test("explicitly closes unpromoted cast-property Metamagic options before Sorcery Point spending", () => {
    const session = metamagicBattle({
      knownOptions: [distantMetamagicOption(), extendedMetamagicOption()],
    });
    const state = session.state;

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
        resolveBattleSubjectUncheckedForTest({
          state,
          subject: {
            ...cureWoundsActionSubject(session),
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

  test("rejects Distant Spell for a spell without an admitted range projection", () => {
    const session = saveMetamagicBattle({
      knownOptions: [distantMetamagicOption()],
    });
    const state = session.state;

    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...burningHandsActionSubject(session),
          metamagic: [{ effectKind: DISTANT_METAMAGIC_EFFECT_KIND }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Distant Spell is supported only for spell procedures with a Touch range or a distance range of at least 5 feet.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("projects selected Subtle Spell components at the Spell Invocation boundary", () => {
    const session = metamagicBattle({
      knownOptions: [subtleMetamagicOption()],
      preparedSpells: [
        "cure_wounds",
        "false_life",
        "chromatic_orb",
        "protection_from_evil_and_good",
      ],
    });
    const state = session.state;

    const cureWounds = supportedInvocationFor(
      session,
      "cure_wounds",
      "directHitPointRestoration",
    );
    expect(admittedSubtleProjection(state, cureWounds)).toEqual({
      suppressedComponents: [{ kind: "verbal" }, { kind: "somatic" }],
      preservedComponents: [],
    });

    const falseLife = supportedInvocationFor(
      session,
      "false_life",
      "scalarBuff",
    );
    const falseLifeComponents = falseLife.spellRuleFacts.components;
    expect(admittedSubtleProjection(state, falseLife)).toEqual({
      suppressedComponents: [
        { kind: "verbal" },
        { kind: "somatic" },
        { kind: "material" },
      ],
      preservedComponents: [],
    });
    expect(falseLife.spellRuleFacts.components).toEqual(falseLifeComponents);

    const chromaticOrb = supportedInvocationFor(
      session,
      "chromatic_orb",
      "chainedSpellAttackDamage",
    );
    expect(admittedSubtleProjection(state, chromaticOrb)).toEqual({
      suppressedComponents: [{ kind: "verbal" }, { kind: "somatic" }],
      preservedComponents: [
        {
          kind: "material",
          preservation: "pricedOrConsumed",
        },
      ],
    });

    const protectionFromEvilAndGood = supportedInvocationFor(
      session,
      "protection_from_evil_and_good",
      "creatureTypeProtection",
    );
    expect(admittedSubtleProjection(state, protectionFromEvilAndGood)).toEqual({
      suppressedComponents: [{ kind: "verbal" }, { kind: "somatic" }],
      preservedComponents: [
        {
          kind: "material",
          preservation: "pricedOrConsumed",
        },
      ],
    });
  });

  test("resolves Subtle False Life through component projection and resource commitment", () => {
    const session = metamagicBattle({
      knownOptions: [subtleMetamagicOption()],
      preparedSpells: ["false_life"],
    });
    const state = session.state;
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "false_life" &&
        candidate.subject.metamagic?.some(
          (selection) => selection.effectKind === SUBTLE_METAMAGIC_EFFECT_KIND,
        ) === true,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Subtle False Life act.");
    }
    const roll = findHole(act.initialHoles, "rolledDice");
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageRollFillWithGroups(roll, [[4, 3]])],
      }),
    );

    expect(resolved.state.combatants.get(wizardId)?.tempHp).toBe(11);
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(3));
    expect(sorcererSpellSlots(resolved.state)).toEqual([
      { spellLevel: 1, count: 2, expended: 1 },
    ]);
    expect(resolved.routeEvents).toEqual(
      expect.arrayContaining([
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "metamagicSpellComponentProjection",
          holes: [],
          owner: "battleSpellSlotAndActionEconomy",
        },
      ]),
    );
  });

  test("keeps selected Subtle Spell out of payloadless Metamagic applications", () => {
    const session = metamagicBattle({
      knownOptions: [subtleMetamagicOption()],
      preparedSpells: ["cure_wounds"],
    });
    const state = session.state;
    const actor = requireBattleCreature(state, wizardId);
    const cureWounds = supportedInvocationFor(
      session,
      "cure_wounds",
      "directHitPointRestoration",
    );

    expect(
      spellMetamagicApplications(actor, [
        { effectKind: SUBTLE_METAMAGIC_EFFECT_KIND },
      ]),
    ).toEqual([]);
    expect(admittedSubtleProjection(state, cureWounds)).toEqual({
      suppressedComponents: [{ kind: "verbal" }, { kind: "somatic" }],
      preservedComponents: [],
    });
  });

  test("requires the admitted Subtle application before projecting components", () => {
    const { invocation } = burningHandsMetamagicContext({
      knownOptions: [transmutedMetamagicOption()],
    });

    expect(
      subtleSpellComponentProjectionIssue({
        applications: [transmutedMetamagicOption()],
        invocation,
        subject: { tag: "actionSpell", mode: { tag: "cast" } },
      }),
    ).toBe(
      "Selected Metamagic option effect is not supported for this spell procedure.",
    );
  });

  test("does not discover Subtle Spell without its Sorcery Point cost", () => {
    const { actor, invocation } = burningHandsMetamagicContext({
      knownOptions: [subtleMetamagicOption()],
      sorceryPoints: 0,
    });

    expect(
      discoverSubtleSpellMetamagicSelections({
        actor,
        invocation,
        subject: { tag: "actionSpell", mode: { tag: "cast" } },
      }),
    ).toEqual([]);
  });

  test("rejects Subtle Spell outside action-time spell casts before Sorcery Point spending", () => {
    const session = metamagicBattle({
      knownOptions: [subtleMetamagicOption()],
      preparedSpells: ["healing_word"],
    });
    const state = session.state;
    const healingWord = supportedInvocationFor(
      session,
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

  test("does not discover Twinned target-count projection without its Sorcery Point cost", () => {
    const session = twinnedTargetCountBattle(
      combatantId("combatant:unaffordable-twinned-target"),
      resourceCount(0),
    );

    expect(
      discoverTwinnedSpellMetamagicSelections({
        actor: requireBattleCreature(session.state, wizardId),
        invocation: supportedInvocationFor(session, "bless", "rollModifier"),
      }),
    ).toEqual([]);
  });

  test("discovers Twinned target-count spells with the next effective target maximum", () => {
    const extraTargetId = combatantId("combatant:twinned-bless-extra-target");
    const session = twinnedTargetCountBattle(extraTargetId);
    const state = session.state;
    const act = twinnedBlessAct(session);
    const targetHole = requireSpellTargetListHole(
      act.initialHoles,
      "Spell targets",
    );

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        spellSlotInvocationRef("bless", 1, "rollModifier"),
      ),
      mode: { tag: "cast" },
      metamagic: [{ effectKind: TWINNED_METAMAGIC_EFFECT_KIND }],
    });
    expect(
      resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "spellTargetList" }],
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
    const session = metamagicBattle({
      knownOptions: [twinnedMetamagicOption()],
    });
    const state = session.state;

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "cure_wounds" &&
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
          ...cureWoundsActionSubject(session),
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
    const session = saveMetamagicBattle({
      knownOptions: [transmutedMetamagicOption(), twinnedMetamagicOption()],
    });
    const state = session.state;

    for (const closure of [
      {
        effectKind: TWINNED_METAMAGIC_EFFECT_KIND,
        message:
          "Twinned Spell is supported only for Spell Slot casts whose target-count profile adds exactly one creature at the next effective spell level.",
      },
    ] as const) {
      expect(
        resolveBattleSubjectUncheckedForTest({
          state,
          subject: {
            ...burningHandsActionSubject(session),
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
    const session = metamagicBattle({
      knownOptions: [twinnedMetamagicOption()],
      preparedSpells: ["magic_missile"],
    });
    const state = session.state;

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "magic_missile" &&
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
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            spellSlotInvocationRef(
              "magic_missile",
              1,
              "repeatedDamageAllocation",
            ),
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

    const session = twinnedTargetCountBattle(
      combatantId("combatant:twinned-non-creature-extra-target"),
    );
    const state = session.state;
    const actor = state.combatants.get(wizardId);
    if (actor === undefined) {
      throw new Error("Expected Twinned Spell actor.");
    }
    const baseBlessInvocation = supportedSpellActs(state, actor).find(
      (invocation) =>
        invocation.procedure === "rollModifier" &&
        invocation.resource.tag === "spellSlot" &&
        Number(invocation.resource.slotLevel) === 1,
    );
    if (
      baseBlessInvocation === undefined ||
      baseBlessInvocation.procedure !== "rollModifier"
    ) {
      throw new Error("Expected base Bless invocation.");
    }
    if (baseBlessInvocation.targeting.kind !== "targetList") {
      throw new Error("Expected Bless target selection.");
    }
    const creatureOrObjectTargetScalingInvocation = {
      ...baseBlessInvocation,
      spellRuleFacts: {
        ...baseBlessInvocation.spellRuleFacts,
        twinnedTargetCount: null,
      },
      targeting: {
        ...baseBlessInvocation.targeting,
        targetKinds: ["creature", "object"] as const,
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
    const damageSession = saveMetamagicBattle({
      knownOptions: [transmutedMetamagicOption()],
    });
    const damageState = damageSession.state;
    const restorationSession = metamagicBattle({
      knownOptions: [transmutedMetamagicOption()],
    });
    const restorationState = restorationSession.state;

    for (const closure of [
      {
        state: damageState,
        subject: {
          ...burningHandsActionSubject(damageSession),
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
        state: restorationState,
        subject: {
          ...cureWoundsActionSubject(restorationSession),
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
        resolveBattleSubjectUncheckedForTest({
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

  test("does not discover Transmuted damage substitution without its Sorcery Point cost", () => {
    const { actor, invocation } = burningHandsMetamagicContext({
      knownOptions: [transmutedMetamagicOption()],
      sorceryPoints: 0,
    });

    expect(
      discoverTransmutedSpellMetamagicSelections({
        actor,
        invocation,
      }),
    ).toEqual([]);
  });

  test("threads Transmuted Spell through spell attack sequence resolution", () => {
    const session = saveMetamagicBattle({
      knownOptions: [transmutedMetamagicOption()],
      preparedSpells: ["scorching_ray"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = transmutedScorchingRayToPoisonAct(session);
    const targetFills = targetChoiceHoles(act.initialHoles).map((hole) =>
      targetFill(hole, fighterId),
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
    const session = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption(), seekingMetamagicOption()],
    });
    const state = session.state;

    for (const closure of [
      {
        subject: burningHandsActionSubject(session),
        effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
        message: EMPOWERED_METAMAGIC_UNSUPPORTED_MESSAGE,
      },
      {
        subject: rayOfFrostActionSubject(session),
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

  test("Empowered Spell replay identity treats rerolls as a multiset", () => {
    const damageHoleId = findHole(
      actionRayOfFrostAct(
        saveMetamagicBattle({ knownOptions: [empoweredMetamagicOption()] }),
      ).initialHoles,
      "targetChoice",
    ).holeId;
    const first: BattleFill = {
      kind: "rolledDice",
      holeId: damageHoleId,
      value: [{ results: [DieRollResult(1), DieRollResult(2)] }],
      spellDamageReroll: {
        kind: "reroll",
        effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
        dice: [
          { original: DieRollResult(1), replacement: DieRollResult(5) },
          { original: DieRollResult(2), replacement: DieRollResult(6) },
        ],
      },
    };
    const reordered: BattleFill = {
      ...first,
      spellDamageReroll: {
        kind: "reroll",
        effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
        dice: [
          { original: DieRollResult(2), replacement: DieRollResult(6) },
          { original: DieRollResult(1), replacement: DieRollResult(5) },
        ],
      },
    };

    expect(battleContinuationFillEquals(first, reordered)).toBe(true);
  });

  test("Empowered Spell normalizes duplicate original rolls as one dice multiset", () => {
    const damageHoleId = findHole(
      actionRayOfFrostAct(
        saveMetamagicBattle({ knownOptions: [empoweredMetamagicOption()] }),
      ).initialHoles,
      "targetChoice",
    ).holeId;
    const damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }> = {
      kind: "rolledDice",
      holeId: damageHoleId,
      value: [{ results: [DieRollResult(1)] }, { results: [DieRollResult(1)] }],
      spellDamageReroll: {
        kind: "reroll",
        effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
        dice: [
          { original: DieRollResult(1), replacement: DieRollResult(6) },
          { original: DieRollResult(1), replacement: DieRollResult(5) },
        ],
      },
    };
    const reorderedDamageRoll: Extract<
      BattleFill,
      { readonly kind: "rolledDice" }
    > = {
      ...damageRoll,
      spellDamageReroll: {
        kind: "reroll",
        effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
        dice: [
          { original: DieRollResult(1), replacement: DieRollResult(5) },
          { original: DieRollResult(1), replacement: DieRollResult(6) },
        ],
      },
    };
    const reordered = effectiveEmpoweredSpellDamageRoll(reorderedDamageRoll);

    expect(battleContinuationFillEquals(damageRoll, reorderedDamageRoll)).toBe(
      true,
    );
    expect(effectiveEmpoweredSpellDamageRoll(damageRoll).value).toEqual([
      { results: [DieRollResult(5), DieRollResult(6)] },
    ]);
    expect(reordered.value).toEqual(
      effectiveEmpoweredSpellDamageRoll(damageRoll).value,
    );
  });

  test("Empowered Spell must use worse replacement dice and spends only when replacements are used", () => {
    const session = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption()],
    });
    const state = session.state;
    const act = actionRayOfFrostAct(session);
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
                original: DieRollResult(8),
                replacement: DieRollResult(1),
              },
              {
                original: DieRollResult(8),
                replacement: DieRollResult(1),
              },
            ],
          }),
        ],
      }),
    ).state;

    expect(sorceryPointsRemaining(resolved)).toBe(resourceCount(3));
    expect(resolved.combatants.get(skeletonId)?.hp).toBe(8);
  });

  test("Empowered Spell stays closed for spell attack damage carrying marked riders", () => {
    const baseSession = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption()],
    });
    const state = withActiveEffect(baseSession.state, wizardId, {
      kind: "spellMarkedDamageRider",
      effectRef: battleActiveEffectExecutionRefForTest("empowered-mark"),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(spellRecord("hunters_mark").id),
      ),
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
    });
    const session = battleSessionAtState(baseSession, state);
    const act = actionRayOfFrostAct(session);
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
    const session = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption()],
      d20Statistics: testCharacterD20Statistics({ cha: 12 }),
      spellcastingAbilityModifier: 3,
    });
    const state = session.state;
    const act = actionRayOfFrostAct(session);
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
                original: DieRollResult(4),
                replacement: DieRollResult(8),
              },
              {
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

  test("rejects a second Empowered Spell application on the same cast", () => {
    const session = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption()],
    });
    const actor = requireBattleCreature(session.state, wizardId);
    const application = empoweredSpellMetamagicApplication(actor);
    if (application === null) {
      throw new Error("Expected the affordable Empowered Spell application.");
    }
    const issue =
      "Empowered Spell can combine only with a different Metamagic option.";

    expect(
      empoweredSpellStackingIssue({
        castApplications: [application],
        empoweredApplication: application,
      }),
    ).toBe(issue);
    expect(
      empoweredSpellDamageRerollOption({
        actor,
        castApplications: [application],
      }),
    ).toBeNull();
  });

  test("Empowered Spell can reroll damage after a different Metamagic option modified the spell", () => {
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption(), empoweredMetamagicOption()],
    });
    const state = session.state;
    const act = quickenedRayOfFrostAct(session);
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

  test("Empowered Spell damage reroll fill rejects unknown, unaffordable, mismatched, out-of-range, and over-limit selections before spending", () => {
    const cases = [
      {
        state: saveMetamagicBattle({
          knownOptions: [quickenedMetamagicOption()],
        }),
        attack: { total: 15, naturalD20: 10 },
        roll: [[4, 3]],
        rerolledDice: [
          {
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
            original: DieRollResult(7),
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
        attack: { total: 15, naturalD20: 10 },
        roll: [[4, 3]],
        rerolledDice: [
          {
            original: DieRollResult(4),
            replacement: DieRollResult(9),
          },
        ],
        expectedSorceryPoints: resourceCount(4),
        message:
          "Empowered Spell replacement rolls must fit the spell damage die size.",
      },
      {
        state: saveMetamagicBattle({
          knownOptions: [empoweredMetamagicOption()],
        }),
        attack: { total: 20, naturalD20: 20 },
        roll: [[1, 2, 3, 4]],
        rerolledDice: [
          {
            original: DieRollResult(1),
            replacement: DieRollResult(8),
          },
          {
            original: DieRollResult(2),
            replacement: DieRollResult(8),
          },
          {
            original: DieRollResult(3),
            replacement: DieRollResult(8),
          },
          {
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
        entry.state.state,
        act.subject,
        [target],
        "attackRoll",
      );
      const attackRoll = attackRollFill(attack, entry.attack);
      const damage = nextSpellHole(
        entry.state.state,
        act.subject,
        [target, attackRoll],
        "rolledDice",
      );

      expect(
        resolveBattleSubject({
          state: entry.state.state,
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
      expect(sorceryPointsRemaining(entry.state.state)).toBe(
        entry.expectedSorceryPoints,
      );
    }
  });

  test("Empowered Spell stays closed for Scorching Ray attack sequences until invocation-local one-use accounting exists", () => {
    const session = saveMetamagicBattle({
      knownOptions: [empoweredMetamagicOption()],
      preparedSpells: ["scorching_ray"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = actionScorchingRayAct(session);
    const fills: BattleFill[] = [];
    for (const target of targetChoiceHoles(act.initialHoles)) {
      fills.push(spellAttackSequenceTargetFill(target, skeletonId));
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
    const session = saveMetamagicBattle({
      knownOptions: [seekingMetamagicOption()],
    });
    const state = session.state;
    const act = actionRayOfFrostAct(session);
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

  test("rejects repeated Seeking Spell and requires an actor for combined use", () => {
    const session = saveMetamagicBattle({
      knownOptions: [seekingMetamagicOption()],
    });
    const actor = requireBattleCreature(session.state, wizardId);
    const application = seekingSpellMetamagicApplication(actor);
    if (application === null) {
      throw new Error("Expected the affordable Seeking Spell application.");
    }
    const stackingIssue =
      "Seeking Spell can combine only with a different Metamagic option.";

    expect(
      seekingSpellStackingIssue({
        castApplications: [application],
        seekingApplication: application,
      }),
    ).toBe(stackingIssue);
    expect(
      seekingSpellCombinedUseIssue({
        actor,
        castApplications: [application],
        seekingApplication: application,
      }),
    ).toBe(stackingIssue);
    expect(
      seekingSpellCombinedUseIssue({
        actor: undefined,
        castApplications: [],
        seekingApplication: application,
      }),
    ).toBe(
      "Seeking Spell requires a character that knows Seeking Spell and has enough Sorcery Points.",
    );
  });

  test("Seeking Spell can reroll a miss after a different Metamagic option modified the spell", () => {
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption(), seekingMetamagicOption()],
    });
    const state = session.state;
    const act = quickenedRayOfFrostAct(session);
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
    const session = saveMetamagicBattle({
      sorceryPoints: 2,
      knownOptions: [quickenedMetamagicOption(), seekingMetamagicOption()],
    });
    const state = session.state;
    const act = quickenedRayOfFrostAct(session);
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
      const session = saveMetamagicBattle({
        knownOptions: [seekingMetamagicOption()],
      });
      const state = session.state;
      const act = actionRayOfFrostAct(session);
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
    const session = saveMetamagicBattle({
      knownOptions: [seekingMetamagicOption()],
    });
    const state = session.state;
    const act = actionRayOfFrostAct(session);
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
        entry.state.state,
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
          state: entry.state.state,
          subject: act.subject,
          fills: [target, rerolledAttack],
        }),
      ).toMatchObject({ tag: "invalid", message: entry.message });
      expect(sorceryPointsRemaining(entry.state.state)).toBe(
        entry.expectedSorceryPoints,
      );
    }
  });

  test("Seeking Spell does not open for Scorching Ray attack sequences until invocation-local one-use accounting exists", () => {
    const session = saveMetamagicBattle({
      knownOptions: [seekingMetamagicOption()],
      preparedSpells: ["scorching_ray"],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = actionScorchingRayAct(session);
    const fills: BattleFill[] = [];
    for (const target of targetChoiceHoles(act.initialHoles)) {
      fills.push(spellAttackSequenceTargetFill(target, skeletonId));
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
    const act = discoverBattleActCandidates(state).find(
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
    const act = discoverBattleActCandidates(state).find(
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
                  original: DieRollResult(7),
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
    const session = metamagicBattle();
    const state = session.state;
    const afterPriorFreeSpell: BattleState = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        levelOnePlusSpellCastsThisTurn: [wizardId],
      },
    };

    expect(
      hasQuickenedCureWoundsAct(
        battleSessionAtState(session, afterPriorFreeSpell),
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: afterPriorFreeSpell,
        subject: quickenedCureWoundsSubject(
          battleSessionAtState(session, afterPriorFreeSpell),
        ),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Quickened Spell cannot modify a spell after this turn has already cast a level 1+ spell.",
    });

    const spellAttackSession = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const spellAttackState = spellAttackSession.state;
    const spellAttackAfterPriorFreeSpell: BattleState = {
      ...spellAttackState,
      currentTurnResources: {
        ...spellAttackState.currentTurnResources,
        levelOnePlusSpellCastsThisTurn: [wizardId],
      },
    };
    expect(
      hasQuickenedRayOfFrostAct(
        battleSessionAtState(
          spellAttackSession,
          spellAttackAfterPriorFreeSpell,
        ),
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: spellAttackAfterPriorFreeSpell,
        subject: quickenedRayOfFrostSubject(
          battleSessionAtState(
            spellAttackSession,
            spellAttackAfterPriorFreeSpell,
          ),
        ),
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

    const attackSequenceSession = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
      cantrips: ["eldritch_blast"],
    });
    const attackSequenceState = attackSequenceSession.state;
    const attackSequenceAfterPriorFreeSpell: BattleState = {
      ...attackSequenceState,
      currentTurnResources: {
        ...attackSequenceState.currentTurnResources,
        levelOnePlusSpellCastsThisTurn: [wizardId],
      },
    };
    expect(
      hasQuickenedEldritchBlastAct(
        battleSessionAtState(
          attackSequenceSession,
          attackSequenceAfterPriorFreeSpell,
        ),
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: attackSequenceAfterPriorFreeSpell,
        subject: quickenedEldritchBlastSubject(
          battleSessionAtState(
            attackSequenceSession,
            attackSequenceAfterPriorFreeSpell,
          ),
        ),
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
    const session = metamagicBattle({
      preparedSpells: ["healing_word"],
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = session.state;

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            spellSlotInvocationRef(
              "healing_word",
              1,
              "directHitPointRestoration",
            ),
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

  test("rejects Quickened subjects that bypass the admitted Bonus Action rewrite", () => {
    const session = metamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
      preparedSpells: ["false_life", "light"],
    });
    const state = session.state;
    const quickenedFalseLife = quickenedFalseLifeAct(session);

    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...quickenedFalseLife.subject,
          tag: "actionSpell",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Quickened Spell must use the Bonus Action spell subject.",
    });
    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            cantripSpellInvocationRef("light", "objectLight"),
          ),
          mode: { tag: "cast" },
          metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: QUICKENED_ACTION_SPELL_PROCEDURE_UNSUPPORTED_MESSAGE,
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("rejects Quickened reaction save-gated damage before Sorcery Point spending", () => {
    const session = metamagicBattle({
      preparedSpells: ["hellish_rebuke"],
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = session.state;

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "hellish_rebuke" &&
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
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            spellSlotInvocationRef("hellish_rebuke", 1, "saveGatedDamage"),
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
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = bonusActionSpent(session.state);

    expect(
      hasQuickenedBurningHandsAct(battleSessionAtState(session, state)),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: quickenedBurningHandsSubject(session),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Bonus Action spell is no longer available for the current actor.",
    });
    expect(sorceryPointsRemaining(state)).toBe(resourceCount(4));
  });

  test("rejects an admitted Quickened spell after its Bonus Action is spent", () => {
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const subject = quickenedBurningHandsSubject(session);
    const admission = admitBattleResolutionInput({
      state: session.state,
      subject,
      fills: [],
    });
    if (admission.tag !== "admitted") {
      throw new Error("Expected an admitted Quickened spell resolution input.");
    }

    const staleState = bonusActionSpent(admission.input.state);
    const staleSnapshot = snapshotBattle(staleState);
    const result = resolveBonusActionSpellAct(
      {
        ...admission.input,
        state: staleState,
      },
      spellProcedureExecutionRegistry(),
    );

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Bonus Action spell is no longer available for the current actor.",
    });
    if (result.tag !== "invalid") {
      throw new Error("Expected stale Quickened spell resolution rejection.");
    }
    expect(result.snapshot.combatants).toEqual(staleSnapshot.combatants);
    expect(result.snapshot.turn).toEqual(staleSnapshot.turn);
  });

  test("rejects Quickened spell attacks after the Bonus Action is spent", () => {
    const session = saveMetamagicBattle({
      knownOptions: [quickenedMetamagicOption()],
    });
    const state = bonusActionSpent(session.state);

    expect(
      hasQuickenedRayOfFrostAct(battleSessionAtState(session, state)),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: quickenedRayOfFrostSubject(session),
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

const SAVE_CONDITION_METAMAGIC_SORCERY_POINTS = resourceCount(2);
const CAREFUL_SAVE_CONDITION_PROTECTED_TARGET_ID = fighterId;
const CAREFUL_SPELL_PROTECTED_TARGET_MUST_SUCCEED_MESSAGE =
  "Careful Spell protected targets must be non-caster spell targets that succeed on the saving throw.";
type SaveConditionExpectedEffect =
  | Pick<
      Extract<BattleActiveEffect, { readonly kind: "conditionImmunity" }>,
      "kind" | "condition"
    >
  | Pick<
      Extract<BattleActiveEffect, { readonly kind: "faerieFireOutline" }>,
      "kind"
    >;
type SaveConditionMetamagicCaseShape = {
  readonly failedSaveTargetId: typeof fighterId;
  readonly carefulFailedSaveTargetIds: readonly (typeof fighterId)[];
  readonly expectedFailedSaveEffects: readonly SaveConditionExpectedEffect[];
} & (
  | { readonly preparedSpell: "calm_emotions"; readonly spellLevel: 2 }
  | { readonly preparedSpell: "faerie_fire"; readonly spellLevel: 1 }
);
const SAVE_CONDITION_METAMAGIC_CASES = [
  {
    preparedSpell: "calm_emotions",
    spellLevel: 2,
    failedSaveTargetId: fighterId,
    carefulFailedSaveTargetIds: [],
    expectedFailedSaveEffects: [
      { kind: "conditionImmunity", condition: "charmed" },
      { kind: "conditionImmunity", condition: "frightened" },
    ],
  },
  {
    preparedSpell: "faerie_fire",
    spellLevel: 1,
    failedSaveTargetId: skeletonId,
    carefulFailedSaveTargetIds: [skeletonId],
    expectedFailedSaveEffects: [{ kind: "faerieFireOutline" }],
  },
] as const satisfies readonly SaveConditionMetamagicCaseShape[];
type SaveConditionMetamagicSpellCase =
  (typeof SAVE_CONDITION_METAMAGIC_CASES)[number];

describe("battle runtime: Sorcerer save-affecting Metamagic", () => {
  test.each([
    {
      spellId: "calm_emotions" as const,
      procedure: "saveGatedConditionImmunity" as const,
      spellLevel: 2 as const,
    },
    {
      spellId: "faerie_fire" as const,
      procedure: "saveGatedAttackRollAdvantage" as const,
      spellLevel: 1 as const,
    },
  ])(
    "Careful $spellId exposes its protected-target hole before the Saving Throw",
    ({ spellId: selectedSpellId, procedure, spellLevel }) => {
      const session = saveMetamagicBattle({
        knownOptions: [carefulMetamagicOption()],
        classLevels: [
          { className: "sorcerer", level: 5 },
          { className: "bard", level: 3 },
        ],
        spellcastingSourceClassName: "bard",
        preparedSpells: [selectedSpellId],
        spellSlots: [{ spellLevel, count: 1 }],
      });
      const act = carefulSpellAct(session, spellId(selectedSpellId));
      const invocation = spellHoleInvocation(session, act.initialHoles);
      expect(invocation.procedure).toBe(procedure);

      const awaitingProtectedTargets = resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [],
      });

      expect(awaitingProtectedTargets).toMatchObject({
        tag: "needsHoles",
        holes: [
          expect.objectContaining({
            kind: "spellTargetList",
            label: "Spell Careful Spell protected targets",
          }),
        ],
      });
    },
  );

  test("discovers Heightened Burning Hands and spends Sorcery Points after choosing one disadvantaged target", () => {
    const heightenedOption = heightenedMetamagicOption();
    const session = saveMetamagicBattle({
      knownOptions: [heightenedOption],
    });
    const state = session.state;
    const act = heightenedBurningHandsAct(session);
    const heightenedHole = findHole(act.initialHoles, "targetChoice");
    const invocation = spellHoleInvocation(session, act.initialHoles);
    if (invocation.procedure !== "saveGatedDamage") {
      throw new Error("Expected Burning Hands save-gated damage invocation.");
    }

    expect(
      resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "targetChoice",
          label: "Spell Heightened Spell target",
        }),
      ],
    });
    expect(
      resolveAreaSaveMetamagicFills({
        state,
        subject: act.subject,
        actorId: wizardId,
        invocation,
        fills: [],
        metamagicApplications: [heightenedOption],
        savingThrowOutcomes: undefined,
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "targetChoice",
          label: "Spell Heightened Spell target",
        }),
      ],
    });
    expect(heightenedHole).toMatchObject({
      label: "Spell Heightened Spell target",
      choices: expect.arrayContaining([fighterId, skeletonId]),
    });
    expect(String(heightenedHole.holeId)).toContain(
      String(act.subject.procedureRef),
    );
    expect(String(heightenedHole.holeId)).not.toContain("burning_hands");
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
    const savingThrow = {
      kind: "savingThrowOutcome" as const,
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
    };

    expect(
      resolveAreaSaveMetamagicFills({
        state,
        subject: act.subject,
        actorId: wizardId,
        invocation,
        fills: [heightenedTarget, savingThrow],
        metamagicApplications: [heightenedOption],
        savingThrowOutcomes: savingThrow.value,
      }),
    ).toMatchObject({
      tag: "ready",
      carefulSpellProtectedTargetIds: [],
      heightenedSpellTargetId: skeletonId,
      savingThrowOutcomes: savingThrow.value,
    });

    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [heightenedTarget, savingThrow],
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
          savingThrow,
          damageRollFillWithGroups(damageHole, [[4, 3, 2]]),
        ],
      }),
    );

    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(8);
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(1);
    expect(sorceryPointsRemaining(resolved.state)).toBe(resourceCount(2));
    expect(sorcererSpellSlots(resolved.state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spellLevel: 1, expended: 1 }),
      ]),
    );
  });

  test("Heightened Dissonant Whispers uses its only spell target as the disadvantaged target", () => {
    const session = dissonantWhispersMetamagicBattle(
      heightenedMetamagicOption(),
    );
    const act = heightenedSpellAct(session, spellId("dissonant_whispers"));
    const targetHoles = act.initialHoles.filter(
      (hole) => hole.kind === "targetChoice",
    );

    expect(targetHoles.map((hole) => hole.label)).toEqual(["Spell target"]);
    const [spellTarget] = targetHoles;
    if (spellTarget === undefined) {
      throw new Error("Expected Dissonant Whispers spell target.");
    }
    const awaitingSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill(spellTarget, skeletonId)],
    });
    const saveHole = findHole(
      awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
      "savingThrowOutcome",
    );

    expect(saveHole).toMatchObject({
      targetRollModes: [{ targetId: skeletonId, rollMode: "disadvantage" }],
    });
  });

  test("Careful Dissonant Whispers uses its only spell target as the protected target", () => {
    const carefulOption = carefulMetamagicOption();
    const session = dissonantWhispersMetamagicBattle(carefulOption);
    const act = carefulSpellAct(session, spellId("dissonant_whispers"));
    const invocation = spellHoleInvocation(session, act.initialHoles);
    if (invocation.procedure !== "saveGatedDamage") {
      throw new Error(
        "Expected Dissonant Whispers save-gated damage invocation.",
      );
    }
    const targetHoles = act.initialHoles.filter(
      (hole) => hole.kind === "targetChoice",
    );

    expect(
      saveMetamagicSelectionState({
        state: session.state,
        actorId: wizardId,
        invocation,
        fills: [],
        metamagicApplications: [carefulOption],
        targetId: undefined,
      }),
    ).toEqual({
      tag: "ok",
      carefulSpellProtectedTargetIds: [],
      heightenedSpellTargetId: undefined,
    });
    expect(targetHoles.map((hole) => hole.label)).toEqual(["Spell target"]);
    expect(act.initialHoles).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellTargetList",
          label: "Spell Careful Spell protected targets",
        }),
      ]),
    );
    const [spellTarget] = targetHoles;
    if (spellTarget === undefined) {
      throw new Error("Expected Dissonant Whispers spell target.");
    }
    const target = targetFill(spellTarget, skeletonId);
    const awaitingSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [target],
    });
    const saveHole = findHole(
      awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          target,
          {
            kind: "savingThrowOutcome",
            holeId: saveHole.holeId,
            value: {
              outcomes: [{ targetId: skeletonId, succeeded: false }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: CAREFUL_SPELL_PROTECTED_TARGET_MUST_SUCCEED_MESSAGE,
    });
  });

  test("Heightened Color Spray discovers its disadvantaged target before the area save", () => {
    const session = saveMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
      cantrips: [],
      preparedSpells: ["color_spray"],
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 3 },
        { spellLevel: 3, count: 2 },
      ],
    });
    const act = heightenedSpellAct(session, spellId("color_spray"));
    const heightenedTarget = findHole(act.initialHoles, "targetChoice");

    expect(heightenedTarget).toMatchObject({
      label: "Spell Heightened Spell target",
      choices: expect.arrayContaining([fighterId, skeletonId]),
    });
    const awaitingSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill(heightenedTarget, skeletonId)],
    });
    const saveHole = findHole(
      awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
      "savingThrowOutcome",
    );

    expect(saveHole).toMatchObject({
      targetRollModes: [{ targetId: skeletonId, rollMode: "disadvantage" }],
    });
  });

  test.each(SAVE_CONDITION_METAMAGIC_CASES)(
    "Heightened $preparedSpell projects Disadvantage and resolves failed-save effects",
    (spellCase) => {
      const metamagicOption = heightenedMetamagicOption();
      const session = bardSorcererSaveMetamagicBattle({
        metamagicOption,
        spellCase,
      });
      const act = heightenedSpellAct(session, spellId(spellCase.preparedSpell));
      const selectionHole = findHole(act.initialHoles, "targetChoice");
      const selectionFill = targetFill(
        selectionHole,
        spellCase.failedSaveTargetId,
      );
      const awaitingSave = resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [selectionFill],
      });
      const saveHole = findHole(
        awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
        "savingThrowOutcome",
      );

      expect(selectionHole).toMatchObject({
        label: "Spell Heightened Spell target",
        choices: expect.arrayContaining([spellCase.failedSaveTargetId]),
      });
      expect(saveHole).toMatchObject({
        targetRollModes: [
          {
            targetId: spellCase.failedSaveTargetId,
            rollMode: "disadvantage",
          },
        ],
      });

      const resolved = requireResolved(
        resolveBattleSubject({
          state: session.state,
          subject: act.subject,
          fills: [
            selectionFill,
            savingThrowOutcomeFill(saveHole, [
              {
                targetId: spellCase.failedSaveTargetId,
                succeeded: false,
              },
            ]),
          ],
        }),
      );

      expect(
        resolved.state.combatants.get(spellCase.failedSaveTargetId)
          ?.activeEffects,
      ).toEqual(
        expect.arrayContaining(
          spellCase.expectedFailedSaveEffects.map((effect) =>
            expect.objectContaining(effect),
          ),
        ),
      );
      expectSaveConditionMetamagicResources({
        state: resolved.state,
        metamagicOption,
        spellCase,
      });
    },
  );

  test("Heightened Spell Disadvantage cancels an existing save Advantage source", () => {
    const baseSession = saveMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const base = baseSession.state;
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
    const act = heightenedBurningHandsAct(
      battleSessionAtState(baseSession, state),
    );
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
    ).toEqual({ targetId: skeletonId, rollMode: "normal" });
  });

  test("Heightened Spell rejects a disadvantaged target outside the affected spell targets", () => {
    const session = saveMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const state = session.state;
    const act = heightenedBurningHandsAct(session);
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
    const session = saveMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const state = session.state;
    const act = carefulBurningHandsAct(session);
    const protectedTargetsHole = findHole(act.initialHoles, "spellTargetList");

    expect(
      resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "spellTargetList",
          label: "Spell Careful Spell protected targets",
        }),
      ],
    });
    expect(protectedTargetsHole).toMatchObject({
      label: "Spell Careful Spell protected targets",
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
    expect(sorcererSpellSlots(resolved.state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spellLevel: 1, expended: 1 }),
      ]),
    );
  });

  test.each(SAVE_CONDITION_METAMAGIC_CASES)(
    "Careful $preparedSpell enforces protected success and resolves other failed-save effects",
    (spellCase) => {
      const metamagicOption = carefulMetamagicOption();
      const session = bardSorcererSaveMetamagicBattle({
        metamagicOption,
        spellCase,
      });
      const act = carefulSpellAct(session, spellId(spellCase.preparedSpell));
      const selectionHole = findHole(act.initialHoles, "spellTargetList");
      const selectionFill = {
        kind: "spellTargetList" as const,
        holeId: selectionHole.holeId,
        value: { targetIds: [CAREFUL_SAVE_CONDITION_PROTECTED_TARGET_ID] },
        spatialFacts: [],
      };
      const awaitingSave = resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [selectionFill],
      });
      const saveHole = findHole(
        awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
        "savingThrowOutcome",
      );
      const otherFailedOutcomes = spellCase.carefulFailedSaveTargetIds.map(
        (targetId) => ({ targetId, succeeded: false }),
      );

      expect(selectionHole).toMatchObject({
        label: "Spell Careful Spell protected targets",
        choices: expect.arrayContaining([
          CAREFUL_SAVE_CONDITION_PROTECTED_TARGET_ID,
        ]),
      });
      expect(
        resolveBattleSubject({
          state: session.state,
          subject: act.subject,
          fills: [
            selectionFill,
            savingThrowOutcomeFill(saveHole, [
              {
                targetId: CAREFUL_SAVE_CONDITION_PROTECTED_TARGET_ID,
                succeeded: false,
              },
              ...otherFailedOutcomes,
            ]),
          ],
        }),
      ).toMatchObject({
        tag: "invalid",
        message: CAREFUL_SPELL_PROTECTED_TARGET_MUST_SUCCEED_MESSAGE,
      });
      const resolved = requireResolved(
        resolveBattleSubject({
          state: session.state,
          subject: act.subject,
          fills: [
            selectionFill,
            savingThrowOutcomeFill(saveHole, [
              {
                targetId: CAREFUL_SAVE_CONDITION_PROTECTED_TARGET_ID,
                succeeded: true,
              },
              ...otherFailedOutcomes,
            ]),
          ],
        }),
      );

      expect(
        resolved.state.combatants.get(
          CAREFUL_SAVE_CONDITION_PROTECTED_TARGET_ID,
        )?.activeEffects,
      ).toEqual([]);
      for (const targetId of spellCase.carefulFailedSaveTargetIds) {
        expect(resolved.state.combatants.get(targetId)?.activeEffects).toEqual(
          expect.arrayContaining(
            spellCase.expectedFailedSaveEffects.map((effect) =>
              expect.objectContaining(effect),
            ),
          ),
        );
      }
      expectSaveConditionMetamagicResources({
        state: resolved.state,
        metamagicOption,
        spellCase,
      });
    },
  );

  test("Careful Command requests protected targets before the saving throw", () => {
    const session = commandMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const act = carefulCommandAct(session);
    const targetHole = requireSpellTargetListHole(
      act.initialHoles,
      "Spell targets",
    );
    const commandOptionHole = findHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(targetHole, "command", [skeletonId]);
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOptionHole.holeId,
      value: "halt",
    };
    const needsProtectedTargets = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });

    expect(needsProtectedTargets).toMatchObject({ tag: "needsHoles" });
    if (needsProtectedTargets.tag !== "needsHoles") {
      throw new Error("Expected Careful Command protected-target hole.");
    }
    expect(needsProtectedTargets.holes).toHaveLength(1);
    expect(needsProtectedTargets.holes[0]).toMatchObject({
      kind: "spellTargetList",
      label: "Spell Careful Spell protected targets",
      maxTargets: 3,
      choices: expect.arrayContaining([skeletonId]),
    });
    expect(
      needsProtectedTargets.holes.some(
        (hole) => hole.kind === "savingThrowOutcome",
      ),
    ).toBe(false);
  });

  test("Careful Spell is admitted for target-list save spells such as Command", () => {
    const session = commandMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const state = session.state;
    const act = carefulCommandAct(session);
    const targetHole = requireSpellTargetListHole(
      act.initialHoles,
      "Spell targets",
    );
    const protectedTargetsHole = requireSpellTargetListHole(
      act.initialHoles,
      "Spell Careful Spell protected targets",
    );
    const commandOptionHole = findHole(act.initialHoles, "commandOptionChoice");

    expect(targetHole.label).toBe("Spell targets");
    expect(protectedTargetsHole).toMatchObject({
      label: "Spell Careful Spell protected targets",
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
    const session = saveMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const state = session.state;
    const act = carefulBurningHandsAct(session);
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

  test("Careful Spell rejects duplicate protected targets", () => {
    const session = saveMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const state = session.state;
    const act = carefulBurningHandsAct(session);
    const protectedTargetsHole = findHole(act.initialHoles, "spellTargetList");
    const protectedTargetsFill = {
      kind: "spellTargetList" as const,
      holeId: protectedTargetsHole.holeId,
      value: { targetIds: [fighterId, fighterId] },
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

    const resolved = resolveBattleSubject({
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
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      message: "Careful Spell protected targets must not repeat.",
    });
  });

  test("Careful Spell rejects explicitly empty protected-target selections before spending resources", () => {
    const session = saveMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const state = session.state;
    const act = carefulBurningHandsAct(session);
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
    const session = saveMetamagicBattle({
      sorceryPoints: 0,
      knownOptions: [carefulMetamagicOption()],
    });
    const state = session.state;

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "burning_hands" &&
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
          ...burningHandsActionSubject(session),
          metamagic: [{ effectKind: CAREFUL_METAMAGIC_EFFECT_KIND }],
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Metamagic requires enough unexpended Sorcery Points.",
    });
  });

  test("rejects non-save Metamagic effects at the save-specific support boundary", () => {
    const { invocation } = burningHandsMetamagicContext({
      knownOptions: [subtleMetamagicOption()],
    });

    expect(
      saveMetamagicSupportIssue({
        effectKinds: new Set([SUBTLE_METAMAGIC_EFFECT_KIND]),
        invocation,
        subject: { tag: "actionSpell", mode: { tag: "cast" } },
      }),
    ).toBe(
      "Selected Metamagic option effect is not supported for this spell procedure.",
    );
  });

  test("Careful Spell rejects non-save spell procedures", () => {
    const session = metamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const state = session.state;

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "cure_wounds" &&
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
          ...cureWoundsActionSubject(session),
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
    const session = sleepMetamagicBattle({
      knownOptions: [carefulMetamagicOption()],
    });
    const state = session.state;
    const sleepAct = sleepActionAct(session);

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "sleep" &&
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
      hasHeightenedActionSpellAct(gustOfWindState, spellId("gust_of_wind")),
    ).toBe(true);
    expect(
      hasHeightenedActionSpellAct(
        saveGatedConditionState,
        spellId("blindness_deafness"),
      ),
    ).toBe(true);
  });

  test("save-affecting Metamagic is explicitly closed for Ready spell mode", () => {
    const session = saveMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const state = session.state;
    const readyAct = readyBurningHandsAct(session);

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
    const session = sleepMetamagicBattle({
      knownOptions: [heightenedMetamagicOption()],
    });
    const state = session.state;
    const sleepAct = sleepActionAct(session);

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "sleep" &&
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

function expectRight<T, E>(result: Result.Result<T, E>): T {
  if (Result.isFailure(result)) {
    throw new Error(`Expected Right, got ${JSON.stringify(result.failure)}`);
  }
  return result.success;
}

function battleSessionAtState(
  session: BattleRuntimeSession,
  state: BattleState,
): BattleRuntimeSession {
  return battleRuntimeSessionForTest({ state, context: session.context });
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
  session: BattleRuntimeSession,
  targetSpellId: Parameters<typeof spellRecord>[0],
  procedure: SpellSlotInvocationRefProcedure,
): ReturnType<typeof supportedSpellActs>[number] {
  const actor = requireBattleCreature(session.state, wizardId);
  const act = discoverBattleActs(session).find(
    (candidate) =>
      (candidate.subject.tag === "actionSpell" ||
        candidate.subject.tag === "bonusActionSpell") &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        targetSpellId &&
      battleActSpellPresentation(candidate)?.invocation.procedure === procedure,
  );
  if (
    act === undefined ||
    (act.subject.tag !== "actionSpell" &&
      act.subject.tag !== "bonusActionSpell")
  ) {
    throw new Error(`Expected ${targetSpellId} ${procedure} act.`);
  }
  const procedureRef = act.subject.procedureRef;
  const invocation = supportedSpellActs(session.state, actor).find(
    (candidate) => candidate.sourceProcedureRef === procedureRef,
  );
  if (invocation === undefined) {
    throw new Error(`Expected ${targetSpellId} ${procedure} invocation.`);
  }
  return invocation;
}

function admittedSubtleProjection(
  state: BattleState,
  invocation: ReturnType<typeof supportedSpellActs>[number],
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
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(spellRecord("sanctuary").id),
    ),
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
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(spellRecord("mirror_image").id),
    ),
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
          {
            kind: "spellTarget",
            casterId: wizardId,
            targetId,
            sourceProcedureRef: hole.triggeringProcedureRef,
          },
        ],
        replacementTargetKind: "attackRoll",
        ...("relationshipFactRequest" in hole &&
        hole.relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
          ? {
              relationshipFacts: [
                {
                  kind: "attackRollTargetIsEnemy" as const,
                  attackerId: hole.relationshipFactRequest.attackerId,
                  targetId,
                  targetIsEnemy: true,
                },
              ],
            }
          : {}),
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

function clericSorcererQuickenedCureWoundsBattle(): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle:cleric-sorcerer-metamagic-quickened"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Cleric/Sorcerer",
        initiative: 20,
        attack: null,
        classLevels: [
          { className: "cleric", level: 1 },
          { className: "sorcerer", level: 5 },
        ],
        resources: [
          innateSorceryResource(),
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: [
            quickenedMetamagicOption(),
            empoweredMetamagicOption(),
          ],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("cure_wounds")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "cleric",
            abilityModifier: 3,
          },
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Wounded Ally",
        initiative: 10,
        currentHp: 4,
        maxHp: 20,
      }),
    ],
  });
}

function metamagicBattle(input?: {
  readonly sorceryPoints?: number;
  readonly knownOptions?: readonly MetamagicOptionFixture[];
  readonly preparedSpells?: readonly Parameters<typeof spellRecord>[0][];
}): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle:sorcerer-metamagic-quickened"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(input?.sorceryPoints ?? 4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
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
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "sorcerer",
            abilityModifier: 3,
          },
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Wounded Ally",
        initiative: 10,
        currentHp: 4,
        maxHp: 20,
      }),
    ],
  });
}

function burningHandsMetamagicContext(
  input: Pick<
    Parameters<typeof saveMetamagicBattle>[0],
    "knownOptions" | "sorceryPoints"
  >,
) {
  const session = saveMetamagicBattle(input);
  return {
    session,
    actor: requireBattleCreature(session.state, wizardId),
    invocation: supportedInvocationFor(
      session,
      "burning_hands",
      "saveGatedDamage",
    ),
  };
}

function dissonantWhispersMetamagicBattle(
  knownOption: MetamagicOptionFixture,
): BattleRuntimeSession {
  return saveMetamagicBattle({
    knownOptions: [knownOption],
    classLevels: [
      { className: "sorcerer", level: 5 },
      { className: "bard", level: 1 },
    ],
    spellcastingSourceClassName: "bard",
    spellcastingProficiencyBonus: proficiencyBonus(3),
    cantrips: [],
    preparedSpells: ["dissonant_whispers"],
    spellSlots: [
      { spellLevel: 1, count: 4 },
      { spellLevel: 2, count: 3 },
      { spellLevel: 3, count: 3 },
    ],
  });
}

function bardSorcererSaveMetamagicBattle(input: {
  readonly metamagicOption: MetamagicOptionFixture;
  readonly spellCase: SaveConditionMetamagicSpellCase;
}): BattleRuntimeSession {
  return saveMetamagicBattle({
    sorceryPoints: SAVE_CONDITION_METAMAGIC_SORCERY_POINTS,
    knownOptions: [input.metamagicOption],
    classLevels: [
      { className: "bard", level: 3 },
      { className: "sorcerer", level: 2 },
    ],
    spellcastingSourceClassName: "bard",
    cantrips: [],
    preparedSpells: [input.spellCase.preparedSpell],
    spellSlots: [
      { spellLevel: 1, count: 4 },
      { spellLevel: 2, count: 3 },
      { spellLevel: 3, count: 2 },
    ],
  });
}

function expectSaveConditionMetamagicResources(input: {
  readonly state: BattleState;
  readonly metamagicOption: MetamagicOptionFixture;
  readonly spellCase: SaveConditionMetamagicSpellCase;
}): void {
  expect(sorceryPointsRemaining(input.state)).toBe(
    resourceCount(
      SAVE_CONDITION_METAMAGIC_SORCERY_POINTS -
        input.metamagicOption.sorceryPointCost,
    ),
  );
  expect(sorcererSpellSlots(input.state)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        spellLevel: input.spellCase.spellLevel,
        expended: 1,
      }),
    ]),
  );
}

function saveMetamagicBattle(input: {
  readonly sorceryPoints?: number;
  readonly knownOptions: readonly MetamagicOptionFixture[];
  readonly classLevels?: NonNullable<
    Parameters<typeof characterSeed>[0]["classLevels"]
  >;
  readonly spellcastingSourceClassName?: Extract<
    ReturnType<typeof wizardSpellcasting>["spellcastingSource"],
    { readonly tag: "classSpellcasting" }
  >["className"];
  readonly spellcastingProficiencyBonus?: ProficiencyBonus;
  readonly cantrips?: readonly ("eldritch_blast" | "ray_of_frost")[];
  readonly preparedSpells?: readonly (
    | "burning_hands"
    | "calm_emotions"
    | "color_spray"
    | "dissonant_whispers"
    | "faerie_fire"
    | "scorching_ray"
  )[];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3;
    readonly count: number;
  }[];
  readonly d20Statistics?: ReturnType<typeof testCharacterD20Statistics>;
  readonly spellcastingAbilityModifier?: number;
}): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle:sorcerer-metamagic-save"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        attack: null,
        classLevels: input.classLevels ?? [{ className: "sorcerer", level: 5 }],
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
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
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
          proficiencyBonus:
            input.spellcastingProficiencyBonus ?? proficiencyBonus(3),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: input.spellcastingSourceClassName ?? "sorcerer",
            abilityModifier: 3,
          },
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Nearby Ally",
        initiative: 12,
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
}): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle:sorcerer-metamagic-quickened-profiles"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
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
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: [quickenedMetamagicOption()],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: input.preparedSpells.map(spellRecord),
            spellSlots: input.spellSlots,
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "sorcerer",
            abilityModifier: 3,
          },
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Nearby Ally",
        initiative: 12,
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
  sorceryPointsRemaining = resourceCount(4),
): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle:sorcerer-metamagic-twinned-target-count"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Cleric/Sorcerer",
        initiative: 20,
        attack: null,
        classLevels: [
          { className: "cleric", level: 1 },
          { className: "sorcerer", level: 5 },
        ],
        currentHp: 18,
        maxHp: 18,
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: sorceryPointsRemaining,
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: [twinnedMetamagicOption()],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("bless")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "cleric",
            abilityModifier: 3,
          },
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Nearby Ally",
        initiative: 12,
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
}): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle:sorcerer-metamagic-command"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
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
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input.knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("command")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "sorcerer",
            abilityModifier: 3,
          },
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Nearby Ally",
        initiative: 12,
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
}): BattleRuntimeSession {
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
}): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle:sorcerer-metamagic-repeat-save"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
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
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input.knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord(input.preparedSpell)],
            spellSlots: [{ spellLevel: input.spellSlotLevel, count: 1 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "sorcerer",
            abilityModifier: 3,
          },
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
}): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle:sorcerer-metamagic-sleep"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
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
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input.knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "sorcerer",
            abilityModifier: 3,
          },
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

function cureWoundsActionSubject(
  session: BattleRuntimeSession,
): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  return {
    tag: "actionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      spellSlotInvocationRef("cure_wounds", 1, "directHitPointRestoration"),
    ),
    mode: { tag: "cast" },
  };
}

function burningHandsActionSubject(
  session: BattleRuntimeSession,
): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  return {
    tag: "actionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      spellSlotInvocationRef("burning_hands", 1, "saveGatedDamage"),
    ),
    mode: { tag: "cast" },
  };
}

function rayOfFrostActionSubject(
  session: BattleRuntimeSession,
): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  return {
    tag: "actionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    ),
    mode: { tag: "cast" },
  };
}

function transmutedScorchingRayToPoisonAct(
  session: BattleRuntimeSession,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        { readonly tag: "actionSpell" }
      >;
    } =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "spellAttackSequence" &&
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

function actionRayOfFrostAct(
  session: BattleRuntimeSession,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        { readonly tag: "actionSpell" }
      >;
    } =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "ray_of_frost" &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "spellAttackDamage",
  );
  if (act === undefined) {
    throw new Error("Expected Ray of Frost action spell act.");
  }
  return act;
}

function actionScorchingRayAct(
  session: BattleRuntimeSession,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        { readonly tag: "actionSpell" }
      >;
    } =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "scorching_ray" &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "spellAttackSequence",
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
  spellDamageReroll: Omit<
    NonNullable<
      Extract<BattleFill, { readonly kind: "rolledDice" }>["spellDamageReroll"]
    >,
    "dice"
  > & {
    readonly dice: readonly [
      {
        readonly original: ReturnType<typeof DieRollResult>;
        readonly replacement: ReturnType<typeof DieRollResult>;
      },
      ...{
        readonly original: ReturnType<typeof DieRollResult>;
        readonly replacement: ReturnType<typeof DieRollResult>;
      }[],
    ];
  },
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const damageRoll = damageRollFillWithGroups(hole, groups);
  if (damageRoll.kind !== "rolledDice") {
    throw new Error("Expected rolledDice fill.");
  }
  const [firstDie, ...remainingDice] = spellDamageReroll.dice;
  const rerolledDie = (die: typeof firstDie) => ({
    original: die.original,
    replacement: die.replacement,
  });
  return {
    ...damageRoll,
    spellDamageReroll: {
      ...spellDamageReroll,
      dice: [rerolledDie(firstDie), ...remainingDice.map(rerolledDie)],
    },
  };
}

function assertTransmutedDamageHole(damageHole: BattleHole): void {
  if (
    damageHole.kind !== "rolledDice" ||
    !("critical" in damageHole) ||
    damageHole.critical
  ) {
    throw new Error("Expected a noncritical Transmuted Spell damage hole.");
  }
  expect("spell" in damageHole).toBe(false);
}

function quickenedCureWoundsSubject(
  session: BattleRuntimeSession,
): Extract<BattleSubject, { readonly tag: "bonusActionSpell" }> {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      spellSlotInvocationRef("cure_wounds", 1, "directHitPointRestoration"),
    ),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

function quickenedBurningHandsSubject(
  session: BattleRuntimeSession,
): Extract<BattleSubject, { readonly tag: "bonusActionSpell" }> {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      spellSlotInvocationRef("burning_hands", 1, "saveGatedDamage"),
    ),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

function quickenedRayOfFrostSubject(
  session: BattleRuntimeSession,
): Extract<BattleSubject, { readonly tag: "bonusActionSpell" }> {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    ),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

function quickenedEldritchBlastSubject(
  session: BattleRuntimeSession,
): Extract<BattleSubject, { readonly tag: "bonusActionSpell" }> {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("eldritch_blast", "spellAttackSequence"),
    ),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

function quickenedScorchingRaySubject(
  session: BattleRuntimeSession,
): Extract<BattleSubject, { readonly tag: "bonusActionSpell" }> {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      spellSlotInvocationRef("scorching_ray", 2, "spellAttackSequence"),
    ),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

function hasQuickenedCureWoundsAct(session: BattleRuntimeSession): boolean {
  return discoverBattleActs(session).some(isQuickenedCureWoundsAct);
}

function hasQuickenedBurningHandsAct(session: BattleRuntimeSession): boolean {
  return discoverBattleActs(session).some(isQuickenedBurningHandsAct);
}

function hasQuickenedRayOfFrostAct(session: BattleRuntimeSession): boolean {
  return discoverBattleActs(session).some(isQuickenedRayOfFrostAct);
}

function hasQuickenedEldritchBlastAct(session: BattleRuntimeSession): boolean {
  return discoverBattleActs(session).some(
    (candidate) =>
      isQuickenedSpellAttackSequenceAct(candidate) &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "eldritch_blast",
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
    battleActSpellPresentation(candidate)?.invocation.spellId ===
      "cure_wounds" &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedCureWoundsAct(
  session: BattleRuntimeSession,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(session).find(isQuickenedCureWoundsAct);
  if (act === undefined) {
    throw new Error("Expected Quickened Cure Wounds act.");
  }
  return act;
}

function quickenedFalseLifeAct(
  session: BattleRuntimeSession,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "false_life" &&
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
    battleActSpellPresentation(candidate)?.invocation.spellId ===
      "burning_hands" &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedBurningHandsAct(
  session: BattleRuntimeSession,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(session).find(isQuickenedBurningHandsAct);
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
    battleActSpellPresentation(candidate)?.invocation.spellId ===
      "ray_of_frost" &&
    candidate.subject.metamagic?.length === 1 &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedRayOfFrostAct(
  session: BattleRuntimeSession,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(session).find(isQuickenedRayOfFrostAct);
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
    battleActSpellPresentation(candidate)?.invocation.procedure ===
      "spellAttackSequence" &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedEldritchBlastAct(
  session: BattleRuntimeSession,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      isQuickenedSpellAttackSequenceAct(candidate) &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "eldritch_blast",
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Eldritch Blast act.");
  }
  return act;
}

function quickenedScorchingRayAct(
  session: BattleRuntimeSession,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      isQuickenedSpellAttackSequenceAct(candidate) &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "scorching_ray",
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Scorching Ray act.");
  }
  return act;
}

function resolveQuickenedEldritchBlast(
  session: BattleRuntimeSession,
): BattleState {
  const state = session.state;
  const act = quickenedEldritchBlastAct(session);
  const targets = targetChoiceHoles(act.initialHoles);
  const firstTarget = spellAttackSequenceTargetFill(targets[0]!, skeletonId);
  const secondTarget = spellAttackSequenceTargetFill(targets[1]!, skeletonId);
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
  session: BattleRuntimeSession,
  act: QuickenedBonusActionSpellAct = quickenedScorchingRayAct(session),
): BattleState {
  const state = session.state;
  const fills: BattleFill[] = targetChoiceHoles(act.initialHoles).map((hole) =>
    spellAttackSequenceTargetFill(hole, skeletonId),
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
): BattleFill {
  return targetFill(hole, targetId);
}

function quickenedSpellAct(
  session: BattleRuntimeSession,
  spellId: "bless" | "calm_emotions" | "color_spray" | "invisibility",
  procedure: SpellInvocationRef["procedure"],
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === spellId &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        procedure &&
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
  session: BattleRuntimeSession,
  spellId: SpellInvocationRef["spellId"],
): boolean {
  return discoverBattleActs(session).some(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === spellId &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
}

function heightenedBurningHandsAct(
  session: BattleRuntimeSession,
): ActionSpellAct {
  return heightenedSpellAct(session, spellId("burning_hands"));
}

function heightenedSpellAct(
  session: BattleRuntimeSession,
  selectedSpellId: SpellInvocationRef["spellId"],
): ActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        selectedSpellId &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error(`Expected Heightened ${selectedSpellId} act.`);
  }
  return act;
}

function carefulBurningHandsAct(session: BattleRuntimeSession): ActionSpellAct {
  return carefulSpellAct(session, spellId("burning_hands"));
}

function carefulSpellAct(
  session: BattleRuntimeSession,
  selectedSpellId: SpellInvocationRef["spellId"],
): ActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        selectedSpellId &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error(`Expected Careful ${selectedSpellId} act.`);
  }
  return act;
}

function carefulCommandAct(session: BattleRuntimeSession): ActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === "command" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Careful Command act.");
  }
  return act;
}

function twinnedBlessAct(session: BattleRuntimeSession): ActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === "bless" &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "rollModifier" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Twinned Bless act.");
  }
  return act;
}

function readyBurningHandsAct(session: BattleRuntimeSession): ActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "burning_hands" &&
      candidate.subject.mode.tag === "ready",
  );
  if (act === undefined) {
    throw new Error("Expected Ready Burning Hands act.");
  }
  return act;
}

function sleepActionAct(session: BattleRuntimeSession): ActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === "sleep" &&
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
  _spellId: "bless" | "burning_hands" | "command" | "invisibility",
  targetIds: readonly ReturnType<typeof combatantId>[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  const relationshipFactRequest = hole.relationshipFactRequest;
  const relationshipFacts =
    relationshipFactRequest?.kind === "spellTargetIsHostileToCaster" &&
    targetIds[0] !== undefined
      ? ([
          {
            kind: "spellTargetIsHostileToCaster" as const,
            casterId: relationshipFactRequest.casterId,
            targetId: targetIds[0],
            sourceProcedureRef: relationshipFactRequest.sourceProcedureRef,
            targetIsHostileToCaster: true,
          },
          ...targetIds.slice(1).map((targetId) => ({
            kind: "spellTargetIsHostileToCaster" as const,
            casterId: relationshipFactRequest.casterId,
            targetId,
            sourceProcedureRef: relationshipFactRequest.sourceProcedureRef,
            targetIsHostileToCaster: true,
          })),
        ] as const)
      : undefined;
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    ...(relationshipFacts === undefined ? {} : { relationshipFacts }),
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget" as const,
      casterId: relationshipFactRequest?.casterId ?? wizardId,
      targetId,
      sourceProcedureRef:
        relationshipFactRequest?.sourceProcedureRef ??
        battleProcedureExecutionRefForSpellHoleForTest(hole),
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
  const target = targetFill(targetHole, fighterId);
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
  const resourcePoolRef = actor.origin.metamagic?.sorceryPointResourcePoolRef;
  const resource = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  if (resource === undefined || !characterBattleResourceIsPointPool(resource)) {
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
