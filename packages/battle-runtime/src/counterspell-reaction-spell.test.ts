import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.reaction-counterspell spell.reaction-shield spell.invocation-damage-save-or-attack
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.REACTION_CASTING_TIME
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import {
  abilityModifier,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActCandidates,
  initiativeScore,
  resolveBattleInterrupt,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleProcedureExecutionRef,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { counterspellCapableReactors } from "./battle-reducer/counterspell-reaction-discovery.ts";
import {
  cantripSpellInvocationRef,
  spellSlotInvocationRef,
} from "./battle-subjects.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  characterSpellInvocationRefForProcedureRefForTest,
  requireCharacterSpellProcedureRefForTest,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Counterspell Reaction spell test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const acidSplashUnitId = "acid_splash";
const expeditiousRetreatUnitId = "expeditious_retreat";
const flameBladeUnitId = "flame_blade";
const magicMissileUnitId = "magic_missile";
const counterspellUnitId = "counterspell";
const shieldUnitId = "shield";
const casterId = combatantId("counterspell-triggering-caster");
const counterspellerId = combatantId("counterspell-reactor");
const secondCounterspellerId = combatantId("counterspell-second-reactor");

describe("Counterspell Reaction spell", () => {
  test("does not admit a Counterspell reactor without an available spell slot", () => {
    const session = battleWithCounterspell({
      counterspellerSlots: [{ spellLevel: 3, count: 0 }],
    });

    expect(counterspellCapableReactors(session.state)).toEqual([]);
  });

  test("an inherited attack trigger does not suppress the distinct spell-cast window", () => {
    const session = battleWithCounterspell();

    expect(
      startMagicMissile({
        session,
        state: session.state,
        slotLevel: 1,
        targetId: counterspellerId,
        handledInterruptTrigger: "attackHit",
        counterspellFacts: [
          counterspellTriggerFact({
            session,
            reactorId: counterspellerId,
            casterId,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "spellCast" } },
    });
  });

  test("ends a lower-level spell on a failed Constitution save without expending the triggering slot", () => {
    const session = battleWithCounterspell();
    const state = session.state;
    const awaitingReaction = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          session,
          reactorId: counterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
      session,
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(
          counterspellerId,
          choice,
          counterspellSavingThrowFills(choice, casterId, false),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Counterspell to resolve.");
    }
    expect(hasTurnAction(resolved.state)).toBe(false);
    expect(snapshotCombatant(resolved, counterspellerId)).toMatchObject({
      hp: 30,
      reactionAvailable: false,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    });
    expect(snapshotCombatant(resolved, casterId)).toMatchObject({
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 1, expended: 0 }),
          ]),
        }),
      }),
    });
  });

  test("routes an incomplete Counterspell selection to its saving throw frontier", () => {
    const session = battleWithCounterspell();
    const awaitingReaction = startMagicMissile({
      session,
      state: session.state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          session,
          reactorId: counterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
      session,
    );
    const incomplete = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        triggeredReactionSpellDecision(counterspellerId, choice, []),
      ),
    });
    expect(incomplete).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "savingThrowOutcome" }],
      snapshot: { pendingInterrupt: { trigger: "spellCast" } },
    });
  });

  test("closes the spell-cast window after the first successful Counterspell", () => {
    const session = battleWithCounterspell({
      includeSecondCounterspeller: true,
    });
    const state = session.state;
    const awaitingReaction = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          session,
          reactorId: counterspellerId,
          casterId,
        }),
        counterspellTriggerFact({
          session,
          reactorId: secondCounterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
      session,
    );

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(
          counterspellerId,
          choice,
          counterspellSavingThrowFills(choice, casterId, false),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Counterspell to close the spell-cast window.");
    }
    expect(snapshotCombatant(resolved, secondCounterspellerId)).toMatchObject({
      reactionAvailable: true,
    });
  });

  test("lets the triggering spell continue when the triggering caster succeeds the Constitution save", () => {
    const session = battleWithCounterspell({
      casterSlots: [
        { spellLevel: 4, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const state = session.state;
    const awaitingReaction = startMagicMissile({
      session,
      state,
      slotLevel: 4,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          session,
          reactorId: counterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
      session,
    );
    const afterCounterspell = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(
          counterspellerId,
          choice,
          counterspellSavingThrowFills(choice, casterId, true),
        ),
      ),
    });
    expect(afterCounterspell).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
    if (afterCounterspell.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile to continue to damage.");
    }

    const damage = requireHole(afterCounterspell.holes, "rolledDice");
    const resolved = finishMagicMissile({
      state: afterCounterspell.state,
      subject: awaitingReaction.subject,
      slotLevel: 4,
      damage,
      dartCount: 6,
    });
    if (resolved.tag === "invalid") {
      throw new Error(resolved.message);
    }
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected continued Magic Missile to resolve.");
    }
    expect(snapshotCombatant(resolved, counterspellerId)).toMatchObject({
      hp: 18,
      reactionAvailable: false,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    });
    expect(snapshotCombatant(resolved, casterId)).toMatchObject({
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 4, expended: 1 }),
          ]),
        }),
      }),
    });
  });

  test("ends a higher-level spell on a failed Constitution save without expending the triggering slot", () => {
    const session = battleWithCounterspell({
      casterSlots: [{ spellLevel: 4, count: 1 }],
    });
    const state = session.state;
    const awaitingReaction = startMagicMissile({
      session,
      state,
      slotLevel: 4,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          session,
          reactorId: counterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
      session,
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(
          counterspellerId,
          choice,
          counterspellSavingThrowFills(choice, casterId, false),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected failed save Counterspell to resolve.");
    }
    expect(snapshotCombatant(resolved, counterspellerId)).toMatchObject({
      hp: 30,
      reactionAvailable: false,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    });
    expect(snapshotCombatant(resolved, casterId)).toMatchObject({
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 4, expended: 0 }),
          ]),
        }),
      }),
    });
  });

  test("allows a second Counterspell to end the first Counterspell and resume the triggering spell", () => {
    const session = battleWithCounterspell({
      casterSlots: [{ spellLevel: 1, count: 1 }],
      includeSecondCounterspeller: true,
    });
    const state = session.state;
    const counterspellFacts = [
      counterspellTriggerFact({
        session,
        reactorId: counterspellerId,
        casterId,
      }),
    ];
    const awaitingFirstCounterspell = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts,
    });
    const firstChoice = requireCounterspellChoice(
      awaitingFirstCounterspell,
      counterspellerId,
      3,
      session,
    );
    assertBattleSnapshotCodecRoundTripForTest(
      awaitingFirstCounterspell.snapshot,
    );
    expect(
      requireHole(firstChoice.initialHoles, "targetSpatialFacts"),
    ).toMatchObject({
      spellBeingCast: {
        casterId: counterspellerId,
        sourceProcedureRef: firstChoice.subject.procedureRef,
        castLevel: 3,
        components: ["S"],
      },
    });

    const awaitingSecondCounterspell = resolveBattleInterrupt({
      state: awaitingFirstCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingFirstCounterspell.holes, "interruptDecision"),
        counterspellDecision(
          counterspellerId,
          firstChoice,
          counterspellSavingThrowFills(firstChoice, casterId, false, [
            spellCastReactionFactsFill([
              counterspellTriggerFact({
                session,
                reactorId: secondCounterspellerId,
                casterId: counterspellerId,
              }),
            ]),
          ]),
        ),
      ),
    });
    expect(awaitingSecondCounterspell).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "spellCast" } },
    });
    if (awaitingSecondCounterspell.tag !== "needsHoles") {
      throw new Error("Expected nested Counterspell Reaction window.");
    }
    const secondChoice = requireCounterspellChoice(
      awaitingSecondCounterspell,
      secondCounterspellerId,
      3,
      session,
    );

    const afterSecondCounterspell = resolveBattleInterrupt({
      state: awaitingSecondCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingSecondCounterspell.holes, "interruptDecision"),
        counterspellDecision(
          secondCounterspellerId,
          secondChoice,
          counterspellSavingThrowFills(secondChoice, counterspellerId, false),
        ),
      ),
    });
    expect(afterSecondCounterspell).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
    if (afterSecondCounterspell.tag !== "needsHoles") {
      throw new Error("Expected original spell to resume after Counterspell.");
    }

    const damage = requireHole(afterSecondCounterspell.holes, "rolledDice");
    const resolved = finishMagicMissile({
      state: afterSecondCounterspell.state,
      subject: awaitingFirstCounterspell.subject,
      slotLevel: 1,
      damage,
      dartCount: 3,
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected resumed Magic Missile to resolve.");
    }
    expect(snapshotCombatant(resolved, counterspellerId)).toMatchObject({
      hp: 24,
      reactionAvailable: false,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 0 }),
          ]),
        }),
      }),
    });
    expect(snapshotCombatant(resolved, secondCounterspellerId)).toMatchObject({
      reactionAvailable: false,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    });
    expect(snapshotCombatant(resolved, casterId)).toMatchObject({
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 1, expended: 1 }),
          ]),
        }),
      }),
    });
  });

  test("allows Counterspell to end Shield before Shield affects the triggering spell", () => {
    const session = battleWithCounterspell({
      casterSlots: [{ spellLevel: 1, count: 1 }],
      counterspellerPreparedSpells: [srdSpellRecord(shieldUnitId)],
      counterspellerSlots: [{ spellLevel: 1, count: 1 }],
      includeSecondCounterspeller: true,
    });
    const state = session.state;
    const awaitingShield = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [],
    });
    const shieldChoice = requireTriggeredReactionSpellChoice({
      session,
      result: awaitingShield,
      reactorId: counterspellerId,
      spellId: shieldUnitId,
      procedure: "shieldReaction",
      slotLevel: 1,
    });

    const awaitingCounterspell = resolveBattleInterrupt({
      state: awaitingShield.state,
      fill: interruptDecisionFill(
        requireHole(awaitingShield.holes, "interruptDecision"),
        triggeredReactionSpellDecision(counterspellerId, shieldChoice, [
          spellCastReactionFactsFill([
            counterspellTriggerFact({
              session,
              reactorId: secondCounterspellerId,
              casterId: counterspellerId,
            }),
          ]),
        ]),
      ),
    });
    expect(awaitingCounterspell).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "spellCast" } },
    });
    if (awaitingCounterspell.tag !== "needsHoles") {
      throw new Error("Expected Counterspell to interrupt Shield casting.");
    }
    const counterspellChoice = requireCounterspellChoice(
      awaitingCounterspell,
      secondCounterspellerId,
      3,
      session,
    );

    const afterCounterspell = resolveBattleInterrupt({
      state: awaitingCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingCounterspell.holes, "interruptDecision"),
        counterspellDecision(
          secondCounterspellerId,
          counterspellChoice,
          counterspellSavingThrowFills(
            counterspellChoice,
            counterspellerId,
            false,
          ),
        ),
      ),
    });
    expect(afterCounterspell).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
    if (afterCounterspell.tag !== "needsHoles") {
      throw new Error(
        "Expected Magic Missile to resume after Shield is ended.",
      );
    }

    const damage = requireHole(afterCounterspell.holes, "rolledDice");
    const resolved = finishMagicMissile({
      state: afterCounterspell.state,
      subject: awaitingShield.subject,
      slotLevel: 1,
      damage,
      dartCount: 3,
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected resumed Magic Missile to resolve.");
    }
    expect(snapshotCombatant(resolved, counterspellerId)).toMatchObject({
      hp: 24,
      reactionAvailable: false,
      armorClass: 10,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 1, expended: 0 }),
          ]),
        }),
      }),
    });
    expect(snapshotCombatant(resolved, secondCounterspellerId)).toMatchObject({
      reactionAvailable: false,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    });
  });

  test("declining nested Counterspell replays Shield without reopening its spell-cast window", () => {
    const session = battleWithCounterspell({
      casterSlots: [{ spellLevel: 1, count: 1 }],
      counterspellerPreparedSpells: [srdSpellRecord(shieldUnitId)],
      counterspellerSlots: [{ spellLevel: 1, count: 1 }],
      includeSecondCounterspeller: true,
    });
    const awaitingShield = startMagicMissile({
      session,
      state: session.state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [],
    });
    const shieldChoice = requireTriggeredReactionSpellChoice({
      session,
      result: awaitingShield,
      reactorId: counterspellerId,
      spellId: shieldUnitId,
      procedure: "shieldReaction",
      slotLevel: 1,
    });

    const awaitingCounterspell = resolveBattleInterrupt({
      state: awaitingShield.state,
      fill: interruptDecisionFill(
        requireHole(awaitingShield.holes, "interruptDecision"),
        triggeredReactionSpellDecision(counterspellerId, shieldChoice, [
          spellCastReactionFactsFill([
            counterspellTriggerFact({
              session,
              reactorId: secondCounterspellerId,
              casterId: counterspellerId,
            }),
          ]),
        ]),
      ),
    });
    expect(awaitingCounterspell).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "spellCast" } },
    });
    if (awaitingCounterspell.tag !== "needsHoles") {
      throw new Error("Expected Counterspell to interrupt Shield casting.");
    }

    requireCounterspellChoice(
      awaitingCounterspell,
      secondCounterspellerId,
      3,
      session,
    );
    const afterDecline = resolveBattleInterrupt({
      state: awaitingCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingCounterspell.holes, "interruptDecision"),
        { kind: "decline", responderId: secondCounterspellerId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
    if (afterDecline.tag !== "needsHoles") {
      throw new Error("Expected Shield to replay after Counterspell decline.");
    }

    const damage = requireHole(afterDecline.holes, "rolledDice");
    const resolved = finishMagicMissile({
      state: afterDecline.state,
      subject: awaitingShield.subject,
      slotLevel: 1,
      damage,
      dartCount: 3,
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Magic Missile to resolve after Shield replay.");
    }
    expect(snapshotCombatant(resolved, counterspellerId)).toMatchObject({
      hp: 30,
      reactionAvailable: false,
      armorClass: 15,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 1, expended: 1 }),
          ]),
        }),
      }),
    });
    expect(snapshotCombatant(resolved, secondCounterspellerId)).toMatchObject({
      reactionAvailable: true,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 0 }),
          ]),
        }),
      }),
    });
  });

  test("opens Counterspell before save-gated damage asks for save or damage fills", () => {
    const session = battleWithCounterspell({
      casterCantrips: [srdSpellRecord(acidSplashUnitId)],
      casterPreparedSpells: [],
    });
    const state = session.state;
    const subject = requireCastSpellSubject(
      session,
      requireCharacterSpellProcedureRefForTest(
        session,
        casterId,
        cantripSpellInvocationRef(acidSplashUnitId, "saveGatedDamage"),
      ),
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        spellCastReactionFactsFill([
          counterspellTriggerFact({
            session,
            reactorId: counterspellerId,
            casterId,
          }),
        ]),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "spellCast" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Counterspell to interrupt Acid Splash casting.",
      );
    }

    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
      session,
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(
          counterspellerId,
          choice,
          counterspellSavingThrowFills(choice, casterId, false),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Counterspell to end Acid Splash.");
    }
    expect(hasTurnAction(resolved.state)).toBe(false);
    expect(snapshotCombatant(resolved, counterspellerId)).toMatchObject({
      hp: 30,
      reactionAvailable: false,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    });
  });

  test("allows Counterspell facts on a no-target Bonus Action spell cast", () => {
    const session = battleWithCounterspell({
      casterPreparedSpells: [srdSpellRecord(expeditiousRetreatUnitId)],
      casterSlots: [{ spellLevel: 1, count: 1 }],
    });
    const state = session.state;
    const subject = requireCastSpellSubject(
      session,
      requireCharacterSpellProcedureRefForTest(
        session,
        casterId,
        spellSlotInvocationRef(
          expeditiousRetreatUnitId,
          1,
          "expeditiousRetreatDash",
        ),
      ),
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        spellCastReactionFactsFill([
          counterspellTriggerFact({
            session,
            reactorId: counterspellerId,
            casterId,
          }),
        ]),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "spellCast" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Counterspell to interrupt Expeditious Retreat.",
      );
    }
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
      session,
    );

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(
          counterspellerId,
          choice,
          counterspellSavingThrowFills(choice, casterId, false),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
        turn: { bonusActionAvailable: false, dashMovementBonusFeet: 0 },
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Counterspell to end Expeditious Retreat.");
    }
    expect(snapshotCombatant(resolved, casterId)).toMatchObject({
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 1, expended: 0 }),
          ]),
        }),
      }),
    });
  });

  test("opens Counterspell for a spell-created held object cast", () => {
    const session = battleWithCounterspell({
      casterPreparedSpells: [srdSpellRecord(flameBladeUnitId)],
      casterSlots: [{ spellLevel: 2, count: 1 }],
    });
    const subject = requireCastSpellSubject(
      session,
      requireCharacterSpellProcedureRefForTest(
        session,
        casterId,
        spellSlotInvocationRef(flameBladeUnitId, 2, "spellCreatedHeldObject"),
      ),
    );

    expect(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [
          spellCastReactionFactsFill([
            counterspellTriggerFact({
              session,
              reactorId: counterspellerId,
              casterId,
            }),
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "spellCast" } },
    });
  });

  test("does not reopen Counterspell after all reactors decline and the spell asks for later fills", () => {
    const session = battleWithCounterspell();
    const state = session.state;
    const awaitingReaction = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          session,
          reactorId: counterspellerId,
          casterId,
        }),
      ],
    });
    const declined = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        { kind: "decline", responderId: counterspellerId },
      ),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
    if (declined.tag !== "needsHoles") {
      throw new Error(
        "Expected declined Counterspell window to resume damage.",
      );
    }
    const damage = requireHole(declined.holes, "rolledDice");

    const resolved = finishMagicMissile({
      state: declined.state,
      subject: awaitingReaction.subject,
      slotLevel: 1,
      damage,
      dartCount: 3,
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("does not offer same-turn Counterspell when the triggering caster already has a pending spell-slot cast", () => {
    const session = battleWithCounterspell({
      casterPreparedSpells: [
        srdSpellRecord(magicMissileUnitId),
        srdSpellRecord(counterspellUnitId),
      ],
      casterSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const state = session.state;
    const awaitingReaction = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          session,
          reactorId: counterspellerId,
          casterId,
        }),
        counterspellTriggerFact({
          session,
          reactorId: casterId,
          casterId: counterspellerId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
      session,
    );

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(
          counterspellerId,
          choice,
          counterspellSavingThrowFills(choice, casterId, false),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error(
        "Expected Counterspell to resolve without offering the triggering caster a same-turn slotted Counterspell.",
      );
    }
    expect(snapshotCombatant(resolved, casterId)).toMatchObject({
      reactionAvailable: true,
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 1, expended: 0 }),
            expect.objectContaining({ spellLevel: 3, expended: 0 }),
          ]),
        }),
      }),
    });
  });
});

function srdSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

type CharacterSpellcastingInit = NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
>;

function battleWithCounterspell(
  input: {
    readonly casterCantrips?: readonly SpellRecord[] | undefined;
    readonly casterPreparedSpells?: readonly SpellRecord[] | undefined;
    readonly casterSlots?: CharacterSpellcastingInit["spellSlots"] | undefined;
    readonly counterspellerPreparedSpells?: readonly SpellRecord[] | undefined;
    readonly counterspellerSlots?:
      | CharacterSpellcastingInit["spellSlots"]
      | undefined;
    readonly includeSecondCounterspeller?: boolean | undefined;
  } = {},
): BattleRuntimeSession {
  const counterspell = srdSpellRecord(counterspellUnitId);
  const result = startBattle({
    battleId: battleId("counterspell-reaction-spell"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Triggering caster",
        initiative: 20,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.casterCantrips ?? [],
          preparedSpells: input.casterPreparedSpells ?? [
            srdSpellRecord(magicMissileUnitId),
          ],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: input.casterSlots ?? [{ spellLevel: 1, count: 1 }],
        },
      }),
      characterCreature({
        combatantId: counterspellerId,
        displayName: "Counterspell reactor",
        initiative: 10,
        spellcasting:
          input.counterspellerPreparedSpells === undefined &&
          input.counterspellerSlots === undefined
            ? counterspellSpellcasting(counterspell)
            : wizardSpellcasting({
                preparedSpells: input.counterspellerPreparedSpells ?? [
                  counterspell,
                ],
                spellSlots: input.counterspellerSlots ?? [
                  { spellLevel: 3, count: 1 },
                ],
              }),
      }),
      ...(input.includeSecondCounterspeller === true
        ? [
            characterCreature({
              combatantId: secondCounterspellerId,
              displayName: "Second Counterspell reactor",
              initiative: 5,
              spellcasting: counterspellSpellcasting(counterspell),
            }),
          ]
        : []),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function counterspellSpellcasting(
  counterspell: SpellRecord,
): CharacterSpellcastingInit {
  return wizardSpellcasting({
    preparedSpells: [counterspell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
}

function wizardSpellcasting(input: {
  readonly cantrips?: readonly SpellRecord[] | undefined;
  readonly preparedSpells: readonly SpellRecord[];
  readonly spellSlots: CharacterSpellcastingInit["spellSlots"];
}): CharacterSpellcastingInit {
  return {
    sourceClassName: "wizard",
    spellcastingAbilityModifier: abilityModifier(3),
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: input.cantrips ?? [],
    preparedSpells: input.preparedSpells,
    featurePreparedSpells: [],
    spellbookRitualSpellAccesses: [],
    invocationSpellAccesses: [],
    spellSlots: input.spellSlots,
  };
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly spellcasting: CharacterSpellcastingInit;
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
      classLevels: [{ className: "wizard", level: 7 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(30),
      maxHp: Hp(30),
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
      spellcasting: input.spellcasting,
    },
  };
}

type NeedsHolesResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;

type StartedMagicMissile = NeedsHolesResult;

function startMagicMissile(input: {
  readonly session: BattleRuntimeSession;
  readonly state: BattleState;
  readonly slotLevel: number;
  readonly targetId: CombatantId;
  readonly handledInterruptTrigger?: "attackHit";
  readonly counterspellFacts: readonly CounterspellTriggerFact[];
}): StartedMagicMissile {
  const subject = magicMissileSubject(input.session, input.slotLevel);
  const targetAllocationResult = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [],
  });
  if (targetAllocationResult.tag !== "needsHoles") {
    throw new Error("Expected Magic Missile target allocation hole.");
  }
  const allocation = requireHole(
    targetAllocationResult.holes,
    "spellTargetAllocation",
  );
  const targetAllocationFill = magicMissileTargetAllocationFill({
    hole: allocation,
    casterId,
    targetId: input.targetId,
    dartCount: allocation.allocationCount,
  });
  const result = resolveBattleSubject({
    state: input.state,
    subject,
    ...(input.handledInterruptTrigger === undefined
      ? {}
      : { handledInterruptTrigger: input.handledInterruptTrigger }),
    fills: [
      targetAllocationFill,
      spellCastReactionFactsFill(
        input.counterspellFacts.map((fact) => ({
          ...fact,
          sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
            input.session,
            fact.reactorId,
            spellSlotInvocationRef(counterspellUnitId, 3, "counterspell"),
          ),
        })),
      ),
    ],
  });
  expect(result).toMatchObject({
    tag: "needsHoles",
    snapshot: { pendingInterrupt: { trigger: "spellCast" } },
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Magic Missile spell-cast Reaction window.");
  }
  return result;
}

function finishMagicMissile(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly slotLevel: number;
  readonly damage: Extract<BattleHole, { readonly kind: "rolledDice" }>;
  readonly dartCount: number;
}): ReturnType<typeof resolveBattleSubject> {
  return resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: [
      damageRollFillWithGroups(input.damage, [
        Array.from({ length: input.dartCount }, () => 1),
      ]),
    ],
  });
}

