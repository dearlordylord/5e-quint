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
  resolveBattleReaction,
  resolveBattleSubject,
  spellSlotInvocationRef,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
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
const magicMissileUnitId = "magic_missile";
const spellCasterId = combatantId("hellish-rebuke-caster");
const damagerId = combatantId("hellish-rebuke-damager");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

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
      snapshot: { pendingReaction: { trigger: "afterDamage" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
    }
    const choice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (candidate) =>
        candidate.kind === "castTriggeredReactionSpell" &&
        candidate.invocation.tag === "spellSlot" &&
        candidate.invocation.spellId === hellishRebukeUnitId &&
        candidate.invocation.procedure === "saveGatedDamage" &&
        candidate.invocation.slotLevel === 2,
    );
    if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
      throw new Error("Expected Hellish Rebuke level 2 Reaction choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const damage = requireHole(choice.initialHoles, "rolledDice");
    expect(save).toMatchObject({ ability: "dex" });
    expect(damage).toMatchObject({
      spell: expect.objectContaining({
        spell: expect.objectContaining({ id: hellishRebukeUnitId }),
        damage: { expr: { dice: 3, dieSize: 10 }, damageType: "fire" },
      }),
    });

    const resolved = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            invocation: choice.invocation,
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
      snapshot: { pendingReaction: null },
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

  test("is not offered without caller-supplied visibility and range facts for the damaging creature", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId));
    const result = resolveUnarmedStrikeAgainstCaster({
      state,
      includeHellishRebukeTriggerFact: false,
    });
    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
    });
  });

  test("opens an after-damage Reaction window for the damage caused by Hellish Rebuke and resumes after decline", () => {
    const hellishRebuke = srdSpellRecord(hellishRebukeUnitId);
    const state = battleWithHellishRebuke(hellishRebuke, {
      damagerSpellcasting: {
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [hellishRebuke],
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
    const choice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (candidate) =>
        candidate.kind === "castTriggeredReactionSpell" &&
        candidate.reactorId === spellCasterId &&
        candidate.invocation.tag === "spellSlot" &&
        candidate.invocation.spellId === hellishRebukeUnitId &&
        candidate.invocation.procedure === "saveGatedDamage" &&
        candidate.invocation.slotLevel === 2,
    );
    if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
      throw new Error("Expected initial Hellish Rebuke choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const damage = requireHole(choice.initialHoles, "rolledDice");
    const afterHellishRebukeDamage = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            invocation: choice.invocation,
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
      snapshot: { pendingReaction: { trigger: "afterDamage" } },
    });
    if (afterHellishRebukeDamage.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke damage Reaction window.");
    }
    expect(afterHellishRebukeDamage.snapshot.pendingReaction?.choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "castTriggeredReactionSpell",
          reactorId: damagerId,
          invocation: expect.objectContaining({
            spellId: hellishRebukeUnitId,
            procedure: "saveGatedDamage",
          }),
        }),
      ]),
    );

    const resumed = resolveBattleReaction({
      state: afterHellishRebukeDamage.state,
      fill: reactionDecisionFill(
        requireHole(afterHellishRebukeDamage.holes, "reactionDecision"),
        { kind: "decline", reactorId: damagerId },
      ),
    });
    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
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
      state,
      subject: {
        tag: "actionSpell",
        actorId: spellCasterId,
        invocation: spellSlotInvocationRef(
          hellishRebukeUnitId,
          1,
          "saveGatedDamage",
        ),
        mode: { tag: "cast" },
      },
      fills: [],
    });
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      message:
        "Triggered Reaction spells must use the pending Reaction decision.",
    });
  });

  test("is offered after caller-supplied Magic Missile damage facts from the damaging creature", () => {
    const state = battleWithHellishRebuke(srdSpellRecord(hellishRebukeUnitId), {
      damagerSpellcasting: {
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [srdSpellRecord(magicMissileUnitId)],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    });
    const targetAllocationResult = resolveBattleSubject({
      state,
      subject: magicMissileSubject(),
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
      state,
      subject: magicMissileSubject(),
      fills: [magicMissileTargetAllocationFill(targetAllocation)],
    });
    if (damageResult.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage hole.");
    }
    const damage = requireHole(damageResult.holes, "rolledDice");
    const result = resolveBattleSubject({
      state,
      subject: magicMissileSubject(),
      fills: [
        magicMissileTargetAllocationFill(targetAllocation),
        damageRollFillWithGroups(damage, [[1, 1, 1]]),
      ],
    });
    expect(result).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "afterDamage" } },
    });
    if (result.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage to offer Hellish Rebuke.");
    }
    expect(result.snapshot.pendingReaction?.choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "castTriggeredReactionSpell",
          reactorId: spellCasterId,
          invocation: expect.objectContaining({
            spellId: hellishRebukeUnitId,
            procedure: "saveGatedDamage",
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

function battleWithHellishRebuke(
  spell: SpellRecord,
  input: {
    readonly damagerSpellcasting?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("hellish-rebuke-reaction-spell"),
    combatants: [
      characterCreature({
        combatantId: damagerId,
        displayName: "Damager",
        initiative: 20,
        side: oppositionSide,
        spellcasting: input.damagerSpellcasting,
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Hellish Rebuke caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          spellSlots: [
            { spellLevel: 1, count: 1 },
            { spellLevel: 2, count: 1 },
          ],
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

function battleWithHellishRebukeOnCasterTurn(spell: SpellRecord): BattleState {
  const result = startBattle({
    battleId: battleId("hellish-rebuke-direct-spell-lane"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Hellish Rebuke caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      characterCreature({
        combatantId: damagerId,
        displayName: "Damager",
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
      classLevels: [{ className: "wizard", level: 3 }],
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
  readonly state: BattleState;
  readonly includeHellishRebukeTriggerFact: boolean;
  readonly includeReciprocalHellishRebukeTriggerFact?: boolean | undefined;
}): ReturnType<typeof resolveBattleSubject> {
  const attackAct = discoverBattleActs(input.state).find(
    (act): act is AttackAct =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === damagerId &&
      act.subject.attackName === "Unarmed Strike",
  );
  if (attackAct === undefined) {
    throw new Error("Expected Unarmed Strike attack act.");
  }
  const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
  const targetFill = attackTargetFill({
    hole: targetHole,
    includeHellishRebukeTriggerFact: input.includeHellishRebukeTriggerFact,
    includeReciprocalHellishRebukeTriggerFact:
      input.includeReciprocalHellishRebukeTriggerFact === true,
  });
  const awaitingAttackRoll = resolveBattleSubject({
    state: input.state,
    subject: attackAct.subject,
    fills: [targetFill],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected attack target to request an Attack Roll.");
  }
  const attackRollHole = requireHole(awaitingAttackRoll.holes, "attackRoll");
  return resolveBattleSubject({
    state: input.state,
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
  readonly hole: Extract<BattleHole, { readonly kind: "targetChoice" }>;
  readonly includeHellishRebukeTriggerFact: boolean;
  readonly includeReciprocalHellishRebukeTriggerFact: boolean;
}): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: input.hole.holeId,
    value: spellCasterId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: damagerId,
        targetId: spellCasterId,
        attackName: "Unarmed Strike",
      },
      ...(input.includeHellishRebukeTriggerFact
        ? [
            {
              kind: "reactionSpellDamagerVisibleWithinRange" as const,
              reactorId: spellCasterId,
              damageSourceId: damagerId,
              spellId: hellishRebukeUnitId,
              rangeFeet: movementFeet(60),
            },
          ]
        : []),
      ...(input.includeReciprocalHellishRebukeTriggerFact
        ? [
            {
              kind: "reactionSpellDamagerVisibleWithinRange" as const,
              reactorId: damagerId,
              damageSourceId: spellCasterId,
              spellId: hellishRebukeUnitId,
              rangeFeet: movementFeet(60),
            },
          ]
        : []),
    ],
  };
}

function magicMissileSubject(): BattleSubject {
  return {
    tag: "actionSpell",
    actorId: damagerId,
    invocation: spellSlotInvocationRef(
      magicMissileUnitId,
      1,
      "repeatedDamageAllocation",
    ),
    mode: { tag: "cast" },
  };
}

function magicMissileTargetAllocationFill(
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
        spellId: magicMissileUnitId,
      },
      {
        kind: "reactionSpellDamagerVisibleWithinRange",
        reactorId: spellCasterId,
        damageSourceId: damagerId,
        spellId: hellishRebukeUnitId,
        rangeFeet: movementFeet(60),
      },
    ],
  };
}

function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return { kind: "reactionDecision", holeId: hole.holeId, value };
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
