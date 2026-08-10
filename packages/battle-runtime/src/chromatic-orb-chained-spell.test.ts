import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-chained-attack-damage spell.invocation-warding-bond-linked-effect
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE
import * as Either from "effect/Either";
import { battleStatBlockCombatantSource } from "./stat-block-combatant-admission.ts";
import { describe, expect, test } from "vitest";
import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActCandidates,
  discoverBattleActs,
  initiativeScore,
  startBattle,
  type BattleActiveEffect,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { spellId } from "./identity.ts";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import chromaticOrbInput from "../../surface/content/chromatic_orb.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import {
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  battleProcedureExecutionRefForSpellHoleForTest,
  characterBattleFeatureInitForTest,
  characterSpellInvocationForProcedureRefForTest,
  requireCharacterUnitProcedureRefForTest,
  resolveBattleSubject,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
} from "./battle-runtime.test-support.ts";
import { D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND } from "./battle-state-execution.ts";
import { battleD20TestNaturalOneRerollSupportForUnit } from "./unit-feature-support.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import { chainedSpellFillSet } from "./battle-reducer/spells-resolve-chained.ts";
import { damageRelationshipQuestionId } from "./battle-reducer/damage-relationship-question-id.ts";

const spellCasterId = combatantId("chromatic-orb-caster");
const firstTargetId = combatantId("chromatic-orb-first-target");
const secondTargetId = combatantId("chromatic-orb-second-target");
const thirdTargetId = combatantId("chromatic-orb-third-target");
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

if (statBlockCatalogResult.tag !== "ok") {
  throw new Error("Battle runtime chained spell test catalog must build.");
}

const statBlockCatalog = statBlockCatalogResult.catalog;
const chromaticOrb = decodeSpellRecord(chromaticOrbInput);
const syntheticD20TestNaturalOneReroll = decodeUnitRecordSync({
  id: "synthetic_d20_test_natural_one_reroll_fixture",
  kind: "species_trait",
  mechanics: {
    family: "d20_test_natural_one_reroll",
    optional: true,
    reroll: { kind: "reroll_triggering_d20", use: "new_roll" },
    trigger: { dieFace: 1, kind: "d20_test_roll_is" },
  },
  name: "Synthetic Natural-One Reroll Fixture",
  provenance: {
    kind: "synthetic-test",
    section: "battle-runtime synthetic chained spell reroll fixture",
  },
  species: "synthetic_fixture_species",
});
const syntheticZeroHitPointReplacement = decodeUnitRecordSync({
  id: "synthetic_zero_hit_point_replacement",
  kind: "species_trait",
  mechanics: {
    effect: { kind: "prevent_drop_to_0_hp", replacementHp: 1 },
    family: "triggered_replacement",
    optional: true,
    resetCadence: { kind: "long_rest" },
    trigger: { kind: "reduced_to_0_hp_not_killed_outright" },
  },
  name: "Synthetic Zero Hit Point Replacement",
  provenance: {
    kind: "synthetic-test",
    section: "battle-runtime synthetic zero-HP replacement fixture",
  },
  species: "synthetic_fixture_species",
});

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};

