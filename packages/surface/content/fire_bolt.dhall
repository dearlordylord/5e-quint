-- Fire Bolt — SRD 5.2.1 Cantrip, Evocation.
--
-- RAW (Spells/Descriptions-E-L#Fire Bolt):
--   "You hurl a mote of fire at a creature or an object within range.
--    Make a ranged spell attack against the target. On a hit, the
--    target takes 1d10 Fire damage. A flammable object hit by this
--    spell starts burning if it isn't being worn or carried."
--   "Cantrip Upgrade: The damage increases by 1d10 when you reach
--    levels 5 (2d10), 11 (3d10), and 17 (4d10)."
--
-- Family: activation (single attack_roll phase).
-- Ranged spell attack; on hit: 1d10 Fire damage (cantrip scaling).
-- The "creature or object" target is authored as a target-kind list. The
-- flammable object rider is authored with the shared object filter used by
-- Fire Storm: material=flammable and targetRelation=not_worn_or_carried. Burning hazard
-- consequences remain runtime/session execution facts, not duplicate Surface
-- state.

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
      , filter :
          Optional
            { material : Optional Text
            , targetRelation : Optional Text
            }
      }

let fireDamage : HitRider =
      { kind = "damage"
      , damageType = Some "fire"
      , amount =
          Some
            { kind = "threshold_tiers"
            , axis = "character"
            , base = { dice = 1, dieSize = 10 }
            , tiers =
                [ { atLevel = 5, override = { dice = 2 } }
                , { atLevel = 11, override = { dice = 3 } }
                , { atLevel = 17, override = { dice = 4 } }
                ]
            }
      , filter =
          None
            { material : Optional Text
            , targetRelation : Optional Text
            }
      }

let igniteUnattendedFlammableObject : HitRider =
      { kind = "ignite_objects"
      , damageType = None Text
      , amount = None AmountRec
      , filter =
          Some
            { material = Some "flammable"
            , targetRelation = Some "not_worn_or_carried"
            }
      }

let fireBolt =
      { kind = "spell"
      , id = "fire_bolt"
      , name = "Fire Bolt"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Fire Bolt"
          }
      , description =
          "You hurl a mote of fire at a creature or an object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 Fire damage. A flammable object hit by this spell starts burning if it isn't being worn or carried. Cantrip Upgrade: The damage increases by 1d10 when you reach levels 5 (2d10), 11 (3d10), and 17 (4d10)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "fire_bolt_target"
                    , label = "fire bolt target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one" }
                              // { targetKinds = [ "creature", "object" ] }
                        }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit = [ fireDamage, igniteUnattendedFlammableObject ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  fireBolt
