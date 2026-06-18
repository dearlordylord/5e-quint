import {
  elapsedTimeTicksFromHours,
  formatElapsedTimeTicks,
  formatTimeSpanDuration,
  timeSpanDuration,
} from "@dnd/shared/elapsed-time";
import { Match } from "effect";
import * as Either from "effect/Either";

import type {
  AreaOccupantDispositionFilter,
  AreaOccupantPerceptionFilter,
  AreaExclusion,
  AreaOrigin,
  AreaShapeDescriptor,
  AreaShapeSpec,
  Attachment,
  AttachmentRangeOrigin,
  Ability,
  CastingTime,
  ClassLevelChoiceCount,
  ClassFeatureMechanics,
  DamageTypeRef,
  DcSource,
  DiceAmount,
  DiceDelta,
  DiceExpr,
  DiceExprDelta,
  DurationEndTrigger,
  EffectAtom,
  GrantedSpellDurationOverride,
  GrantedSpellTargetRestriction,
  HalfClassLevelRoundedDownHoursDurationValue,
  LinkedSpeed,
  MarkTransfer,
  ObjectFilter,
  ProficiencyGrant,
  ProficiencyGrantSubject,
  Range,
  ReactionTrigger,
  ResistanceSourceFilter,
  SavingThrowSourceFilter,
  Skill,
  SkillFilter,
  SlotScaling,
  SpellAccessMode,
  SpellMechanics,
  TargetCastingRequirement,
  TargetRelativePosition,
  TargetSelection,
  TimeSpanDurationValue,
  ThresholdTiers,
  TimedPermanentAfter,
  ToolProficiencyGrant,
  ToolProficiencyGrantSubject,
  WeaponFilter,
} from "../surface/types.ts";

export function procedureForFamily(
  f: SpellMechanics["family"],
): "activate" | "respond" | "store" {
  switch (f) {
    case "triggered_reaction":
      return "respond";
    case "anchored_trigger":
      return "store";
    case "ongoing_effect":
    case "activation":
    case "modal_activation":
    case "passive_hit_intercept":
    case "spawned_creature":
    case "reanimated_creature":
    case "templated_multi_spawn":
      return "activate";
    default: {
      const _: never = f;
      throw new Error(`unhandled spell family for procedure: ${String(_)}`);
    }
  }
}

export function procedurePrefix(k: "activate" | "respond" | "store"): string {
  switch (k) {
    case "activate":
      return "act";
    case "respond":
      return "rsp";
    case "store":
      return "sto";
    default: {
      const _: never = k;
      throw new Error(`unhandled procedure prefix: ${String(_)}`);
    }
  }
}

export function describeBonusActionTrigger(
  t: Extract<CastingTime, { kind: "bonus_action" }>["trigger"],
): string {
  if (t === undefined) return "";
  switch (t.kind) {
    case "after_hit_with":
      if (t.attack === "melee_weapon_or_unarmed_strike") {
        return "after hit with Melee weapon or Unarmed Strike";
      }
      if (t.attack === "weapon") return "after hit with weapon";
      return t.attack;
  }
}

export function describeReactionTrigger(t: ReactionTrigger): string {
  switch (t.kind) {
    case "hit_by_attack_roll":
      return `hit by attack roll${describeWeaponFilter(t.weaponFilter)}`;
    case "takes_damage_from_creature": {
      const visible = t.requiresVisibleCreature === true ? ", visible" : "";
      const range =
        t.rangeFeet === undefined ? "" : `, within ${t.rangeFeet} ft`;
      return `takes damage from creature${visible}${range}`;
    }
    case "self_or_visible_creature_falls":
      return `self or visible creature falls, within ${t.rangeFeet} ft`;
    case "targeted_by_named_spell":
      return `targeted by ${t.spellId}`;
    case "creature_casts_spell": {
      const levelTag =
        t.spellLevelAtMost === undefined
          ? ""
          : `, level <= ${t.spellLevelAtMost}`;
      const visibilityTag =
        t.requiresVisibleCaster === true ? ", visible caster" : "";
      return `creature casts spell (${t.components.join("/")}${levelTag}${visibilityTag})`;
    }
    case "spell_save_outcome": {
      const levelTag =
        t.spellLevelAtMost === undefined
          ? ""
          : `, level <= ${t.spellLevelAtMost}`;
      const schoolTag = t.spellSchool === undefined ? "" : `, ${t.spellSchool}`;
      const selfTag = t.spellTargetsOnlySelf === true ? ", self only" : "";
      const areaTag =
        t.spellHasNoAreaOfEffect === true ? ", no area of effect" : "";
      return `${t.outcome} on spell save${levelTag}${schoolTag}${selfTag}${areaTag}`;
    }
    case "any_of":
      return t.triggers.map(describeReactionTrigger).join(" OR ");
    default: {
      const _: never = t;
      throw new Error(`unhandled reaction trigger: ${String(_)}`);
    }
  }
}

export function describeTransferEvent(t: MarkTransfer): string {
  switch (t.onEvent.kind) {
    case "target_drops_to_0_hp":
      return "target drops to 0 HP";
    default: {
      const _: never = t.onEvent.kind;
      throw new Error(`unhandled transfer event: ${String(_)}`);
    }
  }
}

