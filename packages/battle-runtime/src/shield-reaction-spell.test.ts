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
  discoverBattleActs,
  initiativeScore,
  resolveBattleInterrupt,
  resolveBattleSubject,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

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
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};

describe("Shield Reaction spell", () => {
  test("is offered when the caster is hit by an Attack Roll and adds +5 Armor Class against the triggering Attack Roll", () => {
    const spell = srdSpellRecord(shieldUnitId);
    const state = battleWithShieldReactionSpell(spell);
    const attackAct = discoverBattleActs(state).find(
      (act): act is AttackAct =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Unarmed Strike",
    );
    expect(attackAct).toBeDefined();
    if (attackAct === undefined) {
      throw new Error("Expected an Unarmed Strike attack act.");
    }
    const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: attackAct.subject,
      fills: [attackTargetFill(targetHole, spellTargetId, spellCasterId)],
    });
    expect(awaitingAttackRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected Attack Roll hole after target selection.");
    }
    const attackRollHole = requireHole(awaitingAttackRoll.holes, "attackRoll");

    const awaitingReaction = resolveBattleSubject({
      state,
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
    const resolved = resolveShieldReactionChoice(awaitingReaction);
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
    const state = battleWithAttackers({
      shield,
      attackerIds: [attackerOneId, attackerTwoId, attackerThreeId],
    });

    const firstHit = resolveAttackRollOnly({
      state,
      attackerId: attackerOneId,
      targetId: spellCasterId,
      total: 14,
      naturalD20: 10,
    });
    if (firstHit.tag !== "needsHoles") {
      throw new Error("Expected first hit to open Shield Reaction window.");
    }
    const shielded = resolveShieldReactionChoice(firstHit);
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
            { reactorId: attackerThreeId, attackName: "Unarmed Strike" },
          ],
        }),
      ],
    });
    if (awaitingOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected movement to provoke an Opportunity Attack.");
    }
    const opportunityAttackChoice =
      awaitingOpportunityAttack.snapshot.pendingInterrupt?.choices.find(
        (choice) => choice.kind === "opportunityAttack",
      );
    if (
      opportunityAttackChoice === undefined ||
      opportunityAttackChoice.kind !== "opportunityAttack"
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
          choice: {
            kind: "opportunityAttack",
            reactorId: attackerThreeId,
            fills: [],
          },
        },
      },
    });
    if (startedOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack to ask for an Attack Roll.");
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
    const state = battleWithSpellAttack({ shield, spellAttack: rayOfFrost });
    const act = spellAct({ state, spellId: rayOfFrostUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetHole,
      rayOfFrostUnitId,
      spellTargetId,
      spellCasterId,
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    expect(awaitingAttackRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected Ray of Frost Attack Roll hole.");
    }
    const attackRollHole = requireHole(awaitingAttackRoll.holes, "attackRoll");

    const awaitingReaction = resolveBattleSubject({
      state,
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

    const resolved = resolveShieldReactionChoice(awaitingReaction);
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
    const state = battleWithMagicMissile({ shield, magicMissile });
    const act = spellAct({ state, spellId: magicMissileUnitId });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      spellTargetId,
      magicMissileUnitId,
      [{ targetId: spellCasterId, count: 3 }],
    );

    const awaitingReaction = resolveBattleSubject({
      state,
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

    const awaitingDamage = resolveShieldReactionChoice(awaitingReaction);
    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage hole after Shield.");
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
    const state = battleWithMagicMissile({
      shield: attackHitOnlyShield,
      magicMissile,
    });
    const act = spellAct({ state, spellId: magicMissileUnitId });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      spellTargetId,
      magicMissileUnitId,
      [{ targetId: spellCasterId, count: 3 }],
    );

    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [allocationFill],
    });

    expect(awaitingDamage).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("is not offered to spend a second Spell Slot during the current actor's Magic Missile", () => {
    const shield = srdSpellRecord(shieldUnitId);
    const magicMissile = srdSpellRecord(magicMissileUnitId);
    const state = spellBattle({ preparedSpells: [magicMissile, shield] });
    const act = spellAct({ state, spellId: magicMissileUnitId });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      spellCasterId,
      magicMissileUnitId,
      [{ targetId: spellCasterId, count: 3 }],
    );

    const awaitingDamage = resolveBattleSubject({
      state,
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
  });
});

function srdSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function spellBattle(input: {
  readonly preparedSpells?: readonly SpellRecord[];
}): BattleState {
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-slot"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Spellcaster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function battleWithShieldReactionSpell(spell: SpellRecord): BattleState {
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-attack-roll"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Attacker",
        initiative: 20,
        side: oppositionSide,
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function battleWithAttackers(input: {
  readonly shield: SpellRecord;
  readonly attackerIds: readonly [CombatantId, CombatantId, CombatantId];
}): BattleState {
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-duration"),
    combatants: [
      characterCreature({
        combatantId: input.attackerIds[0],
        displayName: "Attacker 1",
        initiative: 30,
        side: oppositionSide,
      }),
      characterCreature({
        combatantId: input.attackerIds[1],
        displayName: "Attacker 2",
        initiative: 20,
        side: oppositionSide,
      }),
      characterCreature({
        combatantId: input.attackerIds[2],
        displayName: "Attacker 3",
        initiative: 15,
        side: oppositionSide,
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.shield],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function battleWithSpellAttack(input: {
  readonly shield: SpellRecord;
  readonly spellAttack: SpellRecord;
}): BattleState {
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-attack-spell"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Ray caster",
        initiative: 20,
        side: oppositionSide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [input.spellAttack],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.shield],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function battleWithMagicMissile(input: {
  readonly shield: SpellRecord;
  readonly magicMissile: SpellRecord;
}): BattleState {
  const result = startBattle({
    battleId: battleId("shield-reaction-spell-magic-missile"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Magic Missile caster",
        initiative: 20,
        side: oppositionSide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.magicMissile],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.shield],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
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
      classLevels: [{ className: "wizard", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
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

function spellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): ActionSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === input.spellId,
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
  const attackAct = discoverBattleActs(input.state).find(
    (act): act is AttackAct =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === input.attackerId &&
      act.subject.attackName === "Unarmed Strike",
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
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId,
        targetId,
        attackName: "Unarmed Strike",
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
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
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

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

function spellTargetAllocationFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
  casterId: CombatantId,
  spellId: string,
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
      spellId,
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
): ReturnType<typeof resolveBattleInterrupt> {
  const reactionChoice =
    awaitingReaction.snapshot.pendingInterrupt?.choices.find(
      (choice) => choice.kind === "castTriggeredReactionSpell",
    );
  expect(reactionChoice).toEqual(
    expect.objectContaining({
      kind: "castTriggeredReactionSpell",
      reactorId: spellCasterId,
      invocation: expect.objectContaining({
        tag: "spellSlot",
        spellId: shieldUnitId,
        procedure: "shieldReaction",
      }),
    }),
  );
  if (
    reactionChoice === undefined ||
    reactionChoice.kind !== "castTriggeredReactionSpell"
  ) {
    throw new Error("Expected Shield Reaction spell choice.");
  }
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
          invocation: reactionChoice.invocation,
          fills: [],
        },
      },
    },
  });
}
