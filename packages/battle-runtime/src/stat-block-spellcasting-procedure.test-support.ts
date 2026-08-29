import { unitId } from "@dnd/shared/game-facts";
import {
  StatBlockProcedureOrdinalSchema,
  StatBlockProcedureResourceOrdinalSchema,
} from "@dnd/surface/surface/schema";
import type { StatBlockProcedureEntry } from "@dnd/surface/surface/types";
import { Schema } from "effect";

const authoredOrdinal = (value: number) =>
  Schema.decodeUnknownSync(StatBlockProcedureOrdinalSchema)(value);
const authoredResourceOrdinal = (value: number) =>
  Schema.decodeUnknownSync(StatBlockProcedureResourceOrdinalSchema)(value);

export type SyntheticSpellcastingProcedureEntryOptions = {
  readonly name?: string;
  readonly unrestrictedSpellId?: string;
  readonly restrictedSpellId?: string;
  readonly restrictionExpression?: string;
};

/**
 * A source-bound synthetic record used by projection and parity tests. The
 * runtime assertion is deliberately independent of each authored label and
 * spell identity; those values exist only to exercise the admission boundary.
 */
export function syntheticSpellcastingProcedureEntry(
  input: SyntheticSpellcastingProcedureEntryOptions = {},
): Extract<StatBlockProcedureEntry, { readonly kind: "executable" }> {
  return {
    kind: "executable",
    procedureOrdinal: authoredOrdinal(99),
    procedure: {
      kind: "spellcasting",
      name: input.name ?? "Synthetic Spellcasting",
      ability: "int",
      spellSaveDc: { kind: "fixed", dc: 13 },
      spellAttackBonus: { kind: "literal", value: 5 },
      components: { v: true, s: true, m: false },
      groups: [
        {
          kind: "at_will",
          resourceRefs: { kind: "none" },
          spells: [
            {
              spellId: unitId(
                input.unrestrictedSpellId ?? "synthetic_spell_unrestricted",
              ),
            },
            {
              spellId: unitId(
                input.restrictedSpellId ?? "synthetic_spell_restricted",
              ),
              restriction: {
                authoredExpression:
                  input.restrictionExpression ?? "A protected expression.",
                deltas: [
                  {
                    kind: "temporary_hit_points",
                    spellGrant: "none",
                    maintenanceRequirement: "not_required",
                  },
                ],
              },
            },
          ],
        },
        {
          kind: "limited",
          resourceRefs: {
            kind: "some",
            ordinals: [authoredResourceOrdinal(1)],
          },
          spells: [{ spellId: unitId("synthetic_spell_limited") }],
        },
      ],
    },
    resourceRefs: { kind: "none" },
  };
}
