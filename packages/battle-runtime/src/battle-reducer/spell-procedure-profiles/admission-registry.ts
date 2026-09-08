import { Match } from "effect";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { SpellAdmissionContext } from "./profile.ts";
import {
  admitBattleSpellMechanicsFrom,
  type BattleSpellMechanicsAdmission,
  type SpellMechanicsAdmissionSource,
} from "./spell-mechanics-admission.ts";
import {
  type RegisteredAdmittedSpellMechanics,
  type RegisteredAdmittedStaticSpellMechanics,
  type RegisteredSpellProcedureAdmissionIssue,
  type RegisteredSpellProcedureMechanicsAdmission,
  type RegisteredStaticSpellMechanicsAdmissionIssue,
  registeredSpellProcedureDeclarations,
  registeredStaticSpellMechanicsDeclarations,
} from "./registry.ts";

function admitSupportedSpellProcedures(
  procedures: readonly RegisteredAdmittedSpellMechanics[],
  source: ReturnType<typeof battleSpellExecutionSourceFromAdmission>,
  ctx: SpellAdmissionContext,
): {
  readonly invocations: readonly SupportedSpellInvocation[];
  readonly staticMechanics: readonly RegisteredAdmittedStaticSpellMechanics[];
} {
  const invocations: SupportedSpellInvocation[] = [];
  const staticMechanics: RegisteredAdmittedStaticSpellMechanics[] = [];
  for (const procedure of procedures) {
    if (procedure.binding === "static") {
      staticMechanics.push(procedure);
    } else {
      invocations.push(...procedure.admit(source, ctx));
    }
  }
  return { invocations, staticMechanics };
}

/**
 * Static readers are derived from the canonical declaration table. This is a
 * registry view, not a second table: procedure ownership remains in each
 * profile declaration and synthesized execution-only procedures are omitted.
 */
export function registeredSpellProcedureMechanicsAdmissions(): readonly RegisteredSpellProcedureMechanicsAdmission[] {
  return Object.values(registeredSpellProcedureDeclarations()).flatMap(
    ({ admission }) =>
      admission.kind === "authored"
        ? [{ admitMechanics: admission.admitMechanics }]
        : [],
  );
}

function registeredStaticSpellMechanicsAdmissions() {
  return Object.values(registeredStaticSpellMechanicsDeclarations()).map(
    ({ admission }) => ({ admitMechanics: admission.admitMechanics }),
  );
}

export function admitRegisteredStaticSpellMechanics(
  source: SpellMechanicsAdmissionSource,
): BattleSpellMechanicsAdmission<
  RegisteredAdmittedStaticSpellMechanics,
  RegisteredStaticSpellMechanicsAdmissionIssue
> {
  return admitBattleSpellMechanicsFrom(
    source,
    registeredStaticSpellMechanicsAdmissions(),
  );
}

/**
 * Admit one already-decoded Spell Definition mechanics graph through the
 * profile-owned static readers. Identity and contextual Battle facts belong
 * to the caller's outer admission join and are intentionally not accepted.
 */
export function admitRegisteredSpellProcedureMechanics(
  source: SpellMechanicsAdmissionSource,
): BattleSpellMechanicsAdmission<
  RegisteredAdmittedSpellMechanics,
  RegisteredSpellProcedureAdmissionIssue
> {
  return admitBattleSpellMechanicsFrom(
    source,
    registeredSpellProcedureMechanicsAdmissions(),
  );
}

/**
 * Production spell admission performs static mechanics admission exactly
 * once, then invokes only the correlated closures returned by that admission.
 * Rejection and absence of Battle ownership remain distinct from a successful
 * admission whose current context happens to produce no invocation.
 */
export function admitRegisteredSpellProcedures(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
):
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        RegisteredSpellProcedureAdmissionIssue,
        ...RegisteredSpellProcedureAdmissionIssue[],
      ];
    }
  | {
      readonly tag: "admitted";
      readonly invocations: readonly SupportedSpellInvocation[];
      readonly staticMechanics: readonly RegisteredAdmittedStaticSpellMechanics[];
    } {
  const mechanicsAdmission = admitRegisteredSpellProcedureMechanics({
    mechanics: spell.mechanics,
    spellDefinitionRuleFacts: spell.spellDefinitionRuleFacts,
  });
  const executionSource = battleSpellExecutionSourceFromAdmission(spell);
  return Match.value(mechanicsAdmission).pipe(
    Match.discriminatorsExhaustive("tag")({
      notBattleOwned: () => ({ tag: "notBattleOwned" as const }),
      rejected: ({ issues }) => ({ tag: "rejected" as const, issues }),
      admitted: ({ procedures }) => ({
        tag: "admitted" as const,
        ...admitSupportedSpellProcedures(procedures, executionSource, ctx),
      }),
    }),
  );
}
