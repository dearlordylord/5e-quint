// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.TARGET_COVER
// SRD 5.2.1 "Cover": the table supplies the degree of cover on an attack
// target's geometry fact when it rules some. Half Cover adds 2 to the target's
// AC, Three-Quarters Cover adds 5, and Total Cover prevents direct targeting,
// for weapon attacks, Opportunity Attacks and Spell Attacks alike. A fact
// without a degree gets no cover.
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { armorClassDelta } from "@dnd/shared-algebras/armor-class-values";
import type { RuledCoverType } from "@dnd/shared/types";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import { describe, expect, test } from "vitest";
import { activeEffectArmorClass } from "./battle-reducer/creature-state-execution.ts";
import { battleObjectId } from "./identity.ts";
import type { BattleState, BattleSubject } from "./index.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  attackRollFill,
  attackTargetDistanceSpatialFact,
  battleFrontierInterruptDecisionForState,
  battleId,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  goblinAttackSubject,
  goblinId,
  heavyArmorClassState,
  interruptDecisionFill,
  magicSubject,
  movementFeet,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
  requireHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  targetFill,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";

function armorClassOf(state: BattleState, combatantId: typeof goblinId) {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) throw new Error("Expected the combatant.");
  return currentArmorClass(activeEffectArmorClass(state, combatant));
}

function withCover<Fact extends object>(
  fact: Fact,
  cover: RuledCoverType | undefined,
): Fact & { readonly cover?: RuledCoverType } {
  return cover === undefined ? fact : { ...fact, cover };
}

function longswordAttack(
  state: BattleState,
  cover: RuledCoverType | undefined,
  total?: number,
) {
  const subject = fighterAttackSubject(state, "Longsword");
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const target = targetFill(targetHole, goblinId, [
    withCover(
      attackTargetDistanceSpatialFact(
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
        movementFeet(5),
      ),
      cover,
    ),
  ]);
  const beforeRoll = resolveBattleSubject({ state, subject, fills: [target] });
  if (total === undefined) return beforeRoll;
  const rollHole = requireHole(beforeRoll, "attackRoll");
  return resolveBattleSubject({
    state,
    subject,
    fills: [target, attackRollFill(rollHole, { total, naturalD20: 10 })],
  });
}

function hits(result: ReturnType<typeof resolveBattleSubject>): boolean {
  if (result.tag === "resolved") return false;
  requireHole(result, "rolledDice");
  return true;
}

