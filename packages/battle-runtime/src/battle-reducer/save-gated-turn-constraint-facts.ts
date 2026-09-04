// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleExecutableSpellInvocation,
  BattleTurnConstraintSomaticSpellFailureOutcomeHole,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT } from "./domain-constants.ts";
import type { SpellMetamagicApplicationFact } from "./metamagic-support.ts";
import { subtleSpellComponentProjectionForApplications } from "./metamagic-support.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";
import { saveGatedTurnConstraintBundleEffects } from "./save-gated-turn-constraint-turn-resources.ts";
export { saveGatedTurnConstraintBundleEffects } from "./save-gated-turn-constraint-turn-resources.ts";

export function turnConstraintSomaticSpellFailureOutcomeHole(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): BattleTurnConstraintSomaticSpellFailureOutcomeHole | null {
  const effects = saveGatedTurnConstraintBundleEffects(
    input.state,
    input.state.combatants.get(input.actorId),
  );
  if (
    effects.length === 0 ||
    !spellInvocationRequiresEffectiveSomaticComponent(
      input.metamagicApplications === undefined
        ? { invocation: input.invocation }
        : {
            invocation: input.invocation,
            metamagicApplications: input.metamagicApplications,
          },
    )
  ) {
    return null;
  }
  const key = [
    "battle:turn-constraint-somatic-spell-failure",
    input.actorId,
    input.invocation.sourceProcedureRef,
  ]
    .map(String)
    .join(":");
  return {
    holeInstanceKey: holeInstanceKey(key),
    holeId: holeId(key),
    kind: "turnConstraintSomaticSpellFailureOutcome",
    label: "Save-gated Somatic spell failure chance",
    actorId: input.actorId,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    failurePercent: SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT,
    activeEffectSources: effects.map((effect) => ({
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
    })),
  };
}

function spellInvocationRequiresEffectiveSomaticComponent(input: {
  readonly invocation: BattleExecutableSpellInvocation;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): boolean {
  if (
    !spellInvocationIsSpellcasting(input.invocation) ||
    !input.invocation.spellRuleFacts.components.somatic
  ) {
    return false;
  }
  const projection = subtleSpellComponentProjectionForApplications(
    input.metamagicApplications,
  );
  return (
    projection?.suppressedComponents.some(
      (component) => component.kind === "somatic",
    ) !== true
  );
}
