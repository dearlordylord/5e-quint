// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-C17-HASTE-POSITIVE-RUNTIME haste
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-haste-positive
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
import {
  canSpendAction,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { describe, expect, test } from "vitest";

import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { openClassFeatureExtraAttackResource } from "./battle-reducer/attack-resolution.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  extraAttackSupportProfile,
  fighterExtraAttackUnitId,
  hasteUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  breakBattleConcentration,
  Either,
  endTurn,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type { RuntimeActionResource } from "@dnd/shared-algebras/action-economy-algebra";
import type {
  BattleState,
  CombatantId,
} from "./unit-profile-admission-test-support.ts";

describe("L5-C17 Haste positive runtime profile", () => {
  test("admits Haste as a level-3 Magic Action spell and applies positive effects", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetUnitRefs: [extraAttackBattleUnitRef()],
    });
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(hasteUnitId, 3, "hastePositive"),
      mode: { tag: "cast" },
    });

    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole,
    });

    expect(resolved.snapshot).toMatchObject({
      combatants: [
        expect.objectContaining({
          combatantId: spellCasterId,
          concentrating: true,
        }),
        expect.objectContaining({
          combatantId: spellTargetId,
          armorClass: 12,
          movement: expect.objectContaining({ speedFeet: 60 }),
        }),
      ],
    });
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") return;
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 3, count: 1, expended: 1 },
    ]);

    const target = requireCombatant(resolved.state, spellTargetId);
    expect(Number(effectiveWalkSpeed(target))).toBe(60);
    expect(target.activeEffects.map((effect) => effect.kind)).toEqual(
      expect.arrayContaining([
        "speedRatio",
        "spellArmorClassBonus",
        "savingThrowRollMode",
        "spellGrantedActionResource",
      ]),
    );
    expect(savingThrowRollModeProjections(resolved.state, "dex")).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    expect(savingThrowRollModeProjections(resolved.state, "con")).toEqual([]);

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const spellEffectResource = targetTurn.state.currentTurnResources
      .actionResources[1];
    expect(targetTurn.state.currentTurnResources.actionResources).toEqual([
      { kind: "action", source: "turn" },
      expect.objectContaining({
        kind: "action",
        source: "spellEffect",
        sourceOwnerId: spellCasterId,
        sourceSpellId: hasteUnitId,
        restriction: {
          kind: "allow_only",
          actions: [
            {
              action: "attack",
              attackLimit: { kind: "attack_count", count: 1 },
            },
            { action: "dash" },
            { action: "disengage" },
            { action: "hide" },
            { action: "utilize" },
          ],
        },
      }),
    ]);
    expect(spellEffectResource).toBeDefined();
    if (spellEffectResource === undefined) return;

    const ordinaryActionSpent = spendAction(
      targetTurn.state.currentTurnResources,
      "magic",
    );
    expect(Either.isRight(ordinaryActionSpent)).toBe(true);
    if (Either.isLeft(ordinaryActionSpent)) return;
    expect(canSpendAction(ordinaryActionSpent.right, "magic")).toBe(false);
    expect(canSpendAction(ordinaryActionSpent.right, "dash")).toBe(true);

    const noExtraAttackFromHasteAction =
      openClassFeatureExtraAttackResource({
        state: stateAfterSpendingResource(targetTurn.state, spellEffectResource),
        actorId: spellTargetId,
        spentResource: spellEffectResource,
      });
    expect(
      noExtraAttackFromHasteAction.actionResources.some(
        (resource) => resource.source === "classFeatureExtraAttack",
      ),
    ).toBe(false);
  });

  test("grants the spell action resource immediately when Haste targets the current actor", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole,
      targetId: spellCasterId,
    });

    expect(resolved.state.currentTurnResources.actionResources).toEqual([
      expect.objectContaining({
        kind: "action",
        source: "spellEffect",
        sourceOwnerId: spellCasterId,
        sourceSpellId: hasteUnitId,
      }),
    ]);
    expect(canSpendAction(resolved.state.currentTurnResources, "dash")).toBe(
      true,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
  });

  test("removes the current-turn spell action resource when self-cast Haste ends", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole,
      targetId: spellCasterId,
    });

    expect(canSpendAction(resolved.state.currentTurnResources, "dash")).toBe(
      true,
    );

    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    const caster = requireCombatant(ended, spellCasterId);
    expect(caster.concentration).toBeNull();
    expect(
      caster.activeEffects.some(
        (effect) =>
          effect.kind === "spellGrantedActionResource" &&
          effect.sourceSpellId === hasteUnitId,
      ),
    ).toBe(false);
    expect(ended.currentTurnResources.actionResources).toEqual([]);
    expect(canSpendAction(ended.currentTurnResources, "dash")).toBe(false);
  });
});

function resolveHaste(input: {
  readonly state: BattleState;
  readonly subject: ReturnType<typeof spellAct>["subject"];
  readonly targetHole: Extract<
    ReturnType<typeof spellAct>["initialHoles"][number],
    { readonly kind: "targetChoice" }
  >;
  readonly targetId?: CombatantId;
}) {
  const targetId = input.targetId ?? spellTargetId;
  const resolved = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: [
      knownWillingSpellTargetFill(
        input.targetHole,
        hasteUnitId,
        spellCasterId,
        targetId,
      ),
    ],
  });
  expect(resolved.tag).toBe("resolved");
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Haste positive effects to resolve.");
  }
  return resolved;
}

function extraAttackBattleUnitRef() {
  const unit = unitLibrary.requireUnit(fighterExtraAttackUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: fighterExtraAttackUnitId,
      supportProfiles: [extraAttackSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function stateAfterSpendingResource(
  state: BattleState,
  spentResource: RuntimeActionResource,
): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: state.currentTurnResources.actionResources.filter(
        (resource) => resource !== spentResource,
      ),
    },
  };
}
