import type {
  BackgroundRecord,
  ClassRecord,
  PrimaryAbilityExpression,
  SpeciesRecord,
  StartingEquipmentChoice,
  StartingEquipmentItemRef,
  UnitRecord,
} from "../surface/types.ts";
import type { Trace, TraceEdge, TraceNode } from "./tracer-model.ts";
import { describeToolProficiencyGrant, idGen } from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import { traceFromNodes } from "./tracer-equipment.ts";

import { describeClassWeaponProficiency } from "./tracer-activated-abilities.ts";

// ============================================================
// Character-creation aggregate tracers
// ============================================================

export function traceClassUnit(unit: ClassRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "class_root",
    label: `class_root\n${unit.name}\nhit die d${unit.hitPointDie}`,
  });

  const primaryAbilityId = ids("primary_ability");
  nodes.push({
    id: primaryAbilityId,
    category: "source",
    atomKind: "class_primary_abilities",
    label: `class_primary_abilities\n${formatPrimaryAbilityExpression(unit.primaryAbilities)}`,
  });
  edges.push({ from: rootId, to: primaryAbilityId, relation: "grants" });

  const savesId = ids("save");
  nodes.push({
    id: savesId,
    category: "source",
    atomKind: "class_saving_throw_proficiencies",
    label: `class_saving_throw_proficiencies\n${unit.savingThrowProficiencies.join(", ")}`,
  });
  edges.push({ from: rootId, to: savesId, relation: "grants" });

  const weaponId = ids("weapon");
  nodes.push({
    id: weaponId,
    category: "source",
    atomKind: "class_weapon_proficiencies",
    label: `class_weapon_proficiencies\n${unit.weaponProficiencies
      .map(describeClassWeaponProficiency)
      .join(", ")}`,
  });
  edges.push({ from: rootId, to: weaponId, relation: "grants" });

  const toolId = ids("tool");
  nodes.push({
    id: toolId,
    category: "source",
    atomKind: "class_tool_proficiencies",
    label: `class_tool_proficiencies\n${describeToolProficiencyGrant(
      unit.toolProficiencies,
    )}`,
  });
  edges.push({ from: rootId, to: toolId, relation: "grants" });

  const armorId = ids("armor");
  nodes.push({
    id: armorId,
    category: "source",
    atomKind: "class_armor_training",
    label: `class_armor_training\n${
      unit.armorTraining.kind === "trained"
        ? unit.armorTraining.categories.join(", ")
        : "none"
    }`,
  });
  edges.push({ from: rootId, to: armorId, relation: "grants" });

  const skillId = ids("skill");
  nodes.push({
    id: skillId,
    category: "hole",
    atomKind: "class_skill_proficiency_choice",
    label: `class_skill_proficiency_choice\nchoose ${unit.skillProficiencyChoice.choose}\n${unit.skillProficiencyChoice.options.join(", ")}`,
  });
  edges.push({ from: rootId, to: skillId, relation: "opens" });

  for (const grant of unit.featureGrants) {
    const grantId = ids("grant");
    nodes.push({
      id: grantId,
      category: "source",
      atomKind: "class_feature_grant",
      label: `class_feature_grant\nlevel ${grant.level}\n${grant.unitId}`,
    });
    edges.push({ from: rootId, to: grantId, relation: "grants" });
  }

  for (const choice of unit.subclassChoices) {
    const choiceId = ids("subclass");
    nodes.push({
      id: choiceId,
      category: "hole",
      atomKind: "subclass_choice",
      label: `subclass_choice\nlevel ${choice.level}\n${choice.options.join(", ")}`,
    });
    edges.push({ from: rootId, to: choiceId, relation: "opens" });
  }

  traceStartingEquipment(rootId, unit.startingEquipment, nodes, edges, ids);

  return traceFromNodes(unit, nodes, edges);
}

export function formatPrimaryAbilityExpression(
  primaryAbilities: PrimaryAbilityExpression,
): string {
  if (primaryAbilities.kind === "all_of") {
    return primaryAbilities.abilities.join(" and ");
  }

  if (primaryAbilities.kind === "any_of") {
    return primaryAbilities.abilities.join(" or ");
  }

  const exhaustive: never = primaryAbilities;
  throw new Error(`Unhandled primary ability expression: ${exhaustive}`);
}

export function traceSubclassUnit(
  unit: Extract<UnitRecord, { kind: "subclass" }>,
): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();
  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "subclass_root",
    label: `subclass_root\n${unit.name}\n${unit.className}`,
  });

  for (const grant of unit.featureGrants) {
    const grantId = ids("grant");
    nodes.push({
      id: grantId,
      category: "source",
      atomKind: "subclass_feature_grant",
      label: `subclass_feature_grant\nlevel ${grant.level}\n${grant.unitId}`,
    });
    edges.push({ from: rootId, to: grantId, relation: "grants" });
  }

  return {
    unitId: unit.id,
    unitName: unit.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

export function traceBackgroundUnit(unit: BackgroundRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "background_root",
    label: `background_root\n${unit.name}\n${unit.abilityScoreIncrease.abilities.join(", ")}`,
  });

  const featId = ids("feat");
  nodes.push({
    id: featId,
    category: "source",
    atomKind: "background_origin_feat",
    label: `background_origin_feat\n${unit.originFeatId}`,
  });
  edges.push({ from: rootId, to: featId, relation: "grants" });

  traceStartingEquipment(rootId, unit.startingEquipment, nodes, edges, ids);

  return traceFromNodes(unit, nodes, edges);
}

export function traceSpeciesUnit(unit: SpeciesRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "species_root",
    label: `species_root\n${unit.name}\n${unit.creatureType}, ${speciesSizeLabel(unit.size)}, ${unit.speed.walkFeet} ft.`,
  });

  for (const traitId of Object.values(unit.traits)) {
    const traitNodeId = ids("trait");
    nodes.push({
      id: traitNodeId,
      category: "source",
      atomKind: "species_trait_grant",
      label: `species_trait_grant\n${traitId}`,
    });
    edges.push({ from: rootId, to: traitNodeId, relation: "grants" });
  }

  return traceFromNodes(unit, nodes, edges);
}

export function speciesSizeLabel(size: SpeciesRecord["size"]): string {
  return size.kind === "fixed" ? size.size : size.options.join("/");
}

export function traceStartingEquipment(
  rootId: string,
  choices: readonly StartingEquipmentChoice[],
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  for (const choice of choices) {
    const nodeId = ids("equipment");
    nodes.push({
      id: nodeId,
      category: "hole",
      atomKind: "starting_equipment_choice",
      label:
        choice.kind === "coin_grant"
          ? `starting_equipment_choice\n${choice.id}: ${choice.coinsGp} GP`
          : `starting_equipment_choice\n${choice.id}: ${choice.items.map(describeStartingEquipmentItem).join(", ")}`,
    });
    edges.push({ from: rootId, to: nodeId, relation: "offers" });
  }
}

export function describeStartingEquipmentItem(
  item: StartingEquipmentItemRef,
): string {
  switch (item.kind) {
    case "unit_ref":
      return item.quantity === undefined
        ? item.unitId
        : `${item.quantity} ${item.unitId}`;
    case "selected_tool_proficiency":
      return "selected tool proficiency";
    case "draft_owned_item":
      return item.quantity === undefined
        ? item.itemName
        : `${item.quantity} ${item.itemName}`;
    default: {
      const _exhaustive: never = item;
      throw new Error(
        `unhandled starting equipment item: ${String(_exhaustive)}`,
      );
    }
  }
}
