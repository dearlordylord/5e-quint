import type { AreaDirectEffectAtom } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeAreaShape,
  describeContainerStorage,
  describeDamageTypeRef,
  describeDc,
  describeDiceAmount,
  describeDurationValue,
  describeObjectFilter,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { TraceEffectAtomFn } from "./tracer-effect-types.ts";

export type AttachmentAndAreaEffectAtom = Extract<
  AreaDirectEffectAtom,
  {
    readonly kind:
      | "teleport"
      | "transport_exile"
      | "make_weapon_attack"
      | "override_attached_weapon_attack"
      | "container_storage"
      | "create_sensor"
      | "remote_perception"
      | "set_speed"
      | "set_speed_ratio"
      | "emit_light"
      | "emit_dim_light"
      | "block_reanimation"
      | "ignite_objects"
      | "create_object"
      | "create_illusion"
      | "force_drop_item"
      | "move_object"
      | "pull_object_away"
      | "manipulate_object"
      | "break_concentration"
      | "damage_structure"
      | "collapse_structure"
      | "bury_in_rubble"
      | "bond_objects"
      | "lock_object"
      | "release_object_access"
      | "suppress_arcane_lock"
      | "reposition_attachment"
      | "area_is_difficult_terrain"
      | "area_emits_dim_light"
      | "area_is_lightly_obscured"
      | "area_is_heavily_obscured"
      | "area_anchor_or_layering_requirement"
      | "area_section_burns_away"
      | "area_has_strong_wind"
      | "prevent_ranged_weapon_attacks"
      | "area_movement_cost_multiplier"
      | "grant_cover"
      | "block_line_of_sight"
      | "prevent_creature_passage"
      | "prevent_spellcasting_and_magic_actions"
      | "prevent_magical_ranged_attacks"
      | "block_magical_targeting_and_aoe"
      | "block_teleport_and_planar_travel"
      | "suppress_magic_items"
      | "suppress_ongoing_magic_effects"
      | "ordered_barrier_layers"
      | "allow_reaction_stand_up"
      | "revert_shape_shift_to_true_form"
      | "suppress_shape_shifting_while_in_area";
  }
>;

