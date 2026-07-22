import type { SpellRecord } from "@dnd/surface/surface/types";
import type { SupportedSpellInvocation } from "../../battle-state-execution.ts";
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
): readonly SupportedSpellInvocation[] {
  return registeredSpellProcedureAdmissions().flatMap(({ admit }) =>
    admit(spell, ctx),
  );
}
