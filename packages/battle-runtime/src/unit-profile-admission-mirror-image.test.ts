// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-MISSING-MIRROR-IMAGE mirror_image
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-mirror-image-hit-interception
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
import { describe, expect, test } from "vitest";
import {
  mirrorImageUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireResultHole,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  combatantId,
  elapsedTimeTicks,
  endTurn,
  resolveBattleSubject,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleActiveEffect,
  BattleFill,
  BattleHole,
  BattleState,
  BattleTargetSpatialFact,
  CombatantId,
} from "./unit-profile-admission-test-support.ts";

type MirrorImageBypassSense = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "attackAttackerUnaffectedByMirrorImageWithSense" }
>["sense"];
type MirrorImageDuplicateRollHole = Extract<
  BattleHole,
  { readonly kind: "rolledDice" }
> & {
  readonly mirrorImageDuplicateRoll: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: string;
    readonly sourceCombatantId: CombatantId;
    readonly remainingDuplicates: 1 | 2 | 3;
    readonly dieSize: 6;
    readonly successAtLeast: 3;
  };
};
type MirrorImageActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "mirrorImageDuplicates" }
>;

describe("L12G-MISSING-MIRROR-IMAGE deterministic Mirror Image admission", () => {
  test("mirror_image casts as a self timed duplicate pool without Concentration", () => {
    const attackerId = combatantId("unit-profile-mirror-image-attacker");
    const state = mirrorImageBattle(attackerId);
    const cast = castMirrorImage(state);
    const caster = requireCombatant(cast.state, spellCasterId);

    expect(caster.concentration).toBeNull();
    expect(activeMirrorImage(caster.activeEffects)).toMatchObject({
      kind: "mirrorImageDuplicates",
      sourceSpellId: mirrorImageUnitId,
      sourceCombatantId: spellCasterId,
      remainingDuplicates: 3,
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
    });
  });

  test("incoming attack-roll hit asks for a Mirror Image duplicate roll before damage", () => {
    const attackerId = combatantId("unit-profile-mirror-image-hole-attacker");
    const cast = castMirrorImage(mirrorImageBattle(attackerId));
    const attack = attackThroughRoll({
      state: cast.state,
      attackerId,
      targetId: spellCasterId,
    });

    expect(attack.mirrorHole).toMatchObject({
      mirrorImageDuplicateRoll: {
        targetId: spellCasterId,
        sourceSpellId: mirrorImageUnitId,
        sourceCombatantId: spellCasterId,
        remainingDuplicates: 3,
        dieSize: 6,
        successAtLeast: 3,
      },
    });
  });

  test("successful duplicate roll redirects the hit and destroys one duplicate without damaging the caster", () => {
    const attackerId = combatantId(
      "unit-profile-mirror-image-success-attacker",
    );
    const cast = castMirrorImage(mirrorImageBattle(attackerId));
    const attack = attackThroughRoll({
      state: cast.state,
      attackerId,
      targetId: spellCasterId,
    });
    const priorHp = Number(requireCombatant(attack.state, spellCasterId).hp);
    const result = resolveBattleSubject({
      state: attack.state,
      subject: attack.subject,
      fills: [
        attack.targetFill,
        attack.attackFill,
        damageRollFillWithGroups(attack.mirrorHole, [[1, 2, 3]]),
      ],
    });

    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") {
      throw new Error("Expected Mirror Image duplicate hit to resolve.");
    }
    const caster = requireCombatant(result.state, spellCasterId);
    expect(Number(caster.hp)).toBe(priorHp);
    expect(activeMirrorImage(caster.activeEffects)?.remainingDuplicates).toBe(
      2,
    );
  });

  test("failed duplicate roll keeps the caster as the hit target and proceeds to damage", () => {
    const attackerId = combatantId("unit-profile-mirror-image-fail-attacker");
    const cast = castMirrorImage(mirrorImageBattle(attackerId));
    const attack = attackThroughRoll({
      state: cast.state,
      attackerId,
      targetId: spellCasterId,
    });
    const damageHole = requireNonMirrorRolledDiceHole(
      resolveBattleSubject({
        state: attack.state,
        subject: attack.subject,
        fills: [
          attack.targetFill,
          attack.attackFill,
          damageRollFillWithGroups(attack.mirrorHole, [[1, 2, 2]]),
        ],
      }),
    );
    const priorHp = Number(requireCombatant(attack.state, spellCasterId).hp);
    const damaged = resolveBattleSubject({
      state: attack.state,
      subject: attack.subject,
      fills: [
        attack.targetFill,
        attack.attackFill,
        damageRollFillWithGroups(attack.mirrorHole, [[1, 2, 2]]),
        damageRollFillWithGroups(damageHole, [[1]]),
      ],
    });

    expect(damaged).toMatchObject({ tag: "resolved" });
    if (damaged.tag !== "resolved") {
      throw new Error(
        "Expected failed Mirror Image duplicate roll to damage caster.",
      );
    }
    const caster = requireCombatant(damaged.state, spellCasterId);
    expect(Number(caster.hp)).toBeLessThan(priorHp);
    expect(activeMirrorImage(caster.activeEffects)?.remainingDuplicates).toBe(
      3,
    );
  });

  test("successful roll with the final duplicate removes the active effect", () => {
    const attackerId = combatantId("unit-profile-mirror-image-final-attacker");
    const cast = castMirrorImage(mirrorImageBattle(attackerId));
    const oneDuplicate = withMirrorImageDuplicateCount(cast.state, 1);
    const attack = attackThroughRoll({
      state: oneDuplicate,
      attackerId,
      targetId: spellCasterId,
    });
    const result = resolveBattleSubject({
      state: attack.state,
      subject: attack.subject,
      fills: [
        attack.targetFill,
        attack.attackFill,
        damageRollFillWithGroups(attack.mirrorHole, [[3]]),
      ],
    });

    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") {
      throw new Error("Expected final Mirror Image duplicate hit to resolve.");
    }
    expect(
      activeMirrorImage(
        requireCombatant(result.state, spellCasterId).activeEffects,
      ),
    ).toBeNull();
  });

  test.each(["blindsight", "truesight"] as const)(
    "Mirror Image is bypassed when the attacker perceives the caster with %s",
    (sense: MirrorImageBypassSense) => {
      const attackerId = combatantId(`unit-profile-mirror-image-${sense}`);
      const cast = castMirrorImage(mirrorImageBattle(attackerId));
      const damageHole = attackDamageHole({
        state: cast.state,
        attackerId,
        targetFacts: [mirrorImageBypassFact(attackerId, spellCasterId, sense)],
      });

      expect("mirrorImageDuplicateRoll" in damageHole).toBe(false);
    },
  );

  test("Mirror Image is bypassed when the attacker has Blinded", () => {
    const attackerId = combatantId(
      "unit-profile-mirror-image-blinded-attacker",
    );
    const cast = castMirrorImage(mirrorImageBattle(attackerId));
    const blinded = withBlindedAttacker(cast.state, attackerId);
    const damageHole = attackDamageHole({
      state: blinded,
      attackerId,
      targetFacts: [],
    });

    expect("mirrorImageDuplicateRoll" in damageHole).toBe(false);
  });
});

