-- Blade Barrier — SRD 5.2.1 Spell, level 6, Evocation.
--
-- RAW (Spells/Descriptions-A-D#Blade Barrier):
--   "The wall provides Three-Quarters Cover, and its space is
--    Difficult Terrain."
--   "Any creature in the wall's space makes a Dexterity saving throw,
--    taking 6d10 Force damage on a failed save or half as much damage
--    on a successful one."
--   "A creature also makes that save if it enters the wall's space or
--    ends its turn there. A creature makes that save only once per turn."
--
-- PARTIAL. The shared "only once per turn" budget across both the
-- enter-area and end-turn triggers is not expressible as a single
-- cross-operation usage gate yet. Both triggers are authored; the
-- once-per-turn coupling remains an execution invariant.

let ShapeOption : Type =
      { kind : Text
      , lengthFeet : Optional Natural
      , widthFeet : Optional Natural
      , radiusFeet : Optional Natural
      , heightFeet : Optional Natural
      }

let lineOption : ShapeOption =
      { kind = "line"
      , lengthFeet = Some 100
      , widthFeet = Some 5
      , radiusFeet = None Natural
      , heightFeet = None Natural
      }

let ringOption : ShapeOption =
      { kind = "cylinder"
      , lengthFeet = None Natural
      , widthFeet = None Natural
      , radiusFeet = Some 30
      , heightFeet = Some 20
      }

let areaShape =
      { kind = "choice"
      , options = [ lineOption, ringOption ]
      }

let forceDamage =
      { kind = "damage"
      , damageType = Some "force"
      , amount =
          Some
            { kind = "fixed"
            , expr = { dice = 6, dieSize = 10 }
            }
      , cover = None Text
      }

let halfDamage =
      { kind = "half_damage"
      , damageType = None Text
      , amount =
          None
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural }
            }
      , cover = None Text
      }

let difficultTerrain =
      { kind = "area_is_difficult_terrain"
      , damageType = None Text
      , amount =
          None
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural }
            }
      , cover = None Text
      }

let threeQuartersCover =
      { kind = "grant_cover"
      , damageType = None Text
      , amount =
          None
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural }
            }
      , cover = Some "three_quarters"
      }

let wallAttachment =
      { kind = "hole"
      , holeId = "blade_barrier_wall"
      , label = "blade wall"
      , value =
          { kind = "area"
          , shape = areaShape
          , origin = { kind = "point_within_range" }
          }
      }

let bladeBarrier =
      { kind = "spell"
      , id = "blade_barrier"
      , name = "Blade Barrier"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Blade Barrier"
          }
      , description =
          "You create a wall of whirling blades made of magical energy within range. The wall lasts for the duration. You make a straight wall up to 100 feet long, 20 feet high, and 5 feet thick, or a ringed wall up to 60 feet in diameter, 20 feet high, and 5 feet thick. The wall provides Three-Quarters Cover, and its space is Difficult Terrain. Any creature in the wall's space makes a Dexterity saving throw, taking 6d10 Force damage on a failed save or half as much damage on a successful one. A creature also makes that save if it enters the wall's space or ends its turn there. A creature makes that save only once per turn."
      , mechanics =
          { family = "ongoing_effect"
          , level = 6
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 90 }
          , components = { v = True, s = True, m = False }
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
              , onFail = forceDamage
              , onSuccess = halfDamage
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = difficultTerrain
                }
              , { trigger = { kind = "passive" }
                , effect = threeQuartersCover
                }
              , { trigger = { kind = "on_creature_enters_area" }
                , effect = forceDamage
                }
              , { trigger = { kind = "on_creature_ends_turn_in_area" }
                , effect = forceDamage
                }
              ]
          }
      }

in  bladeBarrier
