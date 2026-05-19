// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-INVISIBILITY invisibility
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-direct-condition
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  blurUnitId,
  counterspellUnitId,
  invisibilityDurationTicks,
  invisibilityUnitId,
  magicMissileUnitId,
  oppositionSide,
  partySide,
  shieldUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  characterCreature,
  requireCombatant,
  requireHole,
  requireResultHole,
  reactionDecisionFill,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  spellAct,
  spellActInvocation,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  abilityModifier,
  applyBattleHitPointDamage,
  battleId,
  combatantId,
  Either,
  endTurn,
  hasCondition,
  movementFeet,
  proficiencyBonus,
  resolveBattleReaction,
  resolveBattleSubject,
  spellSlotInvocationRef,
  startBattle,
} from "./unit-profile-admission-test-support.ts";
import {
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleReactionProcedureChoice,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";

describe("L12G-SPELL-INVISIBILITY deterministic Invisibility admission", () => {
  test("invisibility admits as a touch target-list condition spell with slot-scaled targets", () => {
    const extraTargetId = combatantId("unit-profile-invisibility-extra-target");
    const spell = spellRecord(invisibilityUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: [extraTargetId],
    });
    const act = spellAct({
      state,
      spellId: invisibilityUnitId,
      slotLevel: 3,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        invisibilityUnitId,
        3,
        "directCondition",
      ),
      mode: { tag: "cast" },
    });
    expect(spellActInvocation(act)).toEqual(
      expect.objectContaining({
        procedure: "directCondition",
        spell,
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 2 },
        activeEffect: expect.objectContaining({
          kind: "targetActionEndedSpellCondition",
          sourceSpellId: invisibilityUnitId,
          sourceCombatantId: spellCasterId,
          condition: "invisible",
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: invisibilityDurationTicks,
          },
        }),
        rangeFeet: 5,
      }),
    );

    const targetList = requireHole(act.initialHoles, "spellTargetList");
    const cast = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(
            targetList,
            spellCasterId,
            invisibilityUnitId,
            [spellTargetId, extraTargetId],
          ),
        ],
      }),
    );

    expectInvisibilityEffect(cast.state, spellTargetId);
    expectInvisibilityEffect(cast.state, extraTargetId);
    expect(requireCombatant(cast.state, spellCasterId).concentration).toEqual({
      sourceSpellId: invisibilityUnitId,
      effectKind: "spellEffect",
    });

    const damaged = applyBattleHitPointDamage({
      state: cast.state,
      target: requireCombatant(cast.state, spellCasterId),
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: spellTargetId,
    });

    expectNoInvisibilityEffect(damaged, spellTargetId);
    expectNoInvisibilityEffect(damaged, extraTargetId);
    expect(requireCombatant(damaged, spellCasterId).concentration).toBeNull();
  });

  test("invisibility ends immediately after the target makes an attack roll", () => {
    const attackerId = combatantId("unit-profile-invisibility-attacker");
    const cast = castInvisibilityOnTargets(
      spellBattle({
        preparedSpells: [spellRecord(invisibilityUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
        statBlockTargets: [
          {
            combatantId: attackerId,
            statBlock: statBlockWithCreatureType("humanoid"),
            initiative: 19,
          },
        ],
      }),
      [attackerId],
    );
    expectInvisibilityEffect(cast.state, attackerId);

    const attackerTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const attack = statBlockAttackAct(
      attackerTurn.state,
      attackerId,
      "Scimitar",
    );
    const target = requireResultHole(
      resolveBattleSubject({
        state: attackerTurn.state,
        subject: attack.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      attackerId,
      spellCasterId,
      "Scimitar",
      [
        {
          kind: "attackTargetCannotSeeAttacker",
          attackerId,
          targetId: spellCasterId,
        },
      ],
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: attackerTurn.state,
        subject: attack.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    expect(roll.rollMode).toBe("advantage");

    const awaitingDamage = resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [
        targetFill,
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
        }),
      ],
    });

    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected attack damage after Invisibility attack roll.");
    }
    expectNoInvisibilityEffect(awaitingDamage.state, attackerId);
    expect(
      requireCombatant(awaitingDamage.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("invisibility ends immediately after the target casts a spell", () => {
    const state = spellBattle({
      preparedSpells: [spellRecord(invisibilityUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord(blurUnitId)],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });
    const cast = castInvisibilityOnTargets(state, [spellTargetId]);
    expectInvisibilityEffect(cast.state, spellTargetId);

    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const blur = spellAct({
      state: targetTurn.state,
      spellId: blurUnitId,
      slotLevel: 2,
    });
    const blurred = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: blur.subject,
        fills: [],
      }),
    );

    expectNoInvisibilityEffect(blurred.state, spellTargetId);
    expect(
      requireCombatant(blurred.state, spellCasterId).concentration,
    ).toBeNull();
    expect(requireCombatant(blurred.state, spellTargetId)).toEqual(
      expect.objectContaining({
        concentration: {
          sourceSpellId: blurUnitId,
          effectKind: "spellEffect",
        },
        activeEffects: expect.arrayContaining([
          expect.objectContaining({
            kind: "blurred",
            sourceSpellId: blurUnitId,
          }),
        ]),
      }),
    );
  });

  test("invisibility ends when the target casts a spell that is counterspelled", () => {
    const counterspellerId = combatantId(
      "unit-profile-invisibility-counterspeller",
    );
    const state = invisibilityReactionBattle({
      targetPreparedSpells: [spellRecord(blurUnitId)],
      targetSpellSlots: [{ spellLevel: 2, count: 1 }],
      extraCombatants: [
        characterCreature({
          combatantId: counterspellerId,
          displayName: "Counterspeller",
          initiative: 5,
          side: oppositionSide,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord(counterspellUnitId)],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
      ],
    });
    const cast = castInvisibilityOnTargets(state, [spellTargetId]);
    expectInvisibilityEffect(cast.state, spellTargetId);

    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const blur = spellAct({
      state: targetTurn.state,
      spellId: blurUnitId,
      slotLevel: 2,
    });
    const awaitingCounterspell = requireNeedsHoles(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: blur.subject,
        fills: [
          spellCastReactionFactsFill([
            counterspellTriggerFact({
              reactorId: counterspellerId,
              casterId: spellTargetId,
            }),
          ]),
        ],
      }),
    );

    expectNoInvisibilityEffect(awaitingCounterspell.state, spellTargetId);
    expect(
      requireCombatant(awaitingCounterspell.state, spellCasterId).concentration,
    ).toBeNull();

    const choice = requireTriggeredReactionSpellChoice({
      result: awaitingCounterspell,
      reactorId: counterspellerId,
      spellId: counterspellUnitId,
      procedure: "counterspell",
      slotLevel: 3,
    });
    const countered = requireResolved(
      resolveBattleReaction({
        state: awaitingCounterspell.state,
        fill: reactionDecisionFill(
          requireHole(awaitingCounterspell.holes, "reactionDecision"),
          triggeredReactionSpellDecision(counterspellerId, choice, []),
        ),
      }),
    );

    expectNoInvisibilityEffect(countered.state, spellTargetId);
    expect(
      requireCombatant(countered.state, spellTargetId).concentration,
    ).toBeNull();
  });

  test("invisibility ends when the target casts Shield as a reaction", () => {
    const magicMissileCasterId = combatantId(
      "unit-profile-invisibility-magic-missile-caster",
    );
    const state = invisibilityReactionBattle({
      targetPreparedSpells: [spellRecord(shieldUnitId)],
      targetSpellSlots: [{ spellLevel: 1, count: 1 }],
      extraCombatants: [
        characterCreature({
          combatantId: magicMissileCasterId,
          displayName: "Magic Missile caster",
          initiative: 5,
          side: partySide,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord(magicMissileUnitId)],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
      ],
    });
    const cast = castInvisibilityOnTargets(state, [spellTargetId]);
    expectInvisibilityEffect(cast.state, spellTargetId);
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const missileTurn = requireResolved(
      endTurn({ state: targetTurn.state, actorId: spellTargetId }),
    );

    const magicMissile = spellAct({
      state: missileTurn.state,
      spellId: magicMissileUnitId,
      slotLevel: 1,
    });
    const targetAllocation = requireResultHole(
      resolveBattleSubject({
        state: missileTurn.state,
        subject: magicMissile.subject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const awaitingShield = requireNeedsHoles(
      resolveBattleSubject({
        state: missileTurn.state,
        subject: magicMissile.subject,
        fills: [
          magicMissileTargetAllocationFill({
            hole: targetAllocation,
            casterId: magicMissileCasterId,
            targetId: spellTargetId,
            dartCount: targetAllocation.allocationCount,
          }),
          spellCastReactionFactsFill([]),
        ],
      }),
    );
    const choice = requireTriggeredReactionSpellChoice({
      result: awaitingShield,
      reactorId: spellTargetId,
      spellId: shieldUnitId,
      procedure: "shieldReaction",
      slotLevel: 1,
    });
    const afterShield = requireNeedsHoles(
      resolveBattleReaction({
        state: awaitingShield.state,
        fill: reactionDecisionFill(
          requireHole(awaitingShield.holes, "reactionDecision"),
          triggeredReactionSpellDecision(spellTargetId, choice, []),
        ),
      }),
    );

    expectNoInvisibilityEffect(afterShield.state, spellTargetId);
    expect(
      requireCombatant(afterShield.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(afterShield.state, spellTargetId).activeEffects,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellArmorClassBonus",
          sourceSpellId: shieldUnitId,
        }),
      ]),
    );
  });

  test("invisibility ends when the target casts Counterspell as a reaction", () => {
    const magicMissileCasterId = combatantId(
      "unit-profile-invisibility-counterspell-trigger-caster",
    );
    const state = invisibilityReactionBattle({
      targetPreparedSpells: [spellRecord(counterspellUnitId)],
      targetSpellSlots: [{ spellLevel: 3, count: 1 }],
      extraCombatants: [
        characterCreature({
          combatantId: magicMissileCasterId,
          displayName: "Counterspell trigger caster",
          initiative: 5,
          side: partySide,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord(magicMissileUnitId)],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
      ],
    });
    const cast = castInvisibilityOnTargets(state, [spellTargetId]);
    expectInvisibilityEffect(cast.state, spellTargetId);
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const missileTurn = requireResolved(
      endTurn({ state: targetTurn.state, actorId: spellTargetId }),
    );

    const magicMissile = spellAct({
      state: missileTurn.state,
      spellId: magicMissileUnitId,
      slotLevel: 1,
    });
    const targetAllocation = requireResultHole(
      resolveBattleSubject({
        state: missileTurn.state,
        subject: magicMissile.subject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const awaitingCounterspell = requireNeedsHoles(
      resolveBattleSubject({
        state: missileTurn.state,
        subject: magicMissile.subject,
        fills: [
          magicMissileTargetAllocationFill({
            hole: targetAllocation,
            casterId: magicMissileCasterId,
            targetId: spellCasterId,
            dartCount: targetAllocation.allocationCount,
          }),
          spellCastReactionFactsFill([
            counterspellTriggerFact({
              reactorId: spellTargetId,
              casterId: magicMissileCasterId,
            }),
          ]),
        ],
      }),
    );
    const choice = requireTriggeredReactionSpellChoice({
      result: awaitingCounterspell,
      reactorId: spellTargetId,
      spellId: counterspellUnitId,
      procedure: "counterspell",
      slotLevel: 3,
    });
    const countered = requireResolved(
      resolveBattleReaction({
        state: awaitingCounterspell.state,
        fill: reactionDecisionFill(
          requireHole(awaitingCounterspell.holes, "reactionDecision"),
          triggeredReactionSpellDecision(spellTargetId, choice, []),
        ),
      }),
    );

    expectNoInvisibilityEffect(countered.state, spellTargetId);
    expect(
      requireCombatant(countered.state, spellCasterId).concentration,
    ).toBeNull();
  });
});

function castInvisibilityOnTargets(
  state: BattleState,
  targetIds: readonly CombatantId[],
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const act = spellAct({
    state,
    spellId: invisibilityUnitId,
    slotLevel: 2,
  });
  const targetList = requireHole(act.initialHoles, "spellTargetList");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(
          targetList,
          spellCasterId,
          invisibilityUnitId,
          targetIds,
        ),
      ],
    }),
  );
}