describe("battle runtime: Cover on creature targets", () => {
  test("a weapon attack meets the target's AC with no cover", () => {
    const state = fighterVsGoblinBattle();
    const ac = armorClassOf(state, goblinId);
    expect(hits(longswordAttack(state, undefined, ac))).toBe(true);
    expect(hits(longswordAttack(state, undefined, ac - 1))).toBe(false);
  });

  test("a target fact without a degree of cover gets no cover", () => {
    const state = fighterVsGoblinBattle();
    const ac = armorClassOf(state, goblinId);
    expect(hits(longswordAttack(state, undefined, ac))).toBe(true);
    expect(hits(longswordAttack(state, undefined, ac - 1))).toBe(false);
  });

  test("Half Cover adds 2 and Three-Quarters Cover adds 5 to the target's AC", () => {
    const state = fighterVsGoblinBattle();
    const ac = armorClassOf(state, goblinId);
    expect(hits(longswordAttack(state, "half", ac + 1))).toBe(false);
    expect(hits(longswordAttack(state, "half", ac + 2))).toBe(true);
    expect(hits(longswordAttack(state, "threeQuarters", ac + 4))).toBe(false);
    expect(hits(longswordAttack(state, "threeQuarters", ac + 5))).toBe(true);
  });

  test("Total Cover refuses the target before any roll", () => {
    const state = fighterVsGoblinBattle();
    expect(longswordAttack(state, "total")).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("an Opportunity Attack threat refuses a mover with Total Cover", () => {
    const state = fighterVsGoblinBattle();
    const scimitar = attackExecutionSelectionForSubjectForTest(
      goblinAttackSubject(state, "Scimitar"),
    );
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const move = (cover: RuledCoverType | undefined) =>
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(moveHole, {
            distanceFeet: 5,
            provokedOpportunityAttacks: [
              withCover(
                {
                  reactorId: goblinId,
                  distanceFeet: movementFeet(5),
                  ...scimitar,
                },
                cover,
              ),
            ],
          }),
        ],
      });
    expect(move(undefined)).toMatchObject({
      tag: "needsHoles",
      frontier: { kind: "interruptDecision", trigger: "opportunityAttack" },
    });
    expect(move("half")).toMatchObject({
      tag: "needsHoles",
      frontier: { kind: "interruptDecision", trigger: "opportunityAttack" },
    });
    expect(move("total")).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("an Opportunity Attack's supplied target fact keeps the cover ruled on its threat", () => {
    const state = fighterVsGoblinBattle();
    const scimitar = attackExecutionSelectionForSubjectForTest(
      goblinAttackSubject(state, "Scimitar"),
    );
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const awaiting = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(moveHole, {
          distanceFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: goblinId,
              distanceFeet: movementFeet(5),
              cover: "half",
              ...scimitar,
            },
          ],
        }),
      ],
    });
    if (awaiting.tag !== "needsHoles") {
      throw new Error("Expected the Opportunity Attack window.");
    }
    const pending = battleFrontierInterruptDecisionForState(awaiting.state);
    if (pending === null) throw new Error("Expected a pending Reaction.");
    const choice = reactionChoiceWithSubject(pending.choices);
    const react = (cover: RuledCoverType | undefined) =>
      resolveBattleInterrupt({
        state: awaiting.state,
        fill: interruptDecisionFill(pending.decisionHole, {
          kind: "resolve",
          responderId: goblinId,
          choice: opportunityAttackProcedureSelectionForTest(choice, [
            {
              kind: "targetSpatialFacts",
              holeId: ATTACK_TARGET_HOLE_ID,
              spatialFacts: [
                withCover(
                  attackTargetDistanceSpatialFact(
                    goblinId,
                    fighterId,
                    scimitar,
                    movementFeet(5),
                  ),
                  cover,
                ),
              ],
            },
          ]),
        }),
      });
    expect(react(undefined)).toMatchObject({
      tag: "invalid",
      message:
        "Opportunity Attack target cover must match the cover the table ruled on its threat.",
    });
    expect(react("total")).toMatchObject({ tag: "invalid" });
    expect(react("half")).toMatchObject({
      tag: "needsHoles",
      frontier: { kind: "holes", holes: [{ kind: "attackRoll" }] },
    });
  });

  test.each(["chill_touch", "fire_bolt"] as const)(
    "%s meets the target's AC plus its cover",
    (spellId) => {
      const session = startBattleSessionRight({
        battleId: battleId(`battle-${spellId}-cover`),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Wizard",
            initiative: 20,
            attack: null,
            classLevel: 5,
            spellcasting: wizardSpellcasting({
              cantrips: [spellRecord(spellId)],
              preparedSpells: [],
            }),
          }),
          skeletonCreatureInit({ initiative: 10 }),
        ],
      });
      const state = session.state;
      const subject = findAct(session, magicSubject(spellId)).subject;
      const targetHole = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const ac = armorClassOf(state, skeletonId);
      const spellTarget = (cover: RuledCoverType | undefined) => {
        const fill = targetFill(targetHole, skeletonId);
        return {
          ...fill,
          spatialFacts: (fill.spatialFacts ?? []).map((fact) =>
            fact.kind === "spellTarget" ? withCover(fact, cover) : fact,
          ),
        };
      };
      const rollWith = (cover: RuledCoverType | undefined, total: number) => {
        const rollHole = requireHole(
          resolveBattleSubject({ state, subject, fills: [spellTarget(cover)] }),
          "attackRoll",
        );
        return resolveBattleSubject({
          state,
          subject,
          fills: [
            spellTarget(cover),
            attackRollFill(rollHole, { total, naturalD20: 10 }),
          ],
        });
      };
      expect(hits(rollWith(undefined, ac))).toBe(true);
      expect(hits(rollWith("half", ac + 1))).toBe(false);
      expect(hits(rollWith("threeQuarters", ac + 5))).toBe(true);
      expect(
        resolveBattleSubject({ state, subject, fills: [spellTarget("total")] }),
      ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    },
  );

  test("an attack total of 19 misses AC 19 behind Half Cover", () => {
    // Regression witness from the Half Cover defect report: Chain Mail 16,
    // a Shield and the Defense style give the Fighter AC 19, and Half Cover
    // raises it to 21. The report's attack was a Shortbow; a Scimitar meets
    // the same Armor Class.
    const state = startBattleRight({
      battleId: battleId("battle-shortbow-half-cover"),
      combatants: [
        characterSeed({
          initiative: 10,
          selectedLoadout: {
            armor: {
              itemId: battleObjectId("armor:equipment_chain_mail"),
              unitId: parseSharedUnitId("equipment_chain_mail"),
            },
            shield: {
              itemId: battleObjectId("shield:equipment_shield"),
              unitId: parseSharedUnitId("equipment_shield"),
            },
          },
          attack: null,
          armorClass: {
            ...heavyArmorClassState(),
            armorTraining: new Set(["heavy", "shield"]),
            rightHandUse: "free",
            leftHandUse: "shield",
            bonuses: [
              {
                kind: "shield",
                bonus: armorClassDelta(2),
                handUse: "shield",
                trainingRequired: "shield",
              },
              {
                kind: "wearing_armor",
                bonus: armorClassDelta(1),
                categories: ["light", "medium", "heavy"],
              },
            ],
          },
        }),
        statBlockCreatureInit({ initiative: 20 }),
      ],
    });
    expect(armorClassOf(state, fighterId)).toBe(19);
    const subject = goblinAttackSubject(state, "Scimitar");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const target = (cover: RuledCoverType | undefined) =>
      targetFill(targetHole, fighterId, [
        withCover(
          attackTargetDistanceSpatialFact(
            goblinId,
            fighterId,
            attackExecutionSelectionForSubjectForTest(subject),
            movementFeet(5),
          ),
          cover,
        ),
      ]);
    const strike = (cover: RuledCoverType | undefined, total: number) => {
      const rollHole = requireHole(
        resolveBattleSubject({ state, subject, fills: [target(cover)] }),
        "attackRoll",
      );
      return resolveBattleSubject({
        state,
        subject,
        fills: [
          target(cover),
          attackRollFill(rollHole, { total, naturalD20: 10 }),
        ],
      });
    };
    expect(hits(strike(undefined, 19))).toBe(true);
    expect(hits(strike("half", 19))).toBe(false);
    expect(hits(strike("half", 21))).toBe(true);
  });
});
