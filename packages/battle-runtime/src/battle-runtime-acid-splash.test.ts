import {
  startBattleRight,
  requireResolved,
  requireHole,
  concentrationSavingThrowFill,
  savingThrowOutcomeFill,
  damageRollFill,
  characterSeed,
  statBlockCreatureInit,
  skeletonCreatureInit,
  wizardVsSkeletonBattle,
  wizardSpellcasting,
  acidSplashWithRadius,
  magicSubject,
  expendedLevelOneSlots,
  skeletonId,
  wizardId,
  secondSkeletonId,
  statBlockCatalog,
  battleId,
  discoverBattleActs,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Acid Splash", () => {
  test("Acid Splash support is gated to the authored 5-foot point-origin Sphere", () => {
    const unsupportedState = startBattleRight({
      battleId: battleId("battle-acid-splash-unsupported-area"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [acidSplashWithRadius(10)],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      discoverBattleActs(unsupportedState).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        { tag: "action", actorId: wizardId, action: "grapple" },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        { tag: "runtimeCommand", actorId: wizardId, command: "move" },
        { tag: "runtimeCommand", actorId: wizardId, command: "endTurn" },
      ]),
    );
  });

  test("Acid Splash save-gate damage applies only to failed Saving Throws", () => {
    const state = wizardVsSkeletonBattle({
      extraCombatants: [
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const subject = magicSubject("acid_splash");
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Acid Splash point-origin Sphere Saving Throw outcomes",
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: [],
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
            {
              targetId: secondSkeletonId,
              succeeded: true,
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Acid Splash damage (1d6-acid)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: false },
          {
            targetId: secondSkeletonId,
            succeeded: true,
          },
        ]),
        damageRollFill(damage, 4),
      ],
    });
    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 9 },
          { combatantId: secondSkeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);

    const allSucceeded = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: true },
          {
            targetId: secondSkeletonId,
            succeeded: true,
          },
        ]),
      ],
    });
    expect(allSucceeded).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
          { combatantId: secondSkeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
  });

  test("Acid Splash damage requests and consumes Concentration saves", () => {
    const baseState = wizardVsSkeletonBattle();
    const skeleton = baseState.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton in battle.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(skeletonId, {
        ...skeleton,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = magicSubject("acid_splash");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: wizardId, succeeded: true },
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    const needsConcentration = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: wizardId, succeeded: true },
          { targetId: skeletonId, succeeded: false },
        ]),
        damageRollFill(damage, 4),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );

    expect(concentration).toMatchObject({
      combatantId: skeletonId,
      dc: 10,
      damageAmount: 4,
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: wizardId, succeeded: true },
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFill(damage, 4),
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 9, concentrating: false },
        ],
      },
    });
  });
});
