// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84A fire_bolt
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84B sorcerous_burst
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV59B starry_wisp
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT22 shield counterspell
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31B hunters_mark
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-marked-damage-rider
import { describe, expect, test } from "vitest";
import {
  counterspellUnitId,
  fireBoltUnitId,
  shieldUnitId,
  sorcerousBurstUnitId,
  spellCasterId,
  spellTargetId,
  starryWispUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  isSelectedSorcerousBurstDamageInvocation,
  maybeSpellAct,
  spellAct,
  spellHoleInvocation,
  spellObjectTargetFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleObjectId,
  cantripSpellInvocationRef,
  classLevel,
  damageAmount,
  decodeUnitRecordSync,
  discoverBattleActs,
  Hp,
  movementFeet,
  objectInvisibleBenefitDenied,
  resolveBattleSubject,
  spellDamageHole,
  spellId,
  starryWispInput,
  validateSpellDamageFill,
} from "./unit-profile-admission-test-support.ts";
import type { SpellMarkedDamageRider } from "./unit-profile-admission-test-support.ts";

describe("QMBT15 Spell Unit admission candidate narrowing", () => {
  test("fire_bolt is admitted as creature-or-object ranged spell attack damage with object ignition projection", () => {
    const spell = spellRecord(fireBoltUnitId);

    expect(spell.mechanics.family).toBe("activation");
    expect(spell.mechanics.level).toBe(0);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({
      state,
      spellId: fireBoltUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        fireBoltUnitId,
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: expect.arrayContaining([spellTargetId]),
      }),
      expect.objectContaining({
        kind: "objectTargetChoice",
        requiresTableSpatialFact: true,
      }),
    ]);
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            fireBoltUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        spell,
        targeting: { kind: "singleCreatureOrObject" },
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 1, dieSize: 10 },
          damageType: "fire",
        },
        rangeFeet: 120,
        postDamageRiders: [],
        objectHitEffect: { kind: "igniteFlammableUnattended" },
      }),
    );
  });

  test("starry_wisp is admitted as creature-or-object ranged spell attack damage with Dim Light emitted on hit", () => {
    const unit = decodeUnitRecordSync(starryWispInput);

    expect(unit.kind).toBe("spell");
    if (unit.kind !== "spell") return;

    const spell = unit;
    expect(spell.id).toBe(starryWispUnitId);
    expect(spell.mechanics.family).toBe("activation");
    expect(spell.mechanics.level).toBe(0);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({
      state,
      spellId: spell.id,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        starryWispUnitId,
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: expect.arrayContaining([spellTargetId]),
      }),
      expect.objectContaining({
        kind: "objectTargetChoice",
        requiresTableSpatialFact: true,
      }),
    ]);
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            starryWispUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        spell,
        targeting: { kind: "singleCreatureOrObject" },
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 1, dieSize: 8 },
          damageType: "radiant",
        },
        rangeFeet: 60,
        postDamageRiders: [
          {
            kind: "lightEmission",
            emission: { kind: "dim", radiusFeet: movementFeet(10) },
            expiresAt: "endOfCasterNextTurn",
          },
          {
            kind: "invisibleBenefitDenied",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    );
  });

  test("sorcerous_burst is admitted with damage-type choice, capped exploding d8 damage, object target, and cantrip scaling", () => {
    const spell = spellRecord(sorcerousBurstUnitId);
    const state = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "sorcerer", level: classLevel(5) }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ state, spellId: sorcerousBurstUnitId });
    const readiedSorcerousBurstActs = discoverBattleActs(state).filter(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === sorcerousBurstUnitId &&
        candidate.subject.mode.tag === "ready",
    );
    expect(readiedSorcerousBurstActs).toEqual([]);
    const damageType = requireHole(act.initialHoles, "damageTypeChoice");
    const target = requireHole(act.initialHoles, "targetChoice");

    expect(damageType.choices).toEqual([
      "acid",
      "cold",
      "fire",
      "lightning",
      "poison",
      "psychic",
      "thunder",
    ]);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({ kind: "damageTypeChoice" }),
      expect.objectContaining({
        kind: "targetChoice",
        choices: expect.arrayContaining([spellTargetId]),
      }),
      expect.objectContaining({ kind: "objectTargetChoice" }),
    ]);

    const damageTypeFill = {
      kind: "damageTypeChoice" as const,
      holeId: damageType.holeId,
      value: "thunder" as const,
    };
    const targetFill = spellTargetFill(
      target,
      sorcerousBurstUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attack = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageTypeFill, targetFill],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          damageTypeFill,
          targetFill,
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(spellHoleInvocation([damage])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        spell,
        targeting: { kind: "singleCreatureOrObject" },
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "selectedSorcerousBurstDamage",
          expr: { dice: 2, dieSize: 8 },
          damageType: "thunder",
          maxDieAdditionalDiceLimit: 3,
        },
        rangeFeet: 120,
      }),
    );
    expect(damage).toMatchObject({
      label: "Sorcerous Burst damage (2d8-thunder)",
    });
    const selectedSorcerousBurstInvocation = spellHoleInvocation([damage]);
    if (
      !isSelectedSorcerousBurstDamageInvocation(
        selectedSorcerousBurstInvocation,
      )
    ) {
      throw new Error("Expected selected Sorcerous Burst spell attack damage.");
    }
    const markedDamageRider = {
      kind: "spellMarkedDamageRider" as const,
      sourceSpellId: spellId("hunters_mark"),
      sourceCombatantId: spellCasterId,
      targetCombatantId: spellTargetId,
      transfer: {
        kind: "awaitingTargetDrop",
        retargetTiming: "sameTurn",
      },
      abilityCheckBehavior: { kind: "none" },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" as const },
      expiresAt: { kind: "concentration" as const, combatantId: spellCasterId },
    } satisfies SpellMarkedDamageRider;
    expect(
      validateSpellDamageFill(
        damageRollFillWithGroups(
          spellDamageHole(selectedSorcerousBurstInvocation, false, [
            markedDamageRider,
          ]),
          [[8, 3, 4], [2]],
        ),
        selectedSorcerousBurstInvocation,
        false,
        [markedDamageRider],
      ),
    ).toBeNull();
    expect(
      validateSpellDamageFill(
        damageRollFillWithGroups(
          spellDamageHole(selectedSorcerousBurstInvocation, false, [
            markedDamageRider,
          ]),
          [[8, 3, 4], [2]],
          undefined,
          undefined,
          undefined,
          {
            unitId: "synthetic_attack_damage_ability_modifier_choice_unit",
            selection: "apply",
          },
        ),
        selectedSorcerousBurstInvocation,
        false,
        [markedDamageRider],
      ),
    ).toBe(
      "Attack damage ability modifier choices are not available for this damage-roll owner.",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        targetFill,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[8, 8, 5, 4]]),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({ combatantId: spellTargetId, hp: Hp(5) }),
        ],
      },
    });

    const invalidExplodingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        targetFill,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[8, 7, 5, 4]]),
      ],
    });
    expect(invalidExplodingDamage).toMatchObject({
      tag: "invalid",
      message:
        "filled additional max-die damage dice require a rolled maximum on a prior spell damage die.",
    });

    const invalidSelfAuthorizingExplodingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        targetFill,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[1, 2, 8]]),
      ],
    });
    expect(invalidSelfAuthorizingExplodingDamage).toMatchObject({
      tag: "invalid",
      message:
        "filled additional max-die damage dice require a rolled maximum on a prior spell damage die.",
    });
  });

  test("sorcerous_burst applies object poison and psychic immunity to caller-supplied object damage facts", () => {
    const spell = spellRecord(sorcerousBurstUnitId);
    const state = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "sorcerer", level: classLevel(5) }],
    });
    const act = spellAct({ state, spellId: sorcerousBurstUnitId });
    const damageType = requireHole(act.initialHoles, "damageTypeChoice");
    const immuneDamageTypes = ["poison", "psychic"] as const;

    for (const immuneDamageType of immuneDamageTypes) {
      const objectId = battleObjectId(
        `unit-profile-sorcerous-burst-${immuneDamageType}-object`,
      );
      const damageTypeFill = {
        kind: "damageTypeChoice" as const,
        holeId: damageType.holeId,
        value: immuneDamageType,
      };
      const objectFill = spellObjectTargetFill({
        hole: requireHole(act.initialHoles, "objectTargetChoice"),
        objectId,
        spellId: sorcerousBurstUnitId,
        casterId: spellCasterId,
        rangeFeet: movementFeet(120),
        damageDisposition: { kind: "hitPoints", hitPoints: Hp(10) },
      });
      const attack = requireResultHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [damageTypeFill, objectFill],
        }),
        "attackRoll",
      );
      const damage = requireResultHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            damageTypeFill,
            objectFill,
            attackRollFill(attack, { total: 18, naturalD20: 12 }),
          ],
        }),
        "rolledDice",
      );

      const resolved = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          damageTypeFill,
          objectFill,
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[8, 4, 3]]),
        ],
      });

      expect(resolved).toMatchObject({
        tag: "resolved",
        objectDamages: [
          {
            kind: "hitPoints",
            objectId,
            damageType: immuneDamageType,
            rolledDamage: damageAmount(15),
            effectiveDamage: damageAmount(0),
            priorHitPoints: Hp(10),
            nextHitPoints: Hp(10),
            destroyed: false,
          },
        ],
      });
    }
  });

  test("starry_wisp object hit projects Invisible-benefit denial from the object Dim Light emitter", () => {
    const spell = decodeUnitRecordSync(starryWispInput);
    if (spell.kind !== "spell") return;

    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({ state, spellId: spell.id });
    const objectId = battleObjectId("unit-profile-starry-wisp-object");
    const objectFill = spellObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId,
      spellId: starryWispUnitId,
      casterId: spellCasterId,
      damageDisposition: { kind: "tableResolved" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          objectFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Starry Wisp object hit to resolve.");
    }

    expect(objectInvisibleBenefitDenied(resolved.state, objectId)).toBe(true);
    expect(resolved.state.objectOutlines).toEqual([]);
    expect(resolved.state.lightEmitters).toEqual([
      expect.objectContaining({
        kind: "objectInvisibleRevealLightEmitter",
        sourceSpellId: starryWispUnitId,
        sourceCombatantId: spellCasterId,
        objectId,
        emission: { kind: "dim", radiusFeet: movementFeet(10) },
      }),
    ]);

    const afterCasterTurn = resolveBattleSubject({
      state: resolved.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn to resolve.");
    }
    const afterTargetTurn = resolveBattleSubject({
      state: afterCasterTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterTargetTurn.tag !== "resolved") {
      throw new Error("Expected target end turn to resolve.");
    }
    const afterCasterNextTurn = resolveBattleSubject({
      state: afterTargetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterCasterNextTurn.tag !== "resolved") {
      throw new Error("Expected caster next end turn to resolve.");
    }

    expect(objectInvisibleBenefitDenied(afterCasterTurn.state, objectId)).toBe(
      true,
    );
    expect(objectInvisibleBenefitDenied(afterTargetTurn.state, objectId)).toBe(
      true,
    );
    expect(
      objectInvisibleBenefitDenied(afterCasterNextTurn.state, objectId),
    ).toBe(false);
    expect(afterCasterNextTurn.state.lightEmitters).toEqual([]);
    expect(afterCasterNextTurn.state.objectOutlines).toEqual([]);
  });

  test("shield is admitted through catalog Spell Access and projected as a triggered Reaction spell", () => {
    const spell = spellRecord(shieldUnitId);

    expect(spell.mechanics.family).toBe("triggered_reaction");
    expect(spell.mechanics.castingTime.kind).toBe("reaction");
    expect(spell.mechanics.level).toBe(1);
    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: shieldUnitId,
      }),
    ).toBeUndefined();
  });

  test("counterspell is admitted through catalog Spell Access and projected as a triggered Reaction spell", () => {
    const spell = spellRecord(counterspellUnitId);

    expect(spell.mechanics.family).toBe("triggered_reaction");
    if (spell.mechanics.family !== "triggered_reaction") {
      throw new Error(
        "Expected Counterspell to be a triggered Reaction spell.",
      );
    }
    const mechanics = spell.mechanics;
    expect(mechanics.castingTime).toMatchObject({
      kind: "reaction",
      trigger: { kind: "creature_casts_spell", components: ["V", "S", "M"] },
    });
    expect(mechanics.level).toBe(3);
    expect(mechanics.components).toEqual({ v: false, s: true, m: false });
    expect(mechanics.interruptsTrigger).toBe(true);
    expect(mechanics.phases).toEqual([
      expect.objectContaining({
        kind: "save_gate",
        ability: "con",
        onFail: { kind: "negate_triggering_spell" },
        onSuccess: { kind: "none" },
        autoSuccessIfCasterSlotGte: "triggering_spell_level",
      }),
    ]);
    expect(
      maybeSpellAct({
        state: spellBattle({
          preparedSpells: [spell],
          spellSlots: [{ spellLevel: 3, count: 1 }],
        }),
        spellId: counterspellUnitId,
      }),
    ).toBeUndefined();
  });
});
