-- Sunburst — SRD 5.2.1 Spell, level 8, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Sunburst):
--   "Each creature in the Sphere makes a Constitution saving throw."
--   "On a failed save, a creature takes 12d6 Radiant damage and has
--    the Blinded condition for 1 minute. On a successful save, it
--    takes half as much damage only."
--   "A creature Blinded by this spell makes another Constitution
--    saving throw at the end of each of its turns, ending the effect
--    on itself on a success."
--
-- DEFERRED. "This spell dispels Darkness in its area that was created
-- by any spell" needs a spell-effect filter over active area effects.

let DiceAmount : Type =
      { kind : Text, expr : { dice : Natural, dieSize : Natural } }

let ChildEffect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , condition : Optional Text
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , condition : Optional Text
      , effects : Optional (List ChildEffect)
      }

let radiantDamage : ChildEffect =
      { kind = "damage"
      , damageType = Some "radiant"
      , amount = Some { kind = "fixed", expr = { dice = 12, dieSize = 6 } }
      , condition = None Text
      }

let blinded : ChildEffect =
      { kind = "apply_condition"
      , damageType = None Text
      , amount = None DiceAmount
      , condition = Some "blinded"
      }

let failedSave : Effect =
      { kind = "composite"
      , damageType = None Text
      , amount = None DiceAmount
      , condition = None Text
      , effects = Some [ radiantDamage, blinded ]
      }

let sunburst =
      { kind = "spell"
      , id = "sunburst"
      , name = "Sunburst"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sunburst"
          }
      , description =
          "Brilliant sunlight flashes in a 60-foot-radius Sphere centered on a point within range. Each creature in the Sphere makes a Constitution saving throw. On a failed save, a creature takes 12d6 Radiant damage and has the Blinded condition for 1 minute. On a successful save, it takes half as much damage only. A creature Blinded by this spell repeats the save at the end of each of its turns, ending the effect on itself on a success."
      , mechanics =
          { family = "activation"
          , level = 8
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components =
              { v = True
              , s = True
              , m = Some "a piece of sunstone"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "sunburst_sphere"
                    , label = "burst sphere"
                    , value =
                        { kind = "area"
                        , shape = { kind = "sphere", radiusFeet = 60 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail = failedSave
                , onSuccess = { kind = "half_damage" }
                , repeatSave =
                    { cadence = "end_of_target_turn"
                    , onSuccess = "ends_on_target"
                    }
                }
              ]
          }
      }

in  sunburst
