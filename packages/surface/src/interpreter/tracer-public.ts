import type { UnitRecord } from "../surface/types.ts";
import type {
  StatBlockProcedureEntry,
  StatBlockRecord,
} from "../surface/stat-block-types.ts";
import type { Trace, TraceEdge, TraceNode } from "./tracer-model.ts";
import { Match } from "effect";

import { idGen } from "./tracer-rule-labels.ts";
import { describeStatBlockValue } from "./tracer-creature-actions.ts";

import { traceSpellUnit } from "./tracer-spell-core.ts";

import {
  traceArmorTemplateUnit,
  traceArmorUnit,
  traceShieldTemplateUnit,
  traceShieldUnit,
  traceWeaponTemplateUnit,
  traceWeaponUnit,
} from "./tracer-equipment.ts";

import {
  traceBackgroundUnit,
  traceClassUnit,
  traceSpeciesUnit,
  traceSubclassUnit,
} from "./tracer-character-sources.ts";

import {
  traceClassFeatureUnit,
  traceFeatUnit,
  traceMagicItemUnit,
  traceSpeciesTraitUnit,
} from "./tracer-feature-sources.ts";

import { traceMasteryUnit } from "./tracer-mastery.ts";

export function traceUnit(unit: UnitRecord): Trace {
  switch (unit.kind) {
    case "spell":
      return traceSpellUnit(unit);
    case "class":
      return traceClassUnit(unit);
    case "subclass":
      return traceSubclassUnit(unit);
    case "class_feature":
      return traceClassFeatureUnit(unit);
    case "background":
      return traceBackgroundUnit(unit);
    case "mastery":
      return traceMasteryUnit(unit);
    case "feat":
      return traceFeatUnit(unit);
    case "species":
      return traceSpeciesUnit(unit);
    case "species_trait":
      return traceSpeciesTraitUnit(unit);
    case "magic_item":
      return traceMagicItemUnit(unit);
    case "armor":
      return traceArmorUnit(unit);
    case "armor_template":
      return traceArmorTemplateUnit(unit);
    case "shield":
      return traceShieldUnit(unit);
    case "shield_template":
      return traceShieldTemplateUnit(unit);
    case "weapon":
      return traceWeaponUnit(unit);
    case "weapon_template":
      return traceWeaponTemplateUnit(unit);
    /* v8 ignore start -- @preserve -- UnitRecord is a decoded tagged union exhausted above */
    default: {
      const _exhaustive: never = unit;
      throw new Error(`unhandled unit kind: ${String(_exhaustive)}`);
    }
    /* v8 ignore stop -- @preserve */
  }
}

export function traceStatBlock(record: StatBlockRecord): Trace {
  const ids = idGen();
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const rootId = ids("stat");

  nodes.push({
    id: rootId,
    category: "statBlock",
    atomKind: "stat_block_record",
    label: `stat_block_record\n${record.name}\nauthored content, not Unit`,
  });

  for (const [slot, kind] of [
    [record.statBlock.actions, "action"],
    [record.statBlock.bonusActions, "bonus_action"],
    [record.statBlock.reactions, "reaction"],
    [record.statBlock.legendaryActions?.entries, "legendary_action"],
  ] as const) {
    if (slot === undefined) continue;
    traceStandaloneProcedures(slot, kind, rootId, nodes, edges, ids);
  }

  return {
    unitId: record.id,
    unitName: record.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

function traceStandaloneProcedures(
  entries: ReadonlyArray<StatBlockProcedureEntry>,
  kind: "action" | "bonus_action" | "reaction" | "legendary_action",
  rootId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: ReturnType<typeof idGen>,
): void {
  for (const entry of entries) {
    if (entry.kind === "textOnly") {
      const holeId = ids("hole");
      const resourceRefs =
        entry.resourceRefs.kind === "none"
          ? "none"
          : entry.resourceRefs.ordinals.join(",");
      nodes.push({
        id: holeId,
        category: "hole",
        atomKind: `text_only_${entry.reason}`,
        label: `text_only [${kind} ${entry.procedureOrdinal}: ${entry.name}]\nreason: ${entry.reason}\nresources: ${resourceRefs}\n${entry.description}`,
      });
      edges.push({ from: rootId, to: holeId, relation: "retains" });
      continue;
    }

    const procedure = entry.procedure;
    const procedureName = procedure.name;
    const resourceRefs =
      entry.resourceRefs.kind === "none"
        ? "none"
        : entry.resourceRefs.ordinals.join(",");
    const nodeId = ids("proc");
    const prefix = `${kind} ${entry.procedureOrdinal}: ${procedureName}`;
    const { atomKind, detail } = Match.value(procedure).pipe(
      Match.discriminatorsExhaustive("kind")({
        attack_roll: (attack) => ({
          atomKind: "attack_roll",
          detail: `${attack.attackType} (+${describeStatBlockValue(attack.attackBonus)})`,
        }),
        multiattack: (multiattack) => ({
          atomKind: "multiattack",
          detail: `dispatches: ${multiattack.dispatches
            .map(
              (dispatch) =>
                `${describeStatBlockValue(dispatch.count)}× ordinal ${dispatch.procedureOrdinal}`,
            )
            .join(" + ")}`,
        }),
        action_option: (option) => ({
          atomKind: "action_option",
          detail: option.options.join(" or "),
        }),
        support: (support) => ({
          atomKind: "direct_apply",
          detail: `target: ${support.target}${support.rangeFeet === undefined ? "" : ` (${support.rangeFeet} ft)`}`,
        }),
        save: (save) => ({
          atomKind: "save_gate",
          detail: `${save.ability.toUpperCase()} save DC ${save.dc.dc}`,
        }),
        spellcasting: (spellcasting) => ({
          atomKind: "spellcasting",
          detail: spellcasting.groups
            .map(
              (group) =>
                `${group.kind}: ${group.spells.map((spell) => spell.spellId).join(", ")}`,
            )
            .join("; "),
        }),
      }),
    );
    nodes.push({
      id: nodeId,
      category: "procedure",
      atomKind,
      label: `${atomKind} [${prefix}]\n${detail}\nresources: ${resourceRefs}`,
    });
    edges.push({ from: rootId, to: nodeId, relation: "grants" });
  }
}
