// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-chained-attack-damage
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
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
import type { SpellRecord } from "@dnd/surface/surface/types";

const spellCasterId = combatantId("chromatic-orb-caster");
const firstTargetId = combatantId("chromatic-orb-first-target");
const secondTargetId = combatantId("chromatic-orb-second-target");
const thirdTargetId = combatantId("chromatic-orb-third-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

if (statBlockCatalogResult.tag !== "ok") {
  throw new Error("Battle runtime chained spell test catalog must build.");
}

const statBlockCatalog = statBlockCatalogResult.catalog;
const chromaticOrb = decodeSpellRecord(chromaticOrbInput);

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};

describe("Chromatic Orb chained spell attack", () => {
  test("is offered only for the canonical SRD Chromatic Orb Spell Definition", () => {
    const canonicalState = chromaticOrbBattle({ spellLevel: 1 });
    const canonicalAct = chromaticOrbAct(canonicalState);
    expect(canonicalAct.subject.invocation.spellId).toBe("chromatic_orb");

    const noncanonicalLookalike = {
      ...chromaticOrb,
      id: "chained_spell_attack_fixture",
      name: "Chained Spell Attack Fixture",
      provenance: {
        kind: "xphb",
        section: "battle-runtime chained spell attack test fixture",
      },
    } satisfies SpellRecord;
    const lookalikeState = chromaticOrbBattle({
      spellLevel: 1,
      spell: noncanonicalLookalike,
    });
    expect(
      discoverBattleActs(lookalikeState).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.invocation.spellId === noncanonicalLookalike.id &&
          candidate.subject.invocation.procedure === "chainedSpellAttackDamage",
      ),
    ).toBe(false);
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
    expect(result.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      true,
    );
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
    expect(resolved.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      true,
    );
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

  test("can be readied and released without spending the spell resources twice", () => {
    const state = chromaticOrbBattle({ spellLevel: 1 });
    const readyAct = chromaticOrbReadyAct(state);
    const readied = resolveResolved(state, readyAct.subject, []);
    const releaseAct = discoverBattleActs(readied.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "releaseReadiedSpell" &&
        candidate.subject.readiedSpellCasterId === spellCasterId,
    );
    if (releaseAct?.subject.tag !== "runtimeCommand") {
      throw new Error("Expected release readied spell act.");
    }
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
  readonly secondTargetKind?: "character" | "poisonImmuneSkeleton";
  readonly spell?: SpellRecord;
}): BattleState {
  const result = startBattle({
    battleId: battleId(`chromatic-orb-${input.spellLevel}`),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Spellcaster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.spell ?? chromaticOrb],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: input.spellLevel, count: 1 }],
        },
      }),
      characterCreature({
        combatantId: firstTargetId,
        displayName: "First target",
        initiative: 10,
        side: oppositionSide,
        ...(input.firstTargetHp === undefined
          ? {}
          : { hp: input.firstTargetHp }),
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
            side: oppositionSide,
          }),
      characterCreature({
        combatantId: thirdTargetId,
        displayName: "Third target",
        initiative: 8,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
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
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === chromaticOrb.id &&
      candidate.subject.invocation.procedure === "chainedSpellAttackDamage",
  );
  if (act?.subject.tag !== "actionSpell") {
    throw new Error("Expected Chromatic Orb action spell act.");
  }
  return act;
}

function chromaticOrbReadyAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === chromaticOrb.id &&
      candidate.subject.invocation.procedure === "chainedSpellAttackDamage" &&
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
        sourceSpellId: "test_concentration_spell",
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
        spellId: chromaticOrb.id,
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
            spellId: chromaticOrb.id,
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

function poisonImmuneSkeletonCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "statBlock",
      statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
    },
  };
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly hp?: number;
}): BattleCreatureInit {
  const hp = Hp(input.hp ?? 12);
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: hp,
      maxHp: hp,
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
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}
