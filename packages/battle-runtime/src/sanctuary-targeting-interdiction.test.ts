import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { spellTargetListFillForTest } from "./spell-target-list.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84G sanctuary
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-sanctuary-targeting-interdiction
import { battleProcedureExecutionRefForSpellHoleForTest } from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
  resourceCount,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActCandidates,
  discoverBattleActs,
  initiativeScore,
  BattleHoleSchema,
  BattleCheckpointFrontierEnvelopeSchema,
  battleCheckpointFrontierEnvelope,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type BattleRuntimeSession,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import { targetChoiceFillAfterAttackRedirectionWardAttackRollReplacement } from "./battle-reducer/targeting-save-interdiction.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  assertBattleCheckpointFrontierEnvelopeCodecAcceptsHolesForSubjectForTest,
  damageRollFillWithGroups,
  resolveBattleSubject,
  attackExecutionSelectionForSubjectForTest,
  skeletonCreatureInit,
} from "./battle-runtime.test-support.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Sanctuary test Unit catalog must build.");
}

const unitLibrary = unitCatalogResult.catalog;
const sanctuaryUnitId = "sanctuary";
const burningHandsUnitId = "burning_hands";
const flameStrikeUnitId = "flame_strike";
const chromaticOrbUnitId = "chromatic_orb";
const eldritchBlastUnitId = "eldritch_blast";
const fireBoltUnitId = "fire_bolt";
const iceKnifeUnitId = "ice_knife";
const longstriderUnitId = "longstrider";
const magicMissileUnitId = "magic_missile";
const sacredFlameUnitId = "sacred_flame";
const casterId = combatantId("sanctuary-caster");
const wardedId = combatantId("sanctuary-warded");
const attackerId = combatantId("sanctuary-attacker");
const replacementId = combatantId("sanctuary-replacement");

