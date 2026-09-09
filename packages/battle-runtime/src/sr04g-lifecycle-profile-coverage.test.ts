import fc from "fast-check";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { D6RollResult, movementDeltaFeet } from "@dnd/shared/types";
import type { SpellMechanics } from "@dnd/surface/surface/types";

import {
  afterActiveEffectOccurrenceUpdate,
  isEndTurnFillKind,
  statBlockRechargeRollFillMatchesHole,
  tickBattleStateDurationEffects,
  tickDurationEffects,
  updateCombatantWithActiveEffectOccurrence,
} from "./battle-reducer/turn-boundary-lifecycle.ts";
import { directionalPersistentAreaProfile } from "./battle-reducer/spell-procedure-profiles/directional-persistent-area.ts";
import { markedDamageRiderProfile } from "./battle-reducer/spell-procedure-profiles/marked-damage-rider.ts";
import { ongoingSpellEndProfile } from "./battle-reducer/spell-procedure-profiles/ongoing-spell-end.ts";
import { rollModifierProfile } from "./battle-reducer/spell-procedure-profiles/roll-modifier.ts";
import { scalarBuffProfile } from "./battle-reducer/spell-procedure-profiles/scalar-buff.ts";
import { weaponDamageRiderProfile } from "./battle-reducer/spell-procedure-profiles/weapon-damage-rider.ts";
import { spellProcedureExecution } from "./character-execution-admission.ts";
import {
  battleId,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  characterSeed,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  monsterResourceStatBlockWithTwoRechargeActions,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";
import {
  contextFor,
  mechanicsSource,
} from "./battle-reducer/spell-procedure-profiles/support-spell-procedure-admission.test-support.js";
import { projectSpellDefinitionRuleFacts } from "./procedure-admission/spell-definition-rule-facts.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";

const PROPERTY_OPTIONS = { numRuns: 32, seed: 0x5a04_2026 } as const;

function expectSupported<T extends { readonly tag: string }>(
  result: T,
): Extract<T, { readonly tag: "supported" }> {
  expect(result.tag).toBe("supported");
  if (result.tag !== "supported") {
    throw new Error(`Expected supported admission, got ${result.tag}.`);
  }
  return result as Extract<T, { readonly tag: "supported" }>;
}

function expectUnsupported(result: { readonly tag: string }): void {
  expect(result.tag).toBe("unsupported");
}

function source(spellId: string): BattleSpellAdmissionSource {
  return spellAdmissionSource(spellRecord(spellId));
}

function sourceWith(
  spellId: string,
  update: (mechanics: SpellMechanics) => SpellMechanics,
): ReturnType<typeof mechanicsSource> {
  const base = source(spellId);
  const mechanics = update(base.mechanics);
  return mechanicsSource({
    ...base,
    mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
  });
}

function mutatedSource(
  spellId: string,
  update: (mechanics: SpellMechanics) => void,
): BattleSpellAdmissionSource {
  const base = source(spellId);
  const mechanics = structuredClone(base.mechanics) as SpellMechanics;
  update(mechanics);
  return {
    ...base,
    mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
  };
}

describe("SR-04 spell profile admission coverage", () => {
  test.each([
    ["scalar buff", scalarBuffProfile, "false_life"],
    ["roll modifier", rollModifierProfile, "bless"],
    ["directional area", directionalPersistentAreaProfile, "gust_of_wind"],
    ["ongoing spell end", ongoingSpellEndProfile, "dispel_magic"],
    ["marked damage rider", markedDamageRiderProfile, "hunters_mark"],
    ["weapon damage rider", weaponDamageRiderProfile, "divine_favor"],
  ] as const)("admits canonical %s mechanics", (_label, profile, spellId) => {
    expectSupported(profile.admitMechanics(mechanicsSource(source(spellId))));
  });

  test("projects every scalar-buff execution branch from canonical mechanics", () => {
    for (const spellId of [
      "false_life",
      "longstrider",
      "spider_climb",
      "fly",
      "aid",
      "shield_of_faith",
      "barkskin",
    ] as const) {
      const spell = source(spellId);
      const result = expectSupported(
        scalarBuffProfile.admitMechanics(mechanicsSource(spell)),
      );
      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(spell),
        contextFor(spell.castingSource),
      );
      expect(invocations.length).toBeGreaterThan(0);
      for (const invocation of invocations) {
        const decoded = Schema.decodeUnknownResult(
          scalarBuffProfile.executionSchema,
        )(spellProcedureExecution(invocation));
        expect(Result.isSuccess(decoded)).toBe(true);
      }
    }
  });

  test("keeps scalar-buff unsupported projection typed for malformed branches", () => {
    const mutations = [
      mutatedSource("false_life", (mechanics) => {
        if (mechanics.family !== "activation") return;
        const phase = mechanics.phases[0];
        const effect =
          phase?.kind === "direct" ? phase.effects?.[0] : undefined;
        if (effect?.kind !== "grant_temp_hp") return;
        Reflect.set(effect, "amount", {
          kind: "fixed",
          expr: { dice: 1, dieSize: 0, flat: 0, spellcastingMod: false },
        });
      }),
      mutatedSource("longstrider", (mechanics) => {
        if (mechanics.family !== "activation") return;
        const phase = mechanics.phases[0];
        const effect =
          phase?.kind === "direct" ? phase.effects?.[0] : undefined;
        if (effect?.kind !== "modify_speed") return;
        Reflect.set(effect, "unit", "meters");
      }),
      mutatedSource("spider_climb", (mechanics) => {
        if (mechanics.family !== "activation") return;
        const phase = mechanics.phases[0];
        const effect =
          phase?.kind === "direct" ? phase.effects?.[0] : undefined;
        if (effect?.kind !== "grant_speed") return;
        Reflect.set(effect, "hover", true);
      }),
      mutatedSource("aid", (mechanics) => {
        if (mechanics.family !== "activation") return;
        const phase = mechanics.phases[0];
        const effect =
          phase?.kind === "direct" ? phase.effects?.[0] : undefined;
        if (effect?.kind !== "modify_max_hp") return;
        Reflect.set(effect, "direction", "decrease");
      }),
    ];
    for (const candidate of mutations) {
      expectUnsupported(scalarBuffProfile.admitMechanics(candidate));
    }
  });

  test("covers roll-modifier activation, ongoing, and area fallback rejection", () => {
    const candidates = [
      mutatedSource("bane", (mechanics) => {
        if (mechanics.family !== "activation") return;
        const phase = mechanics.phases[0];
        if (phase?.kind !== "save_gate") return;
        Reflect.set(phase, "onFail", { kind: "none" });
      }),
      mutatedSource("guidance", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return;
        Reflect.set(mechanics, "operations", []);
      }),
      mutatedSource("pass_without_trace", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return;
        Reflect.set(mechanics, "attachment", {
          kind: "area",
          shape: { kind: "emanation", radiusFeet: 30 },
          origin: { kind: "point", point: "synthetic" },
        });
      }),
      mutatedSource("enhance_ability", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return;
        const operation = mechanics.operations[0];
        if (
          operation === undefined ||
          operation.effect.kind !== "modify_roll_advantage"
        ) {
          return;
        }
        Reflect.set(operation.effect, "mode", "disadvantage");
      }),
    ];
    for (const candidate of candidates) {
      expectUnsupported(rollModifierProfile.admitMechanics(candidate));
    }

    for (const spellId of ["bless", "guidance", "bane"] as const) {
      const spell = source(spellId);
      const admitted = expectSupported(
        rollModifierProfile.admitMechanics(mechanicsSource(spell)),
      );
      const invocations = admitted.admitted.admit(
        battleSpellExecutionSourceFromAdmission(spell),
        contextFor(spell.castingSource),
      );
      expect(invocations.length).toBeGreaterThan(0);
    }
  });

  test("covers directional persistent-area role assignment and malformed operation shells", () => {
    const spell = source("gust_of_wind");
    const admitted = expectSupported(
      directionalPersistentAreaProfile.admitMechanics(mechanicsSource(spell)),
    );
    const invocations = admitted.admitted.admit(
      battleSpellExecutionSourceFromAdmission(spell),
      contextFor(spell.castingSource),
    );
    expect(invocations).toHaveLength(1);
    const decoded = Schema.decodeUnknownResult(
      directionalPersistentAreaProfile.executionSchema,
    )(spellProcedureExecution(invocations[0]));
    expect(Result.isSuccess(decoded)).toBe(true);

    const malformed = [
      sourceWith("gust_of_wind", (mechanics) => ({
        ...mechanics,
        duration: { kind: "timed", value: { unit: "minute", amount: 1 } },
      })),
      sourceWith("gust_of_wind", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        return { ...mechanics, operations: mechanics.operations.slice(0, 2) };
      }),
      sourceWith("gust_of_wind", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const operation = mechanics.operations[0];
        if (operation === undefined) return mechanics;
        return {
          ...mechanics,
          operations: [
            {
              ...operation,
              effect: {
                kind: "area_movement_cost_multiplier",
                multiplier: 3,
                appliesTo: "toward_source",
              },
            },
            ...mechanics.operations.slice(1),
          ],
        };
      }),
    ];
    for (const candidate of malformed) {
      expectUnsupported(
        directionalPersistentAreaProfile.admitMechanics(candidate),
      );
    }
  });

  test("covers ongoing-spell-end direct/check phases and typed rejection", () => {
    const spell = source("dispel_magic");
    const admitted = expectSupported(
      ongoingSpellEndProfile.admitMechanics(mechanicsSource(spell)),
    );
    const invocations = admitted.admitted.admit(
      battleSpellExecutionSourceFromAdmission(spell),
      contextFor(spell.castingSource),
    );
    expect(invocations).toHaveLength(1);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ongoingSpellEndProfile.executionSchema)(
          spellProcedureExecution(invocations[0]),
        ),
      ),
    ).toBe(true);

    const malformed = [
      sourceWith("dispel_magic", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        return { ...mechanics, phases: [...mechanics.phases].reverse() };
      }),
      sourceWith("dispel_magic", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const phase = mechanics.phases[1];
        if (phase?.kind !== "ability_check_gate") return mechanics;
        return {
          ...mechanics,
          phases: mechanics.phases.map((candidate) =>
            candidate === phase
              ? { ...phase, onPass: { kind: "none" } }
              : candidate,
          ),
        };
      }),
      sourceWith("dispel_magic", (mechanics) => ({
        ...mechanics,
        range: { kind: "point", feet: 30 },
      })),
    ];
    for (const candidate of malformed) {
      expectUnsupported(ongoingSpellEndProfile.admitMechanics(candidate));
    }
  });

  test("covers marked and weapon damage-rider lifecycle admission variants", () => {
    for (const spellId of ["hunters_mark", "hex"] as const) {
      const spell = source(spellId);
      const admitted = expectSupported(
        markedDamageRiderProfile.admitMechanics(mechanicsSource(spell)),
      );
      const invocations = admitted.admitted.admit(
        battleSpellExecutionSourceFromAdmission(spell),
        contextFor(spell.castingSource),
      );
      expect(invocations.length).toBeGreaterThan(0);
    }
    const markedMalformed = [
      sourceWith("hunters_mark", (mechanics) => {
        if (
          mechanics.family !== "ongoing_effect" ||
          mechanics.attachment.kind !== "hole"
        ) {
          return mechanics;
        }
        return {
          ...mechanics,
          attachment: {
            ...mechanics.attachment,
            value: {
              ...mechanics.attachment.value,
              transfer: {
                ...mechanics.attachment.value.transfer,
                availability: { kind: "later_turn_after_trigger" },
              },
            },
          },
        };
      }),
      sourceWith("hex", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        return { ...mechanics, operations: mechanics.operations.slice(0, 1) };
      }),
    ];
    for (const candidate of markedMalformed) {
      expectUnsupported(markedDamageRiderProfile.admitMechanics(candidate));
    }

    const spell = source("divine_favor");
    const admitted = expectSupported(
      weaponDamageRiderProfile.admitMechanics(mechanicsSource(spell)),
    );
    const invocations = admitted.admitted.admit(
      battleSpellExecutionSourceFromAdmission(spell),
      contextFor(spell.castingSource),
    );
    expect(invocations).toHaveLength(1);
    const malformed = sourceWith("divine_favor", (mechanics) => {
      if (mechanics.family !== "ongoing_effect") return mechanics;
      return { ...mechanics, operations: [] };
    });
    expectUnsupported(weaponDamageRiderProfile.admitMechanics(malformed));
  });
});

