// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30C animal_friendship
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV37 charm_person
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.creature-type-protection-and-charm
import { describe, expect, test } from "vitest";
import {
  animalFriendshipUnitId,
  applyPreparedSlotSpellDamage,
  charmPersonUnitId,
  combatantId,
  damageRollFillWithGroups,
  elapsedTimeTicks,
  endTurn,
  oppositionSide,
  partySide,
  requireCombatant,
  requireHole,
  requireResultHole,
  resolveBattleSubject,
  resolveWeaponAttack,
  resolvedAnimalFriendshipState,
  sacredFlameUnitId,
  savingThrowOutcomeFill,
  spellAct,
  spellBattle,
  spellCasterId,
  spellRecord,
  spellTargetFill,
  spellTargetId,
  spellTargetListFill,
  statBlockWithCreatureType,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-test-support.ts";

describe("SRDINV30C deterministic creature charm Spell Unit admission", () => {
  test("animal friendship only admits Beast targets and applies Charmed on a failed Wisdom save", () => {
    const spell = spellRecord(animalFriendshipUnitId);
    const beastId = combatantId("unit-profile-animal-friendship-beast");
    const humanoidId = combatantId("unit-profile-animal-friendship-humanoid");
    const state = spellBattle({
      preparedSpells: [spell],
      statBlockTargets: [
        {
          combatantId: beastId,
          statBlock: statBlockWithCreatureType("beast"),
          initiative: 9,
        },
        {
          combatantId: humanoidId,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 8,
        },
      ],
    });
    const act = spellAct({ state, spellId: animalFriendshipUnitId });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");

    expect(targetHole.choices).toContain(beastId);
    expect(targetHole.choices).not.toContain(humanoidId);
    expect(targetHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 1 }),
    );

    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      animalFriendshipUnitId,
      [beastId],
    );
    const awaitingSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    const saveHole = requireResultHole(awaitingSave, "savingThrowOutcome");

    expect(saveHole).toMatchObject({ ability: "wis" });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: beastId, succeeded: false },
        ]),
      ],
    });

    if (resolved.tag !== "resolved") {
      throw new Error(
        resolved.tag === "invalid"
          ? `Expected Animal Friendship to resolve: ${resolved.message}`
          : "Expected Animal Friendship to resolve.",
      );
    }
    expect(resolved).toMatchObject({ tag: "resolved" });
    expect(
      resolved.state.combatants.get(beastId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        sourceSpellId: animalFriendshipUnitId,
        sourceCombatantId: spellCasterId,
        condition: "charmed",
        expiresAt: expect.objectContaining({ kind: "duration" }),
      }),
    );
    expect(resolved.state.combatants.get(beastId)?.conditions).toEqual(
      expect.objectContaining({ charmed: true }),
    );
  });
  test("animal friendship scales target count by slot level", () => {
    const spell = spellRecord(animalFriendshipUnitId);
    const firstBeastId = combatantId("unit-profile-animal-friendship-beast-1");
    const secondBeastId = combatantId("unit-profile-animal-friendship-beast-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      statBlockTargets: [
        {
          combatantId: firstBeastId,
          statBlock: statBlockWithCreatureType("beast"),
          initiative: 9,
        },
        {
          combatantId: secondBeastId,
          statBlock: statBlockWithCreatureType("beast"),
          initiative: 8,
        },
      ],
    });
    const act = spellAct({
      state,
      spellId: animalFriendshipUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");

    expect(targetHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 2 }),
    );
    expect(targetHole.choices).toEqual(
      expect.arrayContaining([firstBeastId, secondBeastId]),
    );
  });
  test("animal friendship ends when the caster damages the target with a spell", () => {
    const animalFriendship = spellRecord(animalFriendshipUnitId);
    const sacredFlame = spellRecord(sacredFlameUnitId);
    const beastId = combatantId("unit-profile-animal-friendship-spell-damage");
    const state = spellBattle({
      preparedSpells: [animalFriendship],
      cantrips: [sacredFlame],
      statBlockTargets: [
        {
          combatantId: beastId,
          statBlock: statBlockWithCreatureType("beast"),
          initiative: 9,
        },
      ],
    });
    const act = spellAct({ state, spellId: animalFriendshipUnitId });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      animalFriendshipUnitId,
      [beastId],
    );
    const saveHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const charmed = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: beastId, succeeded: false },
        ]),
      ],
    });
    if (charmed.tag !== "resolved") {
      throw new Error("Expected Animal Friendship to resolve.");
    }
    const defaultTargetTurn = endTurn({
      state: charmed.state,
      actorId: spellCasterId,
    });
    if (defaultTargetTurn.tag !== "resolved") {
      throw new Error("Expected Animal Friendship caster turn to end.");
    }
    const beastTurn = endTurn({
      state: defaultTargetTurn.state,
      actorId: spellTargetId,
    });
    if (beastTurn.tag !== "resolved") {
      throw new Error("Expected default target turn to end.");
    }
    const casterTurn = endTurn({
      state: beastTurn.state,
      actorId: beastId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected beast target turn to end.");
    }

    const damageAct = spellAct({
      state: casterTurn.state,
      spellId: sacredFlameUnitId,
    });
    const damageTarget = requireHole(damageAct.initialHoles, "targetChoice");
    const damageTargetFill = spellTargetFill(
      damageTarget,
      sacredFlameUnitId,
      spellCasterId,
      beastId,
    );
    const damageSave = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: damageAct.subject,
        fills: [damageTargetFill],
      }),
      "savingThrowOutcome",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: damageAct.subject,
        fills: [
          damageTargetFill,
          savingThrowOutcomeFill(damageSave, [
            { targetId: beastId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    const damaged = resolveBattleSubject({
      state: casterTurn.state,
      subject: damageAct.subject,
      fills: [
        damageTargetFill,
        savingThrowOutcomeFill(damageSave, [
          { targetId: beastId, succeeded: false },
        ]),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });
    expect(damaged).toMatchObject({ tag: "resolved" });
    if (damaged.tag !== "resolved") {
      throw new Error("Expected Sacred Flame damage to resolve.");
    }
    expect(damaged.state.combatants.get(beastId)).toMatchObject({
      conditions: expect.not.objectContaining({ charmed: true }),
      activeEffects: expect.not.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          sourceSpellId: animalFriendshipUnitId,
        }),
      ]),
    });
  });
  test("animal friendship ends when a caster ally damages the target", () => {
    const allyId = combatantId("unit-profile-animal-friendship-ally");
    const beastId = combatantId("unit-profile-animal-friendship-ally-damaged");
    const charmed = resolvedAnimalFriendshipState(beastId, [
      {
        combatantId: allyId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 8,
        side: partySide,
      },
    ]);

    const damaged = applyPreparedSlotSpellDamage(charmed, beastId, 4, {
      damageSourceId: allyId,
    });

    expect(damaged.combatants.get(beastId)).toMatchObject({
      conditions: expect.not.objectContaining({ charmed: true }),
      activeEffects: expect.not.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          sourceSpellId: animalFriendshipUnitId,
        }),
      ]),
    });
  });
  test("animal friendship ignores damage from combatants outside the caster's side", () => {
    const enemyId = combatantId("unit-profile-animal-friendship-enemy-damager");
    const beastId = combatantId("unit-profile-animal-friendship-enemy-damaged");
    const charmed = resolvedAnimalFriendshipState(beastId, [
      {
        combatantId: enemyId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 8,
        side: oppositionSide,
      },
    ]);

    const damaged = applyPreparedSlotSpellDamage(charmed, beastId, 4, {
      damageSourceId: enemyId,
    });

    expect(damaged.combatants.get(beastId)).toMatchObject({
      conditions: expect.objectContaining({ charmed: true }),
      activeEffects: expect.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          sourceSpellId: animalFriendshipUnitId,
          escape: { kind: "targetDamagedByCasterOrAlly" },
        }),
      ]),
    });
  });
  test("animal friendship stores the caster source and damage-break rule without ally lists", () => {
    const beastId = combatantId("unit-profile-animal-friendship-source-shape");
    const charmed = resolvedAnimalFriendshipState(beastId, []);
    const effect = requireCombatant(charmed, beastId).activeEffects.find(
      (candidate) =>
        candidate.kind === "spellCondition" &&
        candidate.sourceSpellId === animalFriendshipUnitId,
    );

    expect(effect).toMatchObject({
      kind: "spellCondition",
      sourceCombatantId: spellCasterId,
      escape: { kind: "targetDamagedByCasterOrAlly" },
    });
    expect(effect).not.toEqual(
      expect.objectContaining({ allyIds: expect.anything() }),
    );
  });
  test("charm person only admits Humanoid targets and gives hostile targets Advantage on the Wisdom save", () => {
    const spell = spellRecord(charmPersonUnitId);
    const beastId = combatantId("unit-profile-charm-person-beast");
    const humanoidId = combatantId("unit-profile-charm-person-humanoid");
    const friendlyHumanoidId = combatantId(
      "unit-profile-charm-person-friendly-humanoid",
    );
    const state = spellBattle({
      preparedSpells: [spell],
      statBlockTargets: [
        {
          combatantId: beastId,
          statBlock: statBlockWithCreatureType("beast"),
          initiative: 9,
        },
        {
          combatantId: humanoidId,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 8,
        },
        {
          combatantId: friendlyHumanoidId,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 7,
          side: partySide,
        },
      ],
    });
    const act = spellAct({ state, spellId: charmPersonUnitId });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");

    expect(targetHole.choices).toEqual(
      expect.arrayContaining([spellTargetId, humanoidId, friendlyHumanoidId]),
    );
    expect(targetHole.choices).not.toContain(beastId);
    expect(targetHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 1 }),
    );

    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      charmPersonUnitId,
      [spellTargetId],
    );
    const saveHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );

    expect(saveHole).toMatchObject({
      ability: "wis",
      targetRollModes: expect.arrayContaining([
        { targetId: spellTargetId, rollMode: "advantage" },
        { targetId: humanoidId, rollMode: "advantage" },
      ]),
    });
    expect(saveHole.targetRollModes).not.toContainEqual({
      targetId: friendlyHumanoidId,
      rollMode: "advantage",
    });
  });
  test("charm person applies one-hour spell-owned Charmed and ends when the caster damages the target", () => {
    const spell = spellRecord(charmPersonUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const act = spellAct({ state, spellId: charmPersonUnitId });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      charmPersonUnitId,
      [spellTargetId],
    );
    const saveHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Charm Person to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellTargetId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        sourceSpellId: charmPersonUnitId,
        sourceCombatantId: spellCasterId,
        condition: "charmed",
        escape: { kind: "targetDamagedByCasterOrAlly" },
        expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(600) },
      }),
    );
    expect(resolved.state.combatants.get(spellTargetId)?.conditions).toEqual(
      expect.objectContaining({ charmed: true }),
    );

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
      throw new Error("Expected Charm Person caster end turn to resolve.");
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
      throw new Error("Expected Charm Person target end turn to resolve.");
    }

    const damaged = resolveWeaponAttack(afterTargetTurn.state, "Longsword");
    expect(damaged).toMatchObject({ tag: "resolved" });
    if (damaged.tag !== "resolved") {
      throw new Error("Expected caster weapon attack to resolve.");
    }
    expect(damaged.state.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ charmed: true }),
      activeEffects: expect.not.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          sourceSpellId: charmPersonUnitId,
        }),
      ]),
    });
  });
  test("charm person ends when the caster damages the target with a spell", () => {
    const charmPerson = spellRecord(charmPersonUnitId);
    const sacredFlame = spellRecord(sacredFlameUnitId);
    const state = spellBattle({
      preparedSpells: [charmPerson],
      cantrips: [sacredFlame],
    });
    const act = spellAct({ state, spellId: charmPersonUnitId });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      charmPersonUnitId,
      [spellTargetId],
    );
    const saveHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const charmed = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (charmed.tag !== "resolved") {
      throw new Error("Expected Charm Person to resolve.");
    }
    const afterCasterTurn = resolveBattleSubject({
      state: charmed.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterCasterTurn.tag !== "resolved") {
      throw new Error("Expected Charm Person caster end turn to resolve.");
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
      throw new Error("Expected Charm Person target end turn to resolve.");
    }

    const damageAct = spellAct({
      state: afterTargetTurn.state,
      spellId: sacredFlameUnitId,
    });
    const damageTarget = requireHole(damageAct.initialHoles, "targetChoice");
    const damageTargetFill = spellTargetFill(
      damageTarget,
      sacredFlameUnitId,
      spellCasterId,
      spellTargetId,
    );
    const damageSave = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
        subject: damageAct.subject,
        fills: [damageTargetFill],
      }),
      "savingThrowOutcome",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
        subject: damageAct.subject,
        fills: [
          damageTargetFill,
          savingThrowOutcomeFill(damageSave, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    const damaged = resolveBattleSubject({
      state: afterTargetTurn.state,
      subject: damageAct.subject,
      fills: [
        damageTargetFill,
        savingThrowOutcomeFill(damageSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });
    expect(damaged).toMatchObject({ tag: "resolved" });
    if (damaged.tag !== "resolved") {
      throw new Error("Expected Sacred Flame damage to resolve.");
    }
    expect(damaged.state.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ charmed: true }),
      activeEffects: expect.not.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          sourceSpellId: charmPersonUnitId,
        }),
      ]),
    });
  });
  test("charm person scales target count by slot level", () => {
    const spell = spellRecord(charmPersonUnitId);
    const secondHumanoidId = combatantId(
      "unit-profile-charm-person-humanoid-2",
    );
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      statBlockTargets: [
        {
          combatantId: secondHumanoidId,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 9,
        },
      ],
    });
    const act = spellAct({
      state,
      spellId: charmPersonUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");

    expect(targetHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 2 }),
    );
    expect(targetHole.choices).toEqual(
      expect.arrayContaining([spellTargetId, secondHumanoidId]),
    );
  });
});
