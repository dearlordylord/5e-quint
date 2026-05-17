import type { StatBlockRecord, UnitRecord } from "../surface/types.ts";
import type { Trace, TraceEdge, TraceNode } from "./tracer-model.ts";

import { idGen } from "./tracer-rule-labels.ts";

import { traceSpellUnit } from "./tracer-spell-core.ts";

import { traceCreatureActions } from "./tracer-creature-actions.ts";

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
    default: {
      const _exhaustive: never = unit;
      throw new Error(`unhandled unit kind: ${String(_exhaustive)}`);
    }
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
  ] as const) {
    if (slot === undefined) continue;
    traceCreatureActions(
      {
        procId: rootId,
        compId: rootId,
        slotId: null,
        kind,
        nodes,
        edges,
        ids,
      },
      slot,
    );
  }

  return {
    unitId: record.id,
    unitName: record.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}
