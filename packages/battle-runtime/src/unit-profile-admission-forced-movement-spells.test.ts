// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV51 thunderwave
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV52 dissonant_whispers
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-forced-reaction-movement
import { describe, expect, test } from "vitest";
import {
  dissonantWhispersUnitId,
  spellCasterId,
  spellTargetId,
  thunderwaveSecondTargetId,
  thunderwaveUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  damageRollFillWithGroups,
  movementFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  savingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
  thunderwaveArea,
  thunderwaveSavingThrowOutcomeFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  spellRecord,
  thunderwaveWithFailedSaveDamage,
  thunderwaveWithFixedSaveDc,
  thunderwaveWithoutDirectPhase,
  thunderwaveWithoutFailedSavePush,
  thunderwaveWithSaveGateCone,
} from "./unit-profile-admission-spell-record-support.ts";
import {
  difficultyClass,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type { BattleState } from "./unit-profile-admission-test-support.ts";

describe("SRDINV51 deterministic Thunderwave Spell Unit admission", () => {
  test("thunderwave is admitted as self-origin Cube save damage with push and boom facts", () => {
    const spell = spellRecord(thunderwaveUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      spellId: thunderwaveUnitId,
      slotLevel: 2,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        thunderwaveUnitId,
        2,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Thunderwave self-origin Cube Saving Throw outcomes",
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "con",
        targeting: { kind: "selfOriginCube", sideFeet: 15 },
        damage: {
          expr: { dice: 3, dieSize: 8 },
          damageType: "thunder",
        },
        successDamage: "half",
        rangeFeet: 0,
        failedSavePostDamageRiders: [],
        postSaveAreaEffect: {
          kind: "thunderwave",
          creaturePush: {
            distanceFeet: 10,
            originDirection: "away_from_caster",
          },
          unsecuredObjectPush: {
            distanceFeet: 10,
            originDirection: "away_from_caster",
            objectLocation: "entirely_within_area",
          },
          audibleBoom: {
            sound: "thunderous boom",
            audibleRadiusFeet: 300,
          },
        },
      }),
    );
  });

  test("thunderwave consumes failed-save push, object push, and audible-boom facts while applying save damage", () => {
    const spell = spellRecord(thunderwaveUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      targetHp: 30,
      targetMaxHp: 30,
      extraTargetIds: [thunderwaveSecondTargetId],
    });
    const act = spellAct({ state, spellId: thunderwaveUnitId });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          thunderwaveSavingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
            { targetId: thunderwaveSecondTargetId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        thunderwaveSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
          { targetId: thunderwaveSecondTargetId, succeeded: true },
        ]),
        damageRollFillWithGroups(damageRoll, [[4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Thunderwave to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(22);
    expect(
      Number(requireCombatant(resolved.state, thunderwaveSecondTargetId).hp),
    ).toBe(8);
  });

  test("thunderwave without object-push and audible-boom facts is not admitted", () => {
    const spell = thunderwaveWithoutDirectPhase(
      spellRecord(thunderwaveUnitId),
      "thunderwave_missing_direct_phase",
    );

    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave without failed-save creature push is not admitted", () => {
    const spell = thunderwaveWithoutFailedSavePush(
      spellRecord(thunderwaveUnitId),
      "thunderwave_missing_failed_push",
    );

    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with a non-Cube save-gate area is not admitted", () => {
    const spell = thunderwaveWithSaveGateCone(
      spellRecord(thunderwaveUnitId),
      "thunderwave_wrong_save_area",
    );

    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with a non-Thunder failed-save damage type is not admitted", () => {
    const spell = thunderwaveWithFailedSaveDamage(
      spellRecord(thunderwaveUnitId),
      "thunderwave_wrong_damage_type",
      (damage) => ({ ...damage, damageType: "fire" }),
    );

    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with the wrong failed-save base dice is not admitted", () => {
    const spell = thunderwaveWithFailedSaveDamage(
      spellRecord(thunderwaveUnitId),
      "thunderwave_wrong_base_dice",
      (damage) => {
        if (damage.amount.kind !== "linear_per_level") {
          throw new Error("Expected Thunderwave slot-scaled damage.");
        }
        return {
          ...damage,
          amount: {
            ...damage.amount,
            base: { ...damage.amount.base, dice: 3 },
          },
        };
      },
    );

    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave without slot-scaled failed-save damage is not admitted", () => {
    const spell = thunderwaveWithFailedSaveDamage(
      spellRecord(thunderwaveUnitId),
      "thunderwave_fixed_damage",
      (damage) => ({
        ...damage,
        amount: { kind: "fixed", expr: { dice: 2, dieSize: 8 } },
      }),
    );

    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with incorrect slot scaling is not admitted", () => {
    const spell = thunderwaveWithFailedSaveDamage(
      spellRecord(thunderwaveUnitId),
      "thunderwave_wrong_slot_scaling",
      (damage) => {
        if (damage.amount.kind !== "linear_per_level") {
          throw new Error("Expected Thunderwave slot-scaled damage.");
        }
        return {
          ...damage,
          amount: {
            ...damage.amount,
            perLevel: { dice: 2 },
          },
        };
      },
    );

    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with a non-caster spell save DC is not admitted", () => {
    const spell = thunderwaveWithFixedSaveDc(
      spellRecord(thunderwaveUnitId),
      "thunderwave_fixed_save_dc",
    );

    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave rejects missing failed-save creature push facts", () => {
    const spell = spellRecord(thunderwaveUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ state, spellId: thunderwaveUnitId });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const invalid = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          ...thunderwaveSavingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
          value: {
            ...thunderwaveSavingThrowOutcomeFill(savingThrow, [
              { targetId: spellTargetId, succeeded: false },
            ]).value,
            area: {
              ...thunderwaveArea([spellTargetId], [spellTargetId]),
              creaturePushes: [],
            },
          },
        },
      ],
    });

    expect(invalid).toMatchObject({
      tag: "invalid",
      message:
        "Thunderwave creature push facts must cover every failed-save target.",
    });
  });
});

