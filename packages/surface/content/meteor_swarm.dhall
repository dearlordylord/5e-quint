-- Meteor Swarm — SRD 5.2.1 Spell, level 9, Evocation.
--
-- RAW (Spells/Descriptions-M-P#Meteor Swarm):
--   "Blazing orbs of fire plummet to the ground at four different
--    points you can see within range."
--   "Each creature in a 40-foot-radius Sphere centered on each of
--    those points makes a Dexterity saving throw."
--   "A creature takes 20d6 Fire damage and 20d6 Bludgeoning damage on
--    a failed save or half as much damage on a successful one."
--   "A creature in the area of more than one fiery Sphere is affected
--    only once."
--
-- PARTIAL: the unattended-object damage and flammable-object ignition
-- clause is not represented here. The creature-facing combat damage
-- and overlap-once rule are represented.

let DiceExpr : Type = { dice : Natural, dieSize : Natural }

let Damage : Type =
      { kind : Text, damageType : Text, amount : { kind : Text, expr : DiceExpr } }

let fireDamage : Damage =
      { kind = "damage"
      , damageType = "fire"
      , amount = { kind = "fixed", expr = { dice = 20, dieSize = 6 } }
      }

let bludgeoningDamage : Damage =
      { kind = "damage"
      , damageType = "bludgeoning"
      , amount = { kind = "fixed", expr = { dice = 20, dieSize = 6 } }
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional { kind : Text, expr : DiceExpr }
      , effects : Optional (List Damage)
      }

let meteorDamage : Effect =
      { kind = "composite"
      , damageType = None Text
      , amount = None { kind : Text, expr : DiceExpr }
      , effects = Some [ fireDamage, bludgeoningDamage ]
      }

let meteorSwarm =
      { kind = "spell"
      , id = "meteor_swarm"
      , name = "Meteor Swarm"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Meteor Swarm"
          }
      , description =
          "Blazing orbs of fire plummet to the ground at four different points you can see within range. Each creature in a 40-foot-radius Sphere centered on each point makes a Dexterity saving throw, taking 20d6 Fire damage and 20d6 Bludgeoning damage on a failed save or half as much damage on a successful one. A creature in more than one Sphere is affected only once."
      , mechanics =
          { family = "activation"
          , level = 9
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 5280 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "meteor_swarm_points"
                    , label = "four meteor impact points"
                    , value =
                        { kind = "area"
                        , shape =
                            { kind = "sphere_cluster"
                            , count = 4
                            , radiusFeet = 40
                            , overlapResolution = "affect_once"
                            }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail = meteorDamage
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  meteorSwarm