export function describeAttachmentHole(
  a: Extract<Attachment, { readonly kind: "hole" }>,
  range: Range,
): string {
  const labelPrefix = a.label !== undefined ? `hole\n${a.label}` : "hole";
  switch (a.value.kind) {
    case "self":
      return `${labelPrefix}\nself\nrange ${describeRange(range)}`;
    case "target":
      return `${labelPrefix}\ntarget\n${describeTargetSelection(a.value.selection)}\nrange ${describeAttachmentRange(range, a.value.rangeOrigin)}`;
    case "area": {
      const originLabel = describeAreaOrigin(
        a.value.origin,
        range,
        a.value.rangeOrigin,
      );
      const occupantLabel = describeAreaOccupantDispositionFilter(
        a.value.occupantDispositionFilter,
      );
      const perceptionLabel = describeAreaOccupantPerceptionFilter(
        a.value.occupantPerceptionFilter,
      );
      const exclusionLabel = describeAreaExclusions(a.value.excludedAreas);
      return `${labelPrefix}\narea\n${describeAreaShape(a.value.shape)}\n${originLabel}${occupantLabel}${perceptionLabel}${exclusionLabel}`;
    }
    case "mark": {
      const transferLabel = a.value.transfer
        ? `\ntransfer on ${describeTransferEvent(a.value.transfer)} (${a.value.transfer.cost.kind})`
        : "";
      return `${labelPrefix}\nmark\n${describeTargetSelection(a.value.selection)}\nrange ${describeAttachmentRange(range, a.value.rangeOrigin)}${transferLabel}`;
    }
    case "object": {
      const countLabel = a.value.count === 2 ? "2 objects" : "object";
      const filterLabel = describeObjectFilter(a.value.filter);
      return `${labelPrefix}\n${countLabel}${filterLabel}\nrange ${describeAttachmentRange(range, a.value.rangeOrigin)}`;
    }
    case "held_weapon":
      return `${labelPrefix}\n${describeHeldWeaponAttachment(a.value)}`;
    case "location":
      return `${labelPrefix}\nlocation\n${a.value.description}\nrange ${describeAttachmentRange(range, a.value.rangeOrigin)}`;
    case "caster_target_bond":
      return `${labelPrefix}\n${describeCasterTargetBondAttachment(a.value, range)}`;
    default: {
      const _: never = a.value;
      throw new Error(`unhandled attachment hole value: ${String(_)}`);
    }
  }
}

export function describeCasterTargetBondAttachment(
  attachment:
    | Extract<Attachment, { readonly kind: "caster_target_bond" }>
    | Extract<
        Extract<Attachment, { readonly kind: "hole" }>["value"],
        { readonly kind: "caster_target_bond" }
      >,
  range: Range,
): string {
  return [
    "caster_target_bond",
    `bond range: caster-target within ${attachment.range.feet} ft`,
    describeAttachmentHole(attachment.target, range),
  ].join("\n");
}

export function describeHeldWeaponAttachment(
  attachment:
    | Extract<Attachment, { readonly kind: "held_weapon" }>
    | Extract<
        Extract<Attachment, { readonly kind: "hole" }>["value"],
        { readonly kind: "held_weapon" }
      >,
): string {
  return `held_weapon\nheld by ${attachment.heldBy}\n${attachment.weaponIds.join(" or ")}`;
}

export function describeObjectFilter(f: ObjectFilter | undefined): string {
  if (f === undefined) return "";
  const parts: string[] = [];
  if (f.objectKind !== undefined) parts.push(f.objectKind);
  if (f.magicality !== undefined) parts.push(f.magicality);
  if (f.material !== undefined) parts.push(f.material);
  if (f.visibility === "caster_can_see") parts.push("caster_can_see");
  if (f.manufactured === true) parts.push("manufactured");
  if (f.maxWeightPounds !== undefined) {
    parts.push(`max_${f.maxWeightPounds}_lb`);
  }
  if (f.maxSize !== undefined) parts.push(`${f.maxSize}_or_smaller`);
  if (f.accessPreventionMeans !== undefined) {
    parts.push(`${f.accessPreventionMeans}_access_prevention`);
  }
  switch (f.targetRelation) {
    case "loose":
      parts.push("loose");
      break;
    case "not_worn_or_carried":
      parts.push("not_worn_or_carried");
      break;
    case undefined:
      break;
    default: {
      const _: never = f.targetRelation;
      throw new Error(`unhandled targetRelation: ${String(_)}`);
    }
  }
  return parts.length > 0 ? `\nfilter: ${parts.join(", ")}` : "";
}