describe("Chromatic Orb chained spell attack", () => {
  test("is offered for the chained spell attack shape without requiring SRD identity", () => {
    const canonicalSession = chromaticOrbSession({ spellLevel: 1 });
    const canonicalAct = discoverBattleActs(canonicalSession).find(
      (candidate) => candidate.subject.tag === "actionSpell",
    );
    if (canonicalAct === undefined) {
      throw new Error("Expected canonical Chromatic Orb presentation.");
    }
    expect(battleActSpellPresentation(canonicalAct)?.invocation.spellId).toBe(
      "chromatic_orb",
    );

    const noncanonicalLookalike = {
      ...chromaticOrb,
      id: parseSharedUnitId("chained_spell_attack_fixture"),
      name: "Chained Spell Attack Fixture",
      provenance: {
        kind: "xphb",
        section: "battle-runtime chained spell attack test fixture",
      },
    } satisfies SpellRecord;
    const lookalikeSession = chromaticOrbSession({
      spellLevel: 1,
      spell: noncanonicalLookalike,
    });
    expect(
      discoverBattleActs(lookalikeSession).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            spellId(noncanonicalLookalike.id) &&
          battleActSpellPresentation(candidate)?.invocation.procedure ===
            "chainedSpellAttackDamage",
      ),
    ).toBe(true);
  });

  test("opens damage-type then step-scoped target, attack, and damage holes", () => {
    const state = chromaticOrbBattle({ spellLevel: 1 });
    const act = chromaticOrbAct(state);
    const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");

    expect(damageTypeHole.choices).toEqual([
      "acid",
      "cold",
      "fire",
      "lightning",
      "poison",
      "thunder",
    ]);

    const awaitingTarget = resolveNeedsHoles(state, act.subject, [
      damageTypeFill(damageTypeHole, "fire"),
    ]);
    const targetHole = requireHole(awaitingTarget.holes, "targetChoice");
    const awaitingAttack = resolveNeedsHoles(state, act.subject, [
      damageTypeFill(damageTypeHole, "fire"),
      spellTargetFill(targetHole, firstTargetId),
    ]);

    expect(requireHole(awaitingAttack.holes, "attackRoll").holeId).not.toEqual(
      targetHole.holeId,
    );
  });

  test("offers the D20 Test natural-one reroll before advancing the chain", () => {
    const state = chromaticOrbBattle({
      spellLevel: 1,
      casterNaturalOneRerollUnit: syntheticD20TestNaturalOneReroll,
    });
    const attack = chromaticOrbAttackFills(state, {
      damageType: "fire",
      targetId: firstTargetId,
      attackTotal: 6,
      naturalD20: 1,
    });
    const awaitingDecision = resolveNeedsHoles(
      state,
      attack.subject,
      attack.fills,
    );
    const decisionHole = requireHole(awaitingDecision.holes, "attackRoll");

    expect(decisionHole).toMatchObject({
      d20TestNaturalOneRerolls: [
        { effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND },
      ],
    });

    const rerolledAttack = {
      kind: "attackRoll" as const,
      holeId: decisionHole.holeId,
      value: {
        total: 6,
        naturalD20: DieRollResult(1),
        d20TestNaturalOneReroll: {
          kind: "reroll" as const,
          effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
          replacement: { total: 18, naturalD20: DieRollResult(13) },
        },
      },
    } satisfies Extract<BattleFill, { readonly kind: "attackRoll" }>;
    const awaitingDamage = resolveNeedsHoles(state, attack.subject, [
      ...attack.fills.slice(0, -1),
      rerolledAttack,
    ]);
    expect(requireHole(awaitingDamage.holes, "rolledDice").label).toContain(
      "3d8",
    );

    const declinedAttack = {
      ...rerolledAttack,
      value: {
        ...rerolledAttack.value,
        d20TestNaturalOneReroll: {
          kind: "decline" as const,
          effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
        },
      },
    } satisfies Extract<BattleFill, { readonly kind: "attackRoll" }>;
    const declined = resolveResolved(state, attack.subject, [
      ...attack.fills.slice(0, -1),
      declinedAttack,
    ]);
    expect(declined.state.combatants.get(firstTargetId)?.hp).toBe(12);
  });

  test("parses chained reaction facts and rejects invalid relationship and sight facts", () => {
    const session = chromaticOrbSession({ spellLevel: 1 });
    const act = chromaticOrbAct(session.state);
    const invocation = characterSpellInvocationForProcedureRefForTest(
      session,
      spellCasterId,
      act.subject.procedureRef,
    );
    if (invocation.procedure !== "chainedSpellAttackDamage") {
      throw new Error("Expected the Chromatic Orb chained-spell invocation.");
    }

    const reactionFactsFill = {
      kind: "targetSpatialFacts" as const,
      holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
      spatialFacts: [],
    } satisfies Extract<BattleFill, { readonly kind: "targetSpatialFacts" }>;
    const sideChannelParse = chainedSpellFillSet(
      [reactionFactsFill],
      invocation,
      spellCasterId,
      session.state,
    );
    expect(sideChannelParse).toMatchObject({
      tag: "ok",
      reactionSpellTargetFacts: [],
    });

    const relationshipFill = {
      kind: "damageRelationshipDecisions" as const,
      holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
      answers: [
        {
          questionId: damageRelationshipQuestionId(["synthetic-chained-spell"]),
          answer: false,
        },
      ],
    } satisfies Extract<
      BattleFill,
      { readonly kind: "damageRelationshipDecisions" }
    >;
    expect(
      chainedSpellFillSet(
        [relationshipFill],
        invocation,
        spellCasterId,
        session.state,
      ),
    ).toMatchObject({ tag: "invalid" });

    const typeFill = damageTypeFill(
      requireHole(act.initialHoles, "damageTypeChoice"),
      "fire",
    );
    const targetHole = requireHole(
      resolveNeedsHoles(session.state, act.subject, [typeFill]).holes,
      "targetChoice",
    );
    const targetFill = spellTargetFill(targetHole, firstTargetId);
    const duplicateSightFact = {
      kind: "attackAttackerCannotSeeTarget" as const,
      attackerId: spellCasterId,
      targetId: firstTargetId,
    };
    const duplicateSightFill = {
      ...targetFill,
      spatialFacts: [duplicateSightFact, duplicateSightFact],
    } satisfies Extract<BattleFill, { readonly kind: "targetChoice" }>;
    expect(
      chainedSpellFillSet(
        [duplicateSightFill],
        invocation,
        spellCasterId,
        session.state,
      ),
    ).toMatchObject({ tag: "invalid" });
  });

  test("resolves without a leap when the damage d8 faces are not duplicated", () => {
    const state = chromaticOrbBattle({ spellLevel: 1 });
    const { subject, fills } = chromaticOrbDamageFills(state, {
      damageType: "cold",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [1, 2, 3],
    });
    const result = resolveResolved(state, subject, fills);

    expect(result.state.combatants.get(firstTargetId)?.hp).toBe(6);
    expect(
      result.state.currentTurnResources.actionResources,
    ).not.toContainEqual(
      expect.objectContaining({ kind: "action", source: "turn" }),
    );
    expect(
      result.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(true);
    const caster = result.state.combatants.get(spellCasterId);
    expect(
      caster?.origin.kind === "character"
        ? caster.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([expect.objectContaining({ spellLevel: 1, expended: 1 })]);
  });

  test("duplicate d8 faces resolve after one level 1 leap exhausts the leap budget", () => {
    const state = chromaticOrbBattle({ spellLevel: 1 });
    const first = chromaticOrbDamageFills(state, {
      damageType: "fire",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [2, 2, 5],
    });
    const awaitingLeap = resolveNeedsHoles(state, first.subject, first.fills);
    const leapTargetHole = requireHole(awaitingLeap.holes, "targetChoice");
    const leapTargetFill = spellLeapTargetFill(
      leapTargetHole,
      firstTargetId,
      secondTargetId,
      true,
    );
    const leapDamageFills = chainedStepAttackAndDamageFills(
      state,
      first.subject,
      [...first.fills, leapTargetFill],
      {
        attackTotal: 18,
        naturalD20: 12,
        damageFaces: [1, 1, 1],
      },
    );
    const resolved = resolveResolved(state, first.subject, [
      ...first.fills,
      leapTargetFill,
      ...leapDamageFills,
    ]);

    expect(resolved.state.combatants.get(firstTargetId)?.hp).toBe(3);
    expect(resolved.state.combatants.get(secondTargetId)?.hp).toBe(9);
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(true);
  });

  test("duplicate d8 faces open a leap target hole until the slot leap budget is exhausted", () => {
    const state = chromaticOrbBattle({ spellLevel: 2 });
    const { subject, fills } = chromaticOrbDamageFills(state, {
      damageType: "thunder",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [4, 4, 1, 2],
    });
    const result = resolveNeedsHoles(state, subject, fills);
    const leapTargetHole = requireHole(result.holes, "targetChoice");

    expect(leapTargetHole.choices).toContain(secondTargetId);
    expect(leapTargetHole.choices).not.toContain(firstTargetId);
  });

  test("rejects repeated or out-of-range leap targets", () => {
    const state = chromaticOrbBattle({ spellLevel: 2 });
    const first = chromaticOrbDamageFills(state, {
      damageType: "acid",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [4, 4, 1, 2],
    });
    const awaitingLeap = resolveNeedsHoles(state, first.subject, first.fills);
    const leapTargetHole = requireHole(awaitingLeap.holes, "targetChoice");

    expect(
      resolveInvalid(state, first.subject, [
        ...first.fills,
        spellLeapTargetFill(leapTargetHole, firstTargetId, firstTargetId, true),
      ]).reason,
    ).toBe("invalidFill");
    expect(
      resolveInvalid(state, first.subject, [
        ...first.fills,
        spellLeapTargetFill(
          leapTargetHole,
          firstTargetId,
          secondTargetId,
          false,
        ),
      ]).reason,
    ).toBe("invalidFill");
  });

  test("miss stops the chain and critical hit doubles the step damage dice", () => {
    const missState = chromaticOrbBattle({ spellLevel: 2 });
    const miss = chromaticOrbAttackFills(missState, {
      damageType: "poison",
      targetId: firstTargetId,
      attackTotal: 3,
      naturalD20: 2,
    });

    expect(
      resolveResolved(missState, miss.subject, miss.fills).state.combatants.get(
        firstTargetId,
      )?.hp,
    ).toBe(12);

    const criticalState = chromaticOrbBattle({
      spellLevel: 1,
      firstTargetHp: 30,
    });
    const critical = chromaticOrbAttackFills(criticalState, {
      damageType: "lightning",
      targetId: firstTargetId,
      attackTotal: 25,
      naturalD20: 20,
    });
    const awaitingDamage = resolveNeedsHoles(
      criticalState,
      critical.subject,
      critical.fills,
    );
    const damageHole = requireHole(awaitingDamage.holes, "rolledDice");

    expect(damageHole.label).toContain("6d8");
    const resolvedCritical = resolveResolved(criticalState, critical.subject, [
      ...critical.fills,
      damageRollFill(damageHole, [1, 2, 3, 4, 5, 6]),
    ]);
    expect(resolvedCritical.state.combatants.get(firstTargetId)?.hp).toBe(9);
  });

  test("reuses the chosen damage type across an actual leap", () => {
    const state = chromaticOrbBattle({
      spellLevel: 2,
      secondTargetKind: "poisonImmuneSkeleton",
    });
    const first = chromaticOrbDamageFills(state, {
      damageType: "poison",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [4, 4, 1, 2],
    });
    const awaitingLeap = resolveNeedsHoles(state, first.subject, first.fills);
    const leapTargetHole = requireHole(awaitingLeap.holes, "targetChoice");
    const leapTargetFill = spellLeapTargetFill(
      leapTargetHole,
      firstTargetId,
      secondTargetId,
      true,
    );
    const leapFills = chainedStepAttackAndDamageFills(
      state,
      first.subject,
      [...first.fills, leapTargetFill],
      {
        attackTotal: 18,
        naturalD20: 12,
        damageFaces: [3, 4, 5, 6],
      },
    );
    const resolved = resolveResolved(state, first.subject, [
      ...first.fills,
      leapTargetFill,
      ...leapFills,
    ]);

    expect(resolved.state.combatants.get(firstTargetId)?.hp).toBe(1);
    expect(resolved.state.combatants.get(secondTargetId)?.hp).toBe(13);
  });

  test("damaged concentrating targets must fill the Concentration Saving Throw", () => {
    const state = withTargetConcentration(
      chromaticOrbBattle({ spellLevel: 1 }),
    );
    const damage = chromaticOrbDamageFills(state, {
      damageType: "acid",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [1, 2, 3],
    });
    const awaitingConcentration = resolveNeedsHoles(
      state,
      damage.subject,
      damage.fills,
    );
    const concentrationHole = requireHole(
      awaitingConcentration.holes,
      "concentrationSavingThrow",
    );
    const resolved = resolveResolved(state, damage.subject, [
      ...damage.fills,
      concentrationSavingThrowFill(concentrationHole, false),
    ]);

    expect(
      resolved.state.combatants.get(firstTargetId)?.concentration,
    ).toBeNull();
  });

  test("requests an active source damage penalty roll before applying chained damage", () => {
    const state = withSourceDamageRollPenalty(
      chromaticOrbBattle({ spellLevel: 1 }),
    );
    const damage = chromaticOrbDamageFills(state, {
      damageType: "fire",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [1, 2, 3],
    });
    const awaitingPenalty = resolveNeedsHoles(
      state,
      damage.subject,
      damage.fills,
    );
    const penaltyHole = requireHole(awaitingPenalty.holes, "rolledDice");
    expect(penaltyHole).toMatchObject({
      label: "Source damage roll penalty (1d8)",
      sourceDamageRollPenalty: {
        damageRollHoleId: damage.fills.at(-1)?.holeId,
      },
    });
    const penaltyFill = {
      kind: "rolledDice" as const,
      holeId: penaltyHole.holeId,
      value: [{ results: [DieRollResult(1)] }],
    } satisfies Extract<BattleFill, { readonly kind: "rolledDice" }>;
    const resolved = resolveResolved(state, damage.subject, [
      ...damage.fills,
      penaltyFill,
    ]);
    expect(resolved.state.combatants.get(firstTargetId)?.hp).toBe(7);
  });

  test("Warding Bond shared damage from chained spells uses the caster damage lifecycle", () => {
    const state = withWardingBondSharedCasterLifecycle(
      chromaticOrbBattle({ spellLevel: 1 }),
    );
    const damage = chromaticOrbDamageFills(state, {
      damageType: "acid",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [1, 2, 3],
    });
    const awaitingConcentration = resolveNeedsHoles(
      state,
      damage.subject,
      damage.fills,
    );
    const concentrationHole = requireHole(
      awaitingConcentration.holes,
      "concentrationSavingThrow",
    );

    expect(concentrationHole).toMatchObject({
      combatantId: spellCasterId,
      damageAmount: 3,
    });

    const concentrationFill = concentrationSavingThrowFill(
      concentrationHole,
      true,
    );
    const awaitingHideousLaughter = resolveNeedsHoles(state, damage.subject, [
      ...damage.fills,
      concentrationFill,
    ]);
    const hideousLaughterHole = requireHideousLaughterRepeatSaveHole(
      requireHole(awaitingHideousLaughter.holes, "savingThrowOutcome"),
    );

    expect(hideousLaughterHole.hideousLaughterRepeatSave).toMatchObject({
      targetId: spellCasterId,
      trigger: "damage",
    });

    const resolved = resolveResolved(state, damage.subject, [
      ...damage.fills,
      concentrationFill,
      savingThrowOutcomeFill(hideousLaughterHole, [
        { targetId: spellCasterId, succeeded: true },
      ]),
    ]);
    const caster = resolved.state.combatants.get(spellCasterId);

    expect(resolved.state.combatants.get(firstTargetId)?.hp).toBe(9);
    expect(caster?.hp).toBe(9);
    expect(caster?.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(
      caster?.activeEffects.some((effect) => effect.kind === "hideousLaughter"),
    ).toBe(false);
  });

  test("damage that drops a character to 0 HP uses the zero-HP disposition", () => {
    const state = chromaticOrbBattle({ spellLevel: 1, firstTargetHp: 4 });
    const damage = chromaticOrbDamageFills(state, {
      damageType: "acid",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [1, 2, 3],
    });
    const resolved = resolveResolved(state, damage.subject, damage.fills);

    expect(resolved.state.combatants.get(firstTargetId)?.hp).toBe(0);
    const targetSnapshot = resolved.snapshot.combatants.find(
      (combatant) => combatant.combatantId === firstTargetId,
    );
    expect(targetSnapshot).toMatchObject({
      combatantId: firstTargetId,
      hp: 0,
      conditions: expect.arrayContaining(["unconscious"]),
    });
  });

  test("a zero-HP replacement disposition resumes and completes the chained spell", () => {
    const session = chromaticOrbSession({
      spellLevel: 1,
      firstTargetHp: 4,
      firstTargetZeroHitPointReplacementUnit: syntheticZeroHitPointReplacement,
    });
    const state = session.state;
    const damage = chromaticOrbDamageFills(state, {
      damageType: "acid",
      targetId: firstTargetId,
      attackTotal: 18,
      naturalD20: 12,
      damageFaces: [1, 2, 3],
    });
    const awaitingDisposition = resolveNeedsHoles(
      state,
      damage.subject,
      damage.fills,
    );
    const disposition = requireHole(
      awaitingDisposition.holes,
      "attackDamageDisposition",
    );
    const replacementProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      firstTargetId,
      syntheticZeroHitPointReplacement.id,
    );

    expect(disposition.choices).toEqual(
      expect.arrayContaining([
        { kind: "ordinaryDamage" },
        {
          kind: "zeroHitPointReplacement",
          procedureRef: replacementProcedureRef,
        },
      ]),
    );

    const resolved = resolveResolved(state, damage.subject, [
      ...damage.fills,
      {
        kind: "attackDamageDisposition",
        holeId: disposition.holeId,
        value: {
          kind: "zeroHitPointReplacement",
          procedureRef: replacementProcedureRef,
        },
      },
    ]);
    const target = resolved.state.combatants.get(firstTargetId);

    expect(target?.hp).toBe(1);
    expect(target?.conditions).not.toContain("unconscious");
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(true);
  });

  test("can be readied and released without spending the spell resources twice", () => {
    const state = chromaticOrbBattle({ spellLevel: 1 });
    const readyAct = chromaticOrbReadyAct(state);
    const readied = resolveResolved(state, readyAct.subject, []);
    const releaseAct = discoverBattleActCandidates(readied.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "releaseReadiedSpell" &&
        candidate.subject.readiedSpellCasterId === spellCasterId,
    );
    if (releaseAct?.subject.tag !== "runtimeCommand") {
      throw new Error("Expected release readied spell act.");
    }
    expect(
      requireHole(
        resolveNeedsHoles(readied.state, releaseAct.subject, []).holes,
        "damageTypeChoice",
      ),
    ).toEqual(requireHole(releaseAct.initialHoles, "damageTypeChoice"));
    const damageTypeHole = requireHole(
      releaseAct.initialHoles,
      "damageTypeChoice",
    );
    const typeFill = damageTypeFill(damageTypeHole, "fire");
    const awaitingTarget = resolveNeedsHoles(
      readied.state,
      releaseAct.subject,
      [typeFill],
    );
    const targetHole = requireHole(awaitingTarget.holes, "targetChoice");
    const targetFill = spellTargetFill(targetHole, firstTargetId);
    const awaitingAttack = resolveNeedsHoles(
      readied.state,
      releaseAct.subject,
      [typeFill, targetFill],
    );
    const attackHole = requireHole(awaitingAttack.holes, "attackRoll");
    const attackFill = attackRollFill(attackHole, 18, 12);
    const awaitingDamage = resolveNeedsHoles(
      readied.state,
      releaseAct.subject,
      [typeFill, targetFill, attackFill],
    );
    const damageHole = requireHole(awaitingDamage.holes, "rolledDice");
    const released = resolveResolved(readied.state, releaseAct.subject, [
      typeFill,
      targetFill,
      attackFill,
      damageRollFill(damageHole, [1, 2, 3]),
    ]);

    expect(released.state.readiedSpells.has(spellCasterId)).toBe(false);
    expect(
      released.state.combatants.get(spellCasterId)?.concentration,
    ).toBeNull();
    expect(released.state.combatants.get(firstTargetId)?.hp).toBe(6);
    const caster = released.state.combatants.get(spellCasterId);
    expect(
      caster?.origin.kind === "character"
        ? caster.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([expect.objectContaining({ spellLevel: 1, expended: 1 })]);
  });
});

function chromaticOrbBattle(input: {
  readonly spellLevel: 1 | 2;
  readonly firstTargetHp?: number;
  readonly firstTargetZeroHitPointReplacementUnit?: UnitRecord;
  readonly casterNaturalOneRerollUnit?: UnitRecord;
  readonly secondTargetKind?: "character" | "poisonImmuneSkeleton";
  readonly spell?: SpellRecord;
}): BattleState {
  return chromaticOrbSession(input).state;
}

function chromaticOrbSession(input: {
  readonly spellLevel: 1 | 2;
  readonly firstTargetHp?: number;
  readonly firstTargetZeroHitPointReplacementUnit?: UnitRecord;
  readonly casterNaturalOneRerollUnit?: UnitRecord;
  readonly secondTargetKind?: "character" | "poisonImmuneSkeleton";
  readonly spell?: SpellRecord;
}): BattleRuntimeSession {
  const casterNaturalOneRerollSupport =
    input.casterNaturalOneRerollUnit === undefined
      ? undefined
      : battleD20TestNaturalOneRerollSupportForUnit(
          input.casterNaturalOneRerollUnit,
        );
  if (
    casterNaturalOneRerollSupport === "unsupported" ||
    casterNaturalOneRerollSupport === null
  ) {
    throw new Error("Expected a supported natural-one reroll fixture.");
  }
  const result = startBattle({
    battleId: battleId(`chromatic-orb-${input.spellLevel}`),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Spellcaster",
        initiative: 20,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.spell ?? chromaticOrb],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: input.spellLevel, count: 1 }],
        },
        ...(input.casterNaturalOneRerollUnit === undefined ||
        casterNaturalOneRerollSupport === undefined
          ? {}
          : {
              characterUnitRefs: [
                {
                  unit: input.casterNaturalOneRerollUnit,
                  supportProfiles: [casterNaturalOneRerollSupport],
                },
              ],
              unitFeatures: [
                characterBattleFeatureInitForTest(
                  input.casterNaturalOneRerollUnit,
                ),
              ],
            }),
      }),
      characterCreature({
        combatantId: firstTargetId,
        displayName: "First target",
        initiative: 10,
        ...(input.firstTargetHp === undefined
          ? {}
          : { hp: input.firstTargetHp }),
        ...(input.firstTargetZeroHitPointReplacementUnit === undefined
          ? {}
          : {
              zeroHitPointReplacementUnit:
                input.firstTargetZeroHitPointReplacementUnit,
            }),
      }),
      input.secondTargetKind === "poisonImmuneSkeleton"
        ? poisonImmuneSkeletonCreature({
            combatantId: secondTargetId,
            displayName: "Second target",
            initiative: 9,
          })
        : characterCreature({
            combatantId: secondTargetId,
            displayName: "Second target",
            initiative: 9,
          }),
      characterCreature({
        combatantId: thirdTargetId,
        displayName: "Third target",
        initiative: 8,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function decodeSpellRecord(raw: unknown): SpellRecord {
  const unit = decodeUnitRecordSync(raw);
  if (unit.kind !== "spell") {
    throw new Error("Expected Chromatic Orb content to decode as a Spell.");
  }
  return unit;
}

function chromaticOrbAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.mode.tag === "cast",
  );
  if (act?.subject.tag !== "actionSpell") {
    throw new Error("Expected Chromatic Orb action spell act.");
  }
  return act;
}

function chromaticOrbReadyAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.mode.tag === "ready" &&
      candidate.subject.mode.trigger === "spellCast",
  );
  if (act?.subject.tag !== "actionSpell") {
    throw new Error("Expected Chromatic Orb ready spell act.");
  }
  return act;
}

function chromaticOrbAttackFills(
  state: BattleState,
  input: {
    readonly damageType: Extract<
      BattleFill,
      { readonly kind: "damageTypeChoice" }
    >["value"];
    readonly targetId: CombatantId;
    readonly attackTotal: number;
    readonly naturalD20: number;
  },
): { readonly subject: BattleSubject; readonly fills: readonly BattleFill[] } {
  const act = chromaticOrbAct(state);
  const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");
  const typeFill = damageTypeFill(damageTypeHole, input.damageType);
  const awaitingTarget = resolveNeedsHoles(state, act.subject, [typeFill]);
  const targetHole = requireHole(awaitingTarget.holes, "targetChoice");
  const targetFill = spellTargetFill(targetHole, input.targetId);
  const awaitingAttack = resolveNeedsHoles(state, act.subject, [
    typeFill,
    targetFill,
  ]);
  const attackHole = requireHole(awaitingAttack.holes, "attackRoll");
  return {
    subject: act.subject,
    fills: [
      typeFill,
      targetFill,
      attackRollFill(attackHole, input.attackTotal, input.naturalD20),
    ],
  };
}

