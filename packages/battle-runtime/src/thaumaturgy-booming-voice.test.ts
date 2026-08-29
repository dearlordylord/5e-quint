import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L1D2-THAUMATURGY-BOOMING-VOICE thaumaturgy
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-self-ability-check-advantage
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
import {
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
import { Schema } from "effect";
import * as Result from "effect/Result";
import { describe, expect, test } from "vitest";

import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import thaumaturgyInput from "../../surface/content/thaumaturgy.json";

import {
  battleId,
  assertBattleSnapshotCodecRoundTripForTest,
  cantripSpellInvocationRef,
  characterSeed,
  difficultyClass,
  elapsedTimeTicks,
  fighterId,
  findAct,
  findHole,
  goblinId,
  requiredAbilityCheckRollMode,
  requireNeedsHoles,
  requireResolved,
  resolveBattleSubject,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  battleActSpellPresentation,
  BattleFillSchema,
  BattleHoleSchema,
  thaumaturgyBoomingVoiceInfluenceAbilityCheckHole,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
} from "./index.ts";
import { decodeSpellRecordForTest } from "./unit-profile-admission-spell-record.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { maybeSpellAct } from "./unit-profile-admission-spell-fill.test-support.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const unitCatalog =
  unitCatalogResult.tag === "ok"
    ? unitCatalogResult.catalog
    : (() => {
        throw new Error("Thaumaturgy test Unit catalog must build.");
      })();
const thaumaturgy = requireThaumaturgySpell();

const thaumaturgySubject = {
  tag: "actionSpell" as const,
  actorId: fighterId,
  invocation: cantripSpellInvocationRef(
    "thaumaturgy",
    "temporaryAbilityCheckRollMode",
  ),
  mode: { tag: "cast" as const },
};

describe("Thaumaturgy Booming Voice", () => {
  test("admits the SRD cantrip and asks for the active 1-minute effect count witness", () => {
    const state = battleWithThaumaturgy();
    const act = findAct(state, thaumaturgySubject);
    const countHole = findThaumaturgyCountHole(act.initialHoles);
    const decodedHole = Schema.decodeUnknownResult(BattleHoleSchema)(countHole);
    const fill = thaumaturgyCountFill(countHole, 0);
    const decodedFill = Schema.decodeUnknownResult(BattleFillSchema)(fill);

    expect(battleActSpellPresentation(act)?.invocation).toEqual(
      thaumaturgySubject.invocation,
    );
    expect(act.initialHoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "temporaryAbilityCheckRollModeActiveEffectCount",
          label: "Spell total active 1-minute effects",
          maximumActiveOneMinuteEffects: 3,
          requiresTableSpellEffectCount: true,
        }),
      ]),
    );
    expect(Result.isSuccess(decodedHole)).toBe(true);
    expect(Result.isSuccess(decodedFill)).toBe(true);
  });

  test("requires the cap witness and rejects casts when three 1-minute effects are already active", () => {
    const state = battleWithThaumaturgy();
    const act = findAct(state, thaumaturgySubject);
    const missing = requireNeedsHoles(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [],
      }),
    );
    const countHole = findThaumaturgyCountHole(missing.holes);
    assertBattleSnapshotCodecRoundTripForTest(missing.snapshot);
    const rejected = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [thaumaturgyCountFill(countHole, 3)],
    });

    expect(countHole.maximumActiveOneMinuteEffects).toBe(3);
    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("refreshes Booming Voice at the cap because it replaces the caster-owned runtime effect", () => {
    const first = castThaumaturgy(battleWithThaumaturgy(), 0);
    const refreshed = castThaumaturgy(withFreshMagicAction(first), 3);

    expect(temporaryAbilityCheckRollModeEffectCount(first)).toBe(1);
    expect(temporaryAbilityCheckRollModeEffectCount(refreshed)).toBe(1);
    expect(refreshed.state.currentTurnResources.actionResources).toEqual([]);
    expect(
      thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(
        refreshed.state,
        fighterId,
        difficultyClass(13),
      ),
    ).toMatchObject({
      kind: "abilityCheck",
      ability: "cha",
      skill: "intimidation",
      rollMode: "advantage",
    });
  });

  test("rejects a total count witness that omits the active Booming Voice effect", () => {
    const first = withFreshMagicAction(
      castThaumaturgy(battleWithThaumaturgy(), 0),
    );
    const act = findAct(first, thaumaturgySubject);
    const countHole = findThaumaturgyCountHole(act.initialHoles);
    const rejected = resolveBattleSubject({
      state: first.state,
      subject: act.subject,
      fills: [thaumaturgyCountFill(countHole, 0)],
    });

    expect(temporaryAbilityCheckRollModeEffectCount(first)).toBe(1);
    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("casts Booming Voice, spends the Magic action, and projects Charisma Intimidation Advantage", () => {
    const state = battleWithThaumaturgy();
    const resolved = castThaumaturgy(state, 2);
    const caster = resolved.state.combatants.get(fighterId);

    expect(caster?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "temporaryAbilityCheckRollMode",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: fighterId,
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    );
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    expect(resolved.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
      [],
    );
    expect(caster?.concentration).toBeNull();

    expect(
      thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(
        resolved.state,
        fighterId,
        difficultyClass(13),
      ),
    ).toMatchObject({
      kind: "abilityCheck",
      ability: "cha",
      skill: "intimidation",
      rollMode: "advantage",
    });
    expect(
      requiredAbilityCheckRollMode(resolved.state, fighterId, "wis", {
        skill: "intimidation",
      }),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(resolved.state, fighterId, "cha", {
        skill: "perception",
      }),
    ).toBeUndefined();
  });

  test("cancels against Hex Disadvantage on Charisma checks", () => {
    const resolved = castThaumaturgy(battleWithThaumaturgy(), 0);
    const cancelled = withHexCharismaDisadvantage(resolved.state);

    expect(
      thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(
        cancelled,
        fighterId,
        difficultyClass(13),
      ),
    ).toHaveProperty("rollMode", "normal");
  });

  test("rejects unsupported synthetic Booming Voice operation, filter, and attachment profiles", () => {
    type ThaumaturgyModeOptionInput =
      (typeof thaumaturgyInput.mechanics.mode.options)[number];
    type ThaumaturgyEffectInput = Extract<
      ThaumaturgyModeOptionInput,
      { readonly effects: readonly unknown[] }
    >["effects"][number];
    const unsupportedEffectMutations = {
      synthetic_thaumaturgy_numeric_effect: () => ({
        kind: "modify_roll_numeric" as const,
        delta: {
          kind: "fixed_number" as const,
          amount: 1,
          sign: "+" as const,
        },
        on: ["ability_check"] as const,
      }),
      synthetic_thaumaturgy_ability_filter_shape: (
        effect: ThaumaturgyEffectInput,
      ) => ({
        ...effect,
        abilityFilter: {
          kind: "same_choice_as" as const,
          holeId: "synthetic_thaumaturgy_ability_choice",
        },
      }),
      synthetic_thaumaturgy_against_self: (effect: ThaumaturgyEffectInput) => ({
        ...effect,
        affects: "rolls_against_self" as const,
      }),
      synthetic_thaumaturgy_skill_choice: (effect: ThaumaturgyEffectInput) => ({
        ...effect,
        skillFilter: {
          kind: "choice" as const,
          options: ["intimidation", "persuasion"] as const,
        },
      }),
    } as const;

    for (const [id, mutateEffect] of Object.entries(
      unsupportedEffectMutations,
    )) {
      const spell = decodeSpellRecordForTest({
        ...thaumaturgyInput,
        id,
        name: id,
        provenance: { kind: "synthetic-test", section: id },
        mechanics: {
          ...thaumaturgyInput.mechanics,
          mode: {
            ...thaumaturgyInput.mechanics.mode,
            options: thaumaturgyInput.mechanics.mode.options.map((option) =>
              "effects" in option
                ? {
                    ...option,
                    effects: option.effects.map((effect) =>
                      mutateEffect(effect),
                    ),
                  }
                : option,
            ),
          },
        },
      });

      expect(
        // This goes through the public spell-admission/discovery API.
        maybeSpellAct({
          session: spellBattle({ cantrips: [spell] }),
          spellId: spell.id,
        }),
      ).toBeUndefined();
    }
  });
});

