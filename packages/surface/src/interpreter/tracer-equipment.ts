import type {
  ArmorAcFormula,
  ArmorRecord,
  ArmorTemplateRecord,
  BackgroundRecord,
  ClassRecord,
  MagicEquipmentVariant,
  ShieldRecord,
  ShieldTemplateRecord,
  SpeciesRecord,
  WeaponDamage,
  WeaponPropertyDetail,
  WeaponRecord,
  WeaponTemplateRecord,
} from "../surface/types.ts";
import type { Trace, TraceEdge, TraceNode } from "./tracer-model.ts";
import { idGen } from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import {
  traceItemDestruction,
  traceMagicItemMechanics,
} from "./tracer-feature-sources.ts";

// ============================================================
// Equipment tracer
// ============================================================

export function traceArmorUnit(armor: ArmorRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "armor_root",
    label: `armor_root\n${armor.name}\n(${armor.category})`,
  });

  const baseId = ids("ac");
  nodes.push({
    id: baseId,
    category: "effect",
    atomKind: "modify_ac_set_base",
    label: `armor base AC\n${describeArmorAcFormula(armor.acFormula)}`,
  });
  edges.push({ from: rootId, to: baseId, relation: "defines" });

  if (armor.strengthRequirement !== undefined) {
    const strId = ids("req");
    nodes.push({
      id: strId,
      category: "resolution",
      atomKind: "strength_requirement",
      label: `strength_requirement\nSTR ${armor.strengthRequirement}`,
    });
    edges.push({ from: rootId, to: strId, relation: "requires" });
  }

  if (armor.stealthDisadvantage === true) {
    const stealthId = ids("pred");
    nodes.push({
      id: stealthId,
      category: "effect",
      atomKind: "stealth_disadvantage",
      label: "stealth_disadvantage",
    });
    edges.push({ from: rootId, to: stealthId, relation: "imposes" });
  }

  traceDonDoff(
    rootId,
    `don ${armor.donDoff.donMinutes} min / doff ${armor.donDoff.doffMinutes} min`,
    nodes,
    edges,
    ids,
  );

  return traceFromNodes(armor, nodes, edges);
}

export function traceArmorTemplateUnit(armor: ArmorTemplateRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "armor_template_root",
    label: `armor_template_root\n${armor.name}\n(${armor.armorApplicability.categories.join(", ")})`,
  });
  for (const variant of armor.variants) {
    traceMagicEquipmentVariant(rootId, variant, nodes, edges, ids);
  }
  return traceFromNodes(armor, nodes, edges);
}

export function traceShieldUnit(shield: ShieldRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "shield_root",
    label: `shield_root\n${shield.name}\nhand use: ${shield.armorClassProjection.handUse}\ntraining: ${shield.armorClassProjection.trainingRequired}`,
  });

  const bonusId = ids("ac");
  nodes.push({
    id: bonusId,
    category: "effect",
    atomKind: "modify_ac",
    label: `shield AC bonus\n+${shield.armorClassProjection.bonus}`,
  });
  edges.push({ from: rootId, to: bonusId, relation: "grants" });

  traceDonDoff(
    rootId,
    `don/doff action: ${shield.donDoff.action}`,
    nodes,
    edges,
    ids,
  );

  return traceFromNodes(shield, nodes, edges);
}

export function traceShieldTemplateUnit(shield: ShieldTemplateRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "shield_template_root",
    label: `shield_template_root\n${shield.name}\nhand use: ${shield.armorClassProjection.handUse}\ntraining: ${shield.armorClassProjection.trainingRequired}`,
  });

  const bonusId = ids("ac");
  nodes.push({
    id: bonusId,
    category: "effect",
    atomKind: "modify_ac",
    label: `shield AC bonus\n+${shield.armorClassProjection.bonus}`,
  });
  edges.push({ from: rootId, to: bonusId, relation: "grants" });

  traceDonDoff(
    rootId,
    `don/doff action: ${shield.donDoff.action}`,
    nodes,
    edges,
    ids,
  );

  for (const variant of shield.variants) {
    traceMagicEquipmentVariant(rootId, variant, nodes, edges, ids);
  }

  return traceFromNodes(shield, nodes, edges);
}

export function traceMagicEquipmentVariant(
  rootId: string,
  variant: MagicEquipmentVariant,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const variantId = ids("root");
  nodes.push({
    id: variantId,
    category: "source",
    atomKind: "magic_equipment_variant",
    label: `magic_equipment_variant\n${variant.name}\n(${variant.magic.rarity})`,
  });
  edges.push({ from: rootId, to: variantId, relation: "roots" });
  const procIds = traceMagicItemMechanics(
    variant.magic.mechanics,
    nodes,
    edges,
    ids,
  );
  for (const procId of procIds) {
    edges.push({ from: variantId, to: procId, relation: "roots" });
  }
  traceItemDestruction(variant.magic.destruction, variantId, nodes, edges, ids);
}