function chromaticOrbDamageFills(
  state: BattleState,
  input: Parameters<typeof chromaticOrbAttackFills>[1] & {
    readonly damageFaces: readonly number[];
  },
): { readonly subject: BattleSubject; readonly fills: readonly BattleFill[] } {
  const attack = chromaticOrbAttackFills(state, input);
  const awaitingDamage = resolveNeedsHoles(state, attack.subject, attack.fills);
  const damageHole = requireHole(awaitingDamage.holes, "rolledDice");
  return {
    subject: attack.subject,
    fills: [...attack.fills, damageRollFill(damageHole, input.damageFaces)],
  };
}

function chainedStepAttackAndDamageFills(
  state: BattleState,
  subject: BattleSubject,
  priorFills: readonly BattleFill[],
  input: {
    readonly attackTotal: number;
    readonly naturalD20: number;
    readonly damageFaces: readonly number[];
  },
): readonly BattleFill[] {
  const awaitingAttack = resolveNeedsHoles(state, subject, priorFills);
  const attackHole = requireHole(awaitingAttack.holes, "attackRoll");
  const attackFill = attackRollFill(
    attackHole,
    input.attackTotal,
    input.naturalD20,
  );
  const awaitingDamage = resolveNeedsHoles(state, subject, [
    ...priorFills,
    attackFill,
  ]);
  const damageHole = requireHole(awaitingDamage.holes, "rolledDice");
  return [attackFill, damageRollFill(damageHole, input.damageFaces)];
}

