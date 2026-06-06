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
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  initiativeScore,
  resolveBattleInterrupt,
  resolveBattleSubject,
  cantripSpellInvocationRef,
  spellSlotInvocationRef,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Counterspell Reaction spell test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const acidSplashUnitId = "acid_splash";
const expeditiousRetreatUnitId = "expeditious_retreat";
const magicMissileUnitId = "magic_missile";
const counterspellUnitId = "counterspell";
const shieldUnitId = "shield";
const casterId = combatantId("counterspell-triggering-caster");
const counterspellerId = combatantId("counterspell-reactor");
const secondCounterspellerId = combatantId("counterspell-second-reactor");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

describe("Counterspell Reaction spell", () => {
  test("ends a lower-level spell automatically without expending the triggering slot", () => {
    const state = battleWithCounterspell();
    const awaitingReaction = startMagicMissile({
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          reactorId: counterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
    );
    expect(choice.initialHoles).toHaveLength(0);

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(counterspellerId, choice, []),
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

  test("closes the spell-cast window after the first successful Counterspell", () => {
    const state = battleWithCounterspell({ includeSecondCounterspeller: true });
    const awaitingReaction = startMagicMissile({
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          reactorId: counterspellerId,
          casterId,
        }),
        counterspellTriggerFact({
          reactorId: secondCounterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
    );

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(counterspellerId, choice, []),
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
    const state = battleWithCounterspell({
      casterSlots: [
        { spellLevel: 4, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const awaitingReaction = startMagicMissile({
      state,
      slotLevel: 4,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          reactorId: counterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");

    const afterCounterspell = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(counterspellerId, choice, [
          savingThrowOutcomeFill(save, [
            { targetId: casterId, succeeded: true },
          ]),
        ]),
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
      slotLevel: 4,
      targetAllocationFill: awaitingReaction.targetAllocationFill,
      damage,
      dartCount: 6,
    });
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
    const state = battleWithCounterspell({
      casterSlots: [{ spellLevel: 4, count: 1 }],
    });
    const awaitingReaction = startMagicMissile({
      state,
      slotLevel: 4,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          reactorId: counterspellerId,
          casterId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(counterspellerId, choice, [
          savingThrowOutcomeFill(save, [
            { targetId: casterId, succeeded: false },
          ]),
        ]),
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
    const state = battleWithCounterspell({
      casterSlots: [{ spellLevel: 1, count: 1 }],
      includeSecondCounterspeller: true,
    });
    const counterspellFacts = [
      counterspellTriggerFact({
        reactorId: counterspellerId,
        casterId,
      }),
    ];
    const awaitingFirstCounterspell = startMagicMissile({
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts,
    });
    const firstChoice = requireCounterspellChoice(
      awaitingFirstCounterspell,
      counterspellerId,
      3,
    );
    expect(requireHole(firstChoice.initialHoles, "targetSpatialFacts")).toMatchObject({
      spellBeingCast: {
        casterId: counterspellerId,
        spellId: counterspellUnitId,
        castLevel: 3,
        components: ["S"],
      },
    });

    const awaitingSecondCounterspell = resolveBattleInterrupt({
      state: awaitingFirstCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingFirstCounterspell.holes, "interruptDecision"),
        counterspellDecision(counterspellerId, firstChoice, [
          spellCastReactionFactsFill([
            counterspellTriggerFact({
              reactorId: secondCounterspellerId,
              casterId: counterspellerId,
            }),
          ]),
        ]),
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
    );

    const afterSecondCounterspell = resolveBattleInterrupt({
      state: awaitingSecondCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingSecondCounterspell.holes, "interruptDecision"),
        counterspellDecision(secondCounterspellerId, secondChoice, []),
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
      slotLevel: 1,
      targetAllocationFill: awaitingFirstCounterspell.targetAllocationFill,
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
    const state = battleWithCounterspell({
      casterSlots: [{ spellLevel: 1, count: 1 }],
      counterspellerPreparedSpells: [srdSpellRecord(shieldUnitId)],
      counterspellerSlots: [{ spellLevel: 1, count: 1 }],
      includeSecondCounterspeller: true,
    });
    const awaitingShield = startMagicMissile({
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [],
    });
    const shieldChoice = requireTriggeredReactionSpellChoice({
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
    );

    const afterCounterspell = resolveBattleInterrupt({
      state: awaitingCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingCounterspell.holes, "interruptDecision"),
        counterspellDecision(secondCounterspellerId, counterspellChoice, []),
      ),
    });
    expect(afterCounterspell).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
    if (afterCounterspell.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile to resume after Shield is ended.");
    }

    const damage = requireHole(afterCounterspell.holes, "rolledDice");
    const resolved = finishMagicMissile({
      state: afterCounterspell.state,
      slotLevel: 1,
      targetAllocationFill: awaitingShield.targetAllocationFill,
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

  test("opens Counterspell before save-gated damage asks for save or damage fills", () => {
    const state = battleWithCounterspell({
      casterCantrips: [srdSpellRecord(acidSplashUnitId)],
      casterPreparedSpells: [],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: casterId,
      invocation: cantripSpellInvocationRef(
        acidSplashUnitId,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    };
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        spellCastReactionFactsFill([
          counterspellTriggerFact({
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
      throw new Error("Expected Counterspell to interrupt Acid Splash casting.");
    }

    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(counterspellerId, choice, []),
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
    const state = battleWithCounterspell({
      casterPreparedSpells: [srdSpellRecord(expeditiousRetreatUnitId)],
      casterSlots: [{ spellLevel: 1, count: 1 }],
    });
    const subject: BattleSubject = {
      tag: "bonusActionDashSpell",
      actorId: casterId,
      invocation: spellSlotInvocationRef(
        expeditiousRetreatUnitId,
        1,
        "expeditiousRetreatDash",
      ),
      mode: { tag: "cast" },
      speedKind: "walk",
    };
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        spellCastReactionFactsFill([
          counterspellTriggerFact({
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
      throw new Error("Expected Counterspell to interrupt Expeditious Retreat.");
    }
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
    );

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(counterspellerId, choice, []),
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

  test("does not reopen Counterspell after all reactors decline and the spell asks for later fills", () => {
    const state = battleWithCounterspell();
    const awaitingReaction = startMagicMissile({
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
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
      throw new Error("Expected declined Counterspell window to resume damage.");
    }
    const damage = requireHole(declined.holes, "rolledDice");

    const resolved = finishMagicMissile({
      state: declined.state,
      slotLevel: 1,
      targetAllocationFill: awaitingReaction.targetAllocationFill,
      damage,
      dartCount: 3,
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("does not offer same-turn Counterspell when the triggering caster already has a pending spell-slot cast", () => {
    const state = battleWithCounterspell({
      casterPreparedSpells: [
        srdSpellRecord(magicMissileUnitId),
        srdSpellRecord(counterspellUnitId),
      ],
      casterSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const awaitingReaction = startMagicMissile({
      state,
      slotLevel: 1,
      targetId: counterspellerId,
      counterspellFacts: [
        counterspellTriggerFact({
          reactorId: counterspellerId,
          casterId,
        }),
        counterspellTriggerFact({
          reactorId: casterId,
          casterId: counterspellerId,
        }),
      ],
    });
    const choice = requireCounterspellChoice(
      awaitingReaction,
      counterspellerId,
      3,
    );

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        counterspellDecision(counterspellerId, choice, []),
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
    readonly counterspellerSlots?: CharacterSpellcastingInit["spellSlots"] | undefined;
    readonly includeSecondCounterspeller?: boolean | undefined;
  } = {},
): BattleState {
  const counterspell = srdSpellRecord(counterspellUnitId);
  const result = startBattle({
    battleId: battleId("counterspell-reaction-spell"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Triggering caster",
        initiative: 20,
        side: partySide,
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
        side: oppositionSide,
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
              side: oppositionSide,
              spellcasting: counterspellSpellcasting(counterspell),
            }),
          ]
        : []),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
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
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting: CharacterSpellcastingInit;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 7 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
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

type StartedMagicMissile = NeedsHolesResult & {
  readonly targetAllocationFill: Extract<
    BattleFill,
    { readonly kind: "spellTargetAllocation" }
  >;
};

function startMagicMissile(input: {
  readonly state: BattleState;
  readonly slotLevel: number;
  readonly targetId: CombatantId;
  readonly counterspellFacts: readonly CounterspellTriggerFact[];
}): StartedMagicMissile {
  const subject = magicMissileSubject(input.slotLevel);
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
    fills: [
      targetAllocationFill,
      spellCastReactionFactsFill(input.counterspellFacts),
    ],
  });
  expect(result).toMatchObject({
    tag: "needsHoles",
    snapshot: { pendingInterrupt: { trigger: "spellCast" } },
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Magic Missile spell-cast Reaction window.");
  }
  return { ...result, targetAllocationFill };
}

function finishMagicMissile(input: {
  readonly state: BattleState;
  readonly slotLevel: number;
  readonly targetAllocationFill: Extract<
    BattleFill,
    { readonly kind: "spellTargetAllocation" }
  >;
  readonly damage: Extract<BattleHole, { readonly kind: "rolledDice" }>;
  readonly dartCount: number;
}): ReturnType<typeof resolveBattleSubject> {
  const subject = magicMissileSubject(input.slotLevel);
  return resolveBattleSubject({
    state: input.state,
    subject,
    fills: [
      input.targetAllocationFill,
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
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    spellId: counterspellUnitId,
    rangeFeet: movementFeet(60),
  };
}

function magicMissileSubject(slotLevel: number): BattleSubject {
  return {
    tag: "actionSpell",
    actorId: casterId,
    invocation: spellSlotInvocationRef(
      magicMissileUnitId,
      slotLevel,
      "repeatedDamageAllocation",
    ),
    mode: { tag: "cast" },
  };
}

function magicMissileTargetAllocationFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly dartCount: number;
}): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: input.hole.holeId,
    value: { allocations: [{ targetId: input.targetId, count: input.dartCount }] },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: input.casterId,
        targetId: input.targetId,
        spellId: magicMissileUnitId,
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
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  return requireTriggeredReactionSpellChoice({
    result,
    reactorId,
    spellId: counterspellUnitId,
    procedure: "counterspell",
    slotLevel,
  });
}

function requireTriggeredReactionSpellChoice(input: {
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
    > =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.reactorId === input.reactorId &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === input.spellId &&
      candidate.invocation.procedure === input.procedure &&
      Number(candidate.invocation.slotLevel) === input.slotLevel,
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
      invocation: choice.invocation,
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
