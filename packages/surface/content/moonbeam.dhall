-- Moonbeam — SRD 5.2.1 Spell, Level 2, Evocation.
--
-- RAW (Spells/Descriptions-M-P#Moonbeam):
--   "A silvery beam of pale light shines down in a 5-foot-radius,
--    40-foot-high Cylinder centered on a point within range. Until
--    the spell ends, Dim Light fills the Cylinder, and you can take
--    a Magic action on later turns to move the Cylinder up to 60 feet."
--   "When the Cylinder appears, each creature in it makes a Constitution
--    saving throw. On a failed save, a creature takes 2d10 Radiant
--    damage, and if the creature is shape-shifted (as a result of the
--    Polymorph spell, for example), it reverts to its true form and
--    can't shape-shift until it leaves the Cylinder. On a successful
--    save, a creature takes half as much damage only. A creature also
--    makes this save when the spell's area moves into its space and
--    when it enters the spell's area or ends its turn there. A creature
--    makes this save only once per turn."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d10
--    for each spell slot level above 2."
--
-- Surface lifecycle modeled here:
--   * Cylinder area attachment; Concentration up to 1 minute.
--   * Passive: Dim Light fills the Cylinder (area_emits_dim_light —
--     source-level illumination fact; Lightly Obscured is derived
--     from it by consumers per UBIQUITOUS_LANGUAGE).
--   * Magic Action on later turns: reposition Cylinder up to 60 feet.
--   * Initial cast: Con save for every creature in the Cylinder.
--   * Saves — shared once-per-turn window per creature (limitGroup
--     "moonbeam_save_per_turn"):
--       initialPhase (on_effect_starts / cylinder appears),
--       on_creature_ends_turn_in_area,
--       on_creature_enters_area,
--       on_area_moves_into_creature_space.
--     All four share limitGroup "moonbeam_save_per_turn" so the
--     cross-trigger invariant ("once per turn" spans all triggers)
--     is executable at the schema boundary.
--   * Failed-save composite: slot-scaled Radiant damage
--       + revert_shape_shift_to_true_form (onlyIfTargetIsShapeShifted)
--       + suppress_shape_shifting_while_in_area (onlyIfTargetIsShapeShifted).
--     The shape-shift guard is RAW: "if the creature is shape-shifted".
--
-- Battle-runtime and shape-shifting rider execution remain as
-- follow-up tasks (L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME,
-- L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER).

let DiceAmount : Type =
      { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , perLevel : { dice : Natural }
      , startingAtLevel : Natural
      }

let radiantDamageAmount : DiceAmount =
      { kind = "linear_per_level"
      , axis = "slot"
      , base = { dice = 2, dieSize = 10 }
      , perLevel = { dice = 1 }
      , startingAtLevel = 2
      }

-- Composite effect item: kind + optional damage fields + shape-shift guard
let CompositeItem : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , onlyIfTargetIsShapeShifted : Optional Bool
      }

let noneItem =
      { damageType = None Text
      , amount = None DiceAmount
      , onlyIfTargetIsShapeShifted = None Bool
      }

let damageItem : CompositeItem =
      noneItem
        //  { kind = "damage"
            , damageType = Some "radiant"
            , amount = Some radiantDamageAmount
            }

-- onlyIfTargetIsShapeShifted = true encodes RAW: "if the creature is
-- shape-shifted". Without this guard the atom could apply to creatures
-- that were never shape-shifted.
let revertItem : CompositeItem =
      noneItem
        //  { kind = "revert_shape_shift_to_true_form"
            , onlyIfTargetIsShapeShifted = Some True
            }

let suppressItem : CompositeItem =
      noneItem
        //  { kind = "suppress_shape_shifting_while_in_area"
            , onlyIfTargetIsShapeShifted = Some True
            }

let failItems : List CompositeItem = [ damageItem, revertItem, suppressItem ]

-- onFail is a composite atom
let OnFailAtom : Type =
      { kind : Text
      , effects : Optional (List CompositeItem)
      , damageType : Optional Text
      , amount : Optional DiceAmount
      }

let compositeOnFail : OnFailAtom =
      { kind = "composite"
      , effects = Some failItems
      , damageType = None Text
      , amount = None DiceAmount
      }

-- Ongoing effect for save_gate operations
let OngoingEffect : Type =
      { kind : Text
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional OnFailAtom
      , onSuccess : Optional { kind : Text }
      , maxMoveFeet : Optional Natural
      }

let saveSave : OngoingEffect =
      { kind = "save_gate"
      , ability = Some "con"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some compositeOnFail
      , onSuccess = Some { kind = "half_damage" }
      , maxMoveFeet = None Natural
      }

