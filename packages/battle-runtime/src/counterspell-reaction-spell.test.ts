import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.reaction-counterspell spell.reaction-shield spell.invocation-damage-save-or-attack
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.REACTION_CASTING_TIME
import { Result } from "effect";
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
  classSpellListForSpellcastingClassRecord,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import {
  battleId,
  characterId,
  combatantId,
  battlePendingTransactionView,
  discoverBattleActCandidates,
  initiativeScore,
  resolveBattleInterrupt,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  startBattle,
  settleBattleRuntimeTransaction,
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
import { spellCastInterruptionReactionCapableReactors } from "./battle-reducer/spell-cast-interruption-reaction-discovery.ts";
import {
  cantripSpellInvocationRef,
  spellSlotInvocationRef,
  spellAccessFreeCastSpellInvocationRef,
  type BattleInterruptSubject,
} from "./battle-subjects.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  battleFrontierInterruptDecisionForState,
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
const spellCastInterruptionReactionUnitId = "counterspell";
const shieldUnitId = "shield";
const casterId = combatantId("spellCastInterruptionReaction-triggering-caster");
const spellCastInterruptionReactionerId = combatantId(
  "spellCastInterruptionReaction-reactor",
);
const secondCounterspellerId = combatantId(
  "spellCastInterruptionReaction-second-reactor",
);

type NestedProcedureChoice = Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "nestedProcedure" }
>;
type TriggeredReactionSpellChoice = NestedProcedureChoice & {
  readonly subject: Extract<
    BattleInterruptSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "castTriggeredReactionSpell";
    }
  >;
};

function isTriggeredReactionSpellChoice(
  choice: BattleInterruptProcedureChoice,
): choice is TriggeredReactionSpellChoice {
  return (
    choice.kind === "nestedProcedure" &&
    choice.subject.tag === "runtimeCommand" &&
    choice.subject.command === "castTriggeredReactionSpell"
  );
}

