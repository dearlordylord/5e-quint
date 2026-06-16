import type {
  ActivatedAbilityMechanics,
  ClassFeatureRecord,
  CompositeMagicItemMechanics,
  CreatureSpaceMovementPermissionMechanics,
  D20TestNaturalOneRerollMechanics,
  FeatRecord,
  GrapplerFeatMechanics,
  GnomishLineageMechanics,
  HideActionObscurementPermissionMechanics,
  ItemDestructionPolicy,
  LightExtraAttackDamageAbilityModifierFeatMechanics,
  MagicItemAttunement,
  MagicItemAttunementRestriction,
  MagicItemMechanics,
  MagicItemRecord,
  MagicItemSpawnedCreatureMechanics,
  MagicItemVariant,
  MagicInitiateMechanics,
  OnHitTriggerMechanics,
  PassiveMechanics,
  SpeciesTraitRecord,
  TriggeredReactionAbilityMechanics,
  TriggeredReplacementMechanics,
  WeaponAttackDamageDieFloorFeatMechanics,
} from "../surface/types.ts";
import type { Trace, TraceEdge, TraceNode } from "./tracer-model.ts";
import { idGen } from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import {
  traceClassFeatureMechanics,
  tracePassiveMechanics,
} from "./tracer-feature-mechanics.ts";

import {
  traceActivatedAbility,
  traceMagicItemSpawnedCreature,
  traceTriggeredReactionAbility,
} from "./tracer-activated-abilities.ts";

import { traceOnHitTriggerMechanics } from "./tracer-mastery.ts";

// ============================================================
// Class-feature tracer
// ============================================================

