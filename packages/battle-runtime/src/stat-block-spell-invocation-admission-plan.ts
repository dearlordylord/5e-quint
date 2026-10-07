import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type {
  StatBlockRecord,
  StatBlockProcedureOrdinal,
} from "@dnd/surface/surface/types";
import { Option } from "effect";
import {
  statBlockSpellcastingGroupOrdinal,
  statBlockSpellcastingInvocationOrdinal,
  type StatBlockSpellcastingGroupOrdinal,
  type StatBlockSpellcastingInvocationOrdinal,
} from "./identity.ts";
import {
  joinStatBlockSpellDefinition,
  type StatBlockSpellDefinitionJoin,
} from "./procedure-admission/stat-block-spell-definition.ts";

export type StatBlockSpellInvocationAdmissionCandidate = {
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly groupOrdinal: StatBlockSpellcastingGroupOrdinal;
  readonly invocationOrdinal: StatBlockSpellcastingInvocationOrdinal;
  readonly definitionJoin: StatBlockSpellDefinitionJoin;
};
export type StatBlockSpellInvocationAdmissionPlan =
  readonly StatBlockSpellInvocationAdmissionCandidate[];

/** Transient authored admission plan; neither this plan nor its catalog is stored. */
export function statBlockSpellInvocationAdmissionPlan(
  record: StatBlockRecord,
  unitCatalog: UnitCatalog,
): StatBlockSpellInvocationAdmissionPlan {
  return [
    ...(record.statBlock.actions ?? []),
    ...(record.statBlock.bonusActions ?? []),
  ].flatMap((entry) => {
    if (entry.kind !== "executable" || entry.procedure.kind !== "spellcasting")
      return [];
    return entry.procedure.groups.flatMap((group, groupIndex) =>
      group.spells.map((reference, invocationIndex) => {
        const unit = unitCatalog.getUnit(reference.spellId);
        const definition =
          Option.isSome(unit) && unit.value.kind === "spell"
            ? unit.value
            : undefined;
        return {
          procedureOrdinal: entry.procedureOrdinal,
          groupOrdinal: statBlockSpellcastingGroupOrdinal(groupIndex),
          invocationOrdinal:
            statBlockSpellcastingInvocationOrdinal(invocationIndex),
          definitionJoin: joinStatBlockSpellDefinition(reference, definition),
        };
      }),
    );
  });
}
