import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV69B hellish_rebuke
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.reaction-hellish-rebuke spell.invocation-damage-save-or-attack
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.REACTION_CASTING_TIME
import { Result } from "effect";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";
import {
  BattleInterruptProcedureChoiceSchema,
  BattleSnapshotSchema,
} from "./index.ts";

import {
  abilityModifier,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  attackBonus,
  damageAmount,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import { openAfterDamageSequenceInterruptWindow } from "./battle-reducer/interrupt-execution.ts";
import {
  battleProcedureExecutionRefForTest,
  battleProcedureExecutionRefForSpellHoleForTest,
  characterSpellInvocationRefForProcedureRefForTest,
  concentrationSavingThrowFill,
  requireCharacterSpellProcedureRefForTest,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import { hideousLaughterDurationTicks } from "./unit-profile-admission-catalog.test-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  resolveBattleInterrupt,
  spellSlotInvocationRef,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleCreatureState,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleInterruptCheckpoint,
  type BattleInterruptProcedureChoice,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Hellish Rebuke Reaction spell test Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;
const hellishRebukeUnitId = "hellish_rebuke";
const hideousLaughterUnitId = "hideous_laughter";
const magicMissileUnitId = "magic_missile";
const spellCasterId = combatantId("hellish-rebuke-caster");
const laughterCasterId = combatantId("hideous-laughter-caster");
const damagerId = combatantId("hellish-rebuke-damager");

type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};

describe("Hellish Rebuke Reaction spell", () => {
  test("is offered after damage from a visible creature within 60 feet and resolves Dexterity save, Fire damage, Reaction, and slot spend", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId));
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: true,
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "afterDamage" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      state,
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const damage = requireHole(choice.initialHoles, "rolledDice");
    expect(save).toMatchObject({ ability: "dex" });
    expect(damage).toMatchObject({ kind: "rolledDice" });

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: damagerId, succeeded: false },
              ]),
              damageRollFillWithGroups(damage, [[1, 1, 1]]),
            ],
          },
        },
      ),
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Hellish Rebuke Reaction to resolve.");
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          hp: 11,
          reactionAvailable: false,
          origin: expect.objectContaining({
            spellcasting: expect.objectContaining({
              spellSlots: expect.arrayContaining([
                expect.objectContaining({ spellLevel: 2, expended: 1 }),
              ]),
            }),
          }),
        }),
        expect.objectContaining({
          combatantId: damagerId,
          hp: 9,
        }),
      ]),
    );
  });

  test("deals half Fire damage on a successful Dexterity saving throw", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId));
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      state,
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const damage = requireHole(choice.initialHoles, "rolledDice");

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: damagerId, succeeded: true },
              ]),
              damageRollFillWithGroups(damage, [[2, 2, 1]]),
            ],
          },
        },
      ),
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Hellish Rebuke Reaction to resolve.");
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          reactionAvailable: false,
          origin: expect.objectContaining({
            spellcasting: expect.objectContaining({
              spellSlots: expect.arrayContaining([
                expect.objectContaining({ spellLevel: 2, expended: 1 }),
              ]),
            }),
          }),
        }),
        expect.objectContaining({
          combatantId: damagerId,
          hp: 10,
        }),
      ]),
    );
  });

  test("applies a source damage penalty before the damaged creature's Concentration save", () => {
    const base = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId));
    const concentrationProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-hellish-rebuke-damager-concentration",
    );
    const sourceDamageRollPenalty = {
      kind: "sourceDamageRollPenalty",
      sourceProcedureRef: concentrationProcedureRef,
      sourceCombatantId: damagerId,
      amount: { dice: 1, dieSize: 8 },
      expiresAt: {
        kind: "concentration",
        combatantId: damagerId,
      },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "sourceDamageRollPenalty" }
    >;
    const concentratingState = withCombatant(
      base.state,
      damagerId,
      (damager) => ({
        ...damager,
        concentration: {
          sourceProcedureRef: concentrationProcedureRef,
          effectKind: "spellEffect",
        },
      }),
    );
    const enrichedState = withCombatant(
      concentratingState,
      spellCasterId,
      (caster) => ({
        ...caster,
        activeEffects: [...caster.activeEffects, sourceDamageRollPenalty],
      }),
    );
    const session = battleRuntimeSessionForTest({
      ...base,
      state: enrichedState,
    });
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state: session,
      includeHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      session,
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const damage = requireHole(choice.initialHoles, "rolledDice");
    const pendingConcentration = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: damagerId, succeeded: false },
              ]),
              damageRollFillWithGroups(damage, [[1, 1, 1]]),
            ],
          },
        },
      ),
    });
    expect(pendingConcentration).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
    if (pendingConcentration.tag !== "needsHoles") {
      throw new Error("Expected a source damage penalty roll hole.");
    }
    const concentration = requireHole(pendingConcentration.holes, "rolledDice");
    if (!("sourceDamageRollPenalty" in concentration)) {
      throw new Error("Expected the source damage penalty roll hole.");
    }
    const pendingLifecycle = resolveBattleSubject({
      state: pendingConcentration.state,
      subject: choice.subject,
      fills: [
        savingThrowOutcomeFill(save, [
          { targetId: damagerId, succeeded: false },
        ]),
        damageRollFillWithGroups(damage, [[1, 1, 1]]),
        damageRollFillWithGroups(concentration, [[1]]),
      ],
    });
    expect(pendingLifecycle).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "concentrationSavingThrow",
          combatantId: damagerId,
          damageAmount: 2,
        },
      ],
    });
    if (pendingLifecycle.tag !== "needsHoles") {
      throw new Error("Expected a Concentration Saving Throw hole.");
    }
    const concentrationSave = requireHole(
      pendingLifecycle.holes,
      "concentrationSavingThrow",
    );
    const resolved = resolveBattleSubject({
      state: pendingLifecycle.state,
      subject: choice.subject,
      fills: [
        savingThrowOutcomeFill(save, [
          { targetId: damagerId, succeeded: false },
        ]),
        damageRollFillWithGroups(damage, [[1, 1, 1]]),
        damageRollFillWithGroups(concentration, [[1]]),
        concentrationSavingThrowFill(concentrationSave, true),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error(
        "Expected Hellish Rebuke with Concentration save to resolve.",
      );
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: damagerId,
          concentrating: true,
          hp: 10,
        }),
      ]),
    );
  });

  test("Hellish Rebuke requests an advantaged Hideous Laughter save after the affected creature's delayed damage", () => {
    const hellishRebuke = srdSpellRecord(hellishRebukeUnitId);
    const session = battleWithThirdPartyHideousLaughter(hellishRebuke);
    const laughterAct = spellAct({
      session,
      spellId: hideousLaughterUnitId,
      slotLevel: 1,
    });
    expect(laughterAct.subject.actorId).toBe(laughterCasterId);
    const targetList = spellTargetListFill(
      requireHole(laughterAct.initialHoles, "spellTargetList"),
      laughterCasterId,
      hideousLaughterUnitId,
      [damagerId],
    );
    const awaitingInitialSave = resolveBattleSubject({
      state: session.state,
      subject: laughterAct.subject,
      fills: [targetList],
    });
    if (awaitingInitialSave.tag !== "needsHoles") {
      throw new Error("Expected Hideous Laughter's initial Wisdom save.");
    }
    const initialSave = requireHole(
      awaitingInitialSave.holes,
      "savingThrowOutcome",
    );
    const laughed = resolveBattleSubject({
      state: session.state,
      subject: laughterAct.subject,
      fills: [
        targetList,
        savingThrowOutcomeFill(initialSave, [
          { targetId: damagerId, succeeded: false },
        ]),
      ],
    });
    if (laughed.tag !== "resolved") {
      throw new Error("Expected Hideous Laughter to affect the damager.");
    }
    const laughterCaster = requireCombatant(laughed.state, laughterCasterId);
    const laughingDamager = requireCombatant(laughed.state, damagerId);
    const laughterEffect = laughingDamager.activeEffects.find(
      (effect) => effect.kind === "hideousLaughter",
    );
    expect(laughterCaster.concentration).toMatchObject({
      sourceProcedureRef: laughterAct.subject.procedureRef,
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(laughed.state, spellCasterId).concentration,
    ).toBeNull();
    expect(hasCondition(laughingDamager.conditions, "prone")).toBe(true);
    expect(hasCondition(laughingDamager.conditions, "incapacitated")).toBe(
      true,
    );
    expect(laughterEffect).toMatchObject({
      sourceProcedureRef: laughterAct.subject.procedureRef,
      sourceCombatantId: laughterCasterId,
      expiresAt: {
        kind: "concentration",
        combatantId: laughterCasterId,
        durationTicks: hideousLaughterDurationTicks,
      },
    });

    const hellishRebukeCasterTurn = endTurn({
      state: laughed.state,
      actorId: laughterCasterId,
    });
    if (hellishRebukeCasterTurn.tag !== "resolved") {
      throw new Error("Expected the Hideous Laughter caster's turn to end.");
    }
    const damagerTurn = endTurn({
      state: hellishRebukeCasterTurn.state,
      actorId: spellCasterId,
    });
    if (damagerTurn.tag !== "resolved") {
      throw new Error("Expected the Hellish Rebuke caster's turn to end.");
    }
    const delayedDamageAmount = damageAmount(1);
    const afterDelayedDamage = applyBattleHitPointDamage({
      state: damagerTurn.state,
      target: requireCombatant(damagerTurn.state, spellCasterId),
      damageAmount: delayedDamageAmount,
      deathFailuresAtZeroHp: 1,
      damageSourceId: damagerId,
    });
    expect(requireCombatant(afterDelayedDamage, spellCasterId).hp).toBe(Hp(11));
    expect(
      requireCombatant(afterDelayedDamage, laughterCasterId).concentration,
    ).toMatchObject({
      sourceProcedureRef: laughterAct.subject.procedureRef,
      effectKind: "spellEffect",
    });

    // The damage comes from an effect created before the source became
    // Incapacitated, so resolving it doesn't require the source to act.
    const awaitingReaction = openAfterDamageSequenceInterruptWindow({
      state: afterDelayedDamage,
      subject: {
        tag: "runtimeCommand",
        actorId: damagerId,
        command: "endTurn",
      },
      events: [
        {
          damageSourceId: damagerId,
          damagedId: spellCasterId,
          damageAmount: delayedDamageAmount,
          reactionSpellTargetFacts: [
            {
              kind: "reactionSpellDamagerVisibleWithinRange",
              reactorId: spellCasterId,
              damageSourceId: damagerId,
              sourceProcedureRef: hellishRebukeProcedureRef(
                afterDelayedDamage,
                spellCasterId,
              ),
              rangeFeet: movementFeet(60),
            },
          ],
        },
      ],
      objectDamages: [],
      objectIgnitions: [],
      droppedObjects: [],
      handledInterruptTrigger: undefined,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      battleRuntimeSessionForTest({
        ...session,
        state: awaitingReaction.state,
      }),
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const damage = requireHole(choice.initialHoles, "rolledDice");
    const pendingRepeatSave = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: damagerId, succeeded: false },
              ]),
              damageRollFillWithGroups(damage, [[1, 1, 1]]),
            ],
          },
        },
      ),
    });
    expect(pendingRepeatSave).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "savingThrowOutcome",
          hideousLaughterRepeatSave: {
            targetId: damagerId,
            trigger: "damage",
          },
          targetRollModes: [{ targetId: damagerId, rollMode: "advantage" }],
        },
      ],
    });
  });

  test("declining the offered Reaction leaves the damaging creature and resources unchanged", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId));
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        { kind: "decline", responderId: spellCasterId },
      ),
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected declined Hellish Rebuke Reaction to resolve.");
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          hp: 11,
          reactionAvailable: true,
          origin: expect.objectContaining({
            spellcasting: expect.objectContaining({
              spellSlots: expect.arrayContaining([
                expect.objectContaining({ spellLevel: 2, expended: 0 }),
              ]),
            }),
          }),
        }),
        expect.objectContaining({
          combatantId: damagerId,
          hp: 12,
        }),
      ]),
    );
  });

  test("rejects a stale Hellish Rebuke continuation outside the active Reaction window", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId));
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      state,
    );

    const stale = resolveBattleSubject({
      state: state.state,
      subject: choice.subject,
      fills: [],
    });
    expect(stale).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Triggered Reaction spell casting requires an active matching interrupt checkpoint.",
    });
  });

  test("rejects an ineligible responder for a pending Hellish Rebuke", () => {
    const session = battleWithHellishRebuke(
      srdSpellRecord(hellishRebukeUnitId),
    );
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state: session,
      includeHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      session,
    );
    expect(
      resolveBattleInterrupt({
        state: awaitingReaction.state,
        fill: interruptDecisionFill(
          requireHole(awaitingReaction.holes, "interruptDecision"),
          {
            kind: "resolve",
            responderId: damagerId,
            choice: {
              kind: "castTriggeredReactionSpell",
              procedureRef: choice.subject.procedureRef,
              fills: [],
            },
          },
        ),
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Interrupt decision responder is not eligible for the pending interrupt checkpoint.",
    });
  });

  test("rejects a pending Hellish Rebuke after its spell slot is expended", () => {
    const session = battleWithHellishRebuke(
      srdSpellRecord(hellishRebukeUnitId),
    );
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state: session,
      includeHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      session,
    );
    const withoutSlot = withCombatant(
      awaitingReaction.state,
      spellCasterId,
      (caster) => {
        if (
          caster.origin.kind !== "character" ||
          caster.origin.spellcasting === undefined
        ) {
          throw new Error("Expected the Hellish Rebuke caster.");
        }
        return {
          ...caster,
          origin: {
            ...caster.origin,
            spellcasting: {
              ...caster.origin.spellcasting,
              spellSlots: caster.origin.spellcasting.spellSlots.map((slot) =>
                slot.spellLevel === 2
                  ? { ...slot, expended: slot.count }
                  : slot,
              ),
            },
          },
        };
      },
    );

    expect(
      resolveBattleInterrupt({
        state: withoutSlot,
        fill: interruptDecisionFill(
          requireHole(awaitingReaction.holes, "interruptDecision"),
          {
            kind: "resolve",
            responderId: spellCasterId,
            choice: {
              kind: "castTriggeredReactionSpell",
              procedureRef: choice.subject.procedureRef,
              fills: [],
            },
          },
        ),
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Triggered Reaction spell no longer has its required runtime spell resource.",
    });
  });

  test("rejects a pending Hellish Rebuke after another slot use commits this turn", () => {
    const session = battleWithHellishRebuke(
      srdSpellRecord(hellishRebukeUnitId),
    );
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state: session,
      includeHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      session,
    );
    const afterPriorSlotUse = {
      ...awaitingReaction.state,
      currentTurnResources: {
        ...awaitingReaction.state.currentTurnResources,
        spellSlotUsesThisTurn: [
          { kind: "committed" as const, combatantId: spellCasterId },
        ],
      },
    };

    expect(
      resolveBattleInterrupt({
        state: afterPriorSlotUse,
        fill: interruptDecisionFill(
          requireHole(awaitingReaction.holes, "interruptDecision"),
          {
            kind: "resolve",
            responderId: spellCasterId,
            choice: {
              kind: "castTriggeredReactionSpell",
              procedureRef: choice.subject.procedureRef,
              fills: [],
            },
          },
        ),
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "This turn has already expended a Spell Slot.",
    });
  });

  test("retains a supplied saving throw while requesting Hellish Rebuke damage", () => {
    const session = battleWithHellishRebuke(
      srdSpellRecord(hellishRebukeUnitId),
    );
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state: session,
      includeHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      session,
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");

    const result = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: damagerId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
  });

  test("is not offered without caller-supplied visibility and range facts for the damaging creature", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId));
    const result = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: false,
    });
    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("is not offered when caller-supplied damager facts do not establish 60-foot range", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId));
    const result = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: true,
      hellishRebukeFactRangeFeet: movementFeet(120),
    });
    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("is not offered when the damaged caster has no Reaction available", () => {
    const session = battleWithHellishRebuke(
      srdSpellRecord(hellishRebukeUnitId),
    );
    const state = battleRuntimeSessionForTest({
      ...session,
      state: withCombatant(session.state, spellCasterId, (caster) => ({
        ...caster,
        reactionAvailable: false,
      })),
    });
    const result = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: true,
    });
    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("is not offered when the damaged caster has no available Spell Slot", () => {
    const hellishRebuke = srdSpellRecord(hellishRebukeUnitId);
    const state = battleWithHellishRebuke(hellishRebuke, {
      casterSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [hellishRebuke],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const result = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: true,
    });
    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("records the after-damage damager, defender, and slot continuation facts", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId));
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const frame = requireTopInterruptCheckpoint(awaitingReaction.state);
    expect(frame).toMatchObject({
      trigger: "afterDamage",
      damageSourceId: damagerId,
      damagedId: spellCasterId,
      damageAmount: 1,
      continuation: { kind: "resolved" },
      reactionSpellTargetFacts: [
        {
          kind: "reactionSpellDamagerVisibleWithinRange",
          reactorId: spellCasterId,
          damageSourceId: damagerId,
          sourceProcedureRef: expect.any(String),
          rangeFeet: movementFeet(60),
        },
      ],
    });
    const choice = awaitingReaction.snapshot.pendingInterrupt?.choices.find(
      (candidate) => {
        if (
          candidate.kind !== "castTriggeredReactionSpell" ||
          candidate.reactorId !== spellCasterId
        )
          return false;
        const invocation = characterSpellInvocationRefForProcedureRefForTest(
          battleRuntimeSessionForTest({
            ...state,
            state: awaitingReaction.state,
          }),
          candidate.reactorId,
          candidate.subject.procedureRef,
        );
        return invocation.tag === "spellSlot" && invocation.slotLevel === 2;
      },
    );
    expect(choice).toMatchObject({
      kind: "castTriggeredReactionSpell",
      reactorId: spellCasterId,
      subject: {
        tag: "runtimeCommand",
        command: "castTriggeredReactionSpell",
        reactorId: spellCasterId,
      },
    });
    if (choice?.kind !== "castTriggeredReactionSpell") {
      throw new Error("Expected Hellish Rebuke Reaction choice.");
    }
    expect(
      characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({
          ...state,
          state: awaitingReaction.state,
        }),
        choice.reactorId,
        choice.subject.procedureRef,
      ),
    ).toEqual(
      spellSlotInvocationRef(hellishRebukeUnitId, 2, "saveGatedDamage"),
    );
  });

  test("opens an after-damage Reaction window for the damage caused by Hellish Rebuke and resumes after decline", () => {
    const hellishRebuke = srdSpellRecord(hellishRebukeUnitId);
    const state = battleWithHellishRebuke(hellishRebuke, {
      damagerSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [hellishRebuke],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    });
    const awaitingReaction = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: true,
      includeReciprocalHellishRebukeTriggerFact: true,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected initial Hellish Rebuke Reaction window.");
    }
    const choice = requireHellishRebukeChoice(
      awaitingReaction,
      spellCasterId,
      state,
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const damage = requireHole(choice.initialHoles, "rolledDice");
    const afterHellishRebukeDamage = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: damagerId, succeeded: false },
              ]),
              damageRollFillWithGroups(damage, [[1, 1, 1]]),
            ],
          },
        },
      ),
    });
    expect(afterHellishRebukeDamage).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "afterDamage" } },
    });
    if (afterHellishRebukeDamage.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke damage Reaction window.");
    }
    expectHellishRebukeChoice(afterHellishRebukeDamage, damagerId, state);

    const resumed = resolveBattleInterrupt({
      state: afterHellishRebukeDamage.state,
      fill: interruptDecisionFill(
        requireHole(afterHellishRebukeDamage.holes, "interruptDecision"),
        { kind: "decline", responderId: damagerId },
      ),
    });
    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resumed.tag !== "resolved") {
      throw new Error("Expected declined reciprocal Reaction to resume.");
    }
    expect(resumed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          hp: 11,
          reactionAvailable: false,
        }),
        expect.objectContaining({
          combatantId: damagerId,
          hp: 9,
          reactionAvailable: true,
        }),
      ]),
    );
  });

  test("cannot be resolved through the ordinary Magic action spell lane", () => {
    const state = battleWithHellishRebukeOnCasterTurn(
      srdSpellRecord(hellishRebukeUnitId),
    );
    const result = resolveBattleSubject({
      state: state.state,
      subject: {
        tag: "actionSpell",
        actorId: spellCasterId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          state,
          spellCasterId,
          spellSlotInvocationRef(hellishRebukeUnitId, 1, "saveGatedDamage"),
        ),
        mode: { tag: "cast" },
      },
      fills: [],
    });
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      message:
        "Triggered Reaction spells must use the pending interrupt decision.",
    });
  });

  test("is offered after caller-supplied Magic Missile damage facts from the damaging creature", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId), {
      damagerSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [srdSpellRecord(magicMissileUnitId)],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    });
    const targetAllocationResult = resolveBattleSubject({
      state: state.state,
      subject: magicMissileSubject(state),
      fills: [],
    });
    if (targetAllocationResult.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile target allocation hole.");
    }
    const targetAllocation = requireHole(
      targetAllocationResult.holes,
      "spellTargetAllocation",
    );
    const damageResult = resolveBattleSubject({
      state: state.state,
      subject: magicMissileSubject(state),
      fills: [magicMissileTargetAllocationFill(state.state, targetAllocation)],
    });
    if (damageResult.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage hole.");
    }
    const damage = requireHole(damageResult.holes, "rolledDice");
    const result = resolveBattleSubject({
      state: state.state,
      subject: magicMissileSubject(state),
      fills: [
        magicMissileTargetAllocationFill(state.state, targetAllocation),
        damageRollFillWithGroups(damage, [[1, 1, 1]]),
      ],
    });
    expect(result).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "afterDamage" } },
    });
    if (result.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage to offer Hellish Rebuke.");
    }
    expectHellishRebukeChoice(result, spellCasterId, state);
  });
});

function srdSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function battleWithHellishRebuke(
  spell: SpellRecord,
  input: {
    readonly damagerSpellcasting?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"];
    readonly casterSpellcasting?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"];
  } = {},
): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("hellish-rebuke-reaction-spell"),
    combatants: [
      characterCreature({
        combatantId: damagerId,
        displayName: "Damager",
        initiative: 20,
        spellcasting: input.damagerSpellcasting,
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Hellish Rebuke caster",
        initiative: 10,
        spellcasting: input.casterSpellcasting ?? {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [
            { spellLevel: 1, count: 1 },
            { spellLevel: 2, count: 1 },
          ],
        },
      }),
    ],
  });
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function battleWithHellishRebukeOnCasterTurn(
  spell: SpellRecord,
): BattleRuntimeSession {
  return startDirectSpellLaneBattle([
    characterCreature({
      combatantId: spellCasterId,
      displayName: "Hellish Rebuke caster",
      initiative: 20,
      spellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spell],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    }),
    characterCreature({
      combatantId: damagerId,
      displayName: "Damager",
      initiative: 10,
    }),
  ]);
}

function battleWithThirdPartyHideousLaughter(
  hellishRebuke: SpellRecord,
): BattleRuntimeSession {
  return startDirectSpellLaneBattle([
    characterCreature({
      combatantId: laughterCasterId,
      displayName: "Hideous Laughter caster",
      initiative: 30,
      spellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [srdSpellRecord(hideousLaughterUnitId)],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    }),
    characterCreature({
      combatantId: spellCasterId,
      displayName: "Hellish Rebuke caster",
      initiative: 20,
      classLevels: [{ className: "warlock", level: 3 }],
      spellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "warlock",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [hellishRebuke],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    }),
    characterCreature({
      combatantId: damagerId,
      displayName: "Damager",
      initiative: 10,
    }),
  ]);
}

