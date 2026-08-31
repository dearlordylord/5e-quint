import { Match } from "effect";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { SpellAdmissionContext } from "./profile.ts";
import {
  admitBattleSpellMechanicsFrom,
  type AdmittedSpellProcedureMechanicsView,
  type AnySpellProcedureMechanicsAdmission,
  type BattleSpellMechanicsAdmission,
  type SpellMechanicsAdmissionSource,
} from "./spell-mechanics-admission.ts";
import { registeredSpellProcedureDeclarations } from "./registry.ts";

function admitSupportedSpellProcedures(
  procedures: readonly AdmittedSpellProcedureMechanicsView[],
  source: ReturnType<typeof battleSpellExecutionSourceFromAdmission>,
  ctx: SpellAdmissionContext,
): readonly SupportedSpellInvocation[] {
  return procedures.reduce<readonly SupportedSpellInvocation[]>(
    (invocations, procedure) => [
      ...invocations,
      ...procedure.admit(source, ctx),
    ],
    [],
  );
}

/**
 * Compatibility view for callers that only need to inspect the derived
 * admission operations. The canonical declarations contain only the static
 * owner hook; contextual admission is bound by each supported static result.
 */
export type AnySpellProcedureAdmission = {
  readonly admit: AnySpellProcedureMechanicsAdmission["admitMechanics"];
};

export function registeredSpellProcedureAdmissions(): readonly AnySpellProcedureAdmission[] {
  return registeredSpellProcedureMechanicsAdmissions().map(
    ({ admitMechanics }) => ({ admit: admitMechanics }),
  );
}

/**
 * Static readers are derived from the canonical declaration table. This is a
 * registry view, not a second table: procedure ownership remains in each
 * profile declaration and synthesized execution-only procedures are omitted.
 */
export function registeredSpellProcedureMechanicsAdmissions(): readonly AnySpellProcedureMechanicsAdmission[] {
  return Object.values(registeredSpellProcedureDeclarations()).flatMap(
    ({ admission }) =>
      admission.kind === "authored"
        ? [{ admitMechanics: admission.admitMechanics }]
        : [],
  );
}

/**
 * Admit one already-decoded Spell Definition mechanics graph through the
 * profile-owned static readers. Identity and contextual Battle facts belong
 * to the caller's outer admission join and are intentionally not accepted.
 */
export function admitRegisteredSpellProcedureMechanics(
  source: SpellMechanicsAdmissionSource,
): BattleSpellMechanicsAdmission {
  return admitBattleSpellMechanicsFrom(
    source,
    registeredSpellProcedureMechanicsAdmissions(),
  );
}

/**
 * Production spell admission performs static mechanics admission exactly
 * once, then invokes only the correlated closures returned by that admission.
 * A rejected or unowned root produces no contextual invocation.
 */
export function admitRegisteredSpellProcedures(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SupportedSpellInvocation[] {
  const mechanicsAdmission = admitRegisteredSpellProcedureMechanics({
    mechanics: spell.mechanics,
    spellDefinitionRuleFacts: spell.spellDefinitionRuleFacts,
  });
  const executionSource = battleSpellExecutionSourceFromAdmission(spell);
  return Match.value(mechanicsAdmission).pipe(
    Match.discriminatorsExhaustive("tag")({
      notBattleOwned: () => [],
      rejected: () => [],
      admitted: ({ procedures }) =>
        admitSupportedSpellProcedures(procedures, executionSource, ctx),
    }),
  );
}
