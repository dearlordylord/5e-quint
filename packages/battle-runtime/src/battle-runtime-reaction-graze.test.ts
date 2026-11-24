// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WEAPON_MASTERY_GRAZE BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.weapon-mastery-graze
import { Result } from "effect";
import { classLevel } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  attackDamageDispositionFill,
  concentrationSavingThrowFill,
  battleProcedureExecutionRefForTest,
  Hp,
  attackExecutionSelectionForSubjectForTest,
  attackRollFill,
  attackTargetDistanceSpatialFact,
  battleAbilityModifier,
  battleId,
  battleFrontierInterruptDecisionForState,
  battleResolutionHolesForTest,
  battleUnitSupportProfilesForUnit,
  characterBattleFeatureInitForTest,
  characterSeed,
  damageRollFill,
  endTurn,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinAttackSubject,
  goblinId,
  grazeWeaponMasterySelections,
  interruptDecisionFill,
  masteryGrazeUnitRefs,
  movementFeet,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  readyDeclarationFillForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testGrazeWeaponAttack,
  testGrazeWeaponUnitRef,
  unitFeatureDecisionFill,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import type { BattleFill, BattleState } from "./battle-runtime.test-support.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";

const WEAPON = String(testGrazeWeaponUnitRef().unit.id);
const MISS = { total: 10, naturalD20: 8 } as const;
const HIT = { total: 18, naturalD20: 15 } as const;
const grazeSeed = {
  characterUnitRefs: [...masteryGrazeUnitRefs(), testGrazeWeaponUnitRef()],
  weaponMasteries: grazeWeaponMasterySelections(),
  attack: testGrazeWeaponAttack(battleAbilityModifier(3)),
};

function retaliationBattle(): BattleState {
  const unit = unitLibrary.requireUnit("barbarian_retaliation");
  const profiles = battleUnitSupportProfilesForUnit({ unit });
  if (Result.isFailure(profiles)) throw new Error(profiles.failure.message);
  return startBattleRight({
    battleId: battleId("reaction-graze"),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({
        ...grazeSeed,
        initiative: 10,
        classLevels: [{ className: "barbarian", level: 10 }],
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "barbarian", level: classLevel(10) },
          ]),
        ],
        characterUnitRefs: [
          ...grazeSeed.characterUnitRefs,
          { unit, supportProfiles: profiles.success },
        ],
      }),
    ],
  });
}