type CounterspellTriggerFact = Extract<
  Extract<
    BattleFill,
    { readonly kind: "targetSpatialFacts" }
  >["spatialFacts"][number],
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>;

function counterspellTriggerFact(input: {
  readonly session: BattleRuntimeSession;
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
      input.session,
      input.reactorId,
      spellSlotInvocationRef(counterspellUnitId, 3, "counterspell"),
    ),
    rangeFeet: movementFeet(60),
  };
}

function magicMissileSubject(
  session: BattleRuntimeSession,
  slotLevel: number,
): BattleSubject {
  const procedureRef = requireCharacterSpellProcedureRefForTest(
    session,
    casterId,
    spellSlotInvocationRef(
      magicMissileUnitId,
      slotLevel,
      "repeatedDamageAllocation",
    ),
  );
  const subject = discoverBattleActCandidates(session.state).find(
    (act) =>
      act.subject.tag === "actionSpell" &&
      act.subject.actorId === casterId &&
      act.subject.mode.tag === "cast" &&
      act.subject.procedureRef === procedureRef,
  )?.subject;
  if (subject === undefined) {
    throw new Error(`Expected a bound level ${slotLevel} Magic Missile act.`);
  }
  return subject;
}

function requireCastSpellSubject(
  session: BattleRuntimeSession,
  procedureRef: BattleProcedureExecutionRef,
): BattleSubject {
  const subject = discoverBattleActCandidates(session.state).find(
    (act) =>
      (act.subject.tag === "actionSpell" ||
        act.subject.tag === "bonusActionSpell" ||
        act.subject.tag === "bonusActionDashSpell") &&
      act.subject.actorId === casterId &&
      act.subject.mode.tag === "cast" &&
      act.subject.procedureRef === procedureRef,
  )?.subject;
  if (subject === undefined) {
    throw new Error(`Expected a bound ${procedureRef} cast act.`);
  }
  return subject;
}

function magicMissileTargetAllocationFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "spellTargetAllocation" }
  >;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly dartCount: number;
}): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: input.hole.holeId,
    value: {
      allocations: [{ targetId: input.targetId, count: input.dartCount }],
    },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: input.casterId,
        targetId: input.targetId,
        sourceProcedureRef: input.hole.sourceProcedureRef,
      },
    ],
  };
}

function requireCounterspellChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
  reactorId: CombatantId,
  slotLevel: number,
  session: BattleRuntimeSession,
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  return requireTriggeredReactionSpellChoice({
    session,
    result,
    reactorId,
    spellId: counterspellUnitId,
    procedure: "counterspell",
    slotLevel,
  });
}

function requireTriggeredReactionSpellChoice(input: {
  readonly session: BattleRuntimeSession;
  readonly result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >;
  readonly reactorId: CombatantId;
  readonly spellId: string;
  readonly procedure: string;
  readonly slotLevel: number;
}): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = input.result.snapshot.pendingInterrupt?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleInterruptProcedureChoice,
      { readonly kind: "castTriggeredReactionSpell" }
    > => {
      if (
        candidate.kind !== "castTriggeredReactionSpell" ||
        candidate.reactorId !== input.reactorId
      ) {
        return false;
      }
      const invocation = characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({
          state: input.result.state,
          context: input.session.context,
        }),
        candidate.reactorId,
        candidate.subject.procedureRef,
      );
      return (
        invocation.tag === "spellSlot" &&
        invocation.spellId === input.spellId &&
        invocation.procedure === input.procedure &&
        Number(invocation.slotLevel) === input.slotLevel
      );
    },
  );
  if (choice === undefined) {
    throw new Error(`Expected ${input.spellId} Reaction choice.`);
  }
  return choice;
}

