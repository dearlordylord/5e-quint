import { spellBattle } from "../../battle-runtime/src/unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spikeGrowthAreaFill,
} from "../../battle-runtime/src/unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "../../battle-runtime/src/unit-profile-admission-spell-record.test-support.ts";
import {
  spellCasterId,
  spikeGrowthUnitId,
} from "../../battle-runtime/src/unit-profile-admission-catalog.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FACTORY-578 barbarian_feral_instinct
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FACTORY-579 barbarian_instinctive_pounce
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay FACTORY-578 barbarian_feral_instinct
// UNIT-IDENTITY-REPLAY: FACTORY-578 barbarian_feral_instinct doProjectSelectedInitiative
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay FACTORY-579 barbarian_instinctive_pounce
// UNIT-IDENTITY-REPLAY: FACTORY-579 barbarian_instinctive_pounce doEnterWithMovement
import { defineSelectedIdentityReplayWitness } from "../../battle-runtime/src/selected-identity-witness.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-initiative-roll-mode unit-feature.ongoing-feature-activation-movement-rider
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import {
  combatantId,
  characterProcedureBinding,
  battleTablePositionId,
  snapshotBattle,
  opportunityAttackExecutionCandidates,
  resolveBattleInterrupt,
  discoverBattleActs,
  resolveBattleSubject,
  requiredInitiativeRollModeForCombatant,
  type BattleFill,
  type BattleHole,
  type BattleState,
} from "@dnd/battle-runtime";
import {
  classUnitId,
  creationChoiceOptionId,
  finalizeCharacterDraft,
} from "@dnd/character-creation-runtime";
import { completeSupportedProgressionDraft } from "@dnd/character-creation-runtime/test-support";
import { movementFeet } from "@dnd/shared/types";
import { characterBattleInitiativeRollMode } from "./index.ts";
import { describe, expect, test } from "vitest";
import {
  battleSessionFromSheets,
  characterSheet,
  monsterBattleInput,
  srdStatBlock,
  requireResolved,
  requireSuccess,
  requireHole,
  requireHoleFromList,
  damageRollFillWithGroups,
  unitFeatureDecisionFill,
  unitLibrary,
} from "./sdk-integration.test-support.ts";

function barbarianSession(level: number) {
  const draft = completeSupportedProgressionDraft({
    draftId: `draft:barbarian-${level}`,
    unitLibrary,
    progression: {
      startingClass: classUnitId(unitId("class_barbarian")),
      advancements: Array.from({ length: level - 1 }, () => ({
        classUnitId: classUnitId(unitId("class_barbarian")),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    fixtureOptionIds: (source) => {
      if (source.choiceKey === "equipment_purchase")
        return [creationChoiceOptionId("weapon_longsword")];
      if (
        source.choiceKey === "class_equipment_choice" ||
        source.choiceKey === "background_equipment_choice"
      )
        return [creationChoiceOptionId("option_b")];
      if (source.choiceKey === "weapon_mastery_options")
        return ["weapon_longsword", "weapon_spear", "weapon_greataxe"].map(
          creationChoiceOptionId,
        );
      return undefined;
    },
    standardArrayAssignment: {
      str: 15,
      dex: 14,
      con: 13,
      int: 8,
      wis: 12,
      cha: 10,
    },
  });
  const result = finalizeCharacterDraft({ draft, unitLibrary });
  if (result.tag !== "ready")
    throw new Error(`Barbarian creation: ${result.tag}`);
  const initiativeRollMode = requireSuccess(
    characterBattleInitiativeRollMode({ build: result.build, unitLibrary }),
  );
  const actorId = combatantId(`barbarian-${level}`);
  const session = battleSessionFromSheets({
    battleIdText: `battle:barbarian-${level}`,
    characters: [
      characterSheet({
        characterIdText: `character:barbarian-${level}`,
        combatantId: actorId,
        build: result.build,
        initiative: 20,
      }),
    ],
    monsters: [
      monsterBattleInput(
        combatantId("opponent"),
        10,
        srdStatBlock(statBlockId("stat_block_skeleton")),
      ),
    ],
  });
  return { actorId, session, build: result.build, initiativeRollMode };
}

function rageSubject(session: ReturnType<typeof barbarianSession>["session"]) {
  const ref = session.context.characters
    .get(combatantId("barbarian-7"))
    ?.unitProcedureOwnership.find(
      (entry) => entry.unitId === "barbarian_rage",
    )?.procedureRef;
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.procedureRef === ref,
  );
  if (act?.subject.tag !== "unitFeature") throw new Error("Missing Rage act");
  return act.subject;
}
function rageMovement() {
  const fixture = barbarianSession(7);
  const subject = rageSubject(fixture.session);
  const state = fixture.session.state;
  const choice = resolveBattleSubject({ state, subject, fills: [] });
  const decision = unitFeatureDecisionFill(
    requireHole(choice, "unitFeatureDecision"),
    "use",
  );
  const hole = requireHole(
    resolveBattleSubject({ state, subject, fills: [decision] }),
    "movement",
  );
  return { ...fixture, state, subject, decision, hole };
}
function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  cost: number,
  extra: Partial<
    Pick<
      Extract<BattleFill, { readonly kind: "movement" }>["value"],
      | "speedKind"
      | "provokedOpportunityAttacks"
      | "creatureSpaceTraversal"
      | "areaDifficultTerrain"
    >
  > = {},
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(cost),
      provokedOpportunityAttacks: [],
      ...extra,
    },
  };
}
function nextRound(state: BattleState) {
  const endActor = requireResolved(
    resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        command: "endTurn",
        actorId: combatantId("barbarian-7"),
      },
      fills: [],
    }),
  );
  return requireResolved(
    resolveBattleSubject({
      state: endActor.state,
      subject: {
        tag: "runtimeCommand",
        command: "endTurn",
        actorId: combatantId("opponent"),
      },
      fills: [],
    }),
  ).state;
}

