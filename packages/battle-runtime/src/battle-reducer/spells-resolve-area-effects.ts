// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-fog-cloud-obscurement
import type {
  ActionSpellBattleResolutionInput,
  BattleResolutionResult,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { applyFogCloudObscurementCastEffect } from "./spells-active-effects.ts";
import { spellAreaChoiceHole } from "./spells-holes-fills.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import { snapshotBattle } from "./dispatcher.ts";
import type { SpellFillSet } from "./spells-resolve-fill-set.ts";

export function resolveFogCloudObscurementSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "fogCloudObscurement" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Fog Cloud uses one table-supplied fog area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (input.fillSet.areaChoice.areaId.length === 0) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Fog Cloud area id must not be empty.",
    );
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyFogCloudObscurementCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