function counterspellDecision(
  reactorId: CombatantId,
  choice: Extract<
    BattleInterruptProcedureChoice,
    { readonly kind: "castTriggeredReactionSpell" }
  >,
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"] {
  return triggeredReactionSpellDecision(reactorId, choice, fills);
}

function counterspellSavingThrowFills(
  choice: Extract<
    BattleInterruptProcedureChoice,
    { readonly kind: "castTriggeredReactionSpell" }
  >,
  triggeringCasterId: CombatantId,
  succeeded: boolean,
  additionalFills: readonly BattleFill[] = [],
): readonly BattleFill[] {
  return [
    ...additionalFills,
    savingThrowOutcomeFill(
      requireHole(choice.initialHoles, "savingThrowOutcome"),
      [{ targetId: triggeringCasterId, succeeded }],
    ),
  ];
}

function triggeredReactionSpellDecision(
  reactorId: CombatantId,
  choice: Extract<
    BattleInterruptProcedureChoice,
    { readonly kind: "castTriggeredReactionSpell" }
  >,
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"] {
  return {
    kind: "resolve",
    responderId: reactorId,
    choice: {
      kind: "castTriggeredReactionSpell",
      procedureRef: choice.subject.procedureRef,
      fills,
    },
  };
}

function spellCastReactionFactsFill(
  facts: readonly CounterspellTriggerFact[],
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: facts,
  };
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

function snapshotCombatant(
  result: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
  combatantId: CombatantId,
) {
  const combatant = result.snapshot.combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (combatant === undefined) {
    throw new Error(`Expected snapshot combatant ${combatantId}.`);
  }
  return combatant;
}

function hasTurnAction(state: BattleState): boolean {
  return state.currentTurnResources.actionResources.some(
    (resource) => resource.source === "turn",
  );
}
