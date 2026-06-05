import {
  startBattleRight,
  requireResolved,
  requireHole,
  targetFill,
  attackTargetFill,
  attackRollFill,
  movementFill,
  savingThrowOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  characterSeed,
  wizardSpellcasting,
  slotAttackDamageSpell,
  spellRecord,
  magicSubject,
  oppositionSide,
  fighterId,
  goblinId,
  skeletonId,
  wizardId,
  secondWizardId,
  attackBonus,
  BattleFillSchema,
  BattleHoleSchema,
  battleId,
  Either,
  elapsedTimeTicks,
  endTurn,
  holeId,
  holeInstanceKey,
  movementFeet,
  resolveBattleSubject,
  Schema,
  spellSlotInvocationRef,
} from "./battle-runtime-test-support.ts";
import type {
  BattleState,
  BattleSubject,
  CombatantId,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: spell riders, invocations, and codecs", () => {
  test("spell attack riders use SRD-specific expiration anchors", () => {
    const state = startBattleRight({
      battleId: battleId("battle-spell-rider-anchors"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("shocking_grasp")],
            preparedSpells: [
              spellRecord("guiding_bolt"),
              spellRecord("ray_of_sickness"),
            ],
            spellSlots: [{ spellLevel: 1, count: 3 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });

    const sickTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [],
      }),
      "targetChoice",
    );
    const sickRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [targetFill(sickTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const sickDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(sickTarget, skeletonId),
          attackRollFill(sickRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const sick = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(sickTarget, skeletonId),
          attackRollFill(sickRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(sickDamage, [[1, 1]]),
        ],
      }),
    );
    expect(sick.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ poisoned: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          condition: "poisoned",
          expiresAt: {
            kind: "endOfTurn",
            combatantId: wizardId,
            round: 2,
          },
        }),
      ],
    });
    const afterWizard = endTurn({ state: sick.state, actorId: wizardId });
    const afterFighter =
      afterWizard.tag === "resolved"
        ? endTurn({ state: afterWizard.state, actorId: fighterId })
        : afterWizard;
    const afterSkeleton =
      afterFighter.tag === "resolved"
        ? endTurn({ state: afterFighter.state, actorId: skeletonId })
        : afterFighter;
    const afterNextWizard =
      afterSkeleton.tag === "resolved"
        ? endTurn({ state: afterSkeleton.state, actorId: wizardId })
        : afterSkeleton;
    expect(afterNextWizard).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: fighterId },
          {
            combatantId: skeletonId,
            conditions: expect.not.arrayContaining(["poisoned"]),
          },
        ],
      },
    });

    const graspTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [],
      }),
      "targetChoice",
    );
    const graspRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [targetFill(graspTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const graspDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [
          targetFill(graspTarget, skeletonId),
          attackRollFill(graspRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const grasp = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [
          targetFill(graspTarget, skeletonId),
          attackRollFill(graspRoll, { total: 18, naturalD20: 12 }),
          damageRollFill(graspDamage, 1),
        ],
      }),
    );
    expect(
      grasp.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "opportunityAttackDenied",
        expiresAt: { kind: "startOfTurn", combatantId: skeletonId },
      }),
    );
    const fighterTurn = requireResolved(
      endTurn({ state: grasp.state, actorId: wizardId }),
    ).state;
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const move = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    expect(
      resolveBattleSubject({
        state: fighterTurn,
        subject: moveSubject,
        fills: [
          movementFill(move, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [
              { reactorId: skeletonId, attackName: "Longsword" },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("spell condition riders preserve unrelated pre-existing conditions", () => {
    const poisoned = startBattleRight({
      battleId: battleId("battle-spell-condition-rider-source"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["poisoned"],
        }),
      ],
    });
    const target = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[1, 1]]),
        ],
      }),
    );
    const skeletonTurn = requireResolved(
      endTurn({ state: resolved.state, actorId: wizardId }),
    ).state;
    const nextWizard = endTurn({ state: skeletonTurn, actorId: skeletonId });
    if (nextWizard.tag !== "resolved") {
      throw new Error("Expected turn sequence to resolve.");
    }
    const refreshRoll = requireHole(
      resolveBattleSubject({
        state: nextWizard.state,
        subject: magicSubject("ray_of_sickness"),
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const refreshDamage = requireHole(
      resolveBattleSubject({
        state: nextWizard.state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(refreshRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const refreshed = requireResolved(
      resolveBattleSubject({
        state: nextWizard.state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(refreshRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(refreshDamage, [[1, 1]]),
        ],
      }),
    );
    const nextSkeletonAfterRefresh = requireResolved(
      endTurn({ state: refreshed.state, actorId: wizardId }),
    ).state;
    const nextWizardAfterRefresh = requireResolved(
      endTurn({ state: nextSkeletonAfterRefresh, actorId: skeletonId }),
    ).state;
    const expired = endTurn({
      state: nextWizardAfterRefresh,
      actorId: wizardId,
    });
    expect(expired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["poisoned"]),
          },
        ],
      },
    });
  });

  test("overlapping spell condition riders preserve a pre-existing non-spell condition source", () => {
    const poisoned = startBattleRight({
      battleId: battleId("battle-spell-condition-rider-overlap-source"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["poisoned"],
        }),
      ],
    });

    const castRayOfSickness = (state: BattleState, actorId: CombatantId) => {
      const spatialFacts = [
        {
          kind: "spellTarget" as const,
          casterId: actorId,
          targetId: skeletonId,
          spellId: "ray_of_sickness",
        },
      ];
      const subject: BattleSubject = {
        tag: "actionSpell",
        actorId,
        invocation: spellSlotInvocationRef(
          "ray_of_sickness",
          1,
          "spellAttackDamage",
        ),
        mode: { tag: "cast" },
      };
      const target = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const roll = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill(target, skeletonId, spatialFacts)],
        }),
        "attackRoll",
      );
      const damage = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(target, skeletonId, spatialFacts),
            attackRollFill(roll, { total: 18, naturalD20: 12 }),
          ],
        }),
        "rolledDice",
      );
      return requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(target, skeletonId, spatialFacts),
            attackRollFill(roll, { total: 18, naturalD20: 12 }),
            damageRollFillWithGroups(damage, [[1, 1]]),
          ],
        }),
      ).state;
    };

    const firstSpell = castRayOfSickness(poisoned, wizardId);
    const secondWizardTurn = requireResolved(
      endTurn({ state: firstSpell, actorId: wizardId }),
    ).state;
    const secondSpell = castRayOfSickness(secondWizardTurn, secondWizardId);
    const skeletonTurn = requireResolved(
      endTurn({ state: secondSpell, actorId: secondWizardId }),
    ).state;
    const nextWizardTurn = requireResolved(
      endTurn({ state: skeletonTurn, actorId: skeletonId }),
    ).state;
    const firstSpellExpired = requireResolved(
      endTurn({ state: nextWizardTurn, actorId: wizardId }),
    ).state;
    expect(firstSpellExpired.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ poisoned: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          sourceCombatantId: secondWizardId,
          condition: "poisoned",
        }),
      ],
    });

    const allSpellSourcesExpired = endTurn({
      state: firstSpellExpired,
      actorId: secondWizardId,
    });
    expect(allSpellSourcesExpired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: secondWizardId },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["poisoned"]),
          },
        ],
      },
    });
    expect(
      requireResolved(allSpellSourcesExpired).state.combatants.get(skeletonId)
        ?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        condition: "poisoned",
      }),
    );
  });

  test("one-shot spell attack-roll riders affect only matching attack rolls", () => {
    const state = startBattleRight({
      battleId: battleId("battle-spell-one-shot-riders"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("vicious_mockery")],
            preparedSpells: [spellRecord("guiding_bolt")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const guidingTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [],
      }),
      "targetChoice",
    );
    const guidingRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [targetFill(guidingTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const guidingDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [
          targetFill(guidingTarget, skeletonId),
          attackRollFill(guidingRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const guided = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [
          targetFill(guidingTarget, skeletonId),
          attackRollFill(guidingRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(guidingDamage, [[1, 1, 1, 1]]),
        ],
      }),
    );
    const fighterTurn = endTurn({ state: guided.state, actorId: wizardId });
    if (fighterTurn.tag !== "resolved") {
      throw new Error("Expected Fighter turn after Guiding Bolt.");
    }
    const fighterAttack: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    };
    const fighterTarget = requireHole(
      resolveBattleSubject({
        state: fighterTurn.state,
        subject: fighterAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const fighterRoll = requireHole(
      resolveBattleSubject({
        state: fighterTurn.state,
        subject: fighterAttack,
        fills: [attackTargetFill(fighterTarget, fighterId, skeletonId)],
      }),
      "attackRoll",
    );
    expect(fighterRoll).toMatchObject({ rollMode: "advantage" });
    const consumed = resolveBattleSubject({
      state: fighterTurn.state,
      subject: fighterAttack,
      fills: [
        attackTargetFill(fighterTarget, fighterId, skeletonId),
        attackRollFill(fighterRoll, {
          total: 8,
          naturalD20: 4,
          rollMode: "advantage",
        }),
      ],
    });
    expect(consumed).toMatchObject({ tag: "resolved" });
    expect(
      requireResolved(consumed).state.combatants.get(skeletonId)?.activeEffects,
    ).toEqual([]);

    const mockeryTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [],
      }),
      "targetChoice",
    );
    const save = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [targetFill(mockeryTarget, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    const mockeryDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [
          targetFill(mockeryTarget, skeletonId),
          savingThrowOutcomeFill(save, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    const mocked = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [
          targetFill(mockeryTarget, skeletonId),
          savingThrowOutcomeFill(save, [
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFill(mockeryDamage, 1),
        ],
      }),
    );
    const afterWizard = endTurn({ state: mocked.state, actorId: wizardId });
    const afterFighter =
      afterWizard.tag === "resolved"
        ? endTurn({ state: afterWizard.state, actorId: fighterId })
        : afterWizard;
    if (afterFighter.tag !== "resolved") {
      throw new Error("Expected Skeleton turn after Vicious Mockery.");
    }
    const skeletonAttack: BattleSubject = {
      tag: "action",
      actorId: skeletonId,
      action: "attack",
      attackName: "Longsword",
    };
    const skeletonTarget = requireHole(
      resolveBattleSubject({
        state: afterFighter.state,
        subject: skeletonAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const skeletonRoll = requireHole(
      resolveBattleSubject({
        state: afterFighter.state,
        subject: skeletonAttack,
        fills: [
          attackTargetFill(skeletonTarget, skeletonId, wizardId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    expect(skeletonRoll).toMatchObject({ rollMode: "disadvantage" });
  });

  test("spell damage invocation holes reject contradictory access and resource pairs", () => {
    const spell = slotAttackDamageSpell();
    const baseHole = {
      kind: "rolledDice",
      holeId: holeId("battle:test:invalid-spell-damage"),
      holeInstanceKey: holeInstanceKey("battle:test:invalid-spell-damage"),
      label: "Invalid spell damage",
      critical: false,
      spell: {
        procedure: "spellAttackDamage",
        spell,
        targeting: { kind: "singleCombatant" },
        damage: { expr: { dice: 1, dieSize: 8 }, damageType: "cold" },
        rangeFeet: movementFeet(60),
        attackKind: "ranged_spell_attack",
        attackBonus: attackBonus(5),
        postDamageRiders: [],
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "classCantrip" },
            resource: { tag: "spellSlot", slotLevel: 1 },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "prepared" },
            resource: { tag: "none" },
          },
        }),
      ),
    ).toBe(true);
  });

  test("persistent armor invocation holes reject contradictory Armor of Shadows resource pairs", () => {
    const baseHole = {
      kind: "spellTargetList",
      holeId: holeId("battle:test:invalid-persistent-armor"),
      holeInstanceKey: holeInstanceKey("battle:test:invalid-persistent-armor"),
      label: "Invalid persistent armor target",
      minTargets: 1,
      maxTargets: 1,
      choices: [fighterId],
      requiresTableSpatialFact: true,
      spell: {
        procedure: "persistentArmorEffect",
        spell: { id: "mage_armor" },
        rangeFeet: movementFeet(0),
        activeEffect: { tag: "mageArmor" },
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "prepared" },
            resource: { tag: "none" },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "armorOfShadows" },
            resource: { tag: "spellSlot", slotLevel: 1 },
          },
        }),
      ),
    ).toBe(true);
  });

  test("spell saving throw outcome codec preserves target roll modes", () => {
    const hole = {
      kind: "savingThrowOutcome",
      holeId: holeId("battle:test:charm-person-save"),
      holeInstanceKey: holeInstanceKey("battle:test:charm-person-save"),
      label: "Charm Person Saving Throw outcomes",
      spell: {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: 1 },
        procedure: "saveGatedCondition",
        spell: { id: "charm_person" },
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        targetCreatureTypes: ["humanoid"],
        effect: {
          kind: "fixed",
          condition: "charmed",
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(600),
          },
          escape: { kind: "targetDamagedByCasterOrAlly" },
          turnStartDamage: null,
          repeatSave: null,
        },
        saveRollModeRule: { kind: "hostileTarget", mode: "advantage" },
        rangeFeet: movementFeet(30),
      },
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: [],
      targetRollModes: [{ targetId: goblinId, rollMode: "advantage" }],
      targetFlatBonuses: [],
    };

    const decoded = Schema.decodeUnknownEither(BattleHoleSchema)(hole);

    if (Either.isLeft(decoded)) {
      throw new Error(String(decoded.left));
    }
    expect(decoded.right).toMatchObject({
      kind: "savingThrowOutcome",
      targetRollModes: [{ targetId: goblinId, rollMode: "advantage" }],
    });
  });

  test("spell saving throw outcome codec rejects incomplete Grease area facts", () => {
    const invalidGreaseArea = {
      originAnchorId: wizardId,
      affectedTargetIds: [goblinId],
      kind: "greaseGroundArea",
    };
    const greaseInvocation = {
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: 1 },
      procedure: "greaseGroundHazard",
      spell: { id: "grease" },
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      targeting: { kind: "pointOriginCube", sideFeet: movementFeet(10) },
      durationTicks: elapsedTimeTicks(10),
      rangeFeet: movementFeet(60),
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          kind: "savingThrowOutcome",
          holeId: holeId("battle:test:invalid-grease-area-hole"),
          holeInstanceKey: holeInstanceKey(
            "battle:test:invalid-grease-area-hole",
          ),
          label: "Invalid Grease area facts",
          spell: greaseInvocation,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          areaChoices: [invalidGreaseArea],
          targetRollModes: [],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "savingThrowOutcome",
          holeId: "battle:test:invalid-grease-area-fill",
          value: {
            area: invalidGreaseArea,
            outcomes: [{ targetId: goblinId, succeeded: false }],
          },
        }),
      ),
    ).toBe(true);
  });

  test("Sanctuary interdiction codec admits only Wisdom save holes", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          kind: "sanctuaryInterdictionOutcome",
          holeId: holeId("battle:test:invalid-sanctuary-save"),
          holeInstanceKey: holeInstanceKey(
            "battle:test:invalid-sanctuary-save",
          ),
          label: "Invalid Sanctuary save",
          sourceSpellId: "sanctuary",
          sourceCombatantId: wizardId,
          wardedCombatantId: wizardId,
          triggeringCombatantId: goblinId,
          triggeringTargetEventId: holeId(
            "battle:test:invalid-sanctuary-target-event",
          ),
          ability: "str",
          dc: { kind: "caster_spell_save_dc" },
          choices: [fighterId],
        }),
      ),
    ).toBe(true);
  });

  test("Sanctuary replacement target fills reject malformed spatial facts", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "sanctuaryInterdictionOutcome",
          holeId: holeId("battle:test:invalid-sanctuary-replacement-fact"),
          value: {
            saveSucceeded: false,
            outcome: {
              kind: "newTarget",
              targetId: fighterId,
              spatialFacts: [
                {
                  kind: "notBattleTargetSpatialFact",
                  targetId: fighterId,
                },
              ],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("spell-hosted weapon invocation holes reject non-weapon component attacks", () => {
    const baseHole = {
      kind: "attackRoll",
      holeId: holeId("battle:test:invalid-true-strike-component"),
      holeInstanceKey: holeInstanceKey(
        "battle:test:invalid-true-strike-component",
      ),
      label: "Invalid True Strike component attack",
      attackBonus: attackBonus(3),
      spell: {
        access: { tag: "classCantrip" },
        resource: { tag: "none" },
        procedure: "spellHostedWeaponAttack",
        spell: { id: "true_strike" },
        actionCost: "magicAction",
        componentWeapon: {
          itemId: "main:unarmed",
          attack: {
            kind: "unarmedStrike",
            effect: {
              kind: "damage",
              damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
            },
            attackAbility: "str",
            attackAbilityModifier: 0,
            attackBonus: 2,
            damageAbilityModifier: 0,
          },
        },
        spellcastingAbilityModifier: 3,
        damageTypeChoices: ["radiant", "bludgeoning"],
        bonusDamage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "radiant",
        },
      },
    };

    expect(
      Either.isLeft(Schema.decodeUnknownEither(BattleHoleSchema)(baseHole)),
    ).toBe(true);
  });
});