export function describeDamageTypeRef(d: DamageTypeRef): string {
  if (typeof d === "string") return d;
  if (d.kind === "all_damage_types") return "all damage types";
  if (d.kind === "hole") {
    return `${describeDamageTypeRef(d.value)}${d.label !== undefined ? ` [hole: ${d.label}]` : " [hole]"}`;
  }
  if (d.kind === "same_choice_as") return `same choice as ${d.holeId}`;
  if (d.kind === "choice_table") {
    const options = d.options
      .map((option) => `${option.displayName}: ${option.damageType}`)
      .join(" | ");
    return `${d.label} [${d.holeId}] (${options})`;
  }
  if (d.kind === "same_table_choice_as") {
    const options = d.options
      .map((option) => `${option.displayName}: ${option.damageType}`)
      .join(" | ");
    return `same table choice as ${d.holeId} (${options})`;
  }
  if (d.kind === "choice")
    return `${d.label} (choose: ${d.options.join(" | ")})`;
  const _: never = d;
  throw new Error(`unhandled damage type ref: ${String(_)}`);
}

export function describeTargetSelection(s: TargetSelection): string {
  const targetKinds =
    "targetKinds" in s &&
    s.targetKinds !== undefined &&
    s.targetKinds.length > 0
      ? `\ntarget: ${s.targetKinds.join("/")}`
      : "";
  const typeFilter =
    "typeFilter" in s && s.typeFilter !== undefined && s.typeFilter.length > 0
      ? `\ntype: ${s.typeFilter.join("/")}`
      : "";
  const creatureSizeFilter =
    "creatureSizeFilter" in s
      ? `\ncreature size: ${s.creatureSizeFilter.kind} ${s.creatureSizeFilter.creatureSize}`
      : "";
  const objectFilter =
    "objectFilter" in s ? describeObjectFilter(s.objectFilter) : "";
  const stateFilter =
    "stateFilter" in s &&
    s.stateFilter !== undefined &&
    s.stateFilter.length > 0
      ? `\nstate: ${s.stateFilter.join("/")}`
      : "";
  const disposition =
    "disposition" in s ? `\ndisposition: ${s.disposition}` : "";
  const creatureDisposition =
    "creatureDisposition" in s && s.creatureDisposition !== undefined
      ? `\ncreature disposition: ${s.creatureDisposition}`
      : "";
  const castingRequirement =
    "castingRequirement" in s && s.castingRequirement !== undefined
      ? `\ncasting requirement: ${describeTargetCastingRequirement(s.castingRequirement)}`
      : "";
  const relativePosition =
    "relativePosition" in s && s.relativePosition !== undefined
      ? `\nrelative: ${describeTargetRelativePosition(s.relativePosition)}`
      : "";
  if (s.mode === "one") {
    return `one${targetKinds}${typeFilter}${creatureSizeFilter}${objectFilter}${stateFilter}${disposition}${creatureDisposition}${castingRequirement}${relativePosition}`;
  }
  if (s.mode === "any_number")
    return `any_number${targetKinds}${typeFilter}${creatureSizeFilter}${objectFilter}${stateFilter}${disposition}${creatureDisposition}${castingRequirement}${relativePosition}`;
  const repeats = s.repeatsAllowed === true ? " (repeats allowed)" : "";
  return `choose_up_to: ${describeScaling(s.count)}${repeats}${targetKinds}${typeFilter}${creatureSizeFilter}${objectFilter}${stateFilter}${disposition}${creatureDisposition}${castingRequirement}${relativePosition}`;
}

function describeTargetRelativePosition(r: TargetRelativePosition): string {
  return `within ${r.feet} ft of attachment ${r.attachmentHoleId}`;
}

function describeTargetCastingRequirement(
  requirement: TargetCastingRequirement | undefined,
): string {
  if (requirement === undefined) return "";
  return Match.value(requirement).pipe(
    Match.when(
      { kind: "remain_within_spell_range_for_entire_casting" },
      () => "remain within spell range for entire casting",
    ),
    Match.exhaustive,
  );
}

export function describeAreaOrigin(
  o: AreaOrigin,
  range: Range,
  rangeOrigin: AttachmentRangeOrigin | undefined,
): string {
  switch (o.kind) {
    case "point_within_range":
      return `origin: point within ${describeAttachmentRange(range, rangeOrigin)}`;
    case "on_primary_target":
      return "origin: primary target";
    case "on_attached_creature":
      return "origin: attached creature";
    case "self":
      return "origin: caster (self)";
    default: {
      const _: never = o;
      throw new Error(`unhandled area origin: ${String(_)}`);
    }
  }
}

export function describeAttachmentRange(
  range: Range,
  origin: AttachmentRangeOrigin | undefined,
): string {
  const base = describeRange(range);
  return (origin ?? "caster") === "caster" ? base : `${base} from spell sensor`;
}

export function describeAreaOccupantDispositionFilter(
  filter: AreaOccupantDispositionFilter | undefined,
): string {
  switch (filter) {
    case undefined:
      return "";
    case "friendly_to_source":
      return "\naffects: friendly creatures";
    case "hostile_to_source":
      return "\naffects: hostile creatures";
    default: {
      const _: never = filter;
      throw new Error(
        `unhandled area occupant disposition filter: ${String(_)}`,
      );
    }
  }
}

