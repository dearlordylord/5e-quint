-- Thunderwave — SRD 5.2.1 Spell, level 1, Evocation.
--
-- RAW (Spells / Descriptions S-Z / Thunderwave):
--   "You unleash a wave of thunderous energy. Each creature in a
--    15-foot Cube originating from you makes a Constitution saving
--    throw. On a failed save, a creature takes 2d8 Thunder damage
--    and is pushed 10 feet away from you. On a successful save, a
--    creature takes half as much damage only."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8
--    for each spell slot level above 1."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Composite onFail carrying
-- damage + force_move (push). The "thunderous boom audible within
-- 300 feet" is DM agenda (sound range is session-layer). The
-- object-pushing clause applies the same force_move to objects in
-- the area — modeled implicitly by the composite on the area
-- attachment (objects in area see force_move too).

let thunderwave =
      { kind = "spell"
      , id = "thunderwave"
      , name = "Thunderwave"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Thunderwave"
          }
      , description =
          "You unleash a wave of thunderous energy. Each creature in a 15-foot Cube originating from you makes a Constitution saving throw. On a failed save, a creature takes 2d8 Thunder damage and is pushed 10 feet away from you. On a successful save, a creature takes half as much damage only. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              let FailRider
                    : Type
                    = { kind : Text
                      , damageType : Optional Text
                      , amount :
                          Optional
                            { kind : Text
                            , axis : Text
                            , base : { dice : Natural, dieSize : Natural }
                            , perLevel : { dice : Natural }
                            , startingAtLevel : Natural
                            }
                      , direction : Optional Text
                      , distanceFeet : Optional Natural
                      }
              let damageRider
                    : FailRider
                    = { kind = "damage"
                      , damageType = Some "thunder"
                      , amount =
                          Some
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 2, dieSize = 8 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 1
                            }
                      , direction = None Text
                      , distanceFeet = None Natural
                      }
              let pushRider
                    : FailRider
                    = { kind = "force_move"
                      , damageType = None Text
                      , amount =
                          None
                            { kind : Text
                            , axis : Text
                            , base : { dice : Natural, dieSize : Natural }
                            , perLevel : { dice : Natural }
                            , startingAtLevel : Natural
                            }
                      , direction = Some "push"
                      , distanceFeet = Some 10
                      }
              in  [ { kind = "save_gate"
                    , attachment =
                        { kind = "area"
                        , shape = { kind = "cube", sideFeet = 15 }
                        , origin = { kind = "self" }
                        }
                    , ability = "con"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "composite", effects = [ damageRider, pushRider ] }
                    , onSuccess = { kind = "half_damage" }
                    }
                  ]
          }
      }

in  thunderwave
