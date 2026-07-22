import type { SpellRecord } from "@dnd/surface/surface/types";
import type { AuthoredSupportedSpellInvocation } from "../../character-execution-admission.ts";
import {
  type AnySpellProcedureAdmission,
  type SpellAdmissionContext,
} from "./profile.ts";
import { registeredSpellProcedureDeclarations } from "./registry.ts";

export function registeredSpellProcedureAdmissions(): readonly AnySpellProcedureAdmission[] {
  return Object.values(registeredSpellProcedureDeclarations()).map(
    ({ admission }) => admission,
  );
}

export function admitRegisteredSpellProcedures(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly AuthoredSupportedSpellInvocation[] {
  return registeredSpellProcedureAdmissions().flatMap(({ admit }) =>
    admit(spell, ctx).map((invocation) => ({ ...invocation, spell })),
  );
}
