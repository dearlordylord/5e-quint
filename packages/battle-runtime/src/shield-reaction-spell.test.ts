// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.reaction-shield

import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";

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
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  classSpellListForSpellcastingClassRecord,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActCandidates,
  discoverBattleActs,
  initiativeScore,
  resolveBattleInterrupt,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { completeReactionSpellSlotCast } from "./battle-reducer/reaction-spell-resolution.ts";
import {
  resolveBattleSubject,
  characterSpellInvocationRefForProcedureRefForTest,
  opportunityAttackProcedureSelectionForTest,
} from "./battle-runtime.test-support.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Shield Reaction spell test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const shieldUnitId = "shield";
const magicMissileUnitId = "magic_missile";
const rayOfFrostUnitId = "ray_of_frost";
const spellCasterId = combatantId("shield-reaction-spell-caster");
const spellTargetId = combatantId("shield-reaction-spell-target");

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell"; readonly invocation: unknown }
  >;
};
type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};

describe("Shield Reaction spell", () => {
  test("spends a source-scoped free cast when Shield resolves from an attack-hit Reaction", () => {
    const shield = srdSpellRecord(shieldUnitId);
    const session = battleWithShieldReactionSpell(shield, {
      sourceScopedFreeCast: true,
    });
    const freeCastOwnership = session.context.characters
      .get(spellCasterId)
      ?.resourceOwnership.find(
        (ownership) =>
          ownership.purpose.tag === "spellAccessFreeCast" &&
          ownership.purpose.spellId === shieldUnitId,
      );
    if (freeCastOwnership === undefined) {
      throw new Error("Expected Shield free-cast resource ownership.");
    }
    const awaitingReaction = resolveAttackRollOnly({
      state: session.state,
      attackerId: spellTargetId,
      targetId: spellCasterId,
      total: 14,
      naturalD20: 10,
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Shield to open an attack-hit Reaction window.");
    }
    const reactionChoice =
      awaitingReaction.snapshot.pendingInterrupt?.choices.find(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "castTriggeredReactionSpell",
      );
    if (
      reactionChoice === undefined ||
      reactionChoice.kind !== "nestedProcedure" ||
      reactionChoice.subject.command !== "castTriggeredReactionSpell"
    ) {
      throw new Error("Expected Shield Reaction spell choice.");
    }
    const interruptDecisionHole = requireHole(
      awaitingReaction.holes,
      "interruptDecision",
    );
    const invocation = characterSpellInvocationRefForProcedureRefForTest(
      battleRuntimeSessionForTest({
        state: awaitingReaction.state,
        context: session.context,
      }),
      spellCasterId,
      reactionChoice.subject.procedureRef,
    );
    expect(invocation).toMatchObject({
      tag: "spellAccessFreeCast",
      spellId: shieldUnitId,
      procedure: "shieldReaction",
    });

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: {
        kind: "interruptDecision",
        holeId: interruptDecisionHole.holeId,
        value: {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: reactionChoice.subject.procedureRef,
            fills: [],
          },
        },
      },
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected source-scoped Shield free cast to resolve.");
    }
    const caster = resolved.state.combatants.get(spellCasterId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected Shield caster character after cast.");
    }
    expect(
      caster.origin.resources.find(
        (resource) =>
          resource.resourcePoolRef === freeCastOwnership.resourcePoolRef,
      ),
    ).toEqual(
      expect.objectContaining({
        resourcePoolRef: freeCastOwnership.resourcePoolRef,
        usesRemaining: 0,
      }),
    );
    expect(
      caster?.origin.kind === "character"
        ? caster.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([]);
  });

  test("is offered when the caster is hit by an Attack Roll and adds +5 Armor Class against the triggering Attack Roll", () => {
    const spell = srdSpellRecord(shieldUnitId);
    const session = battleWithShieldReactionSpell(spell);
    const attackAct = discoverBattleActCandidates(session.state).find(
      (act): act is AttackAct =>
        act.subject.tag === "action" && act.subject.action === "attack",
    );
    expect(attackAct).toBeDefined();
    if (attackAct === undefined) {
      throw new Error("Expected an Unarmed Strike attack act.");
    }
    const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
    const awaitingAttackRoll = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [attackTargetFill(targetHole, spellTargetId, spellCasterId)],
    });
    expect(awaitingAttackRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected Attack Roll hole after target selection.");
    }
    const attackRollHole = requireHole(awaitingAttackRoll.holes, "attackRoll");

    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [
        attackTargetFill(targetHole, spellTargetId, spellCasterId),
        attackRollFill(attackRollHole, { total: 14, naturalD20: 10 }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Shield to open an attack-hit Reaction window.");
    }
    const resolved = resolveShieldReactionChoice(awaitingReaction, session);
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shield Reaction to resolve.");
    }
    const shieldCaster = resolved.snapshot.combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(shieldCaster).toMatchObject({
      armorClass: 15,
      hp: 12,
      reactionAvailable: false,
    });
    expect(shieldCaster?.origin).toMatchObject({
      spellcasting: {
        spellSlots: [expect.objectContaining({ spellLevel: 1, expended: 1 })],
      },
    });
  });

  test("Armor Class bonus applies to later attacks before Duration expiration at the start of the caster's next turn", () => {
    const shield = srdSpellRecord(shieldUnitId);
    const attackerOneId = combatantId("shield-reaction-attacker-1");
    const attackerTwoId = combatantId("shield-reaction-attacker-2");
    const attackerThreeId = combatantId("shield-reaction-attacker-3");
    const session = battleWithAttackers({
      shield,
      attackerIds: [attackerOneId, attackerTwoId, attackerThreeId],
    });

    const firstHit = resolveAttackRollOnly({
      state: session.state,
      attackerId: attackerOneId,
      targetId: spellCasterId,
      total: 14,
      naturalD20: 10,
    });
    if (firstHit.tag !== "needsHoles") {
      throw new Error("Expected first hit to open Shield Reaction window.");
    }
    const shielded = resolveShieldReactionChoice(firstHit, session);
    if (shielded.tag !== "resolved") {
      throw new Error(
        "Expected Shield Reaction to turn first hit into a miss.",
      );
    }
    expect(shielded.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 15,
          hp: 12,
          reactionAvailable: false,
        }),
      ]),
    );

    const attackerTwoTurn = endTurnByActor(shielded.state, attackerOneId);
    const secondAttack = resolveAttackRollOnly({
      state: attackerTwoTurn,
      attackerId: attackerTwoId,
      targetId: spellCasterId,
      total: 14,
      naturalD20: 10,
    });
    expect(secondAttack).toMatchObject({ tag: "resolved" });
    if (secondAttack.tag !== "resolved") {
      throw new Error("Expected second attack against Shield AC to miss.");
    }
    expect(secondAttack.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 15,
          hp: 12,
          reactionAvailable: false,
        }),
      ]),
    );

    const attackerThreeTurn = endTurnByActor(secondAttack.state, attackerTwoId);
    const thirdAttack = resolveAttackRollOnly({
      state: attackerThreeTurn,
      attackerId: attackerThreeId,
      targetId: spellCasterId,
      total: 14,
      naturalD20: 10,
    });
    expect(thirdAttack).toMatchObject({ tag: "resolved" });
    if (thirdAttack.tag !== "resolved") {
      throw new Error("Expected third attack against Shield AC to miss.");
    }
    expect(thirdAttack.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 15,
          hp: 12,
          reactionAvailable: false,
        }),
      ]),
    );

    const casterTurn = endTurnByActor(thirdAttack.state, attackerThreeId);
    expect(casterTurn.combatants.get(spellCasterId)).toMatchObject({
      activeEffects: [],
      reactionAvailable: true,
    });
    expect(casterTurn.combatants.get(spellCasterId)?.armorClass).toMatchObject({
      bonuses: [],
    });

    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: spellCasterId,
      command: "move",
    };
    const awaitingMovement = resolveBattleSubject({
      state: casterTurn,
      subject: moveSubject,
      fills: [],
    });
    if (awaitingMovement.tag !== "needsHoles") {
      throw new Error("Expected movement to request a Movement fill.");
    }
    const moveHole = requireHole(awaitingMovement.holes, "movement");
    const awaitingOpportunityAttack = resolveBattleSubject({
      state: casterTurn,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: attackerThreeId,
              distanceFeet: movementFeet(5),
              ...unarmedStrikeSelection(casterTurn, attackerThreeId),
            },
          ],
        }),
      ],
    });
    if (awaitingOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected movement to provoke an Opportunity Attack.");
    }
    const opportunityAttackChoice =
      awaitingOpportunityAttack.snapshot.pendingInterrupt?.choices.find(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "opportunityAttack",
      );
    if (
      opportunityAttackChoice === undefined ||
      opportunityAttackChoice.kind !== "nestedProcedure" ||
      opportunityAttackChoice.subject.command !== "opportunityAttack"
    ) {
      throw new Error("Expected Opportunity Attack Reaction choice.");
    }
    const startedOpportunityAttack = resolveBattleInterrupt({
      state: awaitingOpportunityAttack.state,
      fill: {
        kind: "interruptDecision",
        holeId: awaitingOpportunityAttack.holes[0]!.holeId,
        value: {
          kind: "resolve",
          responderId: attackerThreeId,
          choice: opportunityAttackProcedureSelectionForTest(
            opportunityAttackChoice,
          ),
        },
      },
    });
    if (startedOpportunityAttack.tag !== "needsHoles") {
      throw new Error(
        `Expected Opportunity Attack to ask for an Attack Roll, got ${startedOpportunityAttack.tag}${
          startedOpportunityAttack.tag === "invalid"
            ? `: ${startedOpportunityAttack.message}`
            : ""
        }.`,
      );
    }
    const opportunityAttackRoll = requireHole(
      startedOpportunityAttack.holes,
      "attackRoll",
    );
    const completedOpportunityAttack = resolveBattleSubject({
      state: startedOpportunityAttack.state,
      subject: opportunityAttackChoice.subject,
      fills: [
        attackRollFill(opportunityAttackRoll, {
          total: 14,
          naturalD20: 10,
        }),
      ],
    });
    if (completedOpportunityAttack.tag !== "resolved") {
      throw new Error("Expected expired Shield AC to allow the attack to hit.");
    }
    expect(completedOpportunityAttack.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 10,
          hp: 11,
        }),
      ]),
    );
  });

  test("is offered against a spell Attack Roll hit before spell damage", () => {
    const shield = srdSpellRecord(shieldUnitId);
    const rayOfFrost = srdSpellRecord(rayOfFrostUnitId);
    const session = battleWithSpellAttack({ shield, spellAttack: rayOfFrost });
    const act = spellAct({ session, spellId: rayOfFrostUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetHole,
      spellTargetId,
      spellCasterId,
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill],
    });
    expect(awaitingAttackRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected Ray of Frost Attack Roll hole.");
    }
    const attackRollHole = requireHole(awaitingAttackRoll.holes, "attackRoll");

    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        attackRollFill(attackRollHole, { total: 14, naturalD20: 10 }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected spell Attack Roll hit to open Shield window.");
    }

    const resolved = resolveShieldReactionChoice(awaitingReaction, session);
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shielded spell attack to resolve as a miss.");
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 15,
          hp: 12,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("is offered from Magic Missile target selection and negates target damage", () => {
    const shield = srdSpellRecord(shieldUnitId);
    const magicMissile = srdSpellRecord(magicMissileUnitId);
    const session = battleWithMagicMissile({ shield, magicMissile });
    const act = spellAct({ session, spellId: magicMissileUnitId });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      spellTargetId,
      [{ targetId: spellCasterId, count: 3 }],
    );

    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [allocationFill],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "spellCast" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile to open Shield window.");
    }

    const awaitingDamage = resolveShieldReactionChoice(
      awaitingReaction,
      session,
    );
    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage hole after Shield.");
    }
    const damageHole = requireHole(awaitingDamage.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: awaitingDamage.state,
      subject: act.subject,
      fills: [damageRollFillWithGroups(damageHole, [[4, 4, 4]])],
    });
    if (resolved.tag === "invalid") {
      throw new Error(resolved.message);
    }
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shielded Magic Missile to resolve.");
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 15,
          hp: 12,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("Magic Missile negation is not offered without the named-spell Reaction trigger", () => {
    const shield = srdSpellRecord(shieldUnitId);
    if (shield.mechanics.family !== "triggered_reaction") {
      throw new Error("Expected Shield to be a triggered Reaction spell.");
    }
    const attackHitOnlyShield: SpellRecord = {
      ...shield,
      mechanics: {
        ...shield.mechanics,
        castingTime: {
          kind: "reaction",
          trigger: { kind: "hit_by_attack_roll" },
        },
      },
    };
    const magicMissile = srdSpellRecord(magicMissileUnitId);
    const session = battleWithMagicMissile({
      shield: attackHitOnlyShield,
      magicMissile,
    });
    const act = spellAct({ session, spellId: magicMissileUnitId });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      spellTargetId,
      [{ targetId: spellCasterId, count: 3 }],
    );

    const awaitingDamage = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [allocationFill],
    });

    expect(awaitingDamage).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("does not offer or finalize a second Spell Slot during the current actor's Magic Missile", () => {
    const shield = srdSpellRecord(shieldUnitId);
    const magicMissile = srdSpellRecord(magicMissileUnitId);
    const session = spellBattle({ preparedSpells: [magicMissile, shield] });
    const act = spellAct({ session, spellId: magicMissileUnitId });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      spellCasterId,
      [{ targetId: spellCasterId, count: 3 }],
    );

    const awaitingDamage = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [allocationFill],
    });
    expect(awaitingDamage).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage hole without Shield.");
    }

    const damageHole = requireHole(awaitingDamage.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: awaitingDamage.state,
      subject: act.subject,
      fills: [
        allocationFill,
        damageRollFillWithGroups(damageHole, [[4, 4, 4]]),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
        turn: {
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Magic Missile to spend one Spell Slot.");
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 10,
          hp: 0,
          origin: expect.objectContaining({
            spellcasting: expect.objectContaining({
              spellSlots: [
                expect.objectContaining({ spellLevel: 1, expended: 1 }),
              ],
            }),
          }),
        }),
      ]),
    );

    const defensiveFinalization = completeReactionSpellSlotCast({
      effectedState: resolved.state,
      errorState: resolved.state,
      casterId: spellCasterId,
      slotLevel: spellSlotLevel(1),
    });
    expect(defensiveFinalization).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "This turn has already expended a Spell Slot.",
      snapshot: {
        turn: {
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            origin: expect.objectContaining({
              spellcasting: expect.objectContaining({
                spellSlots: [{ spellLevel: 1, count: 2, expended: 1 }],
              }),
            }),
          }),
        ]),
      },
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