function startDirectSpellLaneBattle(
  combatants: readonly [BattleCreatureInit, ...BattleCreatureInit[]],
): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("hellish-rebuke-direct-spell-lane"),
    combatants,
  });
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: input.classLevels ?? [{ className: "wizard", level: 3 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function resolveUnarmedStrikeAgainstCaster(input: {
  readonly state: BattleRuntimeSession;
  readonly includeHellishRebukeTriggerFact: boolean;
  readonly hellishRebukeFactRangeFeet?:
    | ReturnType<typeof movementFeet>
    | undefined;
  readonly includeReciprocalHellishRebukeTriggerFact?: boolean | undefined;
}): ReturnType<typeof resolveBattleSubject> {
  const attackAct = discoverBattleActs(input.state).find(
    (act): act is AttackAct =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === damagerId &&
      act.summary === "Take the Attack action with Unarmed Strike.",
  );
  if (attackAct === undefined) {
    throw new Error("Expected Unarmed Strike attack act.");
  }
  const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
  const targetFill = attackTargetFill({
    state: input.state.state,
    hole: targetHole,
    includeHellishRebukeTriggerFact: input.includeHellishRebukeTriggerFact,
    hellishRebukeFactRangeFeet: input.hellishRebukeFactRangeFeet,
    includeReciprocalHellishRebukeTriggerFact:
      input.includeReciprocalHellishRebukeTriggerFact === true,
  });
  const awaitingAttackRoll = resolveBattleSubject({
    state: input.state.state,
    subject: attackAct.subject,
    fills: [targetFill],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected attack target to request an Attack Roll.");
  }
  const attackRollHole = requireHole(awaitingAttackRoll.holes, "attackRoll");
  return resolveBattleSubject({
    state: input.state.state,
    subject: attackAct.subject,
    fills: [
      targetFill,
      {
        kind: "attackRoll",
        holeId: attackRollHole.holeId,
        value: { total: 15, naturalD20: DieRollResult(13) },
      },
    ],
  });
}

function attackTargetFill(input: {
  readonly state: BattleState;
  readonly hole: Extract<BattleHole, { readonly kind: "targetChoice" }>;
  readonly includeHellishRebukeTriggerFact: boolean;
  readonly hellishRebukeFactRangeFeet?:
    | ReturnType<typeof movementFeet>
    | undefined;
  readonly includeReciprocalHellishRebukeTriggerFact: boolean;
}): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (input.hole.attack === undefined) {
    throw new Error("Expected bound Hellish Rebuke trigger attack selection.");
  }
  return {
    kind: "targetChoice",
    holeId: input.hole.holeId,
    value: spellCasterId,
    spatialFacts: [
      {
        kind: "attackTargetDistance",
        actorId: damagerId,
        targetId: spellCasterId,
        distanceFeet: movementFeet(5),
        ...input.hole.attack.selection,
      },
      ...(input.includeHellishRebukeTriggerFact
        ? [
            {
              kind: "reactionSpellDamagerVisibleWithinRange" as const,
              reactorId: spellCasterId,
              damageSourceId: damagerId,
              sourceProcedureRef: hellishRebukeProcedureRef(
                input.state,
                spellCasterId,
              ),
              rangeFeet: input.hellishRebukeFactRangeFeet ?? movementFeet(60),
            },
          ]
        : []),
      ...(input.includeReciprocalHellishRebukeTriggerFact
        ? [
            {
              kind: "reactionSpellDamagerVisibleWithinRange" as const,
              reactorId: damagerId,
              damageSourceId: spellCasterId,
              sourceProcedureRef: hellishRebukeProcedureRef(
                input.state,
                damagerId,
              ),
              rangeFeet: movementFeet(60),
            },
          ]
        : []),
    ],
  };
}

function withCombatant(
  state: BattleState,
  combatantId: CombatantId,
  update: (combatant: BattleCreatureState) => BattleCreatureState,
): BattleState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, update(combatant)),
  };
}

