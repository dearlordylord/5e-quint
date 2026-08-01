import type {
  AdmittedBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleCreatureState,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-execution.ts";
import {
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type { BattleReducerRouteEvent } from "./reducer-route-protocol.ts";

export function activeFeatureSpellAttackRollModeDiscoveryRouteEvents(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): readonly BattleReducerRouteEvent[] {
  if (
    act.subject.tag !== "actionSpell" ||
    !hasActiveFeatureSpellAttackRollModeModifier(state, act.subject.actorId)
  ) {
    return [];
  }
  const holes = battleReducerRouteHoles(act.initialHoles);
  return holes.includes("targetChoice")
    ? [
        discoverBattleActsRoute(
          "activeFeatureSpellAttackRollMode",
          ["targetChoice"],
          "battleSpellSlotAndActionEconomy",
        ),
      ]
    : [];
}

export function activeFeatureSpellAttackRollModeResolutionRouteEvents(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (
    input.subject.tag !== "actionSpell" ||
    !hasActiveFeatureSpellAttackRollModeModifier(
      input.state,
      input.subject.actorId,
    )
  ) {
    return [];
  }
  const fill = input.fills.at(-1);
  if (fill?.kind !== "targetChoice" || result.tag !== "needsHoles") return [];
  const holes = battleReducerRouteHoles(result.holes);
  if (!holes.includes("attackRoll")) return [];
  return [
    resolveBattleSubjectRoute(
      "activeFeatureSpellAttackRollMode",
      "targetChoice",
      ["attackRoll"],
      "battleTargetSelection",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "activeFeatureSpellAttackRollMode",
      ["attackRoll"],
      "battleActiveEffect",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "activeFeatureSpellAttackRollMode",
      ["attackRoll"],
      "battleSpellAttackProcedure",
    ),
  ];
}

export function hasActiveFeatureSpellSaveDcModifier(
  state: BattleState,
  casterId: CombatantId,
): boolean {
  return activeFeatureSpellModifiers(
    state,
    state.combatants.get(casterId),
  ).some((modifier) => modifier.saveDcBonus !== 0);
}

function hasActiveFeatureSpellAttackRollModeModifier(
  state: BattleState,
  casterId: CombatantId,
): boolean {
  return activeFeatureSpellModifiers(
    state,
    state.combatants.get(casterId),
  ).some((modifier) => modifier.attackRollMode !== undefined);
}

function activeFeatureSpellModifiers(
  state: BattleState,
  caster: BattleCreatureState | undefined,
) {
  if (!isCharacterBattleCreatureState(caster)) return [];
  return [
    ...activeOngoingFeatureOccurrencesForCombatant(state, caster),
  ].flatMap(
    ([key]) =>
      ongoingFeatureProfileForSourceKey(caster, key)?.spellModifiers ?? [],
  );
}