let reposition : OngoingEffect =
      { kind = "reposition_attachment"
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None OnFailAtom
      , onSuccess = None { kind : Text }
      , maxMoveFeet = Some 60
      }

-- area_emits_dim_light is the source-level illumination fact.
-- Lightly Obscured is derived from Dim Light by consumers (UBIQUITOUS_LANGUAGE).
-- Using area_is_lightly_obscured would lose the Dim Light source needed
-- by Task 36 (Dim Light and Lightly Obscured projection) and Darkvision consumers.
let dimLight : OngoingEffect =
      { kind = "area_emits_dim_light"
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None OnFailAtom
      , onSuccess = None { kind : Text }
      , maxMoveFeet = None Natural
      }

-- Trigger type with optional cost (bonus_action or standard_action + action)
-- and optional laterTurnsOnly (RAW: "on later turns").
let ActionCost : Type = { kind : Text, action : Optional Text }

let Trigger : Type =
      { kind : Text
      , cost : Optional ActionCost
      , laterTurnsOnly : Optional Bool
      }

let passiveTrigger : Trigger =
      { kind = "passive", cost = None ActionCost, laterTurnsOnly = None Bool }

let magicActionTrigger : Trigger =
      { kind = "on_caster_spends_action"
      , cost = Some { kind = "standard_action", action = Some "magic" }
      , laterTurnsOnly = Some True
      }

let endTurnTrigger : Trigger =
      { kind = "on_creature_ends_turn_in_area", cost = None ActionCost, laterTurnsOnly = None Bool }

let entersTrigger : Trigger =
      { kind = "on_creature_enters_area", cost = None ActionCost, laterTurnsOnly = None Bool }

let areaMoveTrigger : Trigger =
      { kind = "on_area_moves_into_creature_space", cost = None ActionCost, laterTurnsOnly = None Bool }

-- UsageLimit with limitGroup encodes the shared cross-trigger once-per-turn
-- window: RAW "A creature makes this save only once per turn" spans all three
-- recurring triggers, not just one.
let UsageLimit : Type = { kind : Text, limitGroup : Optional Text }

let Operation : Type =
      { trigger : Trigger
      , effect : OngoingEffect
      , usageLimit : Optional UsageLimit
      }

-- All three recurring save operations share this limit to make the
-- cross-trigger invariant executable.
let sharedOncePerTurn = Some { kind = "once_per_turn", limitGroup = Some "moonbeam_save_per_turn" }
let noLimit = None UsageLimit

let cylinderArea =
      { kind = "hole"
      , holeId = "moonbeam_cylinder"
      , label = "Moonbeam cylinder"
      , value =
          { kind = "area"
          , shape = { kind = "cylinder", radiusFeet = 5, heightFeet = 40 }
          , origin = { kind = "point_within_range" }
          }
      }

let moonbeam =
      { kind = "spell"
      , id = "moonbeam"
      , name = "Moonbeam"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Moonbeam"
          }
      , description =
          "A silvery beam of pale light shines down in a 5-foot-radius, 40-foot-high Cylinder centered on a point within range. Until the spell ends, Dim Light fills the Cylinder, and you can take a Magic action on later turns to move the Cylinder up to 60 feet. When the Cylinder appears, each creature in it makes a Constitution saving throw. On a failed save, a creature takes 2d10 Radiant damage, and if the creature is shape-shifted (as a result of the Polymorph spell, for example), it reverts to its true form and can't shape-shift until it leaves the Cylinder. On a successful save, a creature takes half as much damage only. A creature also makes this save when the spell's area moves into its space and when it enters the spell's area or ends its turn there. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 2."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = Some "a moonseed leaf" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = cylinderArea
          , initialPhase =
              { kind = "save_gate"
              , attachment = cylinderArea
              , ability = "con"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = compositeOnFail
              , onSuccess = { kind = "half_damage" }
              , usageLimit = sharedOncePerTurn
              }
          , operations =
              [ { trigger = passiveTrigger
                , effect = dimLight
                , usageLimit = noLimit
                }
              , { trigger = magicActionTrigger
                , effect = reposition
                , usageLimit = noLimit
                }
              , { trigger = endTurnTrigger
                , effect = saveSave
                , usageLimit = sharedOncePerTurn
                }
              , { trigger = entersTrigger
                , effect = saveSave
                , usageLimit = sharedOncePerTurn
                }
              , { trigger = areaMoveTrigger
                , effect = saveSave
                , usageLimit = sharedOncePerTurn
                }
              ] : List Operation
          }
      }

in  moonbeam
