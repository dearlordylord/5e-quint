// KERNEL-COVERAGE: parity-witness BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test battle.spell-access-magic-initiate-casting
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  battleActSpellPresentation,
  battleSelectedSpellInvocationForProcedure,
} from "./battle-act-composition.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import { admitBattleResolutionInput } from "./battle-reducer/resolution-admission.ts";
import {
  resolveBonusActionSpellAct,
  resolveSpellAct,
} from "./battle-reducer/spells-resolve.ts";
import {
  commitSpellAccessFreeCastResourceUse,
  spendSpellAccessFreeCastResource,
  spendSpellCastResources,
} from "./battle-reducer/spells-resolve-resources.ts";
import { spellActTurnResourceAvailable } from "./battle-reducer/spell-turn-resources.ts";
import { characterExecutionWithSpellInvocations } from "./character-execution-admission.ts";
import { characterSpellProcedure } from "./character-execution-queries.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  CharacterBattleSpellListFact,
} from "./index.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import { classSpellListForSpellcastingClassRecord } from "@dnd/surface/surface/unit-catalog";

function wizardSpellListSource(): CharacterBattleSpellListFact {
  const wizard = unitLibrary.requireUnit("class_wizard");
  if (
    wizard.kind !== "class" ||
    wizard.className !== "wizard" ||
    wizard.spellcasting?.kind !== "wizard_spellcasting_creation"
  ) {
    throw new Error("Expected Wizard spell-list source.");
  }
  return {
    className: wizard.className,
    ...classSpellListForSpellcastingClassRecord(wizard),
  };
}
import {
  attackRollFill,
  battleId,
  battleFrontierInterruptDecisionForState,
  battleProcedureExecutionRefForSpellHoleForTest,
  battleProcedureExecutionRefForTest,
  battleStateWithAllSpellSlotsExpended,
  cantripSpellInvocationRef,
  characterSeed,
  combatantId,
  damageRollFill,
  damageRollFillWithGroups,
  discoverBattleActs,
  endTurn,
  expendedLevelOneSlots,
  fighterId,
  fighterTurnWithReadiedRayAndHealer,
  findHole,
  holeId,
  interruptDecisionFill,
  magicSubject,
  movementDeltaFeet,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  secondWizardId,
  skeletonCreatureInit,
  skeletonId,
  slotAttackDamageSpell,
  slotSaveDamageSpell,
  spellRecord,
  spellSlotInvocationRef,
  spellTargetAllocationFill,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  rangerFavoredEnemyResource,
  wizardId,
  wizardSpellcasting,
  wizardVsSkeletonBattle,
} from "./battle-runtime.test-support.ts";