describe("Sanctuary targeting interdiction", () => {
  test("retargeting an attack preserves the replacement target's relationship fact", () => {
    const relationshipFact = {
      kind: "attackRollTargetIsEnemy" as const,
      attackerId,
      targetId: replacementId,
      targetIsEnemy: true,
    };

    expect(
      targetChoiceFillAfterAttackRedirectionWardAttackRollReplacement({
        fill: {
          kind: "targetChoice",
          holeId: holeId("synthetic-sanctuary-target"),
          value: wardedId,
        },
        replacement: {
          tag: "newTarget",
          targetId: replacementId,
          spatialFacts: [],
          relationshipFacts: [relationshipFact],
        },
      }),
    ).toEqual({
      kind: "targetChoice",
      holeId: holeId("synthetic-sanctuary-target"),
      value: replacementId,
      spatialFacts: [],
      relationshipFacts: [relationshipFact],
    });
  });

  test("casts as a Bonus Action and wards one creature", () => {
    const state = battleWithSanctuary();
    const cast = castSanctuary(state, wardedId);

    expect(combatant(cast.state, wardedId).activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "targetingSaveInterdiction",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: casterId,
      }),
    );
  });

  test("public codec decodes the Sanctuary target-list hole", () => {
    const state = battleWithSanctuary();
    const act = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "targetingSaveInterdiction",
    );
    if (act === undefined || act.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected Sanctuary Bonus Action spell act.");
    }
    const sanctuaryProcedureRef = act.subject.procedureRef;
    const decoded = Schema.decodeUnknownResult(BattleHoleSchema)(
      requireHole(act.initialHoles, "spellTargetList"),
    );

    if (Result.isFailure(decoded)) {
      throw new Error(String(decoded.failure));
    }
    expect(decoded.success).toMatchObject({
      kind: "spellTargetList",
    });

    const snapshot = snapshotBattle(state.state);
    const wrongOwner = snapshot.combatants.find(
      (combatant) => combatant.combatantId === wardedId,
    );
    const wrongOwnerProcedureRef =
      wrongOwner?.origin.kind === "character"
        ? wrongOwner.origin.attackExecution.unarmedStrikeProcedureRef
        : undefined;
    if (wrongOwnerProcedureRef === undefined) {
      throw new Error("Expected another combatant's bound procedure ref.");
    }
    const encoded = Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
      battleCheckpointFrontierEnvelope(state.state),
    );
    if (encoded.frontier.kind !== "acts") {
      throw new Error("Expected an Acts frontier.");
    }
    const sanctuaryAct = encoded.frontier.acts.find(
      (candidate) =>
        "procedureRef" in candidate.subject &&
        candidate.subject.procedureRef === sanctuaryProcedureRef,
    );
    if (sanctuaryAct === undefined) {
      throw new Error("Expected encoded Sanctuary act.");
    }
    const wrongTargetListOwner = {
      ...encoded,
      frontier: {
        ...encoded.frontier,
        acts: encoded.frontier.acts.map((candidate) =>
          candidate !== sanctuaryAct
            ? candidate
            : {
                ...candidate,
                initialHoles: candidate.initialHoles.map((hole) =>
                  hole.kind === "spellTargetList"
                    ? { ...hole, sourceProcedureRef: wrongOwnerProcedureRef }
                    : hole,
                ),
              },
        ),
      },
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          wrongTargetListOwner,
        ),
      ),
    ).toBe(true);

    const nestedWrongOwner = {
      ...encoded,
      frontier: {
        ...encoded.frontier,
        acts: encoded.frontier.acts.map((candidate) =>
          candidate !== sanctuaryAct
            ? candidate
            : {
                ...candidate,
                initialHoles: candidate.initialHoles.map((hole) =>
                  hole.kind === "spellTargetList"
                    ? {
                        kind: "objectContactTargets" as const,
                        holeId: hole.holeId,
                        label: "Synthetic nested execution-ref witness",
                        objectContact: {
                          sourceCombatantId: casterId,
                          sourceProcedureRef: wrongOwnerProcedureRef,
                          objectId: "synthetic-object",
                          rangeFeet: 30,
                          requiresObjectWithinRange: true,
                        },
                        choices: [],
                        requiresTableSpatialFact: true as const,
                      }
                    : hole,
                ),
              },
        ),
      },
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          nestedWrongOwner,
        ),
      ),
    ).toBe(true);
  });

  test("failed save can lose a direct attack against the warded creature", () => {
    const warded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const attack = attackAct(warded.state);
    const targetFill = attackTargetFill(
      requireHole(attack.initialHoles, "targetChoice"),
      wardedId,
      attack.subject,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: attack.subject,
      fills: [targetFill],
    });

    expect(needsSanctuary).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({ kind: "targetingSaveInterdictionOutcome" }),
      ],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error(
        `Expected Sanctuary interdiction hole: ${JSON.stringify(needsSanctuary)}`,
      );
    }
    assertBattleCheckpointFrontierEnvelopeCodecAcceptsHolesForSubjectForTest({
      snapshot: needsSanctuary.snapshot,
      subject: attack.subject,
      holes: needsSanctuary.holes,
    });
    const sanctuaryHole = requireHole(
      needsSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    expect(sanctuaryHole).toMatchObject({
      replacementTargetKind: "attackRoll",
    });

    const lost = resolveBattleSubject({
      state: warded.state,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryHole, {
          saveSucceeded: false,
          outcome: { kind: "loseAttackOrSpell" },
        }),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost attack to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("an attack prevented by Sanctuary before its roll does not expend ammunition", () => {
    const warded = advanceToAttacker(
      castSanctuary(
        battleWithSanctuary({ ammunitionAttacker: true }),
        wardedId,
      ),
    );
    const shortbow = attackActionOptionsForActor(warded.state, attackerId).find(
      (option) =>
        option.kind === "statBlockAttack" &&
        option.attack.ammunition === "arrow",
    );
    if (shortbow === undefined) {
      throw new Error("Expected the ammunition attacker Shortbow option.");
    }
    const attack = discoverBattleActCandidates(warded.state).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.procedureRef === shortbow.procedureRef,
    );
    if (
      attack === undefined ||
      attack.subject.tag !== "action" ||
      attack.subject.action !== "attack"
    ) {
      throw new Error("Expected the ammunition attacker Shortbow act.");
    }
    const targetFill = {
      ...attackTargetFill(
        requireHole(attack.initialHoles, "targetChoice"),
        wardedId,
        attack.subject,
      ),
      spatialFacts: [
        {
          kind: "attackTargetDistance" as const,
          actorId: attackerId,
          targetId: wardedId,
          ...attackExecutionSelectionForSubjectForTest(attack.subject),
          distanceFeet: movementFeet(5),
        },
      ],
    };
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: attack.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }
    const lost = resolveBattleSubject({
      state: warded.state,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });
    expect(lost.tag).toBe("resolved");
    if (lost.tag !== "resolved") return;
    expect(combatant(lost.state, attackerId).ammunitionStocks).toEqual([
      { ammunition: "arrow", remaining: resourceCount(20) },
    ]);
  });

  test("successful save proceeds to the attack roll", () => {
    const warded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const attack = attackAct(warded.state);
    const targetFill = attackTargetFill(
      requireHole(attack.initialHoles, "targetChoice"),
      wardedId,
      attack.subject,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: attack.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const needsAttackRoll = resolveBattleSubject({
      state: warded.state,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: true },
        ),
      ],
    });

    expect(needsAttackRoll).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "attackRoll" })],
      routeEvents: expect.arrayContaining([
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "wardedTargetInterdiction",
          holes: [],
          owner: "battleHoleFrontier",
        },
      ]),
    });
  });

  test("failed save can choose a new legal nonenemy attack target", () => {
    const warded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const attack = attackAct(warded.state);
    const targetFill = attackTargetFill(
      requireHole(attack.initialHoles, "targetChoice"),
      wardedId,
      attack.subject,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: attack.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const sanctuaryFill = sanctuaryOutcomeFill(
      requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
      {
        saveSucceeded: false,
        outcome: {
          kind: "newTarget",
          targetId: replacementId,
          spatialFacts: [attackTargetFact(replacementId, attack.subject)],
          replacementTargetKind: "attackRoll",
        },
      },
    );
    const retargeted = resolveBattleSubject({
      state: warded.state,
      subject: attack.subject,
      fills: [targetFill, sanctuaryFill],
    });

    expect(retargeted).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "attackRoll" })],
      routeEvents: expect.arrayContaining([
        {
          kind: "resolveBattleSubject",
          subject: "wardedTargetInterdiction",
          fill: "targetChoice",
          holes: [],
          owner: "battleTargetSelection",
        },
      ]),
    });

    if (retargeted.tag !== "needsHoles") {
      throw new Error(
        "Expected Sanctuary retargeting to expose the attack roll.",
      );
    }
    const attackRoll = requireHole(retargeted.holes, "attackRoll");
    const retargetedWithAttackRoll = resolveBattleSubject({
      state: warded.state,
      subject: attack.subject,
      fills: [targetFill, sanctuaryFill, attackRollFill(attackRoll)],
    });

    expect(retargetedWithAttackRoll).toMatchObject({ tag: "resolved" });
    if (retargetedWithAttackRoll.tag !== "resolved") {
      throw new Error("Expected Sanctuary retargeting attack to resolve.");
    }
    expect(combatant(retargetedWithAttackRoll.state, wardedId).hp).toBe(Hp(12));
    expect(combatant(retargetedWithAttackRoll.state, replacementId).hp).toBe(
      Hp(11),
    );
  });

  test("failed save can lose a direct damaging spell against the warded creature", () => {
    const warded = castSanctuary(battleWithSanctuary(), wardedId);
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          fireBoltUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Fire Bolt action spell.");
    }
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      fireBoltUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can lose a direct save-damage spell against the warded creature", () => {
    const warded = castSanctuary(battleWithSanctuary(), wardedId);
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          sacredFlameUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Sacred Flame action spell.");
    }
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      sacredFlameUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can move a direct save-damage spell to a new target", () => {
    const warded = castSanctuary(battleWithSanctuary(), wardedId);
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          sacredFlameUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Sacred Flame action spell.");
    }
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      sacredFlameUnitId,
      casterId,
      wardedId,
    );
    const originalTargetFact = targetFill.spatialFacts?.find(
      (fact) => fact.kind === "spellTarget",
    );
    if (originalTargetFact === undefined) {
      throw new Error("Expected the admitted Sacred Flame target fact.");
    }
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }
    const sanctuaryHole = requireHole(
      needsSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    if (sanctuaryHole.replacementTargetKind !== "nonAttack") {
      throw new Error("Expected a non-attack Sanctuary replacement.");
    }
    const sanctuaryFill = sanctuaryOutcomeFill(sanctuaryHole, {
      saveSucceeded: false,
      outcome: {
        kind: "newTarget",
        targetId: replacementId,
        replacementTargetKind: sanctuaryHole.replacementTargetKind,
        spatialFacts: [{ ...originalTargetFact, targetId: replacementId }],
      },
    });
    const needsSave = resolveBattleSubject({
      state: needsSanctuary.state,
      subject: needsSanctuary.subject,
      fills: [targetFill, sanctuaryFill],
    });
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Sacred Flame saving throw hole.");
    }
    const saveFill = savingThrowOutcomeFill(
      requireHole(needsSave.holes, "savingThrowOutcome"),
      [{ targetId: replacementId, succeeded: false }],
    );
    const needsDamage = resolveBattleSubject({
      state: needsSave.state,
      subject: needsSave.subject,
      fills: [targetFill, sanctuaryFill, saveFill],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Sacred Flame damage roll hole.");
    }
    const resolved = resolveBattleSubject({
      state: needsDamage.state,
      subject: needsDamage.subject,
      fills: [
        targetFill,
        sanctuaryFill,
        saveFill,
        rolledDiceFill(requireHole(needsDamage.holes, "rolledDice"), [4]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected retargeted Sacred Flame to resolve.");
    }
    expect(combatant(resolved.state, wardedId).hp).toBe(Hp(12));
    expect(combatant(resolved.state, replacementId).hp).toBe(Hp(8));
  });

  test("failed save can lose Magic Missile allocation against the warded creature", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          magicMissileUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile action spell.");
    }
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      wardedId,
      allocationHole.allocationCount,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [allocationFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }
    const sanctuaryHole = requireHole(
      needsSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    expect(sanctuaryHole).toMatchObject({
      replacementTargetKind: "nonAttack",
    });
    expect("relationshipFactRequest" in sanctuaryHole).toBe(false);

    const lost = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        allocationFill,
        sanctuaryOutcomeFill(sanctuaryHole, {
          saveSucceeded: false,
          outcome: { kind: "loseAttackOrSpell" },
        }),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("successful Sanctuary save preserves Magic Missile allocation", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          magicMissileUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile action spell.");
    }
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      wardedId,
      allocationHole.allocationCount,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [allocationFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }
    const sanctuaryHole = requireHole(
      needsSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    const needsDamage = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        allocationFill,
        sanctuaryOutcomeFill(sanctuaryHole, { saveSucceeded: true }),
      ],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage hole.");
    }
    const damage = requireHole(needsDamage.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        allocationFill,
        sanctuaryOutcomeFill(sanctuaryHole, { saveSucceeded: true }),
        rolledDiceFill(
          damage,
          Array.from({ length: allocationHole.allocationCount }, () => 1),
        ),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error(
        "Expected Magic Missile after a successful Sanctuary save.",
      );
    }
    expect(combatant(resolved.state, wardedId).hp).toBe(
      Hp(12 - allocationHole.allocationCount * 2),
    );
  });

  test("Sanctuary retargets only the warded Magic Missile allocation", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          magicMissileUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile action spell.");
    }
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(allocationHole, [
      { targetId: wardedId, count: 2 },
      { targetId: attackerId, count: 1 },
    ]);
    const originalTargetFact = allocationFill.spatialFacts.find(
      (fact) => fact.kind === "spellTarget" && fact.targetId === wardedId,
    );
    if (
      originalTargetFact === undefined ||
      originalTargetFact.kind !== "spellTarget"
    ) {
      throw new Error("Expected the warded allocation's target fact.");
    }
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [allocationFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }
    const sanctuaryHole = requireHole(
      needsSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    const sanctuaryFill = sanctuaryOutcomeFill(sanctuaryHole, {
      saveSucceeded: false,
      outcome: {
        kind: "newTarget",
        targetId: replacementId,
        replacementTargetKind: "nonAttack",
        spatialFacts: [{ ...originalTargetFact, targetId: replacementId }],
      },
    });
    const needsDamage = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [allocationFill, sanctuaryFill],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage hole.");
    }
    const damage = requireHole(needsDamage.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        allocationFill,
        sanctuaryFill,
        damageRollFillWithGroups(damage, [[1, 1], [1]]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected mixed Magic Missile Sanctuary resolution.");
    }
    expect(combatant(resolved.state, wardedId).hp).toBe(Hp(12));
    expect(combatant(resolved.state, replacementId).hp).toBe(Hp(8));
    expect(combatant(resolved.state, attackerId).hp).toBe(Hp(10));
  });

  test("failed save can move a Magic Missile allocation to a new target", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          magicMissileUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile action spell.");
    }
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      wardedId,
      allocationHole.allocationCount,
    );
    const originalTargetFact = allocationFill.spatialFacts.find(
      (fact) => fact.kind === "spellTarget",
    );
    if (originalTargetFact === undefined) {
      throw new Error("Expected the admitted allocation's spell target fact.");
    }
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [allocationFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }
    const sanctuaryHole = requireHole(
      needsSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    if (sanctuaryHole.replacementTargetKind !== "nonAttack") {
      throw new Error("Expected a non-attack Sanctuary replacement.");
    }
    const sanctuaryFill = sanctuaryOutcomeFill(sanctuaryHole, {
      saveSucceeded: false,
      outcome: {
        kind: "newTarget",
        targetId: replacementId,
        replacementTargetKind: sanctuaryHole.replacementTargetKind,
        spatialFacts: [{ ...originalTargetFact, targetId: replacementId }],
      },
    });
    const needsDamage = resolveBattleSubject({
      state: needsSanctuary.state,
      subject: needsSanctuary.subject,
      fills: [allocationFill, sanctuaryFill],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage roll hole.");
    }
    const resolved = resolveBattleSubject({
      state: needsDamage.state,
      subject: needsDamage.subject,
      fills: [
        allocationFill,
        sanctuaryFill,
        rolledDiceFill(
          requireHole(needsDamage.holes, "rolledDice"),
          Array.from({ length: allocationHole.allocationCount }, () => 1),
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected retargeted Magic Missile to resolve.");
    }
    expect(combatant(resolved.state, wardedId).hp).toBe(Hp(12));
    expect(combatant(resolved.state, replacementId).hp).toBe(
      Hp(12 - allocationHole.allocationCount * 2),
    );
  });

  test("failed save can lose Eldritch Blast beam targeting the warded creature", () => {
    const warded = castSanctuary(battleWithSanctuary(), wardedId);
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          eldritchBlastUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Eldritch Blast action spell.");
    }
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      eldritchBlastUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("each Eldritch Blast beam against the warded creature requires its own Wisdom save", () => {
    const warded = castSanctuary(
      battleWithSanctuary({ casterLevel: 5 }),
      wardedId,
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          eldritchBlastUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Eldritch Blast action spell.");
    }
    const targetHoles = act.initialHoles.filter(
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    );
    expect(targetHoles).toHaveLength(2);
    const targetFills = targetHoles.map((hole) =>
      spellTargetFill(hole, eldritchBlastUnitId, casterId, wardedId),
    );
    const needsFirstSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: targetFills,
    });
    if (needsFirstSanctuary.tag !== "needsHoles") {
      throw new Error("Expected first Sanctuary interdiction hole.");
    }
    const firstSanctuaryHole = requireHole(
      needsFirstSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    expect(firstSanctuaryHole).toMatchObject({ ability: "wis" });

    const needsFirstAttackRoll = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        ...targetFills,
        sanctuaryOutcomeFill(firstSanctuaryHole, { saveSucceeded: true }),
      ],
    });
    if (needsFirstAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected first Eldritch Blast attack roll hole.");
    }
    const firstAttackRoll = requireHole(
      needsFirstAttackRoll.holes,
      "attackRoll",
    );

    const needsSecondSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        ...targetFills,
        sanctuaryOutcomeFill(firstSanctuaryHole, { saveSucceeded: true }),
        attackRollFill(firstAttackRoll, { total: 1, naturalD20: 1 }),
      ],
    });
    if (needsSecondSanctuary.tag !== "needsHoles") {
      throw new Error("Expected second Sanctuary interdiction hole.");
    }
    const secondSanctuaryHole = requireHole(
      needsSecondSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    expect(secondSanctuaryHole).toMatchObject({ ability: "wis" });
    expect(secondSanctuaryHole.holeId).not.toBe(firstSanctuaryHole.holeId);
  });

  test("failed save can lose Ice Knife initial target against the warded creature", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          iceKnifeUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Ice Knife action spell.");
    }
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      iceKnifeUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can move Ice Knife to a new legal initial target", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          iceKnifeUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Ice Knife action spell.");
    }
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetHole,
      iceKnifeUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }
    const sanctuaryHole = requireHole(
      needsSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    if (sanctuaryHole.replacementTargetKind !== "attackRoll") {
      throw new Error("Expected an attack-roll Sanctuary replacement.");
    }
    const replacementFill = spellTargetFill(
      targetHole,
      iceKnifeUnitId,
      casterId,
      replacementId,
    );

    const retargeted = resolveBattleSubject({
      state: needsSanctuary.state,
      subject: needsSanctuary.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryHole, {
          saveSucceeded: false,
          outcome: {
            kind: "newTarget",
            targetId: replacementId,
            replacementTargetKind: "attackRoll",
            spatialFacts: replacementFill.spatialFacts ?? [],
          },
        }),
      ],
    });

    expect(retargeted).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "attackRoll" })],
    });
    if (retargeted.tag !== "needsHoles") {
      throw new Error("Expected retargeted Ice Knife attack roll.");
    }
    expect(combatant(retargeted.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can lose Chromatic Orb primary target against the warded creature", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          chromaticOrbUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Chromatic Orb action spell.");
    }
    const damageTypeFill = spellDamageTypeChoiceFill(
      requireHole(act.initialHoles, "damageTypeChoice"),
      "acid",
    );
    const needsTarget = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [damageTypeFill],
    });
    if (needsTarget.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb target hole.");
    }
    const targetFill = spellTargetFill(
      requireHole(needsTarget.holes, "targetChoice"),
      chromaticOrbUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [damageTypeFill, targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can move a Chromatic Orb attack to a new legal target", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          chromaticOrbUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Chromatic Orb action spell.");
    }
    const damageTypeFill = spellDamageTypeChoiceFill(
      requireHole(act.initialHoles, "damageTypeChoice"),
      "acid",
    );
    const needsTarget = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [damageTypeFill],
    });
    if (needsTarget.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb target hole.");
    }
    const targetHole = requireHole(needsTarget.holes, "targetChoice");
    const targetFill = spellTargetFill(
      targetHole,
      chromaticOrbUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [damageTypeFill, targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }
    const sanctuaryHole = requireHole(
      needsSanctuary.holes,
      "targetingSaveInterdictionOutcome",
    );
    if (sanctuaryHole.replacementTargetKind !== "attackRoll") {
      throw new Error("Expected an attack-roll Sanctuary replacement.");
    }
    const replacementFill = spellTargetFill(
      targetHole,
      chromaticOrbUnitId,
      casterId,
      replacementId,
    );
    const sanctuaryFill = sanctuaryOutcomeFill(sanctuaryHole, {
      saveSucceeded: false,
      outcome: {
        kind: "newTarget",
        targetId: replacementId,
        replacementTargetKind: "attackRoll",
        spatialFacts: replacementFill.spatialFacts ?? [],
      },
    });
    const retargetFills = [damageTypeFill, targetFill, sanctuaryFill];
    const retargeted = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: retargetFills,
    });

    if (retargeted.tag !== "needsHoles") {
      throw new Error("Expected retargeted Chromatic Orb attack roll.");
    }
    const attackFill = attackRollFill(
      requireHole(retargeted.holes, "attackRoll"),
    );
    const needsDamage = resolveBattleSubject({
      state: retargeted.state,
      subject: retargeted.subject,
      fills: [...retargetFills, attackFill],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected retargeted Chromatic Orb damage roll.");
    }
    const resolved = resolveBattleSubject({
      state: needsDamage.state,
      subject: needsDamage.subject,
      fills: [
        ...retargetFills,
        attackFill,
        rolledDiceFill(requireHole(needsDamage.holes, "rolledDice"), [1, 2, 3]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected retargeted Chromatic Orb to resolve.");
    }
    expect(combatant(retargeted.state, wardedId).hp).toBe(Hp(12));
    expect(combatant(resolved.state, replacementId).hp).toBe(Hp(6));
  });

  test("failed save can lose Chromatic Orb leap target against the warded creature", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          chromaticOrbUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Chromatic Orb action spell.");
    }
    const damageTypeFill = spellDamageTypeChoiceFill(
      requireHole(act.initialHoles, "damageTypeChoice"),
      "acid",
    );
    const needsPrimaryTarget = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [damageTypeFill],
    });
    if (needsPrimaryTarget.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb primary target hole.");
    }
    const primaryTargetFill = spellTargetFill(
      requireHole(needsPrimaryTarget.holes, "targetChoice"),
      chromaticOrbUnitId,
      casterId,
      replacementId,
    );
    const needsAttack = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [damageTypeFill, primaryTargetFill],
    });
    if (needsAttack.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb attack roll hole.");
    }
    const attackFill = attackRollFill(
      requireHole(needsAttack.holes, "attackRoll"),
    );
    const needsDamage = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [damageTypeFill, primaryTargetFill, attackFill],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb damage roll hole.");
    }
    const duplicateDamageFill = rolledDiceFill(
      requireHole(needsDamage.holes, "rolledDice"),
      [4, 4, 1],
    );
    const needsLeapTarget = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        attackFill,
        duplicateDamageFill,
      ],
    });
    if (needsLeapTarget.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb leap target hole.");
    }
    expect(requireHole(needsLeapTarget.holes, "targetChoice")).toMatchObject({
      spellTargetSpatialFactRequest: {
        casterId,
        rangeFeet: 30,
        visibility: "notSpecifiedByProcedure",
      },
    });
    const leapTargetFill = spellLeapTargetFill(
      requireHole(needsLeapTarget.holes, "targetChoice"),
      replacementId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        attackFill,
        duplicateDamageFill,
        leapTargetFill,
      ],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        attackFill,
        duplicateDamageFill,
        leapTargetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost leap to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("area-effect damaging spells do not trigger Sanctuary interdiction", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(
        battleWithSanctuary({ areaSaveDamageSpell: "flameStrike" }),
        wardedId,
      ),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          flameStrikeUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Flame Strike action spell.");
    }
    const save = requireHole(act.initialHoles, "savingThrowOutcome");

    const saveFill = savingThrowOutcomeFill(save, [
      { targetId: wardedId, succeeded: false },
    ]);
    const needsDamage = resolveBattleSubject({
      state: warded.state,
      subject: act.subject,
      fills: [saveFill],
    });

    expect(needsDamage).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
      routeEvents: expect.arrayContaining([
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "wardedTargetInterdiction",
          holes: [],
          owner: "battleAreaShape",
        },
      ]),
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Flame Strike damage roll hole.");
    }
    expect(needsDamage.holes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetingSaveInterdictionOutcome" }),
      ]),
    );

    const resolved = resolveBattleSubject({
      state: needsDamage.state,
      subject: needsDamage.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(requireHole(needsDamage.holes, "rolledDice"), [
          [4, 4, 4, 4, 4],
          [4, 4, 4, 4, 4],
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Flame Strike damage to resolve.");
    }
    expect(combatant(resolved.state, wardedId).hp).toBe(Hp(0));
  });

  test("ward remains while a warded caster is only requesting spell target holes", () => {
    const selfWarded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), casterId),
    );
    const act = discoverBattleActs(selfWarded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          fireBoltUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Fire Bolt action spell.");
    }

    const needsTarget = resolveBattleSubject({
      state: selfWarded.state,
      subject: act.subject,
      fills: [],
    });

    expect(needsTarget).toMatchObject({ tag: "needsHoles" });
    if (needsTarget.tag !== "needsHoles") {
      throw new Error("Expected Fire Bolt target holes.");
    }
    expect(needsTarget.holes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetChoice" }),
      ]),
    );
    expect(combatant(needsTarget.state, casterId).activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetingSaveInterdiction" }),
      ]),
    );
  });

  test("ward ends when the warded creature casts a support-effect spell", () => {
    const selfWarded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), casterId),
    );
    const act = discoverBattleActs(selfWarded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          longstriderUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Longstrider action spell.");
    }

    const resolved = resolveBattleSubject({
      state: selfWarded.state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          requireHole(act.initialHoles, "targetChoice"),
          longstriderUnitId,
          casterId,
          casterId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Longstrider to resolve.");
    }
    expect(combatant(resolved.state, casterId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetingSaveInterdiction" }),
      ]),
    );
    expect(resolved.routeEvents).toEqual(
      expect.arrayContaining([
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "wardedTargetInterdiction",
          holes: [],
          owner: "battleSpellSlotAndActionEconomy",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "wardedTargetInterdiction",
          holes: [],
          owner: "battleActiveEffect",
        },
      ]),
    );
  });

  test("ward ends when the warded creature makes an attack roll, casts a spell, or deals damage", () => {
    const selfWarded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), attackerId),
    );
    const attack = attackAct(selfWarded.state, wardedId);
    const targetFill = attackTargetFill(
      requireHole(attack.initialHoles, "targetChoice"),
      wardedId,
      attack.subject,
    );
    const needsAttackRoll = resolveBattleSubject({
      state: selfWarded.state,
      subject: attack.subject,
      fills: [targetFill],
    });
    if (needsAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected attack roll hole.");
    }

    const needsDamage = resolveBattleSubject({
      state: selfWarded.state,
      subject: attack.subject,
      fills: [
        targetFill,
        attackRollFill(requireHole(needsAttackRoll.holes, "attackRoll")),
      ],
    });
    if (needsDamage.tag !== "needsHoles" && needsDamage.tag !== "resolved") {
      throw new Error("Expected attack roll to progress.");
    }
    expect(combatant(needsDamage.state, attackerId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetingSaveInterdiction" }),
      ]),
    );
    expect(needsDamage.routeEvents).toEqual(
      expect.arrayContaining([
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "wardedTargetInterdiction",
          holes: [],
          owner: "battleAttackRoll",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "wardedTargetInterdiction",
          holes: [],
          owner: "battleActiveEffect",
        },
      ]),
    );

    const recast = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), casterId),
    );
    const afterSpellCast = castSanctuary(recast, wardedId);
    expect(combatant(afterSpellCast.state, casterId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetingSaveInterdiction" }),
      ]),
    );

    const damageSourceWarded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), attackerId),
    );
    const afterDamage = applyBattleHitPointDamage({
      saveGatedConditionDamageRepeatSave: { kind: "noRepeatSave" },
      state: damageSourceWarded.state,
      target: combatant(damageSourceWarded.state, wardedId),
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: attackerId,
    });
    expect(combatant(afterDamage, attackerId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetingSaveInterdiction" }),
      ]),
    );
  });
});

function srdSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function battleWithSanctuary(
  input: {
    readonly casterLevel?: number;
    readonly ammunitionAttacker?: boolean;
    readonly areaSaveDamageSpell?: "flameStrike";
  } = {},
): BattleRuntimeSession {
  const legalFlameStrikeArea = input.areaSaveDamageSpell === "flameStrike";
  const result = startBattle({
    battleId: battleId("sanctuary-targeting-interdiction"),
    combatants: [
      characterCreature(
        casterId,
        "Caster",
        20,
        {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "cleric",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(legalFlameStrikeArea ? 4 : 2),
          canCastSpells: true,
          cantrips: legalFlameStrikeArea
            ? [srdSpellRecord(sacredFlameUnitId)]
            : [
                srdSpellRecord(eldritchBlastUnitId),
                srdSpellRecord(fireBoltUnitId),
                srdSpellRecord(sacredFlameUnitId),
              ],
          preparedSpells: legalFlameStrikeArea
            ? [
                srdSpellRecord(sanctuaryUnitId),
                srdSpellRecord(flameStrikeUnitId),
              ]
            : [
                srdSpellRecord(sanctuaryUnitId),
                srdSpellRecord(burningHandsUnitId),
                srdSpellRecord(chromaticOrbUnitId),
                srdSpellRecord(iceKnifeUnitId),
                srdSpellRecord(longstriderUnitId),
                srdSpellRecord(magicMissileUnitId),
              ],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: legalFlameStrikeArea
            ? [
                { spellLevel: 1, count: 2 },
                { spellLevel: 5, count: 1 },
              ]
            : [{ spellLevel: 1, count: 2 }],
        },
        input.casterLevel ?? (legalFlameStrikeArea ? 9 : undefined),
      ),
      characterCreature(wardedId, "Warded", 15),
      input.ammunitionAttacker === true
        ? {
            ...skeletonCreatureInit({ initiative: 10 }),
            combatantId: attackerId,
            displayName: "Ammunition Attacker",
          }
        : characterCreature(attackerId, "Attacker", 10),
      characterCreature(replacementId, "Replacement", 9),
    ],
  });
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function castSanctuary(
  session: BattleRuntimeSession,
  targetId: CombatantId,
): BattleRuntimeSession {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "targetingSaveInterdiction",
  );
  if (act === undefined || act.subject.tag !== "bonusActionSpell") {
    throw new Error("Expected Sanctuary Bonus Action spell act.");
  }
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [spellTargetListFillForTest(targetHole, casterId, targetId)],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Sanctuary cast to resolve.");
  }
  expect(resolved.routeEvents).toEqual(
    expect.arrayContaining([
      {
        kind: "resolveBattleSubject",
        subject: "wardedTargetInterdiction",
        fill: "targetChoice",
        holes: [],
        owner: "battleTargetSelection",
      },
    ]),
  );
  return battleRuntimeSessionForTest({
    state: resolved.state,
    context: session.context,
  });
}