describe("Counterspell Reaction spell", () => {
  test("does not admit a Counterspell reactor without an available spell slot", () => {
    const session = battleWithCounterspell({
      spellCastInterruptionReactionerSlots: [{ spellLevel: 3, count: 0 }],
    });

    expect(spellCastInterruptionReactionCapableReactors(session.state)).toEqual(
      [],
    );
  });

  test("an inherited attack trigger does not suppress the distinct spell-cast window", () => {
    const session = battleWithCounterspell();

    expect(
      startMagicMissile({
        session,
        state: session.state,
        slotLevel: 1,
        targetId: spellCastInterruptionReactionerId,
        handledInterruptTrigger: "attackHit",
        spellCastInterruptionReactionFacts: [
          spellCastInterruptionReactionTriggerFact({
            session,
            reactorId: spellCastInterruptionReactionerId,
            casterId,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
    });
  });

  test("ends a lower-level spell on a failed Constitution save without expending the triggering slot", () => {
    const session = battleWithCounterspell();
    const state = session.state;
    const awaitingReaction = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(
            choice,
            casterId,
            false,
          ),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Counterspell to resolve.");
    }
    expect(hasTurnAction(resolved.state)).toBe(false);
    expect(
      snapshotCombatant(resolved, spellCastInterruptionReactionerId),
    ).toMatchObject({
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

  test("spends a source-scoped free cast when Counterspell ends the spell", () => {
    const session = battleWithCounterspell({ casterSpellAccessFreeCast: true });
    const caster = session.state.combatants.get(casterId);
    if (caster?.origin.kind !== "character")
      throw new Error("Expected character caster.");
    const resourcePoolRef = caster.origin.resources[0]?.resourcePoolRef;
    if (resourcePoolRef === undefined)
      throw new Error("Expected free-cast resource.");
    const invocationRef = spellAccessFreeCastSpellInvocationRef(
      magicMissileUnitId,
      resourcePoolRef,
      "repeatedDamageAllocation",
    );
    const awaitingReaction = startMagicMissile({
      session,
      state: session.state,
      slotLevel: 1,
      invocationRef,
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(
            choice,
            casterId,
            false,
          ),
        ),
      ),
    });
    if (resolved.tag !== "resolved")
      throw new Error("Expected Counterspell to resolve.");
    const afterCaster = resolved.state.combatants.get(casterId);
    expect(
      afterCaster?.origin.kind === "character"
        ? afterCaster.origin.resources
        : [],
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ usesRemaining: 0 })]),
    );
    expect(discoverBattleActCandidates(resolved.state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({ invocation: invocationRef }),
        }),
      ]),
    );
  });

  test("spends Counterspell itself through a source-scoped free cast", () => {
    const session = battleWithCounterspell({
      spellCastInterruptionReactionerSpellAccessFreeCast: true,
    });
    const spellCastInterruptionReactioner = session.state.combatants.get(
      spellCastInterruptionReactionerId,
    );
    if (spellCastInterruptionReactioner?.origin.kind !== "character") {
      throw new Error("Expected character Counterspell reactor.");
    }
    const resourcePoolRef =
      spellCastInterruptionReactioner.origin.resources[0]?.resourcePoolRef;
    if (resourcePoolRef === undefined) {
      throw new Error("Expected Counterspell free-cast resource.");
    }
    const invocationRef = spellAccessFreeCastSpellInvocationRef(
      spellCastInterruptionReactionUnitId,
      resourcePoolRef,
      "spellCastInterruptionReaction",
    );
    const awaitingReaction = startMagicMissile({
      session,
      state: session.state,
      slotLevel: 1,
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
          invocationRef,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
      { tag: "spellAccessFreeCast", resourcePoolRef },
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(
            choice,
            casterId,
            false,
          ),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected source-scoped Counterspell to resolve.");
    }
    expect(
      snapshotCombatant(resolved, spellCastInterruptionReactionerId),
    ).toMatchObject({
      reactionAvailable: false,
      origin: expect.objectContaining({
        resources: expect.arrayContaining([
          expect.objectContaining({ usesRemaining: 0 }),
        ]),
        spellcasting: expect.objectContaining({ spellSlots: [] }),
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
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );
    const incomplete = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        triggeredReactionSpellDecision(
          spellCastInterruptionReactionerId,
          choice,
          [],
        ),
      ),
    });
    expect(incomplete).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "savingThrowOutcome" }],
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
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
        }),
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: secondCounterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(
            choice,
            casterId,
            false,
          ),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
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
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );
    const afterCounterspell = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(choice, casterId, true),
        ),
      ),
    });
    expect(afterCounterspell).toMatchObject({
      tag: "needsHoles",
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
    expect(
      snapshotCombatant(resolved, spellCastInterruptionReactionerId),
    ).toMatchObject({
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

  test("commits a source-scoped free cast only when the spell continues after Counterspell", () => {
    const session = battleWithCounterspell({ casterSpellAccessFreeCast: true });
    const caster = session.state.combatants.get(casterId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character caster.");
    }
    const resourcePoolRef = caster.origin.resources[0]?.resourcePoolRef;
    if (resourcePoolRef === undefined) {
      throw new Error("Expected free-cast resource.");
    }
    const invocationRef = spellAccessFreeCastSpellInvocationRef(
      magicMissileUnitId,
      resourcePoolRef,
      "repeatedDamageAllocation",
    );
    const awaitingReaction = startMagicMissile({
      session,
      state: session.state,
      slotLevel: 1,
      invocationRef,
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );
    const afterCounterspell = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(choice, casterId, true),
        ),
      ),
    });
    if (afterCounterspell.tag !== "needsHoles") {
      throw new Error("Expected the free-cast spell to continue to damage.");
    }
    const casterBeforeDamage = afterCounterspell.state.combatants.get(casterId);
    expect(
      casterBeforeDamage?.origin.kind === "character"
        ? casterBeforeDamage.origin.resources.find(
            (resource) => resource.resourcePoolRef === resourcePoolRef,
          )?.usesRemaining
        : undefined,
    ).toBe(1);

    const resolved = finishMagicMissile({
      state: afterCounterspell.state,
      subject: awaitingReaction.subject,
      slotLevel: 1,
      damage: requireHole(afterCounterspell.holes, "rolledDice"),
      dartCount: 3,
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected the continued free-cast spell to resolve.");
    }
    const casterAfterDamage = resolved.state.combatants.get(casterId);
    expect(
      casterAfterDamage?.origin.kind === "character"
        ? casterAfterDamage.origin.resources.find(
            (resource) => resource.resourcePoolRef === resourcePoolRef,
          )?.usesRemaining
        : undefined,
    ).toBe(0);
    expect(snapshotCombatant(resolved, casterId)).toMatchObject({
      origin: expect.objectContaining({
        spellcasting: expect.objectContaining({ spellSlots: [] }),
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
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(
            choice,
            casterId,
            false,
          ),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected failed save Counterspell to resolve.");
    }
    expect(
      snapshotCombatant(resolved, spellCastInterruptionReactionerId),
    ).toMatchObject({
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
    const spellCastInterruptionReactionFacts = [
      spellCastInterruptionReactionTriggerFact({
        session,
        reactorId: spellCastInterruptionReactionerId,
        casterId,
      }),
    ];
    const awaitingFirstCounterspell = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts,
    });
    const firstChoice = requireCounterspellChoice(
      awaitingFirstCounterspell,
      spellCastInterruptionReactionerId,
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
        casterId: spellCastInterruptionReactionerId,
        sourceProcedureRef: firstChoice.subject.procedureRef,
        castLevel: 3,
        components: ["S"],
      },
    });

    const awaitingSecondCounterspell = resolveBattleInterrupt({
      state: awaitingFirstCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingFirstCounterspell.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          firstChoice,
          spellCastInterruptionReactionSavingThrowFills(
            firstChoice,
            casterId,
            false,
            [
              spellCastReactionFactsFill([
                spellCastInterruptionReactionTriggerFact({
                  session,
                  reactorId: secondCounterspellerId,
                  casterId: spellCastInterruptionReactionerId,
                }),
              ]),
            ],
          ),
        ),
      ),
    });
    expect(awaitingSecondCounterspell).toMatchObject({
      tag: "needsHoles",
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
        spellCastInterruptionReactionDecision(
          secondCounterspellerId,
          secondChoice,
          spellCastInterruptionReactionSavingThrowFills(
            secondChoice,
            spellCastInterruptionReactionerId,
            false,
          ),
        ),
      ),
    });
    expect(afterSecondCounterspell).toMatchObject({
      tag: "needsHoles",
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
    expect(
      snapshotCombatant(resolved, spellCastInterruptionReactionerId),
    ).toMatchObject({
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

  test("retains the triggering spell fills when nested Counterspell responders unwind through a transaction", () => {
    const session = battleWithCounterspell({
      casterSlots: [{ spellLevel: 1, count: 1 }],
      includeSecondCounterspeller: true,
    });
    const subject = magicMissileSubject(session, 1);
    const targetAllocationResult = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [],
    });
    if (targetAllocationResult.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile target allocation hole.");
    }
    const targetAllocation = requireHole(
      targetAllocationResult.holes,
      "spellTargetAllocation",
    );
    const firstCounterspellFact = spellCastInterruptionReactionTriggerFact({
      session,
      reactorId: spellCastInterruptionReactionerId,
      casterId,
    });
    const first = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject,
        fills: [
          magicMissileTargetAllocationFill({
            hole: targetAllocation,
            casterId,
            targetId: spellCastInterruptionReactionerId,
            dartCount: targetAllocation.allocationCount,
          }),
          spellCastReactionFactsFill([firstCounterspellFact]),
        ],
      },
    });
    if (first.tag !== "needsHoles") {
      throw new Error("Expected the first Counterspell transaction window.");
    }
    const firstFrontier = battleFrontierInterruptDecisionForState(
      first.resolution.session.state,
    );
    const firstChoice = firstFrontier?.choices.find(
      (choice): choice is TriggeredReactionSpellChoice =>
        isTriggeredReactionSpellChoice(choice) &&
        choice.subject.reactorId === spellCastInterruptionReactionerId,
    );
    if (firstChoice === undefined) {
      throw new Error("Expected the first Counterspell choice.");
    }
    const secondCounterspellFact = spellCastInterruptionReactionTriggerFact({
      session,
      reactorId: secondCounterspellerId,
      casterId: spellCastInterruptionReactionerId,
    });
    const second = settleBattleRuntimeTransaction({
      session: first.resolution.session,
      transaction: first.transaction,
      operation: {
        kind: "interruptDecision",
        fill: interruptDecisionFill(
          requireHole(
            first.resolution.envelope.frontier.kind === "interruptDecision"
              ? [first.resolution.envelope.frontier.decisionHole]
              : [],
            "interruptDecision",
          ),
          spellCastInterruptionReactionDecision(
            spellCastInterruptionReactionerId,
            firstChoice,
            spellCastInterruptionReactionSavingThrowFills(
              firstChoice,
              casterId,
              false,
              [spellCastReactionFactsFill([secondCounterspellFact])],
            ),
          ),
        ),
      },
    });
    if (second.tag !== "needsHoles") {
      throw new Error("Expected the nested Counterspell transaction window.");
    }
    const secondFrontier = battleFrontierInterruptDecisionForState(
      second.resolution.session.state,
    );
    const secondChoice = secondFrontier?.choices.find(
      (choice): choice is TriggeredReactionSpellChoice =>
        isTriggeredReactionSpellChoice(choice) &&
        choice.subject.reactorId === secondCounterspellerId,
    );
    if (secondChoice === undefined) {
      throw new Error("Expected the second Counterspell choice.");
    }
    const resumed = settleBattleRuntimeTransaction({
      session: second.resolution.session,
      transaction: second.transaction,
      operation: {
        kind: "interruptDecision",
        fill: interruptDecisionFill(
          requireHole(
            second.resolution.envelope.frontier.kind === "interruptDecision"
              ? [second.resolution.envelope.frontier.decisionHole]
              : [],
            "interruptDecision",
          ),
          spellCastInterruptionReactionDecision(
            secondCounterspellerId,
            secondChoice,
            spellCastInterruptionReactionSavingThrowFills(
              secondChoice,
              spellCastInterruptionReactionerId,
              false,
            ),
          ),
        ),
      },
    });
    if (resumed.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile to resume after Counterspell.");
    }
    if (resumed.frontier.kind !== "ordinaryHoles") {
      throw new Error("Expected Magic Missile's ordinary damage frontier.");
    }
    const transactionView = battlePendingTransactionView(resumed.transaction);
    expect(transactionView).toMatchObject({
      _tag: "Some",
      value: {
        subject,
        fills: [
          expect.objectContaining({ kind: "spellTargetAllocation" }),
          expect.objectContaining({ kind: "targetSpatialFacts" }),
        ],
      },
    });
    expect(resumed.frontier.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "rolledDice" })]),
    );
  });

  test("allows Counterspell to end Shield before Shield affects the triggering spell", () => {
    const session = battleWithCounterspell({
      casterSlots: [{ spellLevel: 1, count: 1 }],
      spellCastInterruptionReactionerPreparedSpells: [
        srdSpellRecord(shieldUnitId),
      ],
      spellCastInterruptionReactionerSlots: [{ spellLevel: 1, count: 1 }],
      includeSecondCounterspeller: true,
    });
    const state = session.state;
    const awaitingShield = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [],
    });
    const shieldChoice = requireTriggeredReactionSpellChoice({
      session,
      result: awaitingShield,
      reactorId: spellCastInterruptionReactionerId,
      spellId: shieldUnitId,
      procedure: "triggeredArmorDefense",
      slotLevel: 1,
    });

    const awaitingCounterspell = resolveBattleInterrupt({
      state: awaitingShield.state,
      fill: interruptDecisionFill(
        requireHole(awaitingShield.holes, "interruptDecision"),
        triggeredReactionSpellDecision(
          spellCastInterruptionReactionerId,
          shieldChoice,
          [
            spellCastReactionFactsFill([
              spellCastInterruptionReactionTriggerFact({
                session,
                reactorId: secondCounterspellerId,
                casterId: spellCastInterruptionReactionerId,
              }),
            ]),
          ],
        ),
      ),
    });
    expect(awaitingCounterspell).toMatchObject({
      tag: "needsHoles",
    });
    if (awaitingCounterspell.tag !== "needsHoles") {
      throw new Error("Expected Counterspell to interrupt Shield casting.");
    }
    const spellCastInterruptionReactionChoice = requireCounterspellChoice(
      awaitingCounterspell,
      secondCounterspellerId,
      3,
      session,
    );

    const afterCounterspell = resolveBattleInterrupt({
      state: awaitingCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingCounterspell.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          secondCounterspellerId,
          spellCastInterruptionReactionChoice,
          spellCastInterruptionReactionSavingThrowFills(
            spellCastInterruptionReactionChoice,
            spellCastInterruptionReactionerId,
            false,
          ),
        ),
      ),
    });
    expect(afterCounterspell).toMatchObject({
      tag: "needsHoles",
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
    expect(
      snapshotCombatant(resolved, spellCastInterruptionReactionerId),
    ).toMatchObject({
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
      spellCastInterruptionReactionerPreparedSpells: [
        srdSpellRecord(shieldUnitId),
      ],
      spellCastInterruptionReactionerSlots: [{ spellLevel: 1, count: 1 }],
      includeSecondCounterspeller: true,
    });
    const awaitingShield = startMagicMissile({
      session,
      state: session.state,
      slotLevel: 1,
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [],
    });
    const shieldChoice = requireTriggeredReactionSpellChoice({
      session,
      result: awaitingShield,
      reactorId: spellCastInterruptionReactionerId,
      spellId: shieldUnitId,
      procedure: "triggeredArmorDefense",
      slotLevel: 1,
    });

    const awaitingCounterspell = resolveBattleInterrupt({
      state: awaitingShield.state,
      fill: interruptDecisionFill(
        requireHole(awaitingShield.holes, "interruptDecision"),
        triggeredReactionSpellDecision(
          spellCastInterruptionReactionerId,
          shieldChoice,
          [
            spellCastReactionFactsFill([
              spellCastInterruptionReactionTriggerFact({
                session,
                reactorId: secondCounterspellerId,
                casterId: spellCastInterruptionReactionerId,
              }),
            ]),
          ],
        ),
      ),
    });
    expect(awaitingCounterspell).toMatchObject({
      tag: "needsHoles",
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
    expect(
      snapshotCombatant(resolved, spellCastInterruptionReactionerId),
    ).toMatchObject({
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
          spellCastInterruptionReactionTriggerFact({
            session,
            reactorId: spellCastInterruptionReactionerId,
            casterId,
          }),
        ]),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Counterspell to interrupt Acid Splash casting.",
      );
    }

    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(
            choice,
            casterId,
            false,
          ),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Counterspell to end Acid Splash.");
    }
    expect(hasTurnAction(resolved.state)).toBe(false);
    expect(
      snapshotCombatant(resolved, spellCastInterruptionReactionerId),
    ).toMatchObject({
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
          "grantedAlternateActionCost",
        ),
      ),
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        spellCastReactionFactsFill([
          spellCastInterruptionReactionTriggerFact({
            session,
            reactorId: spellCastInterruptionReactionerId,
            casterId,
          }),
        ]),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Counterspell to interrupt Expeditious Retreat.",
      );
    }
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(
            choice,
            casterId,
            false,
          ),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { bonusActionQuotaAvailable: false, dashMovementBonusFeet: 0 },
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
            spellCastInterruptionReactionTriggerFact({
              session,
              reactorId: spellCastInterruptionReactionerId,
              casterId,
            }),
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
    });
  });

  test("does not reopen Counterspell after all reactors decline and the spell asks for later fills", () => {
    const session = battleWithCounterspell();
    const state = session.state;
    const awaitingReaction = startMagicMissile({
      session,
      state,
      slotLevel: 1,
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
        }),
      ],
    });
    const declined = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        { kind: "decline", responderId: spellCastInterruptionReactionerId },
      ),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
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
    });
  });

  test("does not offer same-turn Counterspell when the triggering caster already has a pending spell-slot cast", () => {
    const session = battleWithCounterspell({
      casterPreparedSpells: [
        srdSpellRecord(magicMissileUnitId),
        srdSpellRecord(spellCastInterruptionReactionUnitId),
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
      targetId: spellCastInterruptionReactionerId,
      spellCastInterruptionReactionFacts: [
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: spellCastInterruptionReactionerId,
          casterId,
        }),
        spellCastInterruptionReactionTriggerFact({
          session,
          reactorId: casterId,
          casterId: spellCastInterruptionReactionerId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      spellCastInterruptionReactionerId,
      3,
      session,
    );

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        spellCastInterruptionReactionDecision(
          spellCastInterruptionReactionerId,
          choice,
          spellCastInterruptionReactionSavingThrowFills(
            choice,
            casterId,
            false,
          ),
        ),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
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
    readonly spellCastInterruptionReactionerPreparedSpells?:
      | readonly SpellRecord[]
      | undefined;
    readonly spellCastInterruptionReactionerSlots?:
      | CharacterSpellcastingInit["spellSlots"]
      | undefined;
    readonly includeSecondCounterspeller?: boolean | undefined;
    readonly casterSpellAccessFreeCast?: boolean | undefined;
    readonly spellCastInterruptionReactionerSpellAccessFreeCast?:
      | boolean
      | undefined;
  } = {},
): BattleRuntimeSession {
  const spellCastInterruptionReaction = srdSpellRecord(
    spellCastInterruptionReactionUnitId,
  );
  const magicMissile = srdSpellRecord(magicMissileUnitId);
  const magicInitiateFreeCastSource = {
    id: authoredUnitId("feat_synthetic_spellCastInterruptionReaction_dabbler"),
    kind: "feat",
    category: "origin",
    name: "Synthetic Counterspell Dabbler",
    provenance: {
      kind: "synthetic-test",
      section: "spellCastInterruptionReaction regression",
    },
    mechanics: { family: "magic_initiate", spellList: "wizard" },
  } as const;
  const spellCastInterruptionReactionFreeCastSource = {
    acquiredAtLevel: 3,
    className: "wizard",
    id: authoredUnitId(
      "wizard_synthetic_spellCastInterruptionReaction_reserve",
    ),
    kind: "class_feature",
    name: "Synthetic Counterspell Reserve",
    provenance: {
      kind: "synthetic-test",
      section: "spellCastInterruptionReaction regression",
    },
    mechanics: {
      family: "passive",
      grants: [
        {
          kind: "grant_spell_access",
          mode: "prepared",
          spellId: spellCastInterruptionReaction.id,
        },
        {
          kind: "grant_spell_free_casts",
          spellId: spellCastInterruptionReaction.id,
          count: 1,
          resetCadence: "long_rest",
        },
      ],
    },
  } as const satisfies UnitRecord;
  const result = startBattle({
    battleId: battleId("spellCastInterruptionReaction-reaction-spell"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Triggering caster",
        initiative: 20,
        resources:
          input.casterSpellAccessFreeCast === true
            ? [
                {
                  unit: magicInitiateFreeCastSource,
                  spellAccessFreeCast: { spellId: magicMissile.id, count: 1 },
                  usesRemaining: 1,
                },
              ]
            : [],
        characterUnitRefs:
          input.casterSpellAccessFreeCast === true
            ? [magicMissileUnitId, "ray_of_frost", "acid_splash"]
                .map((unitId) => ({
                  unit: unitLibrary.requireUnit(unitId),
                  supportProfiles: [],
                }))
                .concat([
                  { unit: magicInitiateFreeCastSource, supportProfiles: [] },
                ])
            : [],
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.casterCantrips ?? [],
          preparedSpells: input.casterPreparedSpells ?? [
            srdSpellRecord(magicMissileUnitId),
          ],
          featurePreparedSpells: [],
          spellAccesses:
            input.casterSpellAccessFreeCast === true
              ? [
                  {
                    source: {
                      tag: "feat",
                      sourceUnit: magicInitiateFreeCastSource,
                      spellList: wizardSpellListSource(),
                    },
                    spellcastingAbilityModifier: 3,
                    cantrips: [
                      srdSpellRecord("ray_of_frost"),
                      srdSpellRecord("acid_splash"),
                    ],
                    levelOneSpell: magicMissile,
                  },
                ]
              : [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots:
            input.casterSpellAccessFreeCast === true
              ? []
              : (input.casterSlots ?? [{ spellLevel: 1, count: 1 }]),
        },
      }),
      characterCreature({
        combatantId: spellCastInterruptionReactionerId,
        displayName: "Counterspell reactor",
        initiative: 10,
        resources:
          input.spellCastInterruptionReactionerSpellAccessFreeCast === true
            ? [
                {
                  unit: spellCastInterruptionReactionFreeCastSource,
                  spellAccessFreeCast: {
                    spellId: spellCastInterruptionReaction.id,
                    count: 1,
                  },
                  usesRemaining: 1,
                },
              ]
            : [],
        characterUnitRefs:
          input.spellCastInterruptionReactionerSpellAccessFreeCast === true
            ? [
                {
                  unit: spellCastInterruptionReactionFreeCastSource,
                  supportProfiles: [],
                },
              ]
            : [],
        spellcasting:
          input.spellCastInterruptionReactionerSpellAccessFreeCast === true
            ? {
                ...wizardSpellcasting({ preparedSpells: [], spellSlots: [] }),
                featurePreparedSpells: [
                  {
                    sourceUnitId:
                      spellCastInterruptionReactionFreeCastSource.id,
                    spell: spellCastInterruptionReaction,
                  },
                ],
              }
            : input.spellCastInterruptionReactionerPreparedSpells ===
                  undefined &&
                input.spellCastInterruptionReactionerSlots === undefined
              ? spellCastInterruptionReactionSpellcasting(
                  spellCastInterruptionReaction,
                )
              : wizardSpellcasting({
                  preparedSpells:
                    input.spellCastInterruptionReactionerPreparedSpells ?? [
                      spellCastInterruptionReaction,
                    ],
                  spellSlots: input.spellCastInterruptionReactionerSlots ?? [
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
              spellcasting: spellCastInterruptionReactionSpellcasting(
                spellCastInterruptionReaction,
              ),
            }),
          ]
        : []),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(JSON.stringify(result.failure));
  }
  return result.success;
}

function spellCastInterruptionReactionSpellcasting(
  spellCastInterruptionReaction: SpellRecord,
): CharacterSpellcastingInit {
  return wizardSpellcasting({
    preparedSpells: [spellCastInterruptionReaction],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
}

function wizardSpellListSource(): import("./index.ts").CharacterBattleSpellListFact {
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

function wizardSpellcasting(input: {
  readonly cantrips?: readonly SpellRecord[] | undefined;
  readonly preparedSpells: readonly SpellRecord[];
  readonly spellSlots: CharacterSpellcastingInit["spellSlots"];
}): CharacterSpellcastingInit {
  return {
    spellcastingSource: {
      tag: "classSpellcasting",
      className: "wizard",
      abilityModifier: abilityModifier(3),
    },
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: input.cantrips ?? [],
    preparedSpells: input.preparedSpells,
    featurePreparedSpells: [],
    spellAccesses: [],
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
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
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
      resources: input.resources ?? [],
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
  readonly invocationRef?: Parameters<
    typeof requireCharacterSpellProcedureRefForTest
  >[2];
  readonly targetId: CombatantId;
  readonly handledInterruptTrigger?: "attackHit";
  readonly spellCastInterruptionReactionFacts: readonly CounterspellTriggerFact[];
}): StartedMagicMissile {
  const subject = magicMissileSubject(
    input.session,
    input.slotLevel,
    input.invocationRef,
  );
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
      spellCastReactionFactsFill(input.spellCastInterruptionReactionFacts),
    ],
  });
  expect(result).toMatchObject({
    tag: "needsHoles",
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
  { readonly kind: "spellCastInterruptionTriggerCasterVisibleWithinRange" }
>;

function spellCastInterruptionReactionTriggerFact(input: {
  readonly session: BattleRuntimeSession;
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
  readonly invocationRef?: Parameters<
    typeof requireCharacterSpellProcedureRefForTest
  >[2];
}): CounterspellTriggerFact {
  return {
    kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
      input.session,
      input.reactorId,
      input.invocationRef ??
        spellSlotInvocationRef(
          spellCastInterruptionReactionUnitId,
          3,
          "spellCastInterruptionReaction",
        ),
    ),
    rangeFeet: movementFeet(60),
  };
}

function magicMissileSubject(
  session: BattleRuntimeSession,
  slotLevel: number,
  invocationRef = spellSlotInvocationRef(
    magicMissileUnitId,
    slotLevel,
    "repeatedDamageAllocation",
  ),
): BattleSubject {
  const procedureRef = requireCharacterSpellProcedureRefForTest(
    session,
    casterId,
    invocationRef,
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
  resource?: CounterspellFreeCastChoiceResource,
): TriggeredReactionSpellChoice {
  return requireTriggeredReactionSpellChoice({
    session,
    result,
    reactorId,
    spellId: spellCastInterruptionReactionUnitId,
    procedure: "spellCastInterruptionReaction",
    slotLevel,
    ...(resource === undefined ? {} : { resource }),
  });
}

type CounterspellFreeCastChoiceResource = {
  readonly tag: "spellAccessFreeCast";
  readonly resourcePoolRef: Parameters<
    typeof spellAccessFreeCastSpellInvocationRef
  >[1];
};

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
  readonly resource?: CounterspellFreeCastChoiceResource;
}): TriggeredReactionSpellChoice {
  const expectedFreeCastResource = input.resource;
  const choice = battleFrontierInterruptDecisionForState(
    input.result.state,
  )?.choices.find((candidate): candidate is TriggeredReactionSpellChoice => {
    if (
      !isTriggeredReactionSpellChoice(candidate) ||
      candidate.subject.reactorId !== input.reactorId
    ) {
      return false;
    }
    const invocation = characterSpellInvocationRefForProcedureRefForTest(
      battleRuntimeSessionForTest({
        state: input.result.state,
        context: input.session.context,
      }),
      candidate.subject.reactorId,
      candidate.subject.procedureRef,
    );
    return (
      invocation.spellId === input.spellId &&
      invocation.procedure === input.procedure &&
      (expectedFreeCastResource === undefined
        ? invocation.tag === "spellSlot" &&
          Number(invocation.slotLevel) === input.slotLevel
        : invocation.tag === "spellAccessFreeCast" &&
          invocation.resourcePoolRef ===
            expectedFreeCastResource.resourcePoolRef)
    );
  });
  if (choice === undefined) {
    throw new Error(`Expected ${input.spellId} Reaction choice.`);
  }
  return choice;
}

function spellCastInterruptionReactionDecision(
  reactorId: CombatantId,
  choice: TriggeredReactionSpellChoice,
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"] {
  return triggeredReactionSpellDecision(reactorId, choice, fills);
}

function spellCastInterruptionReactionSavingThrowFills(
  choice: TriggeredReactionSpellChoice,
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
  choice: TriggeredReactionSpellChoice,
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
