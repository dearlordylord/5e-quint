// Runtime hole resolution helpers extracted from battle-reducer.ts.
// Cluster R (hole_helpers). Mechanical extraction — no behavior change.
// Includes prerequisite moves: bonusActionDashSubjectForSpeedKind (from C),
// hideAbilityCheckHole, searchAbilityCheckHole, escapeSpellRestraintAbilityCheckHole (from H).

import { Match } from "effect";
import { difficultyClass, type DifficultyClass } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import type {
  BattleMovementSpeedKind,
  BattleSubject,
  BonusActionStandardActionSubject,
} from "../battle-subjects.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type { CharacterBattleResourceState } from "../character-battle-resources.ts";
import { resourceHasUsesRemaining } from "../character-battle-resources.ts";
import {
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  type AlternateActionCostAction,
  type BattleBonusActionDashTemporaryHitPointsSupportProfile,
  type BattleUnitSupportProfile,
} from "../unit-feature-support.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  ATTACK_TARGET_HOLE_INSTANCE,
  ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
  ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE,
  ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
  ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_INSTANCE,
  GRAPPLE_OUTCOME_HOLE_ID,
  GRAPPLE_OUTCOME_HOLE_INSTANCE,
  GRAPPLE_TARGET_HOLE_ID,
  GRAPPLE_TARGET_HOLE_INSTANCE,
  HIDE_ABILITY_CHECK_HOLE_ID,
  HIDE_ABILITY_CHECK_HOLE_INSTANCE,
  HIDE_DC,
  SEARCH_ABILITY_CHECK_HOLE_ID,
  SEARCH_ABILITY_CHECK_HOLE_INSTANCE,
  SEARCH_TARGET_HOLE_ID,
  SEARCH_TARGET_HOLE_INSTANCE,
  snapshotBattle,
  spellSaveDcForCaster,
  type AvailableBattleAct,
  type BattleAbilityCheckHole,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleGrappleLink,
  type BattleGrappleOutcomeHole,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleTargetChoiceHole,
} from "../battle-reducer.ts";
import {
  grappleLinkForTarget,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";
import { combatantCanTakeActions } from "./creature-state.ts";

export function bonusActionDashSubjectForSpeedKind(
  actorId: CombatantId,
  sourceUnitId: string,
  speedKind: BattleMovementSpeedKind,
): BonusActionStandardActionSubject {
  return {
    tag: "bonusActionStandardAction",
    actorId,
    sourceUnitId,
    action: "dash",
    speedKind,
  };
}

export function hideAbilityCheckHole(): BattleAbilityCheckHole {
  return {
    holeInstanceKey: HIDE_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: HIDE_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Hide Dexterity (Stealth) check (DC ${HIDE_DC})`,
    ability: "dex",
    skill: "stealth",
    dc: HIDE_DC,
  };
}

export function searchAbilityCheckHole(
  dc: DifficultyClass,
): BattleAbilityCheckHole {
  return {
    holeInstanceKey: SEARCH_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: SEARCH_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Search Wisdom (Perception) check (DC ${dc})`,
    ability: "wis",
    skill: "perception",
    dc,
  };
}

export function escapeSpellRestraintAbilityCheckHole(
  state: BattleState,
  effect: Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>,
  input: { readonly actorId: CombatantId; readonly targetId: CombatantId },
): BattleAbilityCheckHole {
  const dc = spellSaveDcForCaster(state, effect.sourceCombatantId);
  return {
    holeInstanceKey: ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Escape ${effect.sourceSpellId} Strength (Athletics) check (DC ${dc ?? 1})`,
    ability: "str",
    skill: "athletics",
    dc: dc ?? difficultyClass(1),
    ...(input.actorId === input.targetId
      ? {}
      : { requiresTableSpatialFact: true }),
  };
}

export function needsHolesResult(
  state: BattleState,
  subject: BattleSubject,
  holes: readonly BattleHole[],
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  return {
    tag: "needsHoles",
    state,
    subject,
    holes,
    snapshot: snapshotBattle(state),
  };
}

export function attackTargetHole(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label: "Attack target",
    requiresTableSpatialFact: true,
    choices: attackTargetChoices(state, actorId, attack),
  };
}

export function searchTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: SEARCH_TARGET_HOLE_ID,
    holeInstanceKey: SEARCH_TARGET_HOLE_INSTANCE,
    label: "Hidden creature to Search for",
    choices: hiddenSearchTargetChoices(state, actorId),
  };
}

export function grappleTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: GRAPPLE_TARGET_HOLE_ID,
    holeInstanceKey: GRAPPLE_TARGET_HOLE_INSTANCE,
    label: "Grapple target",
    requiresTableSpatialFact: true,
    choices: grappleTargetChoices(state, actorId),
  };
}

export function grappleOutcomeHole(
  link: BattleGrappleLink,
): BattleGrappleOutcomeHole {
  return {
    kind: "grappleOutcome",
    holeId: GRAPPLE_OUTCOME_HOLE_ID,
    holeInstanceKey: GRAPPLE_OUTCOME_HOLE_INSTANCE,
    label: "Grapple saving throw",
    actorId: link.grapplerId,
    targetId: link.targetId,
    dc: link.escapeDc,
    mode: "grappleSave",
  };
}

export function escapeGrappleOutcomeHole(
  link: BattleGrappleLink,
  actorId: CombatantId,
): BattleGrappleOutcomeHole {
  return {
    kind: "grappleOutcome",
    holeId: ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
    holeInstanceKey: ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE,
    label: "Escape Grapple ability check",
    actorId,
    targetId: link.grapplerId,
    dc: link.escapeDc,
    mode: "escapeCheck",
  };
}

export function attackTargetChoices(
  state: BattleState,
  actorId: CombatantId,
  _attack: SupportedAttackActionOption,
): readonly CombatantId[] {
  return [...state.combatants.keys()].filter(
    (id) => id !== actorId && state.combatants.has(id),
  );
}

export function hiddenSearchTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants.values()]
    .filter(
      (combatant) =>
        combatant.combatantId !== actorId && combatant.hidden !== null,
    )
    .map((combatant) => combatant.combatantId);
}

export function revealHidden(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined || combatant.hidden === null) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      hidden: null,
    }),
  };
}

export function bonusActionStandardActionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !state.currentTurnResources.currentHasBonusAction
  ) {
    return [];
  }

  const alternateCostActs = alternateActionCostProfilesForActor(actor).flatMap(
    (entry) =>
      entry.profile.from.actions.flatMap((action) => {
        if (!alternateActionCostActionAvailable(state, actorId, action)) {
          return [];
        }
        const speedKinds =
          action === "dash"
            ? representedMovementSpeedKinds(actor)
            : ["walk" as const];
        return speedKinds.map((speedKind) => ({
          subject:
            action === "dash"
              ? bonusActionDashSubjectForSpeedKind(
                  actorId,
                  entry.unitId,
                  speedKind,
                )
              : {
                  tag: "bonusActionStandardAction" as const,
                  actorId,
                  sourceUnitId: entry.unitId,
                  action,
                },
          label: alternateActionCostActionLabel(action),
          summary: `${alternateActionCostActionLabel(action)} as a Bonus Action.`,
          initialHoles: action === "hide" ? [hideAbilityCheckHole()] : [],
        }));
      }),
  );
  const dashTemporaryHitPointActs =
    bonusActionDashTemporaryHitPointsProfilesForActor(actor).flatMap(
      (entry) => {
        if (!alternateActionCostActionAvailable(state, actorId, "dash")) {
          return [];
        }
        return representedMovementSpeedKinds(actor).map((speedKind) => ({
          subject: bonusActionDashSubjectForSpeedKind(
            actorId,
            entry.unitId,
            speedKind,
          ),
          label: entry.resource.unit.name,
          summary:
            "Spend a Bonus Action and one use to Dash and gain Temporary Hit Points.",
          initialHoles: [],
        }));
      },
    );
  return [...alternateCostActs, ...dashTemporaryHitPointActs];
}

export function alternateActionCostProfilesForActor(
  combatant: BattleCreatureState | undefined,
): readonly {
  readonly unitId: UnitRecord["id"];
  readonly profile: Extract<
    BattleUnitSupportProfile,
    { readonly kind: "alternateActionCost" }
  >;
}[] {
  return combatant?.origin.kind === "character"
    ? combatant.origin.characterUnitRefs.flatMap((unitRef) =>
        unitRef.supportProfiles.flatMap((profile) =>
          typeof profile === "object" && profile.kind === "alternateActionCost"
            ? [{ unitId: unitRef.unitId, profile }]
            : [],
        ),
      )
    : [];
}

export function bonusActionDashTemporaryHitPointsProfilesForActor(
  combatant: BattleCreatureState | undefined,
): readonly {
  readonly unitId: UnitRecord["id"];
  readonly profile: BattleBonusActionDashTemporaryHitPointsSupportProfile;
  readonly resource: CharacterBattleResourceState;
}[] {
  if (combatant?.origin.kind !== "character") {
    return [];
  }
  const origin = combatant.origin;
  return origin.characterUnitRefs.flatMap((unitRef) =>
    unitRef.supportProfiles.flatMap((profile) => {
      if (
        typeof profile !== "object" ||
        profile.kind !== BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE
      ) {
        return [];
      }
      const resource = origin.resources.find(
        (candidate) => candidate.unit.id === unitRef.unitId,
      );
      return resource !== undefined && resourceHasUsesRemaining(resource)
        ? [{ unitId: unitRef.unitId, profile, resource }]
        : [];
    }),
  );
}

export function alternateActionCostActionAvailable(
  state: BattleState,
  actorId: CombatantId,
  action: AlternateActionCostAction,
): boolean {
  return Match.value(action).pipe(
    Match.when("dash", () => true),
    Match.when("disengage", () => true),
    Match.when("hide", () => canHideInCurrentCircumstances(state, actorId)),
    Match.exhaustive,
  );
}

export function actorHasAlternateActionCost(
  combatant: BattleCreatureState | undefined,
  sourceUnitId: string,
  action: AlternateActionCostAction,
): boolean {
  return alternateActionCostProfilesForActor(combatant).some(
    (entry) =>
      entry.unitId === sourceUnitId &&
      entry.profile.to.kind === "bonusAction" &&
      entry.profile.from.actions.some((candidate) => candidate === action),
  );
}

export function bonusActionDashTemporaryHitPointsForActor(
  combatant: BattleCreatureState | undefined,
  sourceUnitId: string,
): {
  readonly profile: BattleBonusActionDashTemporaryHitPointsSupportProfile;
  readonly resource: CharacterBattleResourceState;
} | null {
  return (
    bonusActionDashTemporaryHitPointsProfilesForActor(combatant).find(
      (entry) => entry.unitId === sourceUnitId,
    ) ?? null
  );
}

export function alternateActionCostActionLabel(
  action: AlternateActionCostAction,
): string {
  return Match.value(action).pipe(
    Match.when("dash", () => "Dash"),
    Match.when("disengage", () => "Disengage"),
    Match.when("hide", () => "Hide"),
    Match.exhaustive,
  );
}

export function canHideInCurrentCircumstances(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  const prerequisite = state.hidePrerequisites.get(combatantId);
  if (prerequisite === undefined) return false;
  return Match.value(prerequisite).pipe(
    Match.when({ kind: "heavilyObscuredOutOfEnemyLineOfSight" }, () => true),
    Match.when({ kind: "coverOutOfEnemyLineOfSight" }, () => true),
    Match.exhaustive,
  );
}

export function grappleTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  return [...state.combatants.keys()].filter((targetId) => {
    const link = grappleLinkForTarget(state, actorId, targetId, [
      {
        kind: "grappleTargetWithinReach",
        grapplerId: actorId,
        targetId,
      },
    ]);
    return link.tag === "ok";
  });
}