type CharacterSpellcastingInit = NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
>;

function wizardSpellcasting(input: {
  readonly preparedSpells: readonly SpellRecord[];
  readonly spellSlots: CharacterSpellcastingInit["spellSlots"];
}): CharacterSpellcastingInit {
  return {
    sourceClassName: "wizard",
    spellcastingAbilityModifier: abilityModifier(3),
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: [],
    preparedSpells: input.preparedSpells,
    featurePreparedSpells: [],
    spellbookRitualSpellAccesses: [],
    invocationSpellAccesses: [],
    spellSlots: input.spellSlots,
  };
}

function invisibilityReactionBattle(input: {
  readonly targetPreparedSpells: readonly SpellRecord[];
  readonly targetSpellSlots: CharacterSpellcastingInit["spellSlots"];
  readonly extraCombatants: readonly BattleCreatureInit[];
}): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-invisibility-reactions"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Invisibility caster",
        initiative: 30,
        side: partySide,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord(invisibilityUnitId)],
          spellSlots: [{ spellLevel: 2, count: 1 }],
        }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Invisible spell target",
        initiative: 20,
        side: oppositionSide,
        spellcasting: wizardSpellcasting({
          preparedSpells: input.targetPreparedSpells,
          spellSlots: input.targetSpellSlots,
        }),
      }),
      ...input.extraCombatants,
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

type NeedsHolesResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;

function requireNeedsHoles(result: BattleResolutionResult): NeedsHolesResult {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected battle subject to need holes.");
  }
  return result;
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

function spellCastReactionFactsFill(
  facts: readonly CounterspellTriggerFact[],
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: facts,
  };
}

function requireTriggeredReactionSpellChoice(input: {
  readonly result: NeedsHolesResult;
  readonly reactorId: CombatantId;
  readonly spellId: string;
  readonly procedure: string;
  readonly slotLevel: number;
}): Extract<
  BattleReactionProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = input.result.snapshot.pendingReaction?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleReactionProcedureChoice,
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
    throw new Error(`Expected ${input.spellId} Reaction spell choice.`);
  }
  return choice;
}

function triggeredReactionSpellDecision(
  reactorId: CombatantId,
  choice: Extract<
    BattleReactionProcedureChoice,
    { readonly kind: "castTriggeredReactionSpell" }
  >,
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"] {
  return {
    kind: "resolve",
    reactorId,
    choice: {
      kind: "castTriggeredReactionSpell",
      invocation: choice.invocation,
      fills,
    },
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
    value: {
      allocations: [{ targetId: input.targetId, count: input.dartCount }],
    },
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

function expectInvisibilityEffect(
  state: BattleState,
  targetId: CombatantId,
): void {
  const target = requireCombatant(state, targetId);
  expect(hasCondition(target.conditions, "invisible")).toBe(true);
  expect(invisibilityEffects(state, targetId)).toEqual([
    expect.objectContaining({
      kind: "targetActionEndedSpellCondition",
      sourceSpellId: invisibilityUnitId,
      sourceCombatantId: spellCasterId,
      condition: "invisible",
      conditionHadNonSpellSource: false,
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: invisibilityDurationTicks,
      },
    }),
  ]);
}

function expectNoInvisibilityEffect(
  state: BattleState,
  targetId: CombatantId,
): void {
  const target = requireCombatant(state, targetId);
  expect(hasCondition(target.conditions, "invisible")).toBe(false);
  expect(invisibilityEffects(state, targetId)).toEqual([]);
}

function invisibilityEffects(
  state: BattleState,
  targetId: CombatantId,
): readonly BattleActiveEffect[] {
  return requireCombatant(state, targetId).activeEffects.filter(
    (effect) =>
      effect.kind === "targetActionEndedSpellCondition" &&
      effect.sourceSpellId === invisibilityUnitId,
  );
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected battle subject to resolve.");
  }
  return result;
}
