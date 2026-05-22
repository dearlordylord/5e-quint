// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME enlarge_reduce
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-creature-size-change
import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { proficiencyBonus } from "@dnd/shared/types";
import type { Size } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  breakBattleConcentration,
  discoverBattleActs,
  elapsedTimeTicks,
  resolveBattleSubject,
  spellId,
  spellSlotInvocationRef,
  type BattleState,
  type SpellMarkedDamageRider,
} from "./unit-profile-admission-test-support.ts";
import {
  type ActionSpellAct,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { combatantEffectiveSize } from "./battle-reducer/druid-wild-shape.ts";
import { INITIAL_TURN_RESOURCES } from "./battle-reducer/battle-runtime-protocol.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import type { BattleSubject } from "./index.ts";

const enlargeReduceUnitId = "enlarge_reduce";

function creatureSizeAct(
  procedure: "creatureSizeIncrease" | "creatureSizeDecrease",
): {
  readonly state: ReturnType<typeof spellBattle>;
  readonly act: ActionSpellAct;
} {
  const spell = spellRecord(enlargeReduceUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  return { state, act: creatureSizeActInState(state, procedure) };
}

function creatureSizeActInState(
  state: ReturnType<typeof spellBattle>,
  procedure: "creatureSizeIncrease" | "creatureSizeDecrease",
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === enlargeReduceUnitId &&
      candidate.subject.invocation.procedure === procedure,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${procedure} spell act.`);
  }
  return act;
}

describe("L12G deterministic Enlarge/Reduce creature admission", () => {
  test("admits only creature size increase and decrease spell-slot acts from the creature-or-object Surface target", () => {
    const { state } = creatureSizeAct("creatureSizeIncrease");
    const procedures = discoverBattleActs(state).flatMap((act) =>
      act.subject.tag === "actionSpell" &&
      act.subject.invocation.tag === "spellSlot" &&
      act.subject.invocation.spellId === enlargeReduceUnitId
        ? [act.subject.invocation.procedure]
        : [],
    );

    expect(procedures).toEqual([
      "creatureSizeIncrease",
      "creatureSizeDecrease",
    ]);
    expect(
      procedures.map((procedure) =>
        spellSlotInvocationRef(enlargeReduceUnitId, 2, procedure),
      ),
    ).toEqual([
      {
        tag: "spellSlot",
        spellId: enlargeReduceUnitId,
        slotLevel: 2,
        procedure: "creatureSizeIncrease",
      },
      {
        tag: "spellSlot",
        spellId: enlargeReduceUnitId,
        slotLevel: 2,
        procedure: "creatureSizeDecrease",
      },
    ]);
  });

  test("willing size increase applies size and Strength roll-mode projections", () => {
    const { state, act } = creatureSizeAct("creatureSizeIncrease");
    const target = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Enlarge creature cast to resolve.");
    }
    const targetState = requireCombatant(resolved.state, spellTargetId);
    expect(targetState.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatureSizeChange",
        direction: "increase",
      }),
    );
    expect(combatantEffectiveSize(targetState)).toBe("large");
    expect(
      requiredAbilityCheckRollMode(resolved.state, spellTargetId, "str"),
    ).toBe("advantage");
    expect(
      savingThrowRollModeProjections(resolved.state, "str"),
    ).toContainEqual({ targetId: spellTargetId, rollMode: "advantage" });
  });

  test("unwilling size decrease is gated by Constitution save and records reduce floor", () => {
    const { state, act } = creatureSizeAct("creatureSizeDecrease");
    const target = requireHole(act.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    const save = requireResultHole(needsSave, "savingThrowOutcome");

    const succeeded = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(succeeded).toMatchObject({ tag: "resolved" });
    if (succeeded.tag !== "resolved") {
      throw new Error("Expected successful Reduce save to resolve.");
    }
    expect(
      requireCombatant(succeeded.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(succeeded.state, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatureSizeChange" }),
      ]),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Reduce creature cast to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatureSizeChange",
        direction: "decrease",
      }),
    );
  });

  test("opposite-mode recast replaces the prior creature size-change effect", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 2 }],
    });
    const enlargeAct = creatureSizeActInState(state, "creatureSizeIncrease");
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected Enlarge self cast to resolve.");
    }

    const recastReady = {
      ...enlarged.state,
      currentTurnResources: INITIAL_TURN_RESOURCES,
    };
    const reduceAct = creatureSizeActInState(
      recastReady,
      "creatureSizeDecrease",
    );
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state: recastReady,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });

    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Reduce recast to resolve.");
    }
    expect(sizeChangeEffects(reduced.state, spellCasterId)).toEqual([
      expect.objectContaining({
        kind: "spellCreatureSizeChange",
        direction: "decrease",
      }),
    ]);
    expect(
      combatantEffectiveSize(requireCombatant(reduced.state, spellCasterId)),
    ).toBe("small");
    expect(
      savingThrowRollModeProjections(reduced.state, "str").filter(
        (projection) => projection.targetId === spellCasterId,
      ),
    ).toEqual([{ targetId: spellCasterId, rollMode: "disadvantage" }]);
  });

  test("creature size projection stays within the SRD Size category bounds", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const reduceReady = withCombatantSize(state, spellTargetId, "tiny");
    const reduceAct = creatureSizeActInState(
      reduceReady,
      "creatureSizeDecrease",
    );
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state: reduceReady,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Tiny Reduce cast to resolve.");
    }
    expect(
      combatantEffectiveSize(requireCombatant(reduced.state, spellTargetId)),
    ).toBe("tiny");

    const enlargeReady = withCombatantSize(state, spellTargetId, "gargantuan");
    const enlargeAct = creatureSizeActInState(
      enlargeReady,
      "creatureSizeIncrease",
    );
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state: enlargeReady,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected Gargantuan Enlarge cast to resolve.");
    }
    expect(
      combatantEffectiveSize(requireCombatant(enlarged.state, spellTargetId)),
    ).toBe("gargantuan");
  });

  test("successful unwilling save still ends prior Concentration spell", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 2 }],
    });
    const enlargeAct = creatureSizeActInState(state, "creatureSizeIncrease");
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected Enlarge self cast to resolve.");
    }

    const recastReady = {
      ...enlarged.state,
      currentTurnResources: INITIAL_TURN_RESOURCES,
    };
    const reduceAct = creatureSizeActInState(
      recastReady,
      "creatureSizeDecrease",
    );
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state: recastReady,
      subject: reduceAct.subject,
      fills: [
        spellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    const save = requireResultHole(needsSave, "savingThrowOutcome");
    const saved = resolveBattleSubject({
      state: recastReady,
      subject: reduceAct.subject,
      fills: [
        spellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(saved).toMatchObject({ tag: "resolved" });
    if (saved.tag !== "resolved") {
      throw new Error("Expected successful Reduce save to resolve.");
    }
    expect(
      requireCombatant(saved.state, spellCasterId).concentration,
    ).toBeNull();
    expect(sizeChangeEffects(saved.state, spellCasterId)).toEqual([]);
    expect(sizeChangeEffects(saved.state, spellTargetId)).toEqual([]);
  });

  test("size change adjusts affected weapon and Unarmed Strike hit damage", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 2 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });

    const enlargeAct = creatureSizeActInState(state, "creatureSizeIncrease");
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected Enlarge self cast to resolve.");
    }

    expect(
      resolveAttackHitHp(
        { ...enlarged.state, currentTurnResources: INITIAL_TURN_RESOURCES },
        "Longsword",
        [[4], [3]],
      ),
    ).toBe(5);
    expect(
      resolveAttackHitHp(
        { ...enlarged.state, currentTurnResources: INITIAL_TURN_RESOURCES },
        "Unarmed Strike",
        [[3]],
      ),
    ).toBe(8);

    const reduceAct = creatureSizeActInState(state, "creatureSizeDecrease");
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Reduce self cast to resolve.");
    }

    expect(
      resolveAttackHitHp(
        { ...reduced.state, currentTurnResources: INITIAL_TURN_RESOURCES },
        "Longsword",
        [[1], [4]],
      ),
    ).toBe(11);
    expect(
      resolveAttackHitHp(
        { ...reduced.state, currentTurnResources: INITIAL_TURN_RESOURCES },
        "Unarmed Strike",
        [[4]],
      ),
    ).toBe(11);
  });

  test("Reduce damage floor applies before target resistance", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const reduceAct = creatureSizeActInState(state, "creatureSizeDecrease");
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Reduce self cast to resolve.");
    }

    const withRider = withSyntheticHitRider(reduced.state, false);
    expect(
      resolveAttackHitHp(
        { ...withRider, currentTurnResources: INITIAL_TURN_RESOURCES },
        "Longsword",
        [[1], [3], [4]],
      ),
    ).toBe(11);

    const resisted = withSyntheticHitRider(reduced.state, true);
    expect(
      resolveAttackHitHp(
        { ...resisted, currentTurnResources: INITIAL_TURN_RESOURCES },
        "Longsword",
        [[1], [3], [4]],
      ),
    ).toBe(12);
  });

  test("Reduce subtracts from total attack-hit damage including marked riders", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const reduceAct = creatureSizeActInState(state, "creatureSizeDecrease");
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Reduce self cast to resolve.");
    }

    const withMarkedRider = withSyntheticMarkedDamageRider(reduced.state);
    expect(
      resolveAttackHitHp(
        { ...withMarkedRider, currentTurnResources: INITIAL_TURN_RESOURCES },
        "Longsword",
        [[1], [4], [6]],
      ),
    ).toBe(9);
  });

  test("replacing another caster's size-change effect clears stale concentration", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetPreparedSpells: [spell],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spell],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });
    const enlargeAct = creatureSizeActInState(state, "creatureSizeIncrease");
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected caster Enlarge to resolve.");
    }
    expect(
      requireCombatant(enlarged.state, spellCasterId).concentration,
    ).not.toBeNull();

    const targetTurn = resolveBattleSubject({
      state: enlarged.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn to resolve.");
    }

    const reduceAct = creatureSizeActInState(
      targetTurn.state,
      "creatureSizeDecrease",
    );
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state: targetTurn.state,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellTargetId,
          spellTargetId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected target Reduce to resolve.");
    }

    expect(
      requireCombatant(reduced.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(reduced.state, spellTargetId).concentration,
    ).not.toBeNull();
    expect(sizeChangeEffects(reduced.state, spellTargetId)).toEqual([
      expect.objectContaining({
        kind: "spellCreatureSizeChange",
        direction: "decrease",
        sourceCombatantId: spellTargetId,
      }),
    ]);
  });

  test("size change cleans up on Concentration break and duration expiry", () => {
    const { state, act } = creatureSizeAct("creatureSizeIncrease");
    const target = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Enlarge creature cast to resolve.");
    }

    const broken = breakBattleConcentration(resolved.state, spellCasterId);
    expect(requireCombatant(broken, spellCasterId).concentration).toBeNull();
    expect(requireCombatant(broken, spellTargetId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatureSizeChange" }),
      ]),
    );

    const targetState = requireCombatant(resolved.state, spellTargetId);
    const nearlyExpired: BattleState = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(spellTargetId, {
        ...targetState,
        activeEffects: targetState.activeEffects.map((effect) =>
          effect.kind === "spellCreatureSizeChange" &&
          effect.expiresAt.kind === "concentration"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      }),
    };
    const expired = advanceToNextCasterTurn(nearlyExpired);
    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
    expect(requireCombatant(expired, spellTargetId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatureSizeChange" }),
      ]),
    );
  });
});

function resolveAttackHitHp(
  state: ReturnType<typeof spellBattle>,
  attackName: "Longsword" | "Unarmed Strike",
  damageRolls: readonly (readonly number[])[],
): number {
  const subject =
    attackName === "Longsword"
      ? weaponAttackSubject("Longsword")
      : attackActSubject(state, "Unarmed Strike");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    spellCasterId,
    spellTargetId,
    attackName,
  );
  const roll = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, rollFill],
    }),
    "rolledDice",
  );
  const resolved = resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill,
      rollFill,
      damageRollFillWithGroups(damage, damageRolls),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Longsword hit to resolve.");
  }
  return requireCombatant(resolved.state, spellTargetId).hp;
}

function withSyntheticHitRider(
  state: BattleState,
  targetResistsDamage: boolean,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  const target = requireCombatant(state, spellTargetId);
  const duration = {
    kind: "duration" as const,
    durationTicks: elapsedTimeTicks(600),
  };
  return {
    ...state,
    combatants: new Map(state.combatants)
      .set(spellCasterId, {
        ...caster,
        activeEffects: [
          ...caster.activeEffects,
          {
            kind: "spellWeaponDamageRider" as const,
            sourceSpellId: "synthetic_reduce_floor_rider",
            sourceCombatantId: spellCasterId,
            damage: {
              expr: { dice: 1, dieSize: 4 },
              damageType: "radiant" as const,
            },
            expiresAt: duration,
          },
        ],
      })
      .set(spellTargetId, {
        ...target,
        activeEffects: targetResistsDamage
          ? [
              ...target.activeEffects,
              {
                kind: "damageResistance" as const,
                sourceSpellId: "synthetic_reduce_floor_resistance",
                sourceCombatantId: spellTargetId,
                damageType: "slashing" as const,
                expiresAt: duration,
              },
              {
                kind: "damageResistance" as const,
                sourceSpellId: "synthetic_reduce_floor_resistance",
                sourceCombatantId: spellTargetId,
                damageType: "radiant" as const,
                expiresAt: duration,
              },
            ]
          : target.activeEffects,
      }),
  };
}

function withSyntheticMarkedDamageRider(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  const markedRider = {
    kind: "spellMarkedDamageRider",
    sourceSpellId: spellId("synthetic_reduce_floor_mark"),
    sourceCombatantId: spellCasterId,
    targetCombatantId: spellTargetId,
    transfer: {
      kind: "awaitingTargetDrop",
      retargetTiming: "sameTurn",
    },
    abilityCheckBehavior: { kind: "none" },
    damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
    },
  } satisfies SpellMarkedDamageRider;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: [...caster.activeEffects, markedRider],
    }),
  };
}

function sizeChangeEffects(
  state: BattleState,
  combatantId: typeof spellCasterId | typeof spellTargetId,
) {
  return requireCombatant(state, combatantId).activeEffects.filter(
    (effect) => effect.kind === "spellCreatureSizeChange",
  );
}

function withCombatantSize(
  state: BattleState,
  combatantId: typeof spellCasterId | typeof spellTargetId,
  size: Size,
): BattleState {
  const combatant = requireCombatant(state, combatantId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      size,
    }),
  };
}

function attackActSubject(
  state: BattleState,
  attackName: "Unarmed Strike",
): Extract<BattleSubject, { readonly tag: "action" }> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.attackName === attackName,
  );
  expect(act).toBeDefined();
  if (act === undefined || act.subject.tag !== "action") {
    throw new Error(`Expected ${attackName} attack act.`);
  }
  return act.subject;
}

function advanceToNextCasterTurn(state: BattleState): BattleState {
  const casterEnd = resolveBattleSubject({
    state,
    subject: {
      tag: "runtimeCommand",
      actorId: spellCasterId,
      command: "endTurn",
    },
    fills: [],
  });
  if (casterEnd.tag !== "resolved") {
    throw new Error("Expected caster end turn.");
  }
  const targetEnd = resolveBattleSubject({
    state: casterEnd.state,
    subject: {
      tag: "runtimeCommand",
      actorId: spellTargetId,
      command: "endTurn",
    },
    fills: [],
  });
  if (targetEnd.tag !== "resolved") {
    throw new Error("Expected target end turn.");
  }
  return targetEnd.state;
}
