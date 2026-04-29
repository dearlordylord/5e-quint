// Aggregate survey-results-srd.jsonl into a frequency report.
//
// Reads the dataset, normalizes Claude's free-text widening proposals
// into canonical tags, and emits REPORT_SRD.md with:
//   - outcome distribution
//   - per-kind breakdown (spells, class features, masteries, ...)
//   - atom frequency (which v4 atoms are touched by how many units)
//   - widening-proposal frequency (normalized, sorted by units-that-need-it)
//   - Option A vs Option B verdict against the plan's rubric
//
// Run:
//   pnpm --filter @dnd/surface exec tsx \
//     ../../scripts/content-surface-survey/aggregate.ts
//
// Output: scripts/content-surface-survey/REPORT_SRD.md

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.join(__dirname, "survey-results-srd.jsonl");
const queuePath = path.join(__dirname, "unit-queue.jsonl");
const outPath = path.join(__dirname, "REPORT_SRD.md");

type Verdict =
  | "clean"
  | "surface_widening"
  | "atom_widening"
  | "structural_widening"
  | "dm_agenda"
  | "refused"
  | "invalid";

type WideningKind = "new_atom" | "new_variant" | "new_relation" | "new_subgraph";

type ProposedWidening = {
  kind?: WideningKind;
  name?: string;
  justification?: string;
  evidence?: string;
};

type DatasetRow = {
  unit_slug: string;
  verdict: Verdict;
  harness_atoms: ReadonlyArray<string>;
  harness_relations: ReadonlyArray<string>;
  unknown_atoms: ReadonlyArray<string>;
  unknown_relations: ReadonlyArray<string>;
  claude_self_verdict: string | null;
  claude_proposed_widenings: ReadonlyArray<ProposedWidening>;
  claude_confidence: string | null;
  discrepancies: ReadonlyArray<string>;
};

type QueueRow = {
  slug: string;
  name: string;
  source: "srd-5.2.1" | "xphb";
  kind: string;
  tier: number;
};

// --- canonical widening normalization ---
//
// Claude phrases the same proposal differently across units; normalize
// to canonical tags so frequency counts are meaningful. Order matters:
// first match wins. Unmatched proposals fall through with their raw
// name (preserved for manual review).
const NORMALIZERS: ReadonlyArray<[RegExp, string]> = [
  [/class.?level.?tier|per.?class.?level|scale.*class.*level/i, "class_level_tiers"],
  [/subclass.?level.?tier/i, "subclass_level_tiers"],
  [/linear.?per.?level|5.*class.*level|pool.*class.*level/i, "linear_per_level"],
  [/pb.?linked|proficiency.?bonus.?linked|scales.?with.?pb/i, "pb_linked_scaling"],
  [/bonus.?action.*(cost|activat)|activationcost\.bonus.?action|castingtime.*bonus/i, "bonus_action_activation"],
  [/reaction.*(cost|activat|trigger)|castingtime.*reaction/i, "reaction_activation"],
  [/extended.?casting|ritual.?casting|minute.?casting|casting.?time.*(minute|hour)/i, "extended_casting_time"],
  [/apply.?condition|applycondition.*effect/i, "apply_condition_effect"],
  [/hp.?pool|hit.?point.?pool/i, "hp_pool_resource"],
  [/restore.?hit.?points|heal.?hp|heal.?pool|heal_hp|heal.?effect/i, "heal_hp_effect"],
  [/temp.?hp|temporary.?hit.?points/i, "grant_temp_hp"],
  [/remove.?condition/i, "remove_condition_effect"],
  [/modify.?ac|ac.?modifier|ac.?bonus|flat.*ac/i, "modify_ac_effect"],
  [/negate.?named|named.?negate|damage.?immunity/i, "negate_named_effect"],
  [/grant.?resistance|damage.?resistance|resistance.?grant/i, "grant_resistance_effect"],
  [/conditional.?(damage|bonus)|bonus.?conditional|rider/i, "conditional_bonus_damage"],
  [/attack.?roll.?condition|advantage.?gate|attack.?gate|advantage.?state/i, "attack_predicate_gate"],
  [/weapon.?property.?(constraint|filter)|weapon.?filter/i, "weapon_property_filter"],
  [/ally.?proximity|ally.?condition|proximity.?trigger/i, "proximity_predicate"],
  [/turn.?reset|per.?turn.?reset|once.?per.?turn/i, "per_turn_reset"],
  [/triggered.?reaction|trigger.?window|reaction.?payload/i, "triggered_reaction_family"],
  [/mark.?target|mark.?transfer|mark.*\bpersist/i, "mark_transfer_subgraph"],
  [/on.?hit.?rider|on.?hit.?effect|on.?hit.?window.*grant/i, "on_hit_rider_subgraph"],
  [/zone.?sentinel|entry.?trigger|anchored|ward|glyph.?trigger/i, "anchored_trigger_family"],
  [/ritual/i, "ritual_casting"],
  [/half.?of.?fail|save.?half|half.?damage.?save/i, "save_half_damage_branch"],
  [/auto.?hit|unconditional.*hit|no.?attack.?no.?save/i, "auto_hit_resolution"],
  [/flat.?addend|fixed.?plus|dice.*plus.*flat|flat.?bonus/i, "dice_plus_flat"],
  [/dart.?count|instance.?count|multi.?projectile/i, "instance_count_scaling"],
  [/stat.?block.?projection|replace.?stat.?block|transform/i, "stat_block_projection"],
  [/object.?attachment|attachment.*object/i, "object_attachment"],
  [/partial.?short.?rest|short.?rest.?partial|partial.*refill/i, "partial_rest_refill"],
  [/movement.?speed|modify.?speed|speed.?buff/i, "modify_speed_effect"],
  [/grant.?spell.?access|spell.?access|prepared.?spell/i, "grant_spell_access"],
  [/grant.?proficiency|proficiency.?grant/i, "grant_proficiency"],
  [/grant.?sense|darkvision|truesight|tremorsense/i, "grant_sense"],
  [/interrupt.?resolution|counterspell|spell.?cancel/i, "spell_interrupt_resolution"],
  [/prohibit.?concentration|block.?concentration/i, "prohibit_concentration"],
  [/prohibit.?spellcasting|block.?spellcasting/i, "prohibit_spellcasting"],
  [/extend.?by.?activity|activity.?extends/i, "extend_by_activity"],
  [/pool.?with.?options|options.?menu|choose.?option/i, "pool_with_options_menu"],
  [/notify|notification|alert/i, "notify_caster_effect"],
  [/specific.?die.?value|rolled.?a.?1|natural.?1/i, "specific_die_value_trigger"],
  [/willing.?target/i, "willing_target_filter"],
  [/touch.?range/i, "touch_range"],
];