function battleWithThaumaturgy(): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle-thaumaturgy-booming-voice"),
    combatants: [
      characterSeed({
        initiative: 20,
        classLevels: [{ className: "cleric", level: 1 }],
        spellcasting: {
          ...wizardSpellcasting({
            cantrips: [thaumaturgy],
            preparedSpells: [],
            spellSlots: [],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "cleric",
            abilityModifier: 3,
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function requireThaumaturgySpell(): SpellRecord {
  const unit = unitCatalog.requireUnit("thaumaturgy");
  if (unit.kind !== "spell") {
    throw new Error("Thaumaturgy test Unit must be a spell.");
  }
  return unit;
}

function castThaumaturgy(
  session: BattleRuntimeSession,
  activeOneMinuteEffectCount: number,
): BattleRuntimeSession {
  const act = findAct(session, thaumaturgySubject);
  const countHole = findThaumaturgyCountHole(act.initialHoles);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [thaumaturgyCountFill(countHole, activeOneMinuteEffectCount)],
    }),
  );
  return battleRuntimeSessionForTest({ ...session, state: resolved.state });
}

function withFreshMagicAction(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  return battleRuntimeSessionForTest({
    ...session,
    state: {
      ...session.state,
      currentTurnResources: {
        ...session.state.currentTurnResources,
        actionResources: [{ kind: "action", source: "turn" }],
      },
    },
  });
}

function temporaryAbilityCheckRollModeEffectCount(
  session: BattleRuntimeSession,
): number {
  return (
    session.state.combatants
      .get(fighterId)
      ?.activeEffects.filter(
        (effect) => effect.kind === "temporaryAbilityCheckRollMode",
      ).length ?? 0
  );
}

function findThaumaturgyCountHole(holes: readonly BattleHole[]) {
  const hole = findHole(
    holes,
    "temporaryAbilityCheckRollModeActiveEffectCount",
  );
  if (hole.kind !== "temporaryAbilityCheckRollModeActiveEffectCount") {
    throw new Error("Expected Thaumaturgy active-effect count hole.");
  }
  return hole;
}

function thaumaturgyCountFill(
  hole: ReturnType<typeof findThaumaturgyCountHole>,
  activeOneMinuteEffectCount: number,
): BattleFill {
  return {
    kind: "temporaryAbilityCheckRollModeActiveEffectCount",
    holeId: hole.holeId,
    value: { activeOneMinuteEffectCount },
  };
}

function withHexCharismaDisadvantage(state: BattleState): BattleState {
  const source = state.combatants.get(goblinId);
  if (source === undefined) {
    throw new Error("Expected Hex source combatant.");
  }
  const hexEffect = {
    kind: "spellMarkedDamageRider",
    effectRef: battleEffectExecutionRefForTest("booming-voice-hex"),
    sourceProcedureRef: battleProcedureExecutionRefForTest(String("hex")),
    sourceCombatantId: goblinId,
    targetCombatantId: fighterId,
    transfer: {
      kind: "awaitingTargetDrop",
      retargetTiming: "sameTurn",
    },
    abilityCheckBehavior: { kind: "abilityDisadvantage", ability: "cha" },
    damage: { expr: { dice: 1, dieSize: 6 }, damageType: "necrotic" },
    expiresAt: {
      kind: "concentration",
      combatantId: goblinId,
      durationTicks: elapsedTimeTicks(600),
    },
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "spellMarkedDamageRider" }
  >;
  return {
    ...state,
    combatants: new Map(state.combatants).set(goblinId, {
      ...source,
      activeEffects: [...source.activeEffects, hexEffect],
    }),
  };
}