describe("Barbarian level 7 real-catalog SDK handoff", () => {
  test("Feral Instinct grants Initiative Advantage at level 7", () => {
    const { actorId, session } = barbarianSession(7);
    expect(requiredInitiativeRollModeForCombatant(session.state, actorId)).toBe(
      "advantage",
    );
    expect(barbarianSession(7).initiativeRollMode).toBe("advantage");
    expect(
      requiredInitiativeRollModeForCombatant(
        session.state,
        combatantId("opponent"),
      ),
    ).toBeUndefined();
  });
  test("entering Rage offers optional half-Speed movement", () => {
    const { actorId, session } = barbarianSession(7);
    const ref = session.context.characters
      .get(actorId)
      ?.unitProcedureOwnership.find(
        (entry) => entry.unitId === "barbarian_rage",
      )?.procedureRef;
    if (ref === undefined) throw new Error("Missing Rage procedure");
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "unitFeature" &&
        candidate.subject.procedureRef === ref,
    );
    if (act?.subject.tag !== "unitFeature") throw new Error("Missing Rage act");
    const choice = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [],
    });
    const decision = unitFeatureDecisionFill(
      requireHole(choice, "unitFeatureDecision"),
      "use",
    );
    const requested = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [decision],
    });
    expect(requireHole(requested, "movement").movementBudgetFeet).toBe(20);
  });
  test("moving with Rage spends its existing use and Bonus Action while preserving turn Movement", () => {
    const fixture = rageMovement();
    const moved = requireResolved(
      resolveBattleSubject({
        state: fixture.state,
        subject: fixture.subject,
        fills: [fixture.decision, movementFill(fixture.hole, 20)],
      }),
    );
    expect(moved.state.currentTurnResources.currentHasBonusAction).toBe(false);
    const before = fixture.state.combatants.get(fixture.actorId);
    const after = moved.state.combatants.get(fixture.actorId);
    expect(after?.movementSpentFeet).toBe(before?.movementSpentFeet);
    expect(after?.activeOngoingFeatureOccurrences.size).toBe(1);
    expect(moved.movements).toMatchObject([
      { movementCostFeet: 20, spendsTurnMovement: false },
    ]);
    if (
      before?.origin.kind !== "character" ||
      after?.origin.kind !== "character"
    )
      throw new Error("Expected characters");
    const binding = characterProcedureBinding(
      before.origin.execution,
      fixture.subject.procedureRef,
    );
    if (
      binding?.procedure.kind !== "unitFeature" ||
      binding.procedure.source.kind !== "resourcePool"
    )
      throw new Error("Missing Rage pool source");
    const poolRef = binding.procedure.source.resourcePoolRef;
    const pool = after.origin.resources.find(
      (resource) => resource.resourcePoolRef === poolRef,
    );
    expect(pool).toMatchObject({ usesRemaining: 3 });
  });
  test("declining movement enters Rage and extending Rage never grants another move", () => {
    const fixture = rageMovement();
    const declined = requireResolved(
      resolveBattleSubject({
        state: fixture.state,
        subject: fixture.subject,
        fills: [{ ...fixture.decision, value: "decline" }],
      }),
    );
    expect(declined.movements).toBeUndefined();
    const extendedState = nextRound(declined.state);
    const extended = requireResolved(
      resolveBattleSubject({
        state: extendedState,
        subject: fixture.subject,
        fills: [],
      }),
    );
    expect(extended.movements).toBeUndefined();
    expect(
      extended.state.combatants.get(fixture.actorId)
        ?.activeOngoingFeatureOccurrences.size,
    ).toBe(1);
    const rejected = resolveBattleSubject({
      state: extendedState,
      subject: fixture.subject,
      fills: [fixture.decision, movementFill(fixture.hole, 5)],
    });
    expect(rejected).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(rejected.snapshot).toEqual(snapshotBattle(extendedState));
  });
  test("level 6 has neither passive Initiative Advantage nor an activation movement offer", () => {
    const { actorId, session, build } = barbarianSession(6);
    expect(
      requireSuccess(characterBattleInitiativeRollMode({ build, unitLibrary })),
    ).toBe("normal");
    expect(
      requiredInitiativeRollModeForCombatant(session.state, actorId),
    ).toBeUndefined();
    const ref = session.context.characters
      .get(actorId)
      ?.unitProcedureOwnership.find(
        (entry) => entry.unitId === "barbarian_rage",
      )?.procedureRef;
    if (ref === undefined) throw new Error("Missing Rage");
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: { tag: "unitFeature", actorId, procedureRef: ref },
        fills: [],
      }).tag,
    ).toBe("resolved");
  });
  test("Pounce cannot be invoked as a standalone feature", () => {
    const fixture = rageMovement();
    const ref = fixture.session.context.characters
      .get(fixture.actorId)
      ?.unitProcedureOwnership.find(
        (entry) => entry.unitId === "barbarian_instinctive_pounce",
      )?.procedureRef;
    if (ref === undefined) throw new Error("Missing activation rider");
    expect(
      discoverBattleActs(fixture.session).some(
        (act) =>
          act.subject.tag === "unitFeature" && act.subject.procedureRef === ref,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: fixture.state,
        subject: {
          tag: "unitFeature",
          actorId: fixture.actorId,
          procedureRef: ref,
        },
        fills: [],
      }).tag,
    ).toBe("invalid");
  });
  test("excess distance, unavailable Speed, occupied destination, and malformed choices are atomic rejections", () => {
    const fixture = rageMovement();
    const move = movementFill(fixture.hole, 5);
    const cases: readonly (readonly BattleFill[])[] = [
      [fixture.decision, movementFill(fixture.hole, 21)],
      [fixture.decision, movementFill(fixture.hole, 5, { speedKind: "fly" })],
      [move],
      [fixture.decision, fixture.decision],
      [{ ...fixture.decision, value: "decline" }, move],
      [fixture.decision, move, move],
      [
        fixture.decision,
        movementFill(fixture.hole, 5, {
          creatureSpaceTraversal: {
            kind: "occupiedCreatureSpaceTraversal",
            occupiedSpaces: [
              {
                occupantId: combatantId("opponent"),
                positionId: battleTablePositionId("occupied"),
              },
            ],
            destination: {
              kind: "occupiedCreatureSpace",
              occupantId: combatantId("opponent"),
              positionId: battleTablePositionId("occupied"),
            },
          },
        }),
      ],
    ];
    for (const fills of cases) {
      const result = resolveBattleSubject({
        state: fixture.state,
        subject: fixture.subject,
        fills,
      });
      expect(result).toMatchObject({ tag: "invalid", reason: "invalidFill" });
      expect(result.snapshot).toEqual(snapshotBattle(fixture.state));
    }
  });

  test.each([false, true])(
    "activation movement resumes after Opportunity Attacks with a movement hazard: %s",
    (withHazard) => {
      const fixture = rageMovement();
      let state = fixture.state;
      let areaDifficultTerrain: Extract<
        BattleFill,
        { kind: "movement" }
      >["value"]["areaDifficultTerrain"];
      if (withHazard) {
        const casterSession = spellBattle({
          preparedSpells: [spellRecord(spikeGrowthUnitId)],
          spellSlots: [{ spellLevel: 2, count: 1 }],
        });
        const castAct = spellAct({
          session: casterSession,
          spellId: spikeGrowthUnitId,
          slotLevel: 2,
        });
        const cast = requireResolved(
          resolveBattleSubject({
            state: casterSession.state,
            subject: castAct.subject,
            fills: [
              spikeGrowthAreaFill(
                requireHoleFromList(castAct.initialHoles, "spellAreaChoice"),
              ),
            ],
          }),
        );
        const caster = cast.state.combatants.get(spellCasterId);
        const hazard = caster?.activeEffects.find(
          (effect) => effect.kind === "areaMovementDistanceDamage",
        );
        if (
          caster === undefined ||
          hazard?.kind !== "areaMovementDistanceDamage"
        )
          throw new Error("Missing admitted movement hazard");
        state = {
          ...state,
          combatants: new Map(state.combatants).set(spellCasterId, caster),
        };
        areaDifficultTerrain = {
          kind: "areaDifficultTerrain",
          totalDistanceFeet: movementFeet(10),
          difficultTerrainDistanceFeet: movementFeet(10),
          sources: [
            {
              kind: "areaMovementDistanceDamage",
              effectRef: hazard.effectRef,
              sourceCombatantId: spellCasterId,
              sourceProcedureRef: hazard.sourceProcedureRef,
              areaId: hazard.areaId,
              damageDistanceFeet: movementFeet(10),
            },
          ],
        };
      }
      const reactorId = combatantId("opponent");
      const candidate = opportunityAttackExecutionCandidates(
        fixture.state,
        reactorId,
        fixture.actorId,
      )[0];
      if (candidate === undefined)
        throw new Error("Missing legal melee reaction");
      const result = resolveBattleSubject({
        state,
        subject: fixture.subject,
        fills: [
          fixture.decision,
          movementFill(fixture.hole, withHazard ? 20 : 10, {
            ...(areaDifficultTerrain === undefined
              ? {}
              : { areaDifficultTerrain }),
            provokedOpportunityAttacks: [
              {
                reactorId,
                distanceFeet: movementFeet(5),
                ...candidate.selection,
              },
            ],
          }),
        ],
      });
      if (
        result.tag !== "needsHoles" ||
        result.frontier.kind !== "interruptDecision"
      )
        throw new Error(
          `Expected Opportunity Attack decision: ${result.tag === "invalid" ? result.message : result.tag}`,
        );
      expect(
        result.state.combatants.get(fixture.actorId)
          ?.activeOngoingFeatureOccurrences.size,
      ).toBe(1);
      expect(result.state.currentTurnResources.currentHasBonusAction).toBe(
        false,
      );
      let reactionResult = resolveBattleInterrupt({
        state: result.state,
        fill: {
          kind: "interruptDecision",
          holeId: result.frontier.decisionHole.holeId,
          value: { kind: "decline", responderId: reactorId },
        },
      });
      if (withHazard) {
        const damage = requireHole(reactionResult, "rolledDice");
        if (
          reactionResult.tag !== "needsHoles" ||
          reactionResult.frontier.kind !== "holes"
        )
          throw new Error("Expected movement damage continuation");
        reactionResult = resolveBattleSubject({
          state: reactionResult.state,
          subject: reactionResult.frontier.replaySubject,
          fills: [damageRollFillWithGroups(damage, [[1, 1, 1, 1]])],
        });
      }
      const resumed = requireResolved(reactionResult);
      expect(resumed.state.subjectResolutionPhase).toEqual({
        kind: "subjectSelection",
      });
      expect(resumed.movements).toMatchObject([
        { movementCostFeet: withHazard ? 20 : 10, spendsTurnMovement: false },
      ]);
      expect(
        resumed.state.combatants.get(fixture.actorId)?.movementSpentFeet,
      ).toBe(0);
      const actor = resumed.state.combatants.get(fixture.actorId);
      if (actor?.origin.kind !== "character")
        throw new Error("Expected character");
      const binding = characterProcedureBinding(
        actor.origin.execution,
        fixture.subject.procedureRef,
      );
      if (
        binding?.procedure.kind !== "unitFeature" ||
        binding.procedure.source.kind !== "resourcePool"
      )
        throw new Error("Missing Rage pool source");
      const poolRef = binding.procedure.source.resourcePoolRef;
      expect(
        actor.origin.resources.find(
          (resource) => resource.resourcePoolRef === poolRef,
        ),
      ).toMatchObject({ usesRemaining: 3 });
    },
  );
  test("a zero current Speed rejects using the rider without spending Rage", () => {
    const fixture = rageMovement();
    const actor = fixture.state.combatants.get(fixture.actorId);
    if (actor === undefined || actor.positiveHpUnconscious !== null)
      throw new Error("Missing conscious character");
    const state = {
      ...fixture.state,
      combatants: new Map(fixture.state.combatants).set(fixture.actorId, {
        ...actor,
        conditions: { ...actor.conditions, restrained: true },
      }),
    };
    // Restrained reduces Speed to zero while still permitting a Bonus Action.
    const result = resolveBattleSubject({
      state,
      subject: fixture.subject,
      fills: [fixture.decision],
    });
    expect(result).toMatchObject({
      tag: "invalid",
      message: "Current Speed grants no activation movement.",
    });
    expect(result.snapshot).toEqual(snapshotBattle(state));
  });
});