export function traceAttachmentAndAreaEffectAtom(
  e: AttachmentAndAreaEffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  edges: TraceEdge[] | undefined,
  traceEffectAtom: TraceEffectAtomFn,
): string | null {
  switch (e.kind) {
    case "teleport": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "teleport",
        label: `teleport\nup to ${e.maxFeet} ft\ndest: ${e.destination}`,
      });
      return id;
    }
    case "transport_exile": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "transport_exile",
        label: `transport_exile\ndest: ${e.destination}`,
      });
      return id;
    }
    case "make_weapon_attack": {
      const id = ids("eff");
      const ability =
        e.abilityOverride === undefined
          ? ""
          : `\nability: ${e.abilityOverride}`;
      const damageChoice =
        e.damageTypeChoice === undefined
          ? ""
          : `\ndamage choice: ${e.damageTypeChoice.join(" or ")}`;
      const bonus =
        e.bonusDamage === undefined
          ? ""
          : `\nbonus: ${describeDiceAmount(e.bonusDamage.amount)} ${describeDamageTypeRef(e.bonusDamage.damageType)}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "make_weapon_attack",
        label: `make_weapon_attack\nweapon: ${e.weapon}${ability}${damageChoice}${bonus}`,
      });
      return id;
    }
    case "override_attached_weapon_attack": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "override_attached_weapon_attack",
        label:
          `override_attached_weapon_attack\n` +
          `attack: ${e.attackRollAbility} for ${e.replacesAbility}\n` +
          `damage: ${e.damageRollAbility} for ${e.replacesAbility}\n` +
          `${describeDiceAmount(e.damageDie)}\n` +
          `damage choice: ${e.damageTypeChoice.join(" or ")}\n` +
          e.attackScope,
      });
      return id;
    }
    case "container_storage": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "container_storage",
        label: describeContainerStorage(e.storage),
      });
      return id;
    }
    case "create_sensor": {
      const id = ids("eff");
      const senses =
        e.sensorSenses === undefined
          ? ""
          : `\nsenses: ${e.sensorSenses.map((s) => `${s.kind} ${s.rangeFeet} ft`).join(", ")}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "create_sensor",
        label: `create_sensor\n${e.visibility}, ${e.durability}${senses}`,
      });
      return id;
    }
    case "remote_perception": {
      const id = ids("eff");
      const switchTag =
        e.switchCost === "bonus_action" ? "\nswitch: Bonus Action" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "remote_perception",
        label: `remote_perception\n${e.senses.join(" or ")}${switchTag}`,
      });
      return id;
    }
    case "set_speed": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "set_speed",
        label: `set_speed\n= ${e.feet} ft`,
      });
      return id;
    }
    case "set_speed_ratio": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "set_speed_ratio",
        label: `set_speed_ratio\n× ${e.numerator}/${e.denominator}`,
      });
      return id;
    }
    case "emit_light": {
      const id = ids("eff");
      const dimTag =
        e.dimAdditionalFeet !== undefined && e.dimAdditionalFeet > 0
          ? `\ndim: +${e.dimAdditionalFeet} ft`
          : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "emit_light",
        label: `emit_light\nbright: ${e.brightRadiusFeet} ft${dimTag}`,
      });
      return id;
    }
    case "emit_dim_light": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "emit_dim_light",
        label: `emit_dim_light\nradius: ${e.radiusFeet} ft`,
      });
      return id;
    }
    case "block_reanimation": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_reanimation",
        label: "block_reanimation",
      });
      return id;
    }
    case "ignite_objects": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "ignite_objects",
        label: `ignite_objects${describeObjectFilter(e.filter)}`,
      });
      return id;
    }
    case "create_object": {
      const id = ids("eff");
      const shapeTag = e.shape ? `\n${describeAreaShape(e.shape)}` : "";
      const consumableTag = e.consumable === true ? "\nconsumable" : "";
      const durabilityTag = e.durability
        ? `\nAC ${e.durability.acValue}, HP ${e.durability.hpPerSection}/section`
        : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "create_object",
        label: `create_object\nmax ${e.maxSize}${shapeTag}${consumableTag}${durabilityTag}`,
      });
      return id;
    }
    case "create_illusion": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "create_illusion",
        label: `create_illusion\nmax ${e.maxSize}\nchannels: ${e.channels.join(", ")}`,
      });
      return id;
    }
    case "force_drop_item": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "force_drop_item",
        label: "force_drop_item",
      });
      return id;
    }
    case "move_object": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "move_object",
        label: `move_object\nup to ${e.maxDistanceFeet} ft`,
      });
      return id;
    }
    case "pull_object_away": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "pull_object_away",
        label: `pull_object_away\nup to ${e.maxDistanceFeet} ft`,
      });
      return id;
    }
    case "manipulate_object": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "manipulate_object",
        label: "manipulate_object",
      });
      return id;
    }
    case "break_concentration": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "break_concentration",
        label: "break_concentration",
      });
      return id;
    }
    case "damage_structure": {
      const id = ids("dmg");
      nodes.push({
        id,
        category: "effect",
        atomKind: "damage_structure",
        label: `damage_structure\n${describeDiceAmount(e.amount)} ${describeDamageTypeRef(e.damageType)}\ncontact: ${e.structureContact}`,
      });
      return id;
    }
    case "collapse_structure": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "collapse_structure",
        label: `collapse_structure\ntrigger: ${e.trigger}`,
      });
      return id;
    }
    case "bury_in_rubble": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "bury_in_rubble",
        label: `bury_in_rubble\nescape: ${e.escape.action} ${e.escape.ability.toUpperCase()} (${e.escape.skill}) DC ${e.escape.dc}`,
      });
      return id;
    }
    case "bond_objects": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "bond_objects",
        label: "bond_objects",
      });
      return id;
    }
    case "lock_object": {
      const id = ids("eff");
      const pwTag = e.password !== undefined ? `\npassword set` : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "lock_object",
        label: `lock_object${pwTag}`,
      });
      return id;
    }
    case "release_object_access": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "release_object_access",
        label: `release_object_access\nmundane locks: ${e.mundaneLockLimit}`,
      });
      return id;
    }
    case "suppress_arcane_lock": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_arcane_lock",
        label: `suppress_arcane_lock\n${describeDurationValue(e.duration)}\nopen/close allowed`,
      });
      return id;
    }
    case "reposition_attachment": {
      const id = ids("eff");
      const capTag =
        e.maxMoveFeet !== undefined ? `\nmax ${e.maxMoveFeet} ft` : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "reposition_attachment",
        label: `reposition_attachment${capTag}`,
      });
      return id;
    }
    case "area_is_difficult_terrain": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_is_difficult_terrain",
        label: "area_is_difficult_terrain",
      });
      return id;
    }
    case "area_emits_dim_light": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_emits_dim_light",
        label: "area_emits_dim_light",
      });
      return id;
    }
    case "area_is_lightly_obscured": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_is_lightly_obscured",
        label: "area_is_lightly_obscured",
      });
      return id;
    }
    case "area_is_heavily_obscured": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_is_heavily_obscured",
        label: "area_is_heavily_obscured",
      });
      return id;
    }
    case "area_anchor_or_layering_requirement": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_anchor_or_layering_requirement",
        label: [
          "area_anchor_or_layering_requirement",
          `anchor: ${e.anchor.count} solid masses`,
          `layering: ${e.layering.surfaces.join(", ")}`,
          `flat depth: ${e.layering.flatSurfaceDepthFeet} ft`,
          `unmet: ${e.unmetOutcome.kind} at ${e.unmetOutcome.timing}`,
        ].join("\n"),
      });
      return id;
    }
    case "area_section_burns_away": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_section_burns_away",
        label: [
          "area_section_burns_away",
          `${describeAreaShape(e.section)} exposed to ${e.exposure}`,
          `after: ${describeDurationValue(e.burnsAwayAfter)}`,
          `start-turn fire: ${describeDiceAmount(
            e.creatureStartsTurnInFireDamage.amount,
          )} ${e.creatureStartsTurnInFireDamage.damageType}`,
        ].join("\n"),
      });
      return id;
    }
    case "area_has_strong_wind": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_has_strong_wind",
        label: "area_has_strong_wind",
      });
      return id;
    }
    case "prevent_ranged_weapon_attacks": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_ranged_weapon_attacks",
        label: "prevent_ranged_weapon_attacks",
      });
      return id;
    }
    case "area_movement_cost_multiplier": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_movement_cost_multiplier",
        label: `area_movement_cost_multiplier\nx${e.multiplier}\n${e.appliesTo}`,
      });
      return id;
    }
    case "grant_cover": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_cover",
        label: `grant_cover\n${e.cover}`,
      });
      return id;
    }
    case "block_line_of_sight": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_line_of_sight",
        label: "block_line_of_sight",
      });
      return id;
    }
    case "prevent_creature_passage": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_creature_passage",
        label: `prevent_creature_passage\nexcept: ${e.exceptCreatureTypes.join(", ")}\nallows: ${e.allowsThroughBarrier.join(", ")}`,
      });
      return id;
    }
    case "prevent_spellcasting_and_magic_actions": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_spellcasting_and_magic_actions",
        label: "prevent_spellcasting_and_magic_actions",
      });
      return id;
    }
    case "prevent_magical_ranged_attacks": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_magical_ranged_attacks",
        label: "prevent_magical_ranged_attacks",
      });
      return id;
    }
    case "block_magical_targeting_and_aoe": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_magical_targeting_and_aoe",
        label: "block_magical_targeting_and_aoe",
      });
      return id;
    }
    case "block_teleport_and_planar_travel": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_teleport_and_planar_travel",
        label: "block_teleport_and_planar_travel",
      });
      return id;
    }
    case "suppress_magic_items": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_magic_items",
        label: "suppress_magic_items",
      });
      return id;
    }
    case "suppress_ongoing_magic_effects": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_ongoing_magic_effects",
        label: `suppress_ongoing_magic_effects\nexcept: ${e.exceptSources.join(", ")}\ntime counts: ${e.suppressedTimeCountsAgainstDuration}`,
      });
      return id;
    }
    case "ordered_barrier_layers": {
      const id = ids("layers");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "ordered_barrier_layers",
        label: `ordered_barrier_layers\n${e.layers.length} layers`,
      });
      if (edges !== undefined) {
        for (const layer of e.layers) {
          const layerId = ids("layer");
          nodes.push({
            id: layerId,
            category: "resolution",
            atomKind: "barrier_layer",
            label: `layer ${layer.order}: ${layer.label}\ndestroyed by: ${layer.destroyedBy}`,
          });
          edges.push({ from: id, to: layerId, relation: "orders" });
          if (layer.save !== undefined) {
            const saveId = ids("sg");
            nodes.push({
              id: saveId,
              category: "resolution",
              atomKind: "save_gate",
              label: `save_gate\n${layer.save.ability.toUpperCase()} vs ${describeDc(layer.save.dc)}`,
            });
            edges.push({ from: layerId, to: saveId, relation: "requires" });
            const failId = traceEffectAtom(
              layer.save.onFail,
              nodes,
              ids,
              edges,
            );
            if (failId !== null) {
              edges.push({
                from: saveId,
                to: failId,
                relation: "branches_on_save",
              });
            }
            if (layer.save.onSuccess.kind === "half_damage") {
              const halfId = ids("eff");
              nodes.push({
                id: halfId,
                category: "effect",
                atomKind: "half_damage",
                label: "half_damage\n(½ of onFail damage)",
              });
              edges.push({
                from: saveId,
                to: halfId,
                relation: "branches_on_save",
              });
            } else {
              const successId = traceEffectAtom(
                layer.save.onSuccess,
                nodes,
                ids,
                edges,
              );
              if (successId !== null) {
                edges.push({
                  from: saveId,
                  to: successId,
                  relation: "branches_on_save",
                });
              }
            }
          }
          if (layer.passiveEffects !== undefined) {
            for (const passive of layer.passiveEffects) {
              const passiveId = traceEffectAtom(passive, nodes, ids, edges);
              if (passiveId !== null) {
                edges.push({
                  from: layerId,
                  to: passiveId,
                  relation: "grants",
                });
              }
            }
          }
        }
      }
      return id;
    }
    case "allow_reaction_stand_up": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "allow_reaction_stand_up",
        label: "allow_reaction_stand_up",
      });
      return id;
    }
    case "revert_shape_shift_to_true_form": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "revert_shape_shift_to_true_form",
        label: "revert_shape_shift_to_true_form",
      });
      return id;
    }
    case "suppress_shape_shifting_while_in_area": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_shape_shifting_while_in_area",
        label: "suppress_shape_shifting_while_in_area",
      });
      return id;
    }
    default: {
      const _exhaustive: never = e;
      throw new Error(
        `unhandled attachment or area effect atom: ${String(_exhaustive)}`,
      );
    }
  }
}