export function describeAreaOccupantPerceptionFilter(
  filter: AreaOccupantPerceptionFilter | undefined,
): string {
  switch (filter) {
    case undefined:
      return "";
    case "can_see_area_effect":
      return "\naffects: creatures that can see the area effect";
    default: {
      const _: never = filter;
      throw new Error(
        `unhandled area occupant perception filter: ${String(_)}`,
      );
    }
  }
}

export function describeAreaExclusions(
  excludedAreas: AreaExclusion | undefined,
): string {
  if (excludedAreas === undefined) return "";
  return Match.value(excludedAreas).pipe(
    Match.when(
      { chooser: "caster" },
      (areaExclusion) =>
        `\nexcludes: caster-chosen ${areaExclusion.count.replaceAll("_", " ")} areas, size ${areaExclusion.size}`,
    ),
    Match.exhaustive,
  );
}

export function describeAreaShape(s: AreaShapeSpec): string {
  switch (s.kind) {
    case "sphere":
      return `sphere r=${describeAreaDimension(s.radiusFeet)} ft`;
    case "circle":
      return `circle r=${describeAreaDimension(s.radiusFeet)} ft`;
    case "sphere_cluster":
      return `${s.count} spheres r=${describeAreaDimension(s.radiusFeet)} ft (${s.overlapResolution})`;
    case "cone":
      return `cone ${s.lengthFeet} ft`;
    case "cube":
      return `cube ${s.sideFeet} ft side`;
    case "cube_cluster": {
      const contig = s.contiguous === true ? ", contiguous" : "";
      return `up to ${s.maxCubes} cubes (${s.sideFeet} ft side${contig})`;
    }
    case "cylinder":
      return `cylinder r=${describeAreaDimension(s.radiusFeet)} ft h=${s.heightFeet} ft`;
    case "emanation":
      return `emanation r=${describeAreaDimension(s.radiusFeet)} ft`;
    case "line":
      return `line ${s.lengthFeet} ft × ${s.widthFeet} ft`;
    case "wall_volume":
      return `wall ${s.maxLengthFeet} ft × ${s.maxHeightFeet} ft × ${s.thicknessFeet} ft`;
    case "choice":
      return `choice of:\n  ${s.options
        .map(describeAreaShapeFixed)
        .join("\n  ")}`;
    default: {
      const _: never = s;
      throw new Error(`unhandled area shape: ${String(_)}`);
    }
  }
}

export function describeAreaShapeFixed(s: AreaShapeDescriptor): string {
  switch (s.kind) {
    case "sphere":
      return `sphere r=${describeAreaDimension(s.radiusFeet)} ft`;
    case "circle":
      return `circle r=${describeAreaDimension(s.radiusFeet)} ft`;
    case "sphere_cluster":
      return `${s.count} spheres r=${describeAreaDimension(s.radiusFeet)} ft (${s.overlapResolution})`;
    case "cone":
      return `cone ${s.lengthFeet} ft`;
    case "cube":
      return `cube ${s.sideFeet} ft side`;
    case "cube_cluster": {
      const contig = s.contiguous === true ? ", contiguous" : "";
      return `up to ${s.maxCubes} cubes (${s.sideFeet} ft side${contig})`;
    }
    case "cylinder":
      return `cylinder r=${describeAreaDimension(s.radiusFeet)} ft h=${s.heightFeet} ft`;
    case "emanation":
      return `emanation r=${describeAreaDimension(s.radiusFeet)} ft`;
    case "line":
      return `line ${s.lengthFeet} ft × ${s.widthFeet} ft`;
    case "wall_volume":
      return `wall ${s.maxLengthFeet} ft × ${s.maxHeightFeet} ft × ${s.thicknessFeet} ft`;
    default: {
      const _: never = s;
      throw new Error(`unhandled area shape: ${String(_)}`);
    }
  }
}

export type AreaDimension = Extract<
  AreaShapeDescriptor,
  { readonly radiusFeet: unknown }
>["radiusFeet"];

export function describeAreaDimension(value: AreaDimension): string {
  if (typeof value === "number") return String(value);

  return `${value.base} + ${value.perLevel}/level above L${value.startingAtLevel}`;
}

export function describeDelta_(d: DiceExprDelta, base: DiceExpr): string {
  const parts: string[] = [];
  if (d.dice !== undefined)
    parts.push(`${d.dice}d${d.dieSize ?? base.dieSize}`);
  if (d.dieSize !== undefined && d.dice === undefined)
    parts.push(`die size ${d.dieSize}`);
  if (d.flat !== undefined) parts.push(`${d.flat} flat`);
  return parts.join(" + ");
}

export function describeModifyAcSetBase(
  effect: Extract<EffectAtom, { readonly kind: "modify_ac_set_base" }>,
): string {
  switch (effect.formula.kind) {
    case "base_plus_dex":
      return `${effect.formula.base} + DEX mod`;
    case "base_plus_dex_con":
      return `${effect.formula.base} + DEX mod + CON mod`;
    case "base_plus_dex_wis":
      return `${effect.formula.base} + DEX mod + WIS mod`;
    case "base_plus_dex_cha":
      return `${effect.formula.base} + DEX mod + CHA mod`;
    default: {
      const _exhaustive: never = effect.formula;
      throw new Error(`unhandled AC base formula: ${String(_exhaustive)}`);
    }
  }
}

