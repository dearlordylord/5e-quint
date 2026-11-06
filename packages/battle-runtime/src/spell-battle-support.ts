import type { SpellMechanics } from "@dnd/surface/surface/types";
import type {
  BattleSpellMechanicsAdmission,
  SpellProcedureAdmissionIssue,
} from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import { admitRegisteredSpellProcedureMechanics } from "./battle-reducer/spell-procedure-profiles/admission-registry.ts";
import { projectSpellDefinitionRuleFacts } from "./procedure-admission/spell-definition-rule-facts.ts";
import { Match } from "effect";

export type SpellBattleSupport =
  | { readonly tag: "admitted" }
  | Extract<BattleSpellMechanicsAdmission, { readonly tag: "notBattleOwned" }>
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        SpellProcedureAdmissionIssue,
        ...SpellProcedureAdmissionIssue[],
      ];
    };

export function spellBattleSupport(
  mechanics: SpellMechanics,
): SpellBattleSupport {
  return Match.value(
    admitRegisteredSpellProcedureMechanics({
      mechanics,
      spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
    }),
  ).pipe(
    Match.discriminatorsExhaustive("tag")({
      admitted: () => ({ tag: "admitted" as const }),
      notBattleOwned: (admission) => admission,
      rejected: ({ issues }) => ({ tag: "rejected" as const, issues }),
    }),
  );
}
