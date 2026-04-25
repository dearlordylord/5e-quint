-- Shocking Grasp — SRD 5.2.1 Cantrip, Evocation.
--
-- RAW:
--   "Lightning springs from you to a creature that you try to touch.
--    Make a melee spell attack against the target. On a hit, the
--    target takes 1d8 Lightning damage, and it can't make Opportunity
--    Attacks until the start of its next turn."
--   "Cantrip Upgrade: The damage increases by 1d8 when you reach
--    levels 5 (2d8), 11 (3d8), and 17 (4d8)."
--
-- Consolidated validation reference for:
--   • Multi-effect onHit on attack_roll phase: damage +
--     deny_opportunity_attack. Uses the Dhall Optional-fields pattern
--     to satisfy the homogeneous-list constraint — damage carries
--     damageType + amount; deny_opportunity_attack omits them.
--
-- The "until the start of its next turn" window for the OA denial is
-- a post-hit duration that the session owns (turn-scoped windows are
-- DM/session agenda per ARCHITECTURE.md §1); the content surface
-- records the atom application only.

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
      }

let damageRider
    : HitRider
    = { kind = "damage"
      , damageType = Some "lightning"
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
      }

let denyOARider
    : HitRider
    = { kind = "deny_opportunity_attack"
      , damageType = None Text
      , amount = None AmountRec
      }

let shockingGrasp =
      { kind = "spell"
      , id = "shocking_grasp"
      , name = "Shocking Grasp"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Shocking Grasp"
          }
      , description =
          "Lightning springs from you to a creature that you try to touch. Make a melee spell attack against the target. On a hit, the target takes 1d8 Lightning damage, and it can't make Opportunity Attacks until the start of its next turn. Cantrip Upgrade: The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "shocking_grasp_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , attackKind = "melee_spell_attack"
                , onHit = [ damageRider, denyOARider ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  shockingGrasp
