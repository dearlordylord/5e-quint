// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT see_invisibility
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-see-invisible-observer-sight
import { describe, expect, test } from "vitest";
import {
  combatantCanSee,
  seeInvisibleRevealsEtherealWitness,
  seeInvisibleRevealsInvisibleObject,
  type BattleResolutionResult,
  type BattleState,
  combatantId,
} from "./index.ts";
import {
  requireCombatant,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  seeInvisibilityDurationTicks,
  seeInvisibilityUnitId,
  spellCasterId,
  spellTargetId,
  partySide,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  canSpendAction,
  difficultyClass,
  elapsedTimeTicks,
  hasCondition,
  resolveBattleSubject,
} from "./unit-profile-admission-test-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";

const observerId = combatantId("unit-profile-see-invisibility-observer");

describe(
  "L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT deterministic See Invisibility admission",
  () => {
    test("see_invisibility admits as a self timed observer-sight spell", () => {
      const spell = spellRecord(seeInvisibilityUnitId);
      const state = spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      });
      const act = spellAct({
        state,
        spellId: seeInvisibilityUnitId,
        slotLevel: 2,
      });

      expect(act.initialHoles).toEqual([]);
      expect(act.subject.invocation).toMatchObject({
        tag: "spellSlot",
        spellId: seeInvisibilityUnitId,
        slotLevel: 2,
        procedure: "seeInvisibleObserverSight",
      });

      const cast = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [],
        }),
      );

      expect(requireCombatant(cast.state, spellCasterId)).toEqual(
        expect.objectContaining({
          concentration: null,
          activeEffects: [
            expect.objectContaining({
              kind: "seeInvisibleAndEthereal",
              sourceSpellId: seeInvisibilityUnitId,
              sourceCombatantId: spellCasterId,
              expiresAt: {
                kind: "duration",
                durationTicks: seeInvisibilityDurationTicks,
              },
            }),
          ],
        }),
      );
      expect(canSpendAction(cast.state.currentTurnResources, "magic")).toBe(
        false,
      );
      expect(
        cast.state.currentTurnResources.spellSlotUsesThisTurn.some(
          (use) => use.kind === "committed",
        ),
      ).toBe(true);
    });

    test("see_invisibility is observer-scoped and does not remove the target's Invisible condition", () => {
      const state = withInvisibleTarget(
        spellBattle({
          preparedSpells: [spellRecord(seeInvisibilityUnitId)],
          spellSlots: [{ spellLevel: 2, count: 1 }],
          statBlockTargets: [
            {
              combatantId: observerId,
              statBlock: statBlockWithCreatureType("humanoid"),
              initiative: 9,
              side: partySide,
            },
          ],
        }),
      );

      expect(combatantCanSee(state, spellCasterId, spellTargetId)).toBe(false);
      expect(combatantCanSee(state, observerId, spellTargetId)).toBe(false);

      const cast = castSeeInvisibility(state);

      expect(combatantCanSee(cast.state, spellCasterId, spellTargetId)).toBe(
        true,
      );
      expect(combatantCanSee(cast.state, observerId, spellTargetId)).toBe(
        false,
      );
      expect(
        hasCondition(
          requireCombatant(cast.state, spellTargetId).conditions,
          "invisible",
        ),
      ).toBe(true);
      expect(requireCombatant(cast.state, spellTargetId).activeEffects).toEqual(
        [],
      );
      expect(
        seeInvisibleRevealsInvisibleObject(cast.state, {
          observerId: spellCasterId,
          objectHasInvisibleCondition: true,
          hasSightLine: true,
          blockedByOpaqueCover: false,
        }),
      ).toBe(true);
      expect(
        seeInvisibleRevealsInvisibleObject(cast.state, {
          observerId,
          objectHasInvisibleCondition: true,
          hasSightLine: true,
          blockedByOpaqueCover: false,
        }),
      ).toBe(false);
    });

    test("see_invisibility object witnesses still require Invisible plus a clear sight line", () => {
      const cast = castSeeInvisibility(
        spellBattle({
          preparedSpells: [spellRecord(seeInvisibilityUnitId)],
          spellSlots: [{ spellLevel: 2, count: 1 }],
        }),
      );

      expect(
        seeInvisibleRevealsInvisibleObject(cast.state, {
          observerId: spellCasterId,
          objectHasInvisibleCondition: false,
          hasSightLine: true,
          blockedByOpaqueCover: false,
        }),
      ).toBe(false);
      expect(
        seeInvisibleRevealsInvisibleObject(cast.state, {
          observerId: spellCasterId,
          objectHasInvisibleCondition: true,
          hasSightLine: false,
          blockedByOpaqueCover: false,
        }),
      ).toBe(false);
      expect(
        seeInvisibleRevealsInvisibleObject(cast.state, {
          observerId: spellCasterId,
          objectHasInvisibleCondition: true,
          hasSightLine: true,
          blockedByOpaqueCover: true,
        }),
      ).toBe(false);
    });

    test("see_invisibility does not reveal a hidden target just because the target is Invisible", () => {
      const cast = castSeeInvisibility(withHiddenInvisibleTarget());

      expect(combatantCanSee(cast.state, spellCasterId, spellTargetId)).toBe(
        false,
      );
      expect(
        requireCombatant(cast.state, spellTargetId).hidden,
      ).toEqual({ discoveryDc: difficultyClass(16) });
      expect(
        hasCondition(
          requireCombatant(cast.state, spellTargetId).conditions,
          "invisible",
        ),
      ).toBe(true);
    });

    test("see_invisibility expires on duration tick and keeps Ethereal visibility observer-scoped", () => {
      const cast = castSeeInvisibility(
        spellBattle({
          preparedSpells: [spellRecord(seeInvisibilityUnitId)],
          spellSlots: [{ spellLevel: 2, count: 1 }],
          statBlockTargets: [
            {
              combatantId: observerId,
              statBlock: statBlockWithCreatureType("humanoid"),
              initiative: 9,
              side: partySide,
            },
          ],
        }),
      );

      expect(
        seeInvisibleRevealsEtherealWitness(cast.state, {
          observerId: spellCasterId,
          targetPlane: "ethereal",
          hasSightLine: true,
          blockedByOpaqueCover: false,
        }),
      ).toBe(true);
      expect(
        seeInvisibleRevealsEtherealWitness(cast.state, {
          observerId,
          targetPlane: "ethereal",
          hasSightLine: true,
          blockedByOpaqueCover: false,
        }),
      ).toBe(false);

      expect(
        seeInvisibleRevealsEtherealWitness(cast.state, {
          observerId: spellCasterId,
          targetPlane: "material",
          hasSightLine: true,
          blockedByOpaqueCover: false,
        }),
      ).toBe(false);
      expect(
        seeInvisibleRevealsEtherealWitness(cast.state, {
          observerId: spellCasterId,
          targetPlane: "ethereal",
          hasSightLine: false,
          blockedByOpaqueCover: false,
        }),
      ).toBe(false);
      expect(
        seeInvisibleRevealsEtherealWitness(cast.state, {
          observerId: spellCasterId,
          targetPlane: "ethereal",
          hasSightLine: true,
          blockedByOpaqueCover: true,
        }),
      ).toBe(false);

      const nearlyExpired: BattleState = {
        ...cast.state,
        combatants: new Map(
          Array.from(cast.state.combatants.entries()).map(([id, combatant]) => [
            id,
            id !== spellCasterId
              ? combatant
              : {
                  ...combatant,
                  activeEffects: combatant.activeEffects.map((effect) =>
                    effect.kind === "seeInvisibleAndEthereal"
                      ? {
                          ...effect,
                          expiresAt: {
                            kind: "duration",
                            durationTicks: elapsedTimeTicks(1),
                          },
                        }
                      : effect,
                  ),
                },
          ]),
        ),
      };
      const expired = {
        ...nearlyExpired,
        combatants: tickDurationEffects(nearlyExpired.combatants),
      };

      expect(
        requireCombatant(expired, spellCasterId).activeEffects,
      ).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ kind: "seeInvisibleAndEthereal" }),
        ]),
      );
      expect(
        seeInvisibleRevealsEtherealWitness(expired, {
          observerId: spellCasterId,
          targetPlane: "ethereal",
          hasSightLine: true,
          blockedByOpaqueCover: false,
        }),
      ).toBe(false);
    });
  },
);

function castSeeInvisibility(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const act = spellAct({
    state,
    spellId: seeInvisibilityUnitId,
    slotLevel: 2,
  });
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    }),
  );
}

function withInvisibleTarget(state: BattleState): BattleState {
  const target = requireCombatant(state, spellTargetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(target.conditions, "invisible"),
      ),
    }),
  };
}

function withHiddenInvisibleTarget(): BattleState {
  const state = withInvisibleTarget(
    spellBattle({
      preparedSpells: [spellRecord(seeInvisibilityUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    }),
  );
  const target = requireCombatant(state, spellTargetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      hidden: { discoveryDc: difficultyClass(16) },
    }),
  };
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected battle subject to resolve.");
  }
  return result;
}
