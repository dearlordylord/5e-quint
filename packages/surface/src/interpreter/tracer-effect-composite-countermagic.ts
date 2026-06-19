import type {
  AreaDirectEffectAtom,
  OngoingOperation,
  OngoingTrigger,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import { Match } from "effect";
import {
  describeAbilityCheck,
  describeClassLevelChoiceCount,
  describeDc,
  describeDamageTypeRef,
  describeLinkedSpeed,
  describeRandomTableOutcomeRange,
  describeRandomTableRoll,
  describeScaling,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { TraceEffectAtomFn } from "./tracer-effect-types.ts";

export type CompositeAndCountermagicEffectAtom = Extract<
  AreaDirectEffectAtom,
  {
    readonly kind:
      | "composite"
      | "choose_effect_mode"
      | "curse_occurrence"
      | "grant_speed"
      | "ignore_web_restrictions"
      | "alter_item_kind"
      | "natural_weapons"
      | "water_breathing"
      | "detect"
      | "magical_identity_mask"
      | "locate_kind"
      | "object_location_sense"
      | "block_divination_targeting_and_scrying_perception"
      | "divination_omen"
      | "assign_courier_task"
      | "negate_triggering_spell"
      | "reflect_triggering_spell"
      | "waste_triggering_spell_or_effect"
      | "end_ongoing_spells"
      | "maximize_healing_received"
      | "transform_target";
  }
>;

type TransformTargetEffect = Extract<
  CompositeAndCountermagicEffectAtom,
  { readonly kind: "transform_target" }
>;
type ShapeShiftFormSource = TransformTargetEffect["newForm"];
type ShapeShiftRevertTrigger = TransformTargetEffect["revertTriggers"][number];

function describeOngoingTrigger(trigger: OngoingTrigger): string {
  if (trigger.kind === "on_caster_deals_damage_to_attachment") {
    return `${trigger.kind}: ${trigger.damageSource.join(" or ")}`;
  }
  return trigger.kind;
}

function describeShapeShiftCrBound(
  crBound: Extract<
    ShapeShiftFormSource,
    { readonly kind: "catalog_ref" }
  >["crBound"],
): string {
  return Match.value(crBound).pipe(
    Match.when({ kind: "fixed" }, (fixed) => `CR ${fixed.cr}`),
    Match.when({ kind: "target_cr_or_level" }, () => "CR <= target CR/level"),
    Match.when({ kind: "caster_level" }, () => "CR <= caster level"),
    Match.exhaustive,
  );
}

function describeShapeShiftFlySpeed(
  flySpeed: Extract<
    ShapeShiftFormSource,
    { readonly kind: "known_forms_roster" }
  >["flySpeed"],
): string {
  return Match.value(flySpeed).pipe(
    Match.when({ kind: "forbidden" }, () => "fly speed forbidden"),
    Match.when(
      { kind: "allowed_at_class_level" },
      (allowed) => `fly speed allowed at class level ${allowed.atLevel}`,
    ),
    Match.exhaustive,
  );
}

function describeShapeShiftKnownFormChange(
  change: Extract<
    ShapeShiftFormSource,
    { readonly kind: "known_forms_roster" }
  >["knownFormChange"],
): string {
  return Match.value(change).pipe(
    Match.when(
      { kind: "long_rest" },
      (longRest) =>
        `known form change: replace ${longRest.replacementCount} on long_rest`,
    ),
    Match.exhaustive,
  );
}

function describeShapeShiftFormSource(newForm: ShapeShiftFormSource): string {
  return Match.value(newForm).pipe(
    Match.when(
      { kind: "catalog_ref" },
      (catalog) =>
        `${catalog.creatureType} (${describeShapeShiftCrBound(catalog.crBound)})`,
    ),
    Match.when({ kind: "known_forms_roster" }, (roster) =>
      [
        `${roster.creatureType} known forms roster`,
        `known forms: ${describeClassLevelChoiceCount(roster.knownForms)}`,
        describeShapeShiftKnownFormChange(roster.knownFormChange),
        `max CR: ${describeScaling(roster.maxChallengeRating)}`,
        describeShapeShiftFlySpeed(roster.flySpeed),
      ].join("\n"),
    ),
    Match.exhaustive,
  );
}

function describeShapeShiftRevertTrigger(
  trigger: ShapeShiftRevertTrigger,
): string {
  return Match.value(trigger).pipe(
    Match.when({ kind: "zero_hp" }, () => "zero_hp"),
    Match.when({ kind: "spell_ends" }, () => "spell_ends"),
    Match.when({ kind: "temp_hp_depleted" }, () => "temp_hp_depleted"),
    Match.when({ kind: "dismissed_by_caster" }, () => "dismissed_by_caster"),
    Match.when({ kind: "duration_expires" }, () => "duration_expires"),
    Match.when({ kind: "source_used_again" }, () => "source_used_again"),
    Match.when(
      { kind: "condition_active" },
      (conditionActive) => `condition_active:${conditionActive.condition}`,
    ),
    Match.when({ kind: "death" }, () => "death"),
    Match.when(
      { kind: "dismissed_by_target" },
      (dismissed) => `dismissed_by_target:${dismissed.action}`,
    ),
    Match.exhaustive,
  );
}

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
          label: `ability_check_gate\n${describeAbilityCheck(eff.ability, eff.skill)} vs ${describeDc(eff.dc)}`,
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
      case "random_table": {
        const id = ids("op");
        nodes.push({
          id,
          category: "resolution",
          atomKind: "random_table",
          label: `random_table\nroll: ${describeRandomTableRoll(eff.roll)}`,
        });
        for (const outcome of eff.outcomes) {
          const branchId = ids("tbl");
          nodes.push({
            id: branchId,
            category: "resolution",
            atomKind: "table_result",
            label:
              `table_result\n${describeRandomTableOutcomeRange(outcome)}` +
              `\n${outcome.label}`,
          });
          edges.push({
            from: id,
            to: branchId,
            relation: "branches_on_roll",
          });

          for (const effect of outcome.effects ?? []) {
            const childId = traceDetachedOngoingChoiceEffect(
              effect,
              nodes,
              ids,
              edges,
            );
            if (childId !== null) {
              edges.push({ from: branchId, to: childId, relation: "grants" });
            }
          }
        }
        return id;
      }
      default:
        return traceEffectAtom(eff, nodes, ids, edges);
    }
  }

  function traceCurseOperation(
    operation: OngoingOperation,
    optionId: string,
    nodes: TraceNode[],
    ids: IdGen,
    edges: TraceEdge[],
  ): void {
    const operationId = ids("curse-op");
    nodes.push({
      id: operationId,
      category: "window",
      atomKind: "curse_option_operation",
      label: `curse_option_operation\n${describeOngoingTrigger(operation.trigger)}`,
    });
    edges.push({ from: optionId, to: operationId, relation: "opens_window" });

    const effectId = traceDetachedOngoingChoiceEffect(
      operation.effect,
      nodes,
      ids,
      edges,
    );
    if (effectId !== null) {
      edges.push({ from: operationId, to: effectId, relation: "grants" });
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
    case "curse_occurrence": {
      const id = ids("curse");
      nodes.push({
        id,
        category: "effect",
        atomKind: "curse_occurrence",
        label: [
          "curse_occurrence",
          `${e.removal.kind}`,
          `target: ${e.removal.target}`,
        ].join("\n"),
      });
      if (edges !== undefined) {
        for (const option of e.options) {
          const optionId = ids("curse-opt");
          nodes.push({
            id: optionId,
            category: "resolution",
            atomKind: "curse_option",
            label: `curse_option\n${option.displayName}`,
          });
          edges.push({ from: id, to: optionId, relation: "offers" });
          for (const operation of option.operations) {
            traceCurseOperation(operation, optionId, nodes, ids, edges);
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
        label:
          `natural_weapons\n1d${e.damageDie} ${describeDamageTypeRef(e.damageType)}` +
          `\n${e.attackRollAbility} for attack rolls` +
          `\n${e.damageRollAbility} for damage rolls` +
          `\nreplaces ${e.replacesAbility.toUpperCase()}`,
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
    case "magical_identity_mask": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "magical_identity_mask",
        label: [
          "magical_identity_mask",
          `creature: ${e.creatureBranch.chosenCreatureType}`,
          `treated by: ${e.creatureBranch.treatedAsBy}`,
          `object aura: ${e.objectBranch.auraAppearance}`,
          `observed by: ${e.objectBranch.observedBy}`,
        ].join("\n"),
      });
      return id;
    }
    case "locate_kind": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "locate_kind",
        label:
          `locate_kind\nsubjects: ${e.subjectKinds.join(", ")}\n` +
          `${e.match} within ${e.maxDistanceFeet} ft\n${e.result}`,
      });
      return id;
    }
    case "object_location_sense": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "object_location_sense",
        label: [
          "object_location_sense",
          `specific known object seen within ${e.searchModes.specificKnownObject.seenUpCloseWithinFeet} ft`,
          `nearest ${e.searchModes.nearestObjectKind} within ${e.maxDistanceFeet} ft`,
          e.result,
          `blocked_by: ${e.blockedBy}`,
        ].join("\n"),
      });
      return id;
    }
    case "block_divination_targeting_and_scrying_perception": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_divination_targeting_and_scrying_perception",
        label: [
          "block_divination_targeting_and_scrying_perception",
          "targeting: Divination spells",
          "perception: magical scrying sensors",
        ].join("\n"),
      });
      return id;
    }
    case "divination_omen": {
      const id = ids("eff");
      const table = e.adjudication.table;
      nodes.push({
        id,
        category: "effect",
        atomKind: "divination_omen",
        label: [
          "divination_omen",
          `source: ${e.source}`,
          `subject: ${e.subject.kind} within ${e.subject.plannedWithinMinutes} minutes`,
          `adjudication: ${e.adjudication.kind}`,
          `omens: ${table.good}=good, ${table.bad}=bad, ${table.goodAndBad}=good_and_bad, ${table.neitherGoodNorBad}=neither_good_nor_bad`,
          `changed circumstances: ${e.changedCircumstances}`,
          `repeat casting: ${e.repeatCasting.noAnswerChance.percent}% ${e.repeatCasting.noAnswerChance.kind} until ${e.repeatCasting.resetBy}`,
          `repeat result: ${e.repeatCasting.noAnswerChance.result}`,
        ].join("\n"),
      });
      return id;
    }
    case "assign_courier_task": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "assign_courier_task",
        label: [
          "assign_courier_task",
          `messenger: ${e.messenger}`,
          `destination: ${e.destination}`,
          `recipient: ${e.recipient}`,
          `message: ${e.message.maxWords} words; ${e.message.delivery}`,
          `travel: ${e.travel.groundMilesPer24Hours}/${e.travel.flyingMilesPer24Hours} miles per 24h`,
          `on arrival: ${e.onArrival}`,
          `on expiry: ${e.onExpiryBeforeArrival}`,
        ].join("\n"),
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
      const form = describeShapeShiftFormSource(e.newForm);
      const rev = e.revertTriggers
        .map(describeShapeShiftRevertTrigger)
        .join(" | ");
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
        label: `transform_target\n${form}\n${extras}`,
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
