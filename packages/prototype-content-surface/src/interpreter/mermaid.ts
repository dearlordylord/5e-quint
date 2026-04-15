// Render a Trace as a mermaid flowchart. Color-codes nodes by atom category.

import type { Trace, AtomCategory } from "./tracer.ts";

const CLASS_DEFS = `  classDef source fill:#1f77b4,color:#fff,stroke:#0d3c61
  classDef procedure fill:#2ca02c,color:#fff,stroke:#185018
  classDef window fill:#9467bd,color:#fff,stroke:#4a2b66
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

export function renderTraceDocument(trace: Trace): string {
  const out: string[] = [];
  out.push(`# Dependency graph: ${trace.spellName}`);
  out.push("");
  out.push(`Spell id: \`${trace.spellId}\``);
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