describe("SR-04 turn-boundary lifecycle coverage", () => {
  test("end-turn fill vocabulary is a stable closed set", () => {
    const knownKinds = [
      "attackDamageDisposition",
      "persistentAreaSourceTurnTranslation",
      "startTurnOccurrenceOrder",
      "temporaryHitPointChoice",
      "concentrationSavingThrow",
      "deathSavingThrow",
      "rolledDice",
      "savingThrowOutcome",
      "statBlockRechargeRoll",
    ] as const;
    for (const kind of knownKinds) {
      expect(isEndTurnFillKind(kind)).toBe(true);
    }
    expect(isEndTurnFillKind("targetChoice")).toBe(false);
  });

  test("recharge matching is permutation-invariant and rejects missing or duplicate targets", () => {
    const state = startBattleRight({
      battleId: battleId("sr04g-recharge-matching"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: monsterResourceStatBlockWithTwoRechargeActions(),
        }),
      ],
    });
    const goblin = state.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error(
        "Expected the fixture goblin to be a Stat Block combatant.",
      );
    }
    const targets = goblin.origin.execution.resourcePools
      .filter((pool) => pool.kind === "recharge")
      .map((pool) => pool.resourcePoolRef);
    if (targets.length < 2) {
      throw new Error("Expected at least two recharge targets in the fixture.");
    }
    const [first, second] = targets;
    if (first === undefined || second === undefined) {
      throw new Error("Expected two recharge targets.");
    }
    const hole = {
      kind: "statBlockRechargeRoll" as const,
      holeId: holeId("battle:sr04g:recharge-hole"),
      holeInstanceKey: holeInstanceKey("battle:sr04g:recharge-hole"),
      label: "Synthetic recharge roll",
      combatantId: goblinId,
      rechargeTargets: [first, second],
    };
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 6 }),
        fc.boolean(),
        (firstRoll, secondRoll, reverse) => {
          const results = [
            { target: first, roll: D6RollResult(firstRoll) },
            { target: second, roll: D6RollResult(secondRoll) },
          ];
          expect(
            statBlockRechargeRollFillMatchesHole(
              reverse ? results.reverse() : results,
              hole,
            ),
          ).toBe(true);
        },
      ),
      PROPERTY_OPTIONS,
    );
    expect(
      statBlockRechargeRollFillMatchesHole(
        [{ target: first, roll: D6RollResult(1) }],
        hole,
      ),
    ).toBe(false);
    expect(
      statBlockRechargeRollFillMatchesHole(
        [
          { target: first, roll: D6RollResult(1) },
          { target: first, roll: D6RollResult(6) },
        ],
        hole,
      ),
    ).toBe(false);
  });

  test("duration ticking preserves non-expiring effects and decrements exactly once", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (duration) => {
        const sourceProcedureRef = battleProcedureExecutionRefForTest(
          `sr04g-duration-${duration}`,
        );
        const effect = {
          kind: "nextAttackRollBySelf" as const,
          sourceProcedureRef,
          sourceCombatantId: fighterId,
          mode: "advantage" as const,
          expiresAt: {
            kind: "duration" as const,
            durationTicks: elapsedTimeTicks(duration),
          },
        };
        const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
          state: fighterVsGoblinBattle(),
          occurrences: [{ kind: "activeEffect", ownerId: goblinId, effect }],
        });
        const occurrence = allocated.occurrences[0];
        if (occurrence?.kind !== "activeEffect") {
          throw new Error("Expected allocated active-effect occurrence.");
        }
        const ticked = tickDurationEffects(allocated.state.combatants);
        const activeEffects = ticked.value.get(goblinId)?.activeEffects ?? [];
        if (duration === 1) {
          expect(activeEffects).toEqual([]);
        } else {
          expect(activeEffects).toEqual([
            expect.objectContaining({
              effectRef: occurrence.effect.effectRef,
              expiresAt: {
                kind: "duration",
                durationTicks: elapsedTimeTicks(duration - 1),
              },
            }),
          ]);
        }
        expect(ticked.value.get(fighterId)).toBeDefined();
      }),
      PROPERTY_OPTIONS,
    );
  });

  test("occurrence updates are identity-safe and callback application is discriminated", () => {
    const state = fighterVsGoblinBattle();
    const effect = {
      kind: "speedDelta" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest("sr04g-update"),
      sourceCombatantId: fighterId,
      deltaFeet: movementDeltaFeet(10),
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(2),
      },
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state,
      occurrences: [{ kind: "activeEffect", ownerId: goblinId, effect }],
    });
    const occurrence = allocated.occurrences[0];
    if (occurrence?.kind !== "activeEffect") {
      throw new Error("Expected allocated active-effect occurrence.");
    }
    const stale = {
      ...occurrence.effect,
      effectRef: battleEffectExecutionRefForTest("sr04g-stale"),
    };
    const unchanged = updateCombatantWithActiveEffectOccurrence(
      allocated.state.combatants,
      goblinId,
      stale,
      () => {
        throw new Error("Stale occurrence must not call its update callback.");
      },
    );
    expect(unchanged.tag).toBe("unchanged");
    expect(
      afterActiveEffectOccurrenceUpdate(unchanged, () => {
        throw new Error("Unchanged update must not call its callback.");
      }),
    ).toBe(unchanged.combatants);

    const updated = updateCombatantWithActiveEffectOccurrence(
      allocated.state.combatants,
      goblinId,
      occurrence.effect,
      (target) => ({ ...target, movementSpentFeet: target.movementSpentFeet }),
    );
    expect(updated.tag).toBe("updated");
    expect(
      afterActiveEffectOccurrenceUpdate(updated, (combatants) => combatants),
    ).toBe(updated.combatants);
  });

  test("state duration ticking reconciles the current actor constraint", () => {
    const state = fighterVsGoblinBattle();
    const result = tickBattleStateDurationEffects(state);
    expect(result.value.combatants).not.toBe(state.combatants);
    expect(result.flySpeedGrantEndFallCleanupFrames).toEqual([]);
    expect(result.spellEndTargetStatePromotionIds).toEqual([]);
  });
});
