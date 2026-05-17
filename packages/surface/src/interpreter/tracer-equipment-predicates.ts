import type { EquipmentPredicate } from "../surface/types.ts";
import type { TraceNode } from "./tracer-model.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

export function traceEquipmentPredicate(
  p: Exclude<EquipmentPredicate, { kind: "always" }>,
  nodes: TraceNode[],
  ids: IdGen,
): string[] {
  switch (p.kind) {
    case "holding_item": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "holding_item",
        label: "holding_item",
      });
      return [id];
    }
    case "peering_through_item": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "peering_through_item",
        label: "peering_through_item",
      });
      return [id];
    }
    case "wearing_item": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "wearing_item",
        label: "wearing_item",
      });
      return [id];
    }
    case "unarmored": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "unarmored",
        label: "unarmored",
      });
      return [id];
    }
    case "wearing_armor": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "wearing_armor",
        label: `wearing_armor\n[${p.categories.join(", ")}]`,
      });
      return [id];
    }
    case "not_wearing_armor": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "not_wearing_armor",
        label: `not_wearing_armor\n[${p.categories.join(", ")}]`,
      });
      return [id];
    }
    case "wielding_weapon": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "wielding_weapon",
        label: `wielding_weapon\n${p.weaponKind}`,
      });
      return [id];
    }
    case "unarmed_or_monk_weapons_only": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "unarmed_or_monk_weapons_only",
        label: "unarmed_or_monk_weapons_only",
      });
      return [id];
    }
    case "all_of":
      return p.predicates.flatMap((predicate) =>
        traceEquipmentPredicate(predicate, nodes, ids),
      );
    case "not_wielding_shield": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "not_wielding_shield",
        label: "not_wielding_shield",
      });
      return [id];
    }
    default: {
      const _exhaustive: never = p;
      throw new Error(
        `unhandled equipment predicate ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}