function normalize(rawName: string): string {
  for (const [pattern, canonical] of NORMALIZERS) {
    if (pattern.test(rawName)) return canonical;
  }
  return rawName.trim();
}

// --- load data ---

function loadJsonl<T>(p: string): ReadonlyArray<T> {
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf8");
  return raw
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as T);
}

function loadDataset(): ReadonlyArray<DatasetRow> {
  return loadJsonl<DatasetRow>(datasetPath);
}

function loadQueue(): Map<string, QueueRow> {
  const rows = loadJsonl<QueueRow>(queuePath);
  const m = new Map<string, QueueRow>();
  for (const r of rows) m.set(r.slug, r);
  return m;
}

// --- aggregate helpers ---

function countBy<T>(items: ReadonlyArray<T>, key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function sortEntriesDesc(m: Map<string, number>): ReadonlyArray<[string, number]> {
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// --- report sections ---

function renderOutcomeDistribution(rows: ReadonlyArray<DatasetRow>): string {
  const m = countBy(rows, (r) => r.verdict);
  const lines = ["## Outcome distribution", "", "| Verdict | Count |", "| --- | --- |"];
  for (const [verdict, count] of sortEntriesDesc(m)) {
    lines.push(`| \`${verdict}\` | ${count} |`);
  }
  return lines.join("\n");
}

function renderKindBreakdown(
  rows: ReadonlyArray<DatasetRow>,
  queue: Map<string, QueueRow>,
): string {
  const byKind = new Map<string, Map<Verdict, number>>();
  for (const r of rows) {
    const kind = queue.get(r.unit_slug)?.kind ?? "unknown";
    if (!byKind.has(kind)) byKind.set(kind, new Map());
    const inner = byKind.get(kind)!;
    inner.set(r.verdict, (inner.get(r.verdict) ?? 0) + 1);
  }
  const lines = [
    "## Per-kind outcome breakdown",
    "",
    "| Kind | clean | surface | atom | structural | total |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  const kinds = [...byKind.keys()].sort();
  for (const kind of kinds) {
    const inner = byKind.get(kind)!;
    const clean = inner.get("clean") ?? 0;
    const surface = inner.get("surface_widening") ?? 0;
    const atom = inner.get("atom_widening") ?? 0;
    const structural = inner.get("structural_widening") ?? 0;
    const total = clean + surface + atom + structural;
    lines.push(`| ${kind} | ${clean} | ${surface} | ${atom} | ${structural} | ${total} |`);
  }
  return lines.join("\n");
}

function renderAtomFrequency(rows: ReadonlyArray<DatasetRow>): string {
  const atomFreq = new Map<string, number>();
  for (const r of rows) {
    const unique = new Set(r.harness_atoms);
    for (const a of unique) atomFreq.set(a, (atomFreq.get(a) ?? 0) + 1);
  }
  const lines = [
    "## Atom frequency (units-that-emit-it)",
    "",
    "| Atom | Units |",
    "| --- | --- |",
  ];
  for (const [atom, count] of sortEntriesDesc(atomFreq)) {
    lines.push(`| \`${atom}\` | ${count} |`);
  }
  return lines.join("\n");
}

function renderWideningFrequency(
  rows: ReadonlyArray<DatasetRow>,
): {
  md: string;
  canonical: Map<string, Set<string>>;
} {
  const canonical = new Map<string, Set<string>>(); // canonical -> slug set
  const rawSamples = new Map<string, Set<string>>(); // canonical -> raw phrasings seen
  for (const r of rows) {
    for (const w of r.claude_proposed_widenings) {
      const raw = (w.name ?? "").trim();
      if (!raw) continue;
      const c = normalize(raw);
      if (!canonical.has(c)) canonical.set(c, new Set());
      canonical.get(c)!.add(r.unit_slug);
      if (!rawSamples.has(c)) rawSamples.set(c, new Set());
      rawSamples.get(c)!.add(raw);
    }
  }
  const lines = [
    "## Widening-proposal frequency (normalized)",
    "",
    "Claude's raw proposal text is normalized to canonical tags via regex rules; unmatched proposals fall through with their raw name. Frequency = number of distinct units that proposed this widening.",
    "",
    "| Canonical widening | Units | Pressure cases |",
    "| --- | --- | --- |",
  ];
  const freq = new Map<string, number>();
  for (const [c, units] of canonical.entries()) freq.set(c, units.size);
  for (const [c, count] of sortEntriesDesc(freq)) {
    const units = [...canonical.get(c)!].sort().slice(0, 6).join(", ");
    const extra = canonical.get(c)!.size > 6 ? `, +${canonical.get(c)!.size - 6} more` : "";
    lines.push(`| \`${c}\` | ${count} | ${units}${extra} |`);
  }
  return { md: lines.join("\n"), canonical };
}

function renderStructuralWidenings(rows: ReadonlyArray<DatasetRow>): string {
  const structural = rows.filter((r) => r.verdict === "structural_widening");
  const lines = ["## Structural widenings (new payload families / subgraphs)", ""];
  if (structural.length === 0) {
    lines.push("_None found._");
    return lines.join("\n");
  }
  for (const r of structural) {
    lines.push(`### ${r.unit_slug}`);
    lines.push("");
    for (const w of r.claude_proposed_widenings) {
      if (!w.name) continue;
      lines.push(`- **${w.name}** (${w.kind ?? "?"}) — ${(w.justification ?? "").slice(0, 240)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// Axis detection — scan both widening NAME and JUSTIFICATION because
// Claude often names the atom (e.g., "hp_pool") but describes the
// scaling axis only in the justification (e.g., "5 × class level").
const AXIS_PATTERNS: Record<string, ReadonlyArray<RegExp>> = {
  class_level_tiers: [
    /class.?level.?tier/i,
    /scales?.?by.?class.?level/i,
    /per.?class.?level/i,
    /class.?level.?threshold/i,
    /tier(ed)?.?by.?class.?level/i,
  ],
  linear_per_level: [
    /linear.?(per|with).?level/i,
    /\d+.?×.?(class.?)?level/i, // "5 × paladin level"
    /\d+.?times.?(class.?)?level/i,
    /pool.?scales?.?with.?level/i,
    /continuous.?integer.*level/i,
    /formula.?driven.?by.?level/i,
    /equal.?to.?your.?fighter.?level/i, // Second Wind: "1d10 plus your Fighter level"
    /\+.?(class.?)?level.?as.?flat.?addend/i,
    /plus.?your.?\w+.?level/i,
  ],
  pb_linked_scaling: [
    /proficiency.?bonus.?linked/i,
    /scales?.?with.?(the.?)?pb/i,
    /pb.?(times|per)/i,
    /uses.?=.?pb/i,
  ],
  subclass_level_tiers: [/subclass.?level.?tier/i, /by.?subclass.?level/i],
  character_level_tiers: [
    /character.?level.?tier/i,
    /cantrip.?upgrade/i,
    /scales?.?by.?character.?level/i,
  ],
};

function detectAxisSignals(
  rows: ReadonlyArray<DatasetRow>,
): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {};
  for (const axis of Object.keys(AXIS_PATTERNS)) result[axis] = new Set();

  for (const r of rows) {
    for (const w of r.claude_proposed_widenings) {
      const haystack = [w.name ?? "", w.justification ?? "", w.evidence ?? ""].join(" | ");
      for (const [axis, patterns] of Object.entries(AXIS_PATTERNS)) {
        for (const p of patterns) {
          if (p.test(haystack)) {
            result[axis]!.add(r.unit_slug);
            break;
          }
        }
      }
    }
  }
  return result;
}

function renderAvsBVerdict(
  canonical: Map<string, Set<string>>,
  rows: ReadonlyArray<DatasetRow>,
): string {
  const axes = detectAxisSignals(rows);
  const classLevelTiers = Math.max(
    canonical.get("class_level_tiers")?.size ?? 0,
    axes.class_level_tiers?.size ?? 0,
  );
  const linearPerLevel = Math.max(
    canonical.get("linear_per_level")?.size ?? 0,
    axes.linear_per_level?.size ?? 0,
  );
  const pbLinked = Math.max(
    canonical.get("pb_linked_scaling")?.size ?? 0,
    axes.pb_linked_scaling?.size ?? 0,
  );
  const subclassTiers = Math.max(
    canonical.get("subclass_level_tiers")?.size ?? 0,
    axes.subclass_level_tiers?.size ?? 0,
  );
  const newAxes = pbLinked + subclassTiers;

  let verdict: "A" | "B" | "inconclusive" = "inconclusive";
  let reason = "";
  if (classLevelTiers >= 3 && (linearPerLevel >= 2 || newAxes >= 1)) {
    verdict = "B";
    reason =
      `class_level_tiers in ${classLevelTiers} units ≥ 3 AND ` +
      `(linear_per_level in ${linearPerLevel} ≥ 2 OR new-axis proposals in ${newAxes} ≥ 1).`;
  } else if (classLevelTiers > 0 && linearPerLevel === 0 && newAxes === 0) {
    verdict = "A";
    reason = `class_level_tiers in ${classLevelTiers} units, 0 linear-per-level, 0 new axes.`;
  } else {
    reason =
      `class_level_tiers=${classLevelTiers}, linear_per_level=${linearPerLevel}, new_axes=${newAxes}. ` +
      `Doesn't cleanly satisfy either A or B threshold.`;
  }

  const linearUnits = axes.linear_per_level ? [...axes.linear_per_level].sort().join(", ") : "";
  const pbUnits = axes.pb_linked_scaling ? [...axes.pb_linked_scaling].sort().join(", ") : "";
  const subclassUnits = axes.subclass_level_tiers ? [...axes.subclass_level_tiers].sort().join(", ") : "";

  return `## Option A vs Option B — rubric verdict

Axis signals scan both widening NAMES and JUSTIFICATIONS (since Claude
often names the atom but hides the scaling axis in the justification
text, e.g. "hp_pool" named but "5 × paladin level" in justification).

\`class_level_tiers\` units: **${classLevelTiers}**
\`linear_per_level\` units: **${linearPerLevel}**${linearUnits ? ` — ${linearUnits}` : ""}
\`pb_linked_scaling\` units: **${pbLinked}**${pbUnits ? ` — ${pbUnits}` : ""}
\`subclass_level_tiers\` units: **${subclassTiers}**${subclassUnits ? ` — ${subclassUnits}` : ""}
Other new axes (pb_linked + subclass_level): **${newAxes}**

**Verdict: Option ${verdict}** — ${reason}`;
}

// --- main ---

function main(): void {
  const rows = loadDataset();
  const queue = loadQueue();

  if (rows.length === 0) {
    process.stderr.write("no rows in survey-results-srd.jsonl\n");
    process.exit(66);
  }

  const { md: wideningMd, canonical } = renderWideningFrequency(rows);

  const sections: string[] = [
    "# Content surface coverage — SRD report",
    "",
    `_Generated from \`survey-results-srd.jsonl\` (${rows.length} units)._`,
    "",
    renderOutcomeDistribution(rows),
    "",
    renderKindBreakdown(rows, queue),
    "",
    renderAtomFrequency(rows),
    "",
    wideningMd,
    "",
    renderStructuralWidenings(rows),
    "",
    renderAvsBVerdict(canonical, rows),
    "",
  ];

  fs.writeFileSync(outPath, sections.join("\n") + "\n", "utf8");
  process.stdout.write(`wrote ${outPath} (${rows.length} rows)\n`);
}

main();
