import { describe, expect, test } from "vitest";

import huntersMarkInput from "../../content/hunters_mark.json";
import wardingBondInput from "../../content/warding_bond.json";
import { decodeUnitRecordSync } from "../surface/schema.ts";
import {
  capitalizeWords,
  describeAbilityCheck,
  describeAreaDimension,
  describeAreaOccupantDispositionFilter,
  describeAreaOccupantPerceptionFilter,
  describeAreaShape,
  describeAreaShapeFixed,
  describeAttachmentHole,
  describeClassLevelChoiceCount,
  describeConditionChoice,
  describeConditionList,
  describeContainerStorage,
  describeDc,
  describeDelta,
  describeDelta_,
  describeDiceAmount,
  describeDurationValue,
  describeExpr,
  describeGrantedSpellDurationOverride,
  describeGrantedSpellTargetRestriction,
  describeModifyAcSetBase,
  describeNumericBounds,
  describeObjectFilter,
  describeOngoingPredicate,
  describeProficiencyGrant,
  describeProficiencyGrantSubject,
  describeRandomTableOutcomeRange,
  describeRandomTableRoll,
  describeReactionTrigger,
  describeResistanceSourceFilter,
  describeScaling,
  describeSignedNumber,
  describeSkillFilter,
  describeSpellAccessMode,
  describeToolProficiencyGrant,
  describeToolProficiencyGrantSubject,
  describeWeaponFilter,
  idGen,
} from "./tracer-rule-labels.ts";

function decodeSyntheticOngoingAttachment(value: unknown) {
  const unit = decodeUnitRecordSync({
    ...huntersMarkInput,
    id: "synthetic_rule_label_attachment",
    name: "Synthetic Rule Label Attachment",
    provenance: {
      kind: "synthetic-test",
      section: "Synthetic Tests/Rule Label Attachment",
    },
    mechanics: {
      ...huntersMarkInput.mechanics,
      attachment: {
        kind: "hole",
        holeId: "synthetic_rule_label_attachment_hole",
        value,
      },
    },
  });
  if (
    unit.kind !== "spell" ||
    unit.mechanics.family !== "ongoing_effect" ||
    unit.mechanics.attachment.kind !== "hole"
  ) {
    throw new Error("decoded synthetic ongoing attachment changed shape");
  }
  return unit.mechanics.attachment;
}

