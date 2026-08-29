import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";

import animalMessengerInput from "../../content/animal_messenger.json";
import arcanistsMagicAuraInput from "../../content/arcanists_magic_aura.json";
import auguryInput from "../../content/augury.json";
import barkskinInput from "../../content/barkskin.json";
import blinkInput from "../../content/blink.json";
import chillTouchInput from "../../content/chill_touch.json";
import classFighterInput from "../../content/class_fighter.json";
import conjureAnimalsInput from "../../content/conjure_animals.json";
import dispelMagicInput from "../../content/dispel_magic.json";
import dragonsBreathInput from "../../content/dragons_breath.json";
import enlargeReduceInput from "../../content/enlarge_reduce.json";
import flameBladeInput from "../../content/flame_blade.json";
import fighterWeaponMasteryInput from "../../content/fighter_weapon_mastery.json";
import hasteInput from "../../content/haste.json";
import heatMetalInput from "../../content/heat_metal.json";
import huntersMarkInput from "../../content/hunters_mark.json";
import locateAnimalsOrPlantsInput from "../../content/locate_animals_or_plants.json";
import locateObjectInput from "../../content/locate_object.json";
import bagOfHoldingInput from "../../content/magic_item_bag_of_holding.json";
import chimeOfOpeningInput from "../../content/magic_item_chime_of_opening.json";
import cloakOfProtectionInput from "../../content/magic_item_cloak_of_protection.json";
import magicWeaponInput from "../../content/magic_weapon.json";
import magicMouthInput from "../../content/magic_mouth.json";
import moonbeamInput from "../../content/moonbeam.json";
import paladinWeaponMasteryInput from "../../content/paladin_weapon_mastery.json";
import phantasmalForceInput from "../../content/phantasmal_force.json";
import prayerOfHealingInput from "../../content/prayer_of_healing.json";
import ropeTrickInput from "../../content/rope_trick.json";
import silenceInput from "../../content/silence.json";
import searingSmiteInput from "../../content/searing_smite.json";
import spiritualWeaponInput from "../../content/spiritual_weapon.json";
import goblinWarriorInput from "../../content/stat_block_goblin_warrior.json";
import webInput from "../../content/web.json";
import zoneOfTruthInput from "../../content/zone_of_truth.json";
import wardingBondInput from "../../content/warding_bond.json";
import {
  decodeStatBlockRecordSync,
  decodeUnitRecordSync,
} from "../surface/schema.ts";
import { srdSurface } from "../surface/surface-catalog.ts";
import type { AreaDirectEffectAtom } from "../surface/types.ts";
import {
  renderStatBlockTraceDocument,
  renderTraceDocument,
} from "./mermaid.ts";
import { traceEffectAtom } from "./tracer-effect-atom.ts";
import { describeMagicItemAttunement } from "./tracer-feature-sources.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import { idGen } from "./tracer-rule-labels.ts";
import { traceStatBlock, traceUnit } from "./tracer.ts";

