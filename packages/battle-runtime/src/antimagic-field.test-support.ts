import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";

import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import type {
  BattleMagicSuppressionEmanationMembership,
  BattleMagicSuppressionOngoingSpellEffectRef,
  BattleAreaId,
  CombatantId,
} from "./index.ts";
import type { BattleActiveEffectOccurrenceTemplate } from "./effect-execution-ref.ts";
import { antimagicFieldUnitId } from "./unit-profile-admission-catalog.test-support.ts";

export type TestAntimagicFieldAuraMembership = {
  readonly sourceCombatantId: CombatantId;
  readonly membership: BattleMagicSuppressionEmanationMembership;
};

export function magicSuppressionEmanationMembershipForTest(input: {
  readonly sourceCombatantId: CombatantId;
  readonly originIncluded: boolean;
  readonly nonOriginCombatantIds: readonly CombatantId[];
}): TestAntimagicFieldAuraMembership {
  return {
    sourceCombatantId: input.sourceCombatantId,
    membership: {
      kind: "magicSuppressionEmanationMembership",
      originIncluded: input.originIncluded,
      nonOriginCombatantIds: input.nonOriginCombatantIds,
    },
  };
}

export function magicSuppressionEmanationEffectTemplateForTest(input: {
  readonly areaId: BattleAreaId;
  readonly aura: TestAntimagicFieldAuraMembership;
  readonly suppressedOngoingSpellEffects?: readonly BattleMagicSuppressionOngoingSpellEffectRef[];
}): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "magicSuppressionEmanation" }
> {
  return {
    kind: "magicSuppressionEmanation",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(antimagicFieldUnitId),
    ),
    sourceCombatantId: input.aura.sourceCombatantId,
    areaId: input.areaId,
    auraMembership: input.aura.membership,
    radiusFeet: movementFeet(10),
    suppressedOngoingSpellEffects: input.suppressedOngoingSpellEffects ?? [],
    expiresAt: {
      kind: "concentration",
      combatantId: input.aura.sourceCombatantId,
      durationTicks: elapsedTimeTicks(600),
    },
  };
}
