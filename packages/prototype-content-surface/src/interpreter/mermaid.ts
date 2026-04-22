// Render a Trace as a mermaid flowchart. Color-codes nodes by atom category.

import type { UnitRecord } from "../surface/types.ts";
import type { Trace, AtomCategory } from "./tracer.ts";

const CLASS_DEFS = `  classDef source fill:#1f77b4,color:#fff,stroke:#0d3c61
  classDef procedure fill:#2ca02c,color:#fff,stroke:#185018
  classDef window fill:#9467bd,color:#fff,stroke:#4a2b66
  classDef hole fill:#f4a261,color:#000,stroke:#8a4f12
  classDef attachment fill:#ffcc00,color:#000,stroke:#8a6d00
  classDef resolution fill:#ff7f0e,color:#fff,stroke:#8a4308
  classDef lifecycle fill:#7f7f7f,color:#fff,stroke:#333
  classDef resource fill:#e377c2,color:#000,stroke:#8a457a
  classDef scaling fill:#17becf,color:#000,stroke:#0a5f6a
  classDef effect fill:#d62728,color:#fff,stroke:#6a1414`;

const CATEGORY_CLASS: Record<AtomCategory, string> = {
  source: "source",
  procedure: "procedure",
  window: "window",
  hole: "hole",
  attachment: "attachment",
  resolution: "resolution",
  lifecycle: "lifecycle",
  resource: "resource",
  scaling: "scaling",
  effect: "effect",
};

export function renderMermaid(trace: Trace): string {
  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("flowchart TD");
  lines.push(CLASS_DEFS);
  for (const n of trace.nodes) {
    const label = escapeLabel(n.label);
    const cls = CATEGORY_CLASS[n.category];
    lines.push(`  ${n.id}["${label}"]:::${cls}`);
  }
  for (const e of trace.edges) {
    lines.push(`  ${e.from} -- ${e.relation} --> ${e.to}`);
  }
  lines.push("```");
  return lines.join("\n");
}

export function renderTraceDocument(trace: Trace, unit: UnitRecord): string {
  const out: string[] = [];
  out.push(`# Dependency graph: ${trace.unitName}`);
  out.push("");
  out.push(`Unit id: \`${trace.unitId}\``);
  const externalLink = get5etoolsUrl(unit);
  if (externalLink !== null) {
    out.push("");
    out.push(`5e.tools: <${externalLink}>`);
  }
  out.push("");
  out.push(renderMermaid(trace));
  out.push("");
  out.push("## Atoms referenced");
  out.push("");
  for (const k of trace.atomKinds) {
    out.push(`- \`${k}\``);
  }
  out.push("");
  out.push("## Relations referenced");
  out.push("");
  const relations = [...new Set(trace.edges.map((e) => e.relation))].sort();
  for (const r of relations) {
    out.push(`- \`${r}\``);
  }
  out.push("");
  return out.join("\n");
}

function escapeLabel(s: string): string {
  return s.replaceAll("\n", "<br/>").replaceAll('"', "&quot;");
}

function get5etoolsUrl(unit: UnitRecord): string | null {
  const source = get5etoolsSource(unit);
  if (source === null) return null;

  switch (unit.kind) {
    case "spell":
      return `https://5e.tools/spells.html#${encodeHashParts(unit.name, source)}`;
    case "class_feature":
      return `https://5e.tools/classfeatures.html#${encodeHashParts(
        unit.name,
        capitalizeAscii(unit.className),
        source,
        unit.acquiredAtLevel,
        source,
      )}`;
    case "feat":
      return `https://5e.tools/feats.html#${encodeHashParts(unit.name, source)}`;
    case "species_trait":
      return `https://5e.tools/races.html#${encodeHashParts(unit.species, source)}`;
    case "magic_item":
      return `https://5e.tools/items.html#${encodeHashParts(unit.name, source)}`;
    case "mastery":
      return null;
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

function get5etoolsSource(unit: UnitRecord): string | null {
  switch (unit.provenance.kind) {
    case "srd-5.2.1":
    case "xphb":
      return "XPHB";
    default: {
      const _exhaustive: never = unit.provenance.kind;
      return _exhaustive;
    }
  }
}

function encodeHashParts(...parts: ReadonlyArray<string | number>): string {
  return parts.map(encodeHashPart).join("_");
}

function encodeHashPart(part: string | number): string {
  return encodeURIComponent(String(part).toLowerCase()).toLowerCase();
}

function capitalizeAscii(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}
