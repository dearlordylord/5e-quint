-- Wall of Ice — SRD 5.2.1 Spell, level 6, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Wall of Ice):
--   "You create a wall of ice on a solid surface within range."
--   "You can form it into a hemispherical dome or a globe with a radius
--    of up to 10 feet, or you can shape a flat surface made up of ten
--    10-foot-square panels. Each panel must be contiguous with another
--    panel. In any form, the wall is 1 foot thick..."
--   "If the wall cuts through a creature's space when it appears, the
--    creature is pushed to one side of the wall ... and makes a Dexterity
--    saving throw, taking 10d6 Cold damage on a failed save or half as
--    much damage on a successful one."
--   "It has AC 12 and 30 Hit Points per 10-foot section, and it has
--    Immunity to Cold, Poison, and Psychic damage and Vulnerability to
--    Fire damage."
--   "Reducing a 10-foot section of wall to 0 Hit Points destroys it and
--    leaves behind a sheet of frigid air in the space the wall occupied."
--   "A creature moving through the sheet of frigid air for the first time
--    on a turn makes a Constitution saving throw, taking 5d6 Cold damage
--    on a failed save or half as much damage on a successful one."
--
-- PARTIAL: exact panel arrangement and chosen push side are geometry
-- choices. The flat panel option is represented as its maximum rectangular
-- envelope.

let ShapeOption : Type =
      { kind : Text
      , maxLengthFeet : Optional Natural
      , maxHeightFeet : Optional Natural
      , thicknessFeet : Optional Natural
      , radiusFeet : Optional Natural
      }

let flatPanels : ShapeOption =
      { kind = "wall_volume"
      , maxLengthFeet = Some 100
      , maxHeightFeet = Some 10
      , thicknessFeet = Some 1
      , radiusFeet = None Natural
      }

let globeOrDome : ShapeOption =
      { kind = "sphere"
      , maxLengthFeet = None Natural
      , maxHeightFeet = None Natural
      , thicknessFeet = None Natural
      , radiusFeet = Some 10
      }

let Shape : Type =
      { kind : Text
      , options : Optional (List ShapeOption)
      , maxLengthFeet : Optional Natural
      , maxHeightFeet : Optional Natural
      , thicknessFeet : Optional Natural
      , radiusFeet : Optional Natural
      }

let iceWallShape : Shape =
      { kind = "choice"
      , options = Some [ flatPanels, globeOrDome ]
      , maxLengthFeet = None Natural
      , maxHeightFeet = None Natural
      , thicknessFeet = None Natural
      , radiusFeet = None Natural
      }

let DiceAmount : Type =
      { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , perLevel : { dice : Natural }
      , startingAtLevel : Natural
      }

let Durability : Type =
      { acValue : Natural
      , hpPerSection : Natural
      , damageImmunities : List Text
      , damageVulnerabilities : List Text
      }

let Dc : Type = { kind : Text }

let Outcome : Type =
      { kind : Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      }

let noneOutcome : Outcome =
      { kind = "none", amount = None DiceAmount, damageType = None Text }

let halfDamage : Outcome = noneOutcome // { kind = "half_damage" }

let initialDamageAmount : DiceAmount =
      { kind = "linear_per_level"
      , axis = "slot"
      , base = { dice = 10, dieSize = 6 }
      , perLevel = { dice = 2 }
      , startingAtLevel = 6
      }

let frigidAirDamageAmount : DiceAmount =
      { kind = "linear_per_level"
      , axis = "slot"
      , base = { dice = 5, dieSize = 6 }
      , perLevel = { dice = 1 }
      , startingAtLevel = 6
      }

let initialColdDamage : Outcome =
      noneOutcome
        //  { kind = "damage"
            , amount = Some initialDamageAmount
            , damageType = Some "cold"
            }

let frigidAirDamage : Outcome =
      noneOutcome
        //  { kind = "damage"
            , amount = Some frigidAirDamageAmount
            , damageType = Some "cold"
            }