export type SurfaceChoiceCount =
  | ClassLevelChoiceCount
  | Extract<
      ClassFeatureMechanics,
      { readonly family: "feature_choice" }
    >["choiceCount"]
  | Extract<EffectAtom, { readonly kind: "grant_expertise" }>["choiceCount"];
type ExpertiseSkillSource = Extract<
  EffectAtom,
  { readonly kind: "grant_expertise" }
>["skills"];

export function describeClassLevelChoiceCount(
  choiceCount: SurfaceChoiceCount,
): string {
  switch (choiceCount.kind) {
    case "class_level_additional_choices":
      return (
        `choose ${choiceCount.initial} at acquisition; ` +
        choiceCount.increases
          .map((increase) => `L${increase.atLevel}: +${increase.choose}`)
          .join(", ")
      );
    case "class_level_total_choices":
      return `choose by class level: ${choiceCount.levels
        .map((level) => `L${level.atLevel}: ${level.total}`)
        .join(", ")}`;
    default: {
      const _exhaustive: never = choiceCount;
      return _exhaustive;
    }
  }
}

export function describeExpertiseSkillSource(
  skills: ExpertiseSkillSource,
): string {
  return Match.value(skills).pipe(
    Match.when(
      { kind: "owned_skill_proficiencies_without_expertise" },
      () => "owned skill proficiencies without Expertise",
    ),
    Match.when(
      { kind: "listed_owned_skill_proficiencies_without_expertise" },
      (listed) =>
        "listed owned skill proficiencies without Expertise: " +
        listed.skills.join(", "),
    ),
    Match.exhaustive,
  );
}

export function describeContainerStorage(
  storage: Extract<
    EffectAtom,
    { readonly kind: "container_storage" }
  >["storage"],
): string {
  const lines = [
    "container_storage",
    `capacity: ${storage.maxWeightPounds} lb / ${storage.maxVolumeCubicFeet} cu ft`,
  ];
  if (storage.weightOverridePounds !== undefined) {
    lines.push(`carry weight: ${storage.weightOverridePounds} lb`);
  }
  if (storage.airSupply !== undefined) {
    lines.push(`air: ${storage.airSupply.sharedMinutes} min shared`);
  }
  if (storage.extradimensional === true) {
    lines.push("extradimensional");
  }
  return lines.join("\n");
}

export function describeProficiencyGrant(grant: ProficiencyGrant): string {
  switch (grant.kind) {
    case "none":
      return "none";
    case "fixed":
      return grant.proficiencies
        .map(describeProficiencyGrantSubject)
        .join(", ");
    case "choice":
      return `choose ${grant.count}: ${grant.options
        .map(describeProficiencyGrantSubject)
        .join(", ")}`;
    case "mixed":
      return [
        grant.fixed.map(describeProficiencyGrantSubject).join(", "),
        `choose ${grant.choice.count}: ${grant.choice.options
          .map(describeProficiencyGrantSubject)
          .join(", ")}`,
      ].join("; ");
    case "mixed_choices":
      return [
        grant.fixed.map(describeProficiencyGrantSubject).join(", "),
        ...grant.choices.map(
          (choice) =>
            `choose ${choice.count} (${choice.choiceKey}): ${choice.options
              .map(describeProficiencyGrantSubject)
              .join(", ")}`,
        ),
      ].join("; ");
    default: {
      const _exhaustive: never = grant;
      return _exhaustive;
    }
  }
}

export function describeToolProficiencyGrant(
  grant: ToolProficiencyGrant,
): string {
  switch (grant.kind) {
    case "none":
      return "none";
    case "fixed":
      return grant.proficiencies
        .map(describeToolProficiencyGrantSubject)
        .join(", ");
    case "choice":
      return `choose ${grant.count}: ${grant.options
        .map(describeToolProficiencyGrantSubject)
        .join(", ")}`;
    default: {
      const _exhaustive: never = grant;
      return _exhaustive;
    }
  }
}

export function describeProficiencyGrantSubject(
  subject: ProficiencyGrantSubject,
): string {
  switch (subject.kind) {
    case "skill":
      return `${subject.skill} skill`;
    case "weapon_category":
      return `${subject.category} weapons`;
    case "armor_category":
      return `${subject.category} armor`;
    case "tool":
      return `${subject.toolId} tool`;
    case "tool_category":
      return `${subject.category} tools`;
    default: {
      const _exhaustive: never = subject;
      return _exhaustive;
    }
  }
}

export function describeToolProficiencyGrantSubject(
  subject: ToolProficiencyGrantSubject,
): string {
  switch (subject.kind) {
    case "tool":
      return `${subject.toolId} tool`;
    case "tool_category":
      return `${subject.category} tool`;
    default: {
      const _exhaustive: never = subject;
      return _exhaustive;
    }
  }
}

