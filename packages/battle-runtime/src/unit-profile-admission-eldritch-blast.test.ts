// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV39 eldritch_blast
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-beam-sequence
import { describe, expect, test } from "vitest";
import {
  attackBonus,
  cantripSpellInvocationRef,
  classLevel,
  decodeUnitRecordSync,
  eldritchBlastInput,
  eldritchBlastUnitId,
  eldritchBlastWithTargetCount,
  maybeSpellAct,
  requireResultHole,
  resolveBattleSubject,
  spellAct,
  spellBattle,
  spellCasterId,
  spellHoleInvocation,
  spellRecord,
  spellTargetFill,
  spellTargetId,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleHole,
  SpellRecord,
} from "./unit-profile-admission-test-support.ts";

describe("SRDINV39 deterministic Eldritch Blast Spell Unit admission", () => {
  test("eldritch_blast is admitted as exact SRD creature-or-object spell attack beams", () => {
    const spell = spellRecord(eldritchBlastUnitId);
    const state = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "warlock", level: classLevel(5) }],
    });
    const act = spellAct({ state, spellId: eldritchBlastUnitId });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        eldritchBlastUnitId,
        "spellAttackBeamSequence",
      ),
      mode: { tag: "cast" },
    });
    expect(act.initialHoles.map((hole) => hole.kind)).toEqual([
      "targetChoice",
      "objectTargetChoice",
      "targetChoice",
      "objectTargetChoice",
    ]);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({ label: "Eldritch Blast beam 1 target" }),
      expect.objectContaining({
        label: "Eldritch Blast beam 1 object target",
        requiresTableSpatialFact: true,
      }),
      expect.objectContaining({ label: "Eldritch Blast beam 2 target" }),
      expect.objectContaining({
        label: "Eldritch Blast beam 2 object target",
        requiresTableSpatialFact: true,
      }),
    ]);
    const targetHoles = act.initialHoles.filter(
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: targetHoles.map((hole) =>
          spellTargetFill(
            hole,
            eldritchBlastUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ),
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackBeamSequence",
        spell,
        targeting: { kind: "beamSequenceCreatureOrObject", beamCount: 2 },
        damage: {
          expr: { dice: 1, dieSize: 10 },
          damageType: "force",
        },
        rangeFeet: 120,
        attackKind: "ranged_spell_attack",
        attackBonus: attackBonus(5),
      }),
    );
  });

  test("canonical Eldritch Blast records with non-SRD beam count tiers are not admitted", () => {
    const decoded = decodeUnitRecordSync(eldritchBlastInput);
    expect(decoded.kind).toBe("spell");
    if (decoded.kind !== "spell") return;

    const malformedSpells = [
      eldritchBlastWithTargetCount(decoded, "eldritch_blast_wrong_base", {
        kind: "threshold_tiers",
        axis: "character",
        base: 2,
        tiers: [
          { atLevel: 5, value: 2 },
          { atLevel: 11, value: 3 },
          { atLevel: 17, value: 4 },
        ],
      }),
      eldritchBlastWithTargetCount(decoded, "eldritch_blast_wrong_level", {
        kind: "threshold_tiers",
        axis: "character",
        base: 1,
        tiers: [
          { atLevel: 4, value: 2 },
          { atLevel: 11, value: 3 },
          { atLevel: 17, value: 4 },
        ],
      }),
      eldritchBlastWithTargetCount(decoded, "eldritch_blast_wrong_count", {
        kind: "threshold_tiers",
        axis: "character",
        base: 1,
        tiers: [
          { atLevel: 5, value: 2 },
          { atLevel: 11, value: 4 },
          { atLevel: 17, value: 4 },
        ],
      }),
      eldritchBlastWithTargetCount(decoded, "eldritch_blast_missing_tier", {
        kind: "threshold_tiers",
        axis: "character",
        base: 1,
        tiers: [
          { atLevel: 5, value: 2 },
          { atLevel: 11, value: 3 },
        ],
      }),
    ] as const satisfies readonly SpellRecord[];

    for (const spell of malformedSpells) {
      expect(
        maybeSpellAct({
          state: spellBattle({ cantrips: [spell] }),
          spellId: spell.id,
        }),
      ).toBeUndefined();
    }
  });
});
