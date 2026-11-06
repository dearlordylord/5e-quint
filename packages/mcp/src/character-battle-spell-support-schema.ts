import { UnitId } from "@dnd/shared/game-facts";
import { MECHANICS_GRAPH_NODE_ROLES } from "@dnd/surface/surface/mechanics-graph-path";
import { Schema } from "effect";

const SupportIssueSchema = Schema.Struct({
  tag: Schema.Literal("spellProcedureAdmissionIssue"),
  procedure: Schema.String,
  failedFact: Schema.String,
  mechanicsPath: Schema.Struct({
    family: Schema.Literal("unit"),
    nodes: Schema.NonEmptyArray(
      Schema.Union([
        Schema.Struct({
          kind: Schema.Literal("singleton"),
          role: Schema.Literals(MECHANICS_GRAPH_NODE_ROLES),
        }),
        Schema.Struct({
          kind: Schema.Literal("occurrence"),
          role: Schema.Literals(MECHANICS_GRAPH_NODE_ROLES),
          ordinal: Schema.Number,
        }),
      ]),
    ),
  }),
  message: Schema.String,
});
const SelectionFields = { spellId: UnitId };
export const CharacterBattleSpellSupportSchema = Schema.Array(
  Schema.Union([
    Schema.Struct({
      ...SelectionFields,
      tag: Schema.Literal("admitted"),
      nextStep: Schema.Literal("discoverBattleActs"),
    }),
    Schema.Struct({
      ...SelectionFields,
      tag: Schema.Literal("notBattleOwned"),
      reason: Schema.Union([
        Schema.Struct({ kind: Schema.Literal("noMatchingBattleProcedure") }),
        Schema.Struct({
          kind: Schema.Literal("unownedMechanicsFacet"),
          facet: Schema.Literal("deathAftermath"),
        }),
      ]),
      nextStep: Schema.Literal("planWithoutBattleCasting"),
    }),
    Schema.Struct({
      ...SelectionFields,
      tag: Schema.Literal("rejected"),
      issues: Schema.NonEmptyArray(SupportIssueSchema),
      nextStep: Schema.Literal("resolveBattleEntryBlocker"),
    }),
    Schema.Struct({
      ...SelectionFields,
      tag: Schema.Literal("spellRecordUnavailable"),
      nextStep: Schema.Literal("resolveSpellRecordAvailability"),
    }),
  ]),
);
