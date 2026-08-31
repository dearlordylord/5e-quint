import type { SupportedSpellInvocation } from "../../battle-state-execution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import {
  type AnySpellProcedureAdmission,
  type SpellAdmissionContext,
} from "./profile.ts";
import {
  admitBattleSpellMechanicsFrom,
  type AnySpellProcedureMechanicsAdmission,
  type BattleSpellMechanicsAdmission,
} from "./spell-mechanics-admission.ts";
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

/**
 * Static readers are derived from the canonical declaration table.  This is a
 * registry view, not a second table: procedure ownership remains in each
 * profile declaration and synthesized execution-only procedures are omitted.
 */
export function registeredSpellProcedureMechanicsAdmissions(): readonly AnySpellProcedureMechanicsAdmission[] {
  return Object.values(registeredSpellProcedureDeclarations()).flatMap(
    ({ procedure, admission }) =>
      admission.kind === "authored"
        ? [{ procedure, admitMechanics: admission.admitMechanics }]
        : [],
  );
}

/**
 * Admit one already-decoded Spell Definition mechanics graph through the
 * profile-owned static readers.  Identity and contextual Battle facts belong
 * to the caller's outer admission join and are intentionally not accepted.
 */
export function admitRegisteredSpellProcedureMechanics(
  mechanics: SpellMechanics,
): BattleSpellMechanicsAdmission {
  return admitBattleSpellMechanicsFrom(
    mechanics,
    registeredSpellProcedureMechanicsAdmissions(),
  );
}