function requireTopInterruptCheckpoint(
  state: BattleState,
): BattleInterruptCheckpoint {
  const frame = state.interruptStack[state.interruptStack.length - 1];
  if (frame?.kind !== "interruptCheckpoint") {
    throw new Error(
      "Expected top interrupt frame to be an interrupt checkpoint.",
    );
  }
  return frame.frame;
}

function expectHellishRebukeChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
  reactorId: CombatantId,
  session: BattleRuntimeSession,
): void {
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (candidate) =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.reactorId === reactorId,
  );
  if (choice?.kind !== "castTriggeredReactionSpell") {
    throw new Error("Expected Hellish Rebuke Reaction spell choice.");
  }
  expect(() =>
    Schema.decodeUnknownSync(BattleInterruptProcedureChoiceSchema)(choice),
  ).not.toThrow();
  expect(() =>
    Schema.decodeUnknownSync(BattleSnapshotSchema)(
      Schema.encodeSync(BattleSnapshotSchema)(result.snapshot),
    ),
  ).not.toThrow();
  expect(
    characterSpellInvocationRefForProcedureRefForTest(
      battleRuntimeSessionForTest({ ...session, state: result.state }),
      choice.reactorId,
      choice.subject.procedureRef,
    ),
  ).toMatchObject({
    spellId: hellishRebukeUnitId,
    procedure: "saveGatedDamage",
  });
}

function requireHellishRebukeChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
  reactorId: CombatantId,
  session: BattleRuntimeSession,
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleInterruptProcedureChoice,
      { readonly kind: "castTriggeredReactionSpell" }
    > => {
      if (
        candidate.kind !== "castTriggeredReactionSpell" ||
        candidate.reactorId !== reactorId
      )
        return false;
      const invocation = characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({ ...session, state: result.state }),
        candidate.reactorId,
        candidate.subject.procedureRef,
      );
      return (
        invocation.tag === "spellSlot" &&
        invocation.spellId === hellishRebukeUnitId &&
        invocation.procedure === "saveGatedDamage" &&
        invocation.slotLevel === 2
      );
    },
  );
  if (choice === undefined) {
    throw new Error("Expected Hellish Rebuke level 2 Reaction choice.");
  }
  return choice;
}

function magicMissileSubject(session: BattleRuntimeSession): BattleSubject {
  return {
    tag: "actionSpell",
    actorId: damagerId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      damagerId,
      spellSlotInvocationRef(magicMissileUnitId, 1, "repeatedDamageAllocation"),
    ),
    mode: { tag: "cast" },
  };
}

function magicMissileTargetAllocationFill(
  state: BattleState,
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations: [{ targetId: spellCasterId, count: 3 }] },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: damagerId,
        targetId: spellCasterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(hole),
      },
      {
        kind: "reactionSpellDamagerVisibleWithinRange",
        reactorId: spellCasterId,
        damageSourceId: damagerId,
        sourceProcedureRef: hellishRebukeProcedureRef(state, spellCasterId),
        rangeFeet: movementFeet(60),
      },
    ],
  };
}