describe("battle runtime: spellcasting actions and slots", () => {
  test("same spell from class and feat access keeps distinct source and payment acts", () => {
    const source = {
      id: authoredUnitId("feat_synthetic_arcane_dabbler"),
      kind: "feat",
      category: "origin",
      name: "Synthetic Arcane Dabbler",
      provenance: { kind: "synthetic-test", section: "casting boundary" },
      mechanics: { family: "magic_initiate", spellList: "wizard" },
    } as const;
    const burningHands = spellRecord("burning_hands");
    const rayOfFrost = spellRecord("ray_of_frost");
    const acidSplash = spellRecord("acid_splash");
    const session = startBattleSessionRight({
      battleId: battleId("battle-source-scoped-spell-access"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Source-scoped caster",
          initiative: 20,
          attack: null,
          classLevels: [{ className: "wizard", level: 1 }],
          resources: [
            {
              unit: source,
              spellAccessFreeCast: { spellId: burningHands.id, count: 1 },
              usesRemaining: 1,
            },
          ],
          characterUnitRefs: [
            { unit: burningHands, supportProfiles: [] },
            { unit: rayOfFrost, supportProfiles: [] },
            { unit: acidSplash, supportProfiles: [] },
          ],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [rayOfFrost],
              preparedSpells: [burningHands],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            spellAccesses: [
              {
                source: {
                  tag: "feat",
                  sourceUnit: source,
                  spellList: wizardSpellListSource(),
                },
                spellcastingAbilityModifier: -1,
                cantrips: [rayOfFrost, acidSplash],
                levelOneSpell: burningHands,
              },
            ],
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const actor = session.state.combatants.get(fighterId);
    if (actor?.origin.kind !== "character") {
      throw new Error("Expected source-scoped character caster.");
    }
    const execution = actor.origin.execution;
    const seenProcedureRefs = new Set<string>();
    const invocations = discoverBattleActs(session).flatMap((act) => {
      const presentation = battleActSpellPresentation(act);
      if (
        presentation?.invocation.spellId !== String(burningHands.id) ||
        !("procedureRef" in act.subject)
      ) {
        return [];
      }
      if (seenProcedureRefs.has(act.subject.procedureRef)) return [];
      seenProcedureRefs.add(act.subject.procedureRef);
      const invocation = characterSpellProcedure(
        execution,
        act.subject.procedureRef,
        actor,
      );
      return invocation === undefined ? [] : [invocation];
    });

    expect(
      invocations.map((invocation) => ({
        source: invocation.spellRuleFacts.castingSource,
        payment:
          invocation.resource.tag === "spellSlot"
            ? "slot"
            : invocation.resource.tag === "spellAccessFreeCast"
              ? "spellAccessFreeCast"
              : "none",
      })),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: expect.objectContaining({
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: 3,
          }),
          payment: "slot",
        }),
        expect.objectContaining({
          source: expect.objectContaining({
            tag: "spellAccess",
            abilityModifier: -1,
          }),
          payment: "slot",
        }),
        expect.objectContaining({
          source: expect.objectContaining({
            tag: "spellAccess",
            abilityModifier: -1,
          }),
          payment: "spellAccessFreeCast",
        }),
      ]),
    );
    const featRefs = invocations.flatMap((invocation) =>
      invocation.spellRuleFacts.castingSource.tag === "spellAccess"
        ? [invocation.spellRuleFacts.castingSource.spellAccessRef]
        : [],
    );
    expect(new Set(featRefs).size).toBe(1);

    const featFreeInvocation = invocations.find(
      (invocation) =>
        invocation.spellRuleFacts.castingSource.tag === "spellAccess" &&
        invocation.resource.tag === "spellAccessFreeCast",
    );
    const featSlotInvocation = invocations.find(
      (invocation) =>
        invocation.spellRuleFacts.castingSource.tag === "spellAccess" &&
        invocation.resource.tag === "spellSlot",
    );
    if (
      featFreeInvocation?.resource.tag !== "spellAccessFreeCast" ||
      featSlotInvocation?.resource.tag !== "spellSlot"
    ) {
      throw new Error("Expected feat free-cast and Spell Slot invocations.");
    }
    const resourcePoolRef = featFreeInvocation.resource.resourcePoolRef;
    const freeSpent = spendSpellCastResources({
      state: session.state,
      actorId: fighterId,
      invocation: featFreeInvocation,
      errorState: session.state,
    });
    if (freeSpent.tag !== "resolved") {
      throw new Error("Expected the feat free cast to spend.");
    }
    const freeSpentActor = freeSpent.state.combatants.get(fighterId);
    expect(
      freeSpentActor?.origin.kind === "character"
        ? freeSpentActor.origin.resources.find(
            (resource) => resource.resourcePoolRef === resourcePoolRef,
          )?.usesRemaining
        : undefined,
    ).toBe(0);
    expect(expendedLevelOneSlots(freeSpent, fighterId)).toBe(0);
    expect(
      spendSpellCastResources({
        state: freeSpent.state,
        actorId: fighterId,
        invocation: featFreeInvocation,
        errorState: freeSpent.state,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    expect(
      spendSpellAccessFreeCastResource(
        session.state,
        skeletonId,
        resourcePoolRef,
        featFreeInvocation,
        session.state,
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Spell Access free cast is no longer available for the current actor.",
    });
    expect(
      spendSpellAccessFreeCastResource(
        freeSpent.state,
        fighterId,
        resourcePoolRef,
        featFreeInvocation,
        freeSpent.state,
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Spell Access free cast is no longer available for the current actor.",
    });
    const committed = commitSpellAccessFreeCastResourceUse({
      state: session.state,
      actorId: fighterId,
      resourcePoolRef,
    });
    expect(committed).toMatchObject({
      _tag: "Right",
      right: expect.objectContaining({
        combatants: expect.any(Map),
      }),
    });
    if (committed._tag !== "Right") {
      throw new Error("Expected the interrupted free cast to commit.");
    }
    const committedActor = committed.right.combatants.get(fighterId);
    expect(
      committedActor?.origin.kind === "character"
        ? committedActor.origin.resources.find(
            (resource) => resource.resourcePoolRef === resourcePoolRef,
          )?.usesRemaining
        : undefined,
    ).toBe(0);
    expect(
      commitSpellAccessFreeCastResourceUse({
        state: session.state,
        actorId: skeletonId,
        resourcePoolRef,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: "Spell Access free cast is no longer available for the interrupted spell.",
    });
    expect(
      commitSpellAccessFreeCastResourceUse({
        state: freeSpent.state,
        actorId: fighterId,
        resourcePoolRef,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: "Spell Access free cast is no longer available for the interrupted spell.",
    });

    const slotSpent = spendSpellCastResources({
      state: session.state,
      actorId: fighterId,
      invocation: featSlotInvocation,
      errorState: session.state,
    });
    if (slotSpent.tag !== "resolved") {
      throw new Error("Expected the feat Spell Slot cast to spend.");
    }
    const slotSpentActor = slotSpent.state.combatants.get(fighterId);
    expect(expendedLevelOneSlots(slotSpent, fighterId)).toBe(1);
    expect(
      slotSpentActor?.origin.kind === "character"
        ? slotSpentActor.origin.resources.find(
            (resource) => resource.resourcePoolRef === resourcePoolRef,
          )?.usesRemaining
        : undefined,
    ).toBe(1);

    const cantripInvocationRefs = new Set(
      discoverBattleActs(session).flatMap((act) => {
        const presentation = battleActSpellPresentation(act);
        return presentation?.invocation.spellId === String(rayOfFrost.id)
          ? [JSON.stringify(presentation.invocation)]
          : [];
      }),
    );
    expect(cantripInvocationRefs.size).toBe(2);
    expect(
      [...cantripInvocationRefs].map((ref) => JSON.parse(ref).source.tag),
    ).toEqual(expect.arrayContaining(["classSpellcasting", "spellAccess"]));

    const seenCantripProcedureRefs = new Set<string>();
    const cantripInvocations = discoverBattleActs(session).flatMap((act) => {
      const presentation = battleActSpellPresentation(act);
      if (
        presentation?.invocation.spellId !== String(rayOfFrost.id) ||
        !("procedureRef" in act.subject) ||
        seenCantripProcedureRefs.has(act.subject.procedureRef)
      ) {
        return [];
      }
      seenCantripProcedureRefs.add(act.subject.procedureRef);
      const invocation = characterSpellProcedure(
        execution,
        act.subject.procedureRef,
        actor,
      );
      return invocation === undefined ? [] : [invocation];
    });
    expect(
      cantripInvocations.map((invocation) => ({
        access: invocation.access.tag,
        resource: invocation.resource.tag,
        source: invocation.spellRuleFacts.castingSource,
      })),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          access: "classCantrip",
          resource: "none",
          source: expect.objectContaining({
            tag: "classSpellcasting",
            abilityModifier: 3,
          }),
        }),
        expect.objectContaining({
          access: "spellAccessCantrip",
          resource: "none",
          source: expect.objectContaining({
            tag: "spellAccess",
            abilityModifier: -1,
          }),
        }),
      ]),
    );
    const featCantripInvocation = cantripInvocations.find(
      (invocation) => invocation.access.tag === "spellAccessCantrip",
    );
    if (
      featCantripInvocation?.spellRuleFacts.castingSource.tag !== "spellAccess"
    ) {
      throw new Error("Expected a source-scoped cantrip invocation.");
    }
    expect(
      featCantripInvocation.spellRuleFacts.castingSource.spellAccessRef,
    ).toEqual(expect.any(String));
  });

  test("resource spending reports a stale Magic action after admission", () => {
    const session = wizardVsSkeletonBattle();
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "magic_missile",
    );
    if (act === undefined) {
      throw new Error("Expected Magic Missile action spell.");
    }
    if (act.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile Action spell subject.");
    }
    const actor = session.state.combatants.get(wizardId);
    if (actor?.origin.kind !== "character") {
      throw new Error("Expected character Wizard caster.");
    }
    const invocation = characterSpellProcedure(
      actor.origin.execution,
      act.subject.procedureRef,
      actor,
    );
    if (invocation === undefined) {
      throw new Error("Expected Magic Missile invocation.");
    }
    const staleState: BattleState = {
      ...session.state,
      currentTurnResources: {
        ...session.state.currentTurnResources,
        actionResources: [],
      },
    };
    expect(
      spendSpellCastResources({
        state: staleState,
        actorId: wizardId,
        invocation,
        errorState: staleState,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic action is no longer available for the current actor.",
    });
  });

  test("resource spending reports a stale Spell Slot after admission", () => {
    const session = wizardVsSkeletonBattle();
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "magic_missile",
    );
    if (act === undefined) {
      throw new Error("Expected Magic Missile action spell.");
    }
    if (act.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile Action spell subject.");
    }
    const actor = session.state.combatants.get(wizardId);
    if (actor?.origin.kind !== "character") {
      throw new Error("Expected character Wizard caster.");
    }
    const invocation = characterSpellProcedure(
      actor.origin.execution,
      act.subject.procedureRef,
      actor,
    );
    if (invocation === undefined) {
      throw new Error("Expected Magic Missile invocation.");
    }
    const staleState: BattleState = {
      ...session.state,
      currentTurnResources: {
        ...session.state.currentTurnResources,
        spellSlotUsesThisTurn: [{ kind: "committed", combatantId: wizardId }],
      },
    };
    expect(
      spendSpellCastResources({
        state: staleState,
        actorId: wizardId,
        invocation,
        errorState: staleState,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "This turn has already expended a Spell Slot.",
    });
  });

  test("generic spell resource spending atomically spends action and free-cast pool", () => {
    const favoredEnemy = rangerFavoredEnemyResource({ usesRemaining: 1 });
    const session = startBattleSessionRight({
      battleId: battleId("battle-resource-class-feature-free-cast"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Ranger",
          initiative: 20,
          attack: null,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({ preparedSpells: [] }),
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
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.tag ===
          "spellAccessFreeCast" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "hunters_mark",
    );
    if (act?.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected Hunter's Mark bonus-action spell.");
    }
    const actor = session.state.combatants.get(fighterId);
    if (actor?.origin.kind !== "character") {
      throw new Error("Expected character Ranger caster.");
    }
    const invocation = characterSpellProcedure(
      actor.origin.execution,
      act.subject.procedureRef,
      actor,
    );
    if (
      invocation === undefined ||
      invocation.resource.tag !== "spellAccessFreeCast"
    ) {
      throw new Error("Expected Hunter's Mark class-feature invocation.");
    }
    const freeCastResourcePoolRef = invocation.resource.resourcePoolRef;
    const usesBefore = actor.origin.resources.find(
      (resource) => resource.resourcePoolRef === freeCastResourcePoolRef,
    )?.usesRemaining;
    if (usesBefore === undefined) {
      throw new Error("Expected limited free-cast resource pool.");
    }
    expect(
      spellActTurnResourceAvailable(
        {
          ...session.state.currentTurnResources,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: fighterId },
          ],
        },
        fighterId,
        invocation,
      ),
    ).toBe(true);
    const resolved = spendSpellCastResources({
      state: session.state,
      actorId: fighterId,
      invocation,
      errorState: session.state,
    });
    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.currentTurnResources.actionResources).not.toContain(
      "bonusAction",
    );
    expect(resolved.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
      [],
    );
    const updatedActor = resolved.state.combatants.get(fighterId);
    expect(
      updatedActor?.origin.kind === "character"
        ? updatedActor.origin.resources.find(
            (resource) => resource.resourcePoolRef === freeCastResourcePoolRef,
          )?.usesRemaining
        : undefined,
    ).toBe(Number(usesBefore) - 1);
  });

  test("prepared Magic Missile asks for an active source damage penalty roll", () => {
    const baseSession = wizardVsSkeletonBattle();
    const caster = baseSession.state.combatants.get(wizardId);
    if (caster === undefined) {
      throw new Error("Expected Wizard caster.");
    }
    const sourceDamageRollPenalty = {
      kind: "sourceDamageRollPenalty" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic_source_damage_penalty",
      ),
      sourceCombatantId: skeletonId,
      amount: { dice: 1, dieSize: 8 },
      expiresAt: {
        kind: "concentration" as const,
        combatantId: skeletonId,
      },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "sourceDamageRollPenalty" }
    >;
    const state: BattleState = {
      ...baseSession.state,
      combatants: new Map(baseSession.state.combatants).set(wizardId, {
        ...caster,
        activeEffects: [...caster.activeEffects, sourceDamageRollPenalty],
      }),
    };
    const session = battleRuntimeSessionForTest({
      ...baseSession,
      state,
    });
    const subject = magicSubject("magic_missile");
    const allocation = requireHole(
      resolveBattleSubject({ session, subject, fills: [] }),
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(allocation, [
      { targetId: skeletonId, count: 3 },
    ]);
    const damage = requireHole(
      resolveBattleSubject({
        session,
        subject,
        fills: [allocationFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[1, 1, 1]]);
    const needsPenalty = resolveBattleSubject({
      session,
      subject,
      fills: [allocationFill, damageFill],
    });
    const penalty = requireHole(needsPenalty, "rolledDice");
    expect(penalty).toMatchObject({
      label: "Source damage roll penalty (1d8)",
      sourceDamageRollPenalty: {
        damageRollHoleId: `${damage.holeId}:allocation:0`,
      },
    });
    const resolved = requireResolved(
      resolveBattleSubject({
        session,
        subject,
        fills: [
          allocationFill,
          damageFill,
          damageRollFillWithGroups(penalty, [[1]]),
        ],
      }),
    );
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(8);
  });

  test("admitted Action and Bonus Action spell subjects reject depleted spell resources", () => {
    const actionSession = wizardVsSkeletonBattle();
    const actionAct = discoverBattleActs(actionSession).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "magic_missile",
    );
    if (actionAct?.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile Action spell act.");
    }
    const actionAdmission = admitBattleResolutionInput({
      state: actionSession.state,
      subject: actionAct.subject,
      fills: [],
    });
    if (actionAdmission.tag !== "admitted") {
      throw new Error("Expected admitted Magic Missile resolution input.");
    }
    const depletedActionState = battleStateWithAllSpellSlotsExpended(
      actionAdmission.input.state,
      actionAct.subject.actorId,
    );
    expect(
      resolveSpellAct(
        {
          ...actionAdmission.input,
          subject: actionAct.subject,
          state: depletedActionState,
        },
        spellProcedureExecutionRegistry(),
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: expect.stringContaining("required runtime spell resource"),
    });

    const bonusActionSession = startBattleSessionRight({
      battleId: battleId("battle-stale-bonus-action-spell-caster"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          initiative: 10,
          currentHp: 5,
        }),
      ],
    });
    const bonusActionAct = discoverBattleActs(bonusActionSession).find(
      (act) =>
        act.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "healing_word",
    );
    if (bonusActionAct?.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected Healing Word Bonus Action spell act.");
    }
    const bonusActionAdmission = admitBattleResolutionInput({
      state: bonusActionSession.state,
      subject: bonusActionAct.subject,
      fills: [],
    });
    if (bonusActionAdmission.tag !== "admitted") {
      throw new Error("Expected admitted Healing Word resolution input.");
    }
    const depletedBonusActionState = battleStateWithAllSpellSlotsExpended(
      bonusActionAdmission.input.state,
      bonusActionAct.subject.actorId,
    );
    expect(
      resolveBonusActionSpellAct(
        {
          ...bonusActionAdmission.input,
          subject: bonusActionAct.subject,
          state: depletedBonusActionState,
        },
        spellProcedureExecutionRegistry(),
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: expect.stringContaining("required runtime spell resource"),
    });
  });

  test("admitted spell subjects reject procedures made unavailable by an execution refresh", () => {
    const actionSession = wizardVsSkeletonBattle();
    const actionAct = discoverBattleActs(actionSession).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "magic_missile",
    );
    if (actionAct?.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile Action spell act.");
    }
    const actionAdmission = admitBattleResolutionInput({
      state: actionSession.state,
      subject: actionAct.subject,
      fills: [],
    });
    if (actionAdmission.tag !== "admitted") {
      throw new Error("Expected admitted Magic Missile resolution input.");
    }
    const refreshedActionActor = characterWithUnavailableSpellExecution(
      actionSession.state.combatants.get(actionAct.subject.actorId),
    );

    expect(
      resolveSpellAct(
        {
          ...actionAdmission.input,
          subject: actionAct.subject,
          state: {
            ...actionAdmission.input.state,
            combatants: new Map(actionSession.state.combatants).set(
              refreshedActionActor.combatantId,
              refreshedActionActor,
            ),
          },
        },
        spellProcedureExecutionRegistry(),
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Action-time spell act requires a supported prepared spell or cantrip.",
    });

    const bonusActionSession = startBattleSessionRight({
      battleId: battleId("battle-unavailable-bonus-action-spell-procedure"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          initiative: 10,
          currentHp: 5,
        }),
      ],
    });
    const bonusActionAct = discoverBattleActs(bonusActionSession).find(
      (act) =>
        act.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "healing_word",
    );
    if (bonusActionAct?.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected Healing Word Bonus Action spell act.");
    }
    const bonusActionAdmission = admitBattleResolutionInput({
      state: bonusActionSession.state,
      subject: bonusActionAct.subject,
      fills: [],
    });
    if (bonusActionAdmission.tag !== "admitted") {
      throw new Error("Expected admitted Healing Word resolution input.");
    }
    const refreshedBonusActionActor = characterWithUnavailableSpellExecution(
      bonusActionSession.state.combatants.get(bonusActionAct.subject.actorId),
    );

    expect(
      resolveBonusActionSpellAct(
        {
          ...bonusActionAdmission.input,
          subject: bonusActionAct.subject,
          state: {
            ...bonusActionAdmission.input.state,
            combatants: new Map(bonusActionSession.state.combatants).set(
              refreshedBonusActionActor.combatantId,
              refreshedBonusActionActor,
            ),
          },
        },
        spellProcedureExecutionRegistry(),
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Bonus Action spell act requires a supported Bonus Action spell.",
    });
  });

  test("admitted spell subjects reject stale caller-mutation actors and lane mismatches", () => {
    const actionSession = wizardVsSkeletonBattle();
    const actionAct = discoverBattleActs(actionSession).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "magic_missile",
    );
    if (actionAct?.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile Action spell act.");
    }
    const actionAdmission = admitBattleResolutionInput({
      state: actionSession.state,
      subject: actionAct.subject,
      fills: [],
    });
    if (actionAdmission.tag !== "admitted") {
      throw new Error("Expected admitted Magic Missile resolution input.");
    }
    const statBlockSource = actionSession.state.combatants.get(skeletonId);
    if (statBlockSource === undefined) {
      throw new Error("Expected a stat-block combatant for caller mutation.");
    }
    const statBlockActor = {
      ...statBlockSource,
      combatantId: wizardId,
    };
    expect(
      resolveSpellAct(
        {
          ...actionAdmission.input,
          state: {
            ...actionAdmission.input.state,
            combatants: new Map(actionSession.state.combatants).set(
              wizardId,
              statBlockActor,
            ),
          },
        },
        spellProcedureExecutionRegistry(),
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Action-time spell act requires a supported prepared spell or cantrip.",
    });

    const retaggedBonusActionSubject = {
      tag: "bonusActionSpell" as const,
      actorId: actionAct.subject.actorId,
      procedureRef: actionAct.subject.procedureRef,
      mode: { tag: "cast" as const },
    };
    const bonusActionAdmission = admitBattleResolutionInput({
      state: actionSession.state,
      subject: retaggedBonusActionSubject,
      fills: [],
    });
    if (bonusActionAdmission.tag !== "admitted") {
      throw new Error("Expected admitted retagged Bonus Action spell input.");
    }
    expect(
      resolveBonusActionSpellAct(
        bonusActionAdmission.input,
        spellProcedureExecutionRegistry(),
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      message:
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
    });
    expect(
      resolveBonusActionSpellAct(
        {
          ...bonusActionAdmission.input,
          state: {
            ...bonusActionAdmission.input.state,
            combatants: new Map(actionSession.state.combatants).set(
              wizardId,
              statBlockActor,
            ),
          },
        },
        spellProcedureExecutionRegistry(),
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Bonus Action spell act requires a supported Bonus Action spell.",
    });
  });

  test("Wizard action-time spell acts spend slots for prepared level-1 spells but not cantrips", () => {
    const magicMissileState = wizardVsSkeletonBattle();
    const magicMissileProcedureRef = requireCharacterSpellProcedureRefForTest(
      magicMissileState,
      wizardId,
      spellSlotInvocationRef("magic_missile", 1, "repeatedDamageAllocation"),
    );
    expect(
      battleSelectedSpellInvocationForProcedure(
        magicMissileState,
        wizardId,
        magicMissileProcedureRef,
      ),
    ).toMatchObject({ spell: { id: "magic_missile" } });
    expect(
      battleSelectedSpellInvocationForProcedure(
        magicMissileState,
        skeletonId,
        magicMissileProcedureRef,
      ),
    ).toBeUndefined();
    expect(
      discoverBattleActs(magicMissileState).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        { tag: "action", actorId: wizardId, action: "grapple" },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        { tag: "runtimeCommand", actorId: wizardId, command: "move" },
        { tag: "runtimeCommand", actorId: wizardId, command: "endTurn" },
      ]),
    );

    const magicMissileTarget = requireHole(
      resolveBattleSubject({
        session: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [],
      }),
      "spellTargetAllocation",
    );
    expect(magicMissileTarget).toMatchObject({
      label: "Spell target allocation",
      allocationCount: 3,
      choices: [wizardId, skeletonId],
    });
    expect(
      resolveBattleSubject({
        session: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(magicMissileTarget, [
            { targetId: wizardId, count: 0 },
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell target allocation entries must assign a positive integer count.",
    });
    const magicMissileDamage = requireHole(
      resolveBattleSubject({
        session: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(magicMissileTarget, [
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(magicMissileDamage).toMatchObject({
      label: "Spell damage (3d4+3-force)",
    });
    expect(
      resolveBattleSubject({
        session: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: holeId("battle:spell:saving-throw-outcome:magic_missile"),
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [skeletonId],
              },
              outcomes: [{ targetId: skeletonId, succeeded: false }],
            },
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const magicMissile = resolveBattleSubject({
      session: magicMissileState,
      subject: magicSubject("magic_missile"),
      fills: [
        spellTargetAllocationFill(magicMissileTarget, [
          { targetId: skeletonId, count: 3 },
        ]),
        damageRollFillWithGroups(magicMissileDamage, [[1, 1, 1]]),
      ],
    });
    expect(magicMissile).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 7 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(magicMissile), wizardId)).toBe(
      1,
    );

    const healingWordState = startBattleSessionRight({
      battleId: battleId("battle-healing-word-bonus-action"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          initiative: 10,
          currentHp: 4,
        }),
      ],
    });
    const healingWordAct = discoverBattleActs(healingWordState).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "healing_word",
    );
    expect(healingWordAct).toMatchObject({
      subject: {
        tag: "bonusActionSpell",
        actorId: wizardId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          healingWordState,
          wizardId,
          spellSlotInvocationRef(
            "healing_word",
            1,
            "directHitPointRestoration",
          ),
        ),
        mode: { tag: "cast" },
      },
      initialHoles: [{ kind: "targetChoice" }],
    });
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word Bonus Action spell act.");
    }
    const healingWordTarget = findHole(
      healingWordAct.initialHoles,
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state: healingWordState.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(
                  healingWordTarget,
                ),
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const healingWord = requireResolved(
      resolveBattleSubject({
        state: healingWordState.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(
                  healingWordTarget,
                ),
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[4, 3]]),
        ],
      }),
    );
    expect(healingWord.snapshot.turn.bonusActionQuotaAvailable).toBe(false);
    expect(healingWord.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId, hp: 12 }),
      ]),
    );
    expect(expendedLevelOneSlots(healingWord, wizardId)).toBe(1);
    expect(
      discoverBattleActs(healingWordState).some(
        (act) =>
          act.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "magic_missile",
      ),
    ).toBe(false);

    const slotTurnState = startBattleSessionRight({
      battleId: battleId("battle-one-slot-spell-per-turn"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [
              spellRecord("magic_missile"),
              spellRecord("healing_word"),
            ],
          }),
        }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          initiative: 10,
          currentHp: 10,
        }),
      ],
    });
    const slotTurnMissileTarget = requireHole(
      resolveBattleSubject({
        session: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const slotTurnMissileDamage = requireHole(
      resolveBattleSubject({
        session: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(slotTurnMissileTarget, [
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
      "rolledDice",
    );
    const afterSlotSpell = requireResolved(
      resolveBattleSubject({
        session: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(slotTurnMissileTarget, [
            { targetId: skeletonId, count: 3 },
          ]),
          damageRollFillWithGroups(slotTurnMissileDamage, [[1, 1, 1]]),
        ],
      }),
    ).state;
    expect(afterSlotSpell.currentTurnResources).toMatchObject({
      actionTakenThisTurn: true,
      currentHasBonusAction: true,
      commandHalt: null,
      spellSlotUsesThisTurn: [{ kind: "committed", combatantId: wizardId }],
      levelOnePlusSpellCastsThisTurn: [wizardId],
    });
    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({
          ...slotTurnState,
          state: afterSlotSpell,
        }),
      ).some(
        (act) =>
          act.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "healing_word",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: afterSlotSpell,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            battleRuntimeSessionForTest({
              ...slotTurnState,
              state: afterSlotSpell,
            }),
            wizardId,
            spellSlotInvocationRef(
              "healing_word",
              1,
              "directHitPointRestoration",
            ),
          ),
          mode: { tag: "cast" },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "This turn has already expended a Spell Slot.",
    });

    const healingWordReactionState =
      fighterTurnWithReadiedRayAndHealer("spellCast");
    const healingWordReactionAct = discoverBattleActs(
      healingWordReactionState,
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "healing_word",
    );
    if (healingWordReactionAct === undefined) {
      throw new Error("Expected Healing Word Bonus Action spell act.");
    }
    const reactionTarget = findHole(
      healingWordReactionAct.initialHoles,
      "targetChoice",
    );
    const reactionTargetFill = targetFill(reactionTarget, fighterId, [
      {
        kind: "spellTarget",
        casterId: fighterId,
        targetId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(reactionTarget),
      },
    ]);
    const awaitingSpellCastReaction = resolveBattleSubject({
      state: healingWordReactionState.state,
      subject: healingWordReactionAct.subject,
      fills: [reactionTargetFill],
    });
    expect(awaitingSpellCastReaction).toMatchObject({
      tag: "needsHoles",
      subject: healingWordReactionAct.subject,
      holes: [{ kind: "interruptDecision", trigger: "spellCast" }],
    });
    if (awaitingSpellCastReaction.tag !== "needsHoles") {
      throw new Error(
        `Expected needsHoles, got ${awaitingSpellCastReaction.tag}.`,
      );
    }
    const afterDecline = resolveBattleInterrupt({
      state: awaitingSpellCastReaction.state,
      fill: interruptDecisionFill(
        battleFrontierInterruptDecisionForState(
          awaitingSpellCastReaction.state,
        )!.decisionHole,
        { kind: "decline", responderId: wizardId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      subject: healingWordReactionAct.subject,
      holes: [{ kind: "rolledDice", label: "Spell healing (2d4+3)" }],
    });

    const levelTwoState = startBattleSessionRight({
      battleId: battleId("battle-magic-missile-split-targets"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            spellSlots: [
              { spellLevel: 1, count: 2 },
              { spellLevel: 2, count: 1 },
            ],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
          attack: null,
          currentHp: 20,
          maxHp: 20,
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(levelTwoState).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            levelTwoState,
            wizardId,
            spellSlotInvocationRef(
              "magic_missile",
              2,
              "repeatedDamageAllocation",
            ),
          ),
          mode: { tag: "cast" },
        },
      ]),
    );
    const levelTwoSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        levelTwoState,
        wizardId,
        spellSlotInvocationRef("magic_missile", 2, "repeatedDamageAllocation"),
      ),
      mode: { tag: "cast" },
    };
    const levelTwoTargets = requireHole(
      resolveBattleSubject({
        state: levelTwoState.state,
        subject: levelTwoSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    expect(levelTwoTargets).toMatchObject({ allocationCount: 4 });
    const levelTwoDamage = requireHole(
      resolveBattleSubject({
        state: levelTwoState.state,
        subject: levelTwoSubject,
        fills: [
          spellTargetAllocationFill(levelTwoTargets, [
            { targetId: skeletonId, count: 3 },
            { targetId: fighterId, count: 1 },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(levelTwoDamage).toMatchObject({
      label: "Spell damage (4d4+4-force)",
    });
    const splitMagicMissile = resolveBattleSubject({
      state: levelTwoState.state,
      subject: levelTwoSubject,
      fills: [
        spellTargetAllocationFill(levelTwoTargets, [
          { targetId: skeletonId, count: 3 },
          { targetId: fighterId, count: 1 },
        ]),
        damageRollFillWithGroups(levelTwoDamage, [[1, 1, 1], [4]]),
      ],
    });
    expect(splitMagicMissile).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: fighterId, hp: 15 },
          { combatantId: skeletonId, hp: 7 },
        ],
      },
    });

    const secondWizardSession = startBattleSessionRight({
      battleId: battleId("battle-second-wizard-ready-after-damage"),
      combatants: [
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const secondWizardReady = requireResolved(
      resolveBattleSubject({
        state: secondWizardSession.state,
        subject: {
          tag: "actionSpell",
          actorId: secondWizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            secondWizardSession,
            secondWizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        fills: [],
      }),
    ).state;
    const readiedRay = secondWizardReady.readiedSpells.get(secondWizardId);
    const concentratingSecondWizard =
      secondWizardReady.combatants.get(secondWizardId);
    if (readiedRay === undefined || concentratingSecondWizard === undefined) {
      throw new Error("Expected Second Wizard to hold a Readied Spell.");
    }
    const afterDamageSequenceState = {
      ...levelTwoState.state,
      combatants: new Map(levelTwoState.state.combatants).set(
        secondWizardId,
        concentratingSecondWizard,
      ),
      readiedSpells: new Map([[secondWizardId, readiedRay]]),
    } satisfies BattleState;
    const splitWithAfterDamageReaction = resolveBattleSubject({
      state: afterDamageSequenceState,
      subject: levelTwoSubject,
      fills: [
        spellTargetAllocationFill(levelTwoTargets, [
          { targetId: skeletonId, count: 3 },
          { targetId: fighterId, count: 1 },
        ]),
        damageRollFillWithGroups(levelTwoDamage, [[1, 1, 1], [4]]),
      ],
    });
    expect(splitWithAfterDamageReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
    if (splitWithAfterDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected first after-damage reaction window.");
    }
    const secondAfterDamageReaction = resolveBattleInterrupt({
      state: splitWithAfterDamageReaction.state,
      fill: interruptDecisionFill(
        battleFrontierInterruptDecisionForState(
          splitWithAfterDamageReaction.state,
        )!.decisionHole,
        { kind: "decline", responderId: secondWizardId },
      ),
    });
    expect(secondAfterDamageReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });

    const rayState = wizardVsSkeletonBattle();
    const rayTarget = requireHole(
      resolveBattleSubject({
        session: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [],
      }),
      "targetChoice",
    );
    const rayProcedureRef =
      battleProcedureExecutionRefForSpellHoleForTest(rayTarget);
    const rayRoll = requireHole(
      resolveBattleSubject({
        session: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [targetFill(rayTarget, skeletonId)],
      }),
      "attackRoll",
    );
    expect(rayRoll).toMatchObject({
      attackBonus: 5,
    });
    const rayDamage = requireHole(
      resolveBattleSubject({
        session: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(rayTarget, skeletonId),
          attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const ray = resolveBattleSubject({
      session: rayState,
      subject: magicSubject("ray_of_frost"),
      fills: [
        targetFill(rayTarget, skeletonId),
        attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        damageRollFill(rayDamage, 4),
      ],
    });

    expect(ray).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          {
            combatantId: skeletonId,
            hp: 9,
          },
        ],
      },
    });
    expect(requireResolved(ray).state.combatants.get(skeletonId)).toMatchObject(
      {
        activeEffects: [
          {
            kind: "speedDelta",
            sourceProcedureRef: rayProcedureRef,
            sourceCombatantId: wizardId,
            deltaFeet: movementDeltaFeet(-10),
            expiresAt: {
              kind: "startOfTurn",
              combatantId: wizardId,
            },
          },
        ],
      },
    );
    expect(expendedLevelOneSlots(requireResolved(ray), wizardId)).toBe(0);

    const existingSpeedDeltaProcedureRef = battleProcedureExecutionRefForTest(
      "existing-speed-delta-procedure",
    );
    const stackedRayState = {
      ...rayState.state,
      combatants: new Map(rayState.state.combatants).set(skeletonId, {
        ...rayState.state.combatants.get(skeletonId)!,
        activeEffects: [
          {
            kind: "speedDelta",
            sourceProcedureRef: existingSpeedDeltaProcedureRef,
            sourceCombatantId: combatantId("other-wizard"),
            deltaFeet: movementDeltaFeet(-10),
            expiresAt: {
              kind: "startOfTurn",
              combatantId: combatantId("other-wizard"),
            },
          },
        ],
      }),
    } satisfies BattleState;
    const refreshedRay = resolveBattleSubject({
      session: battleRuntimeSessionForTest({
        ...rayState,
        state: stackedRayState,
      }),
      subject: magicSubject("ray_of_frost"),
      fills: [
        targetFill(rayTarget, skeletonId),
        attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        damageRollFill(rayDamage, 4),
      ],
    });
    expect(refreshedRay).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [{ combatantId: wizardId }, { combatantId: skeletonId }],
      },
    });
    expect(
      requireResolved(refreshedRay).state.combatants.get(skeletonId),
    ).toMatchObject({
      activeEffects: [
        {
          kind: "speedDelta",
          sourceProcedureRef: existingSpeedDeltaProcedureRef,
          sourceCombatantId: combatantId("other-wizard"),
          deltaFeet: movementDeltaFeet(-10),
          expiresAt: {
            kind: "startOfTurn",
            combatantId: combatantId("other-wizard"),
          },
        },
        {
          kind: "speedDelta",
          sourceProcedureRef: rayProcedureRef,
          sourceCombatantId: wizardId,
          deltaFeet: movementDeltaFeet(-10),
          expiresAt: {
            kind: "startOfTurn",
            combatantId: wizardId,
          },
        },
      ],
    });

    const criticalRayState = wizardVsSkeletonBattle();
    const criticalRayTarget = requireHole(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [],
      }),
      "targetChoice",
    );
    const criticalRayRoll = requireHole(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [targetFill(criticalRayTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const criticalRayDamage = requireHole(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
        ],
      }),
      "rolledDice",
    );
    expect(criticalRayDamage).toMatchObject({
      label: "Spell damage (2d8-cold)",
      critical: true,
    });
    expect(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
          damageRollFill(criticalRayDamage, 4),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
          damageRollFillWithGroups(criticalRayDamage, [[4, 4]]),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 5 },
        ],
      },
    });

    const afterWizardTurn = endTurn({
      state: requireResolved(ray).state,
      actorId: wizardId,
    });
    if (afterWizardTurn.tag !== "resolved") {
      throw new Error(
        `Expected resolved Wizard End Turn, got ${afterWizardTurn.tag}.`,
      );
    }
    const afterSkeletonTurn = endTurn({
      state: afterWizardTurn.state,
      actorId: skeletonId,
    });
    expect(afterSkeletonTurn).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: wizardId,
        combatants: [{ combatantId: wizardId }, { combatantId: skeletonId }],
      },
    });
    if (afterSkeletonTurn.tag !== "resolved") {
      throw new Error("Expected Ray of Frost cleanup turn to resolve.");
    }
    expect(
      afterSkeletonTurn.state.combatants.get(skeletonId)?.activeEffects,
    ).toEqual([]);

    const rayMiss = resolveBattleSubject({
      session: rayState,
      subject: magicSubject("ray_of_frost"),
      fills: [
        targetFill(rayTarget, skeletonId),
        attackRollFill(rayRoll, { total: 1, naturalD20: 1 }),
      ],
    });
    expect(rayMiss).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { actionResources: [] },
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
        ],
      },
    });
    expect(expendedLevelOneSlots(requireResolved(rayMiss), wizardId)).toBe(0);
  });

  test("prepared spell-slot damage can use spell attack or save-gated invocation refs", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-prepared-damage-invocation-refs"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [slotAttackDamageSpell(), slotSaveDamageSpell()],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            state,
            wizardId,
            spellSlotInvocationRef(
              "slot_attack_damage",
              1,
              "spellAttackDamage",
            ),
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            state,
            wizardId,
            spellSlotInvocationRef("slot_save_damage", 1, "saveGatedDamage"),
          ),
          mode: { tag: "cast" },
        },
      ]),
    );

    const attackSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        wizardId,
        spellSlotInvocationRef("slot_attack_damage", 1, "spellAttackDamage"),
      ),
      mode: { tag: "cast" },
    };
    const attackTarget = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: attackSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(attackTarget),
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const attackDamage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(attackTarget),
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(attackDamage).toMatchObject({
      label: "Spell damage (2d8-cold)",
    });
    const afterAttackSpell = requireResolved(
      resolveBattleSubject({
        state: state.state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(attackTarget),
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(attackDamage, [[4, 4]]),
        ],
      }),
    );
    expect(expendedLevelOneSlots(afterAttackSpell, wizardId)).toBe(1);
    expect(
      afterAttackSpell.state.combatants.get(skeletonId)?.activeEffects,
    ).toHaveLength(0);

    const saveSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        wizardId,
        spellSlotInvocationRef("slot_save_damage", 1, "saveGatedDamage"),
      ),
      mode: { tag: "cast" },
    };
    const saveOutcome = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: saveSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const saveDamage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: saveSubject,
        fills: [
          savingThrowOutcomeFill(saveOutcome, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(saveDamage).toMatchObject({
      label: "Spell damage (2d6-acid)",
    });
    const afterSaveSpell = requireResolved(
      resolveBattleSubject({
        state: state.state,
        subject: saveSubject,
        fills: [
          savingThrowOutcomeFill(saveOutcome, [
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFillWithGroups(saveDamage, [[3, 3]]),
        ],
      }),
    );
    expect(expendedLevelOneSlots(afterSaveSpell, wizardId)).toBe(1);
  });

  test("prepared spell-slot damage supports only slot-axis linear scaling", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-prepared-damage-axis"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [
              slotAttackDamageSpell({ axis: "slot" }),
              slotAttackDamageSpell({
                id: "character_axis_attack_damage",
                name: "Character Axis Attack Damage",
                axis: "character",
              }),
            ],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const spellAttackSubjects = discoverBattleActs(state)
      .flatMap((act) => {
        if (
          act.subject.tag !== "actionSpell" &&
          act.subject.tag !== "bonusActionSpell"
        ) {
          return [];
        }
        const presentation = battleActSpellPresentation(act);
        return presentation === undefined ? [] : [presentation.invocation];
      })
      .filter(
        (invocation) =>
          invocation.procedure === "spellAttackDamage" &&
          invocation.tag === "spellSlot",
      )
      .map((invocation) => invocation.spellId);

    expect(spellAttackSubjects).toContain("slot_attack_damage");
    expect(spellAttackSubjects).not.toContain("character_axis_attack_damage");
  });

  test("cantrip damage uses character-tier scaling from the authored source", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-cantrip-scaling"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        wizardId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(target),
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(target),
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "Spell damage (2d8-cold)",
    });
  });

  test("prepared spell-slot damage discovery summaries name Spell Slot casting", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-prepared-damage-summaries"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [slotAttackDamageSpell(), slotSaveDamageSpell()],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const acts = discoverBattleActs(state);

    expect(
      acts.find(
        (act) =>
          act.subject.tag === "actionSpell" &&
          battleActSpellPresentation(act)?.invocation.tag === "spellSlot" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "slot_attack_damage" &&
          battleActSpellPresentation(act)?.invocation.procedure ===
            "spellAttackDamage",
      )?.summary,
    ).toBe("Use Slot Attack Damage.");
    expect(
      acts.find(
        (act) =>
          act.subject.tag === "actionSpell" &&
          battleActSpellPresentation(act)?.invocation.tag === "spellSlot" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "slot_save_damage" &&
          battleActSpellPresentation(act)?.invocation.procedure ===
            "saveGatedDamage",
      )?.summary,
    ).toBe("Use Slot Save Damage.");
  });
});

function characterWithUnavailableSpellExecution(
  actor: BattleCreatureState | undefined,
) {
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spell caster.");
  }
  return {
    ...actor,
    origin: {
      ...actor.origin,
      execution: characterExecutionWithSpellInvocations(
        actor.origin.execution,
        [],
      ),
    },
  };
}