export function traceClassFeatureUnit(feat: ClassFeatureRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "class_feature_root",
    label: `class_feature_root\n${feat.name}\n(${feat.className}, L${feat.acquiredAtLevel})`,
  });

  const procedureIds = traceClassFeatureMechanics(
    feat.mechanics,
    nodes,
    edges,
    ids,
  );
  for (const procedureId of procedureIds) {
    edges.push({ from: rootId, to: procedureId, relation: "roots" });
  }

  return {
    unitId: feat.id,
    unitName: feat.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

// Shared dispatch for families that can be either passive or activated —
// used by FeatRecord and SpeciesTraitRecord.
export function tracePassiveOrActivated(
  m: PassiveMechanics | ActivatedAbilityMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  switch (m.family) {
    case "passive":
      return tracePassiveMechanics(m, nodes, edges, ids);
    case "activation":
      return traceActivatedAbility(m, nodes, edges, ids);
    default: {
      const _exhaustive: never = m;
      throw new Error(
        `unhandled mechanics family: ${String((_exhaustive as { family: string }).family)}`,
      );
    }
  }
}

export function traceTriggeredReplacementMechanics(
  m: TriggeredReplacementMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const triggerId = ids("trig");
  nodes.push({
    id: triggerId,
    category: "window",
    atomKind: "triggered_replacement_window",
    label: `triggered_replacement_window\n${m.trigger.kind}`,
  });

  const effectId = ids("eff");
  nodes.push({
    id: effectId,
    category: "effect",
    atomKind: m.effect.kind,
    label:
      m.effect.kind === "prevent_drop_to_0_hp"
        ? `${m.effect.kind}\nreplacement HP ${m.effect.replacementHp}`
        : m.effect.kind,
  });
  edges.push({ from: triggerId, to: effectId, relation: "replaces_with" });

  const resetId = ids("reset");
  nodes.push({
    id: resetId,
    category: "resource",
    atomKind: "reset_cadence",
    label: `reset_cadence\n${m.resetCadence.kind}`,
  });
  edges.push({ from: effectId, to: resetId, relation: "recovers_on" });

  return triggerId;
}

export function traceMagicItemMechanics(
  m:
    | PassiveMechanics
    | ActivatedAbilityMechanics
    | TriggeredReactionAbilityMechanics
    | OnHitTriggerMechanics
    | MagicItemSpawnedCreatureMechanics
    | CompositeMagicItemMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string[] {
  switch (m.family) {
    case "passive":
    case "activation":
      return [tracePassiveOrActivated(m, nodes, edges, ids)];
    case "on_hit_trigger":
      return [traceOnHitTriggerMechanics(m, nodes, edges, ids)];
    case "spawned_creature":
      return [traceMagicItemSpawnedCreature(m, nodes, edges, ids)];
    case "triggered_reaction":
      return [traceTriggeredReactionAbility(m, nodes, edges, ids)];
    case "composite":
      return m.parts.map((part) => {
        switch (part.family) {
          case "passive":
          case "activation":
            return tracePassiveOrActivated(part, nodes, edges, ids);
          case "on_hit_trigger":
            return traceOnHitTriggerMechanics(part, nodes, edges, ids);
          case "spawned_creature":
            return traceMagicItemSpawnedCreature(part, nodes, edges, ids);
          case "triggered_reaction":
            return traceTriggeredReactionAbility(part, nodes, edges, ids);
          default: {
            const _exhaustive: never = part;
            throw new Error(
              `unhandled magic-item component family: ${String((_exhaustive as { family: string }).family)}`,
            );
          }
        }
      });
    default: {
      const _exhaustive: never = m;
      throw new Error(
        `unhandled magic-item mechanics family: ${String((_exhaustive as { family: string }).family)}`,
      );
    }
  }
}

// ============================================================
// Feat tracer
// ============================================================

export function traceFeatUnit(feat: FeatRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "feat_root",
    label: `feat_root\n${feat.name}\n(${feat.category})`,
  });

  const procId = traceFeatMechanics(feat.mechanics, nodes, edges, ids);
  edges.push({ from: rootId, to: procId, relation: "roots" });

  return {
    unitId: feat.id,
    unitName: feat.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

function traceFeatMechanics(
  mechanics: FeatRecord["mechanics"],
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  if (mechanics.family === "on_hit_trigger") {
    return traceOnHitTriggerMechanics(mechanics, nodes, edges, ids);
  }
  if (mechanics.family === "triggered_replacement") {
    return traceTriggeredReplacementMechanics(mechanics, nodes, edges, ids);
  }
  if (mechanics.family === "magic_initiate") {
    return traceMagicInitiateMechanics(mechanics, nodes, ids);
  }
  if (mechanics.family === "grappler") {
    return traceGrapplerFeatMechanics(mechanics, nodes, edges, ids);
  }
  if (mechanics.family === "damage_die_floor") {
    return traceWeaponAttackDamageDieFloorMechanics(
      mechanics,
      nodes,
      edges,
      ids,
    );
  }
  if (mechanics.family === "light_extra_attack_damage_ability_modifier") {
    return traceLightExtraAttackDamageAbilityModifierMechanics(
      mechanics,
      nodes,
      edges,
      ids,
    );
  }
  return tracePassiveOrActivated(mechanics, nodes, edges, ids);
}

function traceMagicInitiateMechanics(
  mechanics: MagicInitiateMechanics,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const procId = ids("magic-initiate");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: "magic_initiate",
    label:
      `magic_initiate\n${mechanics.spellList} spell list\n` +
      "2 cantrips + 1 level 1 spell\nspellcasting ability choice",
  });
  return procId;
}

function traceGrapplerFeatMechanics(
  mechanics: GrapplerFeatMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const procId = ids("grappler");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: "grappler",
    label: "grappler\nGeneral feat battle benefits",
  });

  const punchId = ids("punch-grab");
  nodes.push({
    id: punchId,
    category: "effect",
    atomKind: "grappler_punch_and_grab",
    label:
      `grappler_punch_and_grab\n${mechanics.punchAndGrab.trigger}\n` +
      `${mechanics.punchAndGrab.options.join(" + ")}\n` +
      mechanics.punchAndGrab.usageLimit.kind,
  });
  edges.push({ from: procId, to: punchId, relation: "includes" });

  const advantageId = ids("advantage");
  nodes.push({
    id: advantageId,
    category: "effect",
    atomKind: "grappler_attack_advantage",
    label:
      `grappler_attack_advantage\n${mechanics.attackAdvantage.mode}\n` +
      `${mechanics.attackAdvantage.on.join(", ")}\n` +
      mechanics.attackAdvantage.target,
  });
  edges.push({ from: procId, to: advantageId, relation: "includes" });

  const wrestlerId = ids("fast-wrestler");
  nodes.push({
    id: wrestlerId,
    category: "effect",
    atomKind: "grappler_fast_wrestler",
    label:
      `grappler_fast_wrestler\n${mechanics.fastWrestler.movementCost}\n` +
      mechanics.fastWrestler.targetSize,
  });
  edges.push({ from: procId, to: wrestlerId, relation: "includes" });

  return procId;
}

