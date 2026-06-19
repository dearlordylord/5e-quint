import { Match } from "effect";
import type { ClassFeatureDuration, Duration } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeDurationValue,
  describeEarlyEnd,
  describeTimedPermanentAfter,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

const byKind = Match.discriminator("kind");

function describeDurationBranch(d: Duration): string {
  return Match.value(d).pipe(
    byKind("instantaneous", () => "instantaneous"),
    byKind(
      "concentration",
      (concentration) =>
        `concentration up to ${describeDurationValue(concentration.upTo)}${describeEarlyEnd(concentration.earlyEnd)}`,
    ),
    byKind(
      "timed",
      (timed) =>
        `${describeDurationValue(timed.value)}${describeEarlyEnd(timed.earlyEnd)}${describeTimedPermanentAfter(timed.permanentAfter)}`,
    ),
    byKind("permanent", (permanent) =>
      permanent.endsOn === undefined
        ? "permanent"
        : `permanent until ${permanent.endsOn.join(", ")}`,
    ),
    byKind("slot_tiered", (tiered) =>
      [
        `base: ${describeDurationBranch(tiered.base)}`,
        ...tiered.tiers.map(
          (tier) =>
            `slot >= ${tier.atSlot}: ${describeDurationBranch(tier.duration)}`,
        ),
      ].join("\n"),
    ),
    Match.exhaustive,
  );
}

export function traceDuration(
  d: Duration | ClassFeatureDuration,
  procId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (d.kind) {
    case "instantaneous":
      return;
    case "concentration": {
      const lockId = ids("lock");
      nodes.push({
        id: lockId,
        category: "resource",
        atomKind: "concentration_lock",
        label: "concentration_lock",
      });
      edges.push({ from: procId, to: lockId, relation: "consumes" });

      const concId = ids("conc");
      nodes.push({
        id: concId,
        category: "lifecycle",
        atomKind: "concentrate",
        label: "concentrate",
      });
      edges.push({ from: procId, to: concId, relation: "grants" });

      const permTag =
        d.permanentIfMaintainedFull === true
          ? "\npermanent if maintained full"
          : "";
      const expId = ids("exp");
      nodes.push({
        id: expId,
        category: "lifecycle",
        atomKind: "expire",
        label: `expire\n≤ ${describeDurationValue(d.upTo)}${describeEarlyEnd(d.earlyEnd)}${permTag}`,
      });
      edges.push({ from: concId, to: expId, relation: "persists_until" });
      return;
    }
    case "timed": {
      const permanentAfter =
        "permanentAfter" in d ? d.permanentAfter : undefined;
      const persistId = ids("per");
      nodes.push({
        id: persistId,
        category: "lifecycle",
        atomKind: "persist",
        label: "persist",
      });
      edges.push({ from: procId, to: persistId, relation: "grants" });

      const expId = ids("exp");
      nodes.push({
        id: expId,
        category: "lifecycle",
        atomKind: "expire",
        label: `expire\n${describeDurationValue(d.value)}${describeEarlyEnd(d.earlyEnd)}${describeTimedPermanentAfter(permanentAfter)}`,
      });
      edges.push({ from: persistId, to: expId, relation: "persists_until" });
      return;
    }
    case "permanent": {
      const persistId = ids("per");
      nodes.push({
        id: persistId,
        category: "lifecycle",
        atomKind: "persist",
        label: "persist\npermanent",
      });
      edges.push({ from: procId, to: persistId, relation: "grants" });
      if (d.endsOn !== undefined) {
        const expId = ids("exp");
        nodes.push({
          id: expId,
          category: "lifecycle",
          atomKind: "expire",
          label: `expire\non: ${d.endsOn.join(", ")}`,
        });
        edges.push({ from: persistId, to: expId, relation: "persists_until" });
      }
      return;
    }
    case "slot_tiered": {
      const tierId = ids("duration");
      nodes.push({
        id: tierId,
        category: "lifecycle",
        atomKind: "slot_tiered_duration",
        label: `slot_tiered_duration\n${describeDurationBranch(d)}`,
      });
      edges.push({ from: procId, to: tierId, relation: "grants" });
      return;
    }
    default: {
      const _exhaustive: never = d;
      throw new Error(`unhandled duration: ${String(_exhaustive)}`);
    }
  }
}
