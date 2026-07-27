import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import {
  requireCharacterSpellProcedureRefForTest,
  startBattleSessionRight,
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
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Acid Splash", () => {
  test("Acid Splash support is gated to the authored 5-foot point-origin Sphere", () => {
    const unsupportedSession = startBattleSessionRight({
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
      discoverBattleActs(unsupportedSession).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        { tag: "action", actorId: wizardId, action: "grapple" },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            unsupportedSession,
            wizardId,
            spellSlotInvocationRef(
              "magic_missile",
              1,
              "repeatedDamageAllocation",
            ),
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            unsupportedSession,
            wizardId,
            spellSlotInvocationRef(
              "magic_missile",
              1,
              "repeatedDamageAllocation",
            ),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            unsupportedSession,
            wizardId,
            spellSlotInvocationRef(
              "magic_missile",
              1,
              "repeatedDamageAllocation",
            ),
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            unsupportedSession,
            wizardId,
            spellSlotInvocationRef(
              "magic_missile",
              1,
              "repeatedDamageAllocation",
            ),
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            unsupportedSession,
            wizardId,
            spellSlotInvocationRef(
              "magic_missile",
              1,
              "repeatedDamageAllocation",
            ),
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        { tag: "runtimeCommand", actorId: wizardId, command: "move" },
        { tag: "runtimeCommand", actorId: wizardId, command: "endTurn" },
      ]),
    );
  });

  test("Acid Splash save-gate damage applies only to failed Saving Throws", () => {
    const session = wizardVsSkeletonBattle({
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
        session,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Spell point-origin Sphere Saving Throw outcomes",
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: [],
    });
    const damage = requireHole(
      resolveBattleSubject({
        session,
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
      label: "Spell damage (1d6-acid)",
    });

    const result = resolveBattleSubject({
      session,
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
      session,
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
    const baseSession = wizardVsSkeletonBattle();
    const baseState = baseSession.state;
    const skeleton = baseState.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton in battle.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(skeletonId, {
        ...skeleton,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("mage_armor"),
          ),
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const session = battleRuntimeSessionForTest({ ...baseSession, state });
    const subject = magicSubject("acid_splash");
    const savingThrows = requireHole(
      resolveBattleSubject({ session, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        session,
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
      session,
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
        session,
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
