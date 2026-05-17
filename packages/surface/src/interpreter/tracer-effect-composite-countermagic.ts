import type { AreaDirectEffectAtom } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import { describeDc, describeLinkedSpeed } from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { TraceEffectAtomFn } from "./tracer-effect-types.ts";

export type CompositeAndCountermagicEffectAtom = Extract<
  AreaDirectEffectAtom,
  {
    readonly kind:
      | "composite"
      | "choose_effect_mode"
      | "grant_speed"
      | "ignore_web_restrictions"
      | "alter_item_kind"
      | "natural_weapons"
      | "water_breathing"
      | "detect"
      | "negate_triggering_spell"
      | "reflect_triggering_spell"
      | "waste_triggering_spell_or_effect"
      | "end_ongoing_spells"
      | "maximize_healing_received"
      | "transform_target";
  }
>;

export function traceCompositeAndCountermagicEffectAtom(
  e: CompositeAndCountermagicEffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  edges: TraceEdge[] | undefined,
  traceEffectAtom: TraceEffectAtomFn,
): string | null {
  function traceDetachedOngoingChoiceEffect(
    eff: import("../surface/types.ts").OngoingEffect,
    nodes: TraceNode[],
    ids: IdGen,
    edges: TraceEdge[],
  ): string | null {
    switch (eff.kind) {
      case "save_gate": {
        const sgId = ids("sg");
        nodes.push({
          id: sgId,
          category: "resolution",
          atomKind: "save_gate",
          label: `save_gate\n${eff.ability.toUpperCase()} vs ${describeDc(eff.dc)}`,
        });
        const failId = traceEffectAtom(eff.onFail, nodes, ids, edges);
        if (failId !== null) {
          edges.push({ from: sgId, to: failId, relation: "branches_on_save" });
        }
        if (
          eff.onSuccess.kind !== "none" &&
          eff.onSuccess.kind !== "half_damage"
        ) {
          const sucId = traceEffectAtom(eff.onSuccess, nodes, ids, edges);
          if (sucId !== null) {
            edges.push({ from: sgId, to: sucId, relation: "branches_on_save" });
          }
        }
        return sgId;
      }
      case "ability_check_gate": {
        const acgId = ids("acg");
        nodes.push({
          id: acgId,
          category: "resolution",
          atomKind: "ability_check_gate",
          label: `ability_check_gate\n${eff.ability.toUpperCase()} vs ${describeDc(eff.dc)}`,
        });
        const passId = traceEffectAtom(eff.onPass, nodes, ids, edges);
        if (passId !== null) {
          edges.push({ from: acgId, to: passId, relation: "branches_on_pass" });
        }
        if (eff.onFail !== undefined) {
          const failId = traceEffectAtom(eff.onFail, nodes, ids, edges);
          if (failId !== null) {
            edges.push({
              from: acgId,
              to: failId,
              relation: "branches_on_fail",
            });
          }
        }
        return acgId;
      }
      case "attack_roll": {
        const arId = ids("ar");
        nodes.push({
          id: arId,
          category: "resolution",
          atomKind: "attack_roll",
          label: `attack_roll\n${eff.attackKind}`,
        });
        for (const hit of eff.onHit) {
          const hitId = traceEffectAtom(hit, nodes, ids, edges);
          if (hitId !== null) {
            edges.push({ from: arId, to: hitId, relation: "branches_on_hit" });
          }
        }
        for (const miss of eff.onMiss) {
          const missId = traceEffectAtom(miss, nodes, ids, edges);
          if (missId !== null) {
            edges.push({
              from: arId,
              to: missId,
              relation: "branches_on_miss",
            });
          }
        }
        return arId;
      }
      case "composite_ongoing": {
        const id = ids("op");
        nodes.push({
          id,
          category: "effect",
          atomKind: "composite_ongoing",
          label: `composite_ongoing\n(${eff.effects.length} effects)`,
        });
        for (const child of eff.effects) {
          const childId = traceDetachedOngoingChoiceEffect(
            child,
            nodes,
            ids,
            edges,
          );
          if (childId !== null) {
            edges.push({ from: id, to: childId, relation: "grants" });
          }
        }
        return id;
      }
      case "modify_ac_set_floor": {
        const id = ids("op");
        nodes.push({
          id,
          category: "effect",
          atomKind: "modify_ac",
          label: `modify_ac\nfloor: max(AC, ${eff.const})`,
        });
        return id;
      }
      default:
        return traceEffectAtom(eff, nodes, ids, edges);
    }
  }

  switch (e.kind) {
    case "composite": {
      // Emit a container node; children are traced as siblings all
      // rooted at the container. Container acts as the returned id.
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "composite",
        label: `composite\n(${e.effects.length} effects)`,
      });
      if (edges !== undefined) {
        for (const child of e.effects) {
          const childId = traceEffectAtom(child, nodes, ids, edges);
          if (childId !== null) {
            edges.push({ from: id, to: childId, relation: "grants" });
          }
        }
      }
      return id;
    }
    case "choose_effect_mode": {
      const id = ids("choice");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "choose_effect_mode",
        label: `choose_effect_mode\n${e.label}`,
      });
      if (edges !== undefined) {
        for (const option of e.options) {
          const optionId = ids("opt");
          nodes.push({
            id: optionId,
            category: "resolution",
            atomKind: "effect_mode_option",
            label: `mode: ${option.displayName}`,
          });
          edges.push({ from: id, to: optionId, relation: "offers" });
          for (const effect of option.effects) {
            const effectId = traceDetachedOngoingChoiceEffect(
              effect,
              nodes,
              ids,
              edges,
            );
            if (effectId !== null) {
              edges.push({ from: optionId, to: effectId, relation: "grants" });
            }
          }
        }
      }
      return id;
    }
    case "grant_speed": {
      const id = ids("eff");
      const suffix = e.hover === true ? " (hover)" : "";
      const feet =
        typeof e.feet === "number"
          ? `${e.feet} ft`
          : describeLinkedSpeed(e.feet);
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_speed",
        label: `grant_speed\n${e.speedKind} ${feet}${suffix}`,
      });
      return id;
    }
    case "ignore_web_restrictions": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "ignore_web_restrictions",
        label: "ignore_web_restrictions",
      });
      return id;
    }
    case "alter_item_kind": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "alter_item_kind",
        label: `alter_item_kind\n${e.newKind}`,
      });
      return id;
    }
    case "natural_weapons": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "natural_weapons",
        label: `natural_weapons\n1d${e.damageDie} ${e.damageType}\nuses spellcasting ability`,
      });
      return id;
    }
    case "water_breathing": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "water_breathing",
        label: "water_breathing",
      });
      return id;
    }
    case "detect": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "detect",
        label: `detect\nproperty: ${e.property}\nradius ${e.radiusFeet} ft`,
      });
      return id;
    }
    case "negate_triggering_spell": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "negate_triggering_spell",
        label:
          e.maxSpellLevel === undefined
            ? "negate_triggering_spell"
            : `negate_triggering_spell\nmax level: ${e.maxSpellLevel}`,
      });
      return id;
    }
    case "reflect_triggering_spell": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "reflect_triggering_spell",
        label: "reflect_triggering_spell",
      });
      return id;
    }
    case "waste_triggering_spell_or_effect": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "waste_triggering_spell_or_effect",
        label: "waste_triggering_spell_or_effect",
      });
      return id;
    }
    case "end_ongoing_spells": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "end_ongoing_spells",
        label: `end_ongoing_spells\nmax level: ${e.maxSpellLevel}`,
      });
      return id;
    }
    case "maximize_healing_received": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "maximize_healing_received",
        label: "maximize_healing_received",
      });
      return id;
    }
    case "transform_target": {
      const id = ids("eff");
      const cr =
        e.newForm.crBound.kind === "fixed"
          ? `CR ${e.newForm.crBound.cr}`
          : e.newForm.crBound.kind === "target_cr_or_level"
            ? "CR ≤ target CR/level"
            : "CR ≤ caster level";
      const rev = e.revertTriggers.map((t) => t.kind).join(" | ");
      const extras = [
        `retain: ${e.retainedFields.join(", ")}`,
        `revert: ${rev}`,
        e.tempHpFromForm === true ? "temp HP = new form HP" : null,
        e.actionRestriction !== undefined ? e.actionRestriction : null,
      ]
        .filter((s): s is string => s !== null)
        .join("\n");
      nodes.push({
        id,
        category: "effect",
        atomKind: "transform_target",
        label: `transform_target\n${e.newForm.creatureType} (${cr})\n${extras}`,
      });
      return id;
    }
    default: {
      const _exhaustive: never = e;
      throw new Error(
        `unhandled composite or countermagic effect atom: ${String(_exhaustive)}`,
      );
    }
  }
}
