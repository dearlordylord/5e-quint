import type { SupportedSpellInvocation } from "../../battle-state-execution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import {
  type AnySpellProcedureAdmission,
  type SpellAdmissionContext,
} from "./profile.ts";
import { registeredSpellProcedureDeclarations } from "./registry.ts";

export function registeredSpellProcedureAdmissions(): readonly AnySpellProcedureAdmission[] {
  return Object.values(registeredSpellProcedureDeclarations()).flatMap(
    ({ admission }) => (admission.kind === "authored" ? [admission] : []),
  );
}

export function admitRegisteredSpellProcedures(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SupportedSpellInvocation[] {
  return registeredSpellProcedureAdmissions().flatMap(({ admit }) =>
    admit(spell, ctx).map((invocation) => ({ ...invocation, spell })),
  );
}
