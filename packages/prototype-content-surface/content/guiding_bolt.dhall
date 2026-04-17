-- Guiding Bolt — SRD 5.2.1 Spell, level 1, Evocation.
--
-- RAW (Spells / Descriptions E-L / Guiding Bolt):
--   "You hurl a bolt of light toward a creature within range. Make
--    a ranged spell attack against the target. On a hit, it takes
--    4d6 Radiant damage, and the next attack roll made against it
--    before the end of your next turn has Advantage."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6
--    for each spell slot level above 1."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Ranged spell attack with a
-- two-element onHit list: damage + modify_roll_advantage. The
-- advantage modifier is attached to the target and persists for
-- the spell's 1-round duration.
--
-- The "next attack roll only" single-use semantic is session
-- bookkeeping (first attack in the window consumes the modifier).
-- ARCHITECTURE.md §1: first-use-wins rules-glossary-level bookkeeping
-- belongs to the session/engine. The surface records the window via
-- Duration.timed 1 round; the session enforces the "next attack"
-- consumption.

let guidingBolt =
      { kind = "spell"
      , id = "guiding_bolt"
      , name = "Guiding Bolt"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Guiding Bolt"
          }
      , description =
          "You hurl a bolt of light toward a creature within range. Make a ranged spell attack against the target. On a hit, it takes 4d6 Radiant damage, and the next attack roll made against it before the end of your next turn has Advantage. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "round", amount = 1 }
              }
          , phases =
              let AmountRec
                    : Type
                    = { kind : Text
                      , axis : Text
                      , base : { dice : Natural, dieSize : Natural }
                      , perLevel : { dice : Natural }
                      , startingAtLevel : Natural
                      }
              let HitRider
                    : Type
                    = { kind : Text
                      , damageType : Optional Text
                      , amount : Optional AmountRec
                      , mode : Optional Text
                      , on : Optional (List Text)
                      }
              let damageRider
                    : HitRider
                    = { kind = "damage"
                      , damageType = Some "radiant"
                      , amount =
                          Some
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 4, dieSize = 6 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 1
                            }
                      , mode = None Text
                      , on = None (List Text)
                      }
              let advRider
                    : HitRider
                    = { kind = "modify_roll_advantage"
                      , damageType = None Text
                      , amount = None AmountRec
                      , mode = Some "advantage"
                      , on = Some [ "attack_roll" ]
                      }
              in  [ { kind = "attack_roll"
                    , attachment =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    , attackKind = "ranged_spell_attack"
                    , onHit = [ damageRider, advRider ]
                    , onMiss = [ { kind = "none" } ]
                    }
                  ]
          }
      }

in  guidingBolt