defineSelectedIdentityReplayWitness({
  describeLabel: "Feral Instinct selected identity replay",
  taskId: "FACTORY-578",
  initialProjection: { selectedAdvantage: false, unselectedNormal: false },
  units: [
    {
      unitId: "barbarian_feral_instinct",
      procedures: [
        {
          actionName: "doProjectSelectedInitiative",
          discover: () => {
            const selected = barbarianSession(7);
            const unselected = barbarianSession(6);
            return {
              selectedAdvantage:
                requiredInitiativeRollModeForCombatant(
                  selected.session.state,
                  selected.actorId,
                ) === "advantage",
              unselectedNormal:
                requiredInitiativeRollModeForCombatant(
                  unselected.session.state,
                  unselected.actorId,
                ) === undefined,
            };
          },
          projectionAfter: { selectedAdvantage: true, unselectedNormal: true },
        },
      ],
    },
  ],
});
defineSelectedIdentityReplayWitness({
  describeLabel: "Instinctive Pounce selected identity replay",
  taskId: "FACTORY-579",
  initialProjection: { movementAccepted: false, bonusActionSpent: false },
  units: [
    {
      unitId: "barbarian_instinctive_pounce",
      procedures: [
        {
          actionName: "doEnterWithMovement",
          discover: () => {
            const fixture = rageMovement();
            const result = requireResolved(
              resolveBattleSubject({
                state: fixture.state,
                subject: fixture.subject,
                fills: [fixture.decision, movementFill(fixture.hole, 20)],
              }),
            );
            return {
              movementAccepted: result.movements?.[0]?.movementCostFeet === 20,
              bonusActionSpent:
                !result.state.currentTurnResources.currentHasBonusAction,
            };
          },
          projectionAfter: { movementAccepted: true, bonusActionSpent: true },
        },
      ],
    },
  ],
});