function traceWeaponAttackDamageDieFloorMechanics(
  mechanics: WeaponAttackDamageDieFloorFeatMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const procId = ids("damage-floor");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: "weapon_attack_damage_die_floor",
    label:
      `weapon_attack_damage_die_floor\n${mechanics.trigger.kind}\n` +
      `${mechanics.trigger.attackWeapon.kind}\n` +
      mechanics.trigger.attackWeapon.propertyGate,
  });

  const effectId = ids("die-floor");
  nodes.push({
    id: effectId,
    category: "effect",
    atomKind: mechanics.effect.kind,
    label:
      `${mechanics.effect.kind}\n${mechanics.effect.dieScope}\n` +
      `minimum ${mechanics.effect.minimumResult}\n` +
      (mechanics.optional ? "optional" : "required"),
  });
  edges.push({ from: procId, to: effectId, relation: "includes" });

  return procId;
}

function traceLightExtraAttackDamageAbilityModifierMechanics(
  mechanics: LightExtraAttackDamageAbilityModifierFeatMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const procId = ids("light-extra-attack-damage-modifier");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: "light_extra_attack_damage_ability_modifier",
    label:
      `light_extra_attack_damage_ability_modifier\n${mechanics.trigger.kind}\n` +
      mechanics.trigger.attackWeapon.kind,
  });

  const effectId = ids("damage-ability-modifier");
  nodes.push({
    id: effectId,
    category: "effect",
    atomKind: mechanics.effect.kind,
    label:
      `${mechanics.effect.kind}\n${mechanics.effect.modifierSource}\n` +
      `${mechanics.effect.appliesWhen}\n` +
      (mechanics.optional ? "optional" : "required"),
  });
  edges.push({ from: procId, to: effectId, relation: "includes" });

  return procId;
}

// ============================================================
// Species-trait tracer
// ============================================================