function mirrorImageBattle(attackerId: CombatantId): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(mirrorImageUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    statBlockTargets: [
      {
        combatantId: attackerId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 19,
      },
    ],
  });
}

function castMirrorImage(
  state: BattleState,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const act = spellAct({ state, spellId: mirrorImageUnitId, slotLevel: 2 });
  expect(act.initialHoles).toEqual([]);
  expect(act.subject.invocation).toMatchObject({
    tag: "spellSlot",
    spellId: mirrorImageUnitId,
    slotLevel: 2,
    procedure: "mirrorImageHitInterception",
  });
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [],
  });
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected Mirror Image to resolve.");
  }
  return result;
}

function attackerTurnState(
  state: BattleState,
): Extract<ReturnType<typeof endTurn>, { readonly tag: "resolved" }> {
  const attackerTurn = endTurn({ state, actorId: spellCasterId });
  expect(attackerTurn).toMatchObject({ tag: "resolved" });
  if (attackerTurn.tag !== "resolved") {
    throw new Error("Expected to advance to Mirror Image attacker turn.");
  }
  return attackerTurn;
}

function attackThroughRoll(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly targetFacts?: readonly BattleTargetSpatialFact[];
}): {
  readonly state: BattleState;
  readonly subject: ReturnType<typeof statBlockAttackAct>["subject"];
  readonly targetFill: Extract<BattleFill, { readonly kind: "targetChoice" }>;
  readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
  readonly mirrorHole: MirrorImageDuplicateRollHole;
} {
  const attackerTurn = attackerTurnState(input.state);
  const attack = statBlockAttackAct(
    attackerTurn.state,
    input.attackerId,
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
    input.attackerId,
    input.targetId,
    "Scimitar",
    input.targetFacts ?? [],
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 15,
    ...(attackRoll.rollMode === undefined
      ? {}
      : { rollMode: attackRoll.rollMode }),
  });
  const mirrorHole = requireMirrorImageDuplicateRollHole(
    resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [targetFill, attackFill],
    }),
  );
  return {
    state: attackerTurn.state,
    subject: attack.subject,
    targetFill,
    attackFill,
    mirrorHole,
  };
}

