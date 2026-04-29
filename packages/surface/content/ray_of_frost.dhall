-- Ray of Frost — SRD 5.2.1 Cantrip, Evocation.
--
-- RAW:
--   "A frigid beam of blue-white light streaks toward a creature
--    within range. Make a ranged spell attack against the target. On
--    a hit, it takes 1d8 Cold damage, and its Speed is reduced by 10
--    feet until the start of your next turn."
--   "Cantrip Upgrade: The damage increases by 1d8 when you reach
--    levels 5 (2d8), 11 (3d8), and 17 (4d8)."
--
-- Consolidated validation reference for:
--   • Multi-effect onHit on attack_roll phase: damage + modify_speed.
--     Uses the Dhall Optional-fields pattern to satisfy the
--     homogeneous-list constraint — each rider record has the union
--     of fields across the two atom variants with None / Some.
--
-- The "until the start of your next turn" window on the speed
-- reduction is a turn-scoped window resolved by the session, per
-- ARCHITECTURE.md §1; the content surface records the atom
-- application only.

let AmountRec
    : Type
    = { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , tiers :
          List
            { atLevel : Natural
            , override : { dice : Natural }
            }
      }

let HitRider
    : Type
    = { kind : Text
      , damageType : Optional Text
      , amount : Optional AmountRec
      , delta : Optional Integer
      , unit : Optional Text
      }

let damageRider
    : HitRider
    = { kind = "damage"
      , damageType = Some "cold"
      , amount =
          Some
            { kind = "threshold_tiers"
            , axis = "character"
            , base = { dice = 1, dieSize = 8 }
            , tiers =
                [ { atLevel = 5, override = { dice = 2 } }
                , { atLevel = 11, override = { dice = 3 } }
                , { atLevel = 17, override = { dice = 4 } }
                ]
            }
      , delta = None Integer
      , unit = None Text
      }

let modifySpeedRider
    : HitRider
    = { kind = "modify_speed"
      , damageType = None Text
      , amount = None AmountRec
      , delta = Some -10
      , unit = Some "feet"
      }

let rayOfFrost =
      { kind = "spell"
      , id = "ray_of_frost"
      , name = "Ray of Frost"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Ray of Frost"
          }
      , description =
          "A frigid beam of blue-white light streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, it takes 1d8 Cold damage, and its Speed is reduced by 10 feet until the start of your next turn. Cantrip Upgrade: The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "ray_of_frost_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit = [ damageRider, modifySpeedRider ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  rayOfFrost