function resolveNeedsHoles(
  state: BattleState,
  subject: BattleSubject,
  fills: readonly BattleFill[],
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles, got ${result.tag}.`);
  }
  return result;
}

function resolveResolved(
  state: BattleState,
  subject: BattleSubject,
  fills: readonly BattleFill[],
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved, got ${result.tag}.`);
  }
  return result;
}

function resolveInvalid(
  state: BattleState,
  subject: BattleSubject,
  fills: readonly BattleFill[],
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "invalid") {
    throw new Error(`Expected invalid, got ${result.tag}.`);
  }
  return result;
}

function withTargetConcentration(state: BattleState): BattleState {
  const target = state.combatants.get(firstTargetId);
  if (target === undefined) {
    throw new Error("Expected first target.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(firstTargetId, {
      ...target,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String("test_concentration_spell"),
        ),
        effectKind: "spellEffect",
      },
    }),
  };
}

function withSourceDamageRollPenalty(state: BattleState): BattleState {
  const caster = state.combatants.get(spellCasterId);
  if (caster === undefined) {
    throw new Error("Expected spell caster.");
  }
  const sourceDamageRollPenalty = {
    kind: "sourceDamageRollPenalty",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "synthetic_source_damage_penalty",
    ),
    sourceCombatantId: firstTargetId,
    amount: { dice: 1, dieSize: 8 },
    expiresAt: {
      kind: "concentration",
      combatantId: firstTargetId,
    },
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "sourceDamageRollPenalty" }
  >;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: [...caster.activeEffects, sourceDamageRollPenalty],
    }),
  };
}

