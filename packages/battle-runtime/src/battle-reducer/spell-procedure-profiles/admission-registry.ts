import type { SpellRecord } from "@dnd/surface/surface/types";
import type { AuthoredSupportedSpellInvocation } from "../../character-execution-admission.ts";
import type { BattleResourcePoolExecutionRef } from "../../identity.ts";
import {
  type AnySpellProcedureAdmission,
  type SpellAdmissionContext,
} from "./profile.ts";
import { registeredSpellProcedureDeclarations } from "./registry.ts";

export type SpellWithClassFeatureFreeCastRefs = SpellRecord & {
  readonly classFeatureFreeCastResourcePoolRefs?:
    | readonly BattleResourcePoolExecutionRef[]
    | undefined;
};

export function registeredSpellProcedureAdmissions(): readonly AnySpellProcedureAdmission[] {
  return Object.values(registeredSpellProcedureDeclarations()).map(
    ({ admission }) => admission,
  );
}

export function admitRegisteredSpellProcedures(
  spell: SpellWithClassFeatureFreeCastRefs,
  ctx: SpellAdmissionContext,
): readonly AuthoredSupportedSpellInvocation[] {
  return registeredSpellProcedureAdmissions().flatMap(({ admit }) =>
    admit(spell, ctx).map((invocation) => ({ ...invocation, spell })),
  );
}