describe("Surface trace interpreter", () => {
  test("traces optional effect-label facts in both domain states", () => {
    const effects = [
      { kind: "scale_attack_count", additional: 1 },
      { kind: "scale_attack_count", additional: 2 },
      { kind: "cap_attack_action_attacks", maxAttacks: 1 },
      { kind: "cap_attack_action_attacks", maxAttacks: 2 },
      { kind: "force_fall", direction: "downward" },
      {
        kind: "force_fall",
        direction: "upward",
        maxDistanceFeet: 20,
        impactAsNormalFall: true,
      },
      { kind: "fall_when_effect_ends", direction: "downward" },
      {
        kind: "fall_when_effect_ends",
        direction: "downward",
        unlessCanStopFall: true,
      },
      {
        kind: "move_area",
        direction: "away_from_caster",
        distanceFeet: 10,
      },
      {
        kind: "move_area",
        direction: "away_from_caster",
        distanceFeet: 10,
        includeCreaturesInArea: true,
      },
      { kind: "block_flying_movement", maxSize: "small" },
      {
        kind: "block_flying_movement",
        maxSize: "small",
        includesObjects: true,
      },
      { kind: "prevent_drop_to_0_hp", replacementHp: 1 },
      {
        kind: "prevent_drop_to_0_hp",
        replacementHp: 1,
        consumesEffect: true,
      },
      { kind: "negate_instant_death" },
      { kind: "negate_instant_death", consumesEffect: true },
      {
        kind: "offer_ability_substitution_for_ability_checks",
        use: "str",
        skillFilter: { kind: "fixed", skills: ["athletics"] },
      },
      {
        kind: "offer_ability_substitution_for_ability_checks",
        use: "str",
        skillFilter: { kind: "fixed", skills: ["athletics"] },
        requiredActiveFeature: {
          kind: "class_feature",
          unitId: unitId("synthetic_active_feature"),
        },
      },
      { kind: "make_weapon_attack", weapon: "material_component" },
      {
        kind: "make_weapon_attack",
        weapon: "material_component",
        abilityOverride: "spellcasting",
        damageTypeChoice: ["radiant"],
        bonusDamage: {
          damageType: "radiant",
          amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
        },
      },
      { kind: "lock_object" },
      { kind: "lock_object", password: "synthetic password" },
      { kind: "force_drop_item" },
      {
        kind: "delayed_save",
        ability: "wis",
        dc: { kind: "innate_dc", base: 8, ability: "wis" },
        cadence: "start_of_caster_next_turn",
        onSuccess: { kind: "none" },
        onFailure: { kind: "none" },
      },
      {
        kind: "delayed_save",
        condition: "charmed",
        ability: "wis",
        dc: { kind: "innate_dc", base: 8, ability: "wis" },
        cadence: "start_of_caster_next_turn",
        onSuccess: { kind: "none" },
        onFailure: { kind: "none" },
      },
      {
        kind: "reduce_damage_taken",
        amount: { kind: "fixed", expr: { dice: 0, dieSize: 1, flat: 1 } },
      },
      {
        kind: "reduce_damage_taken",
        amount: { kind: "fixed", expr: { dice: 0, dieSize: 1, flat: 1 } },
        damageType: "fire",
      },
    ] as const satisfies ReadonlyArray<AreaDirectEffectAtom>;
    const nodes: TraceNode[] = [];
    const edges: TraceEdge[] = [];
    const ids = idGen();

    for (const effect of effects) {
      expect(traceEffectAtom(effect, nodes, ids, edges)).not.toBeNull();
    }

    expect(nodes).toHaveLength(effects.length);
  });

  test("traces every shipped SRD Unit and Stat Block", () => {
    for (const unit of srdSurface.units) {
      const trace = traceUnit(unit);
      expect(trace.unitId).toBe(unit.id);
      expect(trace.nodes.length).toBeGreaterThan(0);
      expect(renderTraceDocument(trace, unit)).toContain(
        `Unit id: \`${unit.id}\``,
      );
    }

    for (const statBlock of srdSurface.statBlocks) {
      const trace = traceStatBlock(statBlock);
      expect(trace.unitId).toBe(statBlock.id);
      expect(trace.nodes.length).toBeGreaterThan(0);
      expect(renderStatBlockTraceDocument(trace, statBlock)).toContain(
        `Stat Block id: \`${statBlock.id}\``,
      );
    }
  });

  test("traces every canonical content record with a Unit or Stat Block kind", () => {
    const contentDirectory = new URL("../../content/", import.meta.url);
    let tracedRecords = 0;

    for (const fileName of readdirSync(contentDirectory)) {
      if (!fileName.endsWith(".json")) continue;
      const raw: unknown = JSON.parse(
        readFileSync(new URL(fileName, contentDirectory), "utf8"),
      );
      if (typeof raw !== "object" || raw === null || !("kind" in raw)) {
        continue;
      }

      if (raw.kind === "statBlock") {
        const statBlock = decodeStatBlockRecordSync(raw);
        const trace = traceStatBlock(statBlock);
        expect(trace.unitId, fileName).toBe(statBlock.id);
        expect(trace.nodes.length, fileName).toBeGreaterThan(0);
        tracedRecords += 1;
        continue;
      }

      const unit = decodeUnitRecordSync(raw);
      const trace = traceUnit(unit);
      expect(trace.unitId, fileName).toBe(unit.id);
      expect(trace.nodes.length, fileName).toBeGreaterThan(0);
      tracedRecords += 1;
    }

    expect(tracedRecords).toBeGreaterThan(
      srdSurface.units.length + srdSurface.statBlocks.length,
    );
  });

  test("traces synthetic magic-item variants for valid mechanics absent from canonical content", () => {
    const unit = decodeUnitRecordSync({
      id: "synthetic_magic_item_collection",
      kind: "magic_item",
      name: "Synthetic Magic Item Collection",
      provenance: {
        kind: "synthetic-test",
        section: "Synthetic Tests/Magic Item Collection",
      },
      defaultAttunement: { requiresAttunement: false },
      variants: [
        {
          id: "synthetic_magic_item_variant",
          name: "Synthetic Attuned Variant",
          rarity: "uncommon",
          mechanics: bagOfHoldingInput.mechanics,
          destruction: { kind: "none" },
          attunementOverride: { requiresAttunement: true },
        },
        {
          id: "synthetic_reaction_magic_item_variant",
          name: "Synthetic Reaction Variant",
          rarity: "uncommon",
          mechanics: {
            ...chimeOfOpeningInput.mechanics,
            family: "triggered_reaction",
            activationCost: { kind: "reaction" },
            range: { kind: "self" },
            interruptsTrigger: true,
          },
          destruction: { kind: "none" },
        },
        {
          id: "synthetic_passive_operation_magic_item_variant",
          name: "Synthetic Passive Operation Variant",
          rarity: "uncommon",
          mechanics: {
            family: "passive",
            grants: [],
            operations: [
              {
                trigger: {
                  kind: "elapsed_time",
                  unit: "hour",
                  amount: 1,
                },
                effect: bagOfHoldingInput.mechanics.grants[0],
              },
            ],
          },
          destruction: { kind: "none" },
        },
      ],
    });

    const trace = traceUnit(unit);

    if (unit.kind !== "magic_item") {
      throw new Error("Synthetic magic-item collection changed kind");
    }
    expect(describeMagicItemAttunement(unit)).toBe("");
    expect(renderTraceDocument(trace, unit)).not.toContain("5e.tools:");
    const srdMagicItem = decodeUnitRecordSync(bagOfHoldingInput);
    expect(
      renderTraceDocument(traceUnit(srdMagicItem), srdMagicItem),
    ).toContain("5e.tools: <https://5e.tools/items.html");
    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "magic_item_root",
          label: expect.stringContaining("3 variants"),
        }),
        expect.objectContaining({
          atomKind: "magic_item_root",
          label: expect.stringContaining("[attunement]"),
        }),
        expect.objectContaining({ atomKind: "attunement_slot" }),
        expect.objectContaining({ atomKind: "duration_window" }),
      ]),
    );
  });

  test("traces a synthetic creature support action through decoded Stat Block shape", () => {
    const statBlock = decodeStatBlockRecordSync({
      ...goblinWarriorInput,
      id: "synthetic_support_stat_block",
      name: "Synthetic Support Creature",
      provenance: {
        kind: "synthetic-test",
        section: "Synthetic Tests/Creature Support",
      },
      statBlock: {
        ...goblinWarriorInput.statBlock,
        actions: {
          ...goblinWarriorInput.statBlock.actions,
          supports: [
            {
              name: "Synthetic Support",
              target: "ally_in_range",
              rangeFeet: 30,
              effect: cloakOfProtectionInput.mechanics.grants[0],
            },
          ],
        },
      },
    });

    const trace = traceStatBlock(statBlock);

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "direct_apply",
          label: expect.stringContaining("Synthetic Support"),
        }),
      ]),
    );
  });

  test("traces transfer mechanics retained inside a mark attachment hole", () => {
    const trace = traceUnit(decodeUnitRecordSync(huntersMarkInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ atomKind: "mark_target" }),
        expect.objectContaining({ atomKind: "transfer_mark" }),
        expect.objectContaining({ atomKind: "bonus_action_quota" }),
      ]),
    );
    expect(trace.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relation: "transfers_to" }),
      ]),
    );
  });

  test("traces every ongoing-effect shape offered by an effect-mode choice", () => {
    const phase = enlargeReduceInput.mechanics.phases[0];
    const unit = decodeUnitRecordSync({
      ...enlargeReduceInput,
      id: "synthetic_ongoing_effect_mode_shapes",
      name: "Synthetic Ongoing Effect Mode Shapes",
      provenance: {
        kind: "synthetic-test",
        section: "Synthetic Tests/Ongoing Effect Modes",
      },
      mechanics: {
        ...enlargeReduceInput.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              kind: "choose_effect_mode",
              label: "Synthetic ongoing effect shapes",
              options: [
                {
                  id: "synthetic_ongoing_shapes",
                  displayName: "Synthetic Ongoing Shapes",
                  effects: [
                    {
                      ...webInput.mechanics.operations[6].effect,
                      onFail: {
                        kind: "apply_condition",
                        condition: "prone",
                      },
                    },
                    {
                      kind: chillTouchInput.mechanics.phases[0].kind,
                      attackKind:
                        chillTouchInput.mechanics.phases[0].attackKind,
                      onHit: chillTouchInput.mechanics.phases[0].onHit,
                      onMiss: [
                        {
                          kind: "apply_condition",
                          condition: "prone",
                        },
                      ],
                    },
                    searingSmiteInput.mechanics.operations[0].effect,
                    barkskinInput.mechanics.operations[0].effect,
                    blinkInput.mechanics.operations[0].effect,
                  ],
                },
              ],
            },
          },
        ],
      },
    });

    const trace = traceUnit(unit);

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ atomKind: "ability_check_gate" }),
        expect.objectContaining({ atomKind: "attack_roll" }),
        expect.objectContaining({ atomKind: "composite_ongoing" }),
        expect.objectContaining({ atomKind: "modify_ac" }),
        expect.objectContaining({ atomKind: "random_table" }),
        expect.objectContaining({ atomKind: "table_result" }),
      ]),
    );
  });

  test("traces activation ability-check failures and nested random-table phases", () => {
    const directPhase = dispelMagicInput.mechanics.phases[0];
    const abilityCheckPhase = dispelMagicInput.mechanics.phases[1];
    const unit = decodeUnitRecordSync({
      ...dispelMagicInput,
      id: "synthetic_activation_random_table",
      name: "Synthetic Activation Random Table",
      provenance: {
        kind: "synthetic-test",
        section: "Synthetic Tests/Activation Random Table",
      },
      mechanics: {
        ...dispelMagicInput.mechanics,
        phases: [
          {
            ...abilityCheckPhase,
            onFail: {
              kind: "apply_condition",
              condition: "prone",
            },
          },
          {
            kind: "random_table",
            roll: { die: 2 },
            outcomes: [
              { min: 1, max: 1, label: "No nested phase" },
              {
                min: 2,
                max: 2,
                label: "Resolve nested phase",
                phases: [
                  {
                    ...directPhase,
                    effects: [
                      {
                        kind: "negate_triggering_spell",
                        maxSpellLevel: 3,
                      },
                      { kind: "reflect_triggering_spell" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const trace = traceUnit(unit);

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ atomKind: "ability_check" }),
        expect.objectContaining({ atomKind: "apply_condition" }),
        expect.objectContaining({ atomKind: "random_table" }),
        expect.objectContaining({ atomKind: "table_result" }),
      ]),
    );
    expect(trace.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relation: "branches_on_completion" }),
        expect.objectContaining({ relation: "branches_on_roll" }),
      ]),
    );
  });

  test("renders Fighter class creation traits as class graph nodes", () => {
    const trace = traceUnit(decodeUnitRecordSync(classFighterInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "class_saving_throw_proficiencies",
          label: "class_saving_throw_proficiencies\nstr, con",
        }),
        expect.objectContaining({
          atomKind: "class_weapon_proficiencies",
          label: "class_weapon_proficiencies\nsimple weapons, martial weapons",
        }),
        expect.objectContaining({
          atomKind: "class_tool_proficiencies",
          label: "class_tool_proficiencies\nnone",
        }),
        expect.objectContaining({
          atomKind: "class_armor_training",
          label: "class_armor_training\nlight, medium, heavy, shield",
        }),
      ]),
    );
  });

  test("renders class-level Weapon Mastery choice counts without object coercion", () => {
    const trace = traceUnit(decodeUnitRecordSync(fighterWeaponMasteryInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "class_weapon_mastery_choice",
          label: [
            "class_weapon_mastery_choice",
            "choose by class level: L1: 3, L4: 4, L10: 5, L16: 6",
            "class proficient weapons",
            "change 1 on long_rest",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders fixed Weapon Mastery choice counts", () => {
    const trace = traceUnit(decodeUnitRecordSync(paladinWeaponMasteryInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "class_weapon_mastery_choice",
          label: [
            "class_weapon_mastery_choice",
            "choose 2",
            "class proficient weapons",
            "change 2 on long_rest",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Dragon's Breath as a target-granted cone save gate", () => {
    const trace = traceUnit(decodeUnitRecordSync(dragonsBreathInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("willing"),
        }),
        expect.objectContaining({
          atomKind: "action_window",
          label: "action_window\n(attached creature spends magic action)",
        }),
        expect.objectContaining({
          atomKind: "area",
          label: expect.stringContaining("origin: attached creature"),
        }),
        expect.objectContaining({
          atomKind: "save_gate",
          label: "save_gate\nDEX vs caster spell save DC",
        }),
      ]),
    );
  });

  test("preserves Phantasmal Force authored conditional damage in the trace", () => {
    const trace = traceUnit(decodeUnitRecordSync(phantasmalForceInput));
    const authoredConditionalEffect = trace.nodes.find(
      (node) => node.atomKind === "authored_conditional_effect",
    );

    expect(authoredConditionalEffect?.label).toContain("2d8 psychic damage");
    expect(authoredConditionalEffect?.label).toContain("(non-executable)");
  });

  test("renders Flame Blade held-object lifecycle and active blade gates", () => {
    const trace = traceUnit(decodeUnitRecordSync(flameBladeInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "spell_created_held_object",
          label: [
            "spell_created_held_object",
            "held by caster",
            "requires free_hand",
            "disappears when caster_lets_go",
            "re-evoke: bonus_action; requires free_hand",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "ongoing_predicate",
          label: "ongoing_predicate\nspell-created held object active",
        }),
        expect.objectContaining({
          atomKind: "emit_light",
          label: "emit_light\nbright: 10 ft\ndim: +10 ft",
        }),
        expect.objectContaining({
          atomKind: "attack_roll",
          label: "attack_roll\nmelee_spell_attack",
        }),
      ]),
    );
  });

  test("renders Heat Metal object-contact and drop witness facts", () => {
    const trace = traceUnit(decodeUnitRecordSync(heatMetalInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "object_contact_damage",
          label: expect.stringContaining(
            "table_witnessed_physical_contact_with_spell_object",
          ),
        }),
        expect.objectContaining({
          atomKind: "holding_or_wearing_save",
          label: expect.stringContaining(
            "table_witnessed_holding_or_wearing_spell_object",
          ),
        }),
        expect.objectContaining({
          atomKind: "drop_if_possible",
          label: expect.stringContaining("table_witnessed_drop_result"),
        }),
        expect.objectContaining({
          atomKind: "ongoing_predicate",
          label:
            "ongoing_predicate\ntable-witnessed attachment within spell range",
        }),
      ]),
    );
  });

  test("renders Haste's restricted action set and lethargy rider as typed facts", () => {
    const trace = traceUnit(decodeUnitRecordSync(hasteInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("visibility: caster_can_see"),
        }),
        expect.objectContaining({
          atomKind: "restrict_action_set",
          label:
            "restrict_action_set\nallow only: attack (one attack only), dash, disengage, hide, utilize",
        }),
        expect.objectContaining({
          atomKind: "effect_end_target_state",
          label: "effect_end_target_state\nuntil: end_of_target_next_turn",
        }),
        expect.objectContaining({
          atomKind: "apply_condition",
          label: "apply_condition\nincapacitated",
        }),
        expect.objectContaining({
          atomKind: "set_speed",
          label: "set_speed\n= 0 ft",
        }),
      ]),
    );
  });

  test("renders Warding Bond linked-bond lifecycle facts as executable trace atoms", () => {
    const trace = traceUnit(decodeUnitRecordSync(wardingBondInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "caster_target_bond",
          label: expect.stringContaining(
            "bond range: caster-target within 60 ft",
          ),
        }),
        expect.objectContaining({
          atomKind: "paired_worn_material_component",
          label: expect.stringContaining("platinum rings"),
        }),
        expect.objectContaining({
          atomKind: "ongoing_predicate",
          label: "ongoing_predicate\nattached bond within range",
        }),
        expect.objectContaining({
          atomKind: "grant_resistance",
          label: "grant_resistance\nall damage types",
        }),
        expect.objectContaining({
          atomKind: "share_damage_to_caster",
          label: "share_damage_to_caster\nsame_as_attached_damage_taken",
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining("caster drops to 0 HP"),
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining("attached bond exceeds range"),
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining(
            "spell cast again on connected creature",
          ),
        }),
      ]),
    );
  });

  test("renders Magic Weapon's nonmagical weapon enhancement facts", () => {
    const trace = traceUnit(decodeUnitRecordSync(magicWeaponInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("nonmagical weapon"),
        }),
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("filter: weapon, nonmagical"),
        }),
        expect.objectContaining({
          atomKind: "grant_weapon_attack_enhancement",
          label: [
            "grant_weapon_attack_enhancement",
            "magic weapon status",
            "+1 (slot tiers L3:2, L6:3) to attack rolls and damage rolls with attached weapon",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining("caster_recasts_spell"),
        }),
      ]),
    );
  });

  test("renders Locate Animals or Plants as nearest-kind location disclosure", () => {
    const trace = traceUnit(decodeUnitRecordSync(locateAnimalsOrPlantsInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "locate_kind",
          label: [
            "locate_kind",
            "subjects: beast, plant_creature, nonmagical_plant",
            "closest within 26400 ft",
            "direction_and_distance",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Locate Object as object location and motion disclosure", () => {
    const trace = traceUnit(decodeUnitRecordSync(locateObjectInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "object_location_sense",
          label: [
            "object_location_sense",
            "specific known object seen within 30 ft",
            "nearest particular_kind within 1000 ft",
            "direction_to_location_and_movement",
            "blocked_by: any_thickness_of_lead_direct_path",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Animal Messenger as a CR-gated Tiny Beast courier task", () => {
    const trace = traceUnit(decodeUnitRecordSync(animalMessengerInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("creature size: exact tiny"),
        }),
        expect.objectContaining({
          atomKind: "save_gate",
          label: expect.stringContaining(
            "auto-success if target Challenge Rating != 0",
          ),
        }),
        expect.objectContaining({
          atomKind: "assign_courier_task",
          label: [
            "assign_courier_task",
            "messenger: target_beast",
            "destination: caster_specified_visited_location",
            "recipient: caster_specified_general_description",
            "message: 25 words; mimic_caster_communication",
            "travel: 25/50 miles per 24h",
            "on arrival: deliver_to_described_creature",
            "on expiry: message_lost_and_beast_returns_to_casting_location",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Arcanist's Magic Aura as target-gated magical identity masking", () => {
    const trace = traceUnit(decodeUnitRecordSync(arcanistsMagicAuraInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("creature disposition: willing"),
        }),
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("not_worn_or_carried"),
        }),
        expect.objectContaining({
          atomKind: "magical_identity_mask",
          label: [
            "magical_identity_mask",
            "creature: other_than_actual_type",
            "treated by: spells_and_magical_effects",
            "object aura: nonmagical_magical_or_chosen_school",
            "observed by: spells_and_magical_effects_detecting_magical_auras",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining(
            "permanent after 30 daily casts on same_target",
          ),
        }),
      ]),
    );
  });

  test("renders Augury as a GM-chosen divination omen table", () => {
    const trace = traceUnit(decodeUnitRecordSync(auguryInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "divination_omen",
          label: [
            "divination_omen",
            "source: otherworldly_entity",
            "subject: planned_course_of_action within 30 minutes",
            "adjudication: gm_chosen_omen_table",
            "omens: weal=good, woe=bad, weal_and_woe=good_and_bad, indifference=neither_good_nor_bad",
            "changed circumstances: not_accounted_for",
            "repeat casting: 25% cumulative_percent_per_cast_after_first until long_rest",
            "repeat result: no_answer",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Prayer of Healing as ranged multi-recipient rest healing", () => {
    const trace = traceUnit(decodeUnitRecordSync(prayerOfHealingInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining(
            "casting requirement: remain within spell range for entire casting",
          ),
        }),
        expect.objectContaining({
          atomKind: "grant_rest_benefit",
          label: [
            "grant_rest_benefit",
            "short_rest",
            "target: target_creature",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "spell_recipient_rest_lockout",
          label: [
            "spell_recipient_rest_lockout",
            "target: target_creature",
            "reset: target_finishes_long_rest",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Magic Mouth as object-anchored spoken-message release", () => {
    const trace = traceUnit(decodeUnitRecordSync(magicMouthInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "object",
          label: expect.stringContaining(
            "not worn or carried by another creature",
          ),
        }),
        expect.objectContaining({
          atomKind: "post_action_window",
          label: expect.stringContaining("visual/audible condition"),
        }),
        expect.objectContaining({
          atomKind: "release",
          label: expect.stringContaining("spoken message"),
        }),
      ]),
    );
  });

  test("renders Moonbeam shared per-turn fence as a single use_count node with four limits edges", () => {
    const trace = traceUnit(decodeUnitRecordSync(moonbeamInput));

    // RAW: "A creature makes this save only once per turn" spans all four triggers:
    // initial appearance (initialPhase) + 3 recurring operations.
    // The tracer must collapse these into a single use_count node (shared by limitGroup).
    const fenceNodes = trace.nodes.filter((n) => n.atomKind === "use_count");
    expect(fenceNodes).toHaveLength(1);
    expect(fenceNodes[0]).toMatchObject({
      id: "moonbeam_save_per_turn",
      atomKind: "use_count",
      label: "use_count\nonce per turn",
    });

    // Four "limits" edges must fan into the single fence node.
    const limitsEdges = trace.edges.filter(
      (e) => e.to === "moonbeam_save_per_turn" && e.relation === "limits",
    );
    expect(limitsEdges).toHaveLength(4);
  });

  test("renders Conjure Animals pack occurrence, caster movement, visible-creature triggers, and shared per-turn fence", () => {
    const trace = traceUnit(decodeUnitRecordSync(conjureAnimalsInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("spell_spatial_manifestation"),
        }),
        expect.objectContaining({
          atomKind: "ongoing_predicate",
          label: "ongoing_predicate\ncaster within 5 ft of attachment",
        }),
        expect.objectContaining({
          atomKind: "movement_window",
          label: "movement_window\n(caster moves on own turn)",
        }),
        expect.objectContaining({
          atomKind: "reposition_attachment",
          label: [
            "reposition_attachment",
            "max 30 ft",
            "dest: caster visible unoccupied space",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "post_action_window",
          label:
            "post_action_window\n(spatial manifestation moves within 10 ft of visible creature)",
        }),
        expect.objectContaining({
          atomKind: "post_action_window",
          label:
            "post_action_window\n(visible creature enters within 10 ft of spatial manifestation)",
        }),
        expect.objectContaining({
          atomKind: "post_action_window",
          label:
            "post_action_window\n(visible creature ends turn within 10 ft of spatial manifestation)",
        }),
        expect.objectContaining({
          atomKind: "save_gate",
          label: [
            "save_gate",
            "DEX vs caster spell save DC",
            "application: caster may force target save",
          ].join("\n"),
        }),
      ]),
    );

    const fenceNodes = trace.nodes.filter((n) => n.atomKind === "use_count");
    expect(fenceNodes).toContainEqual(
      expect.objectContaining({
        id: "conjure_animals_save_per_turn",
        label: "use_count\nonce per turn",
      }),
    );
    const limitsEdges = trace.edges.filter(
      (e) =>
        e.to === "conjure_animals_save_per_turn" && e.relation === "limits",
    );
    expect(limitsEdges).toHaveLength(3);
  });

  test("renders Spiritual Weapon later movement and repeat attack behind one Bonus Action window", () => {
    const trace = traceUnit(decodeUnitRecordSync(spiritualWeaponInput));

    const bonusActionWindows = trace.nodes.filter(
      (n) => n.atomKind === "bonus_action_window",
    );
    expect(bonusActionWindows).toEqual([
      expect.objectContaining({
        label:
          "bonus_action_window\n(caster spends Bonus Action, later turns only)",
      }),
    ]);
    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "composite_ongoing",
          label: "composite_ongoing\n(2 effects)",
        }),
        expect.objectContaining({
          atomKind: "reposition_attachment",
          label: expect.stringContaining("20 ft"),
        }),
        expect.objectContaining({
          atomKind: "attack_roll",
          label: "attack_roll\nmelee_spell_attack",
        }),
      ]),
    );
    const forceReachTargetNodes = trace.nodes.filter(
      (n) =>
        n.atomKind === "hole" &&
        n.label.includes("creature within 5 feet of the force") &&
        n.label.includes(
          "relative: within 5 ft of attachment spiritual_weapon_force",
        ),
    );
    expect(forceReachTargetNodes).toHaveLength(2);
    const repeatAttackTargetIds = new Set(
      trace.edges.filter((e) => e.relation === "targets").map((e) => e.to),
    );
    expect(
      forceReachTargetNodes.some((node) => repeatAttackTargetIds.has(node.id)),
    ).toBe(true);
  });

  test("renders Rope Trick as an extradimensional refuge", () => {
    const trace = traceUnit(decodeUnitRecordSync(ropeTrickInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("touched rope"),
        }),
        expect.objectContaining({
          atomKind: "create_extradimensional_space",
          label: [
            "create_extradimensional_space",
            "invisible 3 ft x 5 ft portal at anchor_upper_end",
            "touched_rope: hovers_until_perpendicular_or_ceiling",
            "access: climb_anchor; can_be_pulled_into_or_dropped_out",
            "capacity: 8 medium or smaller creatures",
            "boundary: blocked_bidirectionally",
            "occupant perception: can_see_out_through_portal",
            "on end: drop_contents_out",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Silence as a coupled sound-area rule", () => {
    const trace = traceUnit(decodeUnitRecordSync(silenceInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("sphere r=20 ft"),
        }),
        expect.objectContaining({
          atomKind: "area_of_silence",
          label: [
            "area_of_silence",
            "blocks_creation_and_passage",
            "entirely_inside_area",
            "immunity: thunder",
            "condition: deafened",
            "blocks component: verbal",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Zone of Truth as a save-gated truthfulness rule", () => {
    const trace = traceUnit(decodeUnitRecordSync(zoneOfTruthInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("sphere r=15 ft"),
        }),
        expect.objectContaining({
          atomKind: "save_gate",
          label: expect.stringContaining("CHA vs caster spell save DC"),
        }),
        expect.objectContaining({
          atomKind: "truthfulness_constraint",
          label: [
            "truthfulness_constraint",
            "prohibits: deliberate_lie",
            "while: in_spell_area",
            "target: aware_of_spell",
            "may respond: evasive_or_silent_truthful",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "reveal_save_outcome_to_caster",
          label: "reveal_save_outcome_to_caster",
        }),
      ]),
    );
  });
});