export function describeDc(d: DcSource): string {
  switch (d.kind) {
    case "caster_spell_save_dc":
      return "caster spell save DC";
    case "fixed":
      return `fixed DC ${d.dc}`;
    case "weapon_attack_dc":
      return `${d.base} + ability mod + PB (weapon attack)`;
    case "innate_dc":
      return `${d.base} + ${d.ability.toUpperCase()} mod + PB`;
    default: {
      const _: never = d;
      throw new Error(`unhandled dc source: ${String(_)}`);
    }
  }
}

// ============================================================
// Shared helpers
// ============================================================

export type IdGen = (prefix: string) => string;

export function idGen(): IdGen {
  let n = 0;
  return (prefix: string) => `${prefix}${++n}`;
}

export function describeScaling(
  s: number | SlotScaling<number> | ThresholdTiers<number>,
): string {
  if (typeof s === "number") return `${s} (fixed)`;
  if (s.kind === "threshold_tiers") {
    const tiers = s.tiers
      .map((tier) => `${tier.value} @ ${s.axis} ${tier.atLevel}`)
      .join(", ");
    return `${s.base} base; ${tiers}`;
  }
  return `${s.base} + ${s.perSlotAboveBase} per slot above ${s.baseLevel}`;
}

// §A14: grant_speed.feet may link to another speed stat instead of a
// fixed distance. Spider Climb: Climb Speed equal to walk Speed.
export function describeLinkedSpeed(l: LinkedSpeed): string {
  switch (l.kind) {
    case "walk_speed":
      return "= walk speed";
    default: {
      const _exhaustive: never = l.kind;
      throw new Error(`unhandled linked speed: ${String(_exhaustive)}`);
    }
  }
}

export function describeRange(r: Range): string {
  switch (r.kind) {
    case "self":
      return "Self";
    case "touch":
      return "Touch";
    case "unlimited":
      return "Unlimited";
    case "point":
      return `${r.feet} ft`;
    default: {
      const _exhaustive: never = r;
      throw new Error(`unhandled range: ${String(_exhaustive)}`);
    }
  }
}

export function describeDurationValue(
  d: TimeSpanDurationValue | HalfClassLevelRoundedDownHoursDurationValue,
): string {
  if ("kind" in d) {
    return "half class level rounded down hours";
  }
  const duration = timeSpanDuration(d);
  const base = Either.isRight(duration)
    ? formatTimeSpanDuration(duration.right)
    : `${d.amount} ${d.unit}${d.amount === 1 ? "" : "s"}`;
  if (d.upcastTiers === undefined || d.upcastTiers.length === 0) return base;
  const tiers = d.upcastTiers
    .map(
      (t) =>
        `${t.amount} ${d.unit}${t.amount === 1 ? "" : "s"} @ slot ≥ ${t.atSlot}`,
    )
    .join(", ");
  return `${base}\nupcast: ${tiers}`;
}