function beginReaction(
  kind: "opportunityAttack" | "releaseReadiedAttack" | "retaliationAttack",
  targetState?: (state: BattleState) => BattleState,
  retaliationWitness = false,
) {
  const initial =
    kind === "retaliationAttack"
      ? retaliationBattle()
      : fighterVsGoblinBattle(grazeSeed);
  const state = targetState === undefined ? initial : targetState(initial);
  const selection = attackExecutionSelectionForSubjectForTest(
    fighterAttackSubject(state, WEAPON),
  );
  const facts: BattleFill = {
    kind: "targetSpatialFacts",
    holeId: ATTACK_TARGET_HOLE_ID,
    spatialFacts: [
      attackTargetDistanceSpatialFact(
        fighterId,
        goblinId,
        selection,
        movementFeet(5),
      ),
      ...(retaliationWitness
        ? [
            {
              kind: "retaliationDamagerWithinFiveFeet" as const,
              damagedId: goblinId,
              damageSourceId: fighterId,
            },
          ]
        : []),
    ],
  };
  let awaiting: ReturnType<typeof resolveBattleSubject>;
  if (kind === "retaliationAttack") {
    const subject = goblinAttackSubject(state, "Scimitar");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targeted = targetFill(target, fighterId, [
      attackTargetDistanceSpatialFact(
        goblinId,
        fighterId,
        attackExecutionSelectionForSubjectForTest(subject),
        movementFeet(5),
      ),
      {
        kind: "retaliationDamagerWithinFiveFeet",
        damagedId: fighterId,
        damageSourceId: goblinId,
      },
    ]);
    const roll = requireHole(
      resolveBattleSubject({ state, subject, fills: [targeted] }),
      "attackRoll",
    );
    const rolled = attackRollFill(roll, HIT);
    const damage = requireHole(
      resolveBattleSubject({ state, subject, fills: [targeted, rolled] }),
      "rolledDice",
    );
    awaiting = resolveBattleSubject({
      state,
      subject,
      fills: [targeted, rolled, damageRollFill(damage, 4)],
    });
  } else if (kind === "releaseReadiedAttack") {
    const subject = {
      tag: "action",
      actorId: fighterId,
      action: "ready",
    } as const;
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "readyDeclaration",
    );
    const response = hole.responseChoices.find(
      (r) =>
        r.kind === "attack" &&
        r.selection.procedureRef === selection.procedureRef,
    );
    if (response === undefined)
      throw new Error("Expected Graze weapon Ready response.");
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          readyDeclarationFillForTest(
            hole,
            "the goblin comes within reach",
            response,
          ),
        ],
      }),
    );
    const next = requireResolved(
      endTurn({ state: readied.state, actorId: fighterId }),
    ).state;
    awaiting = resolveBattleSubject({
      state: next,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "reportReadyTrigger",
        readiedActorId: fighterId,
      },
      fills: [],
    });
  } else {
    const next = requireResolved(endTurn({ state, actorId: fighterId })).state;
    const subject = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "move",
    } as const;
    const movement = requireHole(
      resolveBattleSubject({ state: next, subject, fills: [] }),
      "movement",
    );
    awaiting = resolveBattleSubject({
      state: next,
      subject,
      fills: [
        movementFill(movement, {
          distanceFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: fighterId,
              distanceFeet: movementFeet(5),
              ...selection,
            },
          ],
        }),
      ],
    });
  }
  if (awaiting.tag !== "needsHoles")
    throw new Error("Expected reaction interrupt.");
  const pending = battleFrontierInterruptDecisionForState(awaiting.state);
  const choice = pending?.choices.find(
    (c) => c.kind === "nestedProcedure" && c.subject.command === kind,
  );
  if (pending == null || choice?.kind !== "nestedProcedure")
    throw new Error("Expected reaction choice.");
  const selected =
    kind === "opportunityAttack"
      ? opportunityAttackProcedureSelectionForTest(choice, [facts])
      : kind === "retaliationAttack"
        ? { kind: "retaliationAttack" as const, selection, fills: [facts] }
        : {
            kind: "releaseReadiedAttack" as const,
            targetId: goblinId,
            procedureRef: selection.procedureRef,
            fills: [facts],
          };
  const started = resolveBattleInterrupt({
    state: awaiting.state,
    fill: interruptDecisionFill(pending.decisionHole, {
      kind: "resolve",
      responderId: fighterId,
      choice: selected,
    }),
  });
  if (started.tag !== "needsHoles")
    throw new Error("Expected reaction attack roll.");
  return { started, subject: choice.subject, facts, initial: state };
}