describe("Surface trace rule labels", () => {
  test("describes optional reaction constraints", () => {
    expect(
      describeReactionTrigger({
        kind: "creature_casts_spell",
        components: ["V", "S"],
        spellLevelAtMost: 4,
        requiresVisibleCaster: true,
      }),
    ).toBe("creature casts spell (V/S, level <= 4, visible caster)");
    expect(
      describeReactionTrigger({
        kind: "spell_save_outcome",
        outcome: "failure",
        spellLevelAtMost: 3,
        spellSchool: "illusion",
        spellTargetsOnlySelf: true,
        spellHasNoAreaOfEffect: true,
      }),
    ).toBe(
      "failure on spell save, level <= 3, illusion, self only, no area of effect",
    );
    expect(
      describeReactionTrigger({
        kind: "spell_save_outcome",
        outcome: "success",
      }),
    ).toBe("success on spell save");
  });

  test("describes object filters and area variants", () => {
    expect(
      describeObjectFilter({
        objectKind: "weapon",
        magicality: "nonmagical",
        material: "metal",
        visibility: "caster_can_see",
        manufactured: true,
        maxWeightPounds: 20,
        maxSize: "medium",
        accessPreventionMeans: "mundane_or_magical",
        targetRelation: "loose",
      }),
    ).toContain(
      "weapon, nonmagical, metal, caster_can_see, manufactured, max_20_lb",
    );
    expect(
      describeObjectFilter({ targetRelation: "not_worn_or_carried" }),
    ).toBe("\nfilter: not_worn_or_carried");
    expect(describeAreaOccupantDispositionFilter("hostile_to_source")).toBe(
      "\naffects: hostile creatures",
    );
    expect(describeAreaOccupantPerceptionFilter("can_see_area_effect")).toBe(
      "\naffects: creatures that can see the area effect",
    );
    expect(
      describeAreaShape({
        kind: "cube_cluster",
        maxCubes: 3,
        sideFeet: 5,
        contiguous: true,
      }),
    ).toBe("up to 3 cubes (5 ft side, contiguous)");
    expect(
      describeAreaShape({
        kind: "choice",
        options: [
          { kind: "circle", radiusFeet: 10 },
          {
            kind: "sphere_cluster",
            count: 2,
            radiusFeet: 5,
            overlapResolution: "affect_once",
          },
          { kind: "emanation", radiusFeet: 15 },
        ],
      }),
    ).toContain("circle r=10 ft");
    expect(
      describeAreaShapeFixed({
        kind: "cube_cluster",
        maxCubes: 2,
        sideFeet: 10,
      }),
    ).toBe("up to 2 cubes (10 ft side)");
  });

  test("describes decoded attachment-hole variants", () => {
    const range = { kind: "self" } as const;
    expect(
      describeAttachmentHole(
        decodeSyntheticOngoingAttachment({ kind: "self" }),
        range,
      ),
    ).toBe("hole\nself\nrange Self");
    expect(
      describeAttachmentHole(
        decodeSyntheticOngoingAttachment({
          kind: "mark",
          selection: { mode: "one" },
        }),
        range,
      ),
    ).not.toContain("transfer on");
    expect(
      describeAttachmentHole(
        decodeSyntheticOngoingAttachment({
          kind: "held_weapon",
          heldBy: "caster",
          count: 1,
          weaponIds: ["synthetic_rule_label_weapon"],
        }),
        range,
      ),
    ).toContain("held_weapon");
    expect(
      describeAttachmentHole(
        decodeSyntheticOngoingAttachment(wardingBondInput.mechanics.attachment),
        range,
      ),
    ).toContain("caster_target_bond");
  });

  test("describes scaling, duration, and random-table values", () => {
    expect(
      describeScaling({
        kind: "threshold_tiers",
        axis: "character",
        base: 1,
        tiers: [{ atLevel: 5, value: 2 }],
      }),
    ).toBe("1 base; 2 @ character 5");
    expect(
      describeScaling({
        kind: "linear",
        base: 2,
        baseLevel: 1,
        perSlotAboveBase: 1,
      }),
    ).toBe("2 + 1 per slot above 1");
    expect(
      describeAreaDimension({
        kind: "linear_per_level",
        axis: "slot",
        base: 5,
        perLevel: 5,
        startingAtLevel: 2,
      }),
    ).toBe("5 + 5/level above L2");
    expect(
      describeDurationValue({
        amount: 1,
        unit: "minute",
        upcastTiers: [{ atSlot: 3, amount: 2 }],
      }),
    ).toContain("2 minutes @ slot ≥ 3");
    expect(describeRandomTableRoll({ die: 20, modifier: 2 })).toBe("d20+2");
    expect(describeRandomTableRoll({ die: 6, modifier: -1 })).toBe("d6-1");
    expect(describeRandomTableOutcomeRange({ min: 4, max: 4 })).toBe("4");
  });

  test("describes armor, choice-count, and proficiency shapes", () => {
    expect(
      describeModifyAcSetBase({
        kind: "modify_ac_set_base",
        formula: { kind: "base_plus_dex_con", base: 10 },
      }),
    ).toBe("10 + DEX mod + CON mod");
    expect(
      describeModifyAcSetBase({
        kind: "modify_ac_set_base",
        formula: { kind: "base_plus_dex_cha", base: 10 },
      }),
    ).toBe("10 + DEX mod + CHA mod");
    expect(
      describeClassLevelChoiceCount({
        kind: "class_level_additional_choices",
        initial: 2,
        increases: [{ atLevel: 5, choose: 1 }],
      }),
    ).toBe("choose 2 at acquisition; L5: +1");
    expect(
      describeProficiencyGrant({
        kind: "mixed",
        fixed: [{ kind: "skill", skill: "arcana" }],
        choice: {
          choiceKey: "synthetic_armor_training",
          count: 1,
          options: [{ kind: "armor_category", category: "light" }],
        },
      }),
    ).toBe("arcana skill; choose 1: light armor");
    expect(
      describeProficiencyGrant({
        kind: "mixed_choices",
        fixed: [{ kind: "weapon_category", category: "simple" }],
        choices: [
          {
            choiceKey: "synthetic_training",
            count: 1,
            options: [{ kind: "tool_category", category: "artisan_tool" }],
          },
        ],
      }),
    ).toBe("simple weapons; choose 1 (synthetic_training): artisan_tool tools");
    expect(describeProficiencyGrant({ kind: "none" })).toBe("none");
    expect(
      describeToolProficiencyGrant({
        kind: "choice",
        count: 1,
        options: [{ kind: "tool_category", category: "artisan_tool" }],
      }),
    ).toBe("choose 1: artisan_tool tool");
    expect(
      describeProficiencyGrantSubject({
        kind: "tool_category",
        category: "gaming_set",
      }),
    ).toBe("gaming_set tools");
    expect(
      describeToolProficiencyGrantSubject({
        kind: "tool_category",
        category: "musical_instrument",
      }),
    ).toBe("musical_instrument tool");
  });

  test("describes spell grants and source filters", () => {
    expect(describeSpellAccessMode("prepared_once_per_long_rest")).toBe(
      "prepared + 1/long rest free cast",
    );
    expect(describeSpellAccessMode("known_once_per_long_rest")).toBe(
      "known + 1/long rest free cast",
    );
    expect(
      describeSpellAccessMode({
        kind: "charge_cast",
        minLevel: 2,
        maxLevel: 2,
        baseCharges: 1,
        perLevelCharges: 0,
      }),
    ).toBe("charge_cast L2, 1 charge per cast");
    expect(
      describeGrantedSpellTargetRestriction({
        kind: "visible_target_within_feet",
        feet: 30,
        origin: "spell_sensor",
      }),
    ).toBe("\ntarget: visible target within 30 ft of spell sensor");
    expect(
      describeGrantedSpellDurationOverride({
        removeConcentration: true,
        endsWhenGrantedSpellEnds: "source_spell",
      }),
    ).toBe(
      "\nduration override: no concentration\nduration override: ends when source_spell ends",
    );
    expect(
      describeWeaponFilter({ kind: "weapon_property", property: "heavy" }),
    ).toBe(" [heavy weapons only]");
    expect(
      describeSkillFilter({
        kind: "choice",
        options: ["arcana", "history"],
      }),
    ).toBe(" [choice: arcana, history]");
    expect(
      describeResistanceSourceFilter({
        kind: "attack",
        magicality: "nonmagical",
        weaponFilter: { kind: "weapon_category", category: "melee" },
      }),
    ).toBe("\nfrom: attacks [melee weapons only], nonmagical only");
  });

  test("describes dice and numeric variants", () => {
    expect(
      describeDelta_({ dieSize: 8, flat: 2 }, { dice: 1, dieSize: 6 }),
    ).toBe("die size 8 + 2 flat");
    expect(
      describeDelta({
        kind: "magic_item_rarity_bonus",
        sign: "+",
        byRarity: {
          common: 1,
          uncommon: 1,
          rare: 2,
          very_rare: 3,
          legendary: 4,
          artifact: 5,
        },
      }),
    ).toBe(
      "+bonus by item rarity (common=1, uncommon=1, rare=2, very_rare=3, legendary=4, artifact=5)",
    );
    expect(
      describeDiceAmount({
        kind: "threshold_tiers_exploding_max_die",
        axis: "character",
        baseDice: 1,
        dieSize: 8,
        tiers: [{ atLevel: 5, dice: 2 }],
        maxAdditionalDice: "spellcasting_ability_modifier",
      }),
    ).toContain("explodes up to spellcasting ability modifier");
    expect(
      describeDiceAmount({
        kind: "linked",
        link: { kind: "damage_taken", scale: "half" },
      }),
    ).toBe("= half damage taken");
    expect(describeExpr({ dice: 0, dieSize: 6, flat: 3 })).toBe("3");
    expect(describeExpr({ dice: 0, dieSize: 6, abilityModifier: "wis" })).toBe(
      "WIS mod",
    );
    expect(describeSignedNumber(2)).toBe("+2");
    expect(describeSignedNumber(-2)).toBe("-2");
    expect(describeNumericBounds(1, 20)).toBe("\nmin 1, max 20");
    expect(describeAbilityCheck("caster_spellcasting_ability", "arcana")).toBe(
      "SPELLCASTING (arcana)",
    );
  });

  test("describes predicates and simple display helpers", () => {
    expect(
      describeOngoingPredicate({
        kind: "at_hp_threshold",
        comparison: "lte",
        threshold: 5,
      }),
    ).toBe("HP <= 5");
    expect(
      describeOngoingPredicate({
        kind: "at_hp_threshold",
        comparison: "gte",
        threshold: 10,
      }),
    ).toBe("HP >= 10");
    expect(describeConditionChoice(["blinded", "deafened"])).toBe(
      "blinded, deafened (all)",
    );
    expect(
      describeConditionChoice({
        kind: "choose",
        from: ["charmed", "frightened"],
      }),
    ).toBe("charmed OR frightened (caster choice)");
    expect(describeConditionList(["prone"])).toBe("prone");
    expect(capitalizeWords("synthetic rule label")).toBe(
      "Synthetic Rule Label",
    );
    const nextId = idGen();
    expect([nextId("node"), nextId("node")]).toEqual(["node1", "node2"]);
  });

  test("describes full container storage facts", () => {
    expect(
      describeContainerStorage({
        maxWeightPounds: 500,
        maxVolumeCubicFeet: 64,
        weightOverridePounds: 15,
        airSupply: { sharedMinutes: 10 },
        extradimensional: true,
      }),
    ).toBe(
      "container_storage\ncapacity: 500 lb / 64 cu ft\ncarry weight: 15 lb\nair: 10 min shared\nextradimensional",
    );
    expect(describeDc({ kind: "innate_dc", base: 8, ability: "cha" })).toBe(
      "8 + CHA mod + PB",
    );
  });
});
