import { describe, expect, test } from "vitest";
import { Either, Schema } from "effect";
import * as ParseResult from "effect/ParseResult";
import { damageAmount, difficultyClass, Hp, Round } from "@dnd/shared/types";
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollFill,
  battleProcedureExecutionRefForTest,
  damageRollFill,
  discoverBattleActCandidates,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinAttackSubject,
  goblinId,
  goblinTurnBattle,
  longswordWeaponMasterySelections,
  requireHole,
  requireNeedsHoles,
  requireResolved,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import { battleObjectId } from "./identity.ts";
import type { BattleFill } from "./battle-state-execution.ts";
import {
  BattleFillSchema,
  BattleHoleSchema,
  BattleObjectDamageOutcomeSchema,
} from "./index.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";
import { attackTargetHole } from "./battle-reducer/hole-helpers.ts";
import {
  objectDamageComponentsFromMap,
  objectDamageOutcomeFromComponents,
} from "./battle-reducer/object-damage.ts";

describe("battle runtime: ordinary object attacks", () => {
  test("damage-map adaptation preserves only actual components and reports emptiness", () => {
    expect(objectDamageComponentsFromMap(new Map([["slashing", 7]]))).toEqual({
      tag: "components",
      components: [{ damageType: "slashing", amount: 7 }],
    });
    expect(objectDamageComponentsFromMap(new Map())).toEqual({
      tag: "emptyDamageByType",
    });
  });

  test("discovers a supported Attack action when the roster has no creature target", () => {
    const base = fighterVsGoblinBattle();
    const state = {
      ...base,
      combatants: new Map([[fighterId, base.combatants.get(fighterId)!]]),
    };

    const attack = discoverBattleActCandidates(state).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.initialHoles.some(
          (hole) =>
            hole.kind === "targetChoice" &&
            hole.attack?.acceptsObjectTarget === true,
        ),
    );

    expect(attack).toBeDefined();
  });

  test("plain attack target holes do not advertise object support to adjacent procedures", () => {
    const state = fighterVsGoblinBattle();
    const weapon = attackActionOptionsForActor(state, fighterId).find(
      (attack) => attack.kind === "weapon",
    );
    if (weapon === undefined) throw new Error("Expected weapon attack option.");

    expect(
      attackTargetHole(state, fighterId, weapon).attack?.acceptsObjectTarget,
    ).toBeUndefined();
  });

  test("does not advertise object support when a character attack has an unsupported mastery rider", () => {
    const state = fighterVsGoblinBattle({
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );

    expect(targetHole.attack?.acceptsObjectTarget).toBeUndefined();
  });

  test("weapon attacks use table object facts, preserve roll-before-damage ordering, and emit HP outcomes", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    expect(targetHole.attack?.acceptsObjectTarget).toBe(true);

    const objectId = battleObjectId("synthetic_beacon");
    const targetFill = {
      kind: "objectTargetChoice",
      holeId: targetHole.holeId,
      value: objectId,
      spatialFacts: [
        {
          kind: "attackObjectTarget",
          actorId: fighterId,
          objectId,
          range: { kind: "meleeReach" },
          attackerCanSeeObject: true,
          cover: "none",
          armorClass: armorClass(15),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
        },
      ],
    } as const satisfies BattleFill;
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const hitFill = attackRollFill(rollHole, {
      total: 18,
      naturalD20: 13,
    });
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, hitFill],
      }),
      "rolledDice",
    );
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, hitFill, damageRollFill(damageHole, 4)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          components: [{ damageType: "slashing", rolledDamage: 7 }],
          rolledDamage: 7,
          damageAfterImmunities: 7,
          effectiveDamage: 7,
          priorHitPoints: 30,
          nextHitPoints: 23,
          destroyed: false,
        },
      ],
      snapshot: { turn: { actionResources: [] } },
    });
  });

  test("rejects contradictory object target, roll, and damage protocol facts", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const objectId = battleObjectId("synthetic_protocol_target");
    const baseFact = {
      kind: "attackObjectTarget" as const,
      actorId: fighterId,
      objectId,
      range: { kind: "meleeReach" as const },
      attackerCanSeeObject: true,
      cover: "none" as const,
      armorClass: armorClass(15),
      damageDisposition: { kind: "hitPoints" as const, hitPoints: Hp(30) },
    };
    const targetFill = {
      kind: "objectTargetChoice",
      holeId: targetHole.holeId,
      value: objectId,
      spatialFacts: [baseFact],
    } as const satisfies BattleFill;

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [{ ...targetFill, spatialFacts: [] }],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining(
        "exactly one object attack table fact is required",
      ),
    });

    const contradictoryFact = {
      ...baseFact,
      actorId: goblinId,
      objectId: battleObjectId("synthetic_other_target"),
      range: {
        kind: "rangedRange" as const,
        band: "normal" as const,
        enemyWithin5FeetCanSeeAttacker: false,
      },
      cover: "total" as const,
    };
    const contradictoryTarget = resolveBattleSubject({
      state,
      subject,
      fills: [{ ...targetFill, spatialFacts: [contradictoryFact] }],
    });
    expect(contradictoryTarget).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining(
        "the table fact actor does not match the attacker",
      ),
    });
    expect(contradictoryTarget).toMatchObject({
      message: expect.stringContaining(
        "the table fact object does not match the selected object",
      ),
    });
    expect(contradictoryTarget).toMatchObject({
      message: expect.stringContaining("Total Cover prevents direct targeting"),
    });
    expect(contradictoryTarget).toMatchObject({
      message: expect.stringContaining(
        "the table range fact does not satisfy the selected attack",
      ),
    });

    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const hitFill = attackRollFill(rollHole, {
      total: 18,
      naturalD20: 13,
    });
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, hitFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFill(damageHole, 4);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, damageFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Attack roll must be filled before attack damage.",
    });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill,
          attackRollFill(rollHole, {
            total: 18,
            naturalD20: 13,
            activatedOngoingFeatureProcedureRef:
              battleProcedureExecutionRefForTest("forged-object-roll-feature"),
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Object attack roll does not match the ordinary attack-roll protocol.",
    });

    const fighter = state.combatants.get(fighterId);
    if (fighter === undefined) {
      throw new Error("Expected the fighter object-attack fixture.");
    }
    const disadvantagedState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...fighter,
        activeEffects: [
          ...fighter.activeEffects,
          {
            kind: "nextAttackRollBySelf" as const,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "object-roll-mode-validation",
            ),
            sourceCombatantId: goblinId,
            mode: "disadvantage" as const,
            expiresAt: {
              kind: "endOfTurn" as const,
              combatantId: fighterId,
              round: Round(1),
            },
          },
        ],
      }),
    };
    const disadvantagedTargetHole = requireHole(
      resolveBattleSubject({ state: disadvantagedState, subject, fills: [] }),
      "targetChoice",
    );
    const disadvantagedTargetFill = {
      ...targetFill,
      holeId: disadvantagedTargetHole.holeId,
    };
    const disadvantagedRollHole = requireHole(
      resolveBattleSubject({
        state: disadvantagedState,
        subject,
        fills: [disadvantagedTargetFill],
      }),
      "attackRoll",
    );
    expect(
      resolveBattleSubject({
        state: disadvantagedState,
        subject,
        fills: [
          disadvantagedTargetFill,
          attackRollFill(disadvantagedRollHole, {
            total: 18,
            naturalD20: 13,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Attack roll mode does not match the current object attack rule.",
    });

    const missFill = attackRollFill(rollHole, {
      total: 8,
      naturalD20: 3,
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, missFill, damageFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Attack damage can only be filled after a hit.",
    });
  });

  test("a staged object attack preserves its admitted one-shot roll mode until damage is supplied", () => {
    const base = fighterVsGoblinBattle();
    const fighter = base.combatants.get(fighterId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(fighterId, {
        ...fighter,
        activeEffects: [
          ...fighter.activeEffects,
          {
            kind: "nextAttackRollBySelf" as const,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "staged-object-attack",
            ),
            sourceCombatantId: goblinId,
            mode: "disadvantage" as const,
            expiresAt: {
              kind: "endOfTurn" as const,
              combatantId: fighterId,
              round: Round(1),
            },
          },
        ],
      }),
    };
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const objectId = battleObjectId("synthetic_staged_target");
    const targetFill = {
      kind: "objectTargetChoice",
      holeId: targetHole.holeId,
      value: objectId,
      spatialFacts: [
        {
          kind: "attackObjectTarget",
          actorId: fighterId,
          objectId,
          range: { kind: "meleeReach" },
          attackerCanSeeObject: true,
          cover: "none",
          armorClass: armorClass(15),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
        },
      ],
    } as const satisfies BattleFill;
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    expect(rollHole.rollMode).toBe("disadvantage");
    const rollFill = attackRollFill(rollHole, {
      total: 18,
      naturalD20: 13,
      rollMode: "disadvantage",
    });
    const damageStage = requireNeedsHoles(
      resolveBattleSubject({ state, subject, fills: [targetFill, rollFill] }),
    );
    expect(
      damageStage.state.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "nextAttackRollBySelf",
        ),
    ).toBe(false);
    const damageHole = requireHole(damageStage, "rolledDice");
    const completed = requireResolved(
      resolveBattleSubject({
        state: damageStage.state,
        subject: damageStage.subject,
        fills: [targetFill, rollFill, damageRollFill(damageHole, 4)],
      }),
    );

    expect(
      completed.state.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "nextAttackRollBySelf",
        ),
    ).toBe(false);
  });

  test("object target holes and fills round-trip through strict public codecs", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const encodedHole = Schema.encodeSync(BattleHoleSchema)(targetHole);
    expect(Schema.decodeUnknownSync(BattleHoleSchema)(encodedHole)).toEqual(
      targetHole,
    );
    expect(targetHole.attack).toMatchObject({
      targetConstraint: { kind: "meleeReach" },
      acceptsObjectTarget: true,
    });

    const objectId = battleObjectId("synthetic_codec_target");
    const fill = {
      kind: "objectTargetChoice",
      holeId: targetHole.holeId,
      value: objectId,
      spatialFacts: [
        {
          kind: "attackObjectTarget",
          actorId: fighterId,
          objectId,
          range: { kind: "meleeReach" },
          attackerCanSeeObject: true,
          cover: "half",
          armorClass: armorClass(15),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
        },
      ],
    } as const satisfies BattleFill;
    const encodedFill = Schema.encodeSync(BattleFillSchema)(fill);
    expect(Schema.decodeUnknownSync(BattleFillSchema)(encodedFill)).toEqual(
      fill,
    );

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...targetHole,
          attack: { ...targetHole.attack, acceptsObjectTarget: false },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...targetHole,
          attack: { ...targetHole.attack, targetConstraint: "meleeReach" },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          ...fill,
          spatialFacts: [{ ...fill.spatialFacts[0], kind: "attackObject" }],
        }),
      ),
    ).toBe(true);
  });

  test("total cover rejects direct object targeting before spending the action", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const objectId = battleObjectId("synthetic_beacon");
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        {
          kind: "objectTargetChoice",
          holeId: targetHole.holeId,
          value: objectId,
          spatialFacts: [
            {
              kind: "attackObjectTarget",
              actorId: fighterId,
              objectId,
              range: { kind: "meleeReach" },
              attackerCanSeeObject: true,
              cover: "total",
              armorClass: armorClass(15),
              damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
            },
          ],
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: { turn: { actionResources: [{ source: "turn" }] } },
    });
  });

  test("Half Cover can turn an object hit into a miss and still spends the Attack", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const objectId = battleObjectId("synthetic_half_cover_target");
    const targetFill = {
      kind: "objectTargetChoice",
      holeId: targetHole.holeId,
      value: objectId,
      spatialFacts: [
        {
          kind: "attackObjectTarget",
          actorId: fighterId,
          objectId,
          range: { kind: "meleeReach" },
          attackerCanSeeObject: true,
          cover: "half",
          armorClass: armorClass(15),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
        },
      ],
    } as const satisfies BattleFill;
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill,
        attackRollFill(rollHole, { total: 16, naturalD20: 11 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    expect("objectDamages" in result).toBe(false);

    const threeQuartersTargetFill = {
      ...targetFill,
      spatialFacts: [
        { ...targetFill.spatialFacts[0], cover: "threeQuarters" as const },
      ],
    };
    const threeQuartersRollHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [threeQuartersTargetFill],
      }),
      "attackRoll",
    );
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          threeQuartersTargetFill,
          attackRollFill(threeQuartersRollHole, {
            total: 19,
            naturalD20: 14,
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("long range gives Disadvantage while being hidden does not grant Advantage against an object", () => {
    const base = goblinTurnBattle();
    const goblin = base.combatants.get(goblinId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(goblinId, {
        ...goblin,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const subject = goblinAttackSubject(state, "Shortbow");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const objectId = battleObjectId("synthetic_long_range_target");
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "objectTargetChoice",
            holeId: targetHole.holeId,
            value: objectId,
            spatialFacts: [
              {
                kind: "attackObjectTarget",
                actorId: goblinId,
                objectId,
                range: {
                  kind: "rangedRange",
                  band: "long",
                  enemyWithin5FeetCanSeeAttacker: false,
                },
                attackerCanSeeObject: true,
                cover: "none",
                armorClass: armorClass(15),
                damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
              },
            ],
          },
        ],
      }),
      "attackRoll",
    );

    expect(rollHole.rollMode).toBe("disadvantage");
  });

  test("filters each immune damage component before applying one attack's threshold", () => {
    const objectId = battleObjectId("synthetic_mixed_damage_target");
    const outcome = objectDamageOutcomeFromComponents({
      objectId,
      components: [
        { damageType: "poison", amount: 9 },
        { damageType: "slashing", amount: 7 },
      ],
      disposition: {
        kind: "hitPointsWithDamageThreshold",
        hitPoints: Hp(30),
        damageThreshold: damageAmount(8),
      },
    });
    expect(outcome).toMatchObject({
      components: [
        { damageType: "poison", rolledDamage: 9 },
        { damageType: "slashing", rolledDamage: 7 },
      ],
      rolledDamage: 16,
      damageAfterImmunities: 7,
      damageThreshold: 8,
      effectiveDamage: 0,
      priorHitPoints: 30,
      nextHitPoints: 30,
    });
    expect(
      Schema.decodeUnknownSync(BattleObjectDamageOutcomeSchema)(
        Schema.encodeSync(BattleObjectDamageOutcomeSchema)(outcome),
      ),
    ).toEqual(outcome);
    const inconsistentTotal = Schema.decodeUnknownEither(
      BattleObjectDamageOutcomeSchema,
    )({
      ...outcome,
      rolledDamage: 15,
    });
    expect(Either.isLeft(inconsistentTotal)).toBe(true);
    if (!Either.isLeft(inconsistentTotal)) {
      throw new Error("Expected inconsistent object damage to be rejected.");
    }
    expect(
      ParseResult.TreeFormatter.formatErrorSync(inconsistentTotal.left),
    ).toContain(
      "Object damage components, totals, Hit Point transition, and destruction state must agree.",
    );
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleObjectDamageOutcomeSchema)({
          ...outcome,
          damageAfterImmunities: 16,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleObjectDamageOutcomeSchema)({
          ...outcome,
          damageThreshold: null,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleObjectDamageOutcomeSchema)({
          ...outcome,
          effectiveDamage: 7,
          nextHitPoints: 30,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleObjectDamageOutcomeSchema)({
          ...outcome,
          destroyed: true,
        }),
      ),
    ).toBe(true);
  });

  test("Unarmed Strike does not advertise the ordinary object target frontier", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Unarmed Strike");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );

    expect(targetHole.attack?.acceptsObjectTarget).toBeUndefined();
    const objectId = battleObjectId("synthetic_unarmed_object");
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "objectTargetChoice",
            holeId: targetHole.holeId,
            value: objectId,
            spatialFacts: [
              {
                kind: "attackObjectTarget",
                actorId: fighterId,
                objectId,
                range: { kind: "meleeReach" },
                attackerCanSeeObject: true,
                cover: "none",
                armorClass: armorClass(15),
                damageDisposition: {
                  kind: "hitPoints",
                  hitPoints: Hp(30),
                },
              },
            ],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "This attack procedure does not support an ordinary object target.",
    });
  });

  test("Stat Block attacks use the same object target and damage outcome path", () => {
    const state = goblinTurnBattle();
    const subject = goblinAttackSubject(state, "Scimitar");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const objectId = battleObjectId("synthetic_beacon");
    const targetFill = {
      kind: "objectTargetChoice",
      holeId: targetHole.holeId,
      value: objectId,
      spatialFacts: [
        {
          kind: "attackObjectTarget",
          actorId: goblinId,
          objectId,
          range: { kind: "meleeReach" },
          attackerCanSeeObject: true,
          cover: "none",
          armorClass: armorClass(15),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
        },
      ],
    } as const satisfies BattleFill;
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const rollFill = attackRollFill(rollHole, {
      total: 18,
      naturalD20: 14,
    });
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, rollFill],
      }),
      "rolledDice",
    );
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, rollFill, damageRollFill(damageHole, 4)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          objectId,
          components: [{ damageType: "slashing", rolledDamage: 6 }],
          rolledDamage: 6,
          damageAfterImmunities: 6,
          priorHitPoints: 30,
          nextHitPoints: 24,
        },
      ],
      snapshot: { turn: { actionResources: [] } },
    });
  });
});
