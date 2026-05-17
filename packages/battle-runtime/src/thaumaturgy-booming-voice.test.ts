// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L1D2-THAUMATURGY-BOOMING-VOICE thaumaturgy
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-self-ability-check-advantage
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  BattleFillSchema,
  BattleHoleSchema,
  thaumaturgyBoomingVoiceInfluenceAbilityCheckHole,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleState,
} from "./index.ts";
import {
  battleId,
  cantripSpellInvocationRef,
  characterSeed,
  difficultyClass,
  discoverBattleActs,
  elapsedTimeTicks,
  fighterId,
  findAct,
  findHole,
  goblinId,
  requiredAbilityCheckRollMode,
  requireNeedsHoles,
  requireResolved,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";

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
    "thaumaturgyBoomingVoice",
  ),
  mode: { tag: "cast" as const },
};

describe("Thaumaturgy Booming Voice", () => {
  test("admits the SRD cantrip and asks for the active 1-minute effect count witness", () => {
    const state = battleWithThaumaturgy();
    const act = findAct(state, thaumaturgySubject);
    const countHole = findThaumaturgyCountHole(act.initialHoles);
    const decodedHole = Schema.decodeUnknownEither(BattleHoleSchema)(countHole);
    const fill = thaumaturgyCountFill(countHole, 0);
    const decodedFill = Schema.decodeUnknownEither(BattleFillSchema)(fill);

    expect(discoverBattleActs(state)).toContainEqual(
      expect.objectContaining({
        subject: thaumaturgySubject,
        initialHoles: expect.arrayContaining([
          expect.objectContaining({
            kind: "thaumaturgyActiveOneMinuteEffectCount",
            label: "Thaumaturgy total active 1-minute effects",
            maximumActiveOneMinuteEffects: 3,
            requiresTableSpellEffectCount: true,
          }),
        ]),
      }),
    );
    expect(Either.isRight(decodedHole)).toBe(true);
    expect(Either.isRight(decodedFill)).toBe(true);
  });

  test("requires the cap witness and rejects casts when three 1-minute effects are already active", () => {
    const state = battleWithThaumaturgy();
    const missing = requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject: thaumaturgySubject,
        fills: [],
      }),
    );
    const countHole = findThaumaturgyCountHole(missing.holes);
    const rejected = resolveBattleSubject({
      state,
      subject: thaumaturgySubject,
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

    expect(thaumaturgyBoomingVoiceEffectCount(first)).toBe(1);
    expect(thaumaturgyBoomingVoiceEffectCount(refreshed)).toBe(1);
    expect(refreshed.currentTurnResources.actionResources).toEqual([]);
    expect(
      thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(
        refreshed,
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
      state: first,
      subject: thaumaturgySubject,
      fills: [thaumaturgyCountFill(countHole, 0)],
    });

    expect(thaumaturgyBoomingVoiceEffectCount(first)).toBe(1);
    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("casts Booming Voice, spends the Magic action, and projects Charisma Intimidation Advantage", () => {
    const state = battleWithThaumaturgy();
    const resolved = castThaumaturgy(state, 2);
    const caster = resolved.combatants.get(fighterId);

    expect(caster?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "thaumaturgyBoomingVoice",
        sourceSpellId: "thaumaturgy",
        sourceCombatantId: fighterId,
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    );
    expect(resolved.currentTurnResources.actionResources).toEqual([]);
    expect(resolved.currentTurnResources.spellSlotUsesThisTurn).toEqual([]);
    expect(caster?.concentration).toBeNull();

    expect(
      thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(
        resolved,
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
      requiredAbilityCheckRollMode(resolved, fighterId, "wis", {
        skill: "intimidation",
      }),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(resolved, fighterId, "cha", {
        skill: "perception",
      }),
    ).toBeUndefined();
  });

  test("cancels against Hex Disadvantage on Charisma checks", () => {
    const resolved = castThaumaturgy(battleWithThaumaturgy(), 0);
    const cancelled = withHexCharismaDisadvantage(resolved);

    expect(
      thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(
        cancelled,
        fighterId,
        difficultyClass(13),
      ),
    ).not.toHaveProperty("rollMode");
  });
});

function battleWithThaumaturgy(): BattleState {
  return startBattleRight({
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
          sourceClassName: "cleric",
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
  state: BattleState,
  activeOneMinuteEffectCount: number,
): BattleState {
  const act = findAct(state, thaumaturgySubject);
  const countHole = findThaumaturgyCountHole(act.initialHoles);
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: thaumaturgySubject,
      fills: [thaumaturgyCountFill(countHole, activeOneMinuteEffectCount)],
    }),
  ).state;
}

function withFreshMagicAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [{ kind: "action", source: "turn" }],
    },
  };
}

function thaumaturgyBoomingVoiceEffectCount(state: BattleState): number {
  return (
    state.combatants
      .get(fighterId)
      ?.activeEffects.filter(
        (effect) => effect.kind === "thaumaturgyBoomingVoice",
      ).length ?? 0
  );
}

function findThaumaturgyCountHole(holes: readonly BattleHole[]) {
  const hole = findHole(holes, "thaumaturgyActiveOneMinuteEffectCount");
  if (hole.kind !== "thaumaturgyActiveOneMinuteEffectCount") {
    throw new Error("Expected Thaumaturgy active-effect count hole.");
  }
  return hole;
}

function thaumaturgyCountFill(
  hole: ReturnType<typeof findThaumaturgyCountHole>,
  activeOneMinuteEffectCount: number,
): BattleFill {
  return {
    kind: "thaumaturgyActiveOneMinuteEffectCount",
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
    sourceSpellId: "hex",
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