function spellBattle(input: {
  readonly preparedSpells?: readonly SpellRecord[];
}): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-slot"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Spellcaster",
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
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function battleWithShieldReactionSpell(
  spell: SpellRecord,
  options: { readonly sourceScopedFreeCast?: boolean } = {},
): BattleRuntimeSession {
  const freeCastSource = {
    id: authoredUnitId("feat_synthetic_shield_dabbler"),
    kind: "feat",
    category: "origin",
    name: "Synthetic Shield Dabbler",
    provenance: { kind: "synthetic-test", section: "shield regression" },
    mechanics: { family: "magic_initiate", spellList: "wizard" },
  } as const;
  const sourceScopedFreeCast = options.sourceScopedFreeCast === true;
  const rayOfFrost = srdSpellRecord(rayOfFrostUnitId);
  const acidSplash = srdSpellRecord("acid_splash");
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-attack-roll"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Attacker",
        initiative: 20,
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        resources: sourceScopedFreeCast
          ? [
              {
                unit: freeCastSource,
                spellAccessFreeCast: { spellId: spell.id, count: 1 },
                usesRemaining: 1,
              },
            ]
          : [],
        characterUnitRefs: sourceScopedFreeCast
          ? [
              { unit: rayOfFrost, supportProfiles: [] },
              { unit: acidSplash, supportProfiles: [] },
              { unit: spell, supportProfiles: [] },
              { unit: freeCastSource, supportProfiles: [] },
            ]
          : [],
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
          spellAccesses: sourceScopedFreeCast
            ? [
                {
                  source: {
                    tag: "feat",
                    sourceUnit: freeCastSource,
                    spellList: wizardSpellListSource(),
                  },
                  spellcastingAbilityModifier: 3,
                  cantrips: [rayOfFrost, acidSplash],
                  levelOneSpell: spell,
                },
              ]
            : [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: sourceScopedFreeCast ? [] : [{ spellLevel: 1, count: 2 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function battleWithAttackers(input: {
  readonly shield: SpellRecord;
  readonly attackerIds: readonly [CombatantId, CombatantId, CombatantId];
}): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-duration"),
    combatants: [
      characterCreature({
        combatantId: input.attackerIds[0],
        displayName: "Attacker 1",
        initiative: 30,
      }),
      characterCreature({
        combatantId: input.attackerIds[1],
        displayName: "Attacker 2",
        initiative: 20,
      }),
      characterCreature({
        combatantId: input.attackerIds[2],
        displayName: "Attacker 3",
        initiative: 15,
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.shield],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function battleWithSpellAttack(input: {
  readonly shield: SpellRecord;
  readonly spellAttack: SpellRecord;
}): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-attack-spell"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Ray caster",
        initiative: 20,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [input.spellAttack],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.shield],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function battleWithMagicMissile(input: {
  readonly shield: SpellRecord;
  readonly magicMissile: SpellRecord;
}): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-magic-missile"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Magic Missile caster",
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
          preparedSpells: [input.magicMissile],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.shield],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
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
      classLevels: [{ className: "wizard", level: 1 }],
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
      resources: input.resources ?? [],
    },
  };
}

function spellAct(input: {
  readonly session: BattleRuntimeSession;
  readonly spellId: string;
}): ActionSpellAct {
  const act = discoverBattleActs(input.session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        input.spellId,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} spell act.`);
  }
  return act;
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

function resolveAttackRollOnly(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly total: number;
  readonly naturalD20: number;
}): ReturnType<typeof resolveBattleSubject> {
  const attackAct = discoverBattleActCandidates(input.state).find(
    (act): act is AttackAct =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === input.attackerId,
  );
  if (attackAct === undefined) {
    throw new Error("Expected Unarmed Strike attack act.");
  }
  const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
  const targetFillForAttack = attackTargetFill(
    targetHole,
    input.attackerId,
    input.targetId,
  );
  const awaitingAttackRoll = resolveBattleSubject({
    state: input.state,
    subject: attackAct.subject,
    fills: [targetFillForAttack],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected attack target to request an Attack Roll.");
  }
  const attackRollHole = requireHole(awaitingAttackRoll.holes, "attackRoll");
  return resolveBattleSubject({
    state: input.state,
    subject: attackAct.subject,
    fills: [
      targetFillForAttack,
      attackRollFill(attackRollHole, {
        total: input.total,
        naturalD20: input.naturalD20,
      }),
    ],
  });
}

function endTurnByActor(state: BattleState, actorId: CombatantId): BattleState {
  const ended = resolveBattleSubject({
    state,
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "endTurn",
    },
    fills: [],
  });
  if (ended.tag !== "resolved") {
    throw new Error("Expected End Turn to resolve.");
  }
  return ended.state;
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.attack === undefined) {
    throw new Error("Expected bound Shield trigger attack selection.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetDistance",
        actorId,
        targetId,
        ...hole.attack.selection,
        distanceFeet: movementFeet(5),
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly speedKind?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["speedKind"];
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
    },
  };
}

function unarmedStrikeSelection(state: BattleState, actorId: CombatantId) {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error(`Expected character combatant ${actorId}.`);
  }
  return {
    procedureRef: actor.origin.unarmedStrike.procedureRef,
    attackAbility: actor.origin.unarmedStrike.attackAbility,
    attackDamageType: actor.origin.unarmedStrike.effect.damage.damageType,
  };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.spellTargetSpatialFactRequest === undefined) {
    throw new Error("Expected a spell target spatial-fact request.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        sourceProcedureRef:
          hole.spellTargetSpatialFactRequest.sourceProcedureRef,
      },
    ],
  };
}

function spellTargetAllocationFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
  casterId: CombatantId,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[],
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map((allocation) => ({
      kind: "spellTarget",
      casterId,
      targetId: allocation.targetId,
      sourceProcedureRef: hole.sourceProcedureRef,
    })),
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

function resolveShieldReactionChoice(
  awaitingReaction: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
  session: BattleRuntimeSession,
): ReturnType<typeof resolveBattleInterrupt> {
  const reactionChoice =
    awaitingReaction.snapshot.pendingInterrupt?.choices.find(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "castTriggeredReactionSpell",
    );
  if (
    reactionChoice === undefined ||
    reactionChoice.kind !== "nestedProcedure" ||
    reactionChoice.subject.command !== "castTriggeredReactionSpell"
  ) {
    throw new Error("Expected Shield Reaction spell choice.");
  }
  expect(reactionChoice.subject.reactorId).toBe(spellCasterId);
  expect(
    characterSpellInvocationRefForProcedureRefForTest(
      battleRuntimeSessionForTest({
        state: awaitingReaction.state,
        context: session.context,
      }),
      reactionChoice.subject.reactorId,
      reactionChoice.subject.procedureRef,
    ),
  ).toMatchObject({
    tag: "spellSlot",
    spellId: shieldUnitId,
    procedure: "shieldReaction",
  });
  return resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: {
      kind: "interruptDecision",
      holeId: awaitingReaction.holes[0]!.holeId,
      value: {
        kind: "resolve",
        responderId: spellCasterId,
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: reactionChoice.subject.procedureRef,
          fills: [],
        },
      },
    },
  });
}