function hellishRebukeProcedureRef(state: BattleState, reactorId: CombatantId) {
  const slotLevel = reactorId === spellCasterId ? 2 : 1;
  const reactor = state.combatants.get(reactorId);
  const slot =
    reactor?.origin.kind === "character"
      ? reactor.origin.spellcasting?.spellSlots.find(
          (candidate) => candidate.spellLevel === slotLevel,
        )
      : undefined;
  if (slot === undefined || slot.expended >= slot.count) {
    return battleProcedureExecutionRefForTest(
      "synthetic-unavailable-reaction-procedure",
    );
  }
  const binding =
    reactor?.origin.kind === "character"
      ? reactor.origin.execution.procedureBindings.find(
          (candidate) =>
            candidate.procedure.kind === "spellInvocation" &&
            candidate.procedure.execution.procedure === "saveGatedDamage" &&
            candidate.procedure.execution.resource.tag === "spellSlot" &&
            candidate.procedure.execution.resource.slotLevel === slotLevel,
        )
      : undefined;
  return (
    binding?.procedureRef ??
    battleProcedureExecutionRefForTest(
      "synthetic-unavailable-reaction-procedure",
    )
  );
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
  };
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = group;
  if (firstResult === undefined) {
    throw new Error("Expected at least one die roll result.");
  }
  return {
    results: [DieRollResult(firstResult), ...restResults.map(DieRollResult)],
  };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}