function attackDamageHole(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly targetFacts: readonly BattleTargetSpatialFact[];
}): Extract<BattleHole, { readonly kind: "rolledDice" }> {
  const attackerTurn = attackerTurnState(input.state);
  const attack = statBlockAttackAct(
    attackerTurn.state,
    input.attackerId,
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
    input.attackerId,
    spellCasterId,
    "Scimitar",
    input.targetFacts,
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 15,
    ...(attackRoll.rollMode === undefined
      ? {}
      : { rollMode: attackRoll.rollMode }),
  });
  return requireNonMirrorRolledDiceHole(
    resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [targetFill, attackFill],
    }),
  );
}

function requireMirrorImageDuplicateRollHole(
  result: ReturnType<typeof resolveBattleSubject>,
): MirrorImageDuplicateRollHole {
  const hole = requireResultHole(result, "rolledDice");
  if (!("mirrorImageDuplicateRoll" in hole)) {
    throw new Error("Expected Mirror Image duplicate roll hole.");
  }
  return hole;
}

function requireNonMirrorRolledDiceHole(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<BattleHole, { readonly kind: "rolledDice" }> {
  const hole = requireResultHole(result, "rolledDice");
  if ("mirrorImageDuplicateRoll" in hole) {
    throw new Error("Expected ordinary damage roll hole.");
  }
  return hole;
}

function activeMirrorImage(
  effects: readonly BattleActiveEffect[],
): MirrorImageActiveEffect | null {
  return (
    effects.find(
      (effect): effect is MirrorImageActiveEffect =>
        effect.kind === "mirrorImageDuplicates",
    ) ?? null
  );
}

function withMirrorImageDuplicateCount(
  state: BattleState,
  remainingDuplicates: 1 | 2 | 3,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: caster.activeEffects.map((effect) =>
        effect.kind === "mirrorImageDuplicates"
          ? { ...effect, remainingDuplicates }
          : effect,
      ),
    }),
  };
}

function withBlindedAttacker(
  state: BattleState,
  attackerId: CombatantId,
): BattleState {
  const attacker = requireCombatant(state, attackerId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(attackerId, {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        attacker,
        applyCondition(attacker.conditions, "blinded"),
      ),
    }),
  };
}

function mirrorImageBypassFact(
  attackerId: CombatantId,
  targetId: CombatantId,
  sense: MirrorImageBypassSense,
): BattleTargetSpatialFact {
  return {
    kind: "attackAttackerUnaffectedByMirrorImageWithSense",
    attackerId,
    targetId,
    sense,
  };
}