let Effect : Type =
      { kind : Text
      , direction : Optional Text
      , distanceFeet : Optional Natural
      , maxSize : Optional Text
      , shape : Optional Shape
      , durability : Optional Durability
      , ability : Optional Text
      , dc : Optional Dc
      , onFail : Optional Outcome
      , onSuccess : Optional Outcome
      , areaLabel : Optional Text
      }

let noneEffect =
      { direction = None Text
      , distanceFeet = None Natural
      , maxSize = None Text
      , shape = None Shape
      , durability = None Durability
      , ability = None Text
      , dc = None Dc
      , onFail = None Outcome
      , onSuccess = None Outcome
      , areaLabel = None Text
      }

let createWall : Effect =
      noneEffect
        //  { kind = "create_object"
            , maxSize = Some "gargantuan"
            , shape = Some iceWallShape
            , durability =
                Some
                  { acValue = 12
                  , hpPerSection = 30
                  , damageImmunities = [ "cold", "poison", "psychic" ]
                  , damageVulnerabilities = [ "fire" ]
                  }
            }

let pushCreatures : Effect =
      noneEffect
        //  { kind = "force_move"
            , direction = Some "push"
            , distanceFeet = Some 5
            }

let initialSave : Effect =
      noneEffect
        //  { kind = "save_gate"
            , ability = Some "dex"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some initialColdDamage
            , onSuccess = Some halfDamage
            }

let frigidAirSave : Effect =
      noneEffect
        //  { kind = "save_gate"
            , ability = Some "con"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some frigidAirDamage
            , onSuccess = Some halfDamage
            }

let leaveFrigidAir : Effect =
      noneEffect
        //  { kind = "replace_destroyed_object_section_with_area"
            , areaLabel = Some "sheet of frigid air"
            }

let wallAttachment =
      { kind = "hole"
      , holeId = "wall_of_ice_area"
      , label = "ice wall"
      , value =
          { kind = "area"
          , shape = iceWallShape
          , origin = { kind = "point_within_range" }
          }
      }

let Trigger : Type = { kind : Text }

let Operation : Type =
      { trigger : Trigger
      , effect : Effect
      , usageLimit : Optional { kind : Text }
      }

let wallOfIce =
      { kind = "spell"
      , id = "wall_of_ice"
      , name = "Wall of Ice"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Wall of Ice"
          }
      , description =
          "You create a wall of ice on a solid surface within range, either a hemispherical dome or globe with a radius of up to 10 feet, or a flat surface made of ten contiguous 10-foot-square panels. The wall is 1 foot thick. If it cuts through a creature's space when it appears, the creature is pushed to one side and makes a Dexterity saving throw, taking 10d6 Cold damage on a failed save or half as much on a success. The wall has AC 12, 30 Hit Points per 10-foot section, Immunity to Cold, Poison, and Psychic damage, and Vulnerability to Fire damage. Destroying a section leaves a sheet of frigid air in that space. A creature moving through that air for the first time on a turn makes a Constitution saving throw, taking 5d6 Cold damage on a failed save or half as much on a success. Both damage amounts scale with higher-level spell slots."
      , mechanics =
          { family = "ongoing_effect"
          , level = 6
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = Some "a piece of quartz" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment = wallAttachment
          , initialPhase =
              { kind = "direct"
              , attachment = wallAttachment
              , effects = [ createWall, pushCreatures ]
              }
          , operations =
              [ { trigger = { kind = "on_effect_starts" }
                , effect = initialSave
                , usageLimit = None { kind : Text }
                }
              , { trigger = { kind = "on_object_section_destroyed" }
                , effect = leaveFrigidAir
                , usageLimit = None { kind : Text }
                }
              , { trigger = { kind = "on_creature_moves_through_area" }
                , effect = frigidAirSave
                , usageLimit = Some { kind = "once_per_turn" }
                }
              ] : List Operation
          }
      }

in  wallOfIce