export function traceSpeciesTraitUnit(trait: SpeciesTraitRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "species_trait_root",
    label: `species_trait_root\n${trait.name}\n(${trait.species})`,
  });

  const procId =
    trait.mechanics.family === "triggered_replacement"
      ? traceTriggeredReplacementMechanics(trait.mechanics, nodes, edges, ids)
      : trait.mechanics.family === "species_lineage_choice"
        ? traceGnomishLineageMechanics(trait.mechanics, nodes, edges, ids)
        : trait.mechanics.family === "d20_test_natural_one_reroll"
          ? traceD20TestNaturalOneRerollMechanics(
              trait.mechanics,
              nodes,
              ids,
            )
          : trait.mechanics.family === "creature_space_movement_permission"
            ? traceCreatureSpaceMovementPermissionMechanics(
                trait.mechanics,
                nodes,
                ids,
              )
            : trait.mechanics.family === "hide_action_obscurement_permission"
              ? traceHideActionObscurementPermissionMechanics(
                  trait.mechanics,
                  nodes,
                  ids,
                )
              : tracePassiveOrActivated(trait.mechanics, nodes, edges, ids);
  edges.push({ from: rootId, to: procId, relation: "roots" });

  return {
    unitId: trait.id,
    unitName: trait.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

function traceGnomishLineageMechanics(
  mechanics: GnomishLineageMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const choiceId = ids("lineage");
  nodes.push({
    id: choiceId,
    category: "procedure",
    atomKind: "species_lineage_choice",
    label:
      `species_lineage_choice\n${mechanics.choiceKey}\n${mechanics.timing}\n` +
      `spellcasting ability: ${mechanics.spellcastingAbilityChoice.abilities.join(", ")}`,
  });

  for (const option of mechanics.options) {
    const optionId = ids(option.id);
    nodes.push({
      id: optionId,
      category: "procedure",
      atomKind: "species_lineage_option",
      label: `species_lineage_option\n${option.displayName}`,
    });
    edges.push({ from: choiceId, to: optionId, relation: "offers" });

    const grantId = tracePassiveMechanics(option.mechanics, nodes, edges, ids);
    edges.push({ from: optionId, to: grantId, relation: "selects" });

    if ("clockworkDevice" in option) {
      const device = option.clockworkDevice;
      const deviceId = ids("clockwork-device");
      nodes.push({
        id: deviceId,
        category: "effect",
        atomKind: "rock_gnome_clockwork_device",
        label:
          `rock_gnome_clockwork_device\n${device.creation.object.size} object AC ${device.creation.object.armorClass} HP ${device.creation.object.hitPoints}\n` +
          `${device.creation.trigger.castingTime.amount} ${device.creation.trigger.castingTime.unit} ${device.creation.trigger.spellId}\n` +
          `limit ${device.concurrentLimit}; duration ${device.duration.amount} ${device.duration.unit}`,
      });
      edges.push({ from: optionId, to: deviceId, relation: "creates" });
    }
  }

  return choiceId;
}

function traceD20TestNaturalOneRerollMechanics(
  mechanics: D20TestNaturalOneRerollMechanics,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const procId = ids("d20-test-natural-one-reroll");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: mechanics.family,
    label:
      `${mechanics.family}\n${mechanics.trigger.kind}: ${mechanics.trigger.dieFace}\n` +
      `${mechanics.reroll.kind}: ${mechanics.reroll.use}\noptional`,
  });
  return procId;
}

function traceCreatureSpaceMovementPermissionMechanics(
  mechanics: CreatureSpaceMovementPermissionMechanics,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const procId = ids("creature-space-movement-permission");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: mechanics.family,
    label:
      `${mechanics.family}\n${mechanics.moveThrough.kind}\n` +
      `${mechanics.moveThrough.creatureSizeRelationToSelf}\n` +
      `can stop: ${mechanics.canStopInOccupiedSpace}`,
  });
  return procId;
}

function traceHideActionObscurementPermissionMechanics(
  mechanics: HideActionObscurementPermissionMechanics,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const procId = ids("hide-action-obscurement-permission");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: mechanics.family,
    label:
      `${mechanics.family}\n${mechanics.action}\n` +
      `${mechanics.allowedObscurement.kind}\n` +
      mechanics.allowedObscurement.creatureSizeRelationToSelf,
  });
  return procId;
}

// ============================================================
// Magic-item tracer
// ============================================================

