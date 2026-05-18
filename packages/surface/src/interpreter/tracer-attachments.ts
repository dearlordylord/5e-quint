import type { Attachment, Range } from "../surface/types.ts";
import type { TraceNode } from "./tracer-model.ts";
import {
  describeAreaOccupantDispositionFilter,
  describeAreaOrigin,
  describeAreaShape,
  describeAttachmentHole,
  describeAttachmentRange,
  describeHeldWeaponAttachment,
  describeObjectFilter,
  describeRange,
  describeTargetSelection,
  describeTransferEvent,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

export function traceAttachment(
  a: Attachment,
  range: Range,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("att");
  switch (a.kind) {
    case "self": {
      nodes.push({
        id,
        category: "attachment",
        atomKind: "self",
        label: `self\nrange ${describeRange(range)}`,
      });
      return id;
    }
    case "target": {
      const selectionLabel = describeTargetSelection(a.selection);
      nodes.push({
        id,
        category: "attachment",
        atomKind: "target",
        label: `target\n${selectionLabel}\nrange ${describeAttachmentRange(range, a.rangeOrigin)}`,
      });
      return id;
    }
    case "area": {
      const originLabel = describeAreaOrigin(a.origin, range, a.rangeOrigin);
      const occupantLabel = describeAreaOccupantDispositionFilter(
        a.occupantDispositionFilter,
      );
      nodes.push({
        id,
        category: "attachment",
        atomKind: "area",
        label: `area\n${describeAreaShape(a.shape)}\n${originLabel}${occupantLabel}`,
      });
      return id;
    }
    case "mark": {
      const selectionLabel = describeTargetSelection(a.selection);
      const transferLabel = a.transfer
        ? `\ntransfer on ${describeTransferEvent(a.transfer)} (${a.transfer.cost.kind})`
        : "";
      nodes.push({
        id,
        category: "attachment",
        atomKind: "mark",
        label: `mark\n${selectionLabel}\nrange ${describeAttachmentRange(range, a.rangeOrigin)}${transferLabel}`,
      });
      return id;
    }
    case "object": {
      const countLabel = a.count === 2 ? "2 objects" : "object";
      const filterLabel = describeObjectFilter(a.filter);
      nodes.push({
        id,
        category: "attachment",
        atomKind: "object",
        label: `${countLabel}${filterLabel}\nrange ${describeAttachmentRange(range, a.rangeOrigin)}`,
      });
      return id;
    }
    case "held_weapon": {
      nodes.push({
        id,
        category: "attachment",
        atomKind: "held_weapon",
        label: describeHeldWeaponAttachment(a),
      });
      return id;
    }
    case "location": {
      nodes.push({
        id,
        category: "attachment",
        atomKind: "location",
        label: `location\n${a.description}\nrange ${describeAttachmentRange(range, a.rangeOrigin)}`,
      });
      return id;
    }
    case "hole": {
      nodes.push({
        id,
        category: "hole",
        atomKind: "hole",
        label: describeAttachmentHole(a, range),
      });
      return id;
    }
    default: {
      const _exhaustive: never = a;
      throw new Error(`unhandled attachment: ${String(_exhaustive)}`);
    }
  }
}

export function describeOngoingActionCost(
  cost: import("../surface/types.ts").OngoingActionCost,
): string {
  switch (cost.kind) {
    case "bonus_action":
      return "Bonus Action";
    case "standard_action":
      return `${cost.action} action`;
    default: {
      const _: never = cost;
      throw new Error(`unhandled ongoing action cost: ${String(_)}`);
    }
  }
}
