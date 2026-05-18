-- Wall of Thorns — SRD 5.2.1 Spell, level 6, Conjuration.
--
-- RAW (Spells/Descriptions-S-Z#Wall of Thorns):
--   "The wall blocks line of sight."
--   "When the wall appears, each creature in its area makes a Dexterity
--    saving throw, taking 7d8 Piercing damage on a failed save or half
--    as much damage on a successful one."
--   "For every 1 foot a creature moves through the wall, it must spend
--    4 feet of movement."
--   "The first time a creature enters a space in the wall on a turn or
--    ends its turn there, the creature makes a Dexterity saving throw,
--    taking 7d8 Slashing damage on a failed save or half as much on a
--    successful one."
--   "Using a Higher-Level Spell Slot. Both types of damage increase by
--    1d8 for each spell slot level above 6."
--
-- PARTIAL: the shared once-per-turn budget across enter-area and
-- end-turn saves is not yet expressible across operations. Both
-- triggers are authored; the deduplication remains an execution
-- invariant.

let ShapeOption : Type =
      { kind : Text
      , lengthFeet : Optional Natural
      , widthFeet : Optional Natural
      , radiusFeet : Optional Natural
      , heightFeet : Optional Natural
      }

let lineOption : ShapeOption =
      { kind = "line"
      , lengthFeet = Some 60
      , widthFeet = Some 5
      , radiusFeet = None Natural
      , heightFeet = None Natural
      }

let ringOption : ShapeOption =
      { kind = "cylinder"
      , lengthFeet = None Natural
      , widthFeet = None Natural
      , radiusFeet = Some 10
      , heightFeet = Some 20
      }

let areaShape =
      { kind = "choice", options = [ lineOption, ringOption ] }

let thornDamage =
      { kind = "linear_per_level"
      , axis = "slot"
      , base = { dice = 7, dieSize = 8 }
      , perLevel = { dice = 1 }
      , startingAtLevel = 6
      }

let DiceAmount : Type =
      { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , perLevel : { dice : Natural }
      , startingAtLevel : Natural
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , multiplier : Optional Natural
      , appliesTo : Optional Text
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional { kind : Text, damageType : Text, amount : DiceAmount }
      , onSuccess :
          Optional
            { kind : Text
            , damageType : Optional Text
            , amount : Optional DiceAmount
            , multiplier : Optional Natural
            }
      }

let piercingDamage =
      { kind = "damage"
      , damageType = Some "piercing"
      , amount = Some thornDamage
      , multiplier = None Natural
      , appliesTo = None Text
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None { kind : Text, damageType : Text, amount : DiceAmount }
      , onSuccess =
          None
            { kind : Text
            , damageType : Optional Text
            , amount : Optional DiceAmount
            , multiplier : Optional Natural
            }
      }

let slashingDamage =
      { kind = "damage"
      , damageType = Some "slashing"
      , amount = Some thornDamage
      , multiplier = None Natural
      , appliesTo = None Text
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None { kind : Text, damageType : Text, amount : DiceAmount }
      , onSuccess =
          None
            { kind : Text
            , damageType : Optional Text
            , amount : Optional DiceAmount
            , multiplier : Optional Natural
            }
      }

let halfDamage =
      { kind = "half_damage"
      , damageType = None Text
      , amount = None DiceAmount
      , multiplier = None Natural
      }

let movementCost =
      { kind = "area_movement_cost_multiplier"
      , damageType = None Text
      , amount = None DiceAmount
      , multiplier = Some 4
      , appliesTo = Some "any_movement"
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None { kind : Text, damageType : Text, amount : DiceAmount }
      , onSuccess =
          None
            { kind : Text
            , damageType : Optional Text
            , amount : Optional DiceAmount
            , multiplier : Optional Natural
            }
      }

let blockSight =
      { kind = "block_line_of_sight"
      , damageType = None Text
      , amount = None DiceAmount
      , multiplier = None Natural
      , appliesTo = None Text
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None { kind : Text, damageType : Text, amount : DiceAmount }
      , onSuccess =
          None
            { kind : Text
            , damageType : Optional Text
            , amount : Optional DiceAmount
            , multiplier : Optional Natural
            }
      }

let wallAttachment =
      { kind = "hole"
      , holeId = "wall_of_thorns_area"
      , label = "thorn wall"
      , value =
          { kind = "area"
          , shape = areaShape
          , origin = { kind = "point_within_range" }
          }
      }

let recurringSave =
      { kind = "save_gate"
      , damageType = None Text
      , amount = None DiceAmount
      , multiplier = None Natural
      , appliesTo = None Text
      , ability = Some "dex"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail =
          Some
            { kind = "damage"
            , damageType = "slashing"
            , amount = thornDamage
            }
      , onSuccess = Some halfDamage
      } : Effect

let wallOfThorns =
      { kind = "spell"
      , id = "wall_of_thorns"
      , name = "Wall of Thorns"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Wall of Thorns"
          }
      , description =
          "You create a wall of tangled brush bristling with needle-sharp thorns on a solid surface within range. The wall can be up to 60 feet long, 10 feet high, and 5 feet thick, or a circle 20 feet in diameter and up to 20 feet high and 5 feet thick. The wall blocks line of sight. When the wall appears, each creature in its area makes a Dexterity saving throw, taking 7d8 Piercing damage on a failed save or half as much damage on a successful one. For every 1 foot a creature moves through the wall, it must spend 4 feet of movement. The first time a creature enters a space in the wall on a turn or ends its turn there, it makes a Dexterity saving throw, taking 7d8 Slashing damage on a failed save or half as much on a successful one. Using a Higher-Level Spell Slot, both damage types increase by 1d8 for each spell slot level above 6."
      , mechanics =
          { family = "ongoing_effect"
          , level = 6
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = Some "a handful of thorns" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment = wallAttachment
          , initialPhase =
              { kind = "save_gate"
              , attachment = wallAttachment
              , ability = "dex"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = piercingDamage
              , onSuccess = halfDamage
              }
          , operations =
              [ { trigger = { kind = "passive" }, effect = movementCost }
              , { trigger = { kind = "passive" }, effect = blockSight }
              , { trigger = { kind = "on_creature_enters_area" }
                , effect = recurringSave
                }
              , { trigger = { kind = "on_creature_ends_turn_in_area" }
                , effect = recurringSave
                }
              ]
          }
      }

in  wallOfThorns