export function traceWeaponUnit(weapon: WeaponRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "weapon_root",
    label: `weapon_root\n${weapon.name}\n(${weapon.category}, ${weapon.usage})`,
  });

  const damageId = ids("dmg");
  nodes.push({
    id: damageId,
    category: "effect",
    atomKind: "weapon_damage",
    label: `weapon_damage\n${describeWeaponDamage(weapon.damage)}`,
  });
  edges.push({ from: rootId, to: damageId, relation: "defines" });

  for (const property of weapon.properties ?? []) {
    const propertyId = ids("prop");
    nodes.push({
      id: propertyId,
      category: "source",
      atomKind: "weapon_property",
      label: `weapon_property\n${describeWeaponProperty(property)}`,
    });
    edges.push({ from: rootId, to: propertyId, relation: "defines" });
  }

  const masteryId = ids("mast");
  nodes.push({
    id: masteryId,
    category: "source",
    atomKind: "weapon_mastery",
    label: `weapon_mastery\n${weapon.mastery}`,
  });
  edges.push({ from: rootId, to: masteryId, relation: "defines" });

  return traceFromNodes(weapon, nodes, edges);
}

export function traceWeaponTemplateUnit(weapon: WeaponTemplateRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "weapon_template_root",
    label: `weapon_template_root\n${weapon.name}\n${describeWeaponApplicability(weapon.weaponApplicability)}`,
  });
  if (weapon.ammunitionQuantity !== undefined) {
    const qtyId = ids("qty");
    nodes.push({
      id: qtyId,
      category: "source",
      atomKind: "ammunition_quantity",
      label: `ammunition_quantity\n${weapon.ammunitionQuantity.counts.join(" or ")} pieces\n${weapon.ammunitionQuantity.valueEquivalence.count} = ${weapon.ammunitionQuantity.valueEquivalence.item}`,
    });
    edges.push({ from: rootId, to: qtyId, relation: "defines" });
  }
  for (const variant of weapon.variants) {
    traceMagicEquipmentVariant(rootId, variant, nodes, edges, ids);
  }
  return traceFromNodes(weapon, nodes, edges);
}

export function describeWeaponApplicability(
  applicability: WeaponTemplateRecord["weaponApplicability"],
): string {
  switch (applicability.kind) {
    case "any_weapon":
      return `(${applicability.categories.join(", ")})`;
    case "any_melee_weapon":
      return "(any melee weapon)";
    case "ammunition":
      return "(ammunition)";
    default: {
      const _exhaustive: never = applicability;
      throw new Error(`unhandled weapon applicability: ${String(_exhaustive)}`);
    }
  }
}

export function traceDonDoff(
  rootId: string,
  label: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const id = ids("equip");
  nodes.push({
    id,
    category: "procedure",
    atomKind: "don_doff",
    label: `don_doff\n${label}`,
  });
  edges.push({ from: rootId, to: id, relation: "uses" });
}

export function describeArmorAcFormula(formula: ArmorAcFormula): string {
  switch (formula.kind) {
    case "light_dex":
      return `${formula.base} + DEX mod`;
    case "medium_dex_max_2":
      return `${formula.base} + DEX mod (max 2)`;
    case "heavy_fixed":
      return `${formula.ac}`;
    default: {
      const _exhaustive: never = formula;
      throw new Error(`unhandled armor AC formula: ${String(_exhaustive)}`);
    }
  }
}

export function describeWeaponDamage(damage: WeaponDamage): string {
  switch (damage.kind) {
    case "dice":
      return `${damage.dice}d${damage.dieSize} ${damage.damageType}`;
    case "flat":
      return `${damage.amount} ${damage.damageType}`;
    default: {
      const _exhaustive: never = damage;
      throw new Error(`unhandled weapon damage: ${String(_exhaustive)}`);
    }
  }
}

export function describeWeaponProperty(property: WeaponPropertyDetail): string {
  switch (property.kind) {
    case "ammunition":
      return `ammunition (${property.range.normal}/${property.range.long}; ${property.ammunition})`;
    case "finesse":
    case "heavy":
    case "light":
    case "loading":
    case "reach":
      return property.kind;
    case "two_handed":
      return property.unless === undefined
        ? property.kind
        : `${property.kind} unless ${property.unless}`;
    case "thrown":
      return `thrown (${property.range.normal}/${property.range.long})`;
    case "versatile":
      return `versatile (${describeWeaponDamage(property.damage)})`;
    default: {
      const _exhaustive: never = property;
      throw new Error(`unhandled weapon property: ${String(_exhaustive)}`);
    }
  }
}

export function traceFromNodes(
  unit:
    | ArmorRecord
    | ArmorTemplateRecord
    | BackgroundRecord
    | ClassRecord
    | ShieldRecord
    | ShieldTemplateRecord
    | SpeciesRecord
    | WeaponTemplateRecord
    | WeaponRecord,
  nodes: ReadonlyArray<TraceNode>,
  edges: ReadonlyArray<TraceEdge>,
): Trace {
  return {
    unitId: unit.id,
    unitName: unit.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}
