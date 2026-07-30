import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";

import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import type {
  BattleActiveEffect,
  BattleAntimagicFieldAuraMembership,
  BattleAreaId,
  CombatantId,
} from "./index.ts";
import { antimagicFieldUnitId } from "./unit-profile-admission-catalog.test-support.ts";

export type TestAntimagicFieldAuraMembership = {
  readonly sourceCombatantId: CombatantId;
  readonly membership: BattleAntimagicFieldAuraMembership;
};

export function antimagicFieldAuraMembershipForTest(input: {
  readonly sourceCombatantId: CombatantId;
  readonly originIncluded: boolean;
  readonly nonOriginCombatantIds: readonly CombatantId[];
}): TestAntimagicFieldAuraMembership {
  return {
    sourceCombatantId: input.sourceCombatantId,
    membership: {
      kind: "antimagicFieldAuraMembership",
      originIncluded: input.originIncluded,
      nonOriginCombatantIds: input.nonOriginCombatantIds,
    },
  };
}

export function antimagicFieldAuraEffectForTest(input: {
  readonly areaId: BattleAreaId;
  readonly aura: TestAntimagicFieldAuraMembership;
}): Extract<
  BattleActiveEffect,
  { readonly kind: "antimagicFieldOngoingSpellSuppression" }
> {
  return {
    kind: "antimagicFieldOngoingSpellSuppression",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(antimagicFieldUnitId),
    ),
    sourceCombatantId: input.aura.sourceCombatantId,
    areaId: input.areaId,
    auraMembership: input.aura.membership,
    radiusFeet: movementFeet(10),
    suppressedOngoingSpellEffects: [],
    expiresAt: {
      kind: "concentration",
      combatantId: input.aura.sourceCombatantId,
      durationTicks: elapsedTimeTicks(600),
    },
  };
}