export function formatElapsedHours(hours: number): string {
  const ticks = elapsedTimeTicksFromHours(hours);
  return Either.isRight(ticks)
    ? formatElapsedTimeTicks(ticks.right)
    : `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function describeConditionChoice(
  c:
    | string
    | ReadonlyArray<string>
    | { readonly kind: "choose"; readonly from: ReadonlyArray<string> },
): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return `${c.join(", ")} (all)`;
  const choose = c as { kind: "choose"; from: ReadonlyArray<string> };
  return `${choose.from.join(" OR ")} (caster choice)`;
}

export function describeConditionList(
  conditions: ReadonlyArray<string>,
): string {
  return conditions.length === 1 ? conditions[0] : `[${conditions.join(", ")}]`;
}

export function describeOngoingPredicate(
  p: import("../surface/types.ts").OngoingPredicate,
): string {
  switch (p.kind) {
    case "attached_bond_within_range":
      return "attached bond within range";
    case "at_hp_threshold":
      switch (p.comparison) {
        case "lte":
          return `HP <= ${p.threshold}`;
        case "eq":
          return `HP = ${p.threshold}`;
        case "gte":
          return `HP >= ${p.threshold}`;
        default: {
          const _exhaustive: never = p.comparison;
          throw new Error(`unhandled HP comparison: ${String(_exhaustive)}`);
        }
      }
    case "has_condition":
      return `has condition: ${p.condition}`;
    case "spell_created_held_object_active":
      return "spell-created held object active";
    case "table_witnessed_attachment_within_spell_range":
      return "table-witnessed attachment within spell range";
    default: {
      const _exhaustive: never = p;
      throw new Error(`unhandled ongoing predicate: ${String(_exhaustive)}`);
    }
  }
}

export function describeEarlyEnd(
  triggers: ReadonlyArray<DurationEndTrigger> | undefined,
): string {
  if (triggers === undefined || triggers.length === 0) return "";
  const names = triggers.map(describeDurationEndTrigger).join(", ");
  return `\nor early on: ${names}`;
}

export function describeTimedPermanentAfter(
  permanentAfter: TimedPermanentAfter | undefined,
): string {
  if (permanentAfter === undefined) return "";
  return Match.value(permanentAfter).pipe(
    Match.when(
      { kind: "repeated_casts" },
      (repeatedCasts) =>
        `\npermanent after ${repeatedCasts.count} ${repeatedCasts.cadence} casts on ${repeatedCasts.target}; ends on: ${repeatedCasts.endsOn.join(", ")}`,
    ),
    Match.exhaustive,
  );
}

function describeDurationEndTrigger(trigger: DurationEndTrigger): string {
  switch (trigger.kind) {
    case "target_makes_attack_roll":
    case "target_deals_damage":
    case "target_casts_spell":
    case "target_dons_armor":
    case "target_damaged_by_caster_or_ally":
    case "target_takes_damage":
    case "caster_recasts_spell":
    case "area_dispersed_by_strong_wind":
    case "caster_lets_go_of_attached_weapon":
      return trigger.kind;
    case "caster_drops_to_0_hp":
      return "caster drops to 0 HP";
    case "attached_bond_exceeds_range":
      return "attached bond exceeds range";
    case "spell_cast_again_on_connected_creature":
      return "spell cast again on connected creature";
    default: {
      const _: never = trigger;
      throw new Error(`unhandled duration end trigger: ${String(_)}`);
    }
  }
}

export function describeSpellAccessMode(m: SpellAccessMode): string {
  if (typeof m === "string") {
    switch (m) {
      case "prepared_once_per_long_rest":
        return "prepared + 1/long rest free cast";
      case "known_once_per_long_rest":
        return "known + 1/long rest free cast";
      default:
        return m;
    }
  }
  switch (m.kind) {
    case "charge_cast": {
      const chargesAt = (k: number): number =>
        m.baseCharges + m.perLevelCharges * (k - m.minLevel);
      if (m.minLevel === m.maxLevel) {
        const n = chargesAt(m.minLevel);
        const label = n === 1 ? "1 charge" : `${n} charges`;
        return `charge_cast L${m.minLevel}, ${label} per cast`;
      }
      const lo = chargesAt(m.minLevel);
      const hi = chargesAt(m.maxLevel);
      return (
        `charge_cast L${m.minLevel}–L${m.maxLevel}, ` +
        `${lo}–${hi} charges (${m.baseCharges} + ${m.perLevelCharges}/level)`
      );
    }
    default: {
      const _exhaustive: never = m.kind;
      throw new Error(`unhandled spell access mode: ${String(_exhaustive)}`);
    }
  }
}

export function describeGrantedSpellTargetRestriction(
  restriction: GrantedSpellTargetRestriction | undefined,
): string {
  if (restriction === undefined) return "";
  switch (restriction.kind) {
    case "self_only":
      return "\ntarget: self only";
    case "visible_target_within_feet":
      return `\ntarget: visible target within ${restriction.feet} ft of ${restriction.origin === "caster" ? "caster" : "spell sensor"}`;
    default: {
      const _exhaustive: never = restriction;
      return _exhaustive;
    }
  }
}

export function describeGrantedSpellDurationOverride(
  durationOverride: GrantedSpellDurationOverride | undefined,
): string {
  if (durationOverride === undefined) return "";
  const lines: string[] = [];
  if (durationOverride.removeConcentration === true) {
    lines.push("duration override: no concentration");
  }
  if (durationOverride.endsWhenGrantedSpellEnds !== undefined) {
    lines.push(
      `duration override: ends when ${durationOverride.endsWhenGrantedSpellEnds} ends`,
    );
  }
  return lines.length === 0 ? "" : `\n${lines.join("\n")}`;
}

export function describeGrantedSpellDcOverride(
  dcOverride: DcSource | undefined,
): string {
  return dcOverride === undefined
    ? ""
    : `\nDC override: ${describeDc(dcOverride)}`;
}

export function describeGrantedSpellAreaOverride(
  areaOverride: AreaShapeSpec | undefined,
): string {
  return areaOverride === undefined
    ? ""
    : `\narea override: ${describeAreaShape(areaOverride)}`;
}

export function describeWeaponFilter(f: WeaponFilter | undefined): string {
  if (!f) return "";
  switch (f.kind) {
    case "source_item":
      return " [source item only]";
    case "weapon_category":
      return ` [${f.category} weapons only]`;
    case "weapon_property":
      return ` [${f.property} weapons only]`;
    case "specific_item":
      return ` [item only: ${f.itemId}]`;
    default: {
      const _exhaustive: never = f;
      return _exhaustive;
    }
  }
}

export function describeSkillFilter(f: SkillFilter | undefined): string {
  if (!f) return "";
  switch (f.kind) {
    case "fixed":
      return ` [${f.skills.join(", ")} only]`;
    case "choice":
      return ` [choice: ${f.options.join(", ")}]`;
    default: {
      const _exhaustive: never = f;
      return _exhaustive;
    }
  }
}

export function describeResistanceSourceFilter(
  f: ResistanceSourceFilter | undefined,
): string {
  if (!f) return "";
  const magicality = f.magicality === undefined ? "" : `, ${f.magicality} only`;
  const weapon = describeWeaponFilter(f.weaponFilter);
  return `\nfrom: attacks${weapon}${magicality}`;
}

export function describeSavingThrowSourceFilter(
  f: SavingThrowSourceFilter | undefined,
): string {
  if (!f) return "";
  return "\nsource: spells or other magical effects";
}

export function describeCriticalRangeAttackFilter(
  filter: "weapon_or_unarmed_strike",
): string {
  return filter === "weapon_or_unarmed_strike"
    ? "weapons and Unarmed Strikes"
    : (filter satisfies never);
}

export function describeDelta(d: DiceDelta): string {
  switch (d.kind) {
    case "fixed_number":
      return `${d.sign}${d.amount}`;
    case "fixed_dice":
      // dieSize=1 collapses to a flat bonus (N × 1 = N).
      if (d.dieSize === 1) return `${d.sign}${d.dice}`;
      return `${d.sign}${d.dice}d${d.dieSize}`;
    case "proficiency_bonus":
      return d.scale === "half" ? `${d.sign}½ PB` : `${d.sign}PB`;
    case "ability_modifier":
      return `${d.sign}${d.ability.toUpperCase()} mod${d.minimum === undefined ? "" : ` (min ${d.minimum})`}`;
    case "threshold_tiers":
      return `${d.sign}${d.base} (${d.axis} tiers ${d.tiers
        .map((t) => `L${t.atLevel}:${t.value}`)
        .join(", ")})`;
    case "magic_item_rarity_bonus":
      return `${d.sign}bonus by item rarity (${Object.entries(d.byRarity)
        .map(([rarity, bonus]) => `${rarity}=${bonus}`)
        .join(", ")})`;
    default: {
      const _exhaustive: never = d;
      return _exhaustive;
    }
  }
}

export function describeSignedNumber(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

export function capitalizeWords(value: string): string {
  return value.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function describeAbilityCheck(
  ability: Ability | "caster_spellcasting_ability",
  skill: Skill | undefined,
): string {
  const abilityLabel =
    ability === "caster_spellcasting_ability"
      ? "SPELLCASTING"
      : ability.toUpperCase();
  return skill === undefined ? abilityLabel : `${abilityLabel} (${skill})`;
}

export function describeAbilityScoreBounds(
  minimum: number | undefined,
  maximum: number | undefined,
): string {
  return describeNumericBounds(minimum, maximum);
}

export function describeNumericBounds(
  minimum: number | undefined,
  maximum: number | undefined,
): string {
  const parts: string[] = [];
  if (minimum !== undefined) parts.push(`min ${minimum}`);
  if (maximum !== undefined) parts.push(`max ${maximum}`);
  return parts.length === 0 ? "" : `\n${parts.join(", ")}`;
}

export function describeDiceAmount(a: DiceAmount): string {
  switch (a.kind) {
    case "fixed":
      return describeExpr(a.expr);
    case "threshold_tiers":
      return `${describeExpr(a.base)} (tiered by ${a.axis} level)`;
    case "linear_per_level":
      return `${describeExpr(a.base)} (linear per ${a.axis} level)`;
    case "threshold_tiers_exploding_max_die":
      return (
        `${a.baseDice}d${a.dieSize} (tiered by ${a.axis} level; ` +
        `d${a.dieSize} explodes up to spellcasting ability modifier extra dice)`
      );
    case "resource_spent":
      return "= charges spent (player choice)";
    case "proficiency_bonus":
      return "= proficiency bonus";
    case "resource_spent_linear": {
      const maxText =
        a.maximum === undefined ? "" : `, max ${describeExpr(a.maximum)}`;
      return (
        `${describeExpr(a.base)} + ` +
        `${describeDelta_(a.perResource, a.base)} per resource spent${maxText}`
      );
    }
    case "linked": {
      const scale = a.link.scale === "half" ? "half " : "";
      const source =
        a.link.kind === "damage_taken" ? "damage taken" : "damage dealt";
      return `= ${scale}${source}`;
    }
    default: {
      const _exhaustive: never = a;
      throw new Error(`unhandled dice amount: ${String(_exhaustive)}`);
    }
  }
}

export function describeExpr(e: DiceExpr): string {
  const hasDice = e.dice > 0;
  const flat =
    e.flat !== undefined && e.flat !== 0
      ? hasDice
        ? `+${e.flat}`
        : `${e.flat}`
      : "";
  const modLabel =
    e.spellcastingMod === true
      ? "spellcasting mod"
      : e.abilityModifier !== undefined
        ? `${e.abilityModifier.toUpperCase()} mod`
        : "";
  const mod =
    modLabel === "" ? "" : hasDice || flat ? `+${modLabel}` : modLabel;
  const diceStr = hasDice ? `${e.dice}d${e.dieSize}` : "";
  return `${diceStr}${flat}${mod}` || "0";
}

export function describeRandomTableRoll(roll: {
  die: number;
  modifier?: number;
}): string {
  const modifier =
    roll.modifier === undefined || roll.modifier === 0
      ? ""
      : roll.modifier > 0
        ? `+${roll.modifier}`
        : `${roll.modifier}`;
  return `d${roll.die}${modifier}`;
}

export function describeRandomTableOutcomeRange(outcome: {
  min: number;
  max: number;
}): string {
  return outcome.min === outcome.max
    ? `${outcome.min}`
    : `${outcome.min}-${outcome.max}`;
}