describe("reaction attack Graze", () => {
  test.each([
    "opportunityAttack",
    "releaseReadiedAttack",
    "retaliationAttack",
  ] as const)(
    "%s offers optional fixed miss damage without spending another Reaction",
    (kind) => {
      const { started, subject, facts, initial } = beginReaction(kind);
      expect(
        resolveBattleSubject({ state: initial, subject, fills: [] }),
      ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
      const roll = requireHole(started, "attackRoll");
      const fills = [facts, attackRollFill(roll, MISS)];
      const offered = resolveBattleSubject({
        state: started.state,
        subject,
        fills,
      });
      if (offered.tag !== "needsHoles")
        throw new Error("Expected Graze decision frontier.");
      const decision = requireHole(offered, "unitFeatureDecision");
      expect(decision).toMatchObject({ label: "Use Graze" });
      expect(offered.state.combatants.get(goblinId)?.hp).toBe(
        started.state.combatants.get(goblinId)?.hp,
      );
      if (kind === "releaseReadiedAttack")
        expect(offered.state.readiedResponses.has(fighterId)).toBe(true);
      for (const value of ["use", "decline"] as const) {
        const result = requireResolved(
          resolveBattleSubject({
            state: started.state,
            subject,
            fills: [...fills, unitFeatureDecisionFill(decision, value)],
          }),
        );
        expect(Number(result.state.combatants.get(goblinId)?.hp)).toBe(
          Number(started.state.combatants.get(goblinId)?.hp) -
            (value === "use" ? 3 : 0),
        );
        expect(
          result.snapshot.combatants.find((c) => c.combatantId === fighterId)
            ?.reactionAvailable,
        ).toBe(false);
        if (kind === "releaseReadiedAttack")
          expect(result.state.readiedResponses.has(fighterId)).toBe(false);
        expect(
          resolveBattleSubject({
            state: result.state,
            subject,
            fills: [...fills, unitFeatureDecisionFill(decision, value)],
          }),
        ).toMatchObject({ tag: "invalid" });
      }
      expect(
        resolveBattleSubject({
          state: started.state,
          subject,
          fills: [
            ...fills,
            unitFeatureDecisionFill(decision, "use"),
            unitFeatureDecisionFill(decision, "decline"),
          ],
        }),
      ).toMatchObject({ tag: "invalid" });
      const hit = resolveBattleSubject({
        state: started.state,
        subject,
        fills: [facts, attackRollFill(roll, HIT)],
      });
      if (hit.tag !== "needsHoles")
        throw new Error("Expected hit damage frontier.");
      expect(
        battleResolutionHolesForTest(hit).some((h) => h.kind === "rolledDice"),
      ).toBe(true);
      expect(
        resolveBattleSubject({
          state: started.state,
          subject,
          fills: [
            facts,
            attackRollFill(roll, HIT),
            unitFeatureDecisionFill(decision, "use"),
          ],
        }),
      ).toMatchObject({ tag: "invalid" });
    },
  );
  test("Graze reaction damage waits for Concentration without consuming damage or the Reaction twice", () => {
    const { started, subject, facts } = beginReaction(
      "opportunityAttack",
      (state) => {
        const target = state.combatants.get(goblinId);
        if (target === undefined) throw new Error("Expected target.");
        return {
          ...state,
          combatants: new Map(state.combatants).set(goblinId, {
            ...target,
            concentration: {
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                "reaction-graze-ward",
              ),
              effectKind: "spellEffect",
            },
          }),
        };
      },
    );
    const rolled = [
      facts,
      attackRollFill(requireHole(started, "attackRoll"), MISS),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state: started.state, subject, fills: rolled }),
      "unitFeatureDecision",
    );
    const fills = [...rolled, unitFeatureDecisionFill(decision, "use")];
    const saving = resolveBattleSubject({
      state: started.state,
      subject,
      fills,
    });
    const save = requireHole(saving, "concentrationSavingThrow");
    const resolved = requireResolved(
      resolveBattleSubject({
        state: started.state,
        subject,
        fills: [...fills, concentrationSavingThrowFill(save, false)],
      }),
    );
    expect(Number(resolved.state.combatants.get(goblinId)?.hp)).toBe(
      Number(started.state.combatants.get(goblinId)?.hp) - 3,
    );
    expect(resolved.state.combatants.get(goblinId)?.concentration).toBeNull();
    expect(
      resolved.snapshot.combatants.find((c) => c.combatantId === fighterId)
        ?.reactionAvailable,
    ).toBe(false);
  });

  test("Graze reaction damage can knock the target unconscious at 1 HP", () => {
    const { started, subject, facts } = beginReaction(
      "opportunityAttack",
      (state) => {
        const target = state.combatants.get(goblinId);
        if (target === undefined || target.positiveHpUnconscious !== null)
          throw new Error("Expected conscious target.");
        return {
          ...state,
          combatants: new Map(state.combatants).set(goblinId, {
            ...target,
            hp: Hp(3),
          }),
        };
      },
    );
    const rolled = [
      facts,
      attackRollFill(requireHole(started, "attackRoll"), MISS),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state: started.state, subject, fills: rolled }),
      "unitFeatureDecision",
    );
    const fills = [...rolled, unitFeatureDecisionFill(decision, "use")];
    const disposition = requireHole(
      resolveBattleSubject({ state: started.state, subject, fills }),
      "attackDamageDisposition",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: started.state,
        subject,
        fills: [
          ...fills,
          attackDamageDispositionFill(disposition, { kind: "knockOut" }),
        ],
      }),
    );
    expect(resolved.state.combatants.get(goblinId)?.hp).toBe(1);
    expect(
      resolved.snapshot.combatants.find((c) => c.combatantId === goblinId)
        ?.conditions,
    ).toContain("unconscious");
  });

  test("a nested after-damage Retaliation resumes the Graze miss without replaying its damage", () => {
    const unit = unitLibrary.requireUnit("barbarian_retaliation");
    const profiles = battleUnitSupportProfilesForUnit({ unit });
    if (Result.isFailure(profiles)) throw new Error(profiles.failure.message);
    const { started, subject, facts } = beginReaction(
      "opportunityAttack",
      () =>
        startBattleRight({
          battleId: battleId("graze-nested-retaliation"),
          combatants: [
            characterSeed({ ...grazeSeed, initiative: 20 }),
            characterSeed({
              combatantId: goblinId,
              initiative: 10,
              classLevels: [{ className: "barbarian", level: 10 }],
              unitFeatures: [
                characterBattleFeatureInitForTest(unit, [
                  { className: "barbarian", level: classLevel(10) },
                ]),
              ],
              characterUnitRefs: [{ unit, supportProfiles: profiles.success }],
            }),
          ],
        }),
      true,
    );
    const rolled = [
      facts,
      attackRollFill(requireHole(started, "attackRoll"), {
        total: 1,
        naturalD20: 1,
      }),
    ];
    const offered = resolveBattleSubject({
      state: started.state,
      subject,
      fills: rolled,
    });
    if (offered.tag !== "needsHoles")
      throw new Error("Expected Graze decision frontier.");
    expect(battleResolutionHolesForTest(offered)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unitFeatureDecision",
          label: "Use Graze",
        }),
      ]),
    );
    const decision = requireHole(offered, "unitFeatureDecision");
    const damaged = resolveBattleSubject({
      state: started.state,
      subject,
      fills: [...rolled, unitFeatureDecisionFill(decision, "use")],
    });
    if (damaged.tag !== "needsHoles")
      throw new Error("Expected after-damage interrupt.");
    const pending = battleFrontierInterruptDecisionForState(damaged.state);
    expect(
      pending?.choices.some(
        (c) =>
          c.kind === "nestedProcedure" &&
          c.subject.command === "retaliationAttack",
      ),
    ).toBe(true);
    if (pending == null) throw new Error("Expected nested Retaliation.");
    const resolved = requireResolved(
      resolveBattleInterrupt({
        state: damaged.state,
        fill: interruptDecisionFill(pending.decisionHole, {
          kind: "decline",
          responderId: goblinId,
        }),
      }),
    );
    expect(Number(resolved.state.combatants.get(goblinId)?.hp)).toBe(
      Number(started.state.combatants.get(goblinId)?.hp) - 3,
    );
    expect(
      resolved.snapshot.combatants.find((c) => c.combatantId === fighterId)
        ?.reactionAvailable,
    ).toBe(false);
    expect(
      resolved.snapshot.combatants.find((c) => c.combatantId === goblinId)
        ?.reactionAvailable,
    ).toBe(true);
  });
  test("an attack without selected Graze rejects its decision instead of damaging on a miss", () => {
    const eligible = beginReaction("opportunityAttack");
    const offered = resolveBattleSubject({
      state: eligible.started.state,
      subject: eligible.subject,
      fills: [
        eligible.facts,
        attackRollFill(requireHole(eligible.started, "attackRoll"), MISS),
      ],
    });
    const decision = requireHole(offered, "unitFeatureDecision");
    const { started, subject, facts } = beginReaction("opportunityAttack", () =>
      fighterVsGoblinBattle({
        characterUnitRefs: [testGrazeWeaponUnitRef()],
        attack: testGrazeWeaponAttack(),
      }),
    );
    expect(
      resolveBattleSubject({
        state: started.state,
        subject,
        fills: [
          facts,
          attackRollFill(requireHole(started, "attackRoll"), MISS),
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
  });
  test.each(["opportunityAttack", "retaliationAttack"] as const)(
    "a completed %s hit cannot be replayed without Graze",
    (kind) => {
      const { started, subject, facts } = beginReaction(kind, () => {
        if (kind === "retaliationAttack") return retaliationBattle();
        return fighterVsGoblinBattle({
          characterUnitRefs: [testGrazeWeaponUnitRef()],
          attack: testGrazeWeaponAttack(),
        });
      });
      const rolled = [
        facts,
        attackRollFill(requireHole(started, "attackRoll"), HIT),
      ];
      const damage = requireHole(
        resolveBattleSubject({ state: started.state, subject, fills: rolled }),
        "rolledDice",
      );
      const fills = [...rolled, damageRollFill(damage, 2)];
      const completed = requireResolved(
        resolveBattleSubject({ state: started.state, subject, fills }),
      );
      const late = resolveBattleSubject({
        state: completed.state,
        subject,
        fills,
      });
      expect(late).toMatchObject({ tag: "invalid", reason: "staleSubject" });
      expect(late.snapshot).toEqual(completed.snapshot);
    },
  );
});