describe("SRDINV52 deterministic Dissonant Whispers Spell Unit admission", () => {
  test("dissonant whispers is admitted as single-target Wisdom save damage with forced Reaction movement", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: dissonantWhispersUnitId,
      slotLevel: 2,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        dissonantWhispersUnitId,
        2,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const target = requireHole(act.initialHoles, "targetChoice");
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            target,
            dissonantWhispersUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Dissonant Whispers Saving Throw outcome",
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "wis",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 4, dieSize: 6 },
          damageType: "psychic",
        },
        successDamage: "half",
        rangeFeet: 60,
        failedSavePostDamageRiders: [
          {
            kind: "forcedReactionMovement",
            direction: "awayFromCaster",
            route: "safest",
            distance: "asFarAsPossible",
            cost: "targetReactionIfAvailable",
          },
        ],
      }),
    );
  });

  test("dissonant whispers failed save spends the target Reaction and consumes caller movement", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ state, spellId: dissonantWhispersUnitId });
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      dissonantWhispersUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );
    const movement = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill,
          saveFill,
          damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
        ],
      }),
      "movement",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
        movementFill(movement, {
          movementCostFeet: 30,
          provokedOpportunityAttacks: [],
        }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dissonant Whispers to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(18);
    expect(
      requireCombatant(resolved.state, spellTargetId).reactionAvailable,
    ).toBe(false);
  });

  test("dissonant whispers successful save deals half damage only", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ state, spellId: dissonantWhispersUnitId });
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      dissonantWhispersUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: true },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dissonant Whispers to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(6);
    expect(
      requireCombatant(resolved.state, spellTargetId).reactionAvailable,
    ).toBe(true);
  });

  test("dissonant whispers failed save does not request movement when the target has no Reaction", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const battle = spellBattle({ preparedSpells: [spell] });
    const target = requireCombatant(battle, spellTargetId);
    const state = {
      ...battle,
      combatants: new Map(battle.combatants).set(spellTargetId, {
        ...target,
        reactionAvailable: false,
      }),
    };
    const act = spellAct({ state, spellId: dissonantWhispersUnitId });
    const targetChoice = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetChoice,
      dissonantWhispersUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dissonant Whispers to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellTargetId).reactionAvailable,
    ).toBe(false);
  });

  test("dissonant whispers failed save spends Reaction without movement when the target cannot move", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const battle = spellBattle({
      preparedSpells: [spell],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const state: BattleState = {
      ...battle,
      grapples: [
        {
          grapplerId: spellCasterId,
          targetId: spellTargetId,
          escapeDc: difficultyClass(12),
          reachFeet: movementFeet(5),
          hand: "left",
          targetExemptFromDragCost: false,
        },
      ],
    };
    const act = spellAct({ state, spellId: dissonantWhispersUnitId });
    const targetChoice = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetChoice,
      dissonantWhispersUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dissonant Whispers to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(18);
    expect(
      requireCombatant(resolved.state, spellTargetId).reactionAvailable,
    ).toBe(false);
  });

  test("dissonant whispers movement opens Opportunity Attack eligibility from Reaction movement", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ state, spellId: dissonantWhispersUnitId });
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      dissonantWhispersUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );
    const movement = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill,
          saveFill,
          damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
        ],
      }),
      "movement",
    );

    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
        movementFill(movement, {
          movementCostFeet: 30,
          provokedOpportunityAttacks: [
            { reactorId: spellCasterId, attackName: "Unarmed Strike" },
          ],
        }),
      ],
    });

    const reaction = requireResultHole(result, "reactionDecision");
    expect(reaction.trigger).toBe("opportunityAttack");
  });
});