function withWardingBondSharedCasterLifecycle(state: BattleState): BattleState {
  const caster = state.combatants.get(spellCasterId);
  const target = state.combatants.get(firstTargetId);
  const hideousLaughterSource = state.combatants.get(secondTargetId);
  if (
    caster === undefined ||
    target === undefined ||
    hideousLaughterSource === undefined
  ) {
    throw new Error("Expected Warding Bond caster, target, and effect source.");
  }
  const wardingBondEffect = {
    kind: "wardingBond",
    effectRef: battleActiveEffectExecutionRefForTest("chromatic-ward"),
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String("warding_bond"),
    ),
    sourceCombatantId: spellCasterId,
    expiresAt: {
      kind: "duration",
      durationTicks: elapsedTimeTicks(3_600),
    },
  } satisfies Extract<BattleActiveEffect, { readonly kind: "wardingBond" }>;
  const hideousLaughterEffect = {
    kind: "hideousLaughter",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String("test_hideous_laughter"),
    ),
    sourceCombatantId: secondTargetId,
    conditionHadNonSpellProneSource: false,
    conditionHadNonSpellIncapacitatedSource: false,
    repeatSaveRollMode: null,
    save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
    expiresAt: {
      kind: "concentration",
      combatantId: secondTargetId,
      durationTicks: elapsedTimeTicks(600),
    },
  } satisfies Extract<BattleActiveEffect, { readonly kind: "hideousLaughter" }>;
  return {
    ...state,
    combatants: new Map(state.combatants)
      .set(spellCasterId, {
        ...caster,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("test_concentration_spell"),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [...caster.activeEffects, hideousLaughterEffect],
      })
      .set(firstTargetId, {
        ...target,
        activeEffects: [...target.activeEffects, wardingBondEffect],
      })
      .set(secondTargetId, {
        ...hideousLaughterSource,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("test_hideous_laughter"),
          ),
          effectKind: "spellEffect",
        },
      }),
  };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function requireHideousLaughterRepeatSaveHole(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): Extract<BattleHole, { readonly hideousLaughterRepeatSave: unknown }> {
  if (!("hideousLaughterRepeatSave" in hole)) {
    throw new Error("Expected Hideous Laughter repeat save hole.");
  }
  return hole;
}

function damageTypeFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<BattleFill, { readonly kind: "damageTypeChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: spellCasterId,
        targetId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(hole),
      },
    ],
  };
}

function spellLeapTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  previousTargetId: CombatantId,
  targetId: CombatantId,
  inRange: boolean,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: inRange
      ? [
          {
            kind: "spellLeapTargetWithinRange",
            previousTargetId,
            targetId,
            sourceProcedureRef:
              battleProcedureExecutionRefForSpellHoleForTest(hole),
            rangeFeet: movementFeet(30),
          },
        ]
      : [],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  total: number,
  naturalD20: number,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: { total, naturalD20: DieRollResult(naturalD20) },
  };
}

function damageRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  faces: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [first, ...rest] = faces;
  if (first === undefined) {
    throw new Error("Expected at least one damage face.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        results: [DieRollResult(first), ...rest.map(DieRollResult)],
      },
    ],
  };
}

function concentrationSavingThrowFill(
  hole: Extract<BattleHole, { readonly kind: "concentrationSavingThrow" }>,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }> {
  return {
    kind: "concentrationSavingThrow",
    holeId: hole.holeId,
    value: { succeeded },
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function poisonImmuneSkeletonCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      source: Either.getOrThrow(
        battleStatBlockCombatantSource(
          statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        ),
      ),
      currentHp: Hp(13),
      tempHp: Hp(0),
    },
  };
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly hp?: number;
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly zeroHitPointReplacementUnit?: UnitRecord;
}): BattleCreatureInit {
  const hp = Hp(input.hp ?? 12);
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [
        ...(input.characterUnitRefs ?? []),
        ...(input.zeroHitPointReplacementUnit === undefined
          ? []
          : [
              {
                unit: input.zeroHitPointReplacementUnit,
                supportProfiles: [
                  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
                ] as const,
              },
            ]),
      ],
      classLevels: [{ className: "wizard", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: hp,
      maxHp: hp,
      tempHp: Hp(0),
      selectedLoadout: {},
      ...(input.zeroHitPointReplacementUnit === undefined
        ? {}
        : { resources: [{ unit: input.zeroHitPointReplacementUnit }] }),
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
      ...(input.unitFeatures === undefined
        ? {}
        : { unitFeatures: input.unitFeatures }),
    },
  };
}
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