export function traceMagicItemUnit(item: MagicItemRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "magic_item_root",
    label:
      "variants" in item
        ? `magic_item_root\n${item.name}\n(${item.variants.length} variants)${describeMagicItemCollectionAttunement(item)}`
        : `magic_item_root\n${item.name}\n(${item.rarity})${describeMagicItemAttunement(item)}`,
  });

  if ("variants" in item) {
    for (const variant of item.variants) {
      traceMagicItemVariant(rootId, item, variant, nodes, edges, ids);
    }
  } else {
    traceMagicItemPayload(rootId, item, nodes, edges, ids);
  }

  return {
    unitId: item.id,
    unitName: item.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

export function traceMagicItemVariant(
  parentRootId: string,
  item: Extract<
    MagicItemRecord,
    { readonly variants: ReadonlyArray<MagicItemVariant> }
  >,
  variant: MagicItemVariant,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const attunement = resolveMagicItemVariantAttunement(item, variant);
  const variantRootId = ids("root");
  nodes.push({
    id: variantRootId,
    category: "source",
    atomKind: "magic_item_root",
    label: `magic_item_root\n${variant.name}\n(${variant.rarity})${describeMagicItemPayloadAttunement(attunement)}`,
  });
  edges.push({ from: parentRootId, to: variantRootId, relation: "roots" });
  traceMagicItemPayload(
    variantRootId,
    {
      mechanics: variant.mechanics,
      destruction: variant.destruction,
      ...attunement,
    },
    nodes,
    edges,
    ids,
  );
}

export function traceMagicItemPayload(
  rootId: string,
  item: {
    readonly mechanics: MagicItemMechanics;
    readonly destruction: ItemDestructionPolicy;
  } & MagicItemAttunement,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // Attunement slot is a v4 resource atom. Only emit when required.
  if (item.requiresAttunement) {
    const slotId = ids("attun");
    nodes.push({
      id: slotId,
      category: "resource",
      atomKind: "attunement_slot",
      label: "attunement_slot",
    });
    edges.push({ from: rootId, to: slotId, relation: "consumes" });
  }

  const procIds = traceMagicItemMechanics(item.mechanics, nodes, edges, ids);
  for (const procId of procIds) {
    edges.push({ from: rootId, to: procId, relation: "roots" });
  }

  traceItemDestruction(item.destruction, rootId, nodes, edges, ids);
}

export function describeMagicItemAttunement(item: MagicItemRecord): string {
  if ("variants" in item) return "";
  return describeMagicItemPayloadAttunement(item);
}

export function describeMagicItemCollectionAttunement(
  item: Extract<
    MagicItemRecord,
    { readonly variants: ReadonlyArray<MagicItemVariant> }
  >,
): string {
  return describeMagicItemPayloadAttunement(item.defaultAttunement);
}

export function describeMagicItemPayloadAttunement(item: {
  readonly requiresAttunement: boolean;
  readonly attunementRestriction?: MagicItemAttunementRestriction;
}): string {
  if (!item.requiresAttunement) return "";
  if (item.attunementRestriction === undefined) return " [attunement]";
  return ` [attunement: ${describeMagicItemAttunementRestriction(item.attunementRestriction)}]`;
}

export function resolveMagicItemVariantAttunement(
  item: Extract<
    MagicItemRecord,
    { readonly variants: ReadonlyArray<MagicItemVariant> }
  >,
  variant: MagicItemVariant,
): MagicItemAttunement {
  return variant.attunementOverride ?? item.defaultAttunement;
}

export function describeMagicItemAttunementRestriction(
  restriction: MagicItemAttunementRestriction,
): string {
  switch (restriction.kind) {
    case "spellcaster":
      return "spellcaster";
    case "class_list":
      return restriction.classes.join(", ");
    default: {
      const _exhaustive: never = restriction;
      return _exhaustive;
    }
  }
}

export function traceItemDestruction(
  d: ItemDestructionPolicy,
  rootId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (d.kind) {
    case "none":
      return;
    case "becomes_nonmagical_on_hit": {
      const destId = ids("dest");
      nodes.push({
        id: destId,
        category: "lifecycle",
        atomKind: "item_destruction",
        label: "item_destruction\nbecomes nonmagical on hit",
      });
      edges.push({ from: rootId, to: destId, relation: "lifecycle" });
      return;
    }
    case "last_charge_roll": {
      const destId = ids("dest");
      nodes.push({
        id: destId,
        category: "lifecycle",
        atomKind: "item_destruction",
        label:
          `item_destruction\non last charge: roll d${d.die}\n` +
          `destroyed on ${d.destroyOn}`,
      });
      edges.push({ from: rootId, to: destId, relation: "lifecycle" });
      return;
    }
    case "permanent_on_empty": {
      const destId = ids("dest");
      nodes.push({
        id: destId,
        category: "lifecycle",
        atomKind: "item_destruction",
        label: "item_destruction\non pool empty (deterministic)",
      });
      edges.push({ from: rootId, to: destId, relation: "lifecycle" });
      return;
    }
    default: {
      const _: never = d;
      throw new Error(`unhandled item destruction policy: ${String(_)}`);
    }
  }
}
