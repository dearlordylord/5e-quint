import type { PositiveInteger } from "@dnd/shared/types";

export const MECHANICS_GRAPH_NODE_ROLES = [
  "recordMechanics",
  "generalFact",
  "trait",
  "resource",
  "action",
  "bonusAction",
  "reaction",
  "legendaryAction",
  "procedure",
  "effect",
  "dependency",
  "extension",
  "reference",
] as const;

export type MechanicsGraphNodeRole =
  (typeof MECHANICS_GRAPH_NODE_ROLES)[number];

export type MechanicsGraphPathNode =
  | {
      readonly kind: "singleton";
      readonly role: MechanicsGraphNodeRole;
    }
  | {
      readonly kind: "occurrence";
      readonly role: MechanicsGraphNodeRole;
      readonly ordinal: PositiveInteger;
    };

type MechanicsGraphPath<Family extends "unit" | "statBlock"> = {
  readonly family: Family;
  readonly nodes: readonly [
    MechanicsGraphPathNode,
    ...MechanicsGraphPathNode[],
  ];
};

export type UnitMechanicsPath = MechanicsGraphPath<"unit">;
export type StatBlockMechanicsPath = MechanicsGraphPath<"statBlock">;

export function unitMechanicsPath(
  nodes: UnitMechanicsPath["nodes"],
): UnitMechanicsPath {
  return { family: "unit", nodes };
}

export function statBlockMechanicsPath(
  nodes: StatBlockMechanicsPath["nodes"],
): StatBlockMechanicsPath {
  return { family: "statBlock", nodes };
}
