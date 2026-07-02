// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE gaseous_form
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-mist-cloud-form
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MIST_CLOUD_FORM_STATE
import { describe, expect, test } from "vitest";
import type { EffectAtom, SpellRecord } from "@dnd/surface/surface/types";
import {
  combatantId,
  discoverBattleActs,
  elapsedTimeTicks,
  resolveBattleSubject,
  spellCasterId,
  spellSlotInvocationRef,
  spellTargetId,
} from "./unit-profile-admission-test-support.ts";
import { gaseousFormUnitId } from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetListFill,
  spellAct,
  spellHoleInvocation,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";

const secondTargetId = combatantId("unit-profile-gaseous-form-target-2");
type TransformTargetEffect = Extract<
  EffectAtom,
  { readonly kind: "transform_target" }
>;

describe("L12-SH62 deterministic Gaseous Form mist-cloud state admission", () => {
  test("admits Gaseous Form as a willing target mist-cloud Spell Effect occurrence", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
      extraTargetIds: [secondTargetId],
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "actionSpell" &&
          act.subject.invocation.spellId === gaseousFormUnitId &&
          act.subject.invocation.tag === "spellSlot" &&
          Number(act.subject.invocation.slotLevel) === 2,
      ),
    ).toBe(false);
    const thirdLevelAct = spellAct({
      state,
      spellId: gaseousFormUnitId,
      slotLevel: 3,
    });
    const fourthLevelAct = spellAct({
      state,
      spellId: gaseousFormUnitId,
      slotLevel: 4,
    });

    expect(thirdLevelAct.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(gaseousFormUnitId, 3, "mistCloudForm"),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(
      thirdLevelAct.initialHoles,
      "spellTargetList",
    );
    expect(targetHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 1,
        choices: [spellCasterId],
        requiresTableSpatialFact: true,
      }),
    );
    expect(spellHoleInvocation([targetHole])).toEqual(
      expect.objectContaining({
        procedure: "mistCloudForm",
        spell,
        actionCost: "magicAction",
        resource: { tag: "spellSlot", slotLevel: 3 },
        targeting: {
          kind: "targetList",
          minTargets: 1,
          maxTargets: 1,
          requiredTargetDisposition: "willing",
        },
        activeEffect: {
          kind: "spellMistCloudForm",
          sourceSpellId: gaseousFormUnitId,
          sourceCombatantId: spellCasterId,
          transformedObjects: "wornAndCarried",
          earlyEnds: [
            { kind: "targetDropsToZeroHitPoints" },
            { kind: "targetMagicActionDismissal" },
            { kind: "spellEnds" },
          ],
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(600),
          },
        },
      }),
    );
    expect(spellHoleInvocation(fourthLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "mistCloudForm",
        resource: { tag: "spellSlot", slotLevel: 4 },
        targeting: expect.objectContaining({ maxTargets: 2 }),
      }),
    );
  });

  test("resolves a willing target into target-owned state and caster Concentration", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: gaseousFormUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = knownWillingSpellTargetListFill(
      targetHole,
      spellCasterId,
      gaseousFormUnitId,
      [spellTargetId],
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Gaseous Form cast to resolve.");
    }

    const caster = requireCombatant(resolved.state, spellCasterId);
    const target = requireCombatant(resolved.state, spellTargetId);
    expect(caster.concentration).toEqual({
      sourceSpellId: gaseousFormUnitId,
      effectKind: "spellEffect",
    });
    expect(target.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMistCloudForm",
        sourceSpellId: gaseousFormUnitId,
        sourceCombatantId: spellCasterId,
        transformedObjects: "wornAndCarried",
        earlyEnds: [
          { kind: "targetDropsToZeroHitPoints" },
          { kind: "targetMagicActionDismissal" },
          { kind: "spellEnds" },
        ],
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    ]);
    const [effect] = target.activeEffects;
    expect(effect).not.toHaveProperty("speedKind");
    expect(effect).not.toHaveProperty("damageType");
    expect(effect).not.toHaveProperty("condition");
    expect(effect).not.toHaveProperty("ability");
  });

  test("requires known willing target evidence before applying the form", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: gaseousFormUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      gaseousFormUnitId,
      [spellTargetId],
    );

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
    ).toEqual(
      expect.objectContaining({
        tag: "invalid",
        reason: "invalidFill",
        message:
          "Spell targets must be combatants within the selected spell's supported range.",
      }),
    );
  });

  test("admission follows typed mist-cloud shape rather than authored spell id", () => {
    const spell = {
      ...spellRecord(gaseousFormUnitId),
      id: "synthetic_mist_cloud_form_fixture",
      name: "Synthetic Mist Cloud Form",
    } as SpellRecord;
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });

    expect(
      spellAct({ state, spellId: spell.id, slotLevel: 3 }).subject.invocation,
    ).toEqual(spellSlotInvocationRef(spell.id, 3, "mistCloudForm"));
  });

  test("admission rejects adjacent transform shapes missing Magic Action self-end", () => {
    const spell = gaseousFormWithRevertTriggers(
      "synthetic_mist_cloud_form_missing_self_end",
      (trigger) => trigger.kind !== "dismissed_by_target",
    );

    expectSpellNotAdmitted(spell);
  });
});

function gaseousFormWithRevertTriggers(
  id: string,
  keepTrigger: (
    trigger: TransformTargetEffect["revertTriggers"][number],
  ) => boolean,
): SpellRecord {
  const base = spellRecord(gaseousFormUnitId);
  if (base.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Gaseous Form ongoing-effect mechanics.");
  }
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      operations: base.mechanics.operations.map((operation) =>
        operation.effect.kind === "transform_target"
          ? {
              ...operation,
              effect: {
                ...operation.effect,
                revertTriggers:
                  operation.effect.revertTriggers.filter(keepTrigger),
              },
            }
          : operation,
      ),
    },
  } as unknown as SpellRecord;
}

function expectSpellNotAdmitted(spell: SpellRecord): void {
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
  expect(
    discoverBattleActs(state).some(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.invocation.spellId === spell.id,
    ),
  ).toBe(false);
}