function advanceToAttacker(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  return endTurnFor(endTurnFor(session, casterId), wardedId);
}

function advanceRoundToCaster(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  return endTurnFor(
    endTurnFor(endTurnFor(endTurnFor(session, casterId), wardedId), attackerId),
    replacementId,
  );
}

function endTurnFor(
  session: BattleRuntimeSession,
  actorId: CombatantId,
): BattleRuntimeSession {
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
    fills: [],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(`Expected ${actorId} to end turn.`);
  }
  return battleRuntimeSessionForTest({
    state: resolved.state,
    context: session.context,
  });
}

function attackAct(
  state: BattleState,
  targetId = wardedId,
): AvailableAttackAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      requireHole(candidate.initialHoles, "targetChoice").choices.includes(
        targetId,
      ),
  );
  if (
    act === undefined ||
    act.subject.tag !== "action" ||
    act.subject.action !== "attack"
  ) {
    throw new Error("Expected attacker Attack act.");
  }
  return { ...act, subject: act.subject };
}

type AvailableAttackAct = ReturnType<
  typeof discoverBattleActCandidates
>[number] & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
  attackSubject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(hole.relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
      ? {
          relationshipFacts: [
            {
              kind: "attackRollTargetIsEnemy" as const,
              attackerId: hole.relationshipFactRequest.attackerId,
              targetId,
              targetIsEnemy: true,
            },
          ],
        }
      : {}),
    spatialFacts: [attackTargetFact(targetId, attackSubject)],
  };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  _spellId: string,
  casterIdValue: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(hole.relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
      ? {
          relationshipFacts: [
            {
              kind: "attackRollTargetIsEnemy" as const,
              attackerId: hole.relationshipFactRequest.attackerId,
              targetId,
              targetIsEnemy: true,
            },
          ],
        }
      : {}),
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: casterIdValue,
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
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(hole.relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
      ? {
          relationshipFacts: [
            {
              kind: "attackRollTargetIsEnemy" as const,
              attackerId: hole.relationshipFactRequest.attackerId,
              targetId,
              targetIsEnemy: true,
            },
          ],
        }
      : {}),
    spatialFacts: [
      {
        kind: "spellLeapTargetWithinRange",
        previousTargetId,
        targetId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(hole),
        rangeFeet: movementFeet(30),
      },
    ],
  };
}

function spellTargetAllocationFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
  targetId: CombatantId,
  count: number,
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }>;
function spellTargetAllocationFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[],
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }>;
function spellTargetAllocationFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
  targetIdOrAllocations:
    | CombatantId
    | readonly { readonly targetId: CombatantId; readonly count: number }[],
  count?: number,
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  let allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[];
  if (typeof targetIdOrAllocations === "string") {
    if (count === undefined) {
      throw new Error("Expected allocation count for a single target.");
    }
    allocations = [{ targetId: targetIdOrAllocations, count }];
  } else {
    allocations = targetIdOrAllocations;
  }
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map(({ targetId }) => ({
      kind: "spellTarget" as const,
      casterId,
      targetId,
      sourceProcedureRef: battleProcedureExecutionRefForSpellHoleForTest(hole),
    })),
  };
}

function spellDamageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<BattleFill, { readonly kind: "damageTypeChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
}

function attackTargetFact(
  targetId: CombatantId,
  attackSubject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
) {
  return {
    kind: "attackTargetDistance" as const,
    actorId: attackerId,
    targetId,
    distanceFeet: movementFeet(5),
    ...attackExecutionSelectionForSubjectForTest(attackSubject),
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number } = {
    total: 18,
    naturalD20: 12,
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  const relationshipFactRequest =
    "relationshipFactRequest" in hole
      ? hole.relationshipFactRequest
      : undefined;
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    ...(relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
      ? {
          relationshipFacts: [
            {
              kind: "attackRollTargetIsEnemy" as const,
              attackerId: relationshipFactRequest.attackerId,
              targetId: relationshipFactRequest.targetId,
              targetIsEnemy: true,
            },
          ],
        }
      : {}),
    value: { total: value.total, naturalD20: DieRollResult(value.naturalD20) },
  };
}

function rolledDiceFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  faces: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [first, ...rest] = faces;
  if (first === undefined) {
    throw new Error("Expected at least one die face.");
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

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const relationshipFactRequest =
    "relationshipFactRequest" in hole
      ? hole.relationshipFactRequest
      : undefined;
  const relationshipFacts =
    relationshipFactRequest?.kind === "savingThrowTargetIsEnemy" &&
    outcomes[0] !== undefined
      ? ([
          {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId: relationshipFactRequest.actorId,
            targetId: outcomes[0].targetId,
            targetIsEnemy: true,
          },
          ...outcomes.slice(1).map((outcome) => ({
            kind: "savingThrowTargetIsEnemy" as const,
            actorId: relationshipFactRequest.actorId,
            targetId: outcome.targetId,
            targetIsEnemy: true,
          })),
        ] as const)
      : undefined;
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    ...(relationshipFacts === undefined ? {} : { relationshipFacts }),
    value: {
      ...("outcomeTargeting" in hole && hole.outcomeTargeting === "singleTarget"
        ? {}
        : {
            area: {
              originAnchorId: casterId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
            },
          }),
      outcomes,
    },
  };
}

function sanctuaryOutcomeFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "targetingSaveInterdictionOutcome" }
  >,
  value: Extract<
    BattleFill,
    { readonly kind: "targetingSaveInterdictionOutcome" }
  >["value"],
): Extract<BattleFill, { readonly kind: "targetingSaveInterdictionOutcome" }> {
  return {
    kind: "targetingSaveInterdictionOutcome",
    holeId: hole.holeId,
    value,
  };
}

function characterCreature(
  combatantIdValue: CombatantId,
  displayName: string,
  initiative: number,
  spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"],
  classLevel = 1,
): BattleCreatureInit {
  return {
    combatantId: combatantIdValue,
    displayName,
    initiative: initiativeScore(initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${combatantIdValue}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "cleric", level: classLevel }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
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
      ...(spellcasting === undefined ? {} : { spellcasting }),
    },
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

function combatant(state: BattleState, id: CombatantId) {
  const found = state.combatants.get(id);
  if (found === undefined) {
    throw new Error(`Expected combatant ${id}.`);
  }
  return found;
}
