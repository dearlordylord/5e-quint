import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV69B hellish_rebuke
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.reaction-hellish-rebuke spell.invocation-damage-save-or-attack
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
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  battleProcedureExecutionRefForTest,
  battleProcedureExecutionRefForSpellHoleForTest,
  characterSpellInvocationRefForProcedureRefForTest,
  requireCharacterSpellProcedureRefForTest,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleInterrupt,
  spellSlotInvocationRef,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleCreatureState,
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
const magicMissileUnitId = "magic_missile";
const spellCasterId = combatantId("hellish-rebuke-caster");
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
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [hellishRebuke],
        featurePreparedSpells: [],
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
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [hellishRebuke],
        featurePreparedSpells: [],
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
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [srdSpellRecord(magicMissileUnitId)],
        featurePreparedSpells: [],
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
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          featurePreparedSpells: [],
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
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function battleWithHellishRebukeOnCasterTurn(
  spell: SpellRecord,
): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("hellish-rebuke-direct-spell-lane"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Hellish Rebuke caster",
        initiative: 20,
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
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      characterCreature({
        combatantId: damagerId,
        displayName: "Damager",
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

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
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
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 3 }],
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
        kind: "attackTargetInMeleeReach",
        actorId: damagerId,
        targetId: spellCasterId,
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
